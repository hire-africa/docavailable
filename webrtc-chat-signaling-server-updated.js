const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const axios = require('axios');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server for chat signaling
const wss = new WebSocket.Server({ 
  server,
  path: '/chat-signaling'
});

// Store active connections by appointment ID
const connections = new Map();
const userConnections = new Map(); // Track users by connection

// Configuration
const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'https://docavailable-3vbdv.ondigitalocean.app';
const API_TIMEOUT = 10000; // 10 seconds

// Helper function to make API calls to Laravel backend
async function callLaravelAPI(endpoint, method = 'GET', data = null, authToken = null) {
  try {
    const config = {
      method,
      url: `${LARAVEL_API_URL}${endpoint}`,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    // Add authentication header if token is provided
    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Laravel API Error:', error.message);
    return { 
      success: false, 
      error: error.message,
      status: error.response?.status || 500
    };
  }
}

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  console.log('🔌 New WebRTC Chat connection established');
  
  // Parse URL to get appointment ID
  const urlParts = url.parse(req.url, true);
  const pathParts = urlParts.pathname.split('/');
  let appointmentId = pathParts[pathParts.length - 1];
  
  // If no appointment ID in path, try query parameter
  if (!appointmentId || appointmentId === 'audio-signaling' || appointmentId === 'chat-signaling') {
    appointmentId = urlParts.query.appointmentId;
  }
  
  if (appointmentId) {
    console.log(`📱 Chat connection for appointment: ${appointmentId}`);
    
    // Store connection
    if (!connections.has(appointmentId)) {
      connections.set(appointmentId, []);
    }
    connections.get(appointmentId).push(ws);
    
    // Store auth token in connection metadata
    ws.authToken = urlParts.query.authToken || process.env.API_AUTH_TOKEN || 'your-api-token';
    
    // Store user connection mapping
    userConnections.set(ws, { appointmentId, userId: urlParts.query.userId });
    
    // Send connection established message
    ws.send(JSON.stringify({
      type: 'connection-established',
      appointmentId: appointmentId,
      timestamp: new Date().toISOString()
    }));
  }
  
  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`📨 Chat message received for appointment ${appointmentId}: ${message.type}`);
      
      switch (message.type) {
        case 'chat-message':
          // Handle chat messages and session management
          handleChatMessage(appointmentId, message, ws);
          break;
          
        case 'session-status-request':
          // Handle session status requests
          console.log(`🔍 [Backend] Received session-status-request for appointment: ${appointmentId}`);
          handleSessionStatusRequest(appointmentId, ws);
          break;
          
        case 'session-end-request':
          // Handle manual session ending
          handleSessionEndRequest(appointmentId, message, ws);
          break;
          
        case 'appointment-start-request':
          // Handle appointment session start
          handleAppointmentStartRequest(appointmentId, message, ws);
          break;
          
        case 'typing-indicator':
          // Handle typing indicators - add sender ID
          const typingData = {
            ...message,
            senderId: message.senderId || getUserIdFromConnection(ws)
          };
          broadcastToOthers(ws, appointmentId, typingData);
          break;
          
        default:
          console.log(`📨 Unhandled message type: ${message.type}`);
          break;
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  });
  
  // Handle connection close
  ws.on('close', (code, reason) => {
    console.log(`🔌 Chat connection closed for appointment ${appointmentId}: ${code} ${reason || 'Normal closure'}`);
    
    // Remove from connections
    if (appointmentId && connections.has(appointmentId)) {
      const appointmentConnections = connections.get(appointmentId);
      const index = appointmentConnections.indexOf(ws);
      if (index > -1) {
        appointmentConnections.splice(index, 1);
      }
      
      // Clean up empty appointment connections
      if (appointmentConnections.length === 0) {
        connections.delete(appointmentId);
        console.log(`🧹 Cleaned up chat connections for appointment ${appointmentId}`);
      }
    }
    
    // Remove from user connections
    userConnections.delete(ws);
  });
  
  // Handle connection errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Handle chat messages
