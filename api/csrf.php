<?php
// CSRF token issuer. Returns JSON with token_id and token.
// Uses file-based token store (no PHP sessions / no cookies required).

require_once __DIR__ . '/token_store.php';

header('Content-Type: application/json; charset=UTF-8');

// Allow only GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

$tid = isset($_GET['tid']) ? $_GET['tid'] : '';

if ($tid !== '') {
    // Refresh existing token (update issued_at)
    $data = token_read($tid);
    if (!$data) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'invalid_token']);
        exit;
    }
    token_update($tid, ['issued_at' => time()]);
    echo json_encode([
        'ok'       => true,
        'token_id' => $tid,
        'token'    => $data['csrf_token'],
        'issued'   => time(),
    ]);
} else {
    // Create new token
    $result = token_create();
    if (!$result) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'create_failed']);
        exit;
    }
    // Housekeeping: remove tokens older than 1 hour
    token_cleanup(3600);
    echo json_encode([
        'ok'       => true,
        'token_id' => $result['token_id'],
        'token'    => $result['csrf_token'],
        'issued'   => $result['issued_at'],
    ]);
}
