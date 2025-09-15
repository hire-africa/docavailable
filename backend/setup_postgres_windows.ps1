# DocAvailable PostgreSQL Setup for Windows
# This script sets up PostgreSQL and configures the backend

Write-Host "🚀 DocAvailable PostgreSQL Setup for Windows" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Check if PostgreSQL is installed
Write-Host "🔍 Checking PostgreSQL installation..." -ForegroundColor Yellow
try {
    $psqlPath = Get-Command psql -ErrorAction Stop
    Write-Host "✅ PostgreSQL found at: $($psqlPath.Source)" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL not found. Please install PostgreSQL first." -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Installation steps:" -ForegroundColor Cyan
    Write-Host "1. Go to https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "2. Download PostgreSQL 15 or later" -ForegroundColor White
    Write-Host "3. Run the installer" -ForegroundColor White
    Write-Host "4. Remember the password you set for postgres user" -ForegroundColor White
    Write-Host "5. Run this script again" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if PHP PostgreSQL extension is available
Write-Host "🔍 Checking PHP PostgreSQL extension..." -ForegroundColor Yellow
try {
    $phpModules = php -m 2>$null
    if ($phpModules -match "pgsql") {
        Write-Host "✅ PostgreSQL extension is available" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Warning: PostgreSQL extension not found" -ForegroundColor Yellow
        Write-Host "Please install the PostgreSQL PHP extension:" -ForegroundColor White
        Write-Host "1. Download php_pgsql.dll for your PHP version" -ForegroundColor White
        Write-Host "2. Place it in your PHP extensions directory" -ForegroundColor White
        Write-Host "3. Add extension=pgsql to your php.ini file" -ForegroundColor White
        Write-Host ""
    }
} catch {
    Write-Host "⚠️  Could not check PHP extensions" -ForegroundColor Yellow
}

# Get database credentials
Write-Host "📝 Please provide database credentials:" -ForegroundColor Cyan
$dbName = Read-Host "Database name (default: docavailable)"
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "docavailable" }

$dbUser = Read-Host "Username (default: docavailable_user)"
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "docavailable_user" }

$dbPassword = Read-Host "Password" -AsSecureString
if ($dbPassword.Length -eq 0) {
    Write-Host "❌ Password is required" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Convert secure string to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
$dbPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "🔄 Creating database and user..." -ForegroundColor Yellow

# Create database and user
try {
    $createDbResult = psql -U postgres -c "CREATE DATABASE $dbName;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database created successfully" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Database already exists or creation failed" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ℹ️  Database creation failed" -ForegroundColor Yellow
}

try {
    $createUserResult = psql -U postgres -c "CREATE USER $dbUser WITH PASSWORD '$dbPasswordPlain';" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ User created successfully" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  User already exists or creation failed" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ℹ️  User creation failed" -ForegroundColor Yellow
}

try {
    $grantResult = psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $dbName TO $dbUser;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Privileges granted successfully" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Privileges already granted or failed" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ℹ️  Privilege grant failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔄 Updating .env file..." -ForegroundColor Yellow

# Create backup of current .env
if (Test-Path ".env") {
    Copy-Item ".env" ".env.backup" -Force
    Write-Host "✅ .env backup created" -ForegroundColor Green
}

# Read current .env content
$envContent = Get-Content ".env" -Raw

# Update database configuration
$envContent = $envContent -replace 'DB_CONNECTION=.*', 'DB_CONNECTION=pgsql'
$envContent = $envContent -replace 'DB_HOST=.*', 'DB_HOST=127.0.0.1'
$envContent = $envContent -replace 'DB_PORT=.*', 'DB_PORT=5432'
$envContent = $envContent -replace 'DB_DATABASE=.*', "DB_DATABASE=$dbName"
$envContent = $envContent -replace 'DB_USERNAME=.*', "DB_USERNAME=$dbUser"
$envContent = $envContent -replace 'DB_PASSWORD=.*', "DB_PASSWORD=$dbPasswordPlain"
$envContent = $envContent -replace 'DB_CHARSET=.*', 'DB_CHARSET=utf8'
$envContent = $envContent -replace 'DB_SSLMODE=.*', 'DB_SSLMODE=prefer'

# Write updated .env file
Set-Content ".env" $envContent
Write-Host "✅ .env file updated successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "🔄 Clearing Laravel cache..." -ForegroundColor Yellow
php artisan config:clear 2>$null
php artisan cache:clear 2>$null
Write-Host "✅ Cache cleared" -ForegroundColor Green

Write-Host ""
Write-Host "🧪 Testing database connection..." -ForegroundColor Yellow

# Test database connection
$testScript = @"
<?php
require_once 'vendor/autoload.php';
\$app = require_once 'bootstrap/app.php';
\$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
try {
    \$pdo = DB::connection()->getPdo();
    echo "✅ Database connection successful!\n";
    echo "Database: " . DB::connection()->getDatabaseName() . "\n";
    echo "Server: " . \$pdo->getAttribute(PDO::ATTR_SERVER_VERSION) . "\n";
} catch (Exception \$e) {
    echo "❌ Connection failed: " . \$e->getMessage() . "\n";
}
"@

$testScript | php

Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run migrations: php artisan migrate" -ForegroundColor White
Write-Host "2. Seed database: php artisan db:seed" -ForegroundColor White
Write-Host "3. Test your application: php artisan serve" -ForegroundColor White
Write-Host ""
Write-Host "🎉 PostgreSQL setup completed!" -ForegroundColor Green
Write-Host "Your application is now configured to use local PostgreSQL." -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to continue" 