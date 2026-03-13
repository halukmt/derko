<?php
// WICHTIG: Fehler NIEMALS in das Bild rendern, sonst wird es als "broken" angezeigt.
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// --- DEBUG EINSTELLUNG ---
// Debug-Modus: nur für lokale Entwicklung auf true setzen.
// Für Production IMMER auf false lassen.
$debug = false;

// --- SESSION CONFIGURATION ---
// Allow override via DERKO_COOKIE_DOMAIN env var so sessions work on localhost
// (Docker sets this to empty string; production falls back to .derko-immobilien.de)
$cookieDomain = getenv('DERKO_COOKIE_DOMAIN') !== false ? getenv('DERKO_COOKIE_DOMAIN') : '.derko-immobilien.de';
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

// Logging-Funktion (identisch zu sendmail.php Logik)
function log_captcha($msg) {
  global $debug;
  if (!$debug) return;

  $ts = date('Y-m-d H:i:s');
  $ip = $_SERVER['REMOTE_ADDR'] ?? '-';
  $sid = session_id() ?: 'no_session';
  // Einfaches Log-Format
  $line = "[$ts] IP:$ip SID:$sid MSG:$msg\n";

  // Datei direkt im api Ordner (wie error.log)
  $logFile = __DIR__ . DIRECTORY_SEPARATOR . 'captcha_debug.log';

  // Versuch zu schreiben
  $res = @file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);

  // Fallback, falls Berechtigung fehlt (in System-Log oder Temp)
  if ($res === false) {
     $tmpLog = (function_exists('sys_get_temp_dir') ? sys_get_temp_dir() : '/tmp') . DIRECTORY_SEPARATOR . 'derko_captcha_debug.log';
     @file_put_contents($tmpLog, $line, FILE_APPEND | LOCK_EX);
     // Zur Sicherheit auch ins Server-Error-Log
     @error_log("DERKO_CAPTCHA_FAIL: $msg");
  }
}

// Fehler abfangen, ohne das Bild zu zerstören
if ($debug) {
  set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // Nur loggen, nicht ausgeben!
    log_captcha("PHP_ERR: [$errno] $errstr in $errfile:$errline");
    return true; // true = Fehler hier erledigt, nicht an PHP weitergeben (verhindert Output)
  });
}

// --- SESSION START ---
if (!@session_start()) {
  log_captcha('SESSION_FAIL: session_start() failed');
  http_response_code(503);
  exit;
}

// --- CAPTCHA GENERATION ---
function make_code($len = 5) {
  $chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  $out = '';
  for ($i=0; $i<$len; $i++) {
    $out .= $chars[random_int(0, strlen($chars)-1)];
  }
  return $out;
}

$code = make_code(5);
$_SESSION['captcha_code'] = $code;

log_captcha("OK: captcha generated: $code");

// Ausgabe Headers
header('Content-Type: image/svg+xml; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$w = 120; $h = 40;
$letters = str_split($code);
$colors = ['#0b2239', '#B69B5C', '#6c757d'];

// XML/SVG Ausgabe
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