# Production Deployment Guide

## Target Server: 46.101.123.123 (DigitalOcean Droplet)

### Option 1: Automated Deployment (if you have SSH access)
```bash
deploy-to-production.bat
```

### Option 2: Manual Deployment (recommended)

#### Step 1: Upload Files to Server
Upload these files to your DigitalOcean droplet:

1. **WebSocket Server:**
   - File: `backend/webrtc-unified-server.js`
   - Upload to: `/root/webrtc-signaling-server.js`

2. **Nginx Configuration:**
   - File: `nginx-webrtc-unified.conf`
   - Upload to: `/etc/nginx/sites-available/docavailable-webrtc.conf`

#### Step 2: Install Dependencies
SSH into your server and run:
```bash
ssh root@46.101.123.123
cd /root
npm install ws axios
```

#### Step 3: Stop Old Servers
```bash
pkill -f webrtc-signaling-server
```

#### Step 4: Start Unified Server
```bash
cd /root
nohup node webrtc-signaling-server.js > webrtc-server.log 2>&1 &
```

#### Step 5: Update Nginx Configuration
```bash
cp /etc/nginx/sites-available/docavailable-webrtc.conf /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### Step 6: Test the Deployment
```bash
curl https://docavailable.org/webrtc-health
```

### Option 3: Using File Manager (if you have cPanel/Plesk)
1. Upload `backend/webrtc-unified-server.js` to your server
2. Upload `nginx-webrtc-unified.conf` to your nginx config directory
3. Restart nginx through your control panel

## Verification

After deployment, test these endpoints:

- **Audio Signaling:** `wss://docavailable.org/audio-signaling`
- **Chat Signaling:** `wss://docavailable.org/chat-signaling`
- **Health Check:** `https://docavailable.org/webrtc-health`

## Troubleshooting

### Check Server Logs
```bash
ssh root@46.101.123.123 "tail -f /root/webrtc-server.log"
```

### Check Nginx Logs
```bash
ssh root@46.101.123.123 "tail -f /var/log/nginx/error.log"
```

### Check if Server is Running
```bash
ssh root@46.101.123.123 "ps aux | grep webrtc"
```

### Restart Services
```bash
ssh root@46.101.123.123 "systemctl restart nginx"
ssh root@46.101.123.123 "pkill -f webrtc && cd /root && nohup node webrtc-signaling-server.js > webrtc-server.log 2>&1 &"
```

## Expected Results

After successful deployment:
- ✅ Both audio and chat signaling will work
- ✅ No more WebSocket corruption issues
- ✅ Proper error handling and logging
- ✅ Automatic reconnection on network issues
