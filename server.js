require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cron = require("node-cron");
const {
  fetchTrendingAll,
  fetchLatestNetflixReleases,
  fetchNetflixIndiaSeries,
  fetchNetflixMovies,
  searchAllMedia,
  fetchItemDetails,
  fetchSeasonEpisodes
} = require("./tmdbService");
const streamExtractor = require("./streamExtractor");
const progressStore = require("./progressStore");
const MASTER_CATALOG = require("./catalogData");

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const GENRE_MAP = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Dramas", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  53: "Thriller", 10752: "War", 37: "Western", 10759: "Action & Adventure",
  10765: "Sci-Fi & Fantasy"
};

function formatMediaItem(item, defaultType = "movie") {
  const type = item.type || item.media_type || (item.title ? "movie" : "tv") || defaultType;
  const title = item.title || item.name || item.original_title || item.original_name || "Untitled";
  const poster = item.posterUrl || (item.poster_path 
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg");
  const backdrop = item.backdropUrl || (item.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
    : "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg");

  const rating = item.vote_average ? Number(item.vote_average.toFixed(1)) : (item.rating || 8.5);
  const matchPct = item.matchPercentage || `${Math.min(99, Math.max(88, Math.round(rating * 10) + 5))}% Match`;

  let genres = item.genres;
  if (!genres || genres.length === 0) {
    genres = (item.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean).slice(0, 3);
  }
  if (!genres || genres.length === 0) genres = ["Dramas", "Thriller"];

  const year = item.year || (item.release_date || item.first_air_date || "2026").substring(0, 4);
  let runtimeDisplay = item.runtimeDisplay;
  if (!runtimeDisplay) {
    if (type === "movie") {
      if (item.runtime) {
        const h = Math.floor(item.runtime / 60);
        const m = item.runtime % 60;
        runtimeDisplay = `${h}h ${m}m`;
      } else {
        const baseMinutes = 95 + (Number(item.id || 100) % 45);
        const h = Math.floor(baseMinutes / 60);
        const m = baseMinutes % 60;
        runtimeDisplay = `${h}h ${m}m`;
      }
    } else {
      runtimeDisplay = item.number_of_seasons ? `${item.number_of_seasons} Seasons` : "Series";
    }
  }

  return {
    id: item.id,
    title,
    type,
    overview: item.overview || "A celebrated story on Netflix featuring an extraordinary journey.",
    posterUrl: poster,
    backdropUrl: backdrop,
    rating,
    matchPercentage: matchPct,
    maturityRating: item.maturityRating || (item.adult ? "18+" : "U/A 16+"),
    year,
    runtimeDisplay,
    genres,
    quality: item.quality || "4K ULTRA HD",
    audio: item.audio || "DOLBY ATMOS"
  };
}

// -------------------------------------------------------------
// CATALOG INITIALIZATION (Zero Cold-Start Seeded Cache)
// -------------------------------------------------------------
const seedTrending = (MASTER_CATALOG.rows[0]?.items || []).map(it => formatMediaItem(it));
const seedLatest = (MASTER_CATALOG.rows[1]?.items || []).map(it => formatMediaItem(it));
const seedSeries = (MASTER_CATALOG.rows[2]?.items || []).map(it => formatMediaItem(it, "tv"));
const seedMovies = (MASTER_CATALOG.rows[3]?.items || []).map(it => formatMediaItem(it, "movie"));

let cachedCatalog = {
  lastUpdated: new Date().toISOString(),
  hero: formatMediaItem(MASTER_CATALOG.hero),
  trending: seedTrending,
  latestDrops: seedLatest,
  netflixSeries: seedSeries,
  netflixMovies: seedMovies
};

async function refreshCatalog() {
  console.log("[Engine] ⚡ Refreshing live multi-region Netflix catalog...");
  try {
    const [trending, latest, series, movies] = await Promise.all([
      fetchTrendingAll(),
      fetchLatestNetflixReleases(),
      fetchNetflixIndiaSeries(),
      fetchNetflixMovies()
    ]);

    if (trending && trending.length > 0) {
      cachedCatalog.trending = trending.map(it => formatMediaItem(it));
    }
    if (latest && latest.length > 0) {
      cachedCatalog.latestDrops = latest.map(it => formatMediaItem(it));
    }
    if (series && series.length > 0) {
      cachedCatalog.netflixSeries = series.map(it => formatMediaItem(it, "tv"));
    }
    if (movies && movies.length > 0) {
      cachedCatalog.netflixMovies = movies.map(it => formatMediaItem(it, "movie"));
    }

    // Ensure Hero is prominent and has valid backdrop
    const heroCandidate = cachedCatalog.trending.find(it => it.backdropUrl) || cachedCatalog.netflixSeries[0];
    if (heroCandidate) {
      cachedCatalog.hero = heroCandidate;
    }
    cachedCatalog.lastUpdated = new Date().toISOString();

    console.log(`[Engine] ✅ Catalog Synchronized: ${cachedCatalog.trending.length} titles ready.`);
  } catch (err) {
    console.error("[Engine] Refresh failure:", err.message);
  }
}

// Perform initial live sync in background without blocking startup
refreshCatalog();

// Scheduled automatic sync with node-cron
const syncCronSchedule = process.env.SYNC_CRON_SCHEDULE || "0 */6 * * *";
try {
  if (cron.validate(syncCronSchedule)) {
    cron.schedule(syncCronSchedule, () => {
      console.log(`[Engine] ⏰ Cron Trigger: Running scheduled sync (${syncCronSchedule})`);
      refreshCatalog();
    });
    console.log(`[Engine] ⏰ Catalog Auto-Sync scheduled with cron (${syncCronSchedule})`);
  }
} catch (e) {
  console.warn("[Engine] Could not initialize cron scheduler:", e.message);
}

// -------------------------------------------------------------
// REST API
// -------------------------------------------------------------

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/v1/feed/home", async (req, res) => {
  try {
    const { category, search, deviceId = "global_user" } = req.query;

    if (search) {
      const rawResults = await searchAllMedia(search);
      const searchItems = rawResults.map(it => formatMediaItem(it));
      return res.json({
        status: "success",
        data: {
          hero: searchItems[0] || cachedCatalog.hero,
          rows: [
            {
              id: "search_results",
              title: `Search Results for "${search}" (${searchItems.length} titles)`,
              items: searchItems
            }
          ]
        }
      });
    }

    const continueWatchingItems = progressStore.getContinueWatching(deviceId);
    const rows = [];

    if (continueWatchingItems.length > 0) {
      rows.push({
        id: "continue_watching",
        title: "Continue Watching",
        isContinueWatching: true,
        items: continueWatchingItems.map(item => ({
          id: item.tmdbId,
          title: item.title,
          type: item.type,
          posterUrl: item.posterUrl,
          backdropUrl: item.backdropUrl,
          season: item.season,
          episode: item.episode,
          positionSeconds: item.positionSeconds,
          progressPercentage: item.progressPercentage
        }))
      });
    }

    let heroItem = cachedCatalog.hero;

    if (category === "tv") {
      heroItem = cachedCatalog.netflixSeries[0] || cachedCatalog.hero;
      const tvTop10 = cachedCatalog.netflixSeries.slice(0, 10).map((it, idx) => ({ ...it, rank: idx + 1 }));
      rows.push(
        {
          id: "top_10_tv",
          title: "Top 10 TV Shows in India Today",
          isTop10: true,
          items: tvTop10
        },
        {
          id: "popular_series",
          title: "Binge-Worthy TV Shows",
          items: cachedCatalog.netflixSeries.slice(0, 30)
        },
        {
          id: "trending_series",
          title: "Trending Dramas & Crime Series",
          items: cachedCatalog.trending.filter(it => it.type === "tv").slice(0, 25)
        }
      );
    } else if (category === "movie") {
      heroItem = cachedCatalog.netflixMovies[0] || cachedCatalog.hero;
      const movieTop10 = cachedCatalog.netflixMovies.slice(0, 10).map((it, idx) => ({ ...it, rank: idx + 1 }));
      rows.push(
        {
          id: "top_10_movies",
          title: "Top 10 Movies in India Today",
          isTop10: true,
          items: movieTop10
        },
        {
          id: "hit_movies",
          title: "Blockbuster Movies on Netflix",
          items: cachedCatalog.netflixMovies.slice(0, 30)
        },
        {
          id: "trending_movies",
          title: "Trending Feature Films",
          items: cachedCatalog.trending.filter(it => it.type === "movie").slice(0, 25)
        }
      );
    } else if (category === "new") {
      heroItem = cachedCatalog.latestDrops[0] || cachedCatalog.hero;
      rows.push(
        {
          id: "new_on_netflix",
          title: "New on Netflix (Released This Week)",
          items: cachedCatalog.latestDrops.slice(0, 25)
        },
        {
          id: "trending_now",
          title: "Trending Now Globally",
          items: cachedCatalog.trending.slice(0, 25)
        }
      );
    } else if (category === "mylist") {
      const userList = progressStore.getMyList(deviceId);
      rows.push({
        id: "my_list_row",
        title: userList.length > 0 ? "My List" : "My List (Empty - Add titles by clicking +)",
        isMyList: true,
        items: userList.length > 0 ? userList : cachedCatalog.trending.slice(0, 8)
      });
    } else {
      const top10 = cachedCatalog.trending.slice(0, 10).map((it, idx) => ({
        ...it,
        rank: idx + 1
      }));

      rows.push(
        {
          id: "top_10_today",
          title: "Top 10 in India Today",
          isTop10: true,
          items: top10
        },
        {
          id: "new_on_netflix",
          title: "New on Netflix (Released This Week)",
          items: cachedCatalog.latestDrops.slice(0, 25)
        },
        {
          id: "trending_now",
          title: "Trending Now Globally",
          items: cachedCatalog.trending.slice(10, 35)
        },
        {
          id: "popular_series",
          title: "Binge-Worthy TV Shows",
          items: cachedCatalog.netflixSeries.slice(0, 30)
        },
        {
          id: "hit_movies",
          title: "Blockbuster Movies on Netflix",
          items: cachedCatalog.netflixMovies.slice(0, 30)
        }
      );
    }

    res.json({
      status: "success",
      data: {
        hero: heroItem,
        rows: rows
      }
    });
  } catch (err) {
    console.error("[Engine] Feed generation error:", err);
    res.status(500).json({
      status: "error",
      message: "Feed error",
      data: {
        hero: cachedCatalog.hero,
        rows: []
      }
    });
  }
});

