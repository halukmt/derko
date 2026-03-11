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

// Language + wohnung-detail with slug: /en/wohnung/w01-derko-apart
if (preg_match('/^(' . $langPattern . ')\/wohnung\/([a-z0-9-]+)\/?$/', $path)) {
    require $root . '/pages/wohnung-detail.html';
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

// German wohnung-detail with slug: /wohnung/w01-derko-apart
if (preg_match('/^wohnung\/([a-z0-9-]+)\/?$/', $path)) {
    require $root . '/pages/wohnung-detail.html';
    exit;
}

// German wohnung-detail: /wohnung
if ($path === 'wohnung' || $path === 'wohnung/') {
    // 301 redirect old ?id= format to clean slug
    $slugMap = [
        'w01_derko_apart'   => 'w01-derko-apart',
        'w02_derko_apart_2' => 'w02-derko-apart-2',
        'w03_exklusiv'      => 'w03-exklusiv',
        'w04_exklusiv_2'    => 'w04-exklusiv-2',
        'w05_dus_1'         => 'w05-dus-1',
        'w06_dus_2'         => 'w06-dus-2',
        'w07_dus_3'         => 'w07-dus-3',
    ];
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if ($id !== '' && isset($slugMap[$id])) {
        header('Location: /wohnung/' . $slugMap[$id], true, 301);
        exit;
    }
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
