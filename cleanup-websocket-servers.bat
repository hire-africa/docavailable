@echo off
echo ========================================
echo Cleaning Up Corrupted WebSocket Servers
echo ========================================

echo.
echo 1. Stopping all WebSocket servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo 2. Archiving corrupted server files...
if not exist "archive" mkdir archive
if not exist "archive\corrupted-servers" mkdir archive\corrupted-servers

if exist "backend\webrtc-signaling-server.js" (
    move "backend\webrtc-signaling-server.js" "archive\corrupted-servers\webrtc-signaling-server-corrupted.js"
    echo   - Archived corrupted webrtc-signaling-server.js
)

if exist "backend\webrtc-signaling-fixed.js" (
    move "backend\webrtc-signaling-fixed.js" "archive\corrupted-servers\webrtc-signaling-fixed.js"
    echo   - Archived webrtc-signaling-fixed.js
)

if exist "backend\webrtc-signaling-minimal.js" (
    move "backend\webrtc-signaling-minimal.js" "archive\corrupted-servers\webrtc-signaling-minimal.js"
    echo   - Archived webrtc-signaling-minimal.js
)

if exist "backend\webrtc-custom-server.js" (
    move "backend\webrtc-custom-server.js" "archive\corrupted-servers\webrtc-custom-server.js"
    echo   - Archived webrtc-custom-server.js
)

if exist "backend\webrtc-signaling-server-simple.js" (
    move "backend\webrtc-signaling-server-simple.js" "archive\corrupted-servers\webrtc-signaling-server-simple.js"
    echo   - Archived webrtc-signaling-server-simple.js
)

echo.
echo 3. Archiving old nginx configurations...
if exist "nginx-webrtc-proxy.conf" (
    move "nginx-webrtc-proxy.conf" "archive\corrupted-servers\nginx-webrtc-proxy-old.conf"
    echo   - Archived old nginx-webrtc-proxy.conf
)

if exist "docavailable-nginx-fixed.conf" (
    move "docavailable-nginx-fixed.conf" "archive\corrupted-servers\docavailable-nginx-fixed.conf"
    echo   - Archived docavailable-nginx-fixed.conf
)

if exist "nginx-https-webrtc.conf" (
    move "nginx-https-webrtc.conf" "archive\corrupted-servers\nginx-https-webrtc.conf"
    echo   - Archived nginx-https-webrtc.conf
)

echo.
echo 4. Cleaning up test files...
if exist "test-websocket-server.js" del "test-websocket-server.js"
if exist "test-custom-websocket.js" del "test-custom-websocket.js"
if exist "test-websocket-fix.js" del "test-websocket-fix.js"
if exist "diagnose-websocket-issue.js" del "diagnose-websocket-issue.js"
echo   - Cleaned up test files

echo.
echo 5. Creating clean server structure...
if not exist "backend\webrtc-signaling-server.js" (
    copy "backend\webrtc-unified-server.js" "backend\webrtc-signaling-server.js"
    echo   - Created clean webrtc-signaling-server.js
)

if not exist "nginx-webrtc-proxy.conf" (
    copy "nginx-webrtc-unified.conf" "nginx-webrtc-proxy.conf"
    echo   - Created clean nginx-webrtc-proxy.conf
)

echo.
echo ========================================
echo Cleanup Complete!
echo ========================================
echo.
echo Archived files are in: archive\corrupted-servers\
echo Clean server files are ready for deployment
echo.
echo Next steps:
echo   1. Run: deploy-unified-websocket.bat
echo   2. Test with: node test-unified-websocket.js
echo   3. Deploy nginx config to your server
echo.
pause
