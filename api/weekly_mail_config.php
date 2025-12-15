<?php
// Mailer configuration (healthcheck)
// Keep only the settings required for the contact-form healthcheck

return [
    // Sender address used for healthcheck mails
    'from' => 'kontakt@derko-immobilien.de',

    // Healthcheck settings (for contact_form_health.php)
    // Separate token used by healthcheck requests (keep private)
    'health_token' => '3f6b1d9a8c2e4b7f0a9c1d2e3f4b5a6c',
    // Where healthcheck mails should go (admin inbox). Can be a single string or an array of addresses.
    'health_to' => ['hostmaster@techsulting.de'],
    // Subject and body for healthcheck mails
    'health_subject' => 'TEST - DERKO - Kontaktformular Check',
    'health_body' => "Prüfung durchgeführt: OK\nZeitstempel: %s\nQuelle: %s\n"
];
