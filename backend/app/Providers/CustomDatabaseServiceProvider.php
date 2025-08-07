<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Database\Connectors\PostgresConnector;
use Illuminate\Database\Connection;
use Illuminate\Database\Connectors\ConnectionFactory;
use Illuminate\Database\PostgresConnection;
use Illuminate\Database\DatabaseManager;
use PDO;

class CustomDatabaseServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Override the entire database manager to use our custom connection
        $this->app->singleton('db', function ($app) {
            $manager = new DatabaseManager($app, $app['db.factory']);
            
            // Replace the pgsql_simple connection with our custom one
            $manager->extend('pgsql_simple', function ($config, $name) {
                return $this->createCustomConnection();
            });
            
            return $manager;
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Additional boot logic if needed
    }

    /**
     * Create a custom database connection that bypasses Laravel 12 connector bug
     */
    public function createCustomConnection()
    {
        // Use the exact DSN from DB_URL
        $dbUrl = env('DB_URL');
        
        if ($dbUrl) {
            // Parse the URL to get connection details
            $urlParts = parse_url($dbUrl);
            
            // Build DSN without credentials
            $dsn = 'pgsql:';
            $dsn .= 'host=' . $urlParts['host'] . ';';
            $dsn .= 'port=' . ($urlParts['port'] ?? '5432') . ';';
            $dsn .= 'dbname=' . ltrim($urlParts['path'], '/') . ';';
            
            // Add query parameters if they exist
            if (isset($urlParts['query'])) {
                parse_str($urlParts['query'], $queryParams);
                foreach ($queryParams as $key => $value) {
                    $dsn .= $key . '=' . $value . ';';
                }
            }
            
            $username = $urlParts['user'];
            $password = $urlParts['pass'];
            $database = ltrim($urlParts['path'], '/');
        } else {
            // Fallback to building DSN manually
            $config = [
                'driver' => 'pgsql',
                'host' => env('DB_HOST', 'ep-hidden-brook-aemmopjb-pooler.c-2.us-east-2.aws.neon.tech'),
                'port' => env('DB_PORT', '5432'),
                'database' => env('DB_DATABASE', 'neondb'),
                'username' => env('DB_USERNAME', 'neondb_owner'),
                'password' => env('DB_PASSWORD', 'npg_FjoWxz8OU4CQ'),
                'charset' => 'utf8',
                'prefix' => '',
                'prefix_indexes' => true,
                'search_path' => 'public',
                'sslmode' => 'require',
                'options' => [
                    'endpoint' => 'ep-hidden-brook-aemmopjb',
                ],
            ];
            
            $dsn = $this->buildPostgresDSN($config);
            $username = $config['username'];
            $password = $config['password'];
            $database = $config['database'];
        }
        
        // Create PDO connection manually with SSL options
        $pdo = new PDO(
            $dsn,
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => false,
                // Add SSL context for Neon compatibility
                PDO::ATTR_TIMEOUT => 30,
            ]
        );

        // Create a custom connection instance that extends PostgresConnection
        $connection = new class($pdo, $database, '', [
            'name' => 'pgsql_simple',
            'driver' => 'pgsql',
            'database' => $database,
        ]) extends PostgresConnection {
            public function __construct($pdo, $database, $tablePrefix, $config)
            {
                parent::__construct($pdo, $database, $tablePrefix, $config);
            }
            
            // Override methods that might be affected by Laravel 12 bug
            public function getDriverName()
            {
                return 'pgsql';
            }
        };

        return $connection;
    }

    /**
     * Build PostgreSQL DSN string manually
     */
    protected function buildPostgresDSN(array $config): string
    {
        $dsn = 'pgsql:';
        
        $dsn .= 'host=' . $config['host'] . ';';
        $dsn .= 'port=' . $config['port'] . ';';
        $dsn .= 'dbname=' . $config['database'] . ';';
        $dsn .= 'sslmode=' . $config['sslmode'] . ';';
        
        // Add endpoint if specified - use the exact format Neon requires
        if (isset($config['options']['endpoint'])) {
            $dsn .= 'options=endpoint%3D' . $config['options']['endpoint'];
        }

        return $dsn;
    }
} 