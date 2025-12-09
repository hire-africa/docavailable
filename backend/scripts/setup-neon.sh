#!/bin/bash

# Neon Database Setup Script for DocAvailable
# This script helps you set up Neon PostgreSQL for your Laravel application

echo "🚀 DocAvailable Neon Database Setup"
echo "=================================="
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found in current directory"
    echo "Please run this script from the backend directory"
    exit 1
fi

# Function to update .env file
update_env() {
    local key=$1
    local value=$2
    local file=".env"
    
    if grep -q "^$key=" "$file"; then
        # Update existing key
        sed -i "s/^$key=.*/$key=$value/" "$file"
    else
        # Add new key
        echo "$key=$value" >> "$file"
    fi
}

echo "📝 Please provide your Neon database details:"
echo ""

# Get Neon connection details
read -p "Neon Host (e.g., ep-cool-forest-123456.us-east-2.aws.neon.tech): " neon_host
read -p "Database Name: " db_name
read -p "Username: " db_username
read -p "Password: " db_password
read -p "Port (default: 5432): " db_port

# Set default port if not provided
if [ -z "$db_port" ]; then
    db_port="5432"
fi

echo ""
echo "🔄 Updating .env file..."

# Update database configuration
update_env "DB_CONNECTION" "pgsql"
update_env "DB_HOST" "$neon_host"
update_env "DB_PORT" "$db_port"
update_env "DB_DATABASE" "$db_name"
update_env "DB_USERNAME" "$db_username"
update_env "DB_PASSWORD" "$db_password"
update_env "DB_CHARSET" "utf8"
update_env "DB_SSLMODE" "require"

echo "✅ .env file updated successfully!"
echo ""

# Check if PostgreSQL extension is available
echo "🔍 Checking PostgreSQL extension..."
if php -m | grep -q pgsql; then
    echo "✅ PostgreSQL extension is available"
else
    echo "⚠️  Warning: PostgreSQL extension not found"
    echo "Please install the PostgreSQL PHP extension:"
    echo "  Ubuntu/Debian: sudo apt-get install php-pgsql"
    echo "  macOS: brew install php"
    echo "  Windows: Download appropriate extension for your PHP version"
    echo ""
fi

echo "📋 Next steps:"
echo "1. Test the connection: php artisan tinker"
echo "2. Run migrations: php artisan migrate"
echo "3. Run the migration script: php scripts/migrate-to-neon.php"
echo "4. Test your application: php artisan serve"
echo ""

echo "🎉 Neon setup completed!"
echo "Your application is now configured to use Neon PostgreSQL." 