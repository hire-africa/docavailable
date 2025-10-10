@echo off
echo 🚀 Deploying WebRTC fixes to DigitalOcean droplet...

REM Server details
set SERVER_IP=46.101.123.123
set SERVER_USER=root
set PROJECT_DIR=/var/www/docavailable

echo 📡 Connecting to server %SERVER_IP%...

REM SSH into the server and run deployment commands
ssh %SERVER_USER%@%SERVER_IP% "cd /var/www/docavailable && git pull origin main && cd backend && npm install && pkill -f 'webrtc-signaling-server.js' || true && nohup node webrtc-signaling-server.js > /var/log/webrtc-server.log 2>&1 & && sleep 5 && curl -f http://localhost:8080/health || echo '❌ Health check failed' && echo '✅ WebRTC server deployment completed!' && ps aux | grep webrtc-signaling-server.js | grep -v grep"

echo 🎉 Deployment completed!
echo 🌐 WebRTC server should now be running on wss://46.101.123.123:8080
echo 📋 Check server logs: ssh root@46.101.123.123 "tail -f /var/log/webrtc-server.log"
pause
