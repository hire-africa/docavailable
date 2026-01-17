#!/bin/bash
set -e

echo "🔗 Creating storage symlink..."
php artisan storage:link

echo "🗄️ Running migrations..."
if [ "${SKIP_MIGRATIONS:-0}" = "1" ]; then
  echo "⏭️  Skipping migrations (SKIP_MIGRATIONS=1)"
else
  php artisan migrate --force
fi

echo "⚡ Optimizing..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "🚀 Starting web server..."
heroku-php-apache2 public/
