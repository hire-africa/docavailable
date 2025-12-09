#!/bin/bash
set -e

echo "🔗 Creating storage symlink..."
php artisan storage:link

echo "🗄️ Running migrations..."
php artisan migrate --force

echo "⚡ Optimizing..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "🚀 Starting web server..."
heroku-php-apache2 public/
