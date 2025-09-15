const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/audio-signaling'
});

// Store active connections by appointment ID
const connections = new Map();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection established');
  
  // Extract appointment ID from URL path
  const urlParts = url.parse(req.url, true);
  const pathParts = urlParts.pathname.split('/');
  const appointmentId = pathParts[pathParts.length - 1];
  
  if (!appointmentId) {
    console.error('❌ No appointment ID provided');
    ws.close(1000, 'Appointment ID required');
    return;
  }
  
  console.log(`📞 Connection for appointment: ${appointmentId}`);
  
  // Store connection
  if (!connections.has(appointmentId)) {
    connections.set(appointmentId, []);
  }
  connections.get(appointmentId).push(ws);
  
  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'connection-established',
    appointmentId: appointmentId,
    timestamp: new Date().toISOString()
  }));
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`📨 Message received for appointment ${appointmentId}:`, data.type);
      
      // Broadcast message to other participants in the same appointment
      const appointmentConnections = connections.get(appointmentId) || [];
      appointmentConnections.forEach(connection => {
        if (connection !== ws && connection.readyState === WebSocket.OPEN) {
          connection.send(JSON.stringify(data));
        }
      });
      
    } catch (error) {
      console.error('❌ Error parsing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });
  
  // Handle connection close
  ws.on('close', (code, reason) => {
    console.log(`🔌 Connection closed for appointment ${appointmentId}:`, code, reason.toString());
    
    // Remove connection from storage
    const appointmentConnections = connections.get(appointmentId) || [];
    const index = appointmentConnections.indexOf(ws);
    if (index > -1) {
      appointmentConnections.splice(index, 1);
    }
    
    // If no more connections for this appointment, clean up
    if (appointmentConnections.length === 0) {
      connections.delete(appointmentId);
      console.log(`🧹 Cleaned up connections for appointment ${appointmentId}`);
    } else {
      // Notify remaining participants that someone left
      appointmentConnections.forEach(connection => {
        if (connection.readyState === WebSocket.OPEN) {
          connection.send(JSON.stringify({
            type: 'participant-left',
            timestamp: new Date().toISOString()
          }));
        }
      });
    }
  });
  
  // Handle connection errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for appointment ${appointmentId}:`, error);
  });
});

// Health check endpoint
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      activeConnections: connections.size,
      totalConnections: Array.from(connections.values()).reduce((sum, conns) => sum + conns.length, 0),
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
  console.log(`🚀 WebRTC Signaling Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/audio-signaling/{appointmentId}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebRTC Signaling Server...');
  
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
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = { server, wss };
