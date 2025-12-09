#!/bin/bash

# Complete setup script for DigitalOcean droplet
# Run this on your droplet: curl -sSL https://raw.githubusercontent.com/hire-africa/docavailable/main/setup-droplet.sh | bash

echo "🚀 Setting up DocAvailable on DigitalOcean droplet..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 for process management
echo "📦 Installing PM2..."
npm install -g pm2

# Create project directory
echo "📁 Setting up project directory..."
mkdir -p /var/www
cd /var/www

# Clone the project
echo "📥 Cloning project from GitHub..."
if [ -d "docavailable" ]; then
    echo "📁 Project directory exists, updating..."
    cd docavailable
    git pull origin main
else
    echo "📁 Cloning fresh project..."
    git clone https://github.com/hire-africa/docavailable.git
    cd docavailable
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'webrtc-signaling-server',
    script: 'webrtc-signaling-server.js',
    cwd: '/var/www/docavailable/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      WEBRTC_SIGNALING_PORT: 8080,
      API_BASE_URL: 'https://docavailable-3vbdv.ondigitalocean.app',
      API_AUTH_TOKEN: 'your-api-token'
    },
    log_file: '/var/log/webrtc-server.log',
    out_file: '/var/log/webrtc-server-out.log',
    error_file: '/var/log/webrtc-server-error.log'
  }]
};
EOF

# Start the WebRTC server with PM2
echo "🚀 Starting WebRTC signaling server..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Test the server
echo "🧪 Testing server health..."
if curl -f http://localhost:8080/health; then
    echo "✅ WebRTC server is running successfully!"
else
    echo "❌ Server health check failed"
    echo "📋 Check logs: pm2 logs webrtc-signaling-server"
fi

# Show server status
echo "📊 Server status:"
pm2 status

echo "🎉 Setup completed!"
echo "🌐 WebRTC server is running on wss://46.101.123.123:8080"
echo "📋 To check logs: pm2 logs webrtc-signaling-server"
echo "🔄 To restart: pm2 restart webrtc-signaling-server"
