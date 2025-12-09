@echo off
echo Deploying WebRTC configuration for docavailable.org domain...
echo.

echo Step 1: Copy nginx configuration
echo =================================
echo.
echo Copy the webrtc-signaling.conf to your server:
echo scp webrtc-signaling.conf root@your-server-ip:/etc/nginx/sites-available/docavailable.org
echo.

echo Step 2: Enable the site on your server
echo ======================================
echo.
echo Run these commands on your server:
echo.
echo # Enable the site
echo ln -sf /etc/nginx/sites-available/docavailable.org /etc/nginx/sites-enabled/
echo.
echo # Test nginx configuration
echo nginx -t
echo.
echo # Reload nginx
echo systemctl reload nginx
echo.

echo Step 3: Get SSL certificate for docavailable.org
echo ================================================
echo.
echo Run this command on your server:
echo.
echo certbot --nginx -d docavailable.org
echo.

echo Step 4: Start WebRTC signaling servers
echo ======================================
echo.
echo Run these commands on your server:
echo.
echo # Start audio signaling server (port 8080)
echo pm2 start backend/webrtc-signaling-server.js --name webrtc-audio-signaling
echo.
echo # Start chat signaling server (port 8081)
echo pm2 start webrtc-chat-signaling-server-updated.js --name webrtc-chat-signaling
echo.
echo # Check status
echo pm2 status
echo.

echo Step 5: Test the configuration
echo ==============================
echo.
echo Test these endpoints:
echo.
echo curl https://docavailable.org/health
echo curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" https://docavailable.org/audio-signaling
echo curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" https://docavailable.org/chat-signaling
echo.

echo Step 6: Update your app configuration
echo ====================================
echo.
echo Make sure your app is using the new domain:
echo - API Base URL: https://docavailable.org
echo - WebRTC Audio Signaling: wss://docavailable.org/audio-signaling
echo - WebRTC Chat Signaling: wss://docavailable.org/chat-signaling
echo.

echo Press any key to continue...
pause > nul
