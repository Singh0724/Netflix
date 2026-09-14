/**
 * User State & Watch Progress Store with Persistent Storage
 * Manages playback timestamps, progress percentages, cross-device "Continue Watching" sync,
 * and "My List" bookmarks across server restarts.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, ".data");
const STATE_FILE = path.join(DATA_DIR, "user_state.json");

class ProgressStore {
  constructor() {
    this.deviceProgress = new Map();
    this.deviceMyList = new Map();
    this._initStorage();
  }

  _initStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.progress) {
          for (const [k, v] of Object.entries(parsed.progress)) {
            this.deviceProgress.set(k, v);
          }
        }
        if (parsed.myList) {
          for (const [k, v] of Object.entries(parsed.myList)) {
            this.deviceMyList.set(k, v);
          }
        }
      }
    } catch (err) {
      console.warn("[ProgressStore] Failed to load local state file, using in-memory:", err.message);
    }
  }

  _persistState() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = {
        progress: Object.fromEntries(this.deviceProgress),
        myList: Object.fromEntries(this.deviceMyList),
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("[ProgressStore] Persistence error:", err.message);
    }
  }

  saveProgress({ deviceId = "global_user", tmdbId, title, type, season = 1, episode = 1, positionSeconds = 0, durationSeconds = 1, posterUrl, backdropUrl }) {
    if (!tmdbId) return null;

    if (!this.deviceProgress.has(deviceId)) {
      this.deviceProgress.set(deviceId, []);
    }

    const list = this.deviceProgress.get(deviceId);
    const existingIndex = list.findIndex(it => Number(it.tmdbId) === Number(tmdbId));

    const progressPercentage = Math.min(100, Math.round((positionSeconds / Math.max(1, durationSeconds)) * 100));

    const record = {
      tmdbId: Number(tmdbId),
      title,
      type,
      season: Number(season),
      episode: Number(episode),
      positionSeconds: Number(positionSeconds),
      durationSeconds: Number(durationSeconds),
      progressPercentage,
      posterUrl,
      backdropUrl,
      lastWatchedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.unshift(record);
    }

    // Keep top 30 most recent watch items
    if (list.length > 30) {
      this.deviceProgress.set(deviceId, list.slice(0, 30));
    }

    this._persistState();
    return record;
  }

  getContinueWatching(deviceId = "global_user") {
    const list = this.deviceProgress.get(deviceId) || [];
    // Return items that are in progress (between 2% and 95% watched)
    return list.filter(item => item.progressPercentage >= 2 && item.progressPercentage <= 95);
  }

  // -------------------------------------------------------------
  // My List Operations
  // -------------------------------------------------------------
  addToList(deviceId = "global_user", item) {
    if (!item || !item.id) return [];
    if (!this.deviceMyList.has(deviceId)) {
      this.deviceMyList.set(deviceId, []);
    }
    const list = this.deviceMyList.get(deviceId);
    const existingIdx = list.findIndex(it => Number(it.id) === Number(item.id));
    if (existingIdx === -1) {
      list.unshift({
        id: Number(item.id),
        title: item.title,
        type: item.type || "movie",
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        matchPercentage: item.matchPercentage || "98% Match",
        maturityRating: item.maturityRating || "16+",
        runtimeDisplay: item.runtimeDisplay || "Featured",
        genres: item.genres || ["Drama"],
        addedAt: new Date().toISOString()
      });
      this._persistState();
    }
    return list;
  }

  removeFromList(deviceId = "global_user", tmdbId) {
    if (!this.deviceMyList.has(deviceId)) return [];
    const list = this.deviceMyList.get(deviceId);
    const filtered = list.filter(it => Number(it.id) !== Number(tmdbId));
    this.deviceMyList.set(deviceId, filtered);
    this._persistState();
    return filtered;
  }

  getMyList(deviceId = "global_user") {
    return this.deviceMyList.get(deviceId) || [];
  }

  isInList(deviceId = "global_user", tmdbId) {
    const list = this.deviceMyList.get(deviceId) || [];
    return list.some(it => Number(it.id) === Number(tmdbId));
  }
}

module.exports = new ProgressStore();
