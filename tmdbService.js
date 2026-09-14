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

// 1. Trending in India & Global Today
async function fetchTrendingAll() {
  return fetchMultiPage("/trending/all/day", {}, 3);
}

// 2. Netflix India & Global Latest Releases (New yesterday & today)
async function fetchLatestNetflixReleases() {
  const today = new Date().toISOString().split("T")[0];
  const [tvNew, movieNew] = await Promise.all([
    fetchMultiPage("/discover/tv", {
      with_networks: "213",
      "first_air_date.lte": today,
      sort_by: "first_air_date.desc"
    }, 3),
    fetchMultiPage("/discover/movie", {
      with_watch_providers: "8",
      watch_region: "IN",
      "primary_release_date.lte": today,
      sort_by: "primary_release_date.desc"
    }, 3)
  ]);
  return [...tvNew, ...movieNew];
}

// 3. Popular Netflix India Series (e.g., Kota Factory, Delhi Crime, Sacred Games, The Railway Men)
async function fetchNetflixIndiaSeries() {
  return fetchMultiPage("/discover/tv", {
    with_networks: "213",
    sort_by: "popularity.desc"
  }, 4);
}

// 4. Hit Blockbuster Movies on Netflix (India & Global)
async function fetchNetflixMovies() {
  const [inMovies, usMovies] = await Promise.all([
    fetchMultiPage("/discover/movie", {
      with_watch_providers: "8",
      watch_region: "IN",
      sort_by: "popularity.desc"
    }, 2),
    fetchMultiPage("/discover/movie", {
      with_watch_providers: "8",
      watch_region: "US",
      sort_by: "popularity.desc"
    }, 2)
  ]);
  return [...inMovies, ...usMovies];
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
  fetchTrendingAll,
  fetchLatestNetflixReleases,
  fetchNetflixIndiaSeries,
  fetchNetflixMovies,
  searchAllMedia,
  fetchItemDetails,
  fetchSeasonEpisodes
};
