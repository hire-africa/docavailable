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