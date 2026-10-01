-- =============================================================
-- CinePlay Database Schema & Initial Data
-- Compatible with MySQL 5.7+ / 8.0+ and MariaDB (XAMPP Default)
-- =============================================================

CREATE DATABASE IF NOT EXISTS cineplay_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cineplay_db;

-- -------------------------------------------------------------
-- 1. Users Table (Authentication & Accounts)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 2. User Preferences (For AI / Quiz Recommendation Accuracy)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_preferences (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    favorite_genres JSON,
    preferred_mood VARCHAR(50) DEFAULT 'Action-packed',
    preferred_time_of_day VARCHAR(30) DEFAULT 'Night',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 3. Movies Cache Table (Synced from TMDB)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movies (
    movie_id VARCHAR(50) PRIMARY KEY, -- TMDB ID
    title VARCHAR(255) NOT NULL,
    poster_url TEXT,
    backdrop_url TEXT,
    rating DECIMAL(3,1),
    release_year INT,
    runtime_minutes INT,
    description TEXT,
    trailer_youtube_id VARCHAR(50),
    genres JSON,
    mood_tags JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 4. Favorites & Watchlist Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
    favorite_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    item_type ENUM('movie', 'game') NOT NULL,
    title VARCHAR(255) NOT NULL,
    poster_url TEXT,
    rating DECIMAL(3,1),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_item (user_id, item_id, item_type),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 5. Seed Initial Demo User (Optional quick testing)
-- Credentials: Username: "cinephile" | Password: "password123"
-- -------------------------------------------------------------
INSERT INTO users (user_id, username, email, password_hash)
VALUES (
    1,
    'cinephile',
    'cinephile@cineplay.local',
    '$2y$10$pg0Bg.o1WCAdLUmyoMwMYeRYEROphMhNmHXTaq16LOUT1lxo5Avxm'
)
ON DUPLICATE KEY UPDATE username = VALUES(username);

-- Seed Initial Demo Favorites for user_id = 1
INSERT INTO favorites (user_id, item_id, item_type, title, poster_url, rating)
VALUES 
    (1, '550', 'movie', 'Fight Club', 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', 8.4),
    (1, '1091500', 'game', 'Cyberpunk 2077', 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg', 8.6)
ON DUPLICATE KEY UPDATE title = VALUES(title);
