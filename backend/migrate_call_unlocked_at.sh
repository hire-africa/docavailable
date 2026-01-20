#!/bin/bash

# Script to migrate the call_unlocked_at column to appointments table
# This will add the column if it doesn't exist

cd "$(dirname "$0")"

echo "🔄 Running migration to add call_unlocked_at column to appointments table..."
echo ""

# Run the specific migration
php artisan migrate --path=database/migrations/2026_01_17_000001_add_call_unlocked_at_to_appointments_table.php

echo ""
echo "✅ Migration complete!"
echo ""
echo "To verify the column was added, you can run:"
echo "  php artisan tinker"
echo "  >>> \\Illuminate\\Support\\Facades\\Schema::hasColumn('appointments', 'call_unlocked_at')"
echo "  (Should return true)"
