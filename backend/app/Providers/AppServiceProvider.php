<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Notification;
use App\Broadcasting\OneSignalChannel;
use App\Services\TextSessionMessageService;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register TextSessionMessageService
        $this->app->singleton(TextSessionMessageService::class, function ($app) {
            return new TextSessionMessageService();
        });

        // Register Intervention Image service provider (v3)
        $this->app->register(\Intervention\Image\Laravel\ServiceProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')."/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });

        // Register OneSignal channel for secure medical notifications
        Notification::extend('onesignal', function ($app) {
            return new OneSignalChannel();
        });

        // Register Intervention Image facade (v3)
        $this->app->alias('Intervention\Image\ImageManager', 'Image');
    }
}
