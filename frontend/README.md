# CinePlay Frontend

This directory contains the user interface and client-side logic for CinePlay. The UI layout and styling remain preserved.

## Directory Structure

```
frontend/
├── index.html             # Home page (hero section, trending movies, top games, universal search)
├── movies.html            # Movies exploration page (filtering, pagination, details modal)
├── games.html             # Games exploration page (genres, Steam details, ratings)
├── recommendations.html   # Mood & vibe matching recommendation engine
├── favorites.html         # Saved movies and games page
├── login.html             # Dedicated sign-in page (credentials + Google)
├── signup.html            # Dedicated user registration page
├── about.html             # About and project details
├── favicon.svg            # Favicon
├── css/                   # Stylesheets
│   ├── style.css          # Main styling & theme design system
│   ├── responsive.css     # Mobile & tablet responsiveness
│   └── animations.css     # Micro-animations and transition effects
├── js/                    # Client-side JavaScript modules
│   ├── config.js          # Client-side configuration & proxy routes
│   ├── api-service.js     # External API communication (TMDB proxy, Steam, etc.)
│   ├── data.js            # Curated catalog data with authentic TMDB posters
│   ├── app.js             # Main UI event handlers & controllers
│   ├── movies.js          # Movies page logic
│   ├── games.js           # Games page logic
│   ├── recommendation.js  # Recommendation wizard logic
│   ├── favorites.js       # Fast watchlist controller and filter manager
│   └── auth.js            # Authentication state handling (MySQL + Firebase)
└── images/                # Static assets, posters, icons
```

## Running the Project with XAMPP (Apache + MySQL + PHP)

1. Place the project folder in your web root (`C:\xampp\htdocs\cineplay-clone`).
2. Start **Apache** and **MySQL** in XAMPP.
3. Import `backend/database/schema.sql` into phpMyAdmin (`http://localhost/phpmyadmin/`).
4. Access the frontend in your browser at:
```
http://localhost/cineplay-clone/frontend/
```
