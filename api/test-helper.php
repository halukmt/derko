<?php
// test-helper.php - Debug-only endpoint for automated tests
// SECURITY: Only works when DERKO_DEBUG is enabled AND request from localhost.
// NEVER enable in production.

$configPath = __DIR__ . '/config.php';
@require_once $configPath;

// Hard-guard: refuse if not in debug mode
if (!defined('DERKO_DEBUG') || !DERKO_DEBUG) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'not_available']);
    exit;
}

// Hard-guard: only allow localhost requests
$remoteIp = $_SERVER['REMOTE_ADDR'] ?? '';
$isLocalhost = in_array($remoteIp, ['127.0.0.1', '::1', '172.17.0.1'], true)
    || strpos($remoteIp, '172.') === 0
    || strpos($remoteIp, '192.168.') === 0;

if (!$isLocalhost) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'localhost_only']);
    exit;
}

// Session setup (same as other API files)
$cookieDomain = getenv('DERKO_COOKIE_DOMAIN') !== false ? getenv('DERKO_COOKIE_DOMAIN') : '.derko-immobilien.de';
$isHttps = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
@ini_set('session.cookie_domain', $cookieDomain);
@ini_set('session.cookie_samesite', 'Lax');
@ini_set('session.cookie_secure', $isHttps ? '1' : '0');
@ini_set('session.cookie_httponly', '1');
@session_set_cookie_params([
    'path'     => '/',
    'secure'   => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax',
    'domain'   => $cookieDomain
]);
@session_start();

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'captcha':
        // Return current CAPTCHA code from session
        echo json_encode([
            'ok'   => true,
            'code' => $_SESSION['captcha_code'] ?? null,
            'sid'  => session_id(),
        ]);
        break;

    case 'csrf':
        // Return current CSRF token from session
        echo json_encode([
            'ok'        => true,
            'token'     => $_SESSION['csrf_token'] ?? null,
            'issued_at' => $_SESSION['csrf_issued_at'] ?? null,
            'sid'       => session_id(),
        ]);
        break;

    case 'session':
        // Return session debug info (no sensitive values)
        echo json_encode([
            'ok'            => true,
            'sid'           => session_id(),
            'has_captcha'   => isset($_SESSION['captcha_code']),
            'has_csrf'      => isset($_SESSION['csrf_token']),
            'cookie_domain' => ini_get('session.cookie_domain'),
            'save_path'     => ini_get('session.save_path'),
            'samesite'      => ini_get('session.cookie_samesite'),
        ]);
        break;

    case 'reset-rate-limit':
        // Clear rate limit for current IP (for testing repeated form submissions)
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $rateStore = __DIR__ . DIRECTORY_SEPARATOR . 'rate_store';
        $rateFile  = $rateStore . DIRECTORY_SEPARATOR . 'ip_' . preg_replace('/[^a-zA-Z0-9_.-]/', '_', $ip);
        $deleted   = false;
        if (is_file($rateFile)) {
            $deleted = @unlink($rateFile);
        }
        echo json_encode(['ok' => true, 'deleted' => $deleted, 'file' => basename($rateFile)]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'unknown_action', 'available' => ['captcha', 'csrf', 'session', 'reset-rate-limit']]);
}
