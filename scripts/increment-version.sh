#!/bin/bash

# DocAvailable Version Increment Script
# This script automatically increments the version code and optionally version name
# Usage: ./scripts/increment-version.sh [patch|minor|major]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}========================================"
    echo "DocAvailable Version Increment Tool"
    echo "========================================${NC}"
}

# Check if we're in the right directory
if [ ! -f "android/app/build.gradle" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

print_header

# Read current version from build.gradle
BUILD_GRADLE="android/app/build.gradle"
CURRENT_VERSION=$(grep "versionName" "$BUILD_GRADLE" | sed 's/.*versionName "\(.*\)".*/\1/')
CURRENT_CODE=$(grep "versionCode" "$BUILD_GRADLE" | sed 's/.*versionCode \([0-9]*\).*/\1/')

print_status "Current version: $CURRENT_VERSION (code: $CURRENT_CODE)"

# Determine version increment type
INCREMENT_TYPE=${1:-patch}

case $INCREMENT_TYPE in
    patch|minor|major)
        print_status "Incrementing version type: $INCREMENT_TYPE"
        ;;
    *)
        print_error "Invalid increment type. Use: patch, minor, or major"
        exit 1
        ;;
esac

# Increment version code
NEW_CODE=$((CURRENT_CODE + 1))
print_status "New version code: $NEW_CODE"

# Parse current version components
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]:-0}
MINOR=${VERSION_PARTS[1]:-0}
PATCH=${VERSION_PARTS[2]:-0}

# Calculate new version based on increment type
case $INCREMENT_TYPE in
    patch)
        NEW_PATCH=$((PATCH + 1))
        NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
        ;;
    minor)
        NEW_MINOR=$((MINOR + 1))
        NEW_PATCH=0
        NEW_VERSION="$MAJOR.$NEW_MINOR.$NEW_PATCH"
        ;;
    major)
        NEW_MAJOR=$((MAJOR + 1))
        NEW_MINOR=0
        NEW_PATCH=0
        NEW_VERSION="$NEW_MAJOR.$NEW_MINOR.$NEW_PATCH"
        ;;
esac

print_status "New version name: $NEW_VERSION"

# Backup original file
cp "$BUILD_GRADLE" "$BUILD_GRADLE.backup"
print_status "Backup created: $BUILD_GRADLE.backup"

# Update version code
sed -i "s/versionCode $CURRENT_CODE/versionCode $NEW_CODE/" "$BUILD_GRADLE"

# Update version name
sed -i "s/versionName \"$CURRENT_VERSION\"/versionName \"$NEW_VERSION\"/" "$BUILD_GRADLE"

# Verify changes
UPDATED_VERSION=$(grep "versionName" "$BUILD_GRADLE" | sed 's/.*versionName "\(.*\)".*/\1/')
UPDATED_CODE=$(grep "versionCode" "$BUILD_GRADLE" | sed 's/.*versionCode \([0-9]*\).*/\1/')

if [ "$UPDATED_VERSION" = "$NEW_VERSION" ] && [ "$UPDATED_CODE" = "$NEW_CODE" ]; then
    print_status "Version updated successfully!"
    print_status "Updated version: $UPDATED_VERSION (code: $UPDATED_CODE)"
    
    # Also update app.config.js if it exists
    if [ -f "app.config.js" ]; then
        print_status "Updating app.config.js version..."
        sed -i "s/version: \"$CURRENT_VERSION\"/version: \"$NEW_VERSION\"/" "app.config.js"
        print_status "app.config.js updated"
    fi
    
    # Also update package.json if it exists
    if [ -f "package.json" ]; then
        print_status "Updating package.json version..."
        sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "package.json"
        print_status "package.json updated"
    fi
    
    echo ""
    print_status "Ready to build APK with new version!"
    print_status "Run: npm run build:apk"
    
else
    print_error "Version update failed!"
    print_status "Restoring backup..."
    mv "$BUILD_GRADLE.backup" "$BUILD_GRADLE"
    exit 1
fi

echo ""
print_status "Version increment completed successfully!"
