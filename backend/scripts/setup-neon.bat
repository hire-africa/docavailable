@echo off
setlocal enabledelayedexpansion

echo 🚀 DocAvailable Neon Database Setup
echo ==================================
echo.

REM Check if .env file exists
if not exist ".env" (
    echo ❌ Error: .env file not found in current directory
    echo Please run this script from the backend directory
    pause
    exit /b 1
)

echo 📝 Please provide your Neon database details:
echo.

REM Get Neon connection details
set /p neon_host="Neon Host (e.g., ep-cool-forest-123456.us-east-2.aws.neon.tech): "
set /p db_name="Database Name: "
set /p db_username="Username: "
set /p db_password="Password: "
set /p db_port="Port (default: 5432): "

REM Set default port if not provided
if "%db_port%"=="" set db_port=5432

echo.
echo 🔄 Updating .env file...

REM Create temporary file for new .env content
set temp_env=.env.temp

REM Process .env file and update database settings
for /f "tokens=1,2 delims==" %%a in (.env) do (
    set line=%%a
    set value=%%b
    
    if "!line!"=="DB_CONNECTION" (
        echo DB_CONNECTION=pgsql >> !temp_env!
    ) else if "!line!"=="DB_HOST" (
        echo DB_HOST=%neon_host% >> !temp_env!
    ) else if "!line!"=="DB_PORT" (
        echo DB_PORT=%db_port% >> !temp_env!
    ) else if "!line!"=="DB_DATABASE" (
        echo DB_DATABASE=%db_name% >> !temp_env!
    ) else if "!line!"=="DB_USERNAME" (
        echo DB_USERNAME=%db_username% >> !temp_env!
    ) else if "!line!"=="DB_PASSWORD" (
        echo DB_PASSWORD=%db_password% >> !temp_env!
    ) else if "!line!"=="DB_CHARSET" (
        echo DB_CHARSET=utf8 >> !temp_env!
    ) else if "!line!"=="DB_SSLMODE" (
        echo DB_SSLMODE=require >> !temp_env!
    ) else (
        echo !line!=!value! >> !temp_env!
    )
)

REM Add new database settings if they don't exist
findstr /c:"DB_CONNECTION=pgsql" !temp_env! >nul 2>&1 || echo DB_CONNECTION=pgsql >> !temp_env!
findstr /c:"DB_HOST=%neon_host%" !temp_env! >nul 2>&1 || echo DB_HOST=%neon_host% >> !temp_env!
findstr /c:"DB_PORT=%db_port%" !temp_env! >nul 2>&1 || echo DB_PORT=%db_port% >> !temp_env!
findstr /c:"DB_DATABASE=%db_name%" !temp_env! >nul 2>&1 || echo DB_DATABASE=%db_name% >> !temp_env!
findstr /c:"DB_USERNAME=%db_username%" !temp_env! >nul 2>&1 || echo DB_USERNAME=%db_username% >> !temp_env!
findstr /c:"DB_PASSWORD=%db_password%" !temp_env! >nul 2>&1 || echo DB_PASSWORD=%db_password% >> !temp_env!
findstr /c:"DB_CHARSET=utf8" !temp_env! >nul 2>&1 || echo DB_CHARSET=utf8 >> !temp_env!
findstr /c:"DB_SSLMODE=require" !temp_env! >nul 2>&1 || echo DB_SSLMODE=require >> !temp_env!

REM Replace original .env with updated version
move /y !temp_env! .env >nul

echo ✅ .env file updated successfully!
echo.

REM Check if PostgreSQL extension is available
echo 🔍 Checking PostgreSQL extension...
php -m | findstr pgsql >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL extension is available
) else (
    echo ⚠️  Warning: PostgreSQL extension not found
    echo Please install the PostgreSQL PHP extension:
    echo   Windows: Download appropriate extension for your PHP version
    echo.
)

echo 📋 Next steps:
echo 1. Test the connection: php artisan tinker
echo 2. Run migrations: php artisan migrate
echo 3. Run the migration script: php scripts/migrate-to-neon.php
echo 4. Test your application: php artisan serve
echo.

echo 🎉 Neon setup completed!
echo Your application is now configured to use Neon PostgreSQL.
pause 