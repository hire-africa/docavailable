<?php

return [
    App\Providers\AppServiceProvider::class,
    App\Providers\NotificationServiceProvider::class,
    App\Providers\DatabaseServiceProvider::class,
    // App\Providers\CustomDatabaseServiceProvider::class, // Temporarily disabled to fix driver issue
    // App\Providers\BroadcastServiceProvider::class, // Temporarily disabled for deployment
];
