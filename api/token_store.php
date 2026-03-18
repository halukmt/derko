<?php
// token_store.php — File-based token store for contact form CSRF + CAPTCHA.
// Replaces PHP sessions to avoid cookie-related issues on shared hosting.

/**
 * Return the absolute file path for a token, or null if the ID is invalid.
 * Only 32 lowercase hex characters are accepted (prevents path traversal).
 */
function token_path($token_id) {
    if (!is_string($token_id) || !preg_match('/^[0-9a-f]{32}$/', $token_id)) {
        return null;
    }
    $dir = realpath(__DIR__ . '/../tmp/tokens');
    if (!$dir) {
        $dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'tmp' . DIRECTORY_SEPARATOR . 'tokens';
        if (!is_dir($dir)) { @mkdir($dir, 0700, true); }
    }
    return $dir . DIRECTORY_SEPARATOR . $token_id . '.json';
}

/**
 * Create a new token with a random ID and CSRF token.
 * Returns ['token_id'=>..., 'csrf_token'=>..., 'issued_at'=>...] or null on failure.
 */
function token_create() {
    $token_id   = bin2hex(random_bytes(16));
    $csrf_token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    $data = [
        'csrf_token' => $csrf_token,
        'issued_at'  => time(),
    ];
    $path = token_path($token_id);
    if (!$path) { return null; }
    if (file_put_contents($path, json_encode($data), LOCK_EX) === false) {
        return null;
    }
    return [
        'token_id'   => $token_id,
        'csrf_token' => $csrf_token,
        'issued_at'  => $data['issued_at'],
    ];
}

/**
 * Read a token file and return its data as an associative array, or null.
 */
function token_read($token_id) {
    $path = token_path($token_id);
    if (!$path || !is_file($path)) { return null; }
    $json = @file_get_contents($path);
    if ($json === false) { return null; }
    $data = json_decode($json, true);
    return is_array($data) ? $data : null;
}

/**
 * Merge $updates into the existing token file (read-modify-write with lock).
 */
function token_update($token_id, array $updates) {
    $path = token_path($token_id);
    if (!$path || !is_file($path)) { return false; }

    $fp = @fopen($path, 'c+');
    if (!$fp) { return false; }
    if (!flock($fp, LOCK_EX)) { fclose($fp); return false; }

    $json = stream_get_contents($fp);
    $data = ($json !== false && $json !== '') ? json_decode($json, true) : [];
    if (!is_array($data)) { $data = []; }

    $data = array_merge($data, $updates);

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return true;
}

/**
 * Delete a token file.
 */
function token_delete($token_id) {
    $path = token_path($token_id);
    if ($path && is_file($path)) { @unlink($path); }
}

/**
 * Remove token files older than $max_age seconds (default 1 hour).
 */
function token_cleanup($max_age = 3600) {
    $dir = realpath(__DIR__ . '/../tmp/tokens');
    if (!$dir || !is_dir($dir)) { return; }
    $cutoff = time() - $max_age;
    foreach (glob($dir . DIRECTORY_SEPARATOR . '*.json') as $file) {
        if (@filemtime($file) < $cutoff) { @unlink($file); }
    }
}
