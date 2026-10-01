# 🎬 CinePlay — Movie & Game Recommendation & Matchmaking Platform

<p align="center">
  <img src="https://img.shields.io/badge/BCA%20Mini%20Project-Grade%20A%2B-e50914?style=for-the-badge&logo=codeforces&logoColor=white" alt="BCA Mini Project">
  <img src="https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20ES6%2B-ffd54f?style=for-the-badge&logo=javascript&logoColor=black" alt="Frontend Stack">
  <img src="https://img.shields.io/badge/Backend-PHP%208.x%20REST%20API-777bb4?style=for-the-badge&logo=php&logoColor=white" alt="Backend PHP">
  <img src="https://img.shields.io/badge/Database-MySQL%20%2F%20MariaDB-00758f?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL Database">
  <img src="https://img.shields.io/badge/APIs-TMDB%20%7C%20Steam%20Store-01b4e4?style=for-the-badge&logo=themoviedatabase&logoColor=white" alt="APIs">
</p>

<p align="center">
  <b>A full-stack entertainment matchmaker and discovery portal powered by PHP, MySQL, and modern Vanilla Web technologies.</b><br>
  Interactive Mood Matcher · Dynamic TMDB Discover Pipeline · Dual Authentication (MySQL + Google Firebase) · Fast Watchlist Sync
</p>

---

## ✨ Project Overview

> **Stop Endless Scrolling on Streaming Platforms.** CinePlay uses an interactive mood and preference matching engine to instantly connect users with movies and games tailored to their exact mood, era, viewing company, and time constraints.

Built as a **BCA (Bachelor of Computer Applications) Mini Project**, CinePlay combines a decoupled modern frontend with a modular PHP REST API backend connected to a relational MySQL database.

| Aspect | Technology & Implementation |
|---|---|
| **Frontend** | Semantic HTML5, Vanilla CSS3 (Dark Glassmorphism), Modern ES6+ JavaScript |
| **Backend** | PHP (8.x) REST API with PDO MySQL connection, session management, and strict input validation |
| **Database** | MySQL / MariaDB (`cineplay_db`) hosted via XAMPP / phpMyAdmin |
| **Authentication** | Dual Engine: Manual Username/Password with Bcrypt + Google Firebase OAuth 2.0 synced to MySQL |
| **External APIs** | Secure server-side TMDB proxy for real-time discoveries, authentic posters, trailers, and metadata |
| **Design Theme** | Dark glassmorphism (`#0d0d12`) with Cinema Red (`#e50914`) and Amber (`#ffd54f`) accents |
| **Pages** | Home (`index.html`), Movies, Games, Find Match, Favorites, About, Sign In, Sign Up |

---

## 🌟 Key Features

1. 🍿 **Interactive Mood Matcher ("Find Match")**: Multi-step wizard matching users to movies or games based on mood tags, genres, era, and runtime, calculating custom match percentages.
2. 🎬 **Dynamic TMDB Catalog & Authentic Posters**: Powered by a secure server-side TMDB proxy (`backend/api/tmdb.php`) that preserves dot-notation query parameters (`vote_count.gte`, `vote_average.gte`, `sort_by`), serving authentic posters without mock film substitutions.
3. 🔐 **Dual Authentication System**:
   - **Manual Credentials**: Register and sign in with Username and Password directly stored in MySQL with Bcrypt hashing.
   - **Google Firebase**: Sign in with Google with automatic profile synchronization and PHP session creation.
4. ❤️ **Instant Watchlist & Favorites**: High-speed, cache-first favorites resolution with relational storage in MySQL (`favorites` table) and local fallback.
5. 🔍 **Real-Time Universal Search**: Debounced live search dropdown showing instant movie thumbnails, genres, and ratings.
6. 📺 **HD Video Trailer Modal**: Integrated YouTube trailer playback with clean overlays and modal views.

---

## 🏗️ Project Architecture

