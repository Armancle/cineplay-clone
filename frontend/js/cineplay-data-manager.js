/* CinePlay - Central Data Manager (Cache-First API Pipeline) */

const CinePlayDataManager = {
  // Fetch Movies Pipeline (TMDB -> Firestore -> Local Fallback)
  async fetchMovies({ query = "", genre = "All", sortBy = "popularity-desc", page = 1, limit = 20 } = {}) {
    const api = window.CinePlayAPIService || (typeof CinePlayAPIService !== "undefined" ? CinePlayAPIService : null);

    if (api) {
      try {
        // Build TMDB discover parameters
        const params = { page: page };

        if (genre && genre !== "All") {
          const genreId = this.getTMDBGenreId(genre);
          if (genreId) params.with_genres = genreId;
        }

        if (sortBy === "popularity-desc" || !sortBy) {
          params.sort_by = "popularity.desc";
        } else if (sortBy === "rating-desc") {
          params.sort_by = "vote_average.desc";
          params["vote_count.gte"] = 300;
        } else if (sortBy === "year-desc") {
          params.sort_by = "primary_release_date.desc";
          params["vote_count.gte"] = 20;
        } else if (sortBy === "year-asc") {
          params.sort_by = "primary_release_date.asc";
          params["vote_count.gte"] = 100;
        } else {
          params.sort_by = "popularity.desc";
        }

        let apiResponse = null;

        if (query) {
          apiResponse = await api.searchTMDBMovies(query, page);
        } else {
          apiResponse = await api.discoverTMDBMovies(params);
        }

        // If API returned data, normalize and return immediately
        if (apiResponse && apiResponse.results && apiResponse.results.length > 0) {
          const movies = apiResponse.results
            .slice(0, limit)
            .map(m => api.normalizeMovie(m))
            .filter(Boolean);

          if (window.CinePlayFirestoreService && window.CinePlayFirestoreService.isEnabled) {
            movies.forEach(m => window.CinePlayFirestoreService.saveMovie(m));
          }

          console.log(`[CinePlayDataManager] ✅ API returned ${movies.length} movies for page ${page}`);
          return { 
            results: movies, 
            total: apiResponse.total_results || movies.length, 
            hasMore: page < (apiResponse.total_pages || 1)
          };
        }
      } catch (error) {
        console.warn("[CinePlayDataManager] ❌ TMDB fetch error:", error);
      }
    }

    // FALLBACK: Use local data if API fails or returns empty
    if (window.moviesData && window.moviesData.length > 0) {
      console.warn("[CinePlayDataManager] ⚠️ Using LOCAL FALLBACK data");
      let localMovies = [...window.moviesData];
      if (window.CinePlay) {
        if (query) localMovies = window.CinePlay.searchItems(localMovies, query);
        if (genre && genre !== "All") localMovies = window.CinePlay.filterByGenre(localMovies, genre);
        window.CinePlay.sortItems(localMovies, sortBy);
      }

      const total = localMovies.length;
      const start = (page - 1) * limit;
      const end = start + limit;
      return {
        results: localMovies.slice(start, end),
        total: total,
        hasMore: end < total
      };
    }

    return { results: [], total: 0, hasMore: false };
  },

  // Fetch Games Pipeline (Local First -> Steam via Proxy)
  async fetchGames({ query = "", genre = "All", platform = "All", sortBy = "rating-desc", page = 1, limit = 8 } = {}) {
    if (window.gamesData && window.gamesData.length > 0) {
      let localGames = [...window.gamesData];
      if (window.CinePlay) {
        if (query) localGames = window.CinePlay.searchItems(localGames, query);
        if (genre && genre !== "All") localGames = window.CinePlay.filterByGenre(localGames, genre);
        if (platform && platform !== "All") localGames = localGames.filter(g => g.platform && g.platform.includes(platform));
        window.CinePlay.sortItems(localGames, sortBy);
      }

      const total = localGames.length;
      const start = (page - 1) * limit;
      const end = start + limit;
      return {
        results: localGames.slice(start, end),
        total: total,
        hasMore: end < total
      };
    }

    const api = window.CinePlayAPIService || (typeof CinePlayAPIService !== "undefined" ? CinePlayAPIService : null);
    if (api) {
      try {
        if (query) {
          const steamItems = await api.searchSteamViaProxy(query);
          if (steamItems && steamItems.length > 0) {
            const normGames = await Promise.all(steamItems.slice(0, limit * page).map(async (item) => {
              const appId = String(item.id);
              if (window.CinePlayFirestoreService && window.CinePlayFirestoreService.isEnabled) {
                let cached = await window.CinePlayFirestoreService.getGame(appId);
                if (cached) return cached;
              }

              const [details, reviews] = await Promise.all([
                api.getSteamDetailsViaProxy(appId),
                api.getSteamReviewsViaProxy(appId)
              ]);

              const normalized = api.normalizeGame(details, reviews);
              if (normalized && window.CinePlayFirestoreService && window.CinePlayFirestoreService.isEnabled) {
                window.CinePlayFirestoreService.saveGame(normalized);
              }
              return normalized;
            }));

            const apiGames = normGames.filter(Boolean);
            if (apiGames.length > 0) {
              return { results: apiGames, total: apiGames.length, hasMore: false };
            }
          }
        }
      } catch (error) {
        console.warn("[Games] Steam API failed:", error);
      }
    }

    return { results: [], total: 0, hasMore: false };
  },

  // Live Recommendations Pipeline based on user's Mood, Time, Partner, Duration, etc.
  async fetchRecommendations({ contentType = "movie", mood = "Action-packed", genre = "All", era = "any", platform = "any", runtimeMax = 999, company = "Solo", timeOfDay = "Night", page = null } = {}) {
    const api = window.CinePlayAPIService || (typeof CinePlayAPIService !== "undefined" ? CinePlayAPIService : null);

    if (contentType === "movie" && api) {
      try {
        // Map mood to TMDB genre IDs
        const moodGenreMap = {
          "Action-packed": [28, 12, 53],
          "Thrilled & Hyped": [28, 12, 878],
          "Relaxing": [35, 16, 10751],
          "Chill & Cozy": [35, 10751, 14],
          "Thought-provoking": [878, 9648, 18],
          "Mind-Bending": [878, 9648],
          "Emotional": [18, 10749],
          "Deep & Emotional": [18, 10749, 36],
          "Scary": [27, 53],
          "Spooky Thrill": [27, 9648],
          "Suspenseful": [53, 9648, 28],
          "Fun & Lighthearted": [35, 10402, 16]
        };

        const targetGenres = moodGenreMap[mood] || [28, 18, 35];
        const targetPage = page || (Math.floor(Math.random() * 3) + 1);

        const params = {
          page: targetPage,
          "vote_count.gte": 250,
          "vote_average.gte": 6.5,
          "include_adult": "false",
          "primary_release_date.lte": new Date().toISOString().split("T")[0],
          "without_genres": "99,10770",
          "sort_by": "popularity.desc"
        };

        if (genre && genre !== "All") {
          const gId = this.getTMDBGenreId(genre);
          if (gId) params.with_genres = gId;
        } else {
          params.with_genres = targetGenres.join("|");
        }

        // Duration filters
        if (runtimeMax && runtimeMax <= 95) {
          params["with_runtime.lte"] = 100;
        } else if (runtimeMax && runtimeMax >= 140) {
          params["with_runtime.gte"] = 140;
        }

        // Era filters
        if (era === "classic") {
          params["primary_release_date.lte"] = "2009-12-31";
        } else if (era === "golden") {
          params["primary_release_date.gte"] = "2010-01-01";
          params["primary_release_date.lte"] = "2019-12-31";
        } else if (era === "modern") {
          params["primary_release_date.gte"] = "2020-01-01";
        }

        const apiResponse = await api.discoverTMDBMovies(params);
        if (apiResponse && apiResponse.results && apiResponse.results.length > 0) {
          const normalized = apiResponse.results
            .filter(m => m.poster_path) // Require genuine poster art from TMDB
            .map(m => api.normalizeMovie(m))
            .filter(Boolean);

          // Save to registry
          if (window._cineItemRegistry) {
            normalized.forEach(m => window._cineItemRegistry[m.id] = m);
          }

          // Score using CinePlay scoring engine
          let scored = [];
          if (window.CinePlay && window.CinePlay.getRecommendations) {
            scored = window.CinePlay.getRecommendations(
              { contentType: "movie", mood, genre, era, runtimeMax },
              { movies: normalized }
            );
          }

          // If scored items exist, slightly shuffle the top tier for variety
          if (scored && scored.length > 0) {
            return scored;
          }

          return normalized.map((item, idx) => ({
            item,
            score: Math.max(98 - (idx * 2) - Math.floor(Math.random() * 3), 75)
          }));
        }
      } catch (err) {
        console.warn("[CinePlayDataManager] Recommendation TMDB fetch error:", err);
      }
    }

    if (contentType === "game" && api) {
      try {
        const gameRes = await this.fetchGames({ genre: genre !== "All" ? genre : "All", limit: 20 });
        if (gameRes && gameRes.results && gameRes.results.length > 0) {
          let scored = [];
          if (window.CinePlay && window.CinePlay.getRecommendations) {
            scored = window.CinePlay.getRecommendations(
              { contentType: "game", mood, genre, era, platform, runtimeMax },
              { games: gameRes.results }
            );
          }
          if (scored && scored.length > 0) return scored;
          return gameRes.results.map((item, idx) => ({
            item,
            score: Math.max(97 - (idx * 3), 70)
          }));
        }
      } catch (err) {}
    }

    // Local fallback
    if (window.CinePlay && window.CinePlay.getRecommendations) {
      return window.CinePlay.getRecommendations(
        { contentType, mood, genre, era, platform, runtimeMax },
        { movies: window.moviesData, games: window.gamesData }
      );
    }

    return [];
  },

  getTMDBGenreId(genreName) {
    const map = {
      "Action": 28,
      "Adventure": 12,
      "Animation": 16,
      "Comedy": 35,
      "Crime": 80,
      "Documentary": 99,
      "Drama": 18,
      "Family": 10751,
      "Fantasy": 14,
      "History": 36,
      "Horror": 27,
      "Music": 10402,
      "Mystery": 9648,
      "Romance": 10749,
      "Sci-Fi": 878,
      "Thriller": 53
    };
    return map[genreName] || null;
  }
};

window.CinePlayDataManager = CinePlayDataManager;