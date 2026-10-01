/* CinePlay - Movies Page Controller */

document.addEventListener("DOMContentLoaded", () => {
  initMoviesPage();
  initRecentlyViewedMovies();
});

// Grid State Parameters
let activeGenre = "All";
let searchQuery = "";
let sortBy = "popularity-desc";
let minRating = 0;
let selectedLanguage = "All";
let selectedCountry = "All";
let selectedEra = "All";
let selectedProvider = "All";
let selectedActor = "";
let selectedDirector = "";
let currentPage = 1;
let isLoading = false;
const itemsPerPage = 12;

function initMoviesPage() {
  const searchInput = document.getElementById("movie-search");
  const sortSelect = document.getElementById("movie-sort");
  const langSelect = document.getElementById("movie-language");
  const countrySelect = document.getElementById("movie-country");
  const eraSelect = document.getElementById("movie-era");
  const providerSelect = document.getElementById("movie-provider");
  const ratingSlider = document.getElementById("movie-min-rating");
  const ratingDisplay = document.getElementById("rating-val-display");
  const genresContainer = document.getElementById("genres-container");
  const loadMoreBtn = document.getElementById("btn-load-more");
  const resetBtn = document.getElementById("btn-reset-filters");
  const applyBtn = document.getElementById("btn-apply-filters");
  const filterToggleBtn = document.getElementById("btn-toggle-filters");
  const filterDrawerCloseBtn = document.getElementById("btn-close-filter-drawer");
  const filterDrawer = document.getElementById("advanced-filter-drawer");

  // Mode Tabs
  const tabMovies = document.getElementById("tab-movies-mode");
  const tabActors = document.getElementById("tab-actors-mode");
  const tabDirectors = document.getElementById("tab-directors-mode");
  const peopleSection = document.getElementById("people-finder-section");

  // Read URL params
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("search")) {
    searchQuery = decodeURIComponent(urlParams.get("search"));
    if (searchInput) searchInput.value = searchQuery;
  }
  if (urlParams.get("genre")) {
    activeGenre = urlParams.get("genre");
    if (genresContainer) {
      genresContainer.querySelectorAll(".genre-pill").forEach(p => {
        p.classList.toggle("active", p.dataset.genre.toLowerCase() === activeGenre.toLowerCase());
      });
    }
  }
  if (urlParams.get("actor")) {
    selectedActor = decodeURIComponent(urlParams.get("actor"));
    searchQuery = selectedActor;
    if (searchInput) searchInput.value = searchQuery;
  }
  if (urlParams.get("director")) {
    selectedDirector = decodeURIComponent(urlParams.get("director"));
    searchQuery = selectedDirector;
    if (searchInput) searchInput.value = searchQuery;
  }

  // Filter Drawer Toggle
  if (filterToggleBtn && filterDrawer) {
    filterToggleBtn.addEventListener("click", () => {
      const isVisible = filterDrawer.style.display === "flex";
      filterDrawer.style.display = isVisible ? "none" : "flex";
    });
  }
  if (filterDrawerCloseBtn && filterDrawer) {
    filterDrawerCloseBtn.addEventListener("click", () => {
      filterDrawer.style.display = "none";
    });
  }

  // Rating slider live update
  if (ratingSlider && ratingDisplay) {
    ratingSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value).toFixed(1);
      ratingDisplay.innerHTML = `<i class="fa-solid fa-star"></i> ${val}+`;
      minRating = parseFloat(e.target.value);
    });
  }

  // Event bindings
  if (searchInput) {
    searchInput.addEventListener("input", debounce((e) => {
      searchQuery = e.target.value.trim();
      loadMoviesGrid(true);
    }, 300));
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      sortBy = e.target.value;
      loadMoviesGrid(true);
    });
  }

  if (eraSelect) {
    eraSelect.addEventListener("change", (e) => {
      selectedEra = e.target.value;
      loadMoviesGrid(true);
    });
  }

  if (providerSelect) {
    providerSelect.addEventListener("change", (e) => {
      selectedProvider = e.target.value;
      loadMoviesGrid(true);
    });
  }

  if (genresContainer) {
    genresContainer.addEventListener("click", (e) => {
      const pill = e.target.closest(".genre-pill");
      if (!pill) return;
      genresContainer.querySelectorAll(".genre-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeGenre = pill.dataset.genre;
      loadMoviesGrid(true);
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      if (langSelect) selectedLanguage = langSelect.value;
      if (countrySelect) selectedCountry = countrySelect.value;
      if (eraSelect) selectedEra = eraSelect.value;
      if (providerSelect) selectedProvider = providerSelect.value;
      loadMoviesGrid(true);
      if (filterDrawer) filterDrawer.style.display = "none";
      if (window.CinePlay.showToast) window.CinePlay.showToast("Filters applied successfully!", "fa-check");
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (sortSelect) sortSelect.value = "popularity-desc";
      if (langSelect) langSelect.value = "All";
      if (countrySelect) countrySelect.value = "All";
      if (eraSelect) eraSelect.value = "All";
      if (providerSelect) providerSelect.value = "All";
      if (ratingSlider) ratingSlider.value = 0;
      if (ratingDisplay) ratingDisplay.innerHTML = `<i class="fa-solid fa-star"></i> 0.0+`;

      searchQuery = "";
      sortBy = "popularity-desc";
      activeGenre = "All";
      minRating = 0;
      selectedLanguage = "All";
      selectedCountry = "All";
      selectedEra = "All";
      selectedProvider = "All";
      selectedActor = "";
      selectedDirector = "";

      if (genresContainer) {
        genresContainer.querySelectorAll(".genre-pill").forEach(p => {
          p.classList.toggle("active", p.dataset.genre === "All");
        });
      }

      loadMoviesGrid(true);
      if (window.CinePlay.showToast) window.CinePlay.showToast("Filters reset", "fa-rotate-left");
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      currentPage++;
      loadMoviesGrid(false);
    });
    initInfiniteScroll(loadMoreBtn);
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
          console.log("🔄 Infinite scroll triggered: loading next page");
          currentPage++;
          loadMoviesGrid(false);
        }
      });
    }, {
      rootMargin: "300px 0px", // Load when 300px from bottom
      threshold: 0.1
    });

    observer.observe(sentinelEl);

    // Store observer for cleanup
    window._scrollObserver = observer;
  }

  // Mode Tabs handling
  if (tabMovies && tabActors && tabDirectors) {
    tabMovies.addEventListener("click", () => {
      setModeTab("movies");
    });
    tabActors.addEventListener("click", () => {
      setModeTab("actors");
    });
    tabDirectors.addEventListener("click", () => {
      setModeTab("directors");
    });
  }

  function setModeTab(mode) {
    [tabMovies, tabActors, tabDirectors].forEach(t => {
      if (t) t.classList.remove("active");
    });

    const moviesGrid = document.getElementById("movies-grid");
    if (mode === "movies") {
      if (tabMovies) tabMovies.classList.add("active");
      if (peopleSection) peopleSection.style.display = "none";
      if (moviesGrid) moviesGrid.style.display = "grid";
      loadMoviesGrid(true);
    } else if (mode === "actors") {
      if (tabActors) tabActors.classList.add("active");
      if (peopleSection) peopleSection.style.display = "block";
      if (moviesGrid) moviesGrid.style.display = "none";
      renderPeopleGrid(window.actorsData || [], "Actor & Actress Finder", "Select a performer to view their filmography.");
    } else if (mode === "directors") {
      if (tabDirectors) tabDirectors.classList.add("active");
      if (peopleSection) peopleSection.style.display = "block";
      if (moviesGrid) moviesGrid.style.display = "none";
      renderPeopleGrid(window.directorsData || [], "Director Finder", "Select a director to view their filmography.");
    }
  }

  window.addEventListener("favoritesChanged", syncFavoritesState);
  loadMoviesGrid(true);
}

