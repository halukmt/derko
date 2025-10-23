<?php
// Simple CSRF token issuer. Returns JSON with token.
// Stores token in session; single token reused per session.
@session_set_cookie_params([
  'path' => '/',
  'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
  'httponly' => true,
  'samesite' => 'Lax'
]);
@session_start();
header('Content-Type: application/json; charset=UTF-8');
// Allow only GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  http_response_code(405);
  echo json_encode(['ok'=>false,'error'=>'method']);
  exit;
}
if (empty($_SESSION['csrf_token'])) {
  // 32 random bytes base64
  $_SESSION['csrf_token'] = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
  $_SESSION['csrf_issued_at'] = time();
}
if (empty($_SESSION['csrf_issued_at'])) { $_SESSION['csrf_issued_at'] = time(); }
echo json_encode(['ok'=>true,'token'=>$_SESSION['csrf_token'],'issued'=>$_SESSION['csrf_issued_at']]);
