/* CinePlay - Favorites & Dislikes Controller (API & Cloud First) */

document.addEventListener("DOMContentLoaded", () => {
  initFavoritesPage();
});

let activeFilter = "all"; // "all", "movie", "game", "disliked"

function initFavoritesPage() {
  const filterContainer = document.getElementById("fav-filter-container");
  const clearBtn = document.getElementById("btn-clear-favorites");
  const sortSelect = document.getElementById("fav-sort");

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      renderFavoritesGrid();
    });
  }

  if (filterContainer) {
    filterContainer.addEventListener("click", (e) => {
      const pill = e.target.closest(".genre-pill");
      if (!pill) return;

      filterContainer.querySelectorAll(".genre-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeFilter = pill.dataset.type;

      renderFavoritesGrid();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (activeFilter === "disliked") {
        if (confirm("Clear your entire disliked list?")) {
          localStorage.removeItem("cineplay_dislikes");
          if (window.CinePlayAuth && window.CinePlayAuth.isLoggedIn()) {
            window.CinePlayAuth.syncDislikesToCloud([]);
          }
          window.dispatchEvent(new Event("dislikesChanged"));
          window.CinePlay.showToast("Cleared disliked list", "fa-trash-can");
          renderFavoritesGrid();
        }
        return;
      }
      if (confirm("Are you sure you want to clear your entire watchlist?")) {
        localStorage.removeItem("cineplay_favorites");
        if (window.CinePlayAuth && window.CinePlayAuth.isLoggedIn()) {
          window.CinePlayAuth.syncFavoritesToCloud([]);
        }
        window.dispatchEvent(new Event("favoritesChanged"));
        window.CinePlay.showToast("Cleared all favorites", "fa-trash-can");
        renderFavoritesGrid();
      }
    });
  }

  window.addEventListener("favoritesChanged", renderFavoritesGrid);
  window.addEventListener("dislikesChanged", renderFavoritesGrid);
  renderFavoritesGrid();
}

/**
 * Resolve a favorited item: instant resolution from memory/MySQL/local datasets
 * with fast non-blocking timeout fallback.
 */
async function resolveItem(fav) {
  if (!fav) return null;
  const id = typeof fav === "object" ? fav.id : fav;
  const idStr = String(id);
  const type = (typeof fav === "object" ? fav.type : null) || (idStr.startsWith("g") || idStr.startsWith("steam_") ? "game" : "movie");

  // 1. Try live memory registry first (instant: 0ms)
  if (window._cineItemRegistry && window._cineItemRegistry[idStr]) {
    return window._cineItemRegistry[idStr];
  }

  // 2. Check local curated datasets in data.js (instant: 0ms)
  const dataSet = type === "movie" ? window.moviesData : window.gamesData;
  if (dataSet) {
    const cleanId = idStr.replace(/^tmdb_|^steam_/, "");
    const found = dataSet.find(i => String(i.id) === idStr || String(i.id) === cleanId || String(i.tmdbId) === cleanId || String(i.steamAppId) === cleanId);
    if (found) {
      if (window._cineItemRegistry) window._cineItemRegistry[idStr] = found;
      return found;
    }
  }

  // 3. If fav object contains basic metadata (from MySQL or LocalStorage), return immediately!
  if (typeof fav === "object" && fav.title) {
    const poster = fav.poster || fav.poster_url || fav.poster_path || "";
    const usable = {
      id: idStr,
      type: type,
      title: fav.title,
      name: fav.title,
      poster: poster,
      backdrop: fav.backdrop || poster,
      rating: Number(fav.rating || fav.vote_average || 0),
      year: fav.year || (fav.release_date ? new Date(fav.release_date).getFullYear() : ""),
      genres: fav.genres || (fav.genre ? (Array.isArray(fav.genre) ? fav.genre : [fav.genre]) : [type === "movie" ? "Movie" : "Game"]),
      description: fav.description || fav.overview || "Saved in your favorites collection."
    };
    if (window._cineItemRegistry) window._cineItemRegistry[idStr] = usable;
    return usable;
  }

  // 4. Live fetch from TMDB with strict 1s timeout for bare IDs
  if (type === "movie" && window.CinePlayAPIService) {
    const tmdbId = idStr.replace("tmdb_", "");
    if (/^\d+$/.test(tmdbId)) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1000));
        const details = await Promise.race([window.CinePlayAPIService.getTMDBMovieDetails(tmdbId), timeoutPromise]);
        if (details) {
          const normalized = window.CinePlayAPIService.normalizeMovie(details);
          if (normalized) {
            if (window._cineItemRegistry) window._cineItemRegistry[idStr] = normalized;
            return normalized;
          }
        }
      } catch (err) {
        // Continue to fallback
      }
    }
  }

  // 5. Final fallback object
  return {
    id: idStr,
    type: type,
    title: (typeof fav === "object" && fav.title) || `Item #${idStr}`,
    poster: (typeof fav === "object" && (fav.poster || fav.poster_url)) || "",
    rating: (typeof fav === "object" && fav.rating) || 0,
    genres: [type === "movie" ? "Movie" : "Game"]
  };
}

