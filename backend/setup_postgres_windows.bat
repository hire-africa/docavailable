@echo off
setlocal enabledelayedexpansion

echo 🚀 DocAvailable PostgreSQL Setup for Windows
echo ===========================================
echo.

REM Check if PostgreSQL is installed
echo 🔍 Checking PostgreSQL installation...
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL not found. Please install PostgreSQL first.
    echo.
    echo 📋 Installation steps:
    echo 1. Go to https://www.postgresql.org/download/windows/
    echo 2. Download PostgreSQL 15 or later
    echo 3. Run the installer
    echo 4. Remember the password you set for postgres user
    echo 5. Run this script again
    echo.
    pause
    exit /b 1
)

echo ✅ PostgreSQL found!

REM Check if PHP PostgreSQL extension is available
echo 🔍 Checking PHP PostgreSQL extension...
php -m | findstr pgsql >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Warning: PostgreSQL extension not found
    echo Please install the PostgreSQL PHP extension:
    echo 1. Download php_pgsql.dll for your PHP version
    echo 2. Place it in your PHP extensions directory
    echo 3. Add extension=pgsql to your php.ini file
    echo.
)

REM Get database credentials
echo 📝 Please provide database credentials:
set /p db_name="Database name (default: docavailable): "
if "%db_name%"=="" set db_name=docavailable

set /p db_user="Username (default: docavailable_user): "
if "%db_user%"=="" set db_user=docavailable_user

set /p db_password="Password: "
if "%db_password%"=="" (
    echo ❌ Password is required
    pause
    exit /b 1
)

echo.
echo 🔄 Creating database and user...

REM Create database and user
psql -U postgres -c "CREATE DATABASE %db_name%;" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Database created successfully
) else (
    echo ℹ️  Database already exists or creation failed
)

psql -U postgres -c "CREATE USER %db_user% WITH PASSWORD '%db_password%';" 2>nul
if %errorlevel% equ 0 (
    echo ✅ User created successfully
) else (
    echo ℹ️  User already exists or creation failed
)

psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE %db_name% TO %db_user%;" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Privileges granted successfully
) else (
    echo ℹ️  Privileges already granted or failed
)

echo.
echo 🔄 Updating .env file...

REM Create backup of current .env
copy .env .env.backup >nul 2>&1
echo ✅ .env backup created

REM Update .env file with new database configuration
powershell -Command "(Get-Content .env) -replace 'DB_CONNECTION=.*', 'DB_CONNECTION=pgsql' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_HOST=.*', 'DB_HOST=127.0.0.1' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_PORT=.*', 'DB_PORT=5432' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_DATABASE=.*', 'DB_DATABASE=%db_name%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_USERNAME=.*', 'DB_USERNAME=%db_user%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_PASSWORD=.*', 'DB_PASSWORD=%db_password%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_CHARSET=.*', 'DB_CHARSET=utf8' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_SSLMODE=.*', 'DB_SSLMODE=prefer' | Set-Content .env"

echo ✅ .env file updated successfully!

echo.
echo 🔄 Clearing Laravel cache...
php artisan config:clear >nul 2>&1
php artisan cache:clear >nul 2>&1
echo ✅ Cache cleared

echo.
echo 🧪 Testing database connection...
php -r "
require_once 'vendor/autoload.php';
\$app = require_once 'bootstrap/app.php';
\$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
try {
    \$pdo = DB::connection()->getPdo();
    echo '✅ Database connection successful!\n';
    echo 'Database: ' . DB::connection()->getDatabaseName() . '\n';
    echo 'Server: ' . \$pdo->getAttribute(PDO::ATTR_SERVER_VERSION) . '\n';
} catch (Exception \$e) {
    echo '❌ Connection failed: ' . \$e->getMessage() . '\n';
}
"

echo.
echo 📋 Next steps:
echo 1. Run migrations: php artisan migrate
echo 2. Seed database: php artisan db:seed
echo 3. Test your application: php artisan serve
echo.
echo 🎉 PostgreSQL setup completed!
echo Your application is now configured to use local PostgreSQL.
echo.
pause 