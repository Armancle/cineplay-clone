/* CinePlay - Central API & Firestore Configuration */

const CINEPLAY_CONFIG = {
  // Backend REST API Endpoints (PHP + MySQL)
  BACKEND: {
    TMDB: "../backend/api/tmdb.php",
    STEAM: "../backend/api/steam.php",
    AUTH: "../backend/api/auth.php",
    FAVORITES: "../backend/api/favorites.php"
  },

  // TMDB API Configuration (Proxied securely through backend to protect credentials)
  TMDB: {
    PROXY_ENDPOINT: "../backend/api/tmdb.php",
    BASE_URL: "https://api.themoviedb.org/3",
    IMAGE_BASE: "https://image.tmdb.org/t/p",
    POSTER_SIZE: "w500",
    BACKDROP_SIZE: "w1280",
    PROFILE_SIZE: "h630",
    DEFAULT_REGION: "IN",
    BEARER_TOKEN: null
  },

  // Steam API Configuration
  STEAM: {
    STORE_BASE_URL: "https://store.steampowered.com/api",
    COMMUNITY_BASE_URL: "https://api.steampowered.com"
  },

  // IMDb Configuration
  IMDB: {
    GRAPHQL_ENDPOINT: "https://api.graphql.imdb.com"
  },

  // Firestore Cache Configuration
  CACHE: {
    TTL_HOURS: 24,
    EXPIRATION_MS: 24 * 60 * 60 * 1000
  },

  // System Flags
  ENABLE_FIRESTORE_CACHE: true,
  ENABLE_OFFLINE_FALLBACK: true
};

window.CINEPLAY_CONFIG = CINEPLAY_CONFIG;
