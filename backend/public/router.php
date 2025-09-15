<?php
// Router script for PHP built-in server
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Debug: Log the request
error_log("Router.php called with URI: " . $uri);

// Debug: Check if index.php exists
$indexPath = __DIR__ . '/index.php';
if (!file_exists($indexPath)) {
    http_response_code(500);
    echo "Error: index.php not found at: " . $indexPath . "\n";
    echo "Current directory: " . __DIR__ . "\n";
    echo "Files in current directory: " . implode(', ', scandir(__DIR__)) . "\n";
    exit;
}

// Only serve specific static file types directly
$allowedStaticExtensions = ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot'];
$extension = pathinfo($uri, PATHINFO_EXTENSION);

if ($uri !== '/' && file_exists(__DIR__ . $uri) && in_array(strtolower($extension), $allowedStaticExtensions)) {
    return false;
}

// Route everything else to index.php (including all PHP files and API routes)
error_log("Routing to index.php");
require_once $indexPath;
