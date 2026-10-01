/* CinePlay - Recommendations Engine Controller */

document.addEventListener("DOMContentLoaded", () => {
  initQuizPage();
});

// Quiz User State
let quizState = {
  contentType: null,
  mood: null,
  genre: null,
  era: null,
  platform: "any"
};

let currentStep = 1;
let totalSteps = 4; // Skip platform select for movies by default

function initQuizPage() {
  const panel = document.getElementById("quiz-panel");
  const steps = panel.querySelectorAll(".rec-step");
  const nextBtns = panel.querySelectorAll(".btn-next");
  const prevBtns = panel.querySelectorAll(".btn-prev");
  const progressLine = document.getElementById("quiz-progress-indicator");
  const stepsText = document.getElementById("quiz-steps-text");
  const submitBtn = document.getElementById("btn-submit-recommend");
  const restartBtn = document.getElementById("btn-restart-quiz");

  // Step 1: Content card selections
  const step1Cards = steps[0].querySelectorAll(".rec-card");
  step1Cards.forEach(card => {
    card.addEventListener("click", () => {
      step1Cards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      quizState.contentType = card.dataset.value;
      
      steps[0].querySelector(".btn-next").removeAttribute("disabled");

      if (quizState.contentType === "game") {
        totalSteps = 5;
        steps[3].querySelector(".btn-next").innerHTML = 'Continue <i class="fa-solid fa-chevron-right"></i>';
      } else {
        totalSteps = 4;
        steps[3].querySelector(".btn-next").innerHTML = 'Match Me! <i class="fa-solid fa-wand-magic-sparkles"></i>';
      }
      
      populateQuizGenreOptions();
    });
  });

  // Step 2: Mood card selections
  const step2Cards = steps[1].querySelectorAll(".rec-card");
  step2Cards.forEach(card => {
    card.addEventListener("click", () => {
      step2Cards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      quizState.mood = card.dataset.value;
      steps[1].querySelector(".btn-next").removeAttribute("disabled");
    });
  });

  // Step 4: Era card selections
  const step4Cards = steps[3].querySelectorAll(".rec-card");
  step4Cards.forEach(card => {
    card.addEventListener("click", () => {
      step4Cards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      quizState.era = card.dataset.value;
      steps[3].querySelector(".btn-next").removeAttribute("disabled");
    });
  });

  // Step 5: Platform card selections (Games only)
  const step5Cards = steps[4].querySelectorAll(".rec-card");
  step5Cards.forEach(card => {
    card.addEventListener("click", () => {
      step5Cards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      quizState.platform = card.dataset.value;
    });
  });

  // Navigation Click listeners
  nextBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (currentStep === 4 && quizState.contentType === "movie") {
        submitQuizPreferences();
        return;
      }
      changeStep(1);
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      changeStep(-1);
    });
  });

  submitBtn.addEventListener("click", () => {
    submitQuizPreferences();
  });

  restartBtn.addEventListener("click", () => {
    resetQuizState();
  });

  function changeStep(direction) {
    steps[currentStep - 1].classList.remove("active");
    currentStep += direction;
    steps[currentStep - 1].classList.add("active");
    updateProgressBar();
  }

  function updateProgressBar() {
    const percentage = (currentStep / totalSteps) * 100;
    progressLine.style.width = `${percentage}%`;
    stepsText.textContent = `Step ${currentStep} of ${totalSteps}`;
  }

  function resetQuizState() {
    currentStep = 1;
    quizState = {
      contentType: null,
      mood: null,
      genre: null,
      era: null,
      platform: "any"
    };

    panel.querySelectorAll(".rec-card").forEach(c => c.classList.remove("active"));
    nextBtns.forEach(btn => btn.setAttribute("disabled", "true"));

    document.getElementById("rec-results-section").style.display = "none";
    document.getElementById("quiz-loader").style.display = "none";
    
    steps.forEach((step, idx) => {
      step.classList.toggle("active", idx === 0);
    });
    panel.style.display = "block";

    totalSteps = 4;
    updateProgressBar();
  }
  
  window.restartMatchmaker = resetQuizState;
}