async function loadMoviesGrid(resetPage = true) {
  const loadMoreBtn = document.getElementById("btn-load-more");
  const countText = document.getElementById("filter-match-count-text");

  if (isLoading) return;
  isLoading = true;

  if (resetPage) {
    currentPage = 1;
    showGridSkeletons();
  } else if (loadMoreBtn) {
    loadMoreBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Loading Movies...`;
    loadMoreBtn.disabled = true;
  }
  updateActiveChips();

  // ✅ Retry logic with exponential backoff
  let retryCount = 0;
  const maxRetries = 3;
  let response = null;

  while (retryCount < maxRetries) {
    try {
      response = await window.CinePlayAPI.fetchMovies({
        query: searchQuery,
        genre: activeGenre,
        sortBy: sortBy,
        page: currentPage,
        limit: itemsPerPage
      });

      // If we got a valid response, break out of retry loop
      if (response && response.results) {
        console.log(`✅ Loaded page ${currentPage}: ${response.results.length} movies`);
        break;
      }
    } catch (error) {
      console.warn(`⚠️ Attempt ${retryCount + 1} failed for page ${currentPage}:`, error);
      retryCount++;

      if (retryCount < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const waitTime = Math.pow(2, retryCount - 1) * 1000;
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // If all retries failed, show error but keep existing content
  if (!response || !response.results) {
    console.error(`❌ Failed to load page ${currentPage} after ${maxRetries} attempts`);
    if (loadMoreBtn) {
      loadMoreBtn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> Retry`;
      loadMoreBtn.disabled = false;
      loadMoreBtn.style.display = "inline-flex";
      loadMoreBtn.onclick = () => {
        currentPage--;
        loadMoviesGrid(false);
      };
    }
    isLoading = false;
    return;
  }

  let results = response.results || [];

  // Apply client-side filters
  if (minRating > 0) {
    results = results.filter(m => m.rating >= minRating);
  }
  if (selectedLanguage !== "All") {
    results = results.filter(m => (m.language || "").toLowerCase() === selectedLanguage.toLowerCase());
  }
  if (selectedCountry !== "All") {
    results = results.filter(m => (m.country || "").toLowerCase() === selectedCountry.toLowerCase());
  }
  if (selectedEra !== "All") {
    results = results.filter(m => {
      const y = parseInt(m.year);
      if (selectedEra === "2024") return y >= 2024;
      if (selectedEra === "2020-2023") return y >= 2020 && y <= 2023;
      if (selectedEra === "2010-2019") return y >= 2010 && y <= 2019;
      if (selectedEra === "2000-2009") return y >= 2000 && y <= 2009;
      if (selectedEra === "1990-1999") return y < 2000;
      return true;
    });
  }
  if (selectedProvider !== "All") {
    results = results.filter(m => {
      if (m.streaming && Array.isArray(m.streaming)) {
        return m.streaming.some(s => s.toLowerCase() === selectedProvider.toLowerCase());
      }
      return true;
    });
  }

  if (countText) {
    countText.innerHTML = `<i class="fa-solid fa-film" style="color: var(--accent-red);"></i> Found <strong>${results.length}</strong> matching movies`;
  }

  const grid = document.getElementById("movies-grid");
  const emptyState = document.getElementById("movies-empty");

  if (loadMoreBtn) {
    loadMoreBtn.innerHTML = `<i class="fa-solid fa-arrows-spin"></i> Load More Movies`;
    loadMoreBtn.disabled = false;
    // Reset onclick to default behavior
    loadMoreBtn.onclick = () => {
      currentPage++;
      loadMoviesGrid(false);
    };
  }

  if (results.length === 0) {
    if (resetPage) grid.innerHTML = "";
    emptyState.style.display = resetPage ? "block" : "none";
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
    isLoading = false;
    return;
  }

  emptyState.style.display = "none";

  // Render the movies
  window.CinePlay.renderMovies(results, grid, !resetPage);

  // ✅ Show load more button if there are more pages
  if (loadMoreBtn) {
    // TMDB usually has up to 500 pages, but we'll keep loading as long as we get results
    const hasMore = response.hasMore !== undefined ? response.hasMore : results.length === itemsPerPage;
    loadMoreBtn.style.display = hasMore ? "inline-flex" : "none";

    // ✅ If we have more but scroll is near bottom, auto-trigger load
    if (hasMore && !resetPage) {
      // Check if we're near the bottom
      const scrollPosition = window.scrollY + window.innerHeight;
      const pageHeight = document.documentElement.scrollHeight;
      if (pageHeight - scrollPosition < 500) {
        // Auto-trigger next page if we're close to bottom
        setTimeout(() => {
          if (!isLoading && loadMoreBtn.style.display !== "none") {
            currentPage++;
            loadMoviesGrid(false);
          }
        }, 500);
      }
    }
  }

  isLoading = false;
}

