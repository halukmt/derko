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

// Token store (replaces session-based lookups)
require_once __DIR__ . '/token_store.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

$action = $_GET['action'] ?? '';
$tid    = $_GET['tid'] ?? '';

switch ($action) {
    case 'captcha':
        // Return current CAPTCHA code from token store
        $data = ($tid !== '') ? token_read($tid) : null;
        echo json_encode([
            'ok'   => true,
            'code' => $data['captcha_code'] ?? null,
            'tid'  => $tid,
        ]);
        break;

    case 'csrf':
        // Return current CSRF token from token store
        $data = ($tid !== '') ? token_read($tid) : null;
        echo json_encode([
            'ok'        => true,
            'token'     => $data['csrf_token'] ?? null,
            'issued_at' => $data['issued_at'] ?? null,
            'tid'       => $tid,
        ]);
        break;

    case 'session':
        // Return token store debug info
        $data = ($tid !== '') ? token_read($tid) : null;
        echo json_encode([
            'ok'          => true,
            'tid'         => $tid,
            'has_captcha' => isset($data['captcha_code']),
            'has_csrf'    => isset($data['csrf_token']),
            'token_dir'   => realpath(__DIR__ . '/../tmp/tokens') ?: 'not_found',
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
