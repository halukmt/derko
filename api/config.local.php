<?php
// Local/project-specific mail configuration.
// This file is loaded by api/config.php if present.
// It can remain in the repository as your canonical defaults.
// For environment-specific overrides, set the env vars DERKO_CONTACT_TO / DERKO_CONTACT_FROM.

if (!defined('DERKO_CONTACT_TO')) {
  define('DERKO_CONTACT_TO', 'kontakt@derko-immobilien.de');
}
if (!defined('DERKO_CONTACT_FROM')) {
  define('DERKO_CONTACT_FROM', 'kontakt@derko-immobilien.de');
}