function updateActiveChips() {
  const container = document.getElementById("active-chips-container");
  const countBadge = document.getElementById("filter-count-badge");
  if (!container) return;

  let activeCount = 0;
  let html = "";

  if (activeGenre !== "All") {
    activeCount++;
    html += `<span class="filter-chip-tag">${activeGenre} <i class="fa-solid fa-xmark" onclick="clearFilter('genre')"></i></span>`;
  }
  if (minRating > 0) {
    activeCount++;
    html += `<span class="filter-chip-tag">⭐ ${minRating}+ <i class="fa-solid fa-xmark" onclick="clearFilter('rating')"></i></span>`;
  }
  if (selectedLanguage !== "All") {
    activeCount++;
    html += `<span class="filter-chip-tag">Lang: ${selectedLanguage} <i class="fa-solid fa-xmark" onclick="clearFilter('language')"></i></span>`;
  }
  if (selectedCountry !== "All") {
    activeCount++;
    html += `<span class="filter-chip-tag">Country: ${selectedCountry} <i class="fa-solid fa-xmark" onclick="clearFilter('country')"></i></span>`;
  }
  if (searchQuery) {
    activeCount++;
    html += `<span class="filter-chip-tag">Search: "${searchQuery}" <i class="fa-solid fa-xmark" onclick="clearFilter('search')"></i></span>`;
  }

  container.innerHTML = html;
  if (countBadge) {
    countBadge.textContent = activeCount;
    countBadge.style.display = activeCount > 0 ? "inline-block" : "none";
  }
}

