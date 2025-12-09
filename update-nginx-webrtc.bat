@echo off
echo Updating existing Nginx configuration to add WebRTC signaling endpoints...
echo.

echo This script will:
echo 1. Backup the current Nginx configuration
echo 2. Add WebRTC signaling endpoints to the existing 443 server block
echo 3. Test and reload Nginx
echo.

echo First, let's check the current Nginx configuration:
echo.
echo ssh root@46.101.123.123 "nginx -T | grep -A 20 -B 5 'listen 443'"
echo.
echo Then run these commands on the server:
echo.
echo # Backup current configuration
echo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
echo.
echo # Add WebRTC signaling endpoints to existing 443 server block
echo cat >> /etc/nginx/sites-available/default << 'EOF'
echo.
echo     # WebRTC Audio/Video Call Signaling (Port 8080)
echo     location /audio-signaling {
echo         proxy_pass http://localhost:8080;
echo         proxy_http_version 1.1;
echo         proxy_set_header Upgrade $http_upgrade;
echo         proxy_set_header Connection "upgrade";
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo     }
echo.
echo     # WebRTC Chat Signaling (Port 8081)
echo     location /chat-signaling {
echo         proxy_pass http://localhost:8081;
echo         proxy_http_version 1.1;
echo         proxy_set_header Upgrade $http_upgrade;
echo         proxy_set_header Connection "upgrade";
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo     }
echo.
echo     # Health check endpoint for WebRTC services
echo     location /webrtc-health {
echo         return 200 '{"status":"healthy","services":["WebRTC Audio Signaling (8080)","WebRTC Chat Signaling (8081)"]}';
echo         add_header Content-Type application/json;
echo     }
echo EOF
echo.
echo # Test Nginx configuration
echo nginx -t
echo.
echo # If test passes, reload Nginx
echo systemctl reload nginx
echo.
echo # Start WebRTC signaling servers
echo pm2 start backend/webrtc-signaling-server.js --name webrtc-audio-signaling
echo pm2 start webrtc-chat-signaling-server-updated.js --name webrtc-chat-signaling
echo.
echo # Check PM2 status
echo pm2 status
echo.
echo echo "WebRTC signaling endpoints added to existing Nginx configuration!"
echo echo "Test with:"
echo echo "curl https://docavailable-3vbdv.ondigitalocean.app/webrtc-health"
echo echo "curl -i -N -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Key: test' -H 'Sec-WebSocket-Version: 13' https://docavailable-3vbdv.ondigitalocean.app/audio-signaling"
echo echo "curl -i -N -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Key: test' -H 'Sec-WebSocket-Version: 13' https://docavailable-3vbdv.ondigitalocean.app/chat-signaling"
echo.
echo Press any key to continue...
pause > nul
