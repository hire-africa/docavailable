#!/bin/bash

# DocAvailable Database Restore Script
# Usage: ./scripts/restore.sh [backup_file]

set -e

if [ $# -eq 0 ]; then
    echo "❌ Error: Please provide a backup file to restore"
    echo "Usage: ./scripts/restore.sh [backup_file]"
    echo "Available backups:"
    ls -la backups/*.gz 2>/dev/null || echo "No backups found in backups/ directory"
    exit 1
fi

BACKUP_FILE="$1"
BACKUP_DIR="backups"
DB_CONNECTION=$(php artisan tinker --execute='echo config("database.default");')

echo "🔄 Restoring database from: $BACKUP_FILE"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Get database configuration
DB_DATABASE=$(php artisan tinker --execute='echo config("database.connections." . config("database.default") . ".database");')
DB_HOST=$(php artisan tinker --execute='echo config("database.connections." . config("database.default") . ".host");')
DB_PORT=$(php artisan tinker --execute='echo config("database.connections." . config("database.default") . ".port");')
DB_USERNAME=$(php artisan tinker --execute='echo config("database.connections." . config("database.default") . ".username");')
DB_PASSWORD=$(php artisan tinker --execute='echo config("database.connections." . config("database.default") . ".password");')

echo "📊 Database type: $DB_CONNECTION"

# Confirm restore
read -p "⚠️ This will overwrite your current database. Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 1
fi

# Create temporary directory for extraction
TEMP_DIR=$(mktemp -d)
echo "📁 Using temporary directory: $TEMP_DIR"

# Extract backup file
echo "🗜️ Extracting backup file..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" > "$TEMP_DIR/backup"
    EXTRACTED_FILE="$TEMP_DIR/backup"
else
    cp "$BACKUP_FILE" "$TEMP_DIR/backup"
    EXTRACTED_FILE="$TEMP_DIR/backup"
fi

case $DB_CONNECTION in
    "sqlite")
        echo "💾 Restoring SQLite database..."
        # Stop any processes that might be using the database
        php artisan down --message="Database restore in progress"
        
        # Backup current database
        if [ -f "$DB_DATABASE" ]; then
            cp "$DB_DATABASE" "${DB_DATABASE}.backup.$(date +%Y%m%d_%H%M%S)"
        fi
        
        # Restore database
        cp "$EXTRACTED_FILE" "$DB_DATABASE"
        chmod 644 "$DB_DATABASE"
        
        php artisan up
        echo "✅ SQLite database restored successfully"
        ;;
    
    "mysql")
        echo "💾 Restoring MySQL database..."
        if command -v mysql >/dev/null 2>&1; then
            # Drop and recreate database
            mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" -p"$DB_PASSWORD" -e "DROP DATABASE IF EXISTS \`$DB_DATABASE\`; CREATE DATABASE \`$DB_DATABASE\`;"
            
            # Restore from backup
            mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" < "$EXTRACTED_FILE"
            echo "✅ MySQL database restored successfully"
        else
            echo "❌ Error: mysql client not found. Please install MySQL client."
            exit 1
        fi
        ;;
    
    "pgsql")
        echo "💾 Restoring PostgreSQL database..."
        if command -v psql >/dev/null 2>&1; then
            # Drop and recreate database
            PGPASSWORD="$DB_PASSWORD" psql -h"$DB_HOST" -p"$DB_PORT" -U"$DB_USERNAME" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_DATABASE\";"
            PGPASSWORD="$DB_PASSWORD" psql -h"$DB_HOST" -p"$DB_PORT" -U"$DB_USERNAME" -d postgres -c "CREATE DATABASE \"$DB_DATABASE\";"
            
            # Restore from backup
            PGPASSWORD="$DB_PASSWORD" psql -h"$DB_HOST" -p"$DB_PORT" -U"$DB_USERNAME" "$DB_DATABASE" < "$EXTRACTED_FILE"
            echo "✅ PostgreSQL database restored successfully"
        else
            echo "❌ Error: psql client not found. Please install PostgreSQL client."
            exit 1
        fi
        ;;
    
    *)
        echo "❌ Error: Unsupported database type: $DB_CONNECTION"
        exit 1
        ;;
esac

# Clean up
rm -rf "$TEMP_DIR"

# Run migrations to ensure schema is up to date
echo "🔄 Running migrations to ensure schema is up to date..."
php artisan migrate --force

echo "✅ Database restore completed successfully!"
echo "🔄 Clearing application cache..."
php artisan config:clear
php artisan cache:clear 