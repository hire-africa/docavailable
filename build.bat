@echo off

REM DocAvailable Docker Build Script for Windows

echo 🚀 Building DocAvailable Docker image...

REM Build the Docker image
docker build -t docavailable:latest .

if %ERRORLEVEL% EQU 0 (
    echo ✅ Docker image built successfully!
    echo.
    echo To run the application:
    echo   docker run -p 8000:8000 docavailable:latest
    echo.
    echo Or use docker-compose:
    echo   docker-compose up
    echo.
    echo The backend API will be available at: http://172.20.10.11:8000
) else (
    echo ❌ Docker build failed!
    exit /b 1
) 