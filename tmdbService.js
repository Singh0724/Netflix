const axios = require("axios");

const TMDB_PROXY_BASE = "https://tmdb-proxy.vercel.app/3";
const TMDB_PROXY_KEY = "4e44d9029b1270a757cddc766a1bcb63";

async function fetchEndpoint(endpoint, params = {}) {
  // Tier 1: Try official TMDb API if API key provided in env
  const envKey = process.env.TMDB_API_KEY && process.env.TMDB_API_KEY.trim();
  const envBase = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";

  if (envKey) {
    try {
      const res = await axios.get(`${envBase}${endpoint}`, {
        params: { api_key: envKey, ...params },
        timeout: 8000
      });
      if (res.data) return res.data;
    } catch (err) {
      console.warn(`[TMDb] Direct API attempt failed for ${endpoint}:`, err.message);
    }
  }

  // Tier 2: Fallback to high-speed proxy
  try {
    const res = await axios.get(`${TMDB_PROXY_BASE}${endpoint}`, {
      params: { api_key: TMDB_PROXY_KEY, ...params },
      timeout: 9000
    });
    return res.data;
  } catch (err) {
    console.error(`[TMDb] Proxy failed for ${endpoint}:`, err.message);
    return null;
  }
}

async function fetchMultiPage(endpoint, params = {}, maxPages = 3) {
  const pagePromises = [];
  for (let p = 1; p <= maxPages; p++) {
    pagePromises.push(fetchEndpoint(endpoint, { ...params, page: p }));
  }
  const results = await Promise.all(pagePromises);
  const items = [];
  results.forEach(r => {
    if (r && r.results) {
      items.push(...r.results);
    }
  });
  return items;
}

// -------------------------------------------------------------
// Strict Multi-Factor Deduplication Engine
// -------------------------------------------------------------
function deduplicateMediaList(items) {
  if (!Array.isArray(items)) return [];
  const seenIds = new Set();
  const seenTitles = new Set();
  const unique = [];

  for (const it of items) {
    if (!it) continue;
    const rawTitle = it.title || it.name || it.original_title || it.original_name;
    if (!rawTitle) continue;
    if (!it.poster_path && !it.posterUrl && !it.backdrop_path && !it.backdropUrl) continue;

    const id = it.id ? Number(it.id) : null;
    const normTitle = rawTitle.toLowerCase().trim().replace(/[^a-z0-9]/g, "");

    if (id && seenIds.has(id)) continue;
    if (normTitle && seenTitles.has(normTitle)) continue;

    if (id) seenIds.add(id);
    if (normTitle) seenTitles.add(normTitle);
    unique.push(it);
  }
  return unique;
}

// 1. Trending in India & Global (Day & Week, Deduplicated)
async function fetchTrendingAll() {
  const [day, week] = await Promise.all([
    fetchMultiPage("/trending/all/day", {}, 3),
    fetchMultiPage("/trending/all/week", {}, 2)
  ]);
  return deduplicateMediaList([...day, ...week]);
}

// 2. Comprehensive Latest Netflix Drops (Originals + Licensed Hits)
async function fetchLatestNetflixReleases() {
  const today = new Date().toISOString().split("T")[0];
  const [tvOrig, tvLicIn, tvLicUs, movIn, movUs] = await Promise.all([
    fetchMultiPage("/discover/tv", {
      with_networks: "213",
      "first_air_date.lte": today,
      sort_by: "first_air_date.desc"
    }, 2),
    fetchMultiPage("/discover/tv", {
      with_watch_providers: "8",
      watch_region: "IN",
      "first_air_date.lte": today,
      sort_by: "first_air_date.desc"
    }, 2),
    fetchMultiPage("/discover/tv", {
      with_watch_providers: "8",
      watch_region: "US",
      "first_air_date.lte": today,
      sort_by: "first_air_date.desc"
    }, 2),
    fetchMultiPage("/discover/movie", {
      with_watch_providers: "8",
      watch_region: "IN",
      "primary_release_date.lte": today,
      sort_by: "primary_release_date.desc"
    }, 2),
    fetchMultiPage("/discover/movie", {
      with_watch_providers: "8",
      watch_region: "US",
      "primary_release_date.lte": today,
      sort_by: "primary_release_date.desc"
    }, 2)
  ]);

  return deduplicateMediaList([...tvOrig, ...tvLicIn, ...movIn, ...tvLicUs, ...movUs]);
}

// 3. Complete Netflix Series (Both Originals AND Big Hit Licensed Shows)
async function fetchNetflixIndiaSeries() {
  const [originals, licensedIn, licensedUs] = await Promise.all([
    fetchMultiPage("/discover/tv", {
      with_networks: "213",
      sort_by: "popularity.desc"
    }, 3),
    fetchMultiPage("/discover/tv", {
      with_watch_providers: "8",
      watch_region: "IN",
      sort_by: "popularity.desc",
      "vote_count.gte": 5
    }, 3),
    fetchMultiPage("/discover/tv", {
      with_watch_providers: "8",
      watch_region: "US",
      sort_by: "popularity.desc",
      "vote_count.gte": 5
    }, 2)
  ]);

  return deduplicateMediaList([...originals, ...licensedIn, ...licensedUs]);
}

// 4. Hit Blockbuster Movies on Netflix (India & Global)
async function fetchNetflixMovies() {
  const [inMovies, usMovies, topRated] = await Promise.all([
    fetchMultiPage("/discover/movie", {
      with_watch_providers: "8",
      watch_region: "IN",
      sort_by: "popularity.desc",
      "vote_count.gte": 10
    }, 3),
    fetchMultiPage("/discover/movie", {
      with_watch_providers: "8",
      watch_region: "US",
      sort_by: "popularity.desc",
      "vote_count.gte": 10
    }, 3),
    fetchMultiPage("/discover/movie", {
      with_watch_providers: "8",
      watch_region: "IN",
      sort_by: "vote_average.desc",
      "vote_count.gte": 500
    }, 2)
  ]);

  return deduplicateMediaList([...inMovies, ...usMovies, ...topRated]);
}

// 5. Search Across All Titles
async function searchAllMedia(query) {
  const data = await fetchEndpoint("/search/multi", { query });
  if (!data || !data.results) return [];
  return data.results.filter(item => item.media_type === "movie" || item.media_type === "tv");
}

// 6. Full Item Details
async function fetchItemDetails(type, id) {
  return fetchEndpoint(`/${type}/${id}`, {
    append_to_response: "credits,similar,videos"
  });
}

// 7. Season Episodes
async function fetchSeasonEpisodes(tvId, seasonNumber) {
  const data = await fetchEndpoint(`/tv/${tvId}/season/${seasonNumber}`);
  return data ? data.episodes || [] : [];
}

module.exports = {
  deduplicateMediaList,
  fetchTrendingAll,
  fetchLatestNetflixReleases,
  fetchNetflixIndiaSeries,
  fetchNetflixMovies,
  searchAllMedia,
  fetchItemDetails,
  fetchSeasonEpisodes
};
