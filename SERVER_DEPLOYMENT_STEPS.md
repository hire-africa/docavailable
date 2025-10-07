# DocAvailable.org WebRTC Deployment Steps

## Overview
This document outlines the steps to deploy the WebRTC configuration for the `docavailable.org` domain on your DigitalOcean droplet.

## Prerequisites
- Domain `docavailable.org` should point to your droplet's IP address
- SSH access to your droplet
- Nginx installed and running
- PM2 installed for process management

## Step 1: Deploy Nginx Configuration

1. Copy the nginx configuration to your server:
```bash
scp webrtc-signaling.conf root@your-droplet-ip:/etc/nginx/sites-available/docavailable.org
```

2. SSH into your droplet and enable the site:
```bash
ssh root@your-droplet-ip
ln -sf /etc/nginx/sites-available/docavailable.org /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## Step 2: Get SSL Certificate

Run this command on your droplet to get SSL certificate for docavailable.org:
```bash
certbot --nginx -d docavailable.org
```

## Step 3: Start WebRTC Signaling Servers

1. Start the audio signaling server (port 8080):
```bash
pm2 start backend/webrtc-signaling-server.js --name webrtc-audio-signaling
```

2. Start the chat signaling server (port 8081):
```bash
pm2 start webrtc-chat-signaling-server-updated.js --name webrtc-chat-signaling
```

3. Check status:
```bash
pm2 status
```

## Step 4: Test the Configuration

Test these endpoints to ensure everything is working:

1. Health check:
```bash
curl https://docavailable.org/health
```

2. WebRTC Audio Signaling:
```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" https://docavailable.org/audio-signaling
```

3. WebRTC Chat Signaling:
```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" https://docavailable.org/chat-signaling
```

## Step 5: Update App Configuration

The app configuration has been updated to use:
- API Base URL: `https://docavailable.org`
- WebRTC Audio Signaling: `wss://docavailable.org/audio-signaling`
- WebRTC Chat Signaling: `wss://docavailable.org/chat-signaling`

## Expected Results

After successful deployment:
- ✅ `https://docavailable.org/health` should return a JSON response
- ✅ WebSocket connections should work on both signaling endpoints
- ✅ SSL certificate should be valid for docavailable.org
- ✅ Both PM2 processes should be running

## Troubleshooting

If you encounter issues:

1. Check nginx configuration:
```bash
nginx -t
```

2. Check nginx error logs:
```bash
tail -f /var/log/nginx/error.log
```

3. Check PM2 logs:
```bash
pm2 logs webrtc-audio-signaling
pm2 logs webrtc-chat-signaling
```

4. Verify SSL certificate:
```bash
certbot certificates
```

## Files Updated

The following files have been updated to use `docavailable.org`:
- `config/environment.ts`
- `env.example`
- `services/configService.ts`
- `services/webrtcChatService.ts`
- `services/audioCallService.ts`
- `services/videoCallService.ts`
- `app/services/apiService.ts`
- `services/paymentService.ts`
- `components/LoginPage.tsx`
- `app/patient-dashboard.tsx`
- `app/(tabs)/doctor-details/BookAppointmentFlow.tsx`
