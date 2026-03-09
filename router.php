<?php
/**
 * PHP built-in server router for local development.
 * Usage: php -S localhost:8080 router.php
 *
 * Mirrors the .htaccess rewrite rules so that:
 *   - Pretty URLs work locally (/wohnungen, /en/wohnungen, etc.)
 *   - Language-prefixed URLs work (/en/, /pl/wohnungen, etc.)
 *   - Custom 404 page is served instead of PHP's default purple error page
 */

$uri  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$root = __DIR__;

// 1. Serve real files and directories directly (assets, images, JS, CSS, etc.)
if ($uri !== '/' && file_exists($root . $uri)) {
    return false; // let PHP built-in server handle it
}

// 2. Route map (mirrors .htaccess RewriteRules)
$langPattern = 'en|pl|hu|sk|cs|it|bg|ro';
$pageMap = [
    'wohnungen'      => '/pages/wohnungen.html',
    'kontakt'        => '/pages/kontakt.html',
    'ueber-uns'      => '/pages/ueber-uns.html',
    'impressum'      => '/pages/impressum.html',
    'agb'            => '/pages/agb.html',
    'datenschutz'    => '/pages/datenschutz.html',
    'faq'            => '/pages/faq.html',
    'bestaetigung'   => '/pages/bestaetigung.html',
];

$path = trim($uri, '/');

// Root → index.html
if ($path === '') {
    require $root . '/index.html';
    exit;
}

// Language root: /en/, /pl/ etc. → index.html (lang.js detects language from URL)
if (preg_match('/^(' . $langPattern . ')\/?$/', $path, $m)) {
    require $root . '/index.html';
    exit;
}

// Language + wohnung-detail: /en/wohnung
if (preg_match('/^(' . $langPattern . ')\/wohnung\/?$/', $path)) {
    require $root . '/pages/wohnung-detail.html';
    exit;
}

// Language + page slug: /en/wohnungen, /pl/kontakt, etc.
if (preg_match('/^(' . $langPattern . ')\/([a-z0-9_-]+)\/?$/', $path, $m)) {
    $slug = $m[2];
    if (isset($pageMap[$slug])) {
        require $root . $pageMap[$slug];
        exit;
    }
}

// German pretty URLs: /wohnungen, /kontakt etc.
if (isset($pageMap[$path]) || isset($pageMap[rtrim($path, '/')])) {
    $slug = rtrim($path, '/');
    require $root . $pageMap[$slug];
    exit;
}

// German wohnung-detail: /wohnung
if ($path === 'wohnung' || $path === 'wohnung/') {
    require $root . '/pages/wohnung-detail.html';
    exit;
}

// /pages/<name> or /pages/<name>.html (direct access — serve file if it exists)
if (preg_match('/^pages\/([a-z0-9_-]+)(\.html)?$/', $path, $m)) {
    $file = $root . '/pages/' . $m[1] . '.html';
    if (file_exists($file)) {
        require $file;
        exit;
    }
}

// 3. Nothing matched → serve custom 404 page
http_response_code(404);
require $root . '/pages/404.html';
