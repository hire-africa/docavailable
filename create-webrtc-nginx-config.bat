@echo off
echo Creating new Nginx configuration for WebRTC signaling...
echo.

echo Step 1: Create the configuration file
echo ====================================
echo.
echo ssh root@46.101.123.123 "cat > /etc/nginx/sites-available/webrtc-signaling << 'EOF'"
echo server {
echo     listen 80;
echo     server_name docavailable-3vbdv.ondigitalocean.app;
echo     return 301 https://$server_name$request_uri;
echo }
echo.
echo server {
echo     listen 443 ssl http2;
echo     server_name docavailable-3vbdv.ondigitalocean.app;
echo.
echo     # SSL Configuration (using existing certificates)
echo     ssl_certificate /etc/letsencrypt/live/docavailable-3vbdv.ondigitalocean.app/fullchain.pem;
echo     ssl_certificate_key /etc/letsencrypt/live/docavailable-3vbdv.ondigitalocean.app/privkey.pem;
echo     ssl_protocols TLSv1.2 TLSv1.3;
echo     ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
echo     ssl_prefer_server_ciphers off;
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
echo         proxy_read_timeout 86400;
echo         proxy_send_timeout 86400;
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
echo         proxy_read_timeout 86400;
echo         proxy_send_timeout 86400;
echo     }
echo.
echo     # Health check endpoint for WebRTC services
echo     location /webrtc-health {
echo         return 200 '{"status":"healthy","domain":"docavailable-3vbdv.ondigitalocean.app","services":["WebRTC Audio Signaling (8080)","WebRTC Chat Signaling (8081)"]}';
echo         add_header Content-Type application/json;
echo     }
echo.
echo     # Root endpoint
echo     location / {
echo         return 200 'DocAvailable WebRTC Signaling Server - OK';
echo         add_header Content-Type text/plain;
echo     }
echo }
echo EOF
echo.
echo Step 2: Enable the new configuration
echo ===================================
echo.
echo ssh root@46.101.123.123 "ln -sf /etc/nginx/sites-available/webrtc-signaling /etc/nginx/sites-enabled/"
echo.
echo Step 3: Test the configuration
echo =============================
echo.
echo ssh root@46.101.123.123 "nginx -t"
echo.
echo Step 4: Reload Nginx
echo ===================
echo.
echo ssh root@46.101.123.123 "systemctl reload nginx"
echo.
echo Step 5: Start WebRTC signaling servers
echo =====================================
echo.
echo ssh root@46.101.123.123 "pm2 start backend/webrtc-signaling-server.js --name webrtc-audio-signaling"
echo ssh root@46.101.123.123 "pm2 start webrtc-chat-signaling-server-updated.js --name webrtc-chat-signaling"
echo.
echo Step 6: Test the endpoints
echo =========================
echo.
echo curl https://docavailable-3vbdv.ondigitalocean.app/webrtc-health
echo.
echo curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" https://docavailable-3vbdv.ondigitalocean.app/audio-signaling
echo.
echo curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" https://docavailable-3vbdv.ondigitalocean.app/chat-signaling
echo.
echo Press any key to continue...
pause > nul