let isRenderingFavorites = false;

async function renderFavoritesGrid() {
  const grid = document.getElementById("favorites-grid");
  const emptyState = document.getElementById("favorites-empty");
  const filterPanel = document.getElementById("favorites-filters");
  const clearBtn = document.getElementById("btn-clear-favorites");
  const sortSelect = document.getElementById("fav-sort");

  if (!grid) return;
  if (isRenderingFavorites) return;
  isRenderingFavorites = true;

  try {
    // ------------- DISLIKED TAB -----------------
    if (activeFilter === "disliked") {
      const dislikedItems = window.CinePlay && window.CinePlay.getDislikedItems ? window.CinePlay.getDislikedItems() : [];

      if (clearBtn) clearBtn.style.display = dislikedItems.length > 0 ? "inline-flex" : "none";

      if (dislikedItems.length === 0) {
        grid.innerHTML = "";
        if (emptyState) {
          emptyState.style.display = "block";
          const t = emptyState.querySelector(".empty-state-title");
          const d = emptyState.querySelector(".empty-state-desc");
          if (t) t.textContent = "No Disliked Items";
          if (d) d.textContent = "Items you mark as 'Not for me' will appear here so you can review or undo them anytime.";
        }
        isRenderingFavorites = false;
        return;
      }

      if (emptyState) emptyState.style.display = "none";

      grid.innerHTML = dislikedItems.map(entry => {
        const safeTitle = (entry.title || "Untitled").replace(/'/g, "\\'");
        const posterUrl = entry.poster || "";
        return `
          <article class="media-card" style="position:relative;" data-id="${entry.id}" data-type="${entry.type || 'movie'}">
            <div class="card-img-wrapper">
              <img src="${posterUrl || 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 300 450\' fill=\'%2314141d\'%3E%3C/svg%3E'}" alt="${entry.title}" class="card-img" loading="lazy" onerror="CinePlay.movieImgFallback(this, '${safeTitle}')">
              <div class="card-rating-badge"><i class="fa-solid fa-star"></i> ${entry.rating ? Number(entry.rating).toFixed(1) : '—'}</div>
              <span class="card-type-tag" style="background: rgba(229, 9, 20, 0.85);">${entry.type || 'movie'}</span>
            </div>
            <div class="card-content">
              <div class="card-meta">
                <span>${entry.year || ''}</span>
                <span style="text-transform: uppercase; color: var(--accent-red); font-weight: 700; font-size: 11px;">Disliked</span>
              </div>
              <h3 class="card-title">${entry.title}</h3>
              <div style="display:flex;gap:8px;margin-top:12px;">
                <button class="btn btn-outline" style="font-size:12px;padding:8px 16px;border-radius:20px;flex:1;border-color:rgba(255,255,255,0.2);" onclick="event.stopPropagation();undoDislike('${entry.id}', this)">
                  <i class="fa-solid fa-rotate-left"></i> Remove from Disliked
                </button>
              </div>
            </div>
          </article>
        `;
      }).join("");
      isRenderingFavorites = false;
      return;
    }

    // ------------- FAVORITES TABS -----------------
    const rawFavs = window.CinePlay && window.CinePlay.getFavorites ? window.CinePlay.getFavorites() : [];

    if (rawFavs.length === 0) {
      grid.innerHTML = "";
      if (filterPanel) filterPanel.style.display = "flex";
      if (clearBtn) clearBtn.style.display = "none";
      if (emptyState) {
        emptyState.style.display = "block";
        const t = emptyState.querySelector(".empty-state-title");
        const d = emptyState.querySelector(".empty-state-desc");
        if (t) t.textContent = "Your library is empty";
        if (d) d.textContent = "You haven't bookmarked any movies or games yet. Click the heart icon on any card to save items to this page.";
      }
      isRenderingFavorites = false;
      return;
    }

    // Only show skeleton placeholders if items are bare IDs missing titles
    const needsFetch = rawFavs.some(fav => {
      if (typeof fav !== "object") return true;
      return !fav.title;
    });

    if (needsFetch && grid.children.length === 0) {
      grid.innerHTML = window.CinePlay && window.CinePlay.renderSkeletonCardsHTML ? window.CinePlay.renderSkeletonCardsHTML(Math.min(rawFavs.length, 8)) : "";
    }

    // Resolve all items in parallel
    const resolvedList = await Promise.all(rawFavs.map(async fav => {
      const item = await resolveItem(fav);
      if (!item) return null;
      const type = (typeof fav === "object" ? fav.type : null) || (item.platform ? "game" : "movie");
      return { item, type };
    }));

    let fullFavs = resolvedList.filter(Boolean);

    let filteredFavs = fullFavs.filter(fav => {
      if (activeFilter === "all") return true;
      return fav.type === activeFilter;
    });

    const sortVal = sortSelect ? sortSelect.value : "recent";
    if (sortVal === "rating") {
      filteredFavs.sort((a, b) => ((b.item.rating || b.item.tmdbRating) || 0) - ((a.item.rating || a.item.tmdbRating) || 0));
    } else if (sortVal === "title") {
      filteredFavs.sort((a, b) => (a.item.title || a.item.name || "").localeCompare(b.item.title || b.item.name || ""));
    }

    if (fullFavs.length === 0) {
      grid.innerHTML = "";
      if (filterPanel) filterPanel.style.display = "flex";
      if (clearBtn) clearBtn.style.display = "none";
      if (emptyState) {
        emptyState.style.display = "block";
        const t = emptyState.querySelector(".empty-state-title");
        const d = emptyState.querySelector(".empty-state-desc");
        if (t) t.textContent = "Your library is empty";
        if (d) d.textContent = "You haven't bookmarked any movies or games yet. Click the heart icon on any card to save items to this page.";
      }
      isRenderingFavorites = false;
      return;
    }

    if (filterPanel) filterPanel.style.display = "flex";
    if (clearBtn) clearBtn.style.display = "inline-flex";

    if (filteredFavs.length === 0) {
      grid.innerHTML = "";
      if (emptyState) {
        emptyState.style.display = "block";
        const t = emptyState.querySelector(".empty-state-title");
        const d = emptyState.querySelector(".empty-state-desc");
        if (t) t.textContent = `No Favorited ${activeFilter === 'movie' ? 'Movies' : 'Games'}`;
        if (d) d.textContent = `You haven't bookmarked any ${activeFilter === 'movie' ? 'movies' : 'games'} in your collection yet.`;
      }
      isRenderingFavorites = false;
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    grid.innerHTML = filteredFavs.map(fav => {
      if (fav.type === "movie") return window.CinePlay.createMovieCardHTML(fav.item);
      return window.CinePlay.createGameCardHTML(fav.item);
    }).join("");

    setupFavCardListeners();
  } catch (err) {
    console.error("[Favorites] renderFavoritesGrid error:", err);
  } finally {
    isRenderingFavorites = false;
  }
}

/** Undo a dislike from the disliked tab */
window.undoDislike = function(itemId, btn) {
  if (window.CinePlay && window.CinePlay.removeDisliked) {
    window.CinePlay.removeDisliked(itemId);
  }
  window.CinePlay.showToast("Removed from disliked list", "fa-rotate-left");

  const card = btn.closest(".media-card");
  if (card) {
    card.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    card.style.opacity = "0";
    card.style.transform = "scale(0.95)";
    setTimeout(() => renderFavoritesGrid(), 260);
  } else {
    renderFavoritesGrid();
  }
};

function setupFavCardListeners() {
  const cards = document.querySelectorAll("#favorites-grid .media-card");
  cards.forEach(card => {
    card.addEventListener("click", async (e) => {
      if (e.target.closest(".card-favorite-btn") || e.target.closest(".card-btn.btn-outline")) return;
      const id = card.dataset.id;
      const type = card.dataset.type;
      const rawFavs = window.CinePlay.getFavorites ? window.CinePlay.getFavorites() : [];
      const fav = rawFavs.find(f => String(typeof f === "object" ? f.id : f) === String(id));
      const item = await resolveItem(fav || { id, type });
      if (item && window.CinePlay && window.CinePlay.openDetailsModal) {
        window.CinePlay.openDetailsModal(item, type);
      }
    });
  });
}
