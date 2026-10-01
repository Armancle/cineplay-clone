# CinePlay Backend (PHP + MySQL)

This directory contains the production-ready PHP backend and MySQL database integration for CinePlay.

## Architecture & Structure

```
backend/
├── api/                   # REST API Endpoints (PHP)
│   ├── auth.php           # User Registration, Login, Logout, Session status
│   ├── favorites.php      # User Watchlist & Favorites CRUD (MySQL)
│   ├── tmdb.php           # Secure TMDB API Proxy (Replaced Node.js tmdb.js)
│   └── steam.php          # Steam Store & Reviews API Proxy
├── config/                # Central Configuration
│   └── db.php             # Strict PDO MySQL connector, CORS handler & JSON response helpers
├── database/              # Database assets
│   └── schema.sql         # Turnkey MySQL DDL schema (users, preferences, movies, favorites)
├── .env.example           # Template for MySQL credentials and TMDB API token
└── README.md              # Backend documentation
```

## API Endpoints Overview

| Endpoint | Method | Action / Parameters | Description |
|---|---|---|---|
| `api/auth.php` | `POST` | `action=register` | Creates a new account with bcrypt password hashing |
| `api/auth.php` | `POST` | `action=login` | Validates credentials and starts PHP session |
| `api/auth.php` | `POST` / `GET` | `action=logout` | Terminates active session |
| `api/auth.php` | `GET` | `action=me` | Returns current logged-in user profile |
| `api/favorites.php` | `GET` | `action=list` (opt: `type=movie\|game`) | Returns all saved favorites for user |
| `api/favorites.php` | `POST` | `action=add` | Adds/updates an item in MySQL favorites table |
| `api/favorites.php` | `POST` | `action=remove` | Deletes an item from user's favorites |
| `api/favorites.php` | `POST` | `action=clear` | Clears all user's favorites from MySQL |
| `api/tmdb.php` | `GET` | `endpoint=/movie/popular&...` | Proxies TMDB requests with secure Bearer Token |
| `api/steam.php` | `GET` | `action=search\|details\|reviews` | Proxies Steam Store and Community APIs |

## Database Configuration

The database connector in `config/db.php` uses strict PDO settings:
- `PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION` (throws exceptions on SQL errors)
- `PDO::ATTR_EMULATE_PREPARES => false` (prevents SQL injection through native prepared statements)
- `PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC`

Credentials can be customized by creating a `.env` file in the root or `backend/` directory:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=cineplay_db
DB_USER=root
DB_PASS=
TMDB_READ_ACCESS_TOKEN=your_token_here
```
