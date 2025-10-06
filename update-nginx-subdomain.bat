@echo off
echo 🔧 Adding subdomain to existing nginx configuration...

echo.
echo 📋 Manual Instructions:
echo.
echo 1. SSH into your server (46.101.123.123)
echo 2. Find your nginx config file (usually in /etc/nginx/sites-available/)
echo 3. Edit the server_name line to add the subdomain:
echo.
echo    FROM: server_name 46.101.123.123;
echo    TO:   server_name 46.101.123.123 webrtc.docavailable-3vbdv.ondigitalocean.app;
echo.
echo 4. Test and reload nginx:
echo    sudo nginx -t
echo    sudo systemctl reload nginx
echo.
echo 5. Test the setup:
echo    curl -i http://webrtc.docavailable-3vbdv.ondigitalocean.app:8082/health
echo.
echo 📋 Your current nginx config should look like this:
echo.
echo server {
echo     listen 8082;
echo     server_name 46.101.123.123 webrtc.docavailable-3vbdv.ondigitalocean.app;
echo.
echo     location ~ ^/audio-signaling(/.*)?$ {
echo         proxy_pass http://127.0.0.1:8080$request_uri;
echo         # ... rest of your config
echo     }
echo.
echo     location ~ ^/chat-signaling(/.*)?$ {
echo         proxy_pass http://127.0.0.1:8081$request_uri;
echo         # ... rest of your config
echo     }
echo.
echo     location /health {
echo         proxy_pass http://127.0.0.1:8080;
echo         # ... rest of your config
echo     }
echo }
echo.
echo ✅ Configuration files have been updated in your project
echo ✅ Ready to build production APK after nginx update
echo.
pause
