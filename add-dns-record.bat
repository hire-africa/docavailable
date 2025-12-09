@echo off
echo 🌐 Adding DNS record for WebRTC subdomain...

echo.
echo 📋 Method 1: DigitalOcean Control Panel
echo.
echo 1. Go to: https://cloud.digitalocean.com
echo 2. Click "Networking" → "Domains"
echo 3. Find "docavailable-3vbdv.ondigitalocean.app"
echo 4. Click "Add Record"
echo 5. Set:
echo    - Type: A
echo    - Name: webrtc
echo    - Value: 46.101.123.123
echo    - TTL: 3600
echo 6. Click "Create Record"
echo.
echo 📋 Method 2: Using doctl CLI (if installed)
echo.
echo doctl compute domain records create docavailable-3vbdv.ondigitalocean.app ^
echo   --record-type A ^
echo   --record-name webrtc ^
echo   --record-data 46.101.123.123 ^
echo   --record-ttl 3600
echo.
echo 📋 Method 3: Using curl (if you have API token)
echo.
echo curl -X POST ^
echo   -H "Content-Type: application/json" ^
echo   -H "Authorization: Bearer YOUR_API_TOKEN" ^
echo   -d "{\"type\":\"A\",\"name\":\"webrtc\",\"data\":\"46.101.123.123\",\"ttl\":3600}" ^
echo   "https://api.digitalocean.com/v2/domains/docavailable-3vbdv.ondigitalocean.app/records"
echo.
echo ⏱️ DNS propagation usually takes 5-15 minutes
echo.
echo 🧪 Test DNS resolution:
echo nslookup webrtc.docavailable-3vbdv.ondigitalocean.app
echo.
pause
