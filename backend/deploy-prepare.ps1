Write-Host "=== DocAvailable Backend Deployment Preparation ===" -ForegroundColor Green
Write-Host "This script prepares your backend for deployment to Render" -ForegroundColor Yellow
Write-Host ""

# Check if we're in the backend directory
if (-not (Test-Path "composer.json")) {
    Write-Host "Error: composer.json not found. Please run this script from the backend directory." -ForegroundColor Red
    exit 1
}

Write-Host "1. Cleaning up autoloader issues..." -ForegroundColor Cyan
# Remove problematic files
if (Test-Path "database/seeders/Plan.php") {
    Remove-Item "database/seeders/Plan.php" -Force
    Write-Host "   Removed database/seeders/Plan.php" -ForegroundColor Yellow
}
if (Test-Path "app/Http/Controllers/Auth/AuthenticationController_fixed.php") {
    Remove-Item "app/Http/Controllers/Auth/AuthenticationController_fixed.php" -Force
    Write-Host "   Removed AuthenticationController_fixed.php" -ForegroundColor Yellow
}

Write-Host "2. Installing dependencies..." -ForegroundColor Cyan
composer install --no-dev --optimize-autoloader --no-interaction

Write-Host "3. Regenerating autoloader..." -ForegroundColor Cyan
composer dump-autoload --optimize --no-dev

Write-Host "4. Clearing Laravel caches..." -ForegroundColor Cyan
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

Write-Host "5. Testing autoloader..." -ForegroundColor Cyan
try {
    php artisan list | Out-Null
    Write-Host "   ✅ Autoloader test passed!" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Autoloader test failed! Please check the errors above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Deployment Preparation Complete ===" -ForegroundColor Green
Write-Host "✅ Your backend is ready for deployment to Render!" -ForegroundColor Green
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Commit these changes to your repository" -ForegroundColor White
Write-Host "   2. Push to your main branch" -ForegroundColor White
Write-Host "   3. Render will automatically redeploy with the fixes" -ForegroundColor White
Write-Host ""
