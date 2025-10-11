<?php
// sendmail.php – Minimal backend for contact form (Strato compatible)
// Config
$TO = 'social@techsulting.de'; // Empfänger
$FROM = 'kontakt@derko-immobilien.de'; // Absender (Domain-eigene Adresse)

// Erfolgstext (DE) für Bestätigungsmail an Nutzer
$SUCCESS_TEXT = "Vielen Dank für Ihr Interesse an unseren Wohnungen.\nWir prüfen Ihre Angaben und melden uns so schnell wie möglich bei Ihnen.\nHerzliche Grüße,\nIhr DERKO-Team.";

function get_post($key){ return isset($_POST[$key]) ? trim((string)$_POST[$key]) : ''; }
function safe_header($v){ return preg_replace('/[\r\n]+/', ' ', $v); }

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
  http_response_code(405);
  header('Allow: POST');
  echo 'Method not allowed';
  exit;
}

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

// Einfache Validierung
$errors = [];
if($name === '') $errors[] = 'name';
if(!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
if($phone === '') $errors[] = 'phone';
if($topic === '') $errors[] = 'topic';
if($message === '') $errors[] = 'message';
if($privacy !== '1') $errors[] = 'privacy';
if($topic === 'booking'){
  if($date_from === '') $errors[] = 'date_from';
  if($date_to === '') $errors[] = 'date_to';
  if($apartment === '') $errors[] = 'apartment';
  if($persons === '' || !preg_match('/^\d+$/', $persons)) $errors[] = 'persons';
}

if(!empty($errors)){
  http_response_code(400);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok'=>false,'errors'=>$errors]);
  exit;
}

// Anfrage-ID erstellen (DDMMYYHHMM)
$reqId = date('dmyHi');
$topicText = ($topic === 'booking') ? 'Buchungsanfrage' : 'Sonstige Fragen';
$subject = sprintf('%s - %s - Anfrage-ID: %s', $topicText, $name, $reqId);
$subjectEncoded = '=?UTF-8?B?'.base64_encode($subject).'?=';

// Body nur mit befüllten Feldern
$lines = [];
$add = function($label, $val) use (&$lines){ if($val !== '') $lines[] = sprintf('%s: %s', $label, $val); };
$add('Name', $name);
$add('E-Mail', $email);
$add('Telefon', $phone);
$add('Thema', $topicText);
if($topic === 'booking'){
  $add('Von', $date_from);
  $add('Bis', $date_to);
  $add('Wohnung', $apartment);
  $add('Personen', $persons);
}
if($message !== ''){
  $lines[] = 'Nachricht:';
  $lines[] = $message;
}
$body = implode("\r\n", $lines);

// Header vorbereiten
$headers = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'From: '.safe_header($FROM);
$headers[] = 'Reply-To: '.safe_header($email);
$headers[] = 'X-Mailer: PHP/'.phpversion();
$headerStr = implode("\r\n", $headers);

// 1) Mail an Betreiber
@mail($TO, $subjectEncoded, $body, $headerStr);

// 2) Bestätigungsmail an Absender
$confirmBody = $SUCCESS_TEXT."\r\n\r\n".'Ihre Angaben:'."\r\n".$body;
@mail($email, $subjectEncoded, $confirmBody, $headerStr);

// Weiterleitung auf Bestätigungsseite
header('Location: /pages/bestaetigung.html');
exit;
?>
