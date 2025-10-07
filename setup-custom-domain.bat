@echo off
echo Setting up custom domain docavailable.org for WebSocket proxy...
echo.

echo Step 1: Setting up DNS and SSL certificate
echo ==========================================
echo.
echo First, you need to:
echo 1. Point docavailable.org A record to 46.101.123.123
echo 2. Run the following commands on your server:
echo.
echo ssh root@46.101.123.123
echo.
echo Then run these commands on the server:
echo.
echo # Install certbot if not already installed
echo apt update && apt install -y certbot
echo.
echo # Get SSL certificate for docavailable.org
echo certbot certonly --standalone -d docavailable.org
echo.
echo # Create Nginx configuration for docavailable.org
echo cat > /etc/nginx/sites-available/docavailable.org << 'EOF'
echo server {
echo     listen 80;
echo     server_name docavailable.org;
echo     return 301 https://$server_name$request_uri;
echo }
echo.
echo server {
echo     listen 443 ssl;
echo     server_name docavailable.org;
echo.
echo     ssl_certificate /etc/letsencrypt/live/docavailable.org/fullchain.pem;
echo     ssl_certificate_key /etc/letsencrypt/live/docavailable.org/privkey.pem;
echo.
echo     # WebSocket proxy for audio signaling
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
echo     # WebSocket proxy for chat signaling
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
echo     # Health check endpoint
echo     location /health {
echo         return 200 '{"status":"healthy","domain":"docavailable.org"}';
echo         add_header Content-Type application/json;
echo     }
echo }
echo EOF
echo.
echo # Enable the site
echo ln -sf /etc/nginx/sites-available/docavailable.org /etc/nginx/sites-enabled/
echo.
echo # Test Nginx configuration
echo nginx -t
echo.
echo # Reload Nginx
echo systemctl reload nginx
echo.
echo # Start WebRTC servers
echo pm2 start backend/webrtc-signaling-server.js --name webrtc-audio
echo pm2 start webrtc-chat-signaling-server-updated.js --name webrtc-chat
echo.
echo # Check status
echo pm2 status
echo.
echo echo "Setup complete! Test with:"
echo echo "curl https://docavailable.org/health"
echo.
echo Press any key to continue after setting up the domain...
pause > nul
