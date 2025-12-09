@echo off
echo 🔧 Deploying Nginx Configuration Fix...
echo.

echo 📋 Step 1: Uploading updated nginx configuration...
scp nginx-webrtc-unified.conf root@46.101.123.123:/etc/nginx/sites-available/default

echo.
echo 📋 Step 2: Testing nginx configuration...
ssh root@46.101.123.123 "nginx -t"

echo.
echo 📋 Step 3: Reloading nginx...
ssh root@46.101.123.123 "systemctl reload nginx"

echo.
echo 📋 Step 4: Testing endpoints...
echo Testing health endpoint...
curl -s https://docavailable.org/webrtc-health

echo.
echo Testing chat signaling endpoint...
curl -s https://docavailable.org/chat-signaling

echo.
echo Testing audio signaling endpoint...
curl -s https://docavailable.org/audio-signaling

echo.
echo ✅ Nginx configuration updated successfully!
echo.
echo 📊 Updated Endpoints:
echo   - Health: https://docavailable.org/webrtc-health
echo   - Chat: wss://docavailable.org/chat-signaling
echo   - Audio: wss://docavailable.org/audio-signaling
echo   - All now point to unified server on port 8081