async function handleChatMessage(appointmentId, message, ws) {
  try {
    console.log(`📨 Processing chat message for appointment: ${appointmentId}`);
    
    // Get auth token from connection metadata
    const authToken = ws.authToken || process.env.API_AUTH_TOKEN || 'your-api-token';
    
    // Send message to Laravel backend
    const response = await callLaravelAPI(`/api/chat/${appointmentId}/messages`, 'POST', {
      message: message.content,
      sender_id: message.senderId || getUserIdFromConnection(ws),
      message_type: message.messageType || 'text'
    }, authToken);
    
    if (response.success) {
      console.log(`📨 Broadcasting chat message: ${response.data.data.id}`);
      
      // Broadcast to all other connections for this appointment
      broadcastToOthers(ws, appointmentId, {
        type: 'chat-message',
        message: response.data.data
      });
      
      // Also broadcast to all connections for instant session detection
      console.log(`📤 [Backend] Broadcasting message to all connections for instant session detection`);
      console.log(`📤 [Backend] Total connections for appointment ${appointmentId}: ${connections.get(appointmentId)?.length || 0}`);
      
      // Broadcast to all connections for instant session detection
      const allConnections = connections.get(appointmentId) || [];
      let sentCount = 0;
      allConnections.forEach((connection, index) => {
        if (connection.readyState === WebSocket.OPEN) {
          connection.send(JSON.stringify({
            type: 'chat-message',
            message: response.data.data
          }));
          sentCount++;
          console.log(`📤 [Backend] Sent to connection ${index + 1}`);
        } else {
          console.log(`📤 [Backend] Skipped closed connection ${index + 1}`);
        }
      });
      console.log(`📤 [Backend] Sent to ${sentCount} connections total for instant session detection`);
      
      console.log(`✅ Chat message broadcasted: ${response.data.data.id}`);
    } else {
      console.error('❌ Failed to save chat message:', response.error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to save message'
      }));
    }
  } catch (error) {
    console.error('❌ Error handling chat message:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Internal server error'
    }));
  }
}

// Handle session status requests
async function handleSessionStatusRequest(appointmentId, ws) {
  try {
    console.log(`🔍 [Backend] Session status request received for appointment: ${appointmentId}`);
    // Get auth token from connection metadata
    const authToken = ws.authToken || process.env.API_AUTH_TOKEN || 'your-api-token';
    console.log(`🔑 [Backend] Auth token for session status request:`, authToken ? 'Present' : 'Missing');
    
    if (appointmentId.startsWith('text_session_')) {
      // Handle text session status
      const sessionId = appointmentId.replace('text_session_', '');
      
      const response = await axios.get(`${LARAVEL_API_URL}/api/text-sessions/${sessionId}/check-response`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        console.log(`✅ [Backend] Text session status API response successful for session ${sessionId}`);
        // Also check for existing messages to determine if patient has sent a message
        const messagesResponse = await axios.get(`${LARAVEL_API_URL}/api/chat/${appointmentId}/messages`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`📨 [Backend] Messages API response for ${appointmentId}:`, messagesResponse.data.success ? 'Success' : 'Failed');
        
        const hasPatientMessage = messagesResponse.data.success && 
          messagesResponse.data.data.some(msg => msg.sender_id !== response.data.data.doctor.id);
        const hasDoctorResponse = messagesResponse.data.success && 
          messagesResponse.data.data.some(msg => msg.sender_id === response.data.data.doctor.id);
        
        console.log(`👤 [Backend] Message analysis: hasPatientMessage=${hasPatientMessage}, hasDoctorResponse=${hasDoctorResponse}`);
        
        const responseData = {
          type: 'session-status-response',
          sessionType: 'instant',
          sessionData: response.data.data,
          hasPatientMessage: hasPatientMessage,
          hasDoctorResponse: hasDoctorResponse
        };
        
        console.log(`📤 [Backend] Sending session status response:`, responseData);
        ws.send(JSON.stringify(responseData));
        console.log(`✅ [Backend] Session status response sent successfully`);
      } else {
        console.log(`❌ [Backend] Text session status API response failed for session ${sessionId}`);
      }
    } else {
      // Handle appointment status
      const response = await axios.get(`${LARAVEL_API_URL}/api/appointments/${appointmentId}/status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        ws.send(JSON.stringify({
          type: 'session-status',
          sessionType: 'appointment',
          sessionData: response.data.data
        }));
      }
    }
  } catch (error) {
    console.error('❌ Error getting session status:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to get session status'
    }));
  }
}

// Handle session end requests
async function handleSessionEndRequest(appointmentId, message, ws) {
  try {
    console.log(`🛑 Session end request for appointment: ${appointmentId}`);
    
    // Get auth token from connection metadata
    const authToken = ws.authToken || process.env.API_AUTH_TOKEN || 'your-api-token';
    
    // Call Laravel API to end session
    const response = await callLaravelAPI(`/api/chat/${appointmentId}/end`, 'POST', {
      reason: message.reason || 'manual_end'
    }, authToken);
    
    if (response.success) {
      // Broadcast session end to all connections
      broadcastToAll(appointmentId, {
        type: 'session-ended',
        reason: message.reason || 'manual_end',
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Session ended successfully for appointment: ${appointmentId}`);
    } else {
      console.error('❌ Failed to end session:', response.error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to end session'
      }));
    }
  } catch (error) {
    console.error('❌ Error ending session:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Internal server error'
    }));
  }
}

