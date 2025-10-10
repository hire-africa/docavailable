const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server with absolutely minimal configuration
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false,
  maxPayload: 16 * 1024 * 1024
});

// Handle all WebSocket connections
wss.on('connection', (ws, req) => {
  console.log('🔌 WebSocket connection established');
  
  // Send a simple message
  ws.send(JSON.stringify({
    type: 'connection-established',
    timestamp: new Date().toISOString()
  }));
  
  // Handle ping
  ws.on('ping', (data) => {
    console.log('🏓 Ping received');
    ws.pong(data);
  });
  
  // Handle messages
  ws.on('message', (data) => {
    console.log('📨 Message received:', data.toString());
  });
  
  // Handle close
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Health check endpoint
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start server
const PORT = process.env.WEBRTC_SIGNALING_PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Minimal WebRTC Signaling Server running on port ${PORT}`);
});
