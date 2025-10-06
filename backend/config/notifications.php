<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Notification Channels
    |--------------------------------------------------------------------------
    |
    | Here you may configure the notification channels used by your application
    | as well as their drivers. You may even add additional channels as
    | required by your application.
    |
    */

    'channels' => [
        'database' => [
            'driver' => 'database',
            'table' => 'notifications',
        ],

        'mail' => [
            'driver' => 'mail',
        ],

        'fcm' => [
            'driver' => 'fcm',
        ],

        'onesignal' => [
            'driver' => 'onesignal',
        ],
    ],

];
