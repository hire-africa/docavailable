@echo off
echo 🔧 Setting up WebRTC subdomain configuration...

echo.
echo 📋 Manual Setup Instructions:
echo.
echo 1. SSH into your server (46.101.123.123)
echo 2. Create nginx configuration file:
echo    sudo nano /etc/nginx/sites-available/webrtc.docavailable-3vbdv.ondigitalocean.app
echo.
echo 3. Add this configuration:
echo.
echo server {
echo     listen 80;
echo     server_name webrtc.docavailable-3vbdv.ondigitalocean.app;
echo.
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
echo         proxy_connect_timeout 60;
echo     }
echo.
echo     location /chat-signaling {
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
echo         proxy_connect_timeout 60;
echo     }
echo.
echo     location /health {
echo         proxy_pass http://localhost:8080/health;
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo     }
echo }
echo.
echo 4. Enable the site:
echo    sudo ln -sf /etc/nginx/sites-available/webrtc.docavailable-3vbdv.ondigitalocean.app /etc/nginx/sites-enabled/
echo.
echo 5. Test and reload nginx:
echo    sudo nginx -t
echo    sudo systemctl reload nginx
echo.
echo 6. Add DNS record:
echo    webrtc.docavailable-3vbdv.ondigitalocean.app -> 46.101.123.123
echo.
echo 7. Test the connection:
echo    curl -i http://webrtc.docavailable-3vbdv.ondigitalocean.app/health
echo.
echo ✅ Configuration files have been updated in your project
echo ✅ Ready to build production APK after server setup
echo.
pause
