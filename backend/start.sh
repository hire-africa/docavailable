#!/bin/bash

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Clear cached configurations to ensure environment variables are used
echo "Clearing cached configurations..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Refresh database connection and schema
echo "Refreshing database connection..."
php artisan db:show --force || echo "Database show failed"

# Run migrations
echo "Running database migrations..."
php artisan migrate --force

# Check database schema
echo "Checking database schema..."
php artisan tinker --execute="echo 'Users table columns: '; print_r(Schema::getColumnListing('users'));" || echo "Schema check failed"

# Seed database (will only create users if they don't exist)
echo "Seeding database..."
php artisan db:seed --force

# Start the application
echo "Starting Laravel application..."
php artisan serve --host=0.0.0.0 --port=8000 