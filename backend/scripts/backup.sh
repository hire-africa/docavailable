#!/bin/bash

# DocAvailable Database Backup Script
# Usage: ./scripts/backup.sh [backup_name]

set -e

BACKUP_NAME=${1:-$(date +%Y%m%d_%H%M%S)}
BACKUP_DIR="backups"
DB_CONNECTION=$(php artisan tinker --execute='echo config("database.default");')

echo "🗄️ Creating database backup: $BACKUP_NAME"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Get database configuration
DB_DATABASE=$(php artisan tinker --execute='echo config("database.connections." . config("database.default") . ".database");')
DB_HOST=$(php artisan tinker --execute='echo config("database.connections." . config("database.default") . ".host");')
DB_PORT=$(php artisan tinker --execute='echo config("database.connections." . config("database.default") . ".port");')
DB_USERNAME=$(php artisan tinker --execute='echo config("database.connections." . config("database.default") . ".username");')
DB_PASSWORD=$(php artisan tinker --execute='echo config("database.connections." . config("database.default") . ".password");')

echo "📊 Database type: $DB_CONNECTION"

case $DB_CONNECTION in
    "sqlite")
        echo "💾 Backing up SQLite database..."
        if [ -f "$DB_DATABASE" ]; then
            cp "$DB_DATABASE" "$BACKUP_DIR/${BACKUP_NAME}.sqlite"
            echo "✅ SQLite backup created: $BACKUP_DIR/${BACKUP_NAME}.sqlite"
        else
            echo "❌ Error: SQLite database file not found at $DB_DATABASE"
            exit 1
        fi
        ;;
    
    "mysql")
        echo "💾 Backing up MySQL database..."
        if command -v mysqldump >/dev/null 2>&1; then
            mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" > "$BACKUP_DIR/${BACKUP_NAME}.sql"
            echo "✅ MySQL backup created: $BACKUP_DIR/${BACKUP_NAME}.sql"
        else
            echo "❌ Error: mysqldump not found. Please install MySQL client."
            exit 1
        fi
        ;;
    
    "pgsql")
        echo "💾 Backing up PostgreSQL database..."
        if command -v pg_dump >/dev/null 2>&1; then
            PGPASSWORD="$DB_PASSWORD" pg_dump -h"$DB_HOST" -p"$DB_PORT" -U"$DB_USERNAME" "$DB_DATABASE" > "$BACKUP_DIR/${BACKUP_NAME}.sql"
            echo "✅ PostgreSQL backup created: $BACKUP_DIR/${BACKUP_NAME}.sql"
        else
            echo "❌ Error: pg_dump not found. Please install PostgreSQL client."
            exit 1
        fi
        ;;
    
    *)
        echo "❌ Error: Unsupported database type: $DB_CONNECTION"
        exit 1
        ;;
esac

# Create a compressed backup
echo "🗜️ Creating compressed backup..."
BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.sql"
if [ -f "$BACKUP_FILE" ]; then
    gzip "$BACKUP_FILE"
    echo "✅ Compressed backup created: $BACKUP_FILE.gz"
elif [ -f "$BACKUP_DIR/${BACKUP_NAME}.sqlite" ]; then
    gzip "$BACKUP_DIR/${BACKUP_NAME}.sqlite"
    echo "✅ Compressed backup created: $BACKUP_DIR/${BACKUP_NAME}.sqlite.gz"
fi

# Clean up old backups (keep last 10)
echo "🧹 Cleaning up old backups..."
ls -t "$BACKUP_DIR"/*.gz 2>/dev/null | tail -n +11 | xargs -r rm
echo "✅ Old backups cleaned up"

echo "📊 Backup summary:"
ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null || echo "No compressed backups found"
echo "✅ Backup completed successfully!" 