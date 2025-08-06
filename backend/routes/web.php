<?php

use Illuminate\Support\Facades\Route;
use App\Models\Plan;
use App\Models\User;

Route::get('/', function () {
    return ['Laravel' => app()->version()]; 
});

require __DIR__.'/auth.php';
