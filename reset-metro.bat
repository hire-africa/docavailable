@echo off
echo Resetting Metro bundler cache and dependencies...

echo Cleaning npm cache...
npm cache clean --force

echo Removing node_modules...
if exist node_modules rmdir /s /q node_modules

echo Removing package-lock.json...
if exist package-lock.json del package-lock.json

echo Installing dependencies...
npm install

echo Clearing Expo cache...
npx expo start --clear

echo Metro reset complete!
pause

