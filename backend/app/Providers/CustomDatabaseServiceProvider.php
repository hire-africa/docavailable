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
        // Ensure the pgsql_simple connection is available in the config first
        $this->ensurePgsqlSimpleConnection();
        
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
     * Ensure the pgsql_simple connection is available in the database config
     */
    protected function ensurePgsqlSimpleConnection()
    {
        $config = config('database.connections');
        
        if (!isset($config['pgsql_simple'])) {
            // Add the pgsql_simple connection to the config
            config([
                'database.connections.pgsql_simple' => [
                    'driver' => 'pgsql',
                    'host' => env('DB_HOST', '127.0.0.1'),
                    'port' => env('DB_PORT', '5432'),
                    'database' => env('DB_DATABASE', 'laravel'),
                    'username' => env('DB_USERNAME', 'root'),
                    'password' => env('DB_PASSWORD', ''),
                    'charset' => env('DB_CHARSET', 'utf8'),
                    'prefix' => '',
                    'prefix_indexes' => true,
                    'search_path' => 'public',
                    'sslmode' => env('DB_SSLMODE', 'require'),
                    'options' => [],
                ]
            ]);
        }
    }

    /**
     * Create a custom database connection that bypasses Laravel 12 connector bug
     */
    public function createCustomConnection()
    {
        try {
            // Get database configuration - try DB_URL first, then individual variables
            $dbUrl = env('DB_URL');

            if (!$dbUrl) {
                // Fallback to individual environment variables for Render deployment
                $host = env('DB_HOST');
                $port = env('DB_PORT', 5432);
                $database = env('DB_DATABASE');
                $username = env('DB_USERNAME');
                $password = env('DB_PASSWORD');
                $sslmode = env('DB_SSLMODE', 'require');
                
                if (!$host || !$database || !$username || !$password) {
                    throw new \Exception('Database configuration incomplete. Need DB_URL or individual DB_* variables.');
                }
                
                // Build DSN from individual variables
                $dsn = "pgsql:host={$host};port={$port};dbname={$database};sslmode={$sslmode}";
                
                \Log::info('Using individual database variables connection');
            } else {
                // Convert postgres:// to pgsql:// for PDO
                $dsn = preg_replace('/^postgres:/', 'pgsql:', $dbUrl);
                
                // Parse URL for username/password
                $parsed = parse_url($dbUrl);
                $username = $parsed['user'] ?? env('DB_USERNAME');
                $password = $parsed['pass'] ?? env('DB_PASSWORD');
                
                \Log::info('Using database URL connection');
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