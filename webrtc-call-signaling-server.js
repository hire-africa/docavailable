const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const axios = require('axios');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server for call signaling
const wss = new WebSocket.Server({ 
  server,
  path: '/call-signaling'
});

// Store active connections by appointment ID
const connections = new Map();
const userConnections = new Map();
const callSessions = new Map();
const processedOffers = new Map();

// Configuration
const PORT = process.env.WEBRTC_CALL_SIGNALING_PORT || 8080;
const API_BASE_URL = process.env.API_BASE_URL || 'https://docavailable.org';
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN || 'your-api-token';

console.log(`🚀 [WebRTC Call Server] Starting on port ${PORT}`);
console.log(`🔗 [WebRTC Call Server] API Base URL: ${API_BASE_URL}`);

// API call helper function
async function callLaravelAPI(endpoint, method = 'GET', data = null, authToken = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken || API_AUTH_TOKEN}`
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ [API] Error calling Laravel API:', error.message);
    return {
      success: false,
      error: error.message,
      status: error.response?.status || 500
    };
  }
}

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  console.log('🔌 [WebRTC Call] New connection established');
  
  // Parse URL to get appointment ID and user info
  const urlParts = url.parse(req.url, true);
  const pathParts = urlParts.pathname.split('/');
  let appointmentId = pathParts[pathParts.length - 1];
  
  // If no appointment ID in path, try query parameter
  if (!appointmentId || appointmentId === 'call-signaling') {
    appointmentId = urlParts.query.appointmentId;
  }
  
  const userId = urlParts.query.userId;
  const callType = urlParts.query.callType || 'audio'; // audio or video
  
  if (appointmentId && userId) {
    console.log(`📱 [WebRTC Call] Connection for appointment: ${appointmentId}, user: ${userId}, type: ${callType}`);
    
    // Store connection
    if (!connections.has(appointmentId)) {
      connections.set(appointmentId, []);
    }
    connections.get(appointmentId).push(ws);
    
    // Store connection metadata
    ws.appointmentId = appointmentId;
    ws.userId = userId;
    ws.callType = callType;
    ws.authToken = urlParts.query.authToken || API_AUTH_TOKEN;
    
    // Store user connection mapping
    userConnections.set(ws, { appointmentId, userId, callType });
    
    // Send connection established message
    ws.send(JSON.stringify({
      type: 'connection-established',
      appointmentId: appointmentId,
      userId: userId,
      callType: callType,
      timestamp: new Date().toISOString()
    }));
    
    console.log(`✅ [WebRTC Call] Connection established for ${callType} call`);
  } else {
    console.error('❌ [WebRTC Call] Missing appointmentId or userId');
    ws.close(1008, 'Missing appointmentId or userId');
    return;
  }
  
  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`📨 [WebRTC Call] Received message type: ${message.type}`);
      
      switch (message.type) {
        case 'offer':
          await handleOffer(appointmentId, message, ws);
          break;
          
        case 'answer':
          await handleAnswer(appointmentId, message, ws);
          break;
          
        case 'ice-candidate':
          await handleIceCandidate(appointmentId, message, ws);
          break;
          
        case 'call-answered':
          await handleCallAnswered(appointmentId, message, ws);
          break;
          
        case 'call-rejected':
          await handleCallRejected(appointmentId, message, ws);
          break;
          
        case 'call-ended':
          await handleCallEnded(appointmentId, message, ws);
          break;
          
        case 'call-timeout':
          await handleCallTimeout(appointmentId, message, ws);
          break;
          
        case 'call-started':
          await handleCallStarted(appointmentId, message, ws);
          break;
          
        case 'media-toggle':
          await handleMediaToggle(appointmentId, message, ws);
          break;
          
        case 'camera-switch':
          await handleCameraSwitch(appointmentId, message, ws);
          break;
          
        default:
          console.log(`⚠️ [WebRTC Call] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('❌ [WebRTC Call] Error processing message:', error);
    }
  });
  
  // Handle connection close
  ws.on('close', (code, reason) => {
    console.log(`🔌 [WebRTC Call] Connection closed: ${code} - ${reason}`);
    cleanupConnection(ws);
  });
  
  // Handle connection error
  ws.on('error', (error) => {
    console.error('❌ [WebRTC Call] WebSocket error:', error);
    cleanupConnection(ws);
  });
});

