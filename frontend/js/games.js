/* CinePlay - Games Page Controller */

document.addEventListener("DOMContentLoaded", () => {
  initGamesPage();
  initRecentlyViewedGames();
});

// Grid State Parameters
let activeGenre = "All";
let activePlatform = "All";
let activePrice = "All";
let activeExperience = "All";
let searchQuery = "";
let sortBy = "rating-desc";
let currentPage = 1;
let isLoading = false;
const itemsPerPage = 8;

function initGamesPage() {
  const searchInput = document.getElementById("game-search");
  const sortSelect = document.getElementById("game-sort");
  const platformSelect = document.getElementById("game-platform");
  const priceSelect = document.getElementById("game-price");
  const expSelect = document.getElementById("game-experience");
  const genresContainer = document.getElementById("genres-container");
  const loadMoreBtn = document.getElementById("btn-load-more");
  const resetBtn = document.getElementById("btn-reset-game-filters");
  const applyBtn = document.getElementById("btn-apply-game-filters");
  const drawerToggleBtn = document.getElementById("btn-toggle-game-filters");
  const drawerCloseBtn = document.getElementById("btn-close-game-drawer");
  const drawer = document.getElementById("advanced-game-filter-drawer");

  // Read URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const urlSearch = urlParams.get("search");
  const urlGenre = urlParams.get("genre");

  if (urlSearch && searchInput) {
    searchQuery = decodeURIComponent(urlSearch);
    searchInput.value = searchQuery;
  }

  if (urlGenre && genresContainer) {
    activeGenre = urlGenre;
    genresContainer.querySelectorAll(".genre-pill").forEach(pill => {
      pill.classList.toggle("active", pill.dataset.genre.toLowerCase() === activeGenre.toLowerCase());
    });
  }

  // Drawer Toggles
  if (drawerToggleBtn && drawer) {
    drawerToggleBtn.addEventListener("click", () => {
      const isVis = drawer.style.display === "flex";
      drawer.style.display = isVis ? "none" : "flex";
    });
  }
  if (drawerCloseBtn && drawer) {
    drawerCloseBtn.addEventListener("click", () => {
      drawer.style.display = "none";
    });
  }

  // Bind Events
  if (searchInput) {
    searchInput.addEventListener("input", debounce((e) => {
      searchQuery = e.target.value.trim();
      loadGamesGrid(true);
    }, 300));
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      sortBy = e.target.value;
      loadGamesGrid(true);
    });
  }

  if (platformSelect) {
    platformSelect.addEventListener("change", (e) => {
      activePlatform = e.target.value;
      loadGamesGrid(true);
    });
  }

  if (priceSelect) {
    priceSelect.addEventListener("change", (e) => {
      activePrice = e.target.value;
      loadGamesGrid(true);
    });
  }

  if (expSelect) {
    expSelect.addEventListener("change", (e) => {
      activeExperience = e.target.value;
      loadGamesGrid(true);
    });
  }

  if (genresContainer) {
    genresContainer.addEventListener("click", (e) => {
      const pill = e.target.closest(".genre-pill");
      if (!pill) return;
      genresContainer.querySelectorAll(".genre-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeGenre = pill.dataset.genre;
      loadGamesGrid(true);
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      if (platformSelect) activePlatform = platformSelect.value;
      if (priceSelect) activePrice = priceSelect.value;
      if (expSelect) activeExperience = expSelect.value;
      loadGamesGrid(true);
      if (drawer) drawer.style.display = "none";
      if (window.CinePlay.showToast) window.CinePlay.showToast("Game filters applied!", "fa-check");
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (sortSelect) sortSelect.value = "rating-desc";
      if (platformSelect) platformSelect.value = "All";
      if (priceSelect) priceSelect.value = "All";
      if (expSelect) expSelect.value = "All";
      searchQuery = "";
      sortBy = "rating-desc";
      activeGenre = "All";
      activePlatform = "All";
      activePrice = "All";
      activeExperience = "All";
      
      if (genresContainer) {
        genresContainer.querySelectorAll(".genre-pill").forEach(p => {
          p.classList.toggle("active", p.dataset.genre === "All");
        });
      }

      loadGamesGrid(true);
      if (window.CinePlay.showToast) window.CinePlay.showToast("Game filters reset", "fa-rotate-left");
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      currentPage++;
      loadGamesGrid(false);
    });
    initInfiniteScroll(loadMoreBtn);
  }

  window.addEventListener("favoritesChanged", syncFavoritesState);
  loadGamesGrid(true);
}

