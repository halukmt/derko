<?php
// Mailer configuration (healthcheck) EXAMPLE
// Copy this file to 'weekly_mail_config.php' and fill in your real values.
// NEVER commit weekly_mail_config.php to version control!

return [
    // Sender address used for healthcheck mails
    'from' => 'noreply@example.com',

    // Healthcheck settings (for contact_form_health.php)
    // Generate a secure random token (32+ characters recommended)
    // Example: openssl rand -hex 16
    'health_token' => 'YOUR_SECRET_HEALTH_TOKEN_HERE_REPLACE_THIS',

    // Where healthcheck mails should go (admin inbox)
    // Can be a single string or an array of addresses
    'health_to' => ['admin@example.com'],

    // Subject and body for healthcheck mails
    'health_subject' => 'TEST - Site Contact Form Health Check',
    'health_body' => "Health check completed: OK\nTimestamp: %s\nSource: %s\n"
];
