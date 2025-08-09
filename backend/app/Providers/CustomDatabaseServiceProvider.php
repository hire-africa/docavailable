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
        try {
            // Get database configuration
        $dbUrl = env('DB_URL');

        if ($dbUrl) {
                // If DB_URL is provided, use it directly
                $dsn = preg_replace('/^postgres:/', 'pgsql:', $dbUrl);
                
                // Parse URL for username/password
                $parsed = parse_url($dbUrl);
                $username = $parsed['user'] ?? env('DB_USERNAME');
                $password = $parsed['pass'] ?? env('DB_PASSWORD');
                
                \Log::info('Using database URL connection');
            } else {
                // Otherwise build connection string from individual parts
                $host = env('DB_HOST', '127.0.0.1');
                $port = env('DB_PORT', '5432');
                $database = env('DB_DATABASE', 'laravel');
                $username = env('DB_USERNAME', 'root');
                $password = env('DB_PASSWORD', '');
                
                $dsn = "pgsql:host={$host};port={$port};dbname={$database}";
                if (env('DB_SSLMODE')) {
                    $dsn .= ";sslmode=" . env('DB_SSLMODE');
                }
                
                \Log::info('Using individual connection parameters');
            }

            \Log::info('Attempting database connection', [
                'dsn' => preg_replace('/password=[^;]+/', 'password=***', $dsn)
            ]);

            // Create PDO instance with minimal options
            $pdo = new PDO($dsn, $username, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
            
            // Set search path
            $pdo->exec("SET search_path TO public");
            
            \Log::info('Database connection successful');

            // Create a custom connection instance
            return new PostgresConnection($pdo, $database ?? '', '', [
            'name' => 'pgsql_simple',
            'driver' => 'pgsql',
                'database' => $database ?? ''
            ]);

        } catch (\PDOException $e) {
            \Log::error('Database connection failed', [
                'error' => $e->getMessage(),
                'code' => $e->getCode()
            ]);
            throw $e;
        }
    }
} 