window.clearFilter = function (filterType) {
  if (filterType === "genre") activeGenre = "All";
  if (filterType === "rating") { minRating = 0; const r = document.getElementById("movie-min-rating"); if (r) r.value = 0; }
  if (filterType === "language") { selectedLanguage = "All"; const l = document.getElementById("movie-language"); if (l) l.value = "All"; }
  if (filterType === "country") { selectedCountry = "All"; const c = document.getElementById("movie-country"); if (c) c.value = "All"; }
  if (filterType === "search") { searchQuery = ""; const s = document.getElementById("movie-search"); if (s) s.value = ""; }
  loadMoviesGrid(true);
};

function renderPeopleGrid(peopleList, title, subtitle) {
  const pTitle = document.getElementById("people-finder-title");
  const pSub = document.getElementById("people-finder-sub");
  const grid = document.getElementById("people-grid");

  if (pTitle) pTitle.textContent = title;
  if (pSub) pSub.textContent = subtitle;
  if (!grid) return;

  grid.innerHTML = peopleList.map(person => `
    <div class="person-card glass-panel hover-scale">
      <img src="${person.image}" alt="${person.name}" class="person-avatar" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=' + encodeURIComponent('${person.name}') + '&background=14141d&color=ffffff&rounded=true';">
      <div class="person-name">${person.name}</div>
      <div class="person-role">${person.role}</div>
      <div class="person-known">${person.knownFor}</div>
      <button class="btn btn-primary" style="padding: 6px 16px; font-size: 12px; border-radius: 20px; margin-top: 6px;" onclick="selectPerson('${person.name.replace(/'/g, "\\'")}')">
        <i class="fa-solid fa-film"></i> Filmography
      </button>
    </div>
  `).join("");
}

window.selectPerson = function (personName) {
  searchQuery = personName;
  const searchInput = document.getElementById("movie-search");
  if (searchInput) searchInput.value = searchQuery;

  // Switch back to movies tab
  const tabMovies = document.getElementById("tab-movies-mode");
  const peopleSection = document.getElementById("people-finder-section");
  const moviesGrid = document.getElementById("movies-grid");
  if (tabMovies) tabMovies.click();

  if (peopleSection) peopleSection.style.display = "none";
  if (moviesGrid) moviesGrid.style.display = "grid";
  loadMoviesGrid(true);
};

function showGridSkeletons() {
  const grid = document.getElementById("movies-grid");
  const loadMoreBtn = document.getElementById("btn-load-more");
  const emptyState = document.getElementById("movies-empty");
  if (!grid) return;

  if (emptyState) emptyState.style.display = "none";
  if (loadMoreBtn) loadMoreBtn.style.display = "none";

  let skeletonHtml = "";
  for (let i = 0; i < 4; i++) {
    skeletonHtml += `
      <div class="media-card skeleton-card">
        <div class="card-img-wrapper skeleton" style="aspect-ratio: 2/3; height: 320px;"></div>
        <div class="card-content">
          <div class="skeleton" style="height: 12px; width: 40%; margin-bottom: 10px;"></div>
          <div class="skeleton" style="height: 20px; width: 85%; margin-bottom: 12px;"></div>
          <div class="skeleton" style="height: 12px; width: 60%; margin-bottom: 20px;"></div>
          <div class="skeleton" style="height: 35px; width: 100%;"></div>
        </div>
      </div>
    `;
  }
  grid.innerHTML = skeletonHtml;
}

function syncFavoritesState() {
  const grid = document.getElementById("movies-grid");
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

function initRecentlyViewedMovies() {
  const container = document.getElementById("recently-viewed-container");
  const slider = document.getElementById("recently-viewed-slider");
  if (!container || !slider) return;

  function renderViewed() {
    const viewed = window.CinePlay.getRecentlyViewed();
    const movieViewed = viewed.filter(item => item.type === "movie");

    if (movieViewed.length === 0) {
      container.style.display = "none";
      return;
    }

    container.style.display = "block";
    const movies = movieViewed
      .map(v => window.moviesData.find(m => m.id === v.id))
      .filter(Boolean);

    window.CinePlay.renderMovies(movies, slider);
  }

  renderViewed();
  window.addEventListener("recentlyViewedChanged", renderViewed);
  window.addEventListener("favoritesChanged", renderViewed);
}

