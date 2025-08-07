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
        $dbUrl = env('DB_URL');

        $dsn = 'pgsql:';
        $username = null;
        $password = null;
        $database = null;

        if ($dbUrl) {
            $urlParts = parse_url($dbUrl);

            $host = $urlParts['host'] ?? env('DB_HOST', '127.0.0.1');
            $port = $urlParts['port'] ?? env('DB_PORT', '5432');
            $database = ltrim($urlParts['path'] ?? '', '/');
            $username = $urlParts['user'] ?? env('DB_USERNAME');
            $password = $urlParts['pass'] ?? env('DB_PASSWORD');

            $dsn .= "host={$host};port={$port};dbname={$database};";

            // Parse query params from DB_URL and map to DSN
            $queryParams = [];
            if (!empty($urlParts['query'])) {
                parse_str($urlParts['query'], $queryParams);
            }

            // Ensure sslmode=require if not provided
            if (empty($queryParams['sslmode'])) {
                $dsn .= 'sslmode=require;';
            }

            // Add connect_timeout (seconds)
            $connectTimeout = env('DB_CONNECT_TIMEOUT', '10');
            $dsn .= "connect_timeout={$connectTimeout};";

            // Preserve options (e.g., Neon endpoint)
            if (!empty($queryParams['options'])) {
                $dsn .= 'options=' . $queryParams['options'] . ';';
            }
        } else {
            $host = env('DB_HOST', 'ep-hidden-brook-aemmopjb-pooler.c-2.us-east-2.aws.neon.tech');
            $port = env('DB_PORT', '5432');
            $database = env('DB_DATABASE', 'neondb');
            $username = env('DB_USERNAME', 'neondb_owner');
            $password = env('DB_PASSWORD', '');
            $endpoint = 'endpoint%3Dep-hidden-brook-aemmopjb';

            $dsn .= "host={$host};port={$port};dbname={$database};sslmode=require;";
            $dsn .= 'connect_timeout=' . env('DB_CONNECT_TIMEOUT', '10') . ';';
            $dsn .= "options={$endpoint};";
        }

        $persistent = filter_var(env('DB_PERSISTENT', false), FILTER_VALIDATE_BOOL);

        $pdo = new PDO(
            $dsn,
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => $persistent,
                PDO::ATTR_TIMEOUT => (int) env('DB_SOCKET_TIMEOUT', 30),
            ]
        );

        // Post-connect session config
        try {
            $pdo->exec("SET search_path TO public");
        } catch (\Throwable $t) {
            // ignore
        }

        // Optional: disable server-side prepares to avoid certain driver bugs
        if (defined('PDO::PGSQL_ATTR_DISABLE_PREPARES')) {
            try {
                $pdo->setAttribute(PDO::PGSQL_ATTR_DISABLE_PREPARES, true);
            } catch (\Throwable $t) {
                // ignore
            }
        }

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