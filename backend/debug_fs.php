<?php

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Config;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Checking filesystem configuration...\n";
echo "Default Disk: " . Config::get('filesystems.default') . "\n";

echo "\nChecking 'spaces' disk URL generation:\n";
try {
    $url = Storage::disk('spaces')->url('chat_voice_messages/test.m4a');
    echo "'spaces' URL: " . $url . "\n";
} catch (\Exception $e) {
    echo "Error getting 'spaces' URL: " . $e->getMessage() . "\n";
}

echo "\nChecking 'public' disk URL generation:\n";
try {
    $url = Storage::disk('public')->url('chat_voice_messages/test.m4a');
    echo "'public' URL: " . $url . "\n";
} catch (\Exception $e) {
    echo "Error getting 'public' URL: " . $e->getMessage() . "\n";
}

echo "\nChecking env variables:\n";
echo "DO_SPACES_BUCKET: " . env('DO_SPACES_BUCKET') . "\n";
echo "DO_SPACES_REGION: " . env('DO_SPACES_REGION') . "\n";
echo "APP_URL: " . env('APP_URL') . "\n";
