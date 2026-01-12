#!/bin/bash

# Screenshot Prevention - Build and Test Script
# This script rebuilds the Android app with screenshot blocking enabled

echo "🔨 Building Android App with Screenshot Prevention"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Clean the build
echo -e "${BLUE}Step 1: Cleaning Android build...${NC}"
cd android
./gradlew clean
cd ..
echo -e "${GREEN}✅ Clean complete${NC}"
echo ""

# Step 2: Clear React Native cache
echo -e "${BLUE}Step 2: Clearing React Native cache...${NC}"
rm -rf node_modules/.cache
echo -e "${GREEN}✅ Cache cleared${NC}"
echo ""

# Step 3: Rebuild the app
echo -e "${BLUE}Step 3: Building Android app...${NC}"
echo -e "${YELLOW}This may take several minutes...${NC}"
echo ""

# Check if using Expo
if [ -f "app.json" ]; then
  echo -e "${BLUE}Detected Expo project. Building with Expo...${NC}"
  npx expo run:android --no-build-cache
else
  echo -e "${BLUE}Building with React Native CLI...${NC}"
  npx react-native run-android
fi

# Step 4: Test instructions
echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "=================================================="
echo -e "${YELLOW}Testing Instructions:${NC}"
echo "=================================================="
echo ""
echo "1. Open the app on your Android device/emulator"
echo "2. Navigate to a chat screen"
echo "3. Try to take a screenshot (Power + Volume Down)"
echo "4. Expected result: Screenshot shows BLACK SCREEN"
echo ""
echo "Check the logs for these messages:"
echo "  ✅ [ScreenshotPrevention] Android screenshot prevention enabled"
echo "  ✅ FLAG_SECURE enabled - screenshots will show black screen"
echo ""
echo "To view logs:"
echo "  adb logcat | grep ScreenshotPrevention"
echo ""
echo -e "${GREEN}If you see a black screenshot, it's working! 🎉${NC}"


