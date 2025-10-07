@echo off
echo Nginx Configuration Management Commands
echo =====================================
echo.

echo 1. CHECK AVAILABLE NGINX CONFIGURATIONS:
echo ========================================
echo.
echo # List all available Nginx sites
echo ssh root@46.101.123.123 "ls -la /etc/nginx/sites-available/"
echo.
echo # List enabled Nginx sites
echo ssh root@46.101.123.123 "ls -la /etc/nginx/sites-enabled/"
echo.
echo # Show current Nginx configuration
echo ssh root@46.101.123.123 "nginx -T"
echo.
echo # Show only server blocks
echo ssh root@46.101.123.123 "nginx -T | grep -A 50 'server {'"
echo.
echo # Check Nginx configuration syntax
echo ssh root@46.101.123.123 "nginx -t"
echo.
echo # Show Nginx status
echo ssh root@46.101.123.123 "systemctl status nginx"
echo.

echo 2. EDIT NGINX CONFIGURATIONS:
echo =============================
echo.
echo # Edit the main default configuration
echo ssh root@46.101.123.123 "nano /etc/nginx/sites-available/default"
echo.
echo # Edit a specific site configuration
echo ssh root@46.101.123.123 "nano /etc/nginx/sites-available/[site-name]"
echo.
echo # Edit Nginx main configuration
echo ssh root@46.101.123.123 "nano /etc/nginx/nginx.conf"
echo.
echo # Edit with vim instead of nano
echo ssh root@46.101.123.123 "vim /etc/nginx/sites-available/default"
echo.

echo 3. NGINX MANAGEMENT COMMANDS:
echo ============================
echo.
echo # Reload Nginx after changes
echo ssh root@46.101.123.123 "systemctl reload nginx"
echo.
echo # Restart Nginx completely
echo ssh root@46.101.123.123 "systemctl restart nginx"
echo.
echo # Enable a site
echo ssh root@46.101.123.123 "ln -sf /etc/nginx/sites-available/[site-name] /etc/nginx/sites-enabled/"
echo.
echo # Disable a site
echo ssh root@46.101.123.123 "rm /etc/nginx/sites-enabled/[site-name]"
echo.
echo # Backup current configuration
echo ssh root@46.101.123.123 "cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%%Y%%m%%d_%%H%%M%%S)"
echo.

echo 4. QUICK COMMANDS FOR WEBRTC SETUP:
echo ===================================
echo.
echo # Check if WebRTC endpoints are already configured
echo ssh root@46.101.123.123 "grep -n 'audio-signaling\|chat-signaling' /etc/nginx/sites-available/default"
echo.
echo # Add WebRTC endpoints to existing config
echo ssh root@46.101.123.123 "cat >> /etc/nginx/sites-available/default << 'EOF'"
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
echo # Test and reload after changes
echo ssh root@46.101.123.123 "nginx -t && systemctl reload nginx"
echo.

echo 5. TESTING COMMANDS:
echo ===================
echo.
echo # Test WebRTC endpoints
echo curl https://docavailable-3vbdv.ondigitalocean.app/webrtc-health
echo.
echo # Test WebSocket upgrade
echo curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" https://docavailable-3vbdv.ondigitalocean.app/audio-signaling
echo.
echo # Check if WebRTC servers are running
echo ssh root@46.101.123.123 "pm2 status"
echo.
echo # Check WebRTC server logs
echo ssh root@46.101.123.123 "pm2 logs webrtc-audio-signaling"
echo ssh root@46.101.123.123 "pm2 logs webrtc-chat-signaling"
echo.

echo Press any key to exit...
pause > nul