// User Progress Endpoints
app.post("/api/v1/user/progress", (req, res) => {
  const { deviceId, tmdbId, title, type, season, episode, positionSeconds, durationSeconds, posterUrl, backdropUrl } = req.body;
  const saved = progressStore.saveProgress({
    deviceId: deviceId || "global_user",
    tmdbId,
    title,
    type,
    season,
    episode,
    positionSeconds,
    durationSeconds,
    posterUrl,
    backdropUrl
  });

  res.json({ status: "success", data: saved });
});

// User My List Endpoints
app.get("/api/v1/user/mylist", (req, res) => {
  const deviceId = req.query.deviceId || "global_user";
  const items = progressStore.getMyList(deviceId);
  res.json({ status: "success", data: items });
});

app.post("/api/v1/user/mylist", (req, res) => {
  const { deviceId = "global_user", item } = req.body;
  const list = progressStore.addToList(deviceId, item);
  res.json({ status: "success", data: list });
});

app.delete("/api/v1/user/mylist/:id", (req, res) => {
  const { id } = req.params;
  const deviceId = req.query.deviceId || "global_user";
  const list = progressStore.removeFromList(deviceId, id);
  res.json({ status: "success", data: list });
});

// Media Details Endpoint
app.get("/api/v1/media/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  let details = await fetchItemDetails(type, id);

  // If details not reachable from network, lookup from seeded/cached catalog
  if (!details) {
    const allCatalog = [
      cachedCatalog.hero,
      ...cachedCatalog.trending,
      ...cachedCatalog.latestDrops,
      ...cachedCatalog.netflixSeries,
      ...cachedCatalog.netflixMovies
    ];
    const cachedItem = allCatalog.find(it => it && String(it.id) === String(id));
    if (cachedItem) {
      details = {
        id: cachedItem.id,
        title: cachedItem.title,
        overview: cachedItem.overview,
        poster_path: null,
        backdrop_path: null,
        posterUrl: cachedItem.posterUrl,
        backdropUrl: cachedItem.backdropUrl,
        vote_average: cachedItem.rating,
        genres: (cachedItem.genres || []).map(name => ({ name })),
        number_of_seasons: 4,
        seasons: [
          { season_number: 1, name: "Season 1" },
          { season_number: 2, name: "Season 2" },
          { season_number: 3, name: "Season 3" },
          { season_number: 4, name: "Season 4" }
        ]
      };
    }
  }

  if (!details) {
    return res.status(404).json({ status: "error", message: "Media not found" });
  }

  const duration = type === "tv"
    ? `${details.number_of_seasons || 1} Season${(details.number_of_seasons || 1) > 1 ? "s" : ""}`
    : `${Math.floor((details.runtime || 114) / 60)}h ${(details.runtime || 114) % 60}m`;

  const seasonsList = (details.seasons || [])
    .filter(s => s.season_number > 0)
    .map(s => ({
      seasonNumber: s.season_number,
      name: s.name || `Season ${s.season_number}`,
      episodeCount: s.episode_count || 8
    }));

  res.json({
    status: "success",
    data: {
      id: details.id,
      title: details.title || details.name,
      type: type,
      overview: details.overview,
      posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : (details.posterUrl || null),
      backdropUrl: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : (details.backdropUrl || null),
      rating: details.vote_average ? Number(details.vote_average.toFixed(1)) : 8.5,
      genres: (details.genres || []).map(g => g.name || g),
      duration: duration,
      numberOfSeasons: details.number_of_seasons || 1,
      seasons: seasonsList
    }
  });
});

