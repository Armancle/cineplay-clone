<?php
/**
 * CinePlay - Favorites REST API (PHP + MySQL)
 * Allows users to fetch, add, delete, and clear items from their watchlist/favorites
 */

require_once __DIR__ . '/../config/db.php';
handleCors();

$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();
$action = $_GET['action'] ?? ($input['action'] ?? '');

// Resolve current user ID (from active session or request fallback for testing)
$userId = $_SESSION['user_id'] ?? ($input['user_id'] ?? ($_GET['user_id'] ?? null));

if (!$userId) {
    jsonResponse([
        'success' => false,
        'error'   => 'Unauthorized. Please log in to manage your favorites.'
    ], 401);
}

$userId = (int)$userId;
$pdo = getDBConnection();

// Handle based on HTTP method or explicit action
if ($method === 'GET' && empty($action)) {
    $action = 'list';
}

switch ($action) {
    // ---------------------------------------------------------
    // 1. LIST FAVORITES
    // ---------------------------------------------------------
    case 'list':
        $typeFilter = $_GET['type'] ?? null; // 'movie' or 'game'

        try {
            $sql = "SELECT favorite_id, item_id, item_type, title, poster_url, rating, added_at 
                    FROM favorites 
                    WHERE user_id = ?";
            $params = [$userId];

            if ($typeFilter && in_array($typeFilter, ['movie', 'game'])) {
                $sql .= " AND item_type = ?";
                $params[] = $typeFilter;
            }

            $sql .= " ORDER BY added_at DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $favorites = $stmt->fetchAll();

            jsonResponse([
                'success' => true,
                'count'   => count($favorites),
                'data'    => $favorites
            ], 200);
        } catch (PDOException $e) {
            error_log("[Favorites List Error]: " . $e->getMessage());
            jsonResponse(['success' => false, 'error' => 'Failed to retrieve favorites.'], 500);
        }
        break;

    // ---------------------------------------------------------
    // 2. ADD FAVORITE
    // ---------------------------------------------------------
    case 'add':
        if ($method !== 'POST') {
            jsonResponse(['success' => false, 'error' => 'Use POST to add a favorite.'], 405);
        }

        $itemId   = trim((string)($input['item_id'] ?? ''));
        $itemType = trim((string)($input['item_type'] ?? 'movie'));
        $title    = trim((string)($input['title'] ?? ''));
        $posterUrl = trim((string)($input['poster_url'] ?? ''));
        $rating   = isset($input['rating']) ? (float)$input['rating'] : null;

        if (empty($itemId) || empty($title)) {
            jsonResponse(['success' => false, 'error' => 'Missing item_id or title.'], 400);
        }

        if (!in_array($itemType, ['movie', 'game'])) {
            $itemType = 'movie';
        }

        try {
            $stmt = $pdo->prepare("
                INSERT INTO favorites (user_id, item_id, item_type, title, poster_url, rating)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    title = VALUES(title), 
                    poster_url = VALUES(poster_url), 
                    rating = VALUES(rating),
                    added_at = CURRENT_TIMESTAMP
            ");
            $stmt->execute([$userId, $itemId, $itemType, $title, $posterUrl, $rating]);

            jsonResponse([
                'success' => true,
                'message' => "'{$title}' added to favorites!"
            ], 200);
        } catch (PDOException $e) {
            error_log("[Favorites Add Error]: " . $e->getMessage());
            jsonResponse(['success' => false, 'error' => 'Failed to save favorite.'], 500);
        }
        break;

    // ---------------------------------------------------------
    // 3. REMOVE FAVORITE
    // ---------------------------------------------------------
    case 'remove':
        $itemId   = trim((string)($input['item_id'] ?? ($_GET['item_id'] ?? '')));
        $itemType = trim((string)($input['item_type'] ?? ($_GET['item_type'] ?? '')));

        if (empty($itemId)) {
            jsonResponse(['success' => false, 'error' => 'Missing item_id parameter.'], 400);
        }

        try {
            if (!empty($itemType)) {
                $stmt = $pdo->prepare("DELETE FROM favorites WHERE user_id = ? AND item_id = ? AND item_type = ?");
                $stmt->execute([$userId, $itemId, $itemType]);
            } else {
                $stmt = $pdo->prepare("DELETE FROM favorites WHERE user_id = ? AND item_id = ?");
                $stmt->execute([$userId, $itemId]);
            }

            jsonResponse([
                'success' => true,
                'message' => 'Item removed from favorites.'
            ], 200);
        } catch (PDOException $e) {
            error_log("[Favorites Remove Error]: " . $e->getMessage());
            jsonResponse(['success' => false, 'error' => 'Failed to delete favorite.'], 500);
        }
        break;

    // ---------------------------------------------------------
    // 4. CLEAR ALL FAVORITES
    // ---------------------------------------------------------
    case 'clear':
        try {
            $stmt = $pdo->prepare("DELETE FROM favorites WHERE user_id = ?");
            $stmt->execute([$userId]);

            jsonResponse([
                'success' => true,
                'message' => 'All favorites cleared.'
            ], 200);
        } catch (PDOException $e) {
            error_log("[Favorites Clear Error]: " . $e->getMessage());
            jsonResponse(['success' => false, 'error' => 'Failed to clear favorites.'], 500);
        }
        break;

    default:
        jsonResponse(['success' => false, 'error' => "Unknown action. Available: 'list', 'add', 'remove', 'clear'."], 400);
}
