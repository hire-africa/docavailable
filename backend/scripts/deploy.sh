#!/bin/bash

# DocAvailable Laravel Backend Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
APP_NAME="DocAvailable"

echo "🚀 Deploying $APP_NAME to $ENVIRONMENT..."

# Check if we're in the right directory
if [ ! -f "artisan" ]; then
    echo "❌ Error: artisan file not found. Please run this script from the Laravel project root."
    exit 1
fi

# Set environment-specific variables
if [ "$ENVIRONMENT" = "production" ]; then
    export APP_ENV=production
    export APP_DEBUG=false
    export CACHE_STORE=redis
    export QUEUE_CONNECTION=redis
    export MAIL_MAILER=smtp
elif [ "$ENVIRONMENT" = "staging" ]; then
    export APP_ENV=staging
    export APP_DEBUG=true
    export CACHE_STORE=database
    export QUEUE_CONNECTION=database
    export MAIL_MAILER=log
else
    echo "❌ Error: Invalid environment. Use 'production' or 'staging'"
    exit 1
fi

echo "📦 Installing dependencies..."
composer install --no-dev --optimize-autoloader

echo "🔧 Setting up environment..."
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create one from .env.example"
    exit 1
fi

echo "🗄️ Running database migrations..."
php artisan migrate --force

echo "🔄 Clearing and caching configuration..."
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "📁 Setting up storage..."
php artisan storage:link

echo "🔐 Setting proper permissions..."
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

echo "⚡ Optimizing for production..."
php artisan optimize

echo "🔄 Restarting queue workers (if using queues)..."
php artisan queue:restart

echo "✅ Deployment completed successfully!"
echo "🌐 Your application should now be running at: $(php artisan tinker --execute='echo config(\"app.url\");')"

# Optional: Health check
echo "🏥 Running health check..."
if curl -f "$(php artisan tinker --execute='echo config("app.url");')/up" > /dev/null 2>&1; then
    echo "✅ Health check passed!"
else
    echo "⚠️ Health check failed. Please check your application."
fi 