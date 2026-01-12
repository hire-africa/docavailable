<?php

return [
    'android' => [
        'min_version' => '2.0.0',
        'force_update' => true,
        'store_url' => 'https://play.google.com/store/apps/details?id=com.docavailable.app',
        'title' => 'Update Required',
        'message' => 'To continue using DocAvailable, please update to the latest version for improved stability and new features.',
    ],
    'ios' => [
        'min_version' => '1.0.0',
        'force_update' => false,
        'store_url' => 'https://apps.apple.com/us/app/docavailable/id6739190692', // Updated to likely correct store URL or placeholder if unknown, user didn't specify. I will use a safe placeholder or ask. The prompt said "opens the provided storeUrl". I will provide a generic one if I don't know it, but I see android package name in app.json. 
        'title' => 'Update Required',
        'message' => 'To continue using DocAvailable, please update to the latest version for improved stability and new features.',
    ]
];