/* Populate step 3 genres dynamically */
function populateQuizGenreOptions() {
  const container = document.getElementById("genre-options-container");
  const nextBtn = container.closest(".rec-step").querySelector(".btn-next");
  
  const movieGenres = [
    { name: "Sci-Fi", icon: "fa-rocket" },
    { name: "Action", icon: "fa-burst" },
    { name: "Romance", icon: "fa-heart" },
    { name: "Adventure", icon: "fa-compass" },
    { name: "Drama", icon: "fa-masks-theater" },
    { name: "Comedy", icon: "fa-face-laugh-squint" },
    { name: "Thriller", icon: "fa-skull" },
    { name: "Mystery", icon: "fa-magnifying-glass" },
    { name: "Crime", icon: "fa-handcuffs" },
    { name: "Fantasy", icon: "fa-dragon" },
    { name: "Animation", icon: "fa-palette" },
    { name: "Horror", icon: "fa-ghost" },
    { name: "Music", icon: "fa-music" }
  ];

  const gameGenres = [
    { name: "RPG", icon: "fa-dragon" },
    { name: "Action", icon: "fa-shield-halved" },
    { name: "Adventure", icon: "fa-map-location-dot" },
    { name: "Indie", icon: "fa-seedling" },
    { name: "Horror", icon: "fa-ghost" },
    { name: "Sci-Fi", icon: "fa-user-astronaut" },
    { name: "Metroidvania", icon: "fa-compass" },
    { name: "Roguelike", icon: "fa-dungeon" },
    { name: "Superhero", icon: "fa-mask" },
    { name: "Puzzle", icon: "fa-puzzle-piece" },
    { name: "Sandbox", icon: "fa-cube" }
  ];

  const list = quizState.contentType === "movie" ? movieGenres : gameGenres;
  
  container.innerHTML = list.map(g => `
    <div class="rec-card hover-scale" data-value="${g.name}">
      <i class="fa-solid ${g.icon}"></i>
      <div class="rec-card-title">${g.name}</div>
    </div>
  `).join("");

  // Bind clicks
  const cards = container.querySelectorAll(".rec-card");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      cards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      quizState.genre = card.dataset.value;
      nextBtn.removeAttribute("disabled");
    });
  });
}