app.get("/api/v1/tv/:tvId/season/:seasonNumber", async (req, res) => {
  const { tvId, seasonNumber } = req.params;
  const episodesRaw = await fetchSeasonEpisodes(tvId, seasonNumber);

  let formatted = (episodesRaw || []).map(ep => ({
    episodeNumber: ep.episode_number,
    name: ep.name,
    overview: ep.overview || "No episode summary available.",
    stillUrl: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : null,
    runtime: ep.runtime ? `${ep.runtime}m` : "45m"
  }));

  // Fallback default episodes if TMDb returns empty
  if (formatted.length === 0) {
    formatted = Array.from({ length: 8 }, (_, idx) => ({
      episodeNumber: idx + 1,
      name: `Chapter ${idx + 1}: Episode Title`,
      overview: "An intriguing chapter unfolding dramatic encounters and unexpected revelations.",
      stillUrl: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
      runtime: "52m"
    }));
  }

  res.json({
    status: "success",
    data: formatted
  });
});

app.get("/api/v1/streams/direct", (req, res) => {
  const { type, tmdbId, season, episode } = req.query;
  const streamData = streamExtractor.resolveMediaStreams(
    type || "movie",
    Number(tmdbId) || 66732,
    Number(season) || 1,
    Number(episode) || 1
  );

  res.json({
    status: "success",
    data: streamData
  });
});

// Admin Manual Sync Trigger
app.post("/api/v1/admin/sync", async (req, res) => {
  await refreshCatalog();
  res.json({
    status: "success",
    message: "Catalog refreshed successfully",
    lastUpdated: cachedCatalog.lastUpdated,
    trendingCount: cachedCatalog.trending.length
  });
});

app.listen(PORT, () => {
  console.log(`[StreamEngine] 🚀 Production-Grade Streaming & State Sync API running at http://localhost:${PORT}`);
});
