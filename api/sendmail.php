<?php
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
@session_start();

// --- Lightweight crash logging & fail-safe 500 handler --------------------
// Debug-Modus über Umgebungsvariable DERKO_DEBUG (siehe config.php)
function derko_log($msg, $extra = []){
  $line = '['.date('Y-m-d H:i:s').'] '.$msg;
  if (!empty($extra) && is_array($extra)) {
    foreach ($extra as $k => $v) {
      $line .= ' ' . $k . '=' . (is_scalar($v) ? $v : json_encode($v));
    }
  }
  $line .= ' ip='.( $_SERVER['REMOTE_ADDR'] ?? 'n/a');
  $line .= "\n";
  $paths = [
    __DIR__.DIRECTORY_SEPARATOR.'error.log',
    (function_exists('sys_get_temp_dir') ? sys_get_temp_dir() : '/tmp').DIRECTORY_SEPARATOR.'derko_error.log'
  ];
  $ok = false;
  $attempts = [];
  foreach ($paths as $p){
    $res = @file_put_contents($p, $line, FILE_APPEND);
    $attempts[] = ['path'=>$p, 'status'=>($res !== false ? 'ok' : 'fail')];
    if ($res !== false) { $ok = true; break; }
  }
  if (!$ok) { @error_log($line); }
  $GLOBALS['__DERKO_LAST_LOG_OK'] = $ok;
  $GLOBALS['__DERKO_LOG_ATTEMPTS'] = $attempts;
}
register_shutdown_function(function(){
  $e = error_get_last();
  if (!$e) return;
  $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR];
  if (!in_array($e['type'], $fatalTypes, true)) return; // non-fatal
  derko_log('FATAL at '.$e['file'].':'.$e['line'].' - '.$e['message']);
  if (!headers_sent()){
    http_response_code(500);
    header('Content-Type: application/json; charset=UTF-8');
    $body = ['ok'=>false,'errors'=>['server_error']];
    if (defined('DERKO_DEBUG') && DERKO_DEBUG){ $body['debug']=$e['message']; }
    echo json_encode($body);
  }
});
// sendmail.php – Minimal backend for contact form (Strato compatible)
// Config (externalized)
// Read operator addresses from api/config.php (with env var overrides)
// Falls back to previous defaults if config is missing
$configPath = __DIR__ . '/config.php';
@require_once $configPath;
// Debug-Infos nur ausgeben, wenn Debug aktiv ist
if (defined('DERKO_DEBUG') && DERKO_DEBUG) {
  derko_log('DEBUG-TEST: getenv='.var_export(getenv('DERKO_DEBUG'), true).' const='.var_export(defined('DERKO_DEBUG') ? DERKO_DEBUG : null, true));
  if (!headers_sent()){
    $envVal = getenv('DERKO_DEBUG');
    if ($envVal === false) { $envVal = getenv('REDIRECT_DERKO_DEBUG'); }
    header('X-DERKO-DEBUG: env='.var_export($envVal, true).'; const='.(defined('DERKO_DEBUG') && DERKO_DEBUG ? '1' : '0').'; logWrite='.(isset($GLOBALS['__DERKO_LAST_LOG_OK']) && $GLOBALS['__DERKO_LAST_LOG_OK'] ? 'ok' : 'fail'));
    $attempts = isset($GLOBALS['__DERKO_LOG_ATTEMPTS']) ? $GLOBALS['__DERKO_LOG_ATTEMPTS'] : [];
    if (!empty($attempts)) { header('X-DERKO-LOG-ATTEMPTS: '.json_encode($attempts)); }
  }
}
$TO = defined('DERKO_CONTACT_TO') ? DERKO_CONTACT_TO : '';
$FROM = defined('DERKO_CONTACT_FROM') ? DERKO_CONTACT_FROM : '';
// Fail fast if config not provided (avoid leaking or using placeholder addresses)
if ($TO === '' || $FROM === ''){
  derko_log('Mail config missing: ensure DERKO_CONTACT_TO / DERKO_CONTACT_FROM are set');
  if (!headers_sent()){
    http_response_code(500);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['ok'=>false,'errors'=>['server_misconfig']]);
  }
  exit;
}

// Keine hardcodierten Benutzer-Texte mehr – alles kommt aus den Sprachdateien.

