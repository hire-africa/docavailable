// update-webrtc-server.js
const fs = require('fs');

const serverFile = 'backend/webrtc-signaling-server.js';
let content = fs.readFileSync(serverFile, 'utf8');

// Replace the server startup section
const oldServerStart = `// Start server
const PORT = process.env.WEBRTC_SIGNALING_PORT || 8080;
server.listen(PORT, () => {
  console.log(\`🚀 WebRTC Signaling Server running on port \${PORT}\`);
  console.log(\`📡 Audio WebSocket endpoint: ws://localhost:\${PORT}/audio-signaling/{appointmentId}\`);
  console.log(\`💬 Chat WebSocket endpoint: ws://localhost:\${PORT}/chat-signaling/{appointmentId}\`);
  console.log(\`🏥 Health check: http://localhost:\${PORT}/health\`);
});`;

const newServerStart = `// Start server on both ports
const PORT = process.env.WEBRTC_SIGNALING_PORT || 8080;
const PORT_80 = 80;

// Start on primary port (8080)
server.listen(PORT, () => {
  console.log(\`🚀 WebRTC Signaling Server running on port \${PORT}\`);
  console.log(\`📡 Audio WebSocket endpoint: ws://localhost:\${PORT}/audio-signaling/{appointmentId}\`);
  console.log(\`💬 Chat WebSocket endpoint: ws://localhost:\${PORT}/chat-signaling/{appointmentId}\`);
  console.log(\`🏥 Health check: http://localhost:\${PORT}/health\`);
});

// Also start on port 80 for compatibility
const server80 = http.createServer();
const audioWss80 = new WebSocket.Server({ 
  server: server80,
  path: '/audio-signaling'
});
const chatWss80 = new WebSocket.Server({ 
  server: server80,
  path: '/chat-signaling'
});

// Reuse the same connection handlers
audioWss80.on('connection', (ws, req) => {
  console.log('🔌 [Audio:80] New audio WebSocket connection');
  handleConnection(ws, req, 'audio');
});
chatWss80.on('connection', (ws, req) => {
  console.log('🔌 [Chat:80] New chat WebSocket connection');
  handleConnection(ws, req, 'chat');
});

// Health check for port 80
server80.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      activeConnections: connections.size,
      totalConnections: Array.from(connections.values()).reduce((sum, conns) => sum + conns.length, 0),
      timestamp: new Date().toISOString(),
      port: PORT_80
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server80.listen(PORT_80, () => {
  console.log(\`🚀 WebRTC Signaling Server also running on port \${PORT_80}\`);
  console.log(\`📡 Audio WebSocket endpoint: ws://localhost:\${PORT_80}/audio-signaling/{appointmentId}\`);
  console.log(\`💬 Chat WebSocket endpoint: ws://localhost:\${PORT_80}/chat-signaling/{appointmentId}\`);
  console.log(\`🏥 Health check: http://localhost:\${PORT_80}/health\`);
});`;

content = content.replace(oldServerStart, newServerStart);

// Update graceful shutdown to handle both servers
const oldShutdown = `process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down WebRTC Signaling Server...');
  
  // Close all connections
  connections.forEach((appointmentConnections, appointmentId) => {
    appointmentConnections.forEach(connection => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.close(1000, 'Server shutting down');
      }
    });
  });
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});`;

const newShutdown = `process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down WebRTC Signaling Server...');
  
  // Close all connections
  connections.forEach((appointmentConnections, appointmentId) => {
    appointmentConnections.forEach(connection => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.close(1000, 'Server shutting down');
      }
    });
  });
  
  // Close both servers
  server.close(() => {
    console.log('✅ Server on port', PORT, 'closed');
  });
  
  server80.close(() => {
    console.log('✅ Server on port', PORT_80, 'closed');
    process.exit(0);
  });
});`;

content = content.replace(oldShutdown, newShutdown);

fs.writeFileSync(serverFile, content);
console.log('✅ Updated WebRTC server to run on both ports 80 and 8080');
