<?php
/**
 * CinePlay - Steam Store API Proxy (PHP)
 * Fetches game search results and game details from Steam
 */

require_once __DIR__ . '/../config/db.php';
handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed. Only GET is supported.'], 405);
}

$action = $_GET['action'] ?? '';

if (empty($action)) {
    jsonResponse(['error' => "Missing 'action' parameter (supported: 'search', 'details')"], 400);
}

$steamUrl = '';

if ($action === 'search') {
    $query = $_GET['query'] ?? '';
    if (empty($query)) {
        jsonResponse(['error' => "Missing 'query' parameter"], 400);
    }
    $steamUrl = "https://store.steampowered.com/api/storesearch/?term=" . urlencode($query) . "&l=english&cc=IN";
} elseif ($action === 'details') {
    $appId = $_GET['appid'] ?? '';
    if (empty($appId)) {
        jsonResponse(['error' => "Missing 'appid' parameter"], 400);
    }
    $steamUrl = "https://store.steampowered.com/api/appdetails?appids=" . urlencode($appId) . "&l=english";
} elseif ($action === 'reviews') {
    $appId = $_GET['appid'] ?? '';
    if (empty($appId)) {
        jsonResponse(['error' => "Missing 'appid' parameter"], 400);
    }
    $steamUrl = "https://store.steampowered.com/appreviews/" . urlencode($appId) . "?json=1&language=all";
} else {
    jsonResponse(['error' => "Unsupported action '{$action}'"], 400);
}

// Fetch with cURL
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $steamUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 8,
    CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    CURLOPT_HTTPHEADER     => [
        'Accept: application/json, text/plain, */*',
        'Accept-Language: en-US,en;q=0.9'
    ],
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false || $httpCode >= 400) {
    // Graceful fallback to avoid breaking frontend UI
    if ($action === 'search') {
        jsonResponse(['total' => 0, 'items' => []], 200);
    } else {
        jsonResponse([], 200);
    }
}

header("Cache-Control: public, max-age=3600");
http_response_code($httpCode ?: 200);
echo $response;
exit();