// --- i18n helpers (server-side) ---
function detect_lang(){
  // 1) explicit from form (hidden input 'lang')
  $l = isset($_POST['lang']) ? strtolower(substr($_POST['lang'],0,2)) : '';
  $supported = ['de','en','pl','hu','sk','cs','it','bg','ro'];
  if (in_array($l, $supported, true)) return $l;
  // 2) Accept-Language header
  if (!empty($_SERVER['HTTP_ACCEPT_LANGUAGE'])){
    if (preg_match('/^(de|en|pl|hu|sk|cs|it|bg|ro)/i', $_SERVER['HTTP_ACCEPT_LANGUAGE'], $m)){
      $l = strtolower($m[1]);
      if (in_array($l, $supported, true)) return $l;
    }
  }
  return 'de';
}
function load_lang_dict($lang){
  // Try nested first: lang/<code>/<code>.json, then flat: lang/<code>.json
  $base = dirname(__DIR__); // project root (api/..)
  $candidates = [
    $base.DIRECTORY_SEPARATOR.'lang'.DIRECTORY_SEPARATOR.$lang.DIRECTORY_SEPARATOR.$lang.'.json',
    $base.DIRECTORY_SEPARATOR.'lang'.DIRECTORY_SEPARATOR.$lang.'.json',
  ];
  foreach ($candidates as $path){
    if (is_file($path)){
      $json = @file_get_contents($path);
      if ($json !== false){ $data = json_decode($json, true); if (is_array($data)) return $data; }
    }
  }
  return null;
}
function build_dict_chain($primary){
  // Fallback-Reihenfolge: gewählte Sprache -> en -> de
  $seen = [];
  $order = [];
  foreach ([$primary,'en','de'] as $code){
    if ($code && !isset($seen[$code])){ $seen[$code]=true; $order[] = $code; }
  }
  $dicts = [];
  foreach ($order as $code){
    $d = load_lang_dict($code);
    if (is_array($d)) $dicts[] = $d;
  }
  return $dicts; // array of dicts in priority order
}
function t_chain($dicts, $path, $fallback=''){
  foreach ($dicts as $d){
    $val = t_path($d, $path, null);
    if (is_string($val) && $val !== '') return $val;
  }
  return $fallback;
}
function t_path($arr, $path, $fallback=''){
  if (!is_array($arr)) return $fallback;
  $parts = explode('.', $path);
  $cur = $arr;
  foreach ($parts as $p){
    if (is_array($cur) && array_key_exists($p, $cur)){
      $cur = $cur[$p];
    } else { return $fallback; }
  }
  return is_string($cur) ? $cur : $fallback;
}
function strip_required_marker($label){
  return preg_replace('/\s*\*$/', '', (string)$label);
}
function html_to_text($html){
  if (!is_string($html) || $html==='') return '';
  $html = preg_replace('/<br\s*\/?\>/i', "\n", $html);
  $text = strip_tags($html);
  $flags = defined('ENT_HTML5') ? (ENT_QUOTES|ENT_HTML5) : ENT_QUOTES;
  return html_entity_decode($text, $flags, 'UTF-8');
}

// --- Polyfills for older PHP versions -------------------------------------
// Provide hash_equals on very old PHP (<5.6)
if (!function_exists('hash_equals')){
  function hash_equals($known_string, $user_string){
    if (!is_string($known_string) || !is_string($user_string)) return false;
    $len1 = strlen($known_string);
    $len2 = strlen($user_string);
    if ($len1 !== $len2) return false;
    $res = 0;
    for ($i = 0; $i < $len1; $i++){
      $res |= ord($known_string[$i]) ^ ord($user_string[$i]);
    }
    return $res === 0;
  }
}
// Provide random_int on PHP <7 (fallback to mt_rand for non-crypto usage)
if (!function_exists('random_int')){
  function random_int($min, $max){
    return mt_rand($min, $max);
  }
}

function get_post($key){ return isset($_POST[$key]) ? trim((string)$_POST[$key]) : ''; }
function safe_header($v){ return preg_replace('/[\r\n]+/', ' ', $v); }

function derko_wants_json_response(){
  // If the client explicitly accepts JSON, keep API-style responses.
  $accept = strtolower($_SERVER['HTTP_ACCEPT'] ?? '');
  if (strpos($accept, 'application/json') !== false) return true;
  // Explicit XHR marker (some clients)
  $xrw = strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '');
  if ($xrw === 'xmlhttprequest') return true;
  return false;
}

