@echo off
echo ================================================
echo WebSocket 400 Bad Request Fix - Windows Deploy
echo ================================================
echo.

echo [1/4] Running diagnostic...
node diagnose-websocket-issue.js
echo.

echo [2/4] Files ready for deployment:
echo ✅ nginx-webrtc-proxy.conf - Nginx configuration
echo ✅ WEBSOCKET_FIX_INSTRUCTIONS.md - Detailed instructions
echo ✅ diagnose-websocket-issue.js - Diagnostic tool
echo.

echo [3/4] Next steps for server deployment:
echo.
echo 1. Upload nginx-webrtc-proxy.conf to your server
echo 2. Run these commands on your server:
echo.
echo    sudo cp nginx-webrtc-proxy.conf /etc/nginx/sites-available/webrtc-proxy
echo    sudo ln -sf /etc/nginx/sites-available/webrtc-proxy /etc/nginx/sites-enabled/
echo    sudo nginx -t
echo    sudo systemctl restart nginx
echo.
echo 3. Test the fix:
echo    node diagnose-websocket-issue.js
echo.

echo [4/4] Issue Summary:
echo ===================
echo Problem: Nginx missing /chat-signaling configuration
echo Solution: Deploy nginx-webrtc-proxy.conf to server
echo Status: Client config fixed, server config needs deployment
echo.

echo 📋 The nginx-webrtc-proxy.conf file contains the complete fix.
echo    Upload it to your server and follow the instructions above.
echo.

pause
