<?php

namespace App\Connectors;

use Illuminate\Database\Connectors\PostgresConnector;
use PDO;

class NeonPostgresConnector extends PostgresConnector
{
    /**
     * Create a new PDO connection instance.
     *
     * @param  string  $dsn
     * @param  string  $username
     * @param  string  $password
     * @param  array  $options
     * @return \PDO
     */
    protected function createPdoConnection($dsn, $username, $password, $options)
    {
        // For Neon, we need to add the endpoint to the DSN
        // We'll need to get the config from the parent method
        return parent::createPdoConnection($dsn, $username, $password, $options);
    }
    
    /**
     * Get the DSN for a host / port / database connection.
     *
     * @param  array  $config
     * @return string
     */
    protected function getDsn(array $config)
    {
        $dsn = parent::getDsn($config);
        
        // Add endpoint for Neon if present
        if (isset($config['options']['endpoint'])) {
            $dsn .= ";options=endpoint=" . $config['options']['endpoint'];
        }
        
        return $dsn;
    }
}