// Handle WebRTC offer
async function handleOffer(appointmentId, message, ws) {
  try {
    console.log(`📞 [WebRTC Call] Processing offer for appointment: ${appointmentId}`);
    console.log(`📞 [WebRTC Call] Offer details:`, {
      senderId: message.senderId || message.userId,
      hasOffer: !!message.offer,
      offerType: message.offer?.type,
      appointmentId: appointmentId,
      callType: message.callType || 'audio'
    });
    
    // Check for duplicate offers
    const offerKey = `${appointmentId}-${message.senderId || message.userId}-${message.offer?.type}`;
    if (processedOffers.has(offerKey)) {
      console.log(`⚠️ [WebRTC Call] Duplicate offer detected, ignoring: ${offerKey}`);
      return;
    }
    processedOffers.set(offerKey, true);
    
    // Store call session
    const callSession = {
      appointmentId,
      callerId: message.senderId || message.userId,
      callType: message.callType || 'audio',
      startTime: new Date().toISOString(),
      status: 'ringing'
    };
    callSessions.set(appointmentId, callSession);
    
    // Broadcast offer to other participants
    broadcastToOthers(ws, appointmentId, message);
    
    // Send global incoming call notification
    await sendGlobalIncomingCallNotification(appointmentId, {
      type: 'incoming_call_notification',
      appointmentId: appointmentId,
      callerId: message.senderId || message.userId,
      callType: message.callType || 'audio',
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ [WebRTC Call] Offer processed and broadcasted`);
  } catch (error) {
    console.error('❌ [WebRTC Call] Error handling offer:', error);
  }
}

// Handle WebRTC answer
async function handleAnswer(appointmentId, message, ws) {
  try {
    console.log(`📞 [WebRTC Call] Processing answer for appointment: ${appointmentId}`);
    console.log(`📞 [WebRTC Call] Answer details:`, {
      senderId: message.senderId || message.userId,
      hasAnswer: !!message.answer,
      answerType: message.answer?.type,
      appointmentId: appointmentId
    });
    
    // Update call session
    const callSession = callSessions.get(appointmentId);
    if (callSession) {
      callSession.status = 'answered';
      callSession.answerTime = new Date().toISOString();
    }
    
    // Broadcast answer to other participants
    broadcastToOthers(ws, appointmentId, message);
    
    console.log(`✅ [WebRTC Call] Answer processed and broadcasted`);
  } catch (error) {
    console.error('❌ [WebRTC Call] Error handling answer:', error);
  }
}

// Handle ICE candidate
async function handleIceCandidate(appointmentId, message, ws) {
  try {
    console.log(`📞 [WebRTC Call] Processing ICE candidate for appointment: ${appointmentId}`);
    console.log(`📞 [WebRTC Call] ICE candidate details:`, {
      senderId: message.senderId || message.userId,
      hasCandidate: !!message.candidate,
      appointmentId: appointmentId
    });
    
    // Broadcast ICE candidate to other participants
    broadcastToOthers(ws, appointmentId, message);
    
    console.log(`✅ [WebRTC Call] ICE candidate processed and broadcasted`);
  } catch (error) {
    console.error('❌ [WebRTC Call] Error handling ICE candidate:', error);
  }
}

// Handle call answered
async function handleCallAnswered(appointmentId, message, ws) {
  try {
    console.log(`📞 [WebRTC Call] Call answered for appointment: ${appointmentId}`);
    
    const callSession = callSessions.get(appointmentId);
    if (callSession) {
      callSession.status = 'answered';
      callSession.answerTime = new Date().toISOString();
    }
    
    // Broadcast to all participants
    broadcastToAll(appointmentId, message);
    
    console.log(`✅ [WebRTC Call] Call answered broadcasted`);
  } catch (error) {
    console.error('❌ [WebRTC Call] Error handling call answered:', error);
  }
}

// Handle call rejected
async function handleCallRejected(appointmentId, message, ws) {
  try {
    console.log(`📞 [WebRTC Call] Call rejected for appointment: ${appointmentId}`);
    
    const callSession = callSessions.get(appointmentId);
    if (callSession) {
      callSession.status = 'rejected';
      callSession.endTime = new Date().toISOString();
    }
    
    // Broadcast to all participants
    broadcastToAll(appointmentId, message);
    
    console.log(`✅ [WebRTC Call] Call rejected broadcasted`);
  } catch (error) {
    console.error('❌ [WebRTC Call] Error handling call rejected:', error);
  }
}

// Handle call ended
async function handleCallEnded(appointmentId, message, ws) {
  try {
    console.log(`📞 [WebRTC Call] Call ended for appointment: ${appointmentId}`);
    
    const callSession = callSessions.get(appointmentId);
    if (callSession) {
      callSession.status = 'ended';
      callSession.endTime = new Date().toISOString();
    }
    
    // Broadcast to all participants
    broadcastToAll(appointmentId, message);
    
    // Clean up call session
    callSessions.delete(appointmentId);
    
    console.log(`✅ [WebRTC Call] Call ended broadcasted`);
  } catch (error) {
    console.error('❌ [WebRTC Call] Error handling call ended:', error);
  }
}

// Handle call timeout
async function handleCallTimeout(appointmentId, message, ws) {
  try {
    console.log(`📞 [WebRTC Call] Call timeout for appointment: ${appointmentId}`);
    
    const callSession = callSessions.get(appointmentId);
    if (callSession) {
      callSession.status = 'timeout';
      callSession.endTime = new Date().toISOString();
    }
    
    // Broadcast to all participants
    broadcastToAll(appointmentId, message);
    
    // Clean up call session
    callSessions.delete(appointmentId);
    
    console.log(`✅ [WebRTC Call] Call timeout broadcasted`);
  } catch (error) {
    console.error('❌ [WebRTC Call] Error handling call timeout:', error);
  }
}

// Handle call started
async function handleCallStarted(appointmentId, message, ws) {
  try {
    console.log(`📞 [WebRTC Call] Call started for appointment: ${appointmentId}`);
    
    const callSession = callSessions.get(appointmentId);
    if (callSession) {
      callSession.status = 'active';
      callSession.startTime = new Date().toISOString();
    }
    
    // Broadcast to all participants
    broadcastToAll(appointmentId, message);
    
    console.log(`✅ [WebRTC Call] Call started broadcasted`);
  } catch (error) {
    console.error('❌ [WebRTC Call] Error handling call started:', error);
  }
}

// Handle media toggle (mute/unmute, video on/off)
async function handleMediaToggle(appointmentId, message, ws) {
  try {
    console.log(`📞 [WebRTC Call] Media toggle for appointment: ${appointmentId}`, {
      mediaType: message.mediaType,
      enabled: message.enabled,
      senderId: message.senderId || message.userId
    });
    
    // Broadcast to other participants
    broadcastToOthers(ws, appointmentId, message);
    
    console.log(`✅ [WebRTC Call] Media toggle broadcasted`);
  } catch (error) {
    console.error('❌ [WebRTC Call] Error handling media toggle:', error);
  }
}

// Handle camera switch
async function handleCameraSwitch(appointmentId, message, ws) {
  try {
    console.log(`📞 [WebRTC Call] Camera switch for appointment: ${appointmentId}`, {
      cameraType: message.cameraType,
      senderId: message.senderId || message.userId
    });
    
    // Broadcast to other participants
    broadcastToOthers(ws, appointmentId, message);
    
    console.log(`✅ [WebRTC Call] Camera switch broadcasted`);
  } catch (error) {
    console.error('❌ [WebRTC Call] Error handling camera switch:', error);
  }
}

// Send global incoming call notification
async function sendGlobalIncomingCallNotification(appointmentId, data) {
  try {
    console.log(`📢 [WebRTC Call] Sending global incoming call notification for appointment: ${appointmentId}`);
    
    // Get all connections for this appointment
    const appointmentConnections = connections.get(appointmentId) || [];
    
    // Broadcast to all connections
    appointmentConnections.forEach(connection => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify(data));
        console.log(`📢 [WebRTC Call] Notification sent to connection`);
      }
    });
    
    console.log(`✅ [WebRTC Call] Global notification sent to ${appointmentConnections.length} connections`);
  } catch (error) {
    console.error('❌ [WebRTC Call] Error sending global notification:', error);
  }
}

// Broadcast message to other participants (excluding sender)
function broadcastToOthers(senderWs, appointmentId, message) {
  try {
    const appointmentConnections = connections.get(appointmentId) || [];
    let sentCount = 0;
    
    appointmentConnections.forEach(connection => {
      if (connection !== senderWs && connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify(message));
        sentCount++;
      }
    });
    
    console.log(`📤 [WebRTC Call] Message broadcasted to ${sentCount} other participants`);
  } catch (error) {
    console.error('❌ [WebRTC Call] Error broadcasting to others:', error);
  }
}

// Broadcast message to all participants
function broadcastToAll(appointmentId, message) {
  try {
    const appointmentConnections = connections.get(appointmentId) || [];
    let sentCount = 0;
    
    appointmentConnections.forEach(connection => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify(message));
        sentCount++;
      }
    });
    
    console.log(`📤 [WebRTC Call] Message broadcasted to all ${sentCount} participants`);
  } catch (error) {
    console.error('❌ [WebRTC Call] Error broadcasting to all:', error);
  }
}

// Clean up connection
function cleanupConnection(ws) {
  try {
    const userInfo = userConnections.get(ws);
    if (userInfo) {
      const { appointmentId } = userInfo;
      
      // Remove from connections
      const appointmentConnections = connections.get(appointmentId);
      if (appointmentConnections) {
        const index = appointmentConnections.indexOf(ws);
        if (index > -1) {
          appointmentConnections.splice(index, 1);
        }
        
        // If no more connections, clean up appointment
        if (appointmentConnections.length === 0) {
          connections.delete(appointmentId);
          callSessions.delete(appointmentId);
        }
      }
      
      // Remove from user connections
      userConnections.delete(ws);
      
      console.log(`🧹 [WebRTC Call] Connection cleaned up for appointment: ${appointmentId}`);
    }
  } catch (error) {
    console.error('❌ [WebRTC Call] Error cleaning up connection:', error);
  }
}

// Health check endpoint
server.on('request', (req, res) => {
  if (req.url === '/health') {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: connections.size,
      totalConnections: Array.from(connections.values()).reduce((total, conns) => total + conns.length, 0),
      activeCallSessions: callSessions.size,
      uptime: process.uptime()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthData));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('WebRTC Call Signaling Server - Not Found');
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 [WebRTC Call Server] Server running on port ${PORT}`);
  console.log(`🔗 [WebRTC Call Server] WebSocket endpoint: ws://localhost:${PORT}/call-signaling`);
  console.log(`🏥 [WebRTC Call Server] Health endpoint: http://localhost:${PORT}/health`);
  console.log(`📞 [WebRTC Call Server] Ready for audio and video calls!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 [WebRTC Call Server] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ [WebRTC Call Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 [WebRTC Call Server] SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ [WebRTC Call Server] Server closed');
    process.exit(0);
  });
});

module.exports = { server, wss };
