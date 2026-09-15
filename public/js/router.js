/**
 * Netflix Web Replica — Client-Side Hash Router (Phase 1)
 * Handles deep-linking, back/forward history navigation, and modal/player synchronization.
 */

class NetflixRouter {
  constructor() {
    this.routes = new Map();
    this.currentHash = window.location.hash || '#/browse';
    this.isNavigatingProgrammatically = false;

    window.addEventListener('hashchange', () => this.handleHashChange());
    window.addEventListener('popstate', () => this.handleHashChange());
  }

  register(routePattern, handler) {
    this.routes.set(routePattern, handler);
  }

  navigate(hash, replace = false) {
    if (window.location.hash === hash) return;
    this.isNavigatingProgrammatically = true;
    if (replace) {
      const url = window.location.pathname + window.location.search + hash;
      window.history.replaceState(null, '', url);
    } else {
      window.location.hash = hash;
    }
    this.handleHashChange();
    setTimeout(() => { this.isNavigatingProgrammatically = false; }, 50);
  }

  handleHashChange() {
    const rawHash = window.location.hash || '#/browse';
    this.currentHash = rawHash;

    const [pathPart, queryPart] = rawHash.split('?');
    const params = new URLSearchParams(queryPart || '');

    // 1. Check title modal route: #/title/:id
    const titleMatch = pathPart.match(/^#\/title\/([a-zA-Z0-9_\-]+)$/);
    if (titleMatch) {
      const mediaId = titleMatch[1];
      if (typeof openQuickviewModalById === 'function') {
        openQuickviewModalById(mediaId);
      }
      return;
    }

    // 2. Check watch player route: #/watch/:id
    const watchMatch = pathPart.match(/^#\/watch\/([a-zA-Z0-9_\-]+)$/);
    if (watchMatch) {
      const mediaId = watchMatch[1];
      if (typeof launchNetflixPlayerById === 'function') {
        launchNetflixPlayerById(mediaId);
      }
      return;
    }

    // 3. Close open modal or player if navigated back to browse
    if (pathPart === '#/browse' || pathPart === '#' || pathPart === '') {
      const player = document.getElementById('netflixPlayer');
      if (player && player.classList.contains('active')) {
        if (typeof exitNetflixPlayer === 'function') exitNetflixPlayer();
      }
      const modal = document.getElementById('detailQuickviewModal');
      if (modal && modal.classList.contains('active')) {
        if (typeof closeDetailModal === 'function') closeDetailModal(true);
      }

      // Handle category filtering
      const category = params.get('category') || 'all';
      const search = params.get('q') || '';
      if (typeof switchNavCategory === 'function') {
        switchNavCategory(category, false);
      }
    }
  }

  init() {
    // Delay initial route evaluation until DOM & catalog listeners are ready
    setTimeout(() => {
      this.handleHashChange();
    }, 300);
  }
}

window.netflixRouter = new NetflixRouter();