// Handle appointment start requests
async function handleAppointmentStartRequest(appointmentId, message, ws) {
  try {
    console.log(`🚀 Appointment start request for appointment: ${appointmentId}`);
    
    // Get auth token from connection metadata
    const authToken = ws.authToken || process.env.API_AUTH_TOKEN || 'your-api-token';
    
    // Call Laravel API to start appointment
    const response = await callLaravelAPI(`/api/appointments/${appointmentId}/start`, 'POST', {
      started_at: new Date().toISOString()
    }, authToken);
    
    if (response.success) {
      // Broadcast appointment started to all connections
      broadcastToAll(appointmentId, {
        type: 'appointment-started',
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Appointment started successfully: ${appointmentId}`);
    } else {
      console.error('❌ Failed to start appointment:', response.error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to start appointment'
      }));
    }
  } catch (error) {
    console.error('❌ Error starting appointment:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Internal server error'
    }));
  }
}

// Broadcast message to all other connections for the same appointment
function broadcastToOthers(senderWs, appointmentId, message) {
  const appointmentConnections = connections.get(appointmentId) || [];
  let sentCount = 0;
  
  appointmentConnections.forEach((ws) => {
    if (ws !== senderWs && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      sentCount++;
    }
  });
  
  console.log(`📤 Broadcasted to ${sentCount} other connections for appointment ${appointmentId}`);
}

// Broadcast message to all connections for the same appointment
function broadcastToAll(appointmentId, message) {
  const appointmentConnections = connections.get(appointmentId) || [];
  let sentCount = 0;
  
  appointmentConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      sentCount++;
    }
  });
  
  console.log(`📤 Broadcasted to ${sentCount} connections for appointment ${appointmentId}`);
}

// Get user ID from connection
function getUserIdFromConnection(ws) {
  const userConnection = userConnections.get(ws);
  return userConnection ? userConnection.userId : null;
}

// Health check endpoint
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: connections.size,
      totalConnections: Array.from(connections.values()).reduce((sum, conns) => sum + conns.length, 0)
    }));
  } else if (req.url === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      appointments: Array.from(connections.keys()),
      connections: Object.fromEntries(connections),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start server
const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`🚀 WebRTC Chat Signaling Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/chat-signaling/{appointmentId}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Stats: http://localhost:${PORT}/stats`);
  console.log(`🌐 Laravel API: ${LARAVEL_API_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down WebRTC Chat Signaling Server...');
  server.close(() => {
    console.log('✅ Chat signaling server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down WebRTC Chat Signaling Server...');
  server.close(() => {
    console.log('✅ Chat signaling server closed');
    process.exit(0);
  });
});
