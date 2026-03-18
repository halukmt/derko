<?php
// Simple CSRF token issuer. Returns JSON with token.
// Stores token in session; single token reused per session.

// --- SESSION CONFIGURATION (Harmonized) ---
// Allow override via DERKO_COOKIE_DOMAIN env var so sessions work on localhost
// (Docker sets this to empty string; production falls back to .derko-immobilien.de)
$cookieDomain = getenv('DERKO_COOKIE_DOMAIN') !== false ? getenv('DERKO_COOKIE_DOMAIN') : '.derko-immobilien.de';
$isHttps = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
// Use a project-local session save path to work around shared-hosting restrictions
// (e.g. Strato: default /tmp may be inaccessible from subdomain document roots)
$sessionPath = realpath(__DIR__ . '/../tmp/sessions') ?: (sys_get_temp_dir() . '/derko_sessions');
if (!is_dir($sessionPath)) { @mkdir($sessionPath, 0700, true); }
@ini_set('session.save_path', $sessionPath);
@ini_set('session.cookie_domain', $cookieDomain);
@ini_set('session.cookie_samesite', 'Lax');
@ini_set('session.cookie_secure', $isHttps ? '1' : '0');
@ini_set('session.cookie_httponly', '1');
@session_set_cookie_params([
  'path' => '/',
  'secure' => $isHttps,
  'httponly' => true,
  'samesite' => 'Lax',
  'domain' => $cookieDomain
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
}
// Touch the issued timestamp on every call to keep session fresh when user is active
$_SESSION['csrf_issued_at'] = time();
echo json_encode(['ok'=>true,'token'=>$_SESSION['csrf_token'],'issued'=>$_SESSION['csrf_issued_at']]);
