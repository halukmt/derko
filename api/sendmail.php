<?php
// Harden session cookie flags (must be set before session_start)
// Secure only effective over HTTPS; SameSite=Lax prevents CSRF on top navigation GETs.
@session_set_cookie_params([
  'path' => '/',
  'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
  'httponly' => true,
  'samesite' => 'Lax'
]);
@session_start();
// sendmail.php – Minimal backend for contact form (Strato compatible)
// Config
$TO = 'social@techsulting.de'; // Empfänger
$FROM = 'kontakt@derko-immobilien.de'; // Absender (Domain-eigene Adresse)

// Keine hardcodierten Benutzer-Texte mehr – alles kommt aus den Sprachdateien.

// --- i18n helpers (server-side) ---
function detect_lang(){
  // 1) explicit from form (hidden input 'lang')
  $l = isset($_POST['lang']) ? strtolower(substr($_POST['lang'],0,2)) : '';
  if ($l === 'de' || $l === 'en') return $l;
  // 2) Accept-Language header
  if (!empty($_SERVER['HTTP_ACCEPT_LANGUAGE'])){
    if (preg_match('/^(de|en)/i', $_SERVER['HTTP_ACCEPT_LANGUAGE'], $m)){
      $l = strtolower($m[1]);
      if ($l === 'de' || $l === 'en') return $l;
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
  return html_entity_decode($text, ENT_QUOTES|ENT_HTML5, 'UTF-8');
}

function get_post($key){ return isset($_POST[$key]) ? trim((string)$_POST[$key]) : ''; }
function safe_header($v){ return preg_replace('/[\r\n]+/', ' ', $v); }

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
  http_response_code(405);
  header('Allow: POST');
  echo 'Method not allowed';
  exit;
}

// --- Basic IP rate limiting -------------------------------------------------
// Allow small burst, e.g. 3 submissions per 10 minutes per IP
$RATE_WINDOW = 600; // seconds
$RATE_MAX = 3;
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
  http_response_code(429);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok'=>false,'errors'=>['rate_limit']]);
  exit;
}
// Record current attempt (provisionally; if validation fails we still count it)
$hits[] = $now;
@file_put_contents($rateFile, implode(',', $hits));

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
  // Whitelist basic characters (letters, numbers, common punctuation, umlauts)
  $val = preg_replace('/[^A-Za-z0-9ÄÖÜäöüß .,;:\\'"\-+()\/!?@]/u', '', $val);
  return mb_substr($val, 0, $maxLen);
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

// CSRF token check
if (!isset($_SESSION['csrf_token']) || $csrf_token === '' || !hash_equals($_SESSION['csrf_token'], $csrf_token)){
  $errors[] = 'csrf';
}
// CAPTCHA check (case-insensitive)
if ($captcha === '' || !isset($_SESSION['captcha_code']) || strcasecmp(trim($captcha), $_SESSION['captcha_code']) !== 0) {
  $errors[] = 'captcha';
}
// Invalidate used code regardless
unset($_SESSION['captcha_code']);

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
  http_response_code(400);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok'=>false,'errors'=>$errors]);
  exit;
}

// Small randomized delay (obfuscate timing for bots)
usleep(random_int(80000, 220000)); // 80–220ms

// Anfrage-ID erstellen (DDMMYYHHMM)
$reqId = date('dmyHi');
$lang = detect_lang();
$__DICT_CHAIN = build_dict_chain($lang);
// Topic text localized
$topicBooking = t_chain($__DICT_CHAIN, 'kontakt.form.topicBooking');
$topicOther   = t_chain($__DICT_CHAIN, 'kontakt.form.topicOther');
$topicText = ($topic === 'booking') ? $topicBooking : $topicOther;
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

// Helper to build a language-specific body
$build_body = function($L) use ($name,$email,$phone,$topicText,$topic,$date_from,$date_to,$apartment,$persons,$message){
  $lines = [];
  $add = function($label, $val) use (&$lines){ if($val !== '') $lines[] = sprintf('%s: %s', $label, $val); };
  $add($L['name'], $name);
  $add($L['email'], $email);
  $add($L['phone'], $phone);
  $add($L['topic'], $topicText);
  if($topic === 'booking'){
    $add($L['from'], $date_from);
    $add($L['to'], $date_to);
    $add($L['apartment'], $apartment);
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
$body_user = $build_body($LABELS_USER);

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
$body_op = (function() use ($build_body,$LABELS_OP,$topicText_de){
  // swap topicText to German for operator
  return $build_body(array_merge($LABELS_OP,[]));
})();
// but the above uses $topicText (user). Rebuild with German topic text explicitly
$body_op = (function($L,$name,$email,$phone,$topic_de,$topic,$date_from,$date_to,$apartment,$persons,$message){
  $lines = [];
  $add = function($label, $val) use (&$lines){ if($val !== '') $lines[] = sprintf('%s: %s', $label, $val); };
  $add($L['name'], $name);
  $add($L['email'], $email);
  $add($L['phone'], $phone);
  $add($L['topic'], $topic_de);
  if($topic === 'booking'){
    $add($L['from'], $date_from);
    $add($L['to'], $date_to);
    $add($L['apartment'], $apartment);
    $add($L['persons'], $persons);
  }
  if($message !== ''){
    $lines[] = $L['message'].':';
    $lines[] = $message;
  }
  return implode("\r\n", $lines);
})($LABELS_OP,$name,$email,$phone,$topicText_de,$topic,$date_from,$date_to,$apartment,$persons,$message);

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
