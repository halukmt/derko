<?php
// Simple self-hosted SVG CAPTCHA (no external deps)
// Debug/diagnostics patch: logs all errors, session, and request info if DERKO_DEBUG is true

// 1. CONFIG LADEN (WICHTIG: Damit DERKO_DEBUG bekannt ist) Google
// require_once __DIR__ . '/config.php'

// --- DEBUG/LOGGING SETUP ---
$debug = defined('DERKO_DEBUG') && DERKO_DEBUG;

// --- SESSION CONFIGURATION (Harmonized) ---
$cookieDomain = '.derko-immobilien.de';
$isHttps = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
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

// Robust multi-path logging: try api/captcha_debug.log, then /tmp/derko_captcha_debug.log, then PHP error_log
function log_captcha($msg) {
  $ts = date('c');
  $ip = $_SERVER['REMOTE_ADDR'] ?? '-';
  $ua = $_SERVER['HTTP_USER_AGENT'] ?? '-';
  $sid = session_id();
  $line = "$ts\t$ip\tSID:$sid\t$msg\tUA:$ua\n";
  $paths = [
    __DIR__ . DIRECTORY_SEPARATOR . 'captcha_debug.log',
    (function_exists('sys_get_temp_dir') ? sys_get_temp_dir() : '/tmp') . DIRECTORY_SEPARATOR . 'derko_captcha_debug.log'
  ];
  $ok = false;
  foreach ($paths as $p) {
    $res = @file_put_contents($p, $line, FILE_APPEND | LOCK_EX);
    if ($res !== false) { $ok = true; break; }
  }
  if (!$ok) { @error_log($line); }
}

if ($debug) {
  set_error_handler(function($errno, $errstr, $errfile, $errline) {
    log_captcha("PHP_ERROR: [$errno] $errstr in $errfile:$errline");
    if (!headers_sent()) header('X-Debug-Error: '.rawurlencode($errstr));
    return false; // Let normal error handler run too
  });
  register_shutdown_function(function() {
    $err = error_get_last();
    if ($err) log_captcha("FATAL: [{$err['type']}] {$err['message']} in {$err['file']}:{$err['line']}");
  });
}

// --- SESSION START ---
if (!@session_start()) {
  if ($debug) {
    log_captcha('SESSION_FAIL: session_start() failed');
    if (!headers_sent()) header('X-Debug-Error: session_start failed');
  }
  http_response_code(503);
  exit;
}

// --- CAPTCHA GENERATION ---
function make_code($len = 5) {
  $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  $out = '';
  for ($i=0; $i<$len; $i++) {
    $out .= $chars[random_int(0, strlen($chars)-1)];
  }
  return $out;
}

$code = make_code(5);
$_SESSION['captcha_code'] = $code;

if ($debug) {
  log_captcha("OK: captcha generated: $code");
  if (!headers_sent()) header('X-Debug-Session: '.session_id());
}

header('Content-Type: image/svg+xml; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$w = 120; $h = 40;
$letters = str_split($code);
$colors = ['#0b2239', '#B69B5C', '#6c757d'];

echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
?>
<svg xmlns="http://www.w3.org/2000/svg" width="<?= $w ?>" height="<?= $h ?>" viewBox="0 0 <?= $w ?> <?= $h ?>">
  <rect width="100%" height="100%" fill="#f7f8f9"/>
  <?php for ($i=0;$i<8;$i++): ?>
    <circle cx="<?= random_int(0,$w) ?>" cy="<?= random_int(0,$h) ?>" r="<?= random_int(1,3) ?>" fill="<?= $colors[array_rand($colors)] ?>" opacity=".25"/>
  <?php endfor; ?>
  <?php $x=10; foreach ($letters as $i => $ch): $y = 26 + random_int(-3,3); $rx = $x + random_int(-2,2); $rot = random_int(-12,12); $col = $colors[array_rand($colors)]; $x += 20 + random_int(0,4); ?>
    <g transform="translate(<?= $rx ?>,<?= $y ?>) rotate(<?= $rot ?>)">
      <text x="0" y="0" font-family="Inter,Arial,Helvetica,sans-serif" font-size="22" font-weight="700" fill="<?= $col ?>"><?= htmlspecialchars($ch, ENT_QUOTES|ENT_SUBSTITUTE, 'UTF-8') ?></text>
    </g>
  <?php endforeach; ?>
  <line x1="<?= random_int(0,intval($w/2)) ?>" y1="<?= random_int(0,$h) ?>" x2="<?= random_int(intval($w/2),$w) ?>" y2="<?= random_int(0,$h) ?>" stroke="#B69B5C" stroke-opacity=".35"/>
</svg>