function derko_is_browser_navigation(){
  // Browser form submits usually use Sec-Fetch-Mode: navigate
  $mode = strtolower($_SERVER['HTTP_SEC_FETCH_MODE'] ?? '');
  if ($mode === 'navigate') return true;
  // Fallback: typical browser Accept header includes text/html
  $accept = strtolower($_SERVER['HTTP_ACCEPT'] ?? '');
  return (strpos($accept, 'text/html') !== false) && !derko_wants_json_response();
}

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
  http_response_code(405);
  header('Allow: POST');
  echo 'Method not allowed';
  exit;
}

// --- Settings: CSRF TTL and rate limit (from centralized config) -----------
$CSRF_TTL   = defined('DERKO_CSRF_TTL') ? (int)DERKO_CSRF_TTL : 600;
$RATE_WINDOW = defined('DERKO_RATE_WINDOW') ? (int)DERKO_RATE_WINDOW : 60;
$RATE_MAX    = defined('DERKO_RATE_MAX') ? (int)DERKO_RATE_MAX : 1;

// Felder einlesen
$name = get_post('name');
$email = get_post('email');
$phone = get_post('phone');
$topic = get_post('topic'); // booking | other
$date_from = get_post('date_from');
$date_to = get_post('date_to');
$apartment = get_post('apartment');
$persons = get_post('persons');
$message = get_post('message');
$privacy = get_post('privacy');
// Captcha
$captcha = get_post('captcha');
$csrf_token = get_post('csrf_token');
// Anti-bot fields
$honeypot = get_post('company'); // should stay empty
$js_enabled = get_post('js_enabled');
$form_ts = get_post('form_ts');

// Einfache Validierung
$errors = [];
// Sanitization & hardening of input fields (strip HTML/JS, limit length, whitelist characters)
function sanitize_field($val, $maxLen){
  // Remove HTML tags
  $val = strip_tags($val);
  // Replace control characters
  $val = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $val);
  // Trim
  $val = trim($val);
    // Unicode whitelist: letters, numbers, whitespace and common punctuation
    // Safer pattern to avoid fragile escaping in PHP string literals
    $val = preg_replace('/[^\p{L}\p{N}\s\.,;:\+\(\)\/!?\"\'"@\-]/u', '', $val);
  if (function_exists('mb_substr')){
    return mb_substr($val, 0, $maxLen);
  }
  return substr($val, 0, $maxLen);
}
$name = sanitize_field($name, 120);
$phone = sanitize_field($phone, 40);
$message = sanitize_field($message, 4000); // longer text allowed