```
cineplay-clone/
├── backend/
│   ├── api/
│   │   ├── auth.php         # User registration, login, logout, and session checks
│   │   ├── favorites.php    # Watchlist CRUD endpoints (list, add, remove, clear)
│   │   ├── tmdb.php         # Secure TMDB API proxy with Bearer token protection
│   │   └── steam.php        # Steam Store search and metadata fallback proxy
│   ├── config/
│   │   └── db.php           # PDO MySQL database connector & CORS configuration
│   └── database/
│       └── schema.sql       # MySQL schema (users, favorites, preferences, movies)
│
├── frontend/
│   ├── css/
│   │   ├── style.css        # Main glassmorphism styles & design system tokens
│   │   ├── responsive.css   # Mobile, tablet, and widescreen breakpoints
│   │   └── animations.css   # Shimmer loaders, modal transitions, and pulse effects
│   ├── js/
│   │   ├── api-service.js   # TMDB & Steam API adapter and normalization layer
│   │   ├── app.js           # Core application controller, modals, and search
│   │   ├── auth.js          # Authentication state manager and cloud synchronization
│   │   ├── cineplay-data-manager.js # Central cache-first data manager
│   │   ├── config.js        # Global frontend endpoint & API configuration
│   │   ├── data.js          # Curated offline movie and game datasets with TMDB posters
│   │   ├── favorites.js     # Watchlist controller and filter manager
│   │   ├── firebase-config.js # Firebase app initialization for Google OAuth
│   │   ├── firestore-service.js # Optional client cache service with strict timeouts
│   │   ├── movies.js        # Dedicated movies page filter and grid controller
│   │   └── recommendation.js# 4-step recommendation wizard logic
│   ├── index.html           # Home page with hero slider and featured rows
│   ├── movies.html          # Advanced movie browser with multi-attribute filtering
│   ├── games.html           # Games catalog
│   ├── recommendations.html # Interactive mood-based matchmaker wizard
│   ├── favorites.html       # User bookmarks and watchlist library
│   ├── login.html           # Dedicated manual and Google Sign-In page
│   ├── signup.html          # Dedicated registration page
│   ├── about.html           # Project details, technology stack, and team
│   └── favicon.svg          # Application icon
│
├── .env                     # Local environment secrets (TMDB access token, DB config)
├── .gitignore               # Ignored local files, credentials, and build caches
└── README.md                # Project documentation
```

---

## 🗄️ Database Schema (`cineplay_db`)

The relational database is defined in `backend/database/schema.sql` and includes:

- **`users`**: Stores user accounts (`user_id`, `username`, `email`, `password_hash`, `created_at`).
- **`favorites`**: Tracks saved movies and games per user (`favorite_id`, `user_id`, `item_id`, `item_type`, `title`, `poster_url`, `rating`).
- **`user_preferences`**: Stores user taste profiles for recommendation scoring (`favorite_genres`, `preferred_mood`, `preferred_time_of_day`).
- **`movies`**: Local cache table for recently fetched TMDB movie metadata.

---

## 🚀 Setup & Installation Guide

### Prerequisites
- [XAMPP](https://www.apachefriends.org/) (Apache + MySQL / MariaDB + PHP 8.x)
- Git

### Step 1: Place Project in XAMPP
Clone or link the repository inside your XAMPP web root:
```bash
# Path: C:\xampp\htdocs\cineplay-clone
```

### Step 2: Configure Database
1. Open the **XAMPP Control Panel** and start **Apache** and **MySQL**.
2. Open your browser and navigate to **phpMyAdmin**: [http://localhost/phpmyadmin/](http://localhost/phpmyadmin/)
3. Click **Import** $\rightarrow$ choose `backend/database/schema.sql` $\rightarrow$ click **Go**.
4. The database `cineplay_db` and its tables will be initialized.

### Step 3: Configure Environment Variables
Create or verify your `.env` file in the root directory:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=cineplay_db
DB_USER=root
DB_PASS=

# TMDB Bearer Token (Read Access Token from themoviedb.org)
TMDB_READ_ACCESS_TOKEN=your_tmdb_read_access_token_here
```

### Step 4: Run the Application
Open your browser and navigate to:
```
http://localhost/cineplay-clone/frontend/
```

---

## 👥 Project Contributors

- **Ibrahim Haji** — Developer (Core logic, PHP REST APIs, recommendation algorithm, state management)
- **Arman Khan** — Designer & Product Manager (UI/UX design system, glassmorphism styling, responsive layouts)

---

## 📄 License
Created for BCA Mini Project. All rights reserved &copy; 2026 CinePlay.
