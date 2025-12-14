<?php
// Centralized email configuration for contact handling.
// Override via environment variables DERKO_CONTACT_TO / DERKO_CONTACT_FROM.
// Do not put real addresses in the repository; set them in the environment or an untracked local config.

// Optional: load local overrides if present (not tracked)
$local = __DIR__ . DIRECTORY_SEPARATOR . 'config.local.php';
if (is_file($local)) { @require_once $local; }

// Debug-Modus zentral über Umgebungsvariable steuerbar (robust über mehrere Quellen)
if (!defined('DERKO_DEBUG')) {
  $dbg = getenv('DERKO_DEBUG');
  if ($dbg === false) { $dbg = getenv('REDIRECT_DERKO_DEBUG'); } // Apache/redirect env
  if ($dbg === false && isset($_ENV['DERKO_DEBUG'])) { $dbg = $_ENV['DERKO_DEBUG']; }
  if ($dbg === false && isset($_SERVER['DERKO_DEBUG'])) { $dbg = $_SERVER['DERKO_DEBUG']; }
  // akzeptiere 1/true/on
  $dbgOn = ($dbg === '1' || $dbg === 'true' || $dbg === 'on');
  define('DERKO_DEBUG', $dbgOn);
}

if (!defined('DERKO_CONTACT_TO')) {
  // Empty by default; must be provided via env or config.local.php
  $toEnv = getenv('DERKO_CONTACT_TO');
  define('DERKO_CONTACT_TO', $toEnv !== false ? $toEnv : '');
}
if (!defined('DERKO_CONTACT_FROM')) {
  // Empty by default; must be provided via env or config.local.php
  $fromEnv = getenv('DERKO_CONTACT_FROM');
  define('DERKO_CONTACT_FROM', $fromEnv !== false ? $fromEnv : '');
}

// Security and rate limiting parameters (centralized)
// Defaults are sensible; can be overridden via env or config.local.php
if (!defined('DERKO_CSRF_TTL')) {
  $v = getenv('DERKO_CSRF_TTL');
  define('DERKO_CSRF_TTL', ($v !== false && ctype_digit($v)) ? (int)$v : 600); // seconds
}
if (!defined('DERKO_RATE_WINDOW')) {
  $v = getenv('DERKO_RATE_WINDOW');
  define('DERKO_RATE_WINDOW', ($v !== false && ctype_digit($v)) ? (int)$v : 60); // seconds
}
if (!defined('DERKO_RATE_MAX')) {
  $v = getenv('DERKO_RATE_MAX');
  define('DERKO_RATE_MAX', ($v !== false && ctype_digit($v)) ? (int)$v : 1); // max submissions per window
}
