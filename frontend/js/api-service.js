/* CinePlay - Central External API Service & Data Normalizer */

const CinePlayAPIService = {
  // Helper for TMDB Requests (routed through secure serverless/proxy endpoint)
  async fetchTMDB(endpoint, params = {}) {
    const config = window.CINEPLAY_CONFIG ? window.CINEPLAY_CONFIG.TMDB : { PROXY_ENDPOINT: "../backend/api/tmdb.php" };
    const proxyBase = (window.CINEPLAY_CONFIG && window.CINEPLAY_CONFIG.BACKEND && window.CINEPLAY_CONFIG.BACKEND.TMDB)
      || config.PROXY_ENDPOINT 
      || "../backend/api/tmdb.php";

    // Construct URL to backend proxy relative to current page
    const url = new URL(proxyBase, window.location.href);
    url.searchParams.append("endpoint", endpoint);

    // Add remaining query params
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
    if (!url.searchParams.has("language")) url.searchParams.append("language", "en-US");

    try {
      const response = await fetch(url.toString(), {
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) {
        throw new Error(`TMDB Proxy Error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`[CinePlayAPIService] TMDB request failed for ${endpoint}:`, error);
      return null;
    }
  },

  // Search Movies on TMDB
  async searchTMDBMovies(query, page = 1) {
    if (!query) return null;
    return await this.fetchTMDB("/search/movie", { query, page });
  },

  // Get TMDB Movie Details
  async getTMDBMovieDetails(tmdbId) {
    if (!tmdbId) return null;
    return await this.fetchTMDB(`/movie/${tmdbId}`);
  },

  // Get TMDB Movie Credits (Cast & Crew)
  async getTMDBMovieCredits(tmdbId) {
    if (!tmdbId) return null;
    return await this.fetchTMDB(`/movie/${tmdbId}/credits`);
  },

  // Get TMDB Watch Providers
  async getTMDBWatchProviders(tmdbId) {
    if (!tmdbId) return null;
    return await this.fetchTMDB(`/movie/${tmdbId}/watch/providers`);
  },

  // Discover TMDB Movies by Filters
  // Discover TMDB Movies by Filters
  async discoverTMDBMovies(filters = {}) {
    const params = { ...filters, page: filters.page || 1 };
    if (filters.year) params.primary_release_year = filters.year;

    if (filters.sort_by) {
      params.sort_by = filters.sort_by;
    } else if (filters.sortBy === "popularity-desc" || !filters.sortBy) {
      params.sort_by = "popularity.desc";
    } else if (filters.sortBy === "rating-desc") {
      params.sort_by = "vote_average.desc";
      params["vote_count.gte"] = 300;
    } else if (filters.sortBy === "year-desc") {
      params.sort_by = "primary_release_date.desc";
      params["vote_count.gte"] = 20;
    } else if (filters.sortBy === "year-asc") {
      params.sort_by = "primary_release_date.asc";
      params["vote_count.gte"] = 100;
    } else {
      params.sort_by = "popularity.desc";
    }

    return await this.fetchTMDB("/discover/movie", params);
  },

  // Search People (Actors / Directors) on TMDB
  async searchTMDBPeople(query) {
    if (!query) return null;
    return await this.fetchTMDB("/search/person", { query });
  },

  // Get Person Movie Credits
  async getTMDBPersonCredits(personId) {
    if (!personId) return null;
    return await this.fetchTMDB(`/person/${personId}/movie_credits`);
  },

  // Get TMDB Movie Videos (YouTube Trailers)
  async getTMDBMovieVideos(tmdbId) {
    if (!tmdbId) return null;
    return await this.fetchTMDB(`/movie/${tmdbId}/videos`);
  },

  // Get TMDB Movie Keywords
  async getTMDBMovieKeywords(tmdbId) {
    if (!tmdbId) return null;
    return await this.fetchTMDB(`/movie/${tmdbId}/keywords`);
  },

  // Search Live Steam Store Catalog
  async searchSteamStore(query) {
    if (!query) return null;
    try {
      const response = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=IN`);
      if (!response.ok) throw new Error(`Steam Store Search Error: ${response.status}`);
      const data = await response.json();
      return data && data.items ? data.items : [];
    } catch (error) {
      console.warn(`[CinePlayAPIService] Steam search failed for ${query}:`, error);
      return [];
    }
  },
  // ========== STEAM API PROXY METHODS ==========

  // Search Steam Store via Proxy
  async searchSteamViaProxy(query) {
    if (!query) return [];
    try {
      const endpoint = (window.CINEPLAY_CONFIG && window.CINEPLAY_CONFIG.BACKEND && window.CINEPLAY_CONFIG.BACKEND.STEAM) || "../backend/api/steam.php";
      const url = new URL(endpoint, window.location.href);
      url.searchParams.append("action", "search");
      url.searchParams.append("query", query);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Steam Proxy Error: ${response.status}`);
      const data = await response.json();
      return data && data.items ? data.items : [];
    } catch (error) {
      console.warn(`[Steam Proxy] Search failed for ${query}:`, error);
      return [];
    }
  },

  // Get Steam Game Details via Proxy
  async getSteamDetailsViaProxy(appId) {
    if (!appId) return null;
    try {
      const endpoint = (window.CINEPLAY_CONFIG && window.CINEPLAY_CONFIG.BACKEND && window.CINEPLAY_CONFIG.BACKEND.STEAM) || "../backend/api/steam.php";
      const url = new URL(endpoint, window.location.href);
      url.searchParams.append("action", "details");
      url.searchParams.append("appid", appId);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Steam Proxy Error: ${response.status}`);
      const data = await response.json();
      if (data && data[appId] && data[appId].success) {
        return data[appId].data;
      }
      return null;
    } catch (error) {
      console.warn(`[Steam Proxy] Details failed for ${appId}:`, error);
      return null;
    }
  },

  // Get Steam Reviews via Proxy
  async getSteamReviewsViaProxy(appId) {
    if (!appId) return null;
    try {
      const endpoint = (window.CINEPLAY_CONFIG && window.CINEPLAY_CONFIG.BACKEND && window.CINEPLAY_CONFIG.BACKEND.STEAM) || "../backend/api/steam.php";
      const url = new URL(endpoint, window.location.href);
      url.searchParams.append("action", "reviews");
      url.searchParams.append("appid", appId);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Steam Proxy Error: ${response.status}`);
      const data = await response.json();
      if (data && data.query_summary) {
        return {
          reviewScoreDesc: data.query_summary.review_score_desc || "Very Positive",
          totalPositive: data.query_summary.total_positive || 0,
          totalReviews: data.query_summary.total_reviews || 0,
          percentPositive: data.query_summary.total_reviews > 0 ? Math.round((data.query_summary.total_positive / data.query_summary.total_reviews) * 100) : 90
        };
      }
      return null;
    } catch (error) {
      console.warn(`[Steam Proxy] Reviews failed for ${appId}:`, error);
      return null;
    }
  },

  // Get Steam Game Reviews / Community Ratings
  async getSteamReviews(appId) {
    if (!appId) return null;
    try {
      const response = await fetch(`https://store.steampowered.com/appreviews/${appId}?json=1&language=all`);
      if (!response.ok) throw new Error(`Steam Reviews Error: ${response.status}`);
      const data = await response.json();
      if (data && data.query_summary) {
        return {
          reviewScoreDesc: data.query_summary.review_score_desc || "Very Positive",
          totalPositive: data.query_summary.total_positive || 0,
          totalReviews: data.query_summary.total_reviews || 0,
          percentPositive: data.query_summary.total_reviews > 0 ? Math.round((data.query_summary.total_positive / data.query_summary.total_reviews) * 100) : 90
        };
      }
      return null;
    } catch (error) {
      console.warn(`[CinePlayAPIService] Steam reviews failed for ${appId}:`, error);
      return null;
    }
  },

  // Helper for Steam Games Fetching
  async getSteamGameDetails(appId) {
    if (!appId) return null;
    try {
      const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`);
      if (!response.ok) throw new Error(`Steam API Error: ${response.status}`);
      const data = await response.json();
      if (data && data[appId] && data[appId].success) {
        return data[appId].data;
      }
      return null;
    } catch (error) {
      console.warn(`[CinePlayAPIService] Steam request failed for ${appId}:`, error);
      return null;
    }
  },

  /* ==========================================================================
     DATA NORMALIZERS: Converts API formats to CinePlay Standard Objects
     ========================================================================== */

  normalizeMovie(tmdbData, creditsData = null, providersData = null, videosData = null, keywordsData = null, imdbData = null) {
    if (!tmdbData) return null;

    const config = window.CINEPLAY_CONFIG ? window.CINEPLAY_CONFIG.TMDB : { IMAGE_BASE: "https://image.tmdb.org/t/p", POSTER_SIZE: "w500", BACKDROP_SIZE: "w1280", PROFILE_SIZE: "h630", DEFAULT_REGION: "IN" };
    const tmdbId = String(tmdbData.id);

    const poster = tmdbData.poster_path
      ? `${config.IMAGE_BASE}/${config.POSTER_SIZE}${tmdbData.poster_path}`
      : "";

    const backdrop = tmdbData.backdrop_path
      ? `${config.IMAGE_BASE}/${config.BACKDROP_SIZE}${tmdbData.backdrop_path}`
      : poster;

    // Get trailer key
    let trailerKey = null;
    if (videosData?.results?.length) {
      const trailer = videosData.results.find(v => v.site === "YouTube" && v.type === "Trailer") ||
        videosData.results.find(v => v.site === "YouTube" && v.type === "Teaser");
      if (trailer?.key) trailerKey = trailer.key;
    }

    const genreIdNameMap = {
      28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
      99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
      27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 53: "Thriller"
    };

    let genres = [];
    if (tmdbData.genres && tmdbData.genres.length > 0) {
      genres = tmdbData.genres.map(g => g.name);
    } else if (tmdbData.genre_ids && tmdbData.genre_ids.length > 0) {
      genres = tmdbData.genre_ids.map(id => genreIdNameMap[id]).filter(Boolean);
    }
    if (genres.length === 0) genres = ["Action", "Drama"];

    const releaseDate = tmdbData.release_date || "2024-01-01";
    const year = parseInt(releaseDate.split("-")[0]) || 2024;
    const runtime = tmdbData.runtime ? `${tmdbData.runtime}m` : "120m";
    const tmdbRating = parseFloat((tmdbData.vote_average || 8.0).toFixed(1));

    let cast = ["Lead Actor"];
    let directors = ["Director"];

    if (creditsData) {
      if (creditsData.cast && creditsData.cast.length > 0) {
        cast = creditsData.cast.slice(0, 5).map(c => c.name);
      }
      if (creditsData.crew && creditsData.crew.length > 0) {
        const dirList = creditsData.crew.filter(c => c.job === "Director").map(c => c.name);
        if (dirList.length > 0) directors = dirList;
      }
    }

    let providers = {};
    if (providersData && providersData.results) {
      const region = config.DEFAULT_REGION || "IN";
      const regionData = providersData.results[region] || providersData.results["US"];
      if (regionData) {
        providers[region] = {
          flatrate: (regionData.flatrate || []).map(p => ({
            name: p.provider_name,
            logo: p.logo_path ? `${config.IMAGE_BASE}/w92${p.logo_path}` : null,
            type: "STREAM"
          })),
          rent: (regionData.rent || []).map(p => ({
            name: p.provider_name,
            logo: p.logo_path ? `${config.IMAGE_BASE}/w92${p.logo_path}` : null,
            type: "RENT"
          })),
          buy: (regionData.buy || []).map(p => ({
            name: p.provider_name,
            logo: p.logo_path ? `${config.IMAGE_BASE}/w92${p.logo_path}` : null,
            type: "BUY"
          }))
        };
      }
    }

    const moods = this.determineMoodTags(genres, tmdbData.overview, tmdbData.title || tmdbData.original_title);

    return {
      id: `tmdb_${tmdbId}`,
      tmdbId: tmdbId,
      type: "movie",
      title: tmdbData.title || tmdbData.original_title || "Untitled Movie",
      overview: tmdbData.overview || "No overview available.",
      description: tmdbData.overview || "No description available.",
      poster: poster,
      backdrop: backdrop,
      year: year,
      runtime: runtime,
      duration: runtime,
      genre: genres,
      genres: genres,
      mood: moods,
      cast: cast,
      directors: directors,
      rating: tmdbRating,
      tmdbRating: tmdbRating,
      voteCount: tmdbData.vote_count || 1000,
      trailerKey: trailerKey,
      trailer: trailerKey,
      language: (tmdbData.original_language || "en").toUpperCase(),
      country: tmdbData.production_countries && tmdbData.production_countries.length > 0 ? tmdbData.production_countries[0].name : "USA",
      providers: providers,
      updatedAt: new Date().toISOString()
    };
  },

  determineMoodTags(genres = [], overview = "", title = "") {
    const text = `${(genres || []).join(" ")} ${overview || ""} ${title || ""}`.toLowerCase();
    const moods = new Set();

    if (genres.some(g => ["Action", "Adventure"].includes(g)) || text.includes("thrill") || text.includes("battle") || text.includes("fight") || text.includes("superhero") || text.includes("mission") || text.includes("war")) {
      moods.add("Action-packed");
    }

    if (genres.some(g => ["Sci-Fi", "Mystery"].includes(g)) || text.includes("mind") || text.includes("puzzle") || text.includes("conspiracy") || text.includes("quantum") || text.includes("time") || text.includes("universe") || text.includes("future")) {
      moods.add("Thought-provoking");
      moods.add("Mind-Bending");
    }

    if (genres.some(g => ["Horror", "Thriller"].includes(g)) || text.includes("fear") || text.includes("killer") || text.includes("ghost") || text.includes("dark") || text.includes("creepy") || text.includes("monster") || text.includes("stalk")) {
      moods.add("Scary");
      moods.add("Suspenseful");
    }

    if (genres.some(g => ["Drama", "Romance", "History"].includes(g)) || text.includes("love") || text.includes("tragedy") || text.includes("heart") || text.includes("relationship") || text.includes("grief") || text.includes("struggle") || text.includes("emotional")) {
      moods.add("Emotional");
    }

    if (genres.some(g => ["Comedy", "Animation", "Family", "Music"].includes(g)) || text.includes("funny") || text.includes("humor") || text.includes("joy") || text.includes("laugh") || text.includes("friendship") || text.includes("cozy") || text.includes("magical")) {
      moods.add("Relaxing");
      moods.add("Fun & Lighthearted");
    }

    if (moods.size === 0) {
      if (genres.includes("Action") || genres.includes("Thriller")) {
        moods.add("Action-packed");
        moods.add("Suspenseful");
      } else if (genres.includes("Drama")) {
        moods.add("Emotional");
        moods.add("Thought-provoking");
      } else if (genres.includes("Comedy")) {
        moods.add("Relaxing");
        moods.add("Fun & Lighthearted");
      } else if (genres.includes("Sci-Fi")) {
        moods.add("Thought-provoking");
        moods.add("Action-packed");
      } else if (genres.includes("Horror")) {
        moods.add("Scary");
        moods.add("Suspenseful");
      } else {
        moods.add("Thought-provoking");
        moods.add("Emotional");
      }
    }

    return Array.from(moods).slice(0, 3);
  },

  normalizeGame(steamAppDetails, reviewsData = null) {
    if (!steamAppDetails) return null;

    const appId = String(steamAppDetails.steam_appid);
    const priceInfo = steamAppDetails.price_overview;
    const priceStr = steamAppDetails.is_free ? "Free" : (priceInfo ? priceInfo.final_formatted : "₹1,499");

    const releaseDate = steamAppDetails.release_date ? steamAppDetails.release_date.date : "2023";
    const yearMatch = releaseDate.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : 2023;

    const genres = steamAppDetails.genres ? steamAppDetails.genres.map(g => g.description) : ["Action", "RPG"];
    const developers = steamAppDetails.developers || ["Game Studio"];
    const publishers = steamAppDetails.publishers || ["Game Publisher"];

    const platforms = [];
    if (steamAppDetails.platforms) {
      if (steamAppDetails.platforms.windows) platforms.push("PC");
      if (steamAppDetails.platforms.mac) platforms.push("Mac");
      if (steamAppDetails.platforms.linux) platforms.push("Linux");
    }
    if (platforms.length === 0) platforms.push("PC", "PlayStation", "Xbox");

    const sysReq = steamAppDetails.pc_requirements && steamAppDetails.pc_requirements.minimum
      ? steamAppDetails.pc_requirements.minimum.replace(/<[^>]*>?/gm, '')
      : "Windows 10 64-bit, GTX 1060 / RX 580, 16 GB RAM.";

    const reviewScoreDesc = reviewsData ? reviewsData.reviewScoreDesc : "Very Positive";
    const percentPositive = reviewsData ? reviewsData.percentPositive : 90;
    const rating = parseFloat((percentPositive / 10).toFixed(1));
    const moods = this.determineMoodTags(genres, steamAppDetails.short_description || steamAppDetails.about_the_game, steamAppDetails.name);

    return {
      id: `steam_${appId}`,
      steamAppId: appId,
      steamUrl: `https://store.steampowered.com/app/${appId}/`,
      type: "game",
      title: steamAppDetails.name || "Untitled Game",
      name: steamAppDetails.name || "Untitled Game",
      description: steamAppDetails.short_description || steamAppDetails.about_the_game || "No description available.",
      overview: steamAppDetails.short_description || "No overview available.",
      poster: steamAppDetails.header_image || "images/posters/g1.jpg",
      headerImage: steamAppDetails.header_image || "images/posters/g1.jpg",
      backdrop: steamAppDetails.screenshots && steamAppDetails.screenshots.length > 0 ? steamAppDetails.screenshots[0].path_full : steamAppDetails.header_image,
      year: year,
      price: priceStr,
      discount: priceInfo && priceInfo.discount_percent ? `${priceInfo.discount_percent}% OFF` : null,
      rating: rating,
      reviewScoreDesc: reviewScoreDesc,
      percentPositive: percentPositive,
      genre: genres,
      genres: genres,
      mood: moods,
      tags: genres.concat(platforms),
      platform: platforms,
      platforms: platforms,
      developers: developers,
      publishers: publishers,
      sysReq: sysReq,
      screenshots: steamAppDetails.screenshots ? steamAppDetails.screenshots.map(s => s.path_full) : [],
      updatedAt: new Date().toISOString()
    };
  },

  normalizePerson(tmdbPerson, creditsData = null) {
    if (!tmdbPerson) return null;

    const config = window.CINEPLAY_CONFIG.TMDB;
    const personId = String(tmdbPerson.id);
    const photo = tmdbPerson.profile_path
      ? `${config.IMAGE_BASE}/${config.PROFILE_SIZE}${tmdbPerson.profile_path}`
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(tmdbPerson.name || "Person")}&background=14141d&color=ffffff&rounded=true`;

    const filmography = creditsData && creditsData.cast
      ? creditsData.cast.slice(0, 10).map(m => m.title || m.original_title)
      : (tmdbPerson.known_for ? tmdbPerson.known_for.map(k => k.title || k.name).filter(Boolean) : ["Featured Title"]);

    return {
      id: `person_${personId}`,
      tmdbId: personId,
      name: tmdbPerson.name,
      role: tmdbPerson.known_for_department || "Actor / Director",
      knownForDepartment: tmdbPerson.known_for_department,
      knownFor: filmography.slice(0, 3).join(", "),
      image: photo,
      filmography: filmography,
      updatedAt: new Date().toISOString()
    };
  }
};

window.CinePlayAPIService = CinePlayAPIService;
