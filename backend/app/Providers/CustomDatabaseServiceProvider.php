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
        $host = env('DB_HOST', 'ep-hidden-brook-aemmopjb-pooler.c-2.us-east-2.aws.neon.tech');
        $port = env('DB_PORT', '5432');
        $database = env('DB_DATABASE', 'neondb');
        $username = env('DB_USERNAME', 'neondb_owner');
        $password = env('DB_PASSWORD', '');
        $endpoint = 'ep-hidden-brook-aemmopjb-pooler'; // Extract from host

        // Extract endpoint from host if not explicitly set
        if (preg_match('/^(ep-[a-zA-Z0-9-]+)/', $host, $matches)) {
            $endpoint = $matches[1];
        }

        $dsn = "pgsql:host={$host};port={$port};dbname={$database};sslmode=require;options=endpoint%3D{$endpoint}";
        
        // Log connection attempt (without sensitive info)
        \Log::info('Attempting database connection', [
            'host' => $host,
            'database' => $database,
            'endpoint' => $endpoint,
            'dsn' => preg_replace('/password=[^;]+/', 'password=***', $dsn)
        ]);

        try {
            $pdo = new PDO(
                $dsn,
                $username,
                $password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_PERSISTENT => filter_var(env('DB_PERSISTENT', false), FILTER_VALIDATE_BOOL),
                    PDO::ATTR_TIMEOUT => (int) env('DB_SOCKET_TIMEOUT', 30),
                ]
            );

            // Post-connect session config
            $pdo->exec("SET search_path TO public");
            
            \Log::info('Database connection successful');

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
        } catch (\PDOException $e) {
            \Log::error('Database connection failed', [
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
                'host' => $host,
                'database' => $database,
                'endpoint' => $endpoint
            ]);
            throw $e;
        }
    }
}