@echo off
echo ========================================
echo WebRTC Production Deployment Script
echo ========================================
echo.

echo [1/6] Copying WebRTC signaling servers to production...
scp backend/webrtc-signaling-server.js root@46.101.123.123:/var/www/html/
if %errorlevel% neq 0 (
    echo ❌ Failed to copy webrtc-signaling-server.js
    pause
    exit /b 1
)

scp backend/webrtc-chat-signaling-server.js root@46.101.123.123:/var/www/html/
if %errorlevel% neq 0 (
    echo ❌ Failed to copy webrtc-chat-signaling-server.js
    pause
    exit /b 1
)

echo ✅ WebRTC servers copied successfully
echo.

echo [2/6] Copying package.json for dependencies...
scp backend/package.json root@46.101.123.123:/var/www/html/
if %errorlevel% neq 0 (
    echo ❌ Failed to copy package.json
    pause
    exit /b 1
)

echo ✅ Package.json copied successfully
echo.

echo [3/6] Connecting to server to install dependencies and start services...
echo Please enter the server password when prompted: Change#687$Ten@Twenty%%&Now
echo.

ssh root@46.101.123.123 << 'EOF'
echo "Installing Node.js dependencies..."
cd /var/www/html
npm install ws axios

echo "Installing PM2 globally..."
npm install -g pm2

echo "Starting WebRTC signaling server..."
pm2 start webrtc-signaling-server.js --name "webrtc-signaling" --port 8080

echo "Starting WebRTC chat signaling server..."
pm2 start webrtc-chat-signaling-server.js --name "webrtc-chat-signaling" --port 8081

echo "Saving PM2 configuration..."
pm2 save
pm2 startup

echo "Checking server status..."
pm2 status

echo "Testing health endpoints..."
curl -s http://localhost:8080/health
echo ""
curl -s http://localhost:8081/health
echo ""

echo "WebRTC servers deployed and started successfully!"
EOF

if %errorlevel% neq 0 (
    echo ❌ Failed to start services on server
    pause
    exit /b 1
)

echo.
echo [4/6] Testing production endpoints...
echo Testing audio signaling server...
curl -s https://docavailable-3vbdv.ondigitalocean.app/audio-signaling/health
echo.
echo Testing chat signaling server...
curl -s https://docavailable-3vbdv.ondigitalocean.app/chat-signaling/health
echo.

echo [5/6] Updating Nginx configuration...
echo Please manually add the following to your Nginx configuration:
echo.
echo # WebRTC Audio Signaling Server
echo location /audio-signaling/ {
echo     proxy_pass http://localhost:8080;
echo     proxy_http_version 1.1;
echo     proxy_set_header Upgrade $http_upgrade;
echo     proxy_set_header Connection "upgrade";
echo     proxy_set_header Host $host;
echo     proxy_set_header X-Real-IP $remote_addr;
echo     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo     proxy_set_header X-Forwarded-Proto $scheme;
echo }
echo.
echo # WebRTC Chat Signaling Server
echo location /chat-signaling/ {
echo     proxy_pass http://localhost:8081;
echo     proxy_http_version 1.1;
echo     proxy_set_header Upgrade $http_upgrade;
echo     proxy_set_header Connection "upgrade";
echo     proxy_set_header Host $host;
echo     proxy_set_header X-Real-IP $remote_addr;
echo     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo     proxy_set_header X-Forwarded-Proto $scheme;
echo }
echo.

echo [6/6] Deployment completed!
echo.
echo ✅ WebRTC signaling servers deployed to production
echo ✅ Services started with PM2
echo ⚠️  Please update Nginx configuration manually
echo.
echo Next steps:
echo 1. Update Nginx configuration with the provided WebSocket proxy settings
echo 2. Restart Nginx: sudo systemctl restart nginx
echo 3. Test the app with real-time messaging and audio calls
echo.
pause

