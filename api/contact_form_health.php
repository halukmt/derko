<?php
// Contact form healthcheck endpoint
// Usage: https://yourdomain.tld/api/contact_form_health.php?token=HEALTH_TOKEN

// Load config
$config = require __DIR__ . '/weekly_mail_config.php';

// Get token from GET/POST or header
$token = null;
if (!empty($_GET['token'])) {
    $token = $_GET['token'];
} elseif (!empty($_POST['token'])) {
    $token = $_POST['token'];
} elseif (!empty($_SERVER['HTTP_X_WEBHOOK_TOKEN'])) {
    $token = $_SERVER['HTTP_X_WEBHOOK_TOKEN'];
}

if (empty($token) || !hash_equals((string)$config['health_token'], (string)$token)) {
    http_response_code(403);
    echo "Forbidden: invalid token.\n";
    exit;
}

// Optional IP allowlist (reuse webhook_allowed_ips if set)
if (!empty($config['webhook_allowed_ips']) && is_array($config['webhook_allowed_ips'])) {
    $remote = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!in_array($remote, $config['webhook_allowed_ips'], true)) {
        http_response_code(403);
        echo "Forbidden: IP not allowed.\n";
        exit;
    }
}

// Lockfile to avoid duplicate runs
$lockfile = __DIR__ . '/contact_form_health.lock';
if (file_exists($lockfile)) {
    $age = time() - @filemtime($lockfile);
    if ($age < 300) { // 5 minutes
        http_response_code(429);
        echo "Already triggered recently.\n";
        exit;
    }
}
@file_put_contents($lockfile, "locked\n");

$to = isset($config['health_to']) ? $config['health_to'] : (is_array($config['to']) ? $config['to'][0] : $config['to']);
// support array or comma-separated string for recipients
if (is_array($to)) {
    $to = implode(',', $to);
} else {
    // normalize whitespace
    $to = trim($to);
}
$from = $config['from'] ?? 'no-reply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
$subject = $config['health_subject'] ?? 'DERKO contact-form healthcheck';
$bodyTemplate = $config['health_body'] ?? "Healthcheck OK\nTimestamp: %s\nSource: %s\n";
$body = sprintf($bodyTemplate, date(DATE_ATOM), ($_SERVER['HTTP_USER_AGENT'] ?? 'webhook'));

$headers = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'From: ' . $from;
$headers[] = 'X-Mailer: PHP/' . phpversion();
$headerStr = implode("\r\n", $headers);

// local log path (append-only, visible via FTP)
$logfile = __DIR__ . '/contact_form_health.log';

// log attempt
$attemptEntry = sprintf("%s\tATTEMPT\tremote=%s\tto=%s\tsubject=%s\n",
    date(DATE_ATOM),
    $_SERVER['REMOTE_ADDR'] ?? '-',
    $to,
    $subject
);
@file_put_contents($logfile, $attemptEntry, FILE_APPEND | LOCK_EX);

$result = @mail($to, $subject, $body, $headerStr);

// remove lock
@unlink($lockfile);

if ($result) {
    http_response_code(200);
    echo "Healthcheck: mail sent.\n";
    error_log("contact_form_health: mail sent to $to");
    $okEntry = sprintf("%s\tOK\tto=%s\n", date(DATE_ATOM), $to);
    @file_put_contents($logfile, $okEntry, FILE_APPEND | LOCK_EX);
    exit;
} else {
    http_response_code(500);
    echo "Healthcheck: failed to send mail.\n";
    // capture last PHP error if any
    $lastErr = error_get_last();
    $errMsg = isset($lastErr['message']) ? $lastErr['message'] : 'no php error';
    error_log("contact_form_health: failed to send weekly mail to $to - result=false - php_err={$errMsg}");
    $errEntry = sprintf("%s\tERROR\tto=%s\tphp_error=%s\n", date(DATE_ATOM), $to, str_replace("\n", ' ', $errMsg));
    @file_put_contents($logfile, $errEntry, FILE_APPEND | LOCK_EX);
    exit;
}
