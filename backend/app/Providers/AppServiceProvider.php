<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Log;
use App\Broadcasting\FcmChannel;
use App\Services\TextSessionMessageService;
use App\Models\CallSession;
use App\Observers\CallSessionObserver;

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
        $this->app->singleton(\Intervention\Image\ImageManager::class, function ($app) {
            return new \Intervention\Image\ImageManager(new \Intervention\Image\Drivers\Gd\Driver());
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')."/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });

        // Register FCM channel for push notifications
        Notification::extend('fcm', function ($app) {
            return new FcmChannel();
        });

        // Ensure Firebase service account file exists (for FCM v1)
        try {
            $serviceAccountPath = storage_path('app/firebase-service-account.json');
            if (!file_exists($serviceAccountPath)) {
                $json = env('FIREBASE_SERVICE_ACCOUNT_JSON');
                if (!empty($json)) {
                    // Create directory if missing
                    $dir = dirname($serviceAccountPath);
                    if (!is_dir($dir)) {
                        @mkdir($dir, 0755, true);
                    }
                    // Write file
                    file_put_contents($serviceAccountPath, $json);
                    Log::info('FCM: Wrote service account JSON to storage/app/firebase-service-account.json');
                } else {
                    Log::warning('FCM: Service account file missing and FIREBASE_SERVICE_ACCOUNT_JSON not provided. Push will fail.');
                }
            }
        } catch (\Exception $e) {
            Log::error('FCM: Failed ensuring service account file: '.$e->getMessage());
        }

        // Register Intervention Image facade (v3)
        $this->app->alias(\Intervention\Image\ImageManager::class, 'Image');

        // Observe CallSession model to auto-send incoming call notifications on creation
        try {
            CallSession::observe(CallSessionObserver::class);
            Log::info('AppServiceProvider: CallSessionObserver registered');
        } catch (\Throwable $t) {
            Log::error('AppServiceProvider: Failed to register CallSessionObserver: '.$t->getMessage());
        }
    }
}
