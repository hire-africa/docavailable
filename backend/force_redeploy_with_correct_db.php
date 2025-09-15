<?php

echo "🚀 Force Redeploy with Correct Database Configuration...\n";
echo "=====================================================\n\n";

// 1. Clean up any problematic environment files
echo "1️⃣ Cleaning up environment files...\n";
$filesToRemove = [
    '.env.backup',
    '.env.production.backup',
    '.env.local.backup'
];

foreach ($filesToRemove as $file) {
    if (file_exists($file)) {
        unlink($file);
        echo "   ✅ Removed {$file}\n";
    }
}

// 2. Ensure .env.production has correct database configuration
echo "\n2️⃣ Updating .env.production with correct database...\n";
$productionEnvPath = '.env.production';
$mainEnvPath = '.env';

if (file_exists($mainEnvPath)) {
    $mainEnvContent = file_get_contents($mainEnvPath);
    $productionEnvContent = file_get_contents($productionEnvPath);
    
    // Extract database configuration from main .env
    $dbConfig = [];
    $lines = explode("\n", $mainEnvContent);
    foreach ($lines as $line) {
        $line = trim($line);
        if (strpos($line, 'DB_') === 0 && !empty($line) && strpos($line, '#') !== 0) {
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $key = trim($parts[0]);
                $value = trim($parts[1]);
                $dbConfig[$key] = $value;
            }
        }
    }
    
    // Update production .env
    $newProductionContent = $productionEnvContent;
    foreach ($dbConfig as $key => $value) {
        $pattern = "/^{$key}=.*$/m";
        $replacement = "{$key}={$value}";
        
        if (preg_match($pattern, $newProductionContent)) {
            $newProductionContent = preg_replace($pattern, $replacement, $newProductionContent);
            echo "   ✅ Updated {$key}\n";
        } else {
            $newProductionContent .= "\n{$replacement}";
            echo "   ➕ Added {$key}\n";
        }
    }
    
    // Ensure APP_ENV is set to production
    $newProductionContent = preg_replace('/^APP_ENV=.*$/m', 'APP_ENV=production', $newProductionContent);
    echo "   ✅ Set APP_ENV=production\n";
    
    file_put_contents($productionEnvPath, $newProductionContent);
    echo "   ✅ Production .env updated\n";
}

// 3. Clear all Laravel caches
echo "\n3️⃣ Clearing Laravel caches...\n";
$commands = [
    'php artisan config:clear',
    'php artisan cache:clear',
    'php artisan route:clear',
    'php artisan view:clear',
    'php artisan config:cache',
    'php artisan route:cache'
];

foreach ($commands as $command) {
    echo "   Running: {$command}\n";
    $output = shell_exec($command . ' 2>&1');
    echo "   Output: " . trim($output) . "\n";
}

// 4. Test database connection
echo "\n4️⃣ Testing database connection...\n";
try {
    require_once 'vendor/autoload.php';
    $app = require_once 'bootstrap/app.php';
    $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
    
    $pdo = DB::connection()->getPdo();
    echo "   ✅ Database connection successful\n";
    echo "   📊 Database: " . DB::connection()->getDatabaseName() . "\n";
    echo "   🔗 Host: " . env('DB_HOST') . "\n";
    
    // Check if using correct database
    $currentHost = env('DB_HOST');
    if (strpos($currentHost, 'ep-royal-term') !== false) {
        echo "   ✅ Using correct database (ep-royal-term)\n";
    } else {
        echo "   ❌ Still using wrong database: {$currentHost}\n";
    }
    
} catch (Exception $e) {
    echo "   ❌ Database connection failed: " . $e->getMessage() . "\n";
}

// 5. Create deployment trigger file
echo "\n5️⃣ Creating deployment trigger...\n";
$deployTrigger = [
    'timestamp' => date('Y-m-d H:i:s'),
    'database_host' => env('DB_HOST'),
    'database_url' => env('DB_URL'),
    'app_env' => env('APP_ENV'),
    'message' => 'Force redeploy with correct database configuration'
];

file_put_contents('deploy_trigger.json', json_encode($deployTrigger, JSON_PRETTY_PRINT));
echo "   ✅ Created deploy_trigger.json\n";

echo "\n🚀 Force redeploy configuration completed!\n";
echo "💡 Next steps:\n";
echo "   1. Commit and push these changes to trigger a new deployment\n";
echo "   2. The deployment should now use the correct database\n";
echo "   3. Monitor the deployment logs to ensure it's using ep-royal-term\n";
echo "\n🔧 If the issue persists, check the Render deployment logs for environment variable loading.\n";
