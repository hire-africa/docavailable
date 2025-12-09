<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Storage;

echo "🚀 Testing DigitalOcean Spaces Connection...\n";
echo "==========================================\n\n";

try {
    // Test 1: Check if spaces disk is configured
    echo "1. Checking spaces disk configuration...\n";
    $spacesConfig = config('filesystems.disks.spaces');
    
    if (empty($spacesConfig['key']) || empty($spacesConfig['secret'])) {
        echo "❌ DigitalOcean Spaces credentials not configured in .env file\n";
        echo "   Please add the following to your .env file:\n";
        echo "   DO_SPACES_KEY=DO00EEETN4R4GFQDFGMY\n";
        echo "   DO_SPACES_SECRET=9AXkzd+/RoEL3UgQbQNtUp/gPmcDdvA8E5KhcN2ZLTs\n";
        echo "   DO_SPACES_BUCKET=your-bucket-name\n";
        echo "   DO_SPACES_ENDPOINT=https://fra1.digitaloceanspaces.com\n\n";
        exit(1);
    }
    
    echo "✅ Spaces disk configuration found\n";
    echo "   Key: " . substr($spacesConfig['key'], 0, 10) . "...\n";
    echo "   Region: " . $spacesConfig['region'] . "\n";
    echo "   Bucket: " . $spacesConfig['bucket'] . "\n";
    echo "   Endpoint: " . $spacesConfig['endpoint'] . "\n\n";
    
    // Test 2: Test connection
    echo "2. Testing connection to DigitalOcean Spaces...\n";
    $spaces = Storage::disk('spaces');
    
    // Try to list files (this will test the connection)
    $files = $spaces->files('profile_pictures');
    echo "✅ Successfully connected to DigitalOcean Spaces!\n";
    echo "   Found " . count($files) . " existing profile pictures\n\n";
    
    // Test 3: Test file upload (create a test file)
    echo "3. Testing file upload...\n";
    $testContent = "This is a test file for DigitalOcean Spaces connection.";
    $testPath = 'test-connection-' . time() . '.txt';
    
    $spaces->put($testPath, $testContent);
    echo "✅ Test file uploaded successfully: {$testPath}\n";
    
    // Test 4: Test file retrieval
    echo "4. Testing file retrieval...\n";
    $retrievedContent = $spaces->get($testPath);
    
    if ($retrievedContent === $testContent) {
        echo "✅ File retrieved successfully\n";
    } else {
        echo "❌ File content mismatch\n";
    }
    
    // Test 5: Test public URL generation
    echo "5. Testing public URL generation...\n";
    $publicUrl = $spaces->url($testPath);
    echo "✅ Public URL generated: {$publicUrl}\n";
    
    // Test 6: Clean up test file
    echo "6. Cleaning up test file...\n";
    $spaces->delete($testPath);
    echo "✅ Test file deleted\n\n";
    
    echo "🎉 All tests passed! DigitalOcean Spaces is ready to use.\n";
    echo "\nNext steps:\n";
    echo "1. Update your .env file with the correct bucket name\n";
    echo "2. Set FILESYSTEM_DISK=spaces in your .env file\n";
    echo "3. Deploy your backend with the new configuration\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "\nTroubleshooting:\n";
    echo "1. Check your DigitalOcean Spaces credentials\n";
    echo "2. Verify the bucket name exists\n";
    echo "3. Ensure the bucket is public\n";
    echo "4. Check your network connection\n";
}
