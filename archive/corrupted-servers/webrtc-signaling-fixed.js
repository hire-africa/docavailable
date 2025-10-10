const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');

// SSL Certificate paths
const SSL_CERT_PATH = '/etc/letsencrypt/live/docavailable.org/fullchain.pem';
const SSL_KEY_PATH = '/etc/letsencrypt/live/docavailable.org/privkey.pem';

// Create HTTPS server with SSL certificates
let server;
try {
  const sslOptions = {
    cert: fs.readFileSync(SSL_CERT_PATH),
    key: fs.readFileSync(SSL_KEY_PATH)
  };
  server = https.createServer(sslOptions);
  console.log('🔒 HTTPS server created with SSL certificates');
} catch (error) {
  console.warn('⚠️ SSL certificates not found, falling back to HTTP:', error.message);
  server = http.createServer();
}

// Store active connections by appointment ID
const connections = new Map();

// Create WebSocket server for audio signaling - COMPLETELY disable compression
const audioWss = new WebSocket.Server({ 
  server,
  path: '/audio-signaling',
  perMessageDeflate: {
    threshold: 0, // Disable compression completely
    concurrencyLimit: 0,
    memLevel: 0,
    level: 0,
    strategy: 0,
    windowBits: 0
  },
  maxPayload: 16 * 1024 * 1024, // 16MB max payload
  noServer: false
});

// Create WebSocket server for chat signaling - COMPLETELY disable compression
const chatWss = new WebSocket.Server({ 
  server,
  path: '/chat-signaling',
  perMessageDeflate: {
    threshold: 0, // Disable compression completely
    concurrencyLimit: 0,
    memLevel: 0,
    level: 0,
    strategy: 0,
    windowBits: 0
  },
  maxPayload: 16 * 1024 * 1024, // 16MB max payload
  noServer: false
});

// Helper function to safely send WebSocket messages
function safeSend(ws, message) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('⚠️ WebSocket not open, cannot send message:', message.type);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending WebSocket message:', error);
    return false;
  }
}

// Handle audio signaling connections
audioWss.on('connection', (ws, request) => {
  console.log('🔌 [Audio] New audio WebSocket connection');
  
  const urlParts = url.parse(request.url, true);
  const appointmentId = urlParts.query.appointmentId;
  const userId = urlParts.query.userId;
  
  if (!appointmentId || !userId) {
    console.log('❌ No appointment ID or user ID provided');
    ws.close(1000, 'Missing appointment ID or user ID');
    return;
  }

  console.log(`🔌 New WebSocket connection established`);
  console.log(`📞 Connection for appointment: ${appointmentId}`);
  console.log(`👤 User ID: ${userId}`);

  // Store connection
  if (!connections.has(appointmentId)) {
    connections.set(appointmentId, []);
  }
  connections.get(appointmentId).push(ws);

  // Send connection established message
  const connectionMessage = {
    type: 'connection-established',
    appointmentId: appointmentId,
    timestamp: new Date().toISOString()
  };
  
  console.log('📤 Sending connection established message');
  safeSend(ws, connectionMessage);

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 [Audio] Received message: ${message.type} from user: ${userId}`);
      console.log(`📨 Message details:`, {
        type: message.type,
        hasOffer: !!message.offer,
        hasAnswer: !!message.answer,
        hasCandidate: !!message.candidate
      });
      
      // Add appointment and user info to the message
      const fullMessage = {
        ...message,
        appointmentId: appointmentId,
        userId: userId,
        timestamp: new Date().toISOString()
      };
      
      broadcastToOthers(ws, appointmentId, fullMessage);
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 Connection closed for appointment ${appointmentId}: ${code}`);
    
    // Remove connection from storage
    const appointmentConnections = connections.get(appointmentId) || [];
    const index = appointmentConnections.indexOf(ws);
    if (index > -1) {
      appointmentConnections.splice(index, 1);
    }
    
    if (appointmentConnections.length === 0) {
      connections.delete(appointmentId);
      console.log(`🧹 Cleaned up connections for appointment ${appointmentId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Handle chat signaling connections
chatWss.on('connection', (ws, request) => {
  console.log('🔌 [Chat] New chat WebSocket connection');
  
  const urlParts = url.parse(request.url, true);
  const appointmentId = urlParts.query.appointmentId;
  const userId = urlParts.query.userId;
  
  if (!appointmentId || !userId) {
    console.log('❌ No appointment ID or user ID provided');
    ws.close(1000, 'Missing appointment ID or user ID');
    return;
  }

  console.log(`🔌 New chat WebSocket connection established`);
  console.log(`📞 Chat connection for appointment: ${appointmentId}`);
  console.log(`👤 User ID: ${userId}`);

  // Store connection
  if (!connections.has(appointmentId)) {
    connections.set(appointmentId, []);
  }
  connections.get(appointmentId).push(ws);

  // Send connection established message
  const connectionMessage = {
    type: 'connection-established',
    appointmentId: appointmentId,
    timestamp: new Date().toISOString()
  };
  
  console.log('📤 Sending chat connection established message');
  safeSend(ws, connectionMessage);

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 [Chat] Received message: ${message.type} from user: ${userId}`);
      
      // Add appointment and user info to the message
      const fullMessage = {
        ...message,
        appointmentId: appointmentId,
        userId: userId,
        timestamp: new Date().toISOString()
      };
      
      broadcastToOthers(ws, appointmentId, fullMessage);
    } catch (error) {
      console.error('❌ Error parsing chat message:', error);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 Chat connection closed for appointment ${appointmentId}: ${code}`);
    
    // Remove connection from storage
    const appointmentConnections = connections.get(appointmentId) || [];
    const index = appointmentConnections.indexOf(ws);
    if (index > -1) {
      appointmentConnections.splice(index, 1);
    }
    
    if (appointmentConnections.length === 0) {
      connections.delete(appointmentId);
      console.log(`🧹 Cleaned up chat connections for appointment ${appointmentId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ Chat WebSocket error:', error);
  });
});