if($name === '') $errors[] = 'name';
if(!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
if($topic === '') $errors[] = 'topic';
if($message === '') $errors[] = 'message';
if($privacy !== '1') $errors[] = 'privacy';
if($topic === 'booking'){
  if($date_from === '') $errors[] = 'date_from';
  if($date_to === '') $errors[] = 'date_to';
  if($apartment === '') $errors[] = 'apartment';
  if($persons === '' || !preg_match('/^\d+$/', $persons)) $errors[] = 'persons';
}

// CSRF token check (and optional TTL)
$csrf_ok = true;
if (!isset($_SESSION['csrf_token']) || $csrf_token === '' || !hash_equals($_SESSION['csrf_token'], $csrf_token)){
  $csrf_ok = false;
}
// TTL if available
$issuedAt = isset($_SESSION['csrf_issued_at']) ? (int)$_SESSION['csrf_issued_at'] : 0;
if ($csrf_ok && $issuedAt && (time() - $issuedAt) > $CSRF_TTL){
  $csrf_ok = false;
}
if (!$csrf_ok){
  $hasSessionTok = isset($_SESSION['csrf_token']);
  $hasPostedTok  = ($csrf_token !== '');
  $age = $issuedAt ? (time() - $issuedAt) : -1;
  $reason = !$hasSessionTok ? 'no_session_token' : (!$hasPostedTok ? 'no_post_token' : ($issuedAt && $age > $CSRF_TTL ? 'expired' : 'mismatch'));
  // Optional debug header (only when debug is enabled)
  if (defined('DERKO_DEBUG') && DERKO_DEBUG){
    header('X-DERKO-CSRF: '.$reason);
  }
  // Always log CSRF failures (minimal PII; includes IP from derko_log)
  $ref = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
  $host = $_SERVER['HTTP_HOST'] ?? '';
  $cookie = $_COOKIE[session_name()] ?? '';
  $cookie_domain = ini_get('session.cookie_domain');
  $save_path = ini_get('session.save_path');
  $samesite = ini_get('session.cookie_samesite');
  $free_tmp = function_exists('disk_free_space') ? @disk_free_space('/tmp') : 'n/a';
  derko_log(
    'CSRF fail: sid='.session_id()." reason=$reason age=$age ttl=$CSRF_TTL referer=".safe_header($ref),
    [
      'host'=>$host,
      'session_cookie'=>($cookie ? 'set' : 'none'),
      'cookie_domain'=>$cookie_domain,
      'save_path'=>$save_path,
      'samesite'=>$samesite,
      'free_tmp'=>$free_tmp
    ]
  );
  // Redirect to friendly session timeout page (do not count towards rate limit)
  header('Location: /pages/error-session.html');
  exit;
}
// CAPTCHA check (case-insensitive)
if ($captcha === '' || !isset($_SESSION['captcha_code']) || strcasecmp(trim($captcha), $_SESSION['captcha_code']) !== 0) {
  $errors[] = 'captcha';
}
// Invalidate used code regardless
unset($_SESSION['captcha_code']);

// Friendly browser redirect for CAPTCHA failures (avoid showing raw JSON)
if (in_array('captcha', $errors, true) && derko_is_browser_navigation() && !derko_wants_json_response()){
  header('Location: /pages/error-captcha.html', true, 303);
  exit;
}

// --- Rate limiting (only after CSRF is valid) ------------------------------
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateStore = __DIR__.DIRECTORY_SEPARATOR.'rate_store';
if(!is_dir($rateStore)) @mkdir($rateStore, 0700);
$rateFile = $rateStore.DIRECTORY_SEPARATOR.'ip_'.preg_replace('/[^a-zA-Z0-9_.-]/','_', $ip);
$now = time();
$hits = [];
if(is_file($rateFile)){
  $raw = @file_get_contents($rateFile);
  if($raw !== false){
    $hits = array_filter(array_map('intval', explode(',', $raw)), function($t) use ($now,$RATE_WINDOW){ return $t > $now - $RATE_WINDOW; });
  }
}
if(count($hits) >= $RATE_MAX){
  $oldest = min($hits);
  $wait = max(1, $RATE_WINDOW - ($now - $oldest));
  header('Retry-After: '.$wait);
  header('Location: /pages/error-rate-limit.html?wait='.$wait);
  exit;
}
// Record current attempt now
$hits[] = $now;
@file_put_contents($rateFile, implode(',', $hits));

// Basic anti-bot checks
// 1) Honeypot must be empty
if($honeypot !== ''){ $errors[] = 'bot_honeypot'; }
// 2) JS flag should be set (progressive enhancement: if missing, allow but flag)
if($js_enabled === ''){ /* could add soft flag; not blocking to avoid false negatives */ }
// 3) Submission too fast (< 2s) since render
$clientTs = ctype_digit($form_ts) ? (int)$form_ts : 0;
if($clientTs > 0){
  $delta = (int)(microtime(true)*1000) - $clientTs;
  if($delta < 2000){ $errors[] = 'bot_too_fast'; }
}

// Limit number of URLs inside message (spam mitigation)
if($message !== ''){
  $urlCount = preg_match_all('/https?:\/\/\S+/i', $message, $m);
  if($urlCount > 2){ $errors[] = 'too_many_urls'; }
}

// Block simple disposable domains (extendable list)
$dispDomains = ['mailinator.com','trashmail.com','tempmail.com','10minutemail.com'];
$emailDomain = strtolower(substr(strrchr($email,'@'),1));
if($emailDomain && in_array($emailDomain, $dispDomains, true)){
  $errors[] = 'email_disposable';
}

if(!empty($errors)){
  // For regular validation errors keep JSON (used by inline feedback)
  http_response_code(400);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok'=>false,'errors'=>$errors]);
  exit;
}

// Small randomized delay (obfuscate timing for bots)
usleep(random_int(80000, 220000)); // 80–220ms

// Anfrage-ID erstellen (YYYYMMDDHHMM)
// Format: Jahr-Monat-Tag-Stunde-Minute per Anforderung
$reqId = date('YmdHi');
$lang = detect_lang();
$__DICT_CHAIN = build_dict_chain($lang);
// Topic text localized
$topicBooking = t_chain($__DICT_CHAIN, 'kontakt.form.topicBooking');
$topicOther   = t_chain($__DICT_CHAIN, 'kontakt.form.topicOther');
$topicText = ($topic === 'booking') ? $topicBooking : $topicOther;
// Resolve apartment title in user's language (fallback to key)
$apartmentTitle_user = ($apartment !== '')
  ? t_chain($__DICT_CHAIN, 'wohnungen.cards.'.$apartment.'.title', $apartment)
  : '';
// Build user-specific subject using user's language
$subjectIdLabel_user = t_chain($__DICT_CHAIN, 'kontakt.email.subjectIdLabel');
$subject_user = sprintf('%s - %s - %s: %s', $topicText, $name, $subjectIdLabel_user, $reqId);
$subjectEncoded_user = '=?UTF-8?B?'.base64_encode($subject_user).'?=';

// Labels localized (fallback to sensible defaults)
$L_name      = strip_required_marker(t_chain($__DICT_CHAIN,'kontakt.form.name'));
$L_email     = strip_required_marker(t_chain($__DICT_CHAIN,'kontakt.form.email'));
$L_phone     = strip_required_marker(t_chain($__DICT_CHAIN,'kontakt.form.phone'));
$L_topic     = strip_required_marker(t_chain($__DICT_CHAIN,'kontakt.form.topic'));
$L_from      = strip_required_marker(t_chain($__DICT_CHAIN,'kontakt.form.dateFrom'));
$L_to        = strip_required_marker(t_chain($__DICT_CHAIN,'kontakt.form.dateTo'));
$L_apartment = strip_required_marker(t_chain($__DICT_CHAIN,'kontakt.form.apartment'));
$L_persons   = strip_required_marker(t_chain($__DICT_CHAIN,'kontakt.form.persons'));
$L_message   = strip_required_marker(t_chain($__DICT_CHAIN,'kontakt.form.message'));

// Helper to build a language-specific body, including Anfrage-ID as the first line
$build_body = function($L, $idLabel, $reqId, $apartmentValue) use ($name,$email,$phone,$topicText,$topic,$date_from,$date_to,$persons,$message){
  $lines = [];
  if($idLabel !== '' && $reqId !== ''){
    $lines[] = sprintf('%s: %s', $idLabel, $reqId);
  }
  $add = function($label, $val) use (&$lines){ if($val !== '') $lines[] = sprintf('%s: %s', $label, $val); };
  $add($L['name'], $name);
  $add($L['email'], $email);
  $add($L['phone'], $phone);
  $add($L['topic'], $topicText);
  if($topic === 'booking'){
    $add($L['from'], $date_from);
    $add($L['to'], $date_to);
    $add($L['apartment'], $apartmentValue);
    $add($L['persons'], $persons);
  }
  if($message !== ''){
    $lines[] = $L['message'].':';
    $lines[] = $message;
  }
  return implode("\r\n", $lines);
};

// Labels for user language (already resolved above)
$LABELS_USER = [
  'name'=>$L_name,'email'=>$L_email,'phone'=>$L_phone,'topic'=>$L_topic,
  'from'=>$L_from,'to'=>$L_to,'apartment'=>$L_apartment,'persons'=>$L_persons,'message'=>$L_message
];
$body_user = $build_body($LABELS_USER, $subjectIdLabel_user, $reqId, $apartmentTitle_user);

// Build operator (always German) chain and labels
$__DICT_CHAIN_OP = build_dict_chain('de');
$topicBooking_de = t_chain($__DICT_CHAIN_OP, 'kontakt.form.topicBooking');
$topicOther_de   = t_chain($__DICT_CHAIN_OP, 'kontakt.form.topicOther');
$topicText_de    = ($topic === 'booking') ? $topicBooking_de : $topicOther_de;
$subjectIdLabel_op = t_chain($__DICT_CHAIN_OP, 'kontakt.email.subjectIdLabel');
$subject_op = sprintf('%s - %s - %s: %s', $topicText_de, $name, $subjectIdLabel_op, $reqId);
$subjectEncoded_op = '=?UTF-8?B?'.base64_encode($subject_op).'?=';
$L_name_de      = strip_required_marker(t_chain($__DICT_CHAIN_OP,'kontakt.form.name'));
$L_email_de     = strip_required_marker(t_chain($__DICT_CHAIN_OP,'kontakt.form.email'));
$L_phone_de     = strip_required_marker(t_chain($__DICT_CHAIN_OP,'kontakt.form.phone'));
$L_topic_de     = strip_required_marker(t_chain($__DICT_CHAIN_OP,'kontakt.form.topic'));
$L_from_de      = strip_required_marker(t_chain($__DICT_CHAIN_OP,'kontakt.form.dateFrom'));
$L_to_de        = strip_required_marker(t_chain($__DICT_CHAIN_OP,'kontakt.form.dateTo'));
$L_apartment_de = strip_required_marker(t_chain($__DICT_CHAIN_OP,'kontakt.form.apartment'));
$L_persons_de   = strip_required_marker(t_chain($__DICT_CHAIN_OP,'kontakt.form.persons'));
$L_message_de   = strip_required_marker(t_chain($__DICT_CHAIN_OP,'kontakt.form.message'));
$LABELS_OP = [
  'name'=>$L_name_de,'email'=>$L_email_de,'phone'=>$L_phone_de,'topic'=>$L_topic_de,
  'from'=>$L_from_de,'to'=>$L_to_de,'apartment'=>$L_apartment_de,'persons'=>$L_persons_de,'message'=>$L_message_de
];
// Resolve apartment title for operator (German)
$apartmentTitle_de = ($apartment !== '')
  ? t_chain($__DICT_CHAIN_OP, 'wohnungen.cards.'.$apartment.'.title', $apartment)
  : '';
// Build operator body (always German), include Anfrage-ID as first line
$body_op = (function($L,$idLabel,$reqId,$name,$email,$phone,$topic_de,$topic,$date_from,$date_to,$apartment_value,$persons,$message){
  $lines = [];
  if($idLabel !== '' && $reqId !== ''){
    $lines[] = sprintf('%s: %s', $idLabel, $reqId);
  }
  $add = function($label, $val) use (&$lines){ if($val !== '') $lines[] = sprintf('%s: %s', $label, $val); };
  $add($L['name'], $name);
  $add($L['email'], $email);
  $add($L['phone'], $phone);
  $add($L['topic'], $topic_de);
  if($topic === 'booking'){
    $add($L['from'], $date_from);
    $add($L['to'], $date_to);
    $add($L['apartment'], $apartment_value);
    $add($L['persons'], $persons);
  }
  if($message !== ''){
    $lines[] = $L['message'].':';
    $lines[] = $message;
  }
  return implode("\r\n", $lines);
})($LABELS_OP,$subjectIdLabel_op,$reqId,$name,$email,$phone,$topicText_de,$topic,$date_from,$date_to,$apartmentTitle_de,$persons,$message);

// Header vorbereiten
// Operator headers: reply-to = user email
$headersOp = [];
$headersOp[] = 'MIME-Version: 1.0';
$headersOp[] = 'Content-Type: text/plain; charset=UTF-8';
$headersOp[] = 'From: '.safe_header($FROM);
$headersOp[] = 'Reply-To: '.safe_header($email);
$headersOp[] = 'X-Mailer: PHP/'.phpversion();
$headerStrOp = implode("\r\n", $headersOp);

// User headers: reply-to optional (operator address)
$headersUser = [];
$headersUser[] = 'MIME-Version: 1.0';
$headersUser[] = 'Content-Type: text/plain; charset=UTF-8';
$headersUser[] = 'From: '.safe_header($FROM);
$headersUser[] = 'Reply-To: '.safe_header($TO);
$headersUser[] = 'X-Mailer: PHP/'.phpversion();
$headerStrUser = implode("\r\n", $headersUser);

// 1) Mail an Betreiber (immer Deutsch)
@mail($TO, $subjectEncoded_op, $body_op, $headerStrOp);

// 2) Bestätigungsmail an Absender (localized nach Benutzer-Sprache)
// Prefer confirmation.message from i18n (chain lookup)
$successHtml = t_chain($__DICT_CHAIN, 'confirmation.message', '');
$successText = $successHtml ? html_to_text($successHtml) : '';
$yourDetails = t_chain($__DICT_CHAIN, 'kontakt.email.yourDetails');
$confirmBody = $successText."\r\n\r\n".$yourDetails."\r\n".$body_user;
@mail($email, $subjectEncoded_user, $confirmBody, $headerStrUser);

// Weiterleitung auf Bestätigungsseite
header('Location: /pages/bestaetigung.html');
exit;
?>
