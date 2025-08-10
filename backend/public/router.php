<?php
// Router script for PHP built-in server
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Debug: Check if index.php exists
$indexPath = __DIR__ . '/index.php';
if (!file_exists($indexPath)) {
    http_response_code(500);
    echo "Error: index.php not found at: " . $indexPath . "\n";
    echo "Current directory: " . __DIR__ . "\n";
    echo "Files in current directory: " . implode(', ', scandir(__DIR__)) . "\n";
    exit;
}

// Serve static files directly
if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
    return false;
}

// Route everything else to index.php
require_once $indexPath;
