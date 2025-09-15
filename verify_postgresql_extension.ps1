# Script to verify PostgreSQL extension installation
Write-Host "Verifying PostgreSQL extension installation..." -ForegroundColor Green

# Check if required DLLs exist
$phpExtDir = "C:\xampp\php\ext"
$requiredDlls = @("libpq.dll", "libssl-1_1-x64.dll", "libcrypto-1_1-x64.dll", "php_pgsql.dll")

Write-Host "Checking required DLLs in $phpExtDir" -ForegroundColor Yellow

foreach ($dll in $requiredDlls) {
    $dllPath = Join-Path $phpExtDir $dll
    if (Test-Path $dllPath) {
        Write-Host "✓ $dll found" -ForegroundColor Green
    } else {
        Write-Host "✗ $dll missing" -ForegroundColor Red
    }
}

# Test PHP PostgreSQL extension
Write-Host "`nTesting PHP PostgreSQL extension..." -ForegroundColor Yellow
try {
    $phpOutput = php -r "if (extension_loaded('pgsql')) { echo '✓ PostgreSQL extension loaded successfully'; } else { echo '✗ PostgreSQL extension failed to load'; }" 2>&1
    Write-Host $phpOutput -ForegroundColor $(if ($phpOutput -like "*successfully*") { "Green" } else { "Red" })
} catch {
    Write-Host "✗ Error testing PHP extension" -ForegroundColor Red
}

# Check PHP configuration
Write-Host "`nPHP Configuration:" -ForegroundColor Yellow
php --ini | Select-String "Configuration File"

Write-Host "`nVerification complete!" -ForegroundColor Green 