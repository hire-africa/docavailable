#!/bin/bash

echo "========================================"
echo "DocAvailable APK Builder"
echo "========================================"

echo ""
echo "Choose build type:"
echo "1. Debug APK (for testing)"
echo "2. Release APK (for production)"
echo "3. Clean and build"
echo "4. Exit"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "Building Debug APK..."
        echo ""
        npm run build:apk-debug
        if [ $? -eq 0 ]; then
            echo ""
            echo "Debug APK built successfully!"
            echo "Location: android/app/build/outputs/apk/debug/app-debug.apk"
        else
            echo ""
            echo "Build failed! Please check the error messages above."
        fi
        ;;
    2)
        echo ""
        echo "Building Release APK..."
        echo ""
        npm run build:apk
        if [ $? -eq 0 ]; then
            echo ""
            echo "Release APK built successfully!"
            echo "Location: android/app/build/outputs/apk/release/app-release.apk"
        else
            echo ""
            echo "Build failed! Please check the error messages above."
        fi
        ;;
    3)
        echo ""
        echo "Cleaning Android build..."
        echo ""
        npm run clean:android
        echo ""
        echo "Clean completed. You can now run a fresh build."
        ;;
    4)
        echo ""
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice. Please try again."
        ;;
esac
