<?php
/**
 * CinePlay - Central Database & API Configuration
 * Production-ready PDO Connection with strict error handling & CORS
 */

// Start secure session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// -------------------------------------------------------------
// Helper: Global CORS & Security Headers
// -------------------------------------------------------------
function handleCors() {
    // Allow origins (configured for local dev and XAMPP)
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header("Access-Control-Allow-Origin: {$origin}");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept");
    header("Content-Type: application/json; charset=UTF-8");

    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// -------------------------------------------------------------
// Helper: Send JSON Response & Exit
// -------------------------------------------------------------
function jsonResponse($data, int $statusCode = 200) {
    http_response_code($statusCode);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit();
}

// -------------------------------------------------------------
// Helper: Parse Incoming JSON Request Body
// -------------------------------------------------------------
function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return $_POST;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

// -------------------------------------------------------------
// Helper: Load .env file (if available in backend or root)
// -------------------------------------------------------------
function loadEnv() {
    $candidates = [
        __DIR__ . '/../.env',
        __DIR__ . '/../../.env',
        __DIR__ . '/.env'
    ];
    foreach ($candidates as $file) {
        if (file_exists($file) && is_readable($file)) {
            $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line !== '' && strpos($line, '#') !== 0 && strpos($line, '=') !== false) {
                    list($key, $val) = explode('=', $line, 2);
                    $key = trim($key);
                    $val = trim($val);
                    if (!isset($_ENV[$key])) {
                        putenv("{$key}={$val}");
                        $_ENV[$key] = $val;
                    }
                }
            }
            break;
        }
    }
}
loadEnv();

// -------------------------------------------------------------
// Database Connection (PDO)
// -------------------------------------------------------------
function getDBConnection(): PDO {
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    // Default configuration for XAMPP / MySQL
    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $port = getenv('DB_PORT') ?: '3306';
    $dbname = getenv('DB_NAME') ?: 'cineplay_db';
    $user = getenv('DB_USER') ?: 'root';
    $pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';

    $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions on errors
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Fetch associative arrays
        PDO::ATTR_EMULATE_PREPARES   => false,                  // Native prepared statements
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ];

    try {
        $pdo = new PDO($dsn, $user, $pass, $options);
        return $pdo;
    } catch (PDOException $e) {
        error_log("[CinePlay DB Error]: " . $e->getMessage());
        jsonResponse([
            'success' => false,
            'error'   => 'Database connection failed. Please ensure MySQL is running in XAMPP and database "cineplay_db" is created.',
            'debug'   => $e->getMessage()
        ], 500);
    }
}
