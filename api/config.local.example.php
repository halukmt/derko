<?php
// Local/project-specific mail configuration EXAMPLE
// Copy this file to 'config.local.php' and fill in your real values.
// NEVER commit config.local.php to version control!

// Debug toggle (set to false in production)
if (!defined('DERKO_DEBUG')) {
  define('DERKO_DEBUG', false);
}

// Email addresses for contact form
if (!defined('DERKO_CONTACT_TO')) {
  define('DERKO_CONTACT_TO', 'your-email@example.com');
}

if (!defined('DERKO_CONTACT_FROM')) {
  define('DERKO_CONTACT_FROM', 'noreply@example.com');
}