// Broadcast message to other participants
function broadcastToOthers(senderWs, appointmentId, data) {
  const appointmentConnections = connections.get(appointmentId) || [];
  console.log(`📤 [Broadcast] Total connections for appointment ${appointmentId}: ${appointmentConnections.length}`);
  console.log(`📤 [Broadcast] Broadcasting message type: ${data.type}`);
  
  let sentCount = 0;
  appointmentConnections.forEach((connection, index) => {
    if (connection !== senderWs && connection.readyState === WebSocket.OPEN) {
      try {
        console.log(`📤 [Broadcast] Sending ${data.type} to connection ${index + 1}`);
        safeSend(connection, data);
        sentCount++;
      } catch (error) {
        console.error(`❌ [Broadcast] Error sending to connection ${index + 1}:`, error);
      }
    } else if (connection === senderWs) {
      console.log(`📤 [Broadcast] Skipped sender connection ${index + 1}`);
    } else {
      console.log(`📤 [Broadcast] Skipped closed connection ${index + 1} (readyState: ${connection.readyState})`);
    }
  });
  console.log(`📤 [Broadcast] Sent to ${sentCount} other participants`);
}

// Health check endpoint
server.on('request', (req, res) => {
  if (req.url === '/health') {
    const totalConnections = Array.from(connections.values()).reduce((sum, conns) => sum + conns.length, 0);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      activeConnections: connections.size,
      totalConnections: totalConnections,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Start server
const PORT = process.env.WEBRTC_SIGNALING_PORT || 8080;
const PROTOCOL = server instanceof https.Server ? 'https' : 'http';
const WS_PROTOCOL = server instanceof https.Server ? 'wss' : 'ws';

server.listen(PORT, () => {
  console.log(`🚀 WebRTC Signaling Server running on port ${PORT} (${PROTOCOL.toUpperCase()})`);
  console.log(`📡 Audio WebSocket endpoint: ${WS_PROTOCOL}://docavailable.org:${PORT}/audio-signaling`);
  console.log(`💬 Chat WebSocket endpoint: ${WS_PROTOCOL}://docavailable.org:${PORT}/chat-signaling`);
  console.log(`🏥 Health check: ${PROTOCOL}://docavailable.org:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebRTC Signaling Server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
