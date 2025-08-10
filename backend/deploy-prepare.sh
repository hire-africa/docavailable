#!/bin/bash

echo "=== DocAvailable Backend Deployment Preparation ==="
echo "This script prepares your backend for deployment to Render"
echo ""

# Check if we're in the backend directory
if [ ! -f "composer.json" ]; then
    echo "Error: composer.json not found. Please run this script from the backend directory."
    exit 1
fi

echo "1. Cleaning up autoloader issues..."
# Remove problematic files
rm -f database/seeders/Plan.php
rm -f app/Http/Controllers/Auth/AuthenticationController_fixed.php

echo "2. Installing dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction

echo "3. Regenerating autoloader..."
composer dump-autoload --optimize --no-dev

echo "4. Clearing Laravel caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

echo "5. Testing autoloader..."
php artisan list > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Autoloader test passed!"
else
    echo "❌ Autoloader test failed! Please check the errors above."
    exit 1
fi

echo ""
echo "=== Deployment Preparation Complete ==="
echo "✅ Your backend is ready for deployment to Render!"
echo "📝 Next steps:"
echo "   1. Commit these changes to your repository"
echo "   2. Push to your main branch"
echo "   3. Render will automatically redeploy with the fixes"
echo ""
