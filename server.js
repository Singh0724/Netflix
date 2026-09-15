require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cron = require("node-cron");
const {
  deduplicateMediaList,
  fetchTrendingAll,
  fetchLatestNetflixReleases,
  fetchNetflixIndiaSeries,
  fetchNetflixMovies,
  fetchIndianCinema,
  fetchTop10IndiaMovies,
  fetchTop10IndiaTV,
  fetchKDramas,
  fetchCrimeSeries,
  fetchActionMovies,
  fetchComedies,
  fetchSciFiFantasy,
  fetchDocumentaries,
  fetchRomanceTitles,
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
const seedTop10Movies = (MASTER_CATALOG.rows.find(r => r.id === "top_10_movies_india")?.items || []).map((it, idx) => ({ ...formatMediaItem(it, "movie"), rank: idx + 1, isTop10: true }));

let cachedCatalog = {
  lastUpdated: new Date().toISOString(),
  hero: formatMediaItem(MASTER_CATALOG.hero),
  trending: seedTrending,
  latestDrops: seedLatest,
  netflixSeries: seedSeries,
  netflixMovies: seedMovies,
  indianCinema: seedMovies,
  top10Movies: seedTop10Movies,
  top10TV: seedSeries.slice(0, 10).map((it, idx) => ({ ...formatMediaItem(it, "tv"), rank: idx + 1, isTop10: true })),
  kdramas: seedSeries,
  crimeSeries: seedSeries,
  actionMovies: seedMovies,
  comedies: seedMovies,
  sciFi: seedMovies,
  documentaries: seedMovies,
  romance: seedMovies
};

async function refreshCatalog() {
  console.log("[Engine] ⚡ Refreshing live multi-region Netflix catalog...");
  try {
    const [
      trending,
      latest,
      series,
      movies,
      indian,
      top10Mov,
      top10Tv,
      kdrama,
      crime,
      action,
      comedy,
      scifi,
      docs,
      romance
    ] = await Promise.all([
      fetchTrendingAll(),
      fetchLatestNetflixReleases(),
      fetchNetflixIndiaSeries(),
      fetchNetflixMovies(),
      fetchIndianCinema(),
      fetchTop10IndiaMovies(),
      fetchTop10IndiaTV(),
      fetchKDramas(),
      fetchCrimeSeries(),
      fetchActionMovies(),
      fetchComedies(),
      fetchSciFiFantasy(),
      fetchDocumentaries(),
      fetchRomanceTitles()
    ]);

    if (trending && trending.length > 0) {
      cachedCatalog.trending = deduplicateMediaList(trending.map(it => formatMediaItem(it)));
    }
    if (latest && latest.length > 0) {
      cachedCatalog.latestDrops = deduplicateMediaList(latest.map(it => formatMediaItem(it)));
    }
    if (series && series.length > 0) {
      cachedCatalog.netflixSeries = deduplicateMediaList(series.map(it => formatMediaItem(it, "tv")));
    }
    if (movies && movies.length > 0) {
      cachedCatalog.netflixMovies = deduplicateMediaList(movies.map(it => formatMediaItem(it, "movie")));
    }
    if (indian && indian.length > 0) {
      cachedCatalog.indianCinema = deduplicateMediaList(indian.map(it => formatMediaItem(it, "movie")));
    }
    const todayDate = new Date().toISOString().slice(0, 10);
    if (!cachedCatalog.top10LastUpdatedDate || cachedCatalog.top10LastUpdatedDate !== todayDate || !cachedCatalog.top10Movies || cachedCatalog.top10Movies.length === 0) {
      if (top10Mov && top10Mov.length > 0) {
        cachedCatalog.top10Movies = top10Mov.slice(0, 10).map((it, idx) => ({ ...formatMediaItem(it, "movie"), rank: idx + 1, isTop10: true }));
      }
      if (top10Tv && top10Tv.length > 0) {
        cachedCatalog.top10TV = top10Tv.slice(0, 10).map((it, idx) => ({ ...formatMediaItem(it, "tv"), rank: idx + 1, isTop10: true }));
      }
      cachedCatalog.top10LastUpdatedDate = todayDate;
      console.log(`[Engine] 🏆 Top 10 Today Frozen for date: ${todayDate}`);
    }

    if (kdrama && kdrama.length > 0) {
      cachedCatalog.kdramas = deduplicateMediaList(kdrama.map(it => formatMediaItem(it, "tv")));
    }
    if (crime && crime.length > 0) {
      cachedCatalog.crimeSeries = deduplicateMediaList(crime.map(it => formatMediaItem(it, "tv")));
    }
    if (action && action.length > 0) {
      cachedCatalog.actionMovies = deduplicateMediaList(action.map(it => formatMediaItem(it, "movie")));
    }
    if (comedy && comedy.length > 0) {
      cachedCatalog.comedies = deduplicateMediaList(comedy.map(it => formatMediaItem(it, "movie")));
    }
    if (scifi && scifi.length > 0) {
      cachedCatalog.sciFi = deduplicateMediaList(scifi.map(it => formatMediaItem(it, "movie")));
    }
    if (docs && docs.length > 0) {
      cachedCatalog.documentaries = deduplicateMediaList(docs.map(it => formatMediaItem(it, "movie")));
    }
    if (romance && romance.length > 0) {
      cachedCatalog.romance = deduplicateMediaList(romance.map(it => formatMediaItem(it, "movie")));
    }

    // Curated Hero Rotation Pool (P0.4)
    cachedCatalog.hero = MASTER_CATALOG.hero;
    cachedCatalog.heroRotation = [
      MASTER_CATALOG.hero,
      ...(cachedCatalog.trending || []).slice(0, 4).map(it => formatMediaItem(it))
    ];
    cachedCatalog.lastUpdated = new Date().toISOString();

    const totalTitles = (cachedCatalog.trending?.length || 0) + 
                        (cachedCatalog.latestDrops?.length || 0) + 
                        (cachedCatalog.netflixSeries?.length || 0) + 
                        (cachedCatalog.netflixMovies?.length || 0) + 
                        (cachedCatalog.indianCinema?.length || 0);

    console.log(`[Engine] ✅ Massive Catalog Synchronized: ${totalTitles} active titles ready across 14 rich categories.`);
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
      const searchItems = deduplicateMediaList(rawResults).map(it => formatMediaItem(it));
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

    let heroItem = cachedCatalog.hero;
    if (category === "tv") {
      heroItem = cachedCatalog.netflixSeries[0] || cachedCatalog.hero;
    } else if (category === "movie") {
      heroItem = cachedCatalog.netflixMovies[0] || cachedCatalog.hero;
    } else if (category === "new") {
      heroItem = cachedCatalog.latestDrops[0] || cachedCatalog.hero;
    }

    // Cross-row deduplication to guarantee 0 duplicate cards across the entire page
    const feedSeen = new Set();
    if (heroItem && heroItem.id) {
      feedSeen.add(String(heroItem.id));
      const heroNorm = (heroItem.title || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
      if (heroNorm) feedSeen.add(heroNorm);
    }

    // Register continue watching items in feedSeen
    continueWatchingItems.forEach(it => {
      if (it.tmdbId) feedSeen.add(String(it.tmdbId));
      const norm = (it.title || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
      if (norm) feedSeen.add(norm);
    });

    function pickUnique(items, limit = 25) {
      const result = [];
      for (const item of items) {
        if (!item || !item.id) continue;
        const normTitle = (item.title || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
        const idKey = String(item.id);

        if (feedSeen.has(idKey) || (normTitle && feedSeen.has(normTitle))) {
          continue;
        }

        feedSeen.add(idKey);
        if (normTitle) feedSeen.add(normTitle);
        result.push(item);
        if (result.length >= limit) break;
      }
      return result;
    }

    if (category === "tv") {
      const tvTop10 = (cachedCatalog.top10TV?.length >= 10 ? cachedCatalog.top10TV.slice(0, 10) : pickUnique(cachedCatalog.netflixSeries, 10)).map((it, idx) => ({ ...it, rank: idx + 1, isTop10: true }));
      rows.push(
        {
          id: "top_10_tv",
          title: "Top 10 TV Shows in India Today",
          isTop10: true,
          items: tvTop10
        },
        {
          id: "trending_series",
          title: "Trending TV Shows Worldwide",
          items: pickUnique(cachedCatalog.trending.filter(it => it.type === "tv"), 25)
        },
        {
          id: "popular_series",
          title: "Binge-Worthy TV Series & Netflix Originals",
          items: pickUnique(cachedCatalog.netflixSeries, 25)
        },
        {
          id: "crime_thrillers_tv",
          title: "Gripping Crime & Mystery Series",
          items: pickUnique(cachedCatalog.crimeSeries || [], 25)
        },
        {
          id: "kdramas_tv",
          title: "Popular Korean Dramas & Asian Hits",
          items: pickUnique(cachedCatalog.kdramas || [], 25)
        },
        {
          id: "comedy_series",
          title: "Laugh-Out-Loud Comedy Shows",
          items: pickUnique((cachedCatalog.comedies || []).filter(it => it.type === "tv" || it.type === "movie"), 25)
        },
        {
          id: "scifi_fantasy_tv",
          title: "Sci-Fi, Supernatural & Fantasy Series",
          items: pickUnique(cachedCatalog.sciFi || [], 25)
        },
        {
          id: "docuseries_tv",
          title: "Compelling Docuseries & Real Life",
          items: pickUnique(cachedCatalog.documentaries || [], 20)
        }
      );
    } else if (category === "movie") {
      const movieTop10 = (cachedCatalog.top10Movies?.length >= 10 ? cachedCatalog.top10Movies.slice(0, 10) : pickUnique(cachedCatalog.netflixMovies, 10)).map((it, idx) => ({ ...it, rank: idx + 1, isTop10: true }));
      rows.push(
        {
          id: "top_10_movies",
          title: "Top 10 Movies in India Today",
          isTop10: true,
          items: movieTop10
        },
        {
          id: "blockbuster_indian",
          title: "Blockbuster Indian Cinema (Hindi, Tamil, Telugu)",
          items: pickUnique(cachedCatalog.indianCinema || [], 25)
        },
        {
          id: "hit_movies",
          title: "Popular Blockbusters on Netflix",
          items: pickUnique(cachedCatalog.netflixMovies, 25)
        },
        {
          id: "action_movies",
          title: "Adrenaline-Fueled Action & Adventure",
          items: pickUnique(cachedCatalog.actionMovies || [], 25)
        },
        {
          id: "comedy_movies",
          title: "Comedies & Feel-Good Movies",
          items: pickUnique(cachedCatalog.comedies || [], 25)
        },
        {
          id: "romance_movies",
          title: "Romantic Movies & Emotional Dramas",
          items: pickUnique(cachedCatalog.romance || [], 25)
        },
        {
          id: "scifi_movies",
          title: "Mind-Bending Sci-Fi & Fantasy Spectacles",
          items: pickUnique(cachedCatalog.sciFi || [], 25)
        },
        {
          id: "doc_movies",
          title: "Award-Winning Documentaries",
          items: pickUnique(cachedCatalog.documentaries || [], 20)
        }
      );
    } else if (category === "new") {
      heroItem = MASTER_CATALOG.hero;
      rows.push(
        {
          id: "new_this_week",
          title: "New on Netflix (This Week)",
          items: pickUnique(cachedCatalog.latestDrops, 25)
        },
        {
          id: "top_10_movies_today",
          title: "Top 10 Movies in India Today",
          isTop10: true,
          items: (cachedCatalog.top10Movies?.length >= 10 ? cachedCatalog.top10Movies.slice(0, 10) : MASTER_CATALOG.rows.find(r => r.id === "top_10_movies_india")?.items || []).slice(0, 10)
        },
        {
          id: "top_10_tv_today",
          title: "Top 10 TV Shows in India Today",
          isTop10: true,
          items: (cachedCatalog.top10TV?.length >= 10 ? cachedCatalog.top10TV.slice(0, 10) : pickUnique(cachedCatalog.netflixSeries, 10)).map((it, idx) => ({ ...it, rank: idx + 1, isTop10: true }))
        },
        {
          id: "coming_next_week",
          title: "Coming Next Week",
          items: MASTER_CATALOG.newAndPopular[1]?.items || []
        },
        {
          id: "worth_the_wait",
          title: "Worth the Wait (Coming Soon)",
          items: MASTER_CATALOG.newAndPopular[2]?.items || []
        }
      );
    } else if (category === "games") {
      heroItem = {
        id: 9002,
        title: "Squid Game: Unleashed",
        heroTitleUpper: "NETFLIX GAMES",
        heroTitleLower: "SQUID GAME: UNLEASHED",
        type: "game",
        overview: "Compete with friends or foes in chaotic high-stakes challenges inspired by the hit series. Play exclusively with your Netflix membership.",
        posterUrl: "https://image.tmdb.org/t/p/w500/dDlG1m7n92Z23E3gO758sY8Nf6A.jpg",
        backdropUrl: "https://image.tmdb.org/t/p/original/oaGvjB0DvdurWhf9IhSJ15VvEhu.jpg",
        rating: 9.2,
        badge: "Mobile Game • Action • 2026",
        matchPercentage: "99% Match",
        maturityRating: "16+",
        duration: "Mobile Edition",
        year: "2026",
        genres: ["Action", "Battle Royale", "Multiplayer"]
      };
      rows.push(
        {
          id: "trending_games",
          title: "Trending Mobile & Interactive Games on Netflix",
          items: MASTER_CATALOG.games || []
        },
        {
          id: "based_on_shows",
          title: "Games Based on Netflix Series",
          items: [
            MASTER_CATALOG.games[0], // Stranger Things
            MASTER_CATALOG.games[1], // Squid Game
            MASTER_CATALOG.games[3]  // Dead Cells
          ].filter(Boolean)
        }
      );
    } else if (category === "languages") {
      const lang = req.query.lang || "Hindi";
      heroItem = MASTER_CATALOG.hero;
      const allItems = MASTER_CATALOG.rows.flatMap(r => r.items || []);
      const filtered = allItems.filter(it => !lang || (it.language && it.language.toLowerCase() === lang.toLowerCase()));
      rows.push(
        {
          id: "browse_language_row",
          title: `Titles Available with ${lang} Audio & Subtitles (${filtered.length > 0 ? filtered.length : allItems.length} titles)`,
          items: filtered.length > 0 ? filtered : allItems
        },
        {
          id: "trending_multilingual",
          title: "Trending Multi-Language Hits",
          items: allItems.slice(0, 8)
        }
      );
    } else if (category === "mylist") {
      const userList = progressStore.getMyList(deviceId);
      rows.push({
        id: "my_list_row",
        title: userList.length > 0 ? "My List" : "My List (Empty - Add titles by clicking +)",
        isMyList: true,
        items: userList.length > 0 ? userList : pickUnique(cachedCatalog.trending, 8)
      });
    } else {
      // 1:1 Exact Netflix India Sequence from user screenshots + Massive 300+ Deep Catalog
      heroItem = MASTER_CATALOG.hero;
      const baseRows = JSON.parse(JSON.stringify(MASTER_CATALOG.rows));

      // Row 1: "Because you watched Newton's 3rd Law"
      const row1Seed = baseRows[0]?.items || [];
      row1Seed.forEach(it => {
        if (it && it.id) feedSeen.add(String(it.id));
        const n = (it.title || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
        if (n) feedSeen.add(n);
      });
      const row1Extra = pickUnique((cachedCatalog.indianCinema || []).concat(cachedCatalog.trending || []), 15);
      const row1Full = [...row1Seed, ...row1Extra];

      // Row 2: "Continue Watching"
      const cwRow = baseRows.find(r => r.id === "continue_watching");
      let cwFull = cwRow?.items || [];
      if (continueWatchingItems.length > 0) {
        const userItems = continueWatchingItems.map(item => ({
          id: item.tmdbId,
          title: item.title,
          type: item.type,
          posterUrl: item.posterUrl,
          backdropUrl: item.backdropUrl,
          season: item.season,
          episode: item.episode,
          positionSeconds: item.positionSeconds,
          progressPercentage: item.progressPercentage || 40,
          maturityRating: item.maturityRating || "U/A 16+",
          genres: item.genres || ["Drama"]
        }));
        const existingIds = new Set(userItems.map(it => String(it.id)));
        cwFull = [...userItems, ...cwFull.filter(it => !existingIds.has(String(it.id)))];
      }

      // Row 3: "Top 10 Movies in India Today" (Full 10 numbered items)
      const top10MoviesFull = (cachedCatalog.top10Movies?.length >= 10 ? cachedCatalog.top10Movies.slice(0, 10) : baseRows.find(r => r.id === "top_10_movies_india")?.items || []).slice(0, 10).map((it, idx) => {
        feedSeen.add(String(it.id));
        return { ...it, rank: idx + 1, isTop10: true };
      });

      // Row 4: "Top 10 TV Shows in India Today" (Full 10 numbered items)
      const top10TVFull = (cachedCatalog.top10TV?.length >= 10 ? cachedCatalog.top10TV.slice(0, 10) : pickUnique(cachedCatalog.netflixSeries || [], 10)).slice(0, 10).map((it, idx) => {
        feedSeen.add(String(it.id));
        return { ...it, rank: idx + 1, isTop10: true };
      });

      // Row 5: "Trending Now in Indian Cinema"
      const indianTrendingSeed = baseRows.find(r => r.id === "trending_india_cinema")?.items || [];
      const indianTrendingExtra = pickUnique(cachedCatalog.indianCinema || [], 20);
      const indianTrendingFull = [...indianTrendingSeed, ...indianTrendingExtra];

      // Row 6: "Popular on Netflix"
      const popularFull = pickUnique(cachedCatalog.trending || [], 25);

      // Row 7: "Binge-Worthy TV Shows & Crime Thrillers"
      const tvHitsFull = pickUnique((cachedCatalog.crimeSeries || []).concat(cachedCatalog.netflixSeries || []), 25);

      // Row 8: "Action & Adventure Blockbusters"
      const actionFull = pickUnique(cachedCatalog.actionMovies || [], 25);

      // Row 9: "Romantic K-Dramas & International Hits"
      const kdramasFull = pickUnique((cachedCatalog.kdramas || []).concat(cachedCatalog.romance || []), 25);

      // Row 10: "Comedies & Feel-Good Cinema"
      const comediesFull = pickUnique(cachedCatalog.comedies || [], 25);

      // Row 11: "Sci-Fi & Fantasy Epics"
      const sciFiFull = pickUnique(cachedCatalog.sciFi || [], 25);

      // Row 12: "Critically Acclaimed Documentaries"
      const docsFull = pickUnique(cachedCatalog.documentaries || [], 20);

      // Row 13: "We Think You'll Love"
      const loveSeed = baseRows.find(r => r.id === "we_think_youll_love")?.items || [];
      const loveExtra = pickUnique(cachedCatalog.latestDrops || [], 15);
      const loveFull = [...loveSeed, ...loveExtra];

      // Row 14: "New Releases & Recently Added"
      const newReleasesFull = pickUnique(cachedCatalog.latestDrops || [], 25);

      rows.push(
        {
          id: "because_newton",
          title: "Because you watched Newton's 3rd Law",
          items: row1Full
        },
        {
          id: "continue_watching",
          title: "Continue Watching for User",
          isContinueWatching: true,
          items: cwFull
        },
        {
          id: "top_10_movies_india",
          title: "Top 10 Movies in India Today",
          isTop10: true,
          items: top10MoviesFull
        },
        {
          id: "top_10_tv_india",
          title: "Top 10 TV Shows in India Today",
          isTop10: true,
          items: top10TVFull
        },
        {
          id: "trending_india_cinema",
          title: "Trending Now in Indian Cinema",
          items: indianTrendingFull
        },
        {
          id: "popular_on_netflix",
          title: "Popular on Netflix",
          items: popularFull
        },
        {
          id: "binge_worthy_tv",
          title: "Binge-Worthy TV Shows & Crime Thrillers",
          items: tvHitsFull
        },
        {
          id: "action_blockbusters",
          title: "Action & Adventure Blockbusters",
          items: actionFull
        },
        {
          id: "romantic_kdramas",
          title: "Romantic K-Dramas & International Hits",
          items: kdramasFull
        },
        {
          id: "feel_good_comedies",
          title: "Comedies & Feel-Good Cinema",
          items: comediesFull
        },
        {
          id: "scifi_fantasy_epics",
          title: "Sci-Fi & Fantasy Epics",
          items: sciFiFull
        },
        {
          id: "acclaimed_docs",
          title: "Critically Acclaimed Documentaries & Real Stories",
          items: docsFull
        },
        {
          id: "we_think_youll_love",
          title: "We Think You'll Love",
          items: loveFull
        },
        {
          id: "new_releases",
          title: "New Releases & Recently Added",
          items: newReleasesFull
        }
      );
    }

    res.json({
      status: "success",
      data: {
        hero: heroItem,
        heroRotation: cachedCatalog.heroRotation || [heroItem],
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

// User Notifications Endpoint
app.get("/api/v1/user/notifications", (req, res) => {
  res.json({
    status: "success",
    data: MASTER_CATALOG.notifications || []
  });
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

// Live Search Typeahead & Instant Suggestions
app.get("/api/v1/search/suggest", async (req, res) => {
  const query = (req.query.q || "").trim();
  if (!query || query.length < 2) {
    return res.json({ status: "success", data: [] });
  }

  try {
    const rawResults = await searchAllMedia(query);
    const formatted = deduplicateMediaList(rawResults).slice(0, 8).map(it => formatMediaItem(it));
    res.json({ status: "success", data: formatted });
  } catch (err) {
    console.error("[Search] Suggestion error:", err.message);
    res.json({ status: "success", data: [] });
  }
});

// User Profiles API (Multi-Profile Support)
app.get("/api/v1/user/profiles", (req, res) => {
  res.json({
    status: "success",
    data: [
      {
        id: "profile_1",
        name: "User 1",
        avatarColor: "#E50914",
        avatarType: "red-smile",
        isKids: false,
        isActive: true
      },
      {
        id: "profile_2",
        name: "Children",
        avatarColor: "#FFAA00",
        avatarType: "kids",
        isKids: true,
        isActive: false
      },
      {
        id: "profile_3",
        name: "Guest",
        avatarColor: "#0071EB",
        avatarType: "blue-smile",
        isKids: false,
        isActive: false
      }
    ]
  });
});

// Media Details Endpoint
app.get("/api/v1/media/:type/:id", async (req, res) => {
  const { type, id } = req.params;

  // 1. Fetch live details from TMDb (with credits, cast, director, and similar)
  let details = null;
  try {
    details = await fetchItemDetails(type, id);
  } catch (err) {}

  // 2. Check MASTER_CATALOG for metadata augmentation
  const allMaster = [
    MASTER_CATALOG.hero,
    ...MASTER_CATALOG.rows.flatMap(r => r.items || [])
  ];
  const masterMatch = allMaster.find(it => it && String(it.id) === String(id));

  if (!details && masterMatch) {
    details = {
      id: masterMatch.id,
      title: masterMatch.title,
      overview: masterMatch.overview,
      posterUrl: masterMatch.posterUrl,
      backdropUrl: masterMatch.backdropUrl,
      vote_average: masterMatch.rating || 8.8,
      genres: (masterMatch.genres || ["Drama"]).map(name => ({ name })),
      runtime: 114,
      number_of_seasons: masterMatch.numberOfSeasons || 1
    };
  }

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

  const castList = (details.credits && details.credits.cast)
    ? details.credits.cast.slice(0, 6).map(c => c.name)
    : ["Acclaimed Cast Ensemble"];

  const directorName = (details.credits && details.credits.crew)
    ? (details.credits.crew.find(c => c.job === "Director") || {}).name || "Visionary Director"
    : (details.created_by && details.created_by[0] ? details.created_by[0].name : "Visionary Creator");

  const similarList = (details.similar && details.similar.results)
    ? details.similar.results.slice(0, 9).map(it => formatMediaItem(it, type))
    : [];

  const releaseYear = (details.release_date || details.first_air_date || "2026").substring(0, 4);

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
      matchPercentage: `${Math.min(99, Math.max(88, Math.round((details.vote_average || 8) * 10 + 12)))}% Match`,
      maturityRating: details.adult ? "A" : (type === "tv" ? "U/A 16+" : "U/A 13+"),
      genres: (details.genres || []).map(g => g.name || g),
      duration: duration,
      year: releaseYear,
      audioQuality: "DOLBY ATMOS 5.1",
      videoQuality: "4K ULTRA HD",
      cast: castList,
      director: directorName,
      similar: similarList,
      numberOfSeasons: details.number_of_seasons || 1,
      seasons: seasonsList
    }
  });
});

// Recommendations / More Like This Endpoint
app.get("/api/v1/media/:type/:id/more-like-this", async (req, res) => {
  const { type, id } = req.params;
  try {
    const details = await fetchItemDetails(type, id);
    if (details && details.similar && details.similar.results && details.similar.results.length > 0) {
      const items = details.similar.results.slice(0, 12).map(it => formatMediaItem(it, type));
      return res.json({ status: "success", data: items });
    }
  } catch (e) {}

  // Fallback to cached catalog items
  const fallback = (cachedCatalog.trending || []).slice(0, 9).map(it => formatMediaItem(it));
  res.json({ status: "success", data: fallback });
});

app.get("/api/v1/tv/:tvId/season/:seasonNumber", async (req, res) => {
  const { tvId, seasonNumber } = req.params;

  // Specific 1:1 authentic episodes for Chumbak (from Screenshot 4: "Chumbak E1 Episode 1")
  if (String(tvId) === "82061016") {
    return res.json({
      status: "success",
      data: [
        {
          episodeNumber: 1,
          name: "Episode 1",
          overview: "Don't grin like an idiot at her stupid joke. An awkward encounter at the cafe kicks off an unforgettable sequence of comedic missteps.",
          stillUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
          runtime: "42m"
        },
        {
          episodeNumber: 2,
          name: "Episode 2: The Highway Confession",
          overview: "When their broken-down car strands them on a remote bypass, old memories and unfiltered revelations start spilling over hot tea.",
          stillUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
          runtime: "45m"
        },
        {
          episodeNumber: 3,
          name: "Episode 3: The Golden Plan",
          overview: "A mistaken delivery sparks an audacious idea that promises quick fortune but brings triple the trouble.",
          stillUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
          runtime: "49m"
        },
        {
          episodeNumber: 4,
          name: "Episode 4: The Comedy of Errors",
          overview: "Disguised as wedding guests, the trio must perform an improvised dance of deception to escape caught red-handed.",
          stillUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
          runtime: "51m"
        },
        {
          episodeNumber: 5,
          name: "Episode 5: Season Finale",
          overview: "All the threads converge in a heartfelt, uproarious finale where friendship proves far stronger than their blunders.",
          stillUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80",
          runtime: "55m"
        }
      ]
    });
  }
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
