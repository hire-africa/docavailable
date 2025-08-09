<?php

echo "🔍 Testing database connection with fixed endpoint parameter...\n\n";

try {
    // Note the endpoint parameter is now just the ID part
    $dsn = "pgsql:host=ep-hidden-brook-aemmopjb-pooler.c-2.us-east-2.aws.neon.tech;port=5432;dbname=neondb;sslmode=require;options=endpoint%3Dep-hidden-brook-aemmopjb";
    $username = "neondb_owner";
    $password = "npg_FjoWxz8OU4CQ";

    echo "Attempting connection with:\n";
    echo "DSN: " . $dsn . "\n";
    echo "Username: " . $username . "\n";
    echo "Password length: " . strlen($password) . " characters\n\n";

    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 30,
    ]);

    echo "✅ Connection successful!\n\n";

    // Test query
    echo "Testing query...\n";
    $result = $pdo->query("SELECT COUNT(*) as count FROM plans")->fetch();
    echo "Number of plans in database: " . $result['count'] . "\n";

    // Test subscription table
    echo "\nChecking subscription table structure...\n";
    $result = $pdo->query("
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'subscriptions'
        ORDER BY ordinal_position;
    ")->fetchAll();

    echo "\nSubscription table columns:\n";
    foreach ($result as $column) {
        echo sprintf(
            "- %s (%s%s%s)\n",
            $column['column_name'],
            $column['data_type'],
            $column['is_nullable'] === 'YES' ? ', nullable' : '',
            $column['column_default'] ? ', default: ' . $column['column_default'] : ''
        );
    }

} catch (PDOException $e) {
    echo "❌ Connection failed!\n";
    echo "Error: " . $e->getMessage() . "\n";
    
    // Additional error info
    if ($e->getCode() === '08006') {
        echo "\nPossible issues:\n";
        echo "1. Password contains special characters that need escaping\n";
        echo "2. SSL mode not properly configured\n";
        echo "3. Endpoint parameter format incorrect\n";
    }
}
