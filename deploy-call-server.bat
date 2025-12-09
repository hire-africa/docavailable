@echo off
echo Deploying WebRTC Call Signaling Server
echo =====================================
echo.

echo This script will:
echo 1. Upload the call signaling server to the droplet
echo 2. Start the call server with PM2
echo 3. Update nginx configuration
echo 4. Test the deployment
echo.

echo Starting deployment...
echo.

echo 1. Uploading call signaling server...
scp webrtc-call-signaling-server.js root@46.101.123.123:/root/Doc_available/

echo.
echo 2. Uploading nginx configuration...
scp nginx-call-server-https-only.conf root@46.101.123.123:/etc/nginx/sites-available/call-server

echo.
echo 3. Setting up call server on droplet...
ssh root@46.101.123.123 "cd /root/Doc_available && npm install ws axios"

echo.
echo 4. Starting call server with PM2...
ssh root@46.101.123.123 "cd /root/Doc_available && pm2 start webrtc-call-signaling-server.js --name webrtc-call-signaling --env production"

echo.
echo 5. Updating nginx configuration...
ssh root@46.101.123.123 "cd /etc/nginx/sites-enabled && rm -f * && ln -sf /etc/nginx/sites-available/call-server call-server"

echo.
echo 6. Testing nginx configuration...
ssh root@46.101.123.123 "nginx -t"

echo.
echo 7. Reloading nginx...
ssh root@46.101.123.123 "systemctl reload nginx"

echo.
echo 8. Testing endpoints...
echo Testing call server health...
ssh root@46.101.123.123 "curl https://docavailable.org/call-health"

echo.
echo Testing chat server health...
ssh root@46.101.123.123 "curl https://docavailable.org/chat-health"

echo.
echo Testing combined health...
ssh root@46.101.123.123 "curl https://docavailable.org/webrtc-health"

echo.
echo 9. Checking PM2 status...
ssh root@46.101.123.123 "pm2 status"

echo.
echo Deployment completed!
echo.
echo Services available:
echo - Call Signaling: wss://docavailable.org/call-signaling (Port 8080)
echo - Chat Signaling: wss://docavailable.org/chat-signaling (Port 8081)
echo - Call Health: https://docavailable.org/call-health
echo - Chat Health: https://docavailable.org/chat-health
echo - Combined Health: https://docavailable.org/webrtc-health
echo.
echo Press any key to exit...
pause > nul
