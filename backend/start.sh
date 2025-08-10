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

# DO NOT cache configurations - let Laravel read environment variables at runtime
echo "Skipping config caching to allow runtime environment variable reading..."

# Test database connection before proceeding
echo "Testing database connection..."
php artisan tinker --execute="
try {
    echo 'Testing DB connection...';
    echo 'DB_CONNECTION: ' . config('database.default');
    echo 'DB_HOST: ' . config('database.connections.pgsql_simple.host');
    echo 'DB_URL: ' . (env('DB_URL') ? 'SET' : 'NOT SET');
    
    // Test the actual connection
    DB::connection()->getPdo();
    echo 'Database connection successful!';
} catch (Exception \$e) {
    echo 'Database connection failed: ' . \$e->getMessage();
    exit(1);
}
" || {
    echo "Database connection test failed!"
    exit 1
}

# Refresh database connection and schema
echo "Refreshing database connection..."
php artisan db:show --force || echo "Database show failed"

# Check current database configuration
echo "Checking database configuration..."
php artisan tinker --execute="echo 'DB_CONNECTION: ' . config('database.default'); echo 'DB_HOST: ' . config('database.connections.pgsql_simple.host');" || echo "Config check failed"

# Run migrations
echo "Running database migrations..."
php artisan migrate --force

# Check database schema
echo "Checking database schema..."
php artisan tinker --execute="echo 'Users table columns: '; print_r(Schema::getColumnListing('users'));" || echo "Schema check failed"

# Manually add status column if it doesn't exist
echo "Manually adding status column..."
php artisan tinker --execute="
if (!Schema::hasColumn('users', 'status')) {
    echo 'Adding status column manually...';
    DB::statement('ALTER TABLE users ADD COLUMN status VARCHAR(255) DEFAULT \'active\'');
    echo 'Status column added successfully!';
} else {
    echo 'Status column already exists!';
}
" || echo "Manual column addition failed"

# Seed database (will only create users if they don't exist)
echo "Seeding database..."
php artisan db:seed --force

# Start the application with PHP built-in server
echo "Starting Laravel application with PHP built-in server..."

# Start PHP built-in server
php -S 0.0.0.0:8000 -t public public/index.php 