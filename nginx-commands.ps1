# Nginx Configuration Management PowerShell Script
# ===============================================

Write-Host "Nginx Configuration Management Commands" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Function to execute SSH commands
function Invoke-SSHCommand {
    param([string]$Command)
    Write-Host "Executing: $Command" -ForegroundColor Yellow
    ssh root@46.101.123.123 $Command
}

# Menu system
do {
    Write-Host ""
    Write-Host "Choose an option:" -ForegroundColor Cyan
    Write-Host "1. Check available Nginx configurations"
    Write-Host "2. Edit Nginx configuration"
    Write-Host "3. Check Nginx status"
    Write-Host "4. Reload Nginx"
    Write-Host "5. Add WebRTC endpoints"
    Write-Host "6. Test WebRTC endpoints"
    Write-Host "7. Check PM2 status"
    Write-Host "8. Exit"
    Write-Host ""
    
    $choice = Read-Host "Enter your choice (1-8)"
    
    switch ($choice) {
        "1" {
            Write-Host "`nChecking available Nginx configurations..." -ForegroundColor Green
            Invoke-SSHCommand "ls -la /etc/nginx/sites-available/"
            Write-Host "`nEnabled sites:" -ForegroundColor Green
            Invoke-SSHCommand "ls -la /etc/nginx/sites-enabled/"
            Write-Host "`nCurrent configuration:" -ForegroundColor Green
            Invoke-SSHCommand "nginx -T | grep -A 20 'server {'"
        }
        "2" {
            Write-Host "`nOpening Nginx configuration for editing..." -ForegroundColor Green
            Invoke-SSHCommand "nano /etc/nginx/sites-available/default"
        }
        "3" {
            Write-Host "`nChecking Nginx status..." -ForegroundColor Green
            Invoke-SSHCommand "systemctl status nginx"
            Write-Host "`nTesting Nginx configuration..." -ForegroundColor Green
            Invoke-SSHCommand "nginx -t"
        }
        "4" {
            Write-Host "`nReloading Nginx..." -ForegroundColor Green
            Invoke-SSHCommand "nginx -t && systemctl reload nginx"
        }
        "5" {
            Write-Host "`nAdding WebRTC endpoints to Nginx..." -ForegroundColor Green
            $webrtcConfig = @"
    # WebRTC Audio/Video Call Signaling (Port 8080)
    location /audio-signaling {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }

    # WebRTC Chat Signaling (Port 8081)
    location /chat-signaling {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }

    # Health check endpoint for WebRTC services
    location /webrtc-health {
        return 200 '{"status":"healthy","services":["WebRTC Audio Signaling (8080)","WebRTC Chat Signaling (8081)"]}';
        add_header Content-Type application/json;
    }
"@
            
            # Save to temporary file and execute
            $webrtcConfig | Out-File -FilePath "temp_webrtc_config.txt" -Encoding UTF8
            Write-Host "Adding WebRTC configuration..." -ForegroundColor Yellow
            Invoke-SSHCommand "cat >> /etc/nginx/sites-available/default << 'EOF'
$webrtcConfig
EOF"
            Remove-Item "temp_webrtc_config.txt" -ErrorAction SilentlyContinue
            Write-Host "`nTesting and reloading Nginx..." -ForegroundColor Green
            Invoke-SSHCommand "nginx -t && systemctl reload nginx"
        }
        "6" {
            Write-Host "`nTesting WebRTC endpoints..." -ForegroundColor Green
            Write-Host "Testing health endpoint..." -ForegroundColor Yellow
            Invoke-WebRequest -Uri "https://docavailable-3vbdv.ondigitalocean.app/webrtc-health" -UseBasicParsing
            Write-Host "`nTesting WebSocket upgrade..." -ForegroundColor Yellow
            Invoke-WebRequest -Uri "https://docavailable-3vbdv.ondigitalocean.app/audio-signaling" -Headers @{"Connection"="Upgrade"; "Upgrade"="websocket"; "Sec-WebSocket-Key"="test"; "Sec-WebSocket-Version"="13"} -UseBasicParsing
        }
        "7" {
            Write-Host "`nChecking PM2 status..." -ForegroundColor Green
            Invoke-SSHCommand "pm2 status"
            Write-Host "`nChecking WebRTC server logs..." -ForegroundColor Green
            Invoke-SSHCommand "pm2 logs webrtc-audio-signaling --lines 10"
            Invoke-SSHCommand "pm2 logs webrtc-chat-signaling --lines 10"
        }
        "8" {
            Write-Host "`nExiting..." -ForegroundColor Green
            break
        }
        default {
            Write-Host "`nInvalid choice. Please enter 1-8." -ForegroundColor Red
        }
    }
} while ($choice -ne "8")