/* Call Decoupled Recommendation Layer and handle loading transitions */
async function submitQuizPreferences() {
  const quizPanel = document.getElementById("quiz-panel");
  const loader = document.getElementById("quiz-loader");
  const resultsSection = document.getElementById("rec-results-section");
  const resultsGrid = document.getElementById("rec-results-grid");

  quizPanel.querySelectorAll(".rec-step").forEach(s => s.classList.remove("active"));
  loader.style.display = "block";

  try {
    // Decoupled logic call
    const matches = await window.CinePlayAPI.fetchRecommendations(quizState);

    loader.style.display = "none";
    quizPanel.style.display = "none";

    if (matches.length === 0) {
      resultsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-face-frown empty-state-icon"></i>
          <h3 class="empty-state-title">No Strong Matches</h3>
          <p class="empty-state-desc">We couldn't find matches that fit all criteria. Try running the matchmaker again with different preferences.</p>
          <button class="btn btn-primary" onclick="restartMatchmaker()">Restart Matchmaker</button>
        </div>
      `;
    } else {
      // Decoupled UI Rendering
      renderMatchResults(matches, resultsGrid);
    }

    resultsSection.style.display = "block";
    resultsSection.classList.add("active");
  } catch (error) {
    console.error("Matchmaker fetch error:", error);
    window.CinePlay.showToast("Failed to fetch matches.", "fa-circle-exclamation");
    loader.style.display = "none";
    resetQuizState();
  }
}

/* Renders matches dynamically with decoupled card template markup */
function renderMatchResults(matches, container) {
  if (!container) return;

  // Save all matches to registry for live modal & favorites lookup
  matches.forEach(m => {
    if (m.item && m.item.id && window._cineItemRegistry) {
      window._cineItemRegistry[m.item.id] = m.item;
    }
  });

  container.innerHTML = matches.map(match => {
    const item = match.item;
    const type = quizState.contentType || (item.platform ? "game" : "movie");
    const isFav = window.CinePlay.isFavorite(item.id);
    const imgUrl = item.poster || item.cover || item.headerImage || "";
    const safeTitle = (item.title || item.name || "Untitled").replace(/'/g, "\\'");
    const trailerKey = item.trailerKey || item.trailer || "";
    const year = item.year || "";
    const runtime = item.runtime ? (typeof item.runtime === "number" ? `${item.runtime} mins` : item.runtime) : (item.duration || "");
    const rating = item.rating || item.tmdbRating || 8.0;
    const desc = item.overview || item.description || "No overview available.";

    const imgMarkup = imgUrl 
      ? `<img src="${imgUrl}" alt="${safeTitle}" class="card-img" loading="lazy" onerror="CinePlay.${type}ImgFallback(this, '${safeTitle}')">`
      : `<div class="card-img card-img-blank" style="width:100%;height:100%;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-${type === 'movie' ? 'film' : 'gamepad'}" style="font-size:36px;opacity:0.2;"></i></div>`;

    return `
      <article class="media-card" data-id="${item.id}" data-type="${type}" style="cursor: pointer;">
        <div class="card-img-wrapper shimmer-wrapper">
          ${imgMarkup}
          <div class="card-rating-badge"><i class="fa-solid fa-star"></i> ${typeof rating === 'number' ? rating.toFixed(1) : rating}</div>
          <button class="card-favorite-btn ${isFav ? 'active' : ''}" aria-label="Favorite button" onclick="event.stopPropagation(); handleMatchFavorite(this, '${item.id}', '${type}')">
            <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
          <span class="card-type-tag">${type}</span>
        </div>
        <div class="card-content">
          <div class="card-meta">
            <span>${year}</span>
            <span>${type === 'movie' ? runtime : (item.platform ? item.platform.slice(0, 2).join(", ") : 'PC')}</span>
          </div>
          <h3 class="card-title">${item.title || item.name}</h3>
          
          <span class="match-label"><i class="fa-solid fa-bolt"></i> ${match.score}% Match</span>
          <div class="match-meter-wrapper">
            <div class="match-meter-bar animate-width" style="--match-width: ${match.score}%;"></div>
          </div>

          <p class="card-desc" style="margin-top: 12px;">${desc}</p>
          
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="card-btn" style="flex: 1;" onclick="event.stopPropagation(); window.CinePlay.openDetailsModal('${item.id}', '${type}')">
              <i class="fa-solid fa-circle-info"></i> Learn More
            </button>
            ${trailerKey ? `<button class="card-btn btn-outline" style="padding: 0 14px; border-radius: 8px;" title="Watch Trailer" onclick="event.stopPropagation(); CinePlay.openTrailerModal('${trailerKey}', '${safeTitle}')"><i class="fa-solid fa-play"></i></button>` : `<button class="card-btn btn-outline" style="padding: 0 14px; border-radius: 8px;" title="Watch Trailer" onclick="event.stopPropagation(); CinePlay.openMovieTrailer('${item.id}', '${safeTitle}')"><i class="fa-solid fa-play"></i></button>`}
          </div>
        </div>
      </article>
    `;
  }).join("");

  // Bind click on entire card
  const cards = container && container.querySelectorAll ? container.querySelectorAll(".media-card") : [];
  cards.forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".card-favorite-btn") || e.target.closest(".card-btn")) return;
      const id = card.dataset.id;
      const type = card.dataset.type;
      if (window.CinePlay && window.CinePlay.openDetailsModal) {
        window.CinePlay.openDetailsModal(id, type);
      }
    });
  });
}

window.handleMatchFavorite = function(btn, id, type) {
  const isFavNow = window.CinePlay.toggleFavorite(id, type);
  btn.classList.toggle("active", isFavNow);
  const icon = btn.querySelector("i");
  if (icon) {
    icon.className = isFavNow ? "fa-solid fa-heart" : "fa-regular fa-heart";
  }
}
