# PostgreSQL Setup Verification Script
Write-Host "Verifying PostgreSQL Setup..." -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""

# Check PostgreSQL installation
Write-Host "1. Checking PostgreSQL installation..." -ForegroundColor Yellow
try {
    $psqlVersion = psql --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: PostgreSQL found: $psqlVersion" -ForegroundColor Green
    } else {
        Write-Host "ERROR: PostgreSQL not found" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: PostgreSQL not found" -ForegroundColor Red
}

# Check PHP PostgreSQL extension
Write-Host "`n2. Checking PHP PostgreSQL extension..." -ForegroundColor Yellow
try {
    $phpModules = php -m 2>$null
    if ($phpModules -match "pgsql") {
        Write-Host "SUCCESS: PostgreSQL extension is loaded" -ForegroundColor Green
    } else {
        Write-Host "ERROR: PostgreSQL extension not found" -ForegroundColor Red
        Write-Host "   Please install php_pgsql.dll" -ForegroundColor White
    }
} catch {
    Write-Host "ERROR: Could not check PHP extensions" -ForegroundColor Red
}

# Check PostgreSQL service
Write-Host "`n3. Checking PostgreSQL service..." -ForegroundColor Yellow
try {
    $service = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq "Running") {
            Write-Host "SUCCESS: PostgreSQL service is running" -ForegroundColor Green
        } else {
            Write-Host "WARNING: PostgreSQL service is not running" -ForegroundColor Yellow
            Write-Host "   Status: $($service.Status)" -ForegroundColor White
        }
    } else {
        Write-Host "WARNING: PostgreSQL service not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "WARNING: Could not check PostgreSQL service" -ForegroundColor Yellow
}

# Test database connection
Write-Host "`n4. Testing database connection..." -ForegroundColor Yellow
try {
    $testResult = psql -U postgres -c "SELECT version();" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: PostgreSQL connection successful" -ForegroundColor Green
    } else {
        Write-Host "ERROR: PostgreSQL connection failed" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: PostgreSQL connection failed" -ForegroundColor Red
}

# Check .env configuration
Write-Host "`n5. Checking .env configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env"
    $dbConnection = $envContent | Select-String "DB_CONNECTION="
    $dbHost = $envContent | Select-String "DB_HOST="
    $dbDatabase = $envContent | Select-String "DB_DATABASE="
    
    if ($dbConnection -match "pgsql") {
        Write-Host "SUCCESS: DB_CONNECTION is set to pgsql" -ForegroundColor Green
    } else {
        Write-Host "ERROR: DB_CONNECTION is not set to pgsql" -ForegroundColor Red
    }
    
    if ($dbHost -match "127.0.0.1") {
        Write-Host "SUCCESS: DB_HOST is set to 127.0.0.1" -ForegroundColor Green
    } else {
        Write-Host "ERROR: DB_HOST is not set to 127.0.0.1" -ForegroundColor Red
    }
    
    if ($dbDatabase) {
        Write-Host "SUCCESS: DB_DATABASE is configured" -ForegroundColor Green
    } else {
        Write-Host "ERROR: DB_DATABASE is not configured" -ForegroundColor Red
    }
} else {
    Write-Host "ERROR: .env file not found" -ForegroundColor Red
}

# Test Laravel connection
Write-Host "`n6. Testing Laravel connection..." -ForegroundColor Yellow
try {
    $testScript = @"
<?php
require_once 'vendor/autoload.php';
\$app = require_once 'bootstrap/app.php';
\$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
try {
    \$pdo = DB::connection()->getPdo();
    echo "SUCCESS: Laravel connection successful!\n";
    echo "Database: " . DB::connection()->getDatabaseName() . "\n";
} catch (Exception \$e) {
    echo "ERROR: Laravel connection failed: " . \$e->getMessage() . "\n";
}
"@

    $testScript | php
} catch {
    Write-Host "ERROR: Could not test Laravel connection" -ForegroundColor Red
}

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "If you see any ERROR messages above, please:" -ForegroundColor White
Write-Host "1. Install PostgreSQL if not found" -ForegroundColor White
Write-Host "2. Install php_pgsql.dll extension" -ForegroundColor White
Write-Host "3. Start PostgreSQL service" -ForegroundColor White
Write-Host "4. Update .env file with correct database settings" -ForegroundColor White
Write-Host "5. Run: php artisan config:clear" -ForegroundColor White

Write-Host "`nVerification complete!" -ForegroundColor Green 