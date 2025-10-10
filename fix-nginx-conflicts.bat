@echo off
echo 🔧 Fixing Nginx Configuration Conflicts...
echo.

echo 📋 Step 1: Disabling conflicting nginx configurations...
ssh root@46.101.123.123 "cd /etc/nginx/sites-enabled && ls -la"

echo.
echo 📋 Step 2: Disabling conflicting configs...
ssh root@46.101.123.123 "cd /etc/nginx/sites-enabled && mv webrtc-proxy webrtc-proxy.disabled 2>/dev/null || echo 'webrtc-proxy not found'"
ssh root@46.101.123.123 "cd /etc/nginx/sites-enabled && mv webrtc-subdomain webrtc-subdomain.disabled 2>/dev/null || echo 'webrtc-subdomain not found'"
ssh root@46.101.123.123 "cd /etc/nginx/sites-enabled && mv docavailable-webrtc.conf docavailable-webrtc.conf.disabled 2>/dev/null || echo 'docavailable-webrtc.conf not found'"

echo.
echo 📋 Step 3: Ensuring default config is active...
ssh root@46.101.123.123 "cd /etc/nginx/sites-enabled && ln -sf /etc/nginx/sites-available/default default"

echo.
echo 📋 Step 4: Testing nginx configuration...
ssh root@46.101.123.123 "nginx -t"

echo.
echo 📋 Step 5: Reloading nginx...
ssh root@46.101.123.123 "systemctl reload nginx"

echo.
echo 📋 Step 6: Testing endpoints...
echo Testing health endpoint...
curl -s https://docavailable.org/webrtc-health

echo.
echo Testing chat signaling endpoint...
curl -s https://docavailable.org/chat-signaling

echo.
echo Testing audio signaling endpoint...
curl -s https://docavailable.org/audio-signaling

echo.
echo ✅ Nginx conflicts resolved!
