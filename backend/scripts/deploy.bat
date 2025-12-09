@echo off
REM DocAvailable Laravel Backend Deployment Script for Windows
REM Usage: deploy.bat [environment]

setlocal enabledelayedexpansion

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=production
set APP_NAME=DocAvailable

echo 🚀 Deploying %APP_NAME% to %ENVIRONMENT%...

REM Check if we're in the right directory
if not exist "artisan" (
    echo ❌ Error: artisan file not found. Please run this script from the Laravel project root.
    exit /b 1
)

REM Set environment-specific variables
if "%ENVIRONMENT%"=="production" (
    set APP_ENV=production
    set APP_DEBUG=false
    set CACHE_STORE=database
    set QUEUE_CONNECTION=database
    set MAIL_MAILER=log
) else if "%ENVIRONMENT%"=="staging" (
    set APP_ENV=staging
    set APP_DEBUG=true
    set CACHE_STORE=database
    set QUEUE_CONNECTION=database
    set MAIL_MAILER=log
) else (
    echo ❌ Error: Invalid environment. Use 'production' or 'staging'
    exit /b 1
)

echo 📦 Installing dependencies...
composer install --no-dev --optimize-autoloader

echo 🔧 Setting up environment...
if not exist ".env" (
    echo ❌ Error: .env file not found. Please create one from env.example
    exit /b 1
)

echo 🗄️ Running database migrations...
php artisan migrate --force

echo 🔄 Clearing and caching configuration...
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo 📁 Setting up storage...
php artisan storage:link

echo ⚡ Optimizing for production...
php artisan optimize

echo 🔄 Restarting queue workers (if using queues)...
php artisan queue:restart

echo ✅ Deployment completed successfully!
echo 🌐 Your application should now be running at: 
php artisan tinker --execute="echo config('app.url');"

REM Optional: Health check
echo 🏥 Running health check...
for /f "tokens=*" %%i in ('php artisan tinker --execute="echo config(\"app.url\");"') do set APP_URL=%%i
curl -f "%APP_URL%/up" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Health check passed!
) else (
    echo ⚠️ Health check failed. Please check your application.
)

echo.
echo 🎉 Deployment completed!
pause 