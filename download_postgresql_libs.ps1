# PowerShell script to download PostgreSQL client libraries
# This script will download the required DLLs for PostgreSQL PHP extension

Write-Host "Downloading PostgreSQL client libraries..." -ForegroundColor Green

# Create directory for downloads
$downloadDir = "C:\temp\postgresql_libs"
if (!(Test-Path $downloadDir)) {
    New-Item -ItemType Directory -Path $downloadDir -Force
}

# URLs for PostgreSQL client libraries (these are common locations)
$urls = @(
    "https://www.postgresql.org/ftp/odbc/versions/msi/psqlodbc_15_02_0000-x64.zip",
    "https://github.com/PostgreSQL/postgresql/releases/download/REL_15_5/postgresql-15.5-1-windows-x64.exe"
)

Write-Host "Attempting to download PostgreSQL libraries..." -ForegroundColor Yellow

# Try alternative approach - download from a different source
try {
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile("https://www.postgresql.org/ftp/odbc/versions/msi/psqlodbc_15_02_0000-x64.zip", "$downloadDir\psqlodbc.zip")
    Write-Host "Download completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Download failed. Please manually download PostgreSQL client libraries." -ForegroundColor Red
    Write-Host "Manual steps:" -ForegroundColor Yellow
    Write-Host "1. Go to https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "2. Download PostgreSQL installer" -ForegroundColor White
    Write-Host "3. Extract libpq.dll, libssl-1_1-x64.dll, and libcrypto-1_1-x64.dll" -ForegroundColor White
    Write-Host "4. Copy these files to C:\xampp\php\ext\" -ForegroundColor White
}

Write-Host "Script completed." -ForegroundColor Green 