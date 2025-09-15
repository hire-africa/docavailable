<?php

/**
 * Neon Connection String Configuration Script
 * 
 * This script helps you configure your .env file with Neon connection details
 * from a connection string.
 */

echo "🚀 Neon Connection String Configuration\n";
echo "=====================================\n\n";

// Get connection string from user
echo "Please paste your Neon connection string:\n";
echo "Example: postgresql://username:password@host:port/database?sslmode=require\n\n";

$connectionString = trim(fgets(STDIN));

if (empty($connectionString)) {
    echo "❌ No connection string provided. Exiting.\n";
    exit(1);
}

// Parse the connection string
$parsed = parse_url($connectionString);

if (!$parsed) {
    echo "❌ Invalid connection string format.\n";
    exit(1);
}

// Extract components
$host = $parsed['host'] ?? '';
$port = $parsed['port'] ?? '5432';
$database = ltrim($parsed['path'] ?? '', '/');
$username = $parsed['user'] ?? '';
$password = $parsed['pass'] ?? '';

// Parse query parameters for SSL mode
$query = [];
if (isset($parsed['query'])) {
    parse_str($parsed['query'], $query);
}
$sslmode = $query['sslmode'] ?? 'require';

echo "\n📋 Parsed Connection Details:\n";
echo "Host: $host\n";
echo "Port: $port\n";
echo "Database: $database\n";
echo "Username: $username\n";
echo "SSL Mode: $sslmode\n";
echo "Password: " . str_repeat('*', strlen($password)) . "\n\n";

// Read current .env file
$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) {
    echo "❌ .env file not found. Please run this script from the backend directory.\n";
    exit(1);
}

$envContent = file_get_contents($envFile);

// Update database configuration
$updates = [
    'DB_CONNECTION' => 'pgsql',
    'DB_HOST' => $host,
    'DB_PORT' => $port,
    'DB_DATABASE' => $database,
    'DB_USERNAME' => $username,
    'DB_PASSWORD' => $password,
    'DB_CHARSET' => 'utf8',
    'DB_SSLMODE' => $sslmode
];

// Apply updates to .env content
foreach ($updates as $key => $value) {
    // Check if the key already exists
    if (preg_match("/^$key=/m", $envContent)) {
        // Update existing key
        $envContent = preg_replace("/^$key=.*$/m", "$key=$value", $envContent);
    } else {
        // Add new key after database configuration section
        $envContent = preg_replace(
            "/(# Database Configuration.*?\n)/s",
            "$1$key=$value\n",
            $envContent
        );
    }
}

// Write updated .env file
if (file_put_contents($envFile, $envContent)) {
    echo "✅ .env file updated successfully!\n\n";
    
    echo "📋 Next steps:\n";
    echo "1. Test the connection: php artisan tinker\n";
    echo "2. Run migrations: php artisan migrate\n";
    echo "3. Run the migration script: php scripts/migrate-to-neon.php\n";
    echo "4. Test your application: php artisan serve\n\n";
    
    echo "🎉 Neon configuration completed!\n";
} else {
    echo "❌ Failed to update .env file.\n";
    exit(1);
} 