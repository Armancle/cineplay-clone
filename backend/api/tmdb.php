<?php
/**
 * CinePlay - TMDB Secure API Proxy (PHP)
 * Replaces backend/api/tmdb.js
 * Keeps TMDB Bearer Token securely on the server
 */

require_once __DIR__ . '/../config/db.php';
handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed. Only GET is supported.'], 405);
}

$token = getenv('TMDB_READ_ACCESS_TOKEN') ?: getenv('TMDB_API_KEY') ?: getenv('TMDB_TOKEN');

if (!$token) {
    jsonResponse([
        'error' => 'TMDB_READ_ACCESS_TOKEN is not configured on the server. Please add it to your .env file.',
        'results' => []
    ], 503);
}

$endpoint = $_GET['endpoint'] ?? '';

if (empty($endpoint) || !is_string($endpoint)) {
    jsonResponse(['error' => "Missing required 'endpoint' query parameter."], 400);
}

// Sanitize endpoint to prevent traversal
$sanitizedEndpoint = str_starts_with($endpoint, '/') ? $endpoint : '/' . $endpoint;
if (strpos($sanitizedEndpoint, '..') !== false) {
    jsonResponse(['error' => 'Invalid endpoint format.'], 400);
}

// Collect remaining query parameters
// PHP's $_GET converts '.' to '_' (e.g. vote_count.gte -> vote_count_gte).
// We parse the raw QUERY_STRING to preserve exact TMDB parameters like vote_count.gte and vote_average.gte.
$queryParams = [];
$rawQuery = $_SERVER['QUERY_STRING'] ?? '';
if (!empty($rawQuery)) {
    foreach (explode('&', $rawQuery) as $pair) {
        if ($pair === '') continue;
        $parts = explode('=', $pair, 2);
        $k = urldecode($parts[0]);
        $v = isset($parts[1]) ? urldecode($parts[1]) : '';
        if ($k !== 'endpoint') {
            $queryParams[$k] = $v;
        }
    }
} else {
    $queryParams = $_GET;
    unset($queryParams['endpoint']);
}

if (!isset($queryParams['language'])) {
    $queryParams['language'] = 'en-US';
}

$isJwt = str_starts_with($token, 'ey');
if (!$isJwt) {
    $queryParams['api_key'] = $token;
}

$queryString = http_build_query($queryParams);
$tmdbUrl = "https://api.themoviedb.org/3{$sanitizedEndpoint}" . ($queryString ? "?{$queryString}" : "");

$headers = [
    'Accept: application/json',
    'User-Agent: CinePlay-Backend/1.0'
];
if ($isJwt) {
    $headers[] = "Authorization: Bearer {$token}";
}

// Initialize cURL with robust settings
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $tmdbUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_HTTPHEADER     => $headers,
    // In local environments (like XAMPP on Windows), allow fallback if CA certificates are not configured
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) {
    error_log("[TMDB Proxy cURL Error]: {$curlError}");
    jsonResponse([
        'error'   => 'Failed to fetch data from TMDB API.',
        'details' => $curlError,
        'results' => []
    ], 502);
}

// Set cache header for browser performance
header("Cache-Control: public, max-age=3600");
http_response_code($httpCode ?: 200);
echo $response;
exit();
