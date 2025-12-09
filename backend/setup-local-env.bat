@echo off
echo Setting up local development environment...
echo.

REM Check if .env.local exists
if not exist .env.local (
    echo Creating .env.local from template...
    copy .env .env.local
    echo.
    echo IMPORTANT: Please edit .env.local and add your database password
    echo The .env.local file will NOT be committed to version control
    echo.
) else (
    echo .env.local already exists
)

echo.
echo To use local environment variables, run:
echo   set /p DB_PASSWORD=< .env.local
echo   php artisan serve
echo.
echo Or manually copy the password from .env.local to .env for testing
echo.
pause
