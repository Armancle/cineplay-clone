<?php
/**
 * CinePlay - Authentication REST API (PHP + MySQL)
 * Handles registration, login, logout, and session checks
 */

require_once __DIR__ . '/../config/db.php';
handleCors();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$input = getJsonInput();

if (empty($action) && isset($input['action'])) {
    $action = $input['action'];
}

switch ($action) {
    // ---------------------------------------------------------
    // 1. REGISTER
    // ---------------------------------------------------------
    case 'register':
        $pdo = getDBConnection();
        if ($method !== 'POST') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed. Use POST.'], 405);
        }

        $username = trim($input['username'] ?? '');
        $email    = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        // Validation
        if (strlen($username) < 3) {
            jsonResponse(['success' => false, 'error' => 'Username must be at least 3 characters long.'], 400);
        }
        
        // Auto-generate local email if not provided
        if (empty($email)) {
            $safeUser = preg_replace('/[^a-zA-Z0-9_]/', '', $username);
            $email = strtolower($safeUser) . '@cineplay.local';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['success' => false, 'error' => 'Please provide a valid email address.'], 400);
        }

        if (strlen($password) < 4) {
            jsonResponse(['success' => false, 'error' => 'Password must be at least 4 characters long.'], 400);
        }

        try {
            // Check for existing user
            $stmt = $pdo->prepare("SELECT user_id, email, username FROM users WHERE email = ? OR username = ? LIMIT 1");
            $stmt->execute([$email, $username]);
            $existing = $stmt->fetch();

            if ($existing) {
                $conflictField = ($existing['email'] === $email) ? 'Email' : 'Username';
                jsonResponse(['success' => false, 'error' => "{$conflictField} is already registered."], 409);
            }

            // Secure hash
            $passwordHash = password_hash($password, PASSWORD_BCRYPT);

            // Insert new user
            $insertStmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
            $insertStmt->execute([$username, $email, $passwordHash]);
            $userId = (int)$pdo->lastInsertId();

            // Set session
            $_SESSION['user_id']  = $userId;
            $_SESSION['username'] = $username;
            $_SESSION['email']    = $email;

            jsonResponse([
                'success' => true,
                'message' => 'Account created successfully!',
                'user'    => [
                    'user_id'  => $userId,
                    'username' => $username,
                    'email'    => $email
                ]
            ], 201);
        } catch (PDOException $e) {
            error_log("[Auth Register Error]: " . $e->getMessage());
            jsonResponse(['success' => false, 'error' => 'Registration failed due to a database error.'], 500);
        }
        break;

    // ---------------------------------------------------------
    // 2. LOGIN
    // ---------------------------------------------------------
    case 'login':
        if ($method !== 'POST') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed. Use POST.'], 405);
        }

        $identifier = trim($input['identifier'] ?? $input['email'] ?? $input['username'] ?? '');
        $password   = $input['password'] ?? '';

        if (empty($identifier) || empty($password)) {
            jsonResponse(['success' => false, 'error' => 'Please provide email/username and password.'], 400);
        }

        try {
            $pdo = getDBConnection();
            $stmt = $pdo->prepare("SELECT user_id, username, email, password_hash FROM users WHERE email = ? OR username = ? LIMIT 1");
            $stmt->execute([$identifier, $identifier]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['password_hash'])) {
                jsonResponse(['success' => false, 'error' => 'Invalid email/username or password.'], 401);
            }

            // Set session
            $_SESSION['user_id']  = (int)$user['user_id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['email']    = $user['email'];

            jsonResponse([
                'success' => true,
                'message' => 'Logged in successfully!',
                'user'    => [
                    'user_id'  => (int)$user['user_id'],
                    'username' => $user['username'],
                    'email'    => $user['email']
                ]
            ], 200);
        } catch (PDOException $e) {
            error_log("[Auth Login Error]: " . $e->getMessage());
            jsonResponse(['success' => false, 'error' => 'Login failed due to a database error.'], 500);
        }
        break;

    // ---------------------------------------------------------
    // 3. LOGOUT
    // ---------------------------------------------------------
    case 'logout':
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();

        jsonResponse(['success' => true, 'message' => 'Logged out successfully.'], 200);
        break;

    // ---------------------------------------------------------
    // 4. CURRENT SESSION (ME)
    // ---------------------------------------------------------
    case 'me':
    case 'status':
        if (empty($_SESSION['user_id'])) {
            jsonResponse([
                'success'   => true,
                'logged_in' => false,
                'user'      => null
            ], 200);
        }

        try {
            $pdo = getDBConnection();
            $stmt = $pdo->prepare("SELECT user_id, username, email, created_at FROM users WHERE user_id = ? LIMIT 1");
            $stmt->execute([(int)$_SESSION['user_id']]);
            $user = $stmt->fetch();

            if (!$user) {
                $_SESSION = [];
                session_destroy();
                jsonResponse(['success' => true, 'logged_in' => false, 'user' => null], 200);
            }

            jsonResponse([
                'success'   => true,
                'logged_in' => true,
                'user'      => [
                    'user_id'    => (int)$user['user_id'],
                    'username'   => $user['username'],
                    'email'      => $user['email'],
                    'created_at' => $user['created_at']
                ]
            ], 200);
        } catch (PDOException $e) {
            error_log("[Auth Status Error]: " . $e->getMessage());
            jsonResponse(['success' => false, 'error' => 'Database error.'], 500);
        }
        break;

    // ---------------------------------------------------------
    // 5. GOOGLE FIREBASE AUTH SYNC
    // ---------------------------------------------------------
    case 'firebase_auth':
    case 'google_auth':
        if ($method !== 'POST') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed. Use POST.'], 405);
        }

        $email       = trim($input['email'] ?? '');
        $displayName = trim($input['displayName'] ?? $input['username'] ?? '');
        $photoURL    = trim($input['photoURL'] ?? '');

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['success' => false, 'error' => 'A valid Google email is required.'], 400);
        }

        try {
            $pdo = getDBConnection();
            $stmt = $pdo->prepare("SELECT user_id, username, email FROM users WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user) {
                $userId = (int)$user['user_id'];
                $username = $user['username'];
            } else {
                // Generate clean username from displayName or email
                $baseUsername = !empty($displayName) ? preg_replace('/[^a-zA-Z0-9_]/', '', $displayName) : explode('@', $email)[0];
                if (strlen($baseUsername) < 3) $baseUsername = 'User_' . substr(md5($email), 0, 6);
                
                $username = $baseUsername;
                $chkStmt = $pdo->prepare("SELECT user_id FROM users WHERE username = ? LIMIT 1");
                $chkStmt->execute([$username]);
                if ($chkStmt->fetch()) {
                    $username = $baseUsername . '_' . rand(100, 999);
                }

                $insertStmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, 'oauth_google_firebase')");
                $insertStmt->execute([$username, $email]);
                $userId = (int)$pdo->lastInsertId();
            }

            // Set PHP session
            $_SESSION['user_id']  = $userId;
            $_SESSION['username'] = $username;
            $_SESSION['email']    = $email;

            jsonResponse([
                'success' => true,
                'message' => 'Google Sign-In successful!',
                'user'    => [
                    'user_id'  => $userId,
                    'username' => $username,
                    'email'    => $email,
                    'photoURL' => $photoURL
                ]
            ], 200);
        } catch (PDOException $e) {
            error_log("[Auth Google Error]: " . $e->getMessage());
            jsonResponse(['success' => false, 'error' => 'Google authentication database error.'], 500);
        }
        break;

    default:
        jsonResponse([
            'success' => false,
            'error'   => "Unknown or missing action. Available: 'register', 'login', 'logout', 'me', 'firebase_auth'."
        ], 400);
}
