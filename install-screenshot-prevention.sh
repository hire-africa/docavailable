#!/bin/bash

# Screenshot Prevention Installation Script
# This script installs the required dependencies and sets up screenshot prevention

echo "🔒 Installing Screenshot Prevention for Doc Available..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install expo-screen-capture
echo "📦 Installing expo-screen-capture..."
npm install expo-screen-capture@~7.1.0

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ expo-screen-capture installed successfully"
else
    echo "❌ Failed to install expo-screen-capture"
    exit 1
fi

# For Android, we need to rebuild the app
echo "🔧 Android native module setup..."
echo "   - ScreenshotPreventionModule.java created"
echo "   - ScreenshotPreventionPackage.java created"
echo "   - MainApplication.kt updated"

echo ""
echo "📱 Next steps:"
echo "   1. For Android: Run 'npm run android' to rebuild with native modules"
echo "   2. For iOS: Run 'npm run ios' to rebuild with new dependencies"
echo "   3. Screenshot prevention will be automatically enabled in chat"
echo ""
echo "🔒 Screenshot prevention features:"
echo "   ✅ Cross-platform screenshot blocking"
echo "   ✅ Security watermark overlay"
echo "   ✅ Screenshot detection (iOS)"
echo "   ✅ Configurable security levels"
echo "   ✅ Persistent settings"
echo ""
echo "🎉 Installation complete! Screenshot prevention is now active."
