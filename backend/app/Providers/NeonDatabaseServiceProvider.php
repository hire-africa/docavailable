<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Database\DatabaseManager;
use App\Connectors\NeonPostgresConnector;

class NeonDatabaseServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton('db', function ($app) {
            $manager = new DatabaseManager($app, $app['db.factory']);
            
            // Register the custom connector for pgsql_simple
            $manager->extend('pgsql_simple', function ($config, $name) {
                $connector = new NeonPostgresConnector();
                $pdo = $connector->connect($config);
                
                return new \Illuminate\Database\PostgresConnection(
                    $pdo,
                    $config['database'],
                    $config['prefix'] ?? '',
                    $config
                );
            });
            
            return $manager;
        });
    }
}
