<?php

echo "🚀 Quick DigitalOcean Spaces Test\n";
echo "================================\n\n";

// Test if we can load the environment
if (file_exists('.env')) {
    echo "✅ .env file found\n";
} else {
    echo "❌ .env file not found\n";
    echo "Please create a .env file with your DigitalOcean Spaces credentials\n";
    exit(1);
}

// Load environment variables
$lines = file('.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
        list($key, $value) = explode('=', $line, 2);
        $value = trim($value, '"\'');
        putenv("$key=$value");
    }
}

echo "Environment variables loaded\n\n";

// Check required variables
$required = ['DO_SPACES_KEY', 'DO_SPACES_SECRET', 'DO_SPACES_BUCKET', 'DO_SPACES_ENDPOINT'];
$missing = [];

foreach ($required as $var) {
    if (getenv($var)) {
        echo "✅ $var: " . substr(getenv($var), 0, 10) . "...\n";
    } else {
        echo "❌ $var: Not set\n";
        $missing[] = $var;
    }
}

if (!empty($missing)) {
    echo "\n❌ Missing required environment variables:\n";
    foreach ($missing as $var) {
        echo "   - $var\n";
    }
    echo "\nPlease add these to your .env file:\n";
    echo "DO_SPACES_KEY=DO00EEETN4R4GFQDFGMY\n";
    echo "DO_SPACES_SECRET=9AXkzd+/RoEL3UgQbQNtUp/gPmcDdvA8E5KhcN2ZLTs\n";
    echo "DO_SPACES_BUCKET=your-bucket-name\n";
    echo "DO_SPACES_ENDPOINT=https://fra1.digitaloceanspaces.com\n";
    exit(1);
}

echo "\n🎉 All environment variables are set!\n";
echo "Next step: Update your .env file with the correct bucket name and test the full connection.\n";
