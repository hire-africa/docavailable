# Manual Deployment Steps

## Step 1: Connect to your droplet
```bash
ssh root@46.101.123.123
```

## Step 2: Create the directory and navigate to it
```bash
mkdir -p /root/Doc_available
cd /root/Doc_available
```

## Step 3: Create the enhanced server file
```bash
nano webrtc-chat-signaling-server-updated.js
```

## Step 4: Copy the entire content of your local file
Copy the entire content from your local `webrtc-chat-signaling-server-updated.js` file and paste it into the nano editor.

## Step 5: Save and exit
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

## Step 6: Stop the current server
```bash
pm2 stop webrtc-chat-signaling
```

## Step 7: Start the enhanced server
```bash
pm2 start webrtc-chat-signaling-server-updated.js --name webrtc-unified-signaling
```

## Step 8: Check status
```bash
pm2 status webrtc-unified-signaling
pm2 logs webrtc-unified-signaling
```

## Step 9: Test the server
```bash
curl http://localhost:8081/health
```
