@echo off
echo ========================================
echo PostgreSQL and PHP Configuration Test
echo ========================================

echo.
echo 1. Testing PostgreSQL in PATH...
where psql
if %errorlevel% equ 0 (
    echo [SUCCESS] PostgreSQL found in PATH
) else (
    echo [ERROR] PostgreSQL not found in PATH
)

echo.
echo 2. Testing PHP PostgreSQL extensions...
php -m | findstr pgsql
if %errorlevel% equ 0 (
    echo [SUCCESS] PostgreSQL extensions loaded
) else (
    echo [ERROR] PostgreSQL extensions not loaded
)

echo.
echo 3. Testing Laravel database connection...
cd backend
php artisan migrate:status
if %errorlevel% equ 0 (
    echo [SUCCESS] Laravel database connection working
) else (
    echo [ERROR] Laravel database connection failed
)

echo.
echo ========================================
echo Test completed. Check the results above.
echo ========================================
pause 