/* Fetch games from client API service and trigger render */
async function loadGamesGrid(resetPage = true) {
  const loadMoreBtn = document.getElementById("btn-load-more");
  const countText = document.getElementById("game-match-count-text");

  if (isLoading) return;
  isLoading = true;

  if (resetPage) {
    currentPage = 1;
    showGridSkeletons();
  } else if (loadMoreBtn) {
    loadMoreBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Loading Games...`;
    loadMoreBtn.disabled = true;
  }
  updateActiveGameChips();

  try {
    // ✅ Try API first
    let response = await window.CinePlayAPI.fetchGames({
      query: searchQuery,
      genre: activeGenre,
      platform: activePlatform,
      sortBy: sortBy,
      page: currentPage,
      limit: itemsPerPage
    });

    let results = response.results || [];

    // ✅ If API returned empty or failed, use local data
    if (results.length === 0 && window.gamesData) {
      console.warn("[Games] API returned empty, using local fallback");
      let localGames = [...window.gamesData];
      if (searchQuery) localGames = localGames.filter(g => 
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.genre && g.genre.some(gen => gen.toLowerCase().includes(searchQuery.toLowerCase())))
      );
      if (activeGenre !== "All") localGames = localGames.filter(g => g.genre && g.genre.includes(activeGenre));
      if (activePlatform !== "All") localGames = localGames.filter(g => g.platform && g.platform.includes(activePlatform));
      
      // Sort
      localGames.sort((a, b) => {
        if (sortBy === "rating-desc") return b.rating - a.rating;
        if (sortBy === "year-desc") return b.year - a.year;
        return 0;
      });
      
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      results = localGames.slice(start, end);
      response = { results, total: localGames.length, hasMore: end < localGames.length };
    }

    // Apply price filter
    if (activePrice !== "All") {
      results = results.filter(g => {
        if (activePrice === "Free") return g.price === "Free" || g.price === "0";
        const priceNum = parseInt((g.price || "0").replace(/[^\d]/g, "") || "0");
        if (activePrice === "Under500") return g.price !== "Free" && priceNum <= 1000;
        if (activePrice === "Under2000") return g.price !== "Free" && priceNum <= 2500;
        if (activePrice === "2000Plus") return g.price !== "Free" && priceNum > 2500;
        return true;
      });
    }

    // Apply experience filter
    if (activeExperience !== "All") {
      results = results.filter(g => {
        const desc = (g.description || "").toLowerCase();
        const tags = (g.tags || []).join(" ").toLowerCase();
        const genreStr = (g.genre || []).join(" ").toLowerCase();
        const combined = `${desc} ${tags} ${genreStr}`;
        if (activeExperience === "Singleplayer") return combined.includes("singleplayer") || combined.includes("story");
        if (activeExperience === "Multiplayer") return combined.includes("multiplayer") || combined.includes("co-op") || combined.includes("pvp");
        if (activeExperience === "Open World") return combined.includes("open world") || combined.includes("exploration");
        return true;
      });
    }

    if (countText) {
      countText.innerHTML = `<i class="fa-solid fa-gamepad" style="color: var(--accent-red);"></i> Found <strong>${results.length}</strong> matching games`;
    }

    const grid = document.getElementById("games-grid");
    const emptyState = document.getElementById("games-empty");

    if (loadMoreBtn) {
      loadMoreBtn.innerHTML = `<i class="fa-solid fa-arrows-spin"></i> Load More Games`;
      loadMoreBtn.disabled = false;
    }

    if (results.length === 0) {
      if (resetPage && grid) grid.innerHTML = "";
      if (emptyState) emptyState.style.display = resetPage ? "block" : "none";
      if (loadMoreBtn) loadMoreBtn.style.display = "none";
      isLoading = false;
      return;
    }

    if (emptyState) emptyState.style.display = "none";
    window.CinePlay.renderGames(results, grid, !resetPage);
    
    if (loadMoreBtn) {
      const hasMore = response.hasMore !== undefined ? response.hasMore : results.length === itemsPerPage;
      loadMoreBtn.style.display = hasMore ? "inline-flex" : "none";
    }

    isLoading = false;
  } catch (error) {
    console.error("Error loading games:", error);
    const grid = document.getElementById("games-grid");
    const emptyState = document.getElementById("games-empty");
    
    // ✅ Try local fallback if API fails
    if (window.gamesData && resetPage) {
      console.warn("[Games] API error, using local fallback");
      let localGames = [...window.gamesData];
      if (searchQuery) localGames = localGames.filter(g => 
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (activeGenre !== "All") localGames = localGames.filter(g => g.genre && g.genre.includes(activeGenre));
      
      localGames.sort((a, b) => {
        if (sortBy === "rating-desc") return b.rating - a.rating;
        if (sortBy === "year-desc") return b.year - a.year;
        return 0;
      });
      
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const results = localGames.slice(start, end);
      
      if (results.length > 0) {
        if (emptyState) emptyState.style.display = "none";
        window.CinePlay.renderGames(results, grid, false);
        if (loadMoreBtn) {
          loadMoreBtn.style.display = end < localGames.length ? "inline-flex" : "none";
        }
        isLoading = false;
        return;
      }
    }
    
    if (loadMoreBtn) {
      loadMoreBtn.innerHTML = `<i class="fa-solid fa-arrows-spin"></i> Load More Games`;
      loadMoreBtn.disabled = false;
      loadMoreBtn.style.display = "none";
    }
    if (emptyState) emptyState.style.display = "none";
    if (grid && resetPage) {
      grid.innerHTML = `
        <div class="empty-state error-state" style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 44px; color: var(--accent-red); margin-bottom: 16px;"></i>
          <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Unable to Load Games</h3>
          <p style="font-size: 14px; color: var(--text-secondary); max-width: 460px; margin: 0 auto 20px;">We encountered an issue fetching games. Please check your internet connection or try again.</p>
          <button class="btn btn-primary" style="border-radius: 25px; padding: 10px 24px;" onclick="loadGamesGrid(true)">
            <i class="fa-solid fa-rotate-right"></i> Retry
          </button>
        </div>
      `;
    }
    isLoading = false;
  }
}

function initInfiniteScroll(sentinelEl) {
  if (!("IntersectionObserver" in window) || !sentinelEl) return;

  let observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const btn = document.getElementById("btn-load-more");
      if (
        entry.isIntersecting &&
        btn &&
        btn.style.display !== "none" &&
        !btn.disabled &&
        !isLoading
      ) {
        currentPage++;
        loadGamesGrid(false);
      }
    });
  }, { 
    rootMargin: "300px 0px",
    threshold: 0.1
  });

  observer.observe(sentinelEl);
}

function updateActiveGameChips() {
  const container = document.getElementById("game-chips-container");
  const countBadge = document.getElementById("game-filter-count");
  if (!container) return;

  let activeCount = 0;
  let html = "";

  if (activeGenre !== "All") {
    activeCount++;
    html += `<span class="filter-chip-tag">${activeGenre} <i class="fa-solid fa-xmark" onclick="clearGameFilter('genre')"></i></span>`;
  }
  if (activePlatform !== "All") {
    activeCount++;
    html += `<span class="filter-chip-tag">${activePlatform} <i class="fa-solid fa-xmark" onclick="clearGameFilter('platform')"></i></span>`;
  }
  if (activePrice !== "All") {
    activeCount++;
    html += `<span class="filter-chip-tag">Price: ${activePrice} <i class="fa-solid fa-xmark" onclick="clearGameFilter('price')"></i></span>`;
  }
  if (searchQuery) {
    activeCount++;
    html += `<span class="filter-chip-tag">Search: "${searchQuery}" <i class="fa-solid fa-xmark" onclick="clearGameFilter('search')"></i></span>`;
  }

  container.innerHTML = html;
  if (countBadge) {
    countBadge.textContent = activeCount;
    countBadge.style.display = activeCount > 0 ? "inline-block" : "none";
  }
}

window.clearGameFilter = function(filterType) {
  if (filterType === "genre") activeGenre = "All";
  if (filterType === "platform") { activePlatform = "All"; const p = document.getElementById("game-platform"); if (p) p.value = "All"; }
  if (filterType === "price") { activePrice = "All"; const pr = document.getElementById("game-price"); if (pr) pr.value = "All"; }
  if (filterType === "search") { searchQuery = ""; const s = document.getElementById("game-search"); if (s) s.value = ""; }
  loadGamesGrid(true);
};

function showGridSkeletons() {
  const grid = document.getElementById("games-grid");
  const loadMoreBtn = document.getElementById("btn-load-more");
  const emptyState = document.getElementById("games-empty");
  
  emptyState.style.display = "none";
  loadMoreBtn.style.display = "none";

  let skeletonHtml = "";
  for (let i = 0; i < 4; i++) {
    skeletonHtml += `
      <div class="media-card skeleton-card">
        <div class="card-img-wrapper skeleton" style="aspect-ratio: 2/3; height: 320px;"></div>
        <div class="card-content">
          <div class="skeleton" style="height: 12px; width: 45%; margin-bottom: 10px;"></div>
          <div class="skeleton" style="height: 20px; width: 80%; margin-bottom: 12px;"></div>
          <div class="skeleton" style="height: 12px; width: 50%; margin-bottom: 20px;"></div>
          <div class="skeleton" style="height: 35px; width: 100%;"></div>
        </div>
      </div>
    `;
  }
  grid.innerHTML = skeletonHtml;
}

function syncFavoritesState() {
  const grid = document.getElementById("games-grid");
  if (!grid) return;
  const cards = grid.querySelectorAll(".media-card");
  cards.forEach(card => {
    const id = card.dataset.id;
    const btn = card.querySelector(".card-favorite-btn");
    if (!btn) return;
    const isFav = window.CinePlay.isFavorite(id);
    btn.classList.toggle("active", isFav);
    const icon = btn.querySelector("i");
    if (icon) icon.className = isFav ? "fa-solid fa-heart" : "fa-regular fa-heart";
  });
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/* ==========================================================================
   Recently Viewed Slider
   ========================================================================== */
function initRecentlyViewedGames() {
  const container = document.getElementById("recently-viewed-container");
  const slider = document.getElementById("recently-viewed-slider");
  if (!container || !slider) return;

  function renderViewed() {
    const viewed = window.CinePlay.getRecentlyViewed();
    const gameViewed = viewed.filter(item => item.type === "game");

    if (gameViewed.length === 0) {
      container.style.display = "none";
      return;
    }

    container.style.display = "block";
    const games = gameViewed
      .map(v => window.gamesData.find(g => g.id === v.id))
      .filter(Boolean);

    window.CinePlay.renderGames(games, slider);
  }

  renderViewed();
  window.addEventListener("recentlyViewedChanged", renderViewed);
  window.addEventListener("favoritesChanged", renderViewed);
}