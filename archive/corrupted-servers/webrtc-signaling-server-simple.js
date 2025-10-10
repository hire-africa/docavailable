const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server for audio signaling
const audioWss = new WebSocket.Server({ 
  server,
  path: '/audio-signaling'
});

// Create WebSocket server for chat signaling
const chatWss = new WebSocket.Server({ 
  server,
  path: '/chat-signaling'
});

// Store active connections by appointment ID
const connections = new Map();

// Handle WebSocket connections for both audio and chat
const handleConnection = (ws, req, connectionType) => {
  console.log(`🔌 New ${connectionType} WebSocket connection established`);
  
  // Parse query parameters
  const urlParts = url.parse(req.url, true);
  const appointmentId = urlParts.query.appointmentId;
  const userId = urlParts.query.userId;
  
  if (!appointmentId || !userId) {
    console.log('❌ Missing appointmentId or userId, closing connection');
    ws.close(1000, 'Appointment ID required');
    return;
  }
  
  console.log('📋 Connection details:', { appointmentId, userId, connectionType });
  
  // Store connection
  if (!connections.has(appointmentId)) {
    connections.set(appointmentId, new Set());
  }
  connections.get(appointmentId).add(ws);
  
  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'connection-established',
    appointmentId: appointmentId,
    timestamp: new Date().toISOString()
  }));
  
  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Message received:', message.type);
      
      // Broadcast to other connections in the same appointment
      connections.get(appointmentId).forEach(connection => {
        if (connection !== ws && connection.readyState === WebSocket.OPEN) {
          connection.send(JSON.stringify(message));
        }
      });
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });
  
  // Handle WebSocket close
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
    if (connections.has(appointmentId)) {
      connections.get(appointmentId).delete(ws);
      if (connections.get(appointmentId).size === 0) {
        connections.delete(appointmentId);
      }
    }
  });
  
  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
};

// Handle audio signaling connections
audioWss.on('connection', (ws, req) => {
  handleConnection(ws, req, 'audio');
});

// Handle chat signaling connections
chatWss.on('connection', (ws, req) => {
  handleConnection(ws, req, 'chat');
});

// Health check endpoint
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      services: ['audio-signaling', 'chat-signaling'],
      activeConnections: connections.size,
      totalConnections: Array.from(connections.values()).reduce((sum, conns) => sum + conns.size, 0),
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
  console.log(`🚀 Simple WebRTC Signaling Server running on port ${PORT}`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}/audio-signaling`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});
