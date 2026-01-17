#!/usr/bin/env bash
set -euo pipefail
set +x

echo "🚀 Starting DocAvailable backend..."

if [ ! -f "artisan" ]; then
  echo "❌ artisan not found. Run from backend directory."
  exit 1
fi

echo "🔧 Ensuring APP_KEY..."
if [ -z "${APP_KEY:-}" ] || [ "${APP_KEY}" = "" ]; then
  php artisan key:generate --force || true
fi

echo "📦 Installing optimized autoloader (if vendor missing)..."
if [ ! -d "vendor" ]; then
  composer install --no-dev --optimize-autoloader --no-interaction
fi

echo "🧹 Clearing caches..."
php artisan config:clear || true
php artisan cache:clear || true
php artisan route:clear || true
php artisan view:clear || true

echo "🔗 Ensuring storage symlink..."
php artisan storage:link || true

echo "🗄️ Running migrations..."
if [ "${SKIP_MIGRATIONS:-0}" = "1" ]; then
  echo "⏭️  Skipping migrations (SKIP_MIGRATIONS=1)"
else
  php artisan migrate --force || true
fi

echo "⚡ Caching configuration and routes..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true
php artisan optimize || true

echo "🌐 Starting HTTP server..."

# Determine port (prefer platform-provided $PORT, else default 8000)
PORT_TO_USE=${PORT:-8000}
echo "➡️  Binding to PORT=$PORT_TO_USE"

if [ ! -d "public" ]; then
  echo "❌ public directory not found. Exiting."
  ls -la
  exit 1
fi

echo "🧪 PHP version: $(php -v | head -n 1)"
echo "📁 PWD: $(pwd)"
echo "📁 Public listing:"; ls -la public || true

echo "🧹 Clearing Laravel caches..."
php artisan config:clear || true
php artisan cache:clear || true
php artisan route:clear || true
php artisan view:clear || true

echo "🔎 Active DB (before cache):"
php artisan tinker --execute='echo config("database.default")."\n";' 2>/dev/null || true
php artisan tinker --execute='$c=config("database.default"); echo (config("database.connections.$c.host")??"(no host)")."\n";' 2>/dev/null || true

echo "🗄️ Running migrations (if any)..."
if [ "${SKIP_MIGRATIONS:-0}" = "1" ]; then
  echo "⏭️  Skipping migrations (SKIP_MIGRATIONS=1)"
else
  php artisan migrate --force || true
fi

echo "⚡ Caching config..."
php artisan config:cache || true

echo "▶️  Exec: php -S 0.0.0.0:$PORT_TO_USE -t public"
exec php -S 0.0.0.0:${PORT_TO_USE} -t public

#!/bin/bash

echo "🚀 Starting DocAvailable backend..."

# Function to test PostgreSQL connection
test_db_connection() {
    php artisan tinker --execute="try { DB::connection()->getPdo(); echo 'true'; } catch (\Exception \$e) { echo 'false'; }"
}

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL connection..."
RETRIES=30
COUNT=0
while [ $COUNT -lt $RETRIES ]; do
    if [ "$(test_db_connection)" = "true" ]; then
        echo "✅ PostgreSQL connection established!"
        break
    fi
    COUNT=$((COUNT+1))
    echo "⏳ Attempt $COUNT/$RETRIES: PostgreSQL not ready yet..."
    sleep 2
done

if [ $COUNT -eq $RETRIES ]; then
    echo "❌ Failed to connect to PostgreSQL after $RETRIES attempts"
    exit 1
fi

# Show effective database configuration
echo "\n🔎 Effective database configuration:"
echo -n " - Default connection: "
php artisan tinker --execute='echo config("database.default");'
echo -n "\n - Database name: "
php artisan tinker --execute='echo DB::connection()->getDatabaseName();'
echo "\n"

# Clear any cached config
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Run migrations
echo "🔄 Running database migrations..."
php artisan migrate --force

# Run seeders if needed
echo "🌱 Running database seeders..."
php artisan db:seed --force

# Start Laravel server
echo "🚀 Starting Laravel server..."
php artisan serve --host=0.0.0.0 --port=8000