const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const axios = require('axios');

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: connections.size,
      totalConnections: totalConnections,
      activeCallSessions: callSessions.size,
      uptime: process.uptime()
    }));
    return;
  }

  if (path === '/call-signaling') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebRTC Call Signaling Server - WebSocket endpoint available');
    return;
  }

  if (path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebRTC Call Signaling Server - Ready for audio and video calls!');
    return;
  }

  // 404 for other paths
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('WebRTC Call Signaling Server - Not Found');
});

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
let totalConnections = 0;

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
    console.error('❌ [API Call Error]', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const urlParts = url.parse(req.url, true);
  const appointmentId = urlParts.query.appointmentId;
  const userId = urlParts.query.userId;
  const userType = urlParts.query.userType || 'patient';

  if (!appointmentId || !userId) {
    console.log('❌ [WebSocket] Missing appointmentId or userId');
    ws.close(1008, 'Missing appointmentId or userId');
    return;
  }

  console.log(`🔗 [WebSocket] New connection: ${userType} ${userId} for appointment ${appointmentId}`);
  
  totalConnections++;
  connections.set(ws, { appointmentId, userId, userType });
  userConnections.set(userId, ws);

  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'connection-established',
    appointmentId,
    userId,
    userType,
    timestamp: new Date().toISOString()
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`📨 [WebSocket] Received: ${data.type} from ${userType} ${userId}`);

      switch (data.type) {
        case 'offer':
          await handleOffer(ws, data, appointmentId, userId, userType);
          break;
        case 'answer':
          await handleAnswer(ws, data, appointmentId, userId, userType);
          break;
        case 'ice-candidate':
          await handleIceCandidate(ws, data, appointmentId, userId, userType);
          break;
        case 'call-answered':
          await handleCallAnswered(ws, data, appointmentId, userId, userType);
          break;
        case 'call-rejected':
          await handleCallRejected(ws, data, appointmentId, userId, userType);
          break;
        case 'call-ended':
          await handleCallEnded(ws, data, appointmentId, userId, userType);
          break;
        case 'call-timeout':
          await handleCallTimeout(ws, data, appointmentId, userId, userType);
          break;
        default:
          console.log(`⚠️ [WebSocket] Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('❌ [WebSocket] Message parsing error:', error);
    }
  });

  ws.on('close', () => {
    console.log(`🔌 [WebSocket] Connection closed: ${userType} ${userId}`);
    connections.delete(ws);
    userConnections.delete(userId);
    
    // Clean up call session if this was the last participant
    if (callSessions.has(appointmentId)) {
      const session = callSessions.get(appointmentId);
      if (session.participants.has(userId)) {
        session.participants.delete(userId);
        if (session.participants.size === 0) {
          callSessions.delete(appointmentId);
          console.log(`🗑️ [Call Session] Cleaned up session for appointment ${appointmentId}`);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('❌ [WebSocket] Error:', error);
  });
});

// Handle WebRTC offer
async function handleOffer(ws, data, appointmentId, userId, userType) {
  console.log(`📞 [Offer] ${userType} ${userId} sending offer for appointment ${appointmentId}`);
  
  // Store the offer
  if (!callSessions.has(appointmentId)) {
    callSessions.set(appointmentId, {
      participants: new Map(),
      offers: new Map(),
      answers: new Map(),
      iceCandidates: new Map()
    });
  }
  
  const session = callSessions.get(appointmentId);
  session.participants.set(userId, { ws, userType });
  session.offers.set(userId, data.offer);

  // Forward offer to other participants
  for (const [participantId, participant] of session.participants) {
    if (participantId !== userId) {
      participant.ws.send(JSON.stringify({
        type: 'offer',
        from: userId,
        fromType: userType,
        offer: data.offer,
        appointmentId,
        timestamp: new Date().toISOString()
      }));
    }
  }
}

// Handle WebRTC answer
async function handleAnswer(ws, data, appointmentId, userId, userType) {
  console.log(`📞 [Answer] ${userType} ${userId} sending answer for appointment ${appointmentId}`);
  
  const session = callSessions.get(appointmentId);
  if (session) {
    session.answers.set(userId, data.answer);

    // Forward answer to other participants
    for (const [participantId, participant] of session.participants) {
      if (participantId !== userId) {
        participant.ws.send(JSON.stringify({
          type: 'answer',
          from: userId,
          fromType: userType,
          answer: data.answer,
          appointmentId,
          timestamp: new Date().toISOString()
        }));
      }
    }
  }
}

// Handle ICE candidate
async function handleIceCandidate(ws, data, appointmentId, userId, userType) {
  console.log(`🧊 [ICE] ${userType} ${userId} sending ICE candidate for appointment ${appointmentId}`);
  
  const session = callSessions.get(appointmentId);
  if (session) {
    if (!session.iceCandidates.has(userId)) {
      session.iceCandidates.set(userId, []);
    }
    session.iceCandidates.get(userId).push(data.candidate);

    // Forward ICE candidate to other participants
    for (const [participantId, participant] of session.participants) {
      if (participantId !== userId) {
        participant.ws.send(JSON.stringify({
          type: 'ice-candidate',
          from: userId,
          fromType: userType,
          candidate: data.candidate,
          appointmentId,
          timestamp: new Date().toISOString()
        }));
      }
    }
  }
}

// Handle call answered
async function handleCallAnswered(ws, data, appointmentId, userId, userType) {
  console.log(`✅ [Call Answered] ${userType} ${userId} answered call for appointment ${appointmentId}`);
  
  // Notify all participants
  const session = callSessions.get(appointmentId);
  if (session) {
    for (const [participantId, participant] of session.participants) {
      participant.ws.send(JSON.stringify({
        type: 'call-answered',
        from: userId,
        fromType: userType,
        appointmentId,
        timestamp: new Date().toISOString()
      }));
    }
  }
}

// Handle call rejected
async function handleCallRejected(ws, data, appointmentId, userId, userType) {
  console.log(`❌ [Call Rejected] ${userType} ${userId} rejected call for appointment ${appointmentId}`);
  
  // Notify all participants
  const session = callSessions.get(appointmentId);
  if (session) {
    for (const [participantId, participant] of session.participants) {
      participant.ws.send(JSON.stringify({
        type: 'call-rejected',
        from: userId,
        fromType: userType,
        appointmentId,
        timestamp: new Date().toISOString()
      }));
    }
  }
}

// Handle call ended
async function handleCallEnded(ws, data, appointmentId, userId, userType) {
  console.log(`📞 [Call Ended] ${userType} ${userId} ended call for appointment ${appointmentId}`);
  
  // Notify all participants
  const session = callSessions.get(appointmentId);
  if (session) {
    for (const [participantId, participant] of session.participants) {
      participant.ws.send(JSON.stringify({
        type: 'call-ended',
        from: userId,
        fromType: userType,
        appointmentId,
        timestamp: new Date().toISOString()
      }));
    }
  }
}

// Handle call timeout
async function handleCallTimeout(ws, data, appointmentId, userId, userType) {
  console.log(`⏰ [Call Timeout] Call timeout for appointment ${appointmentId}`);
  
  // Notify all participants
  const session = callSessions.get(appointmentId);
  if (session) {
    for (const [participantId, participant] of session.participants) {
      participant.ws.send(JSON.stringify({
        type: 'call-timeout',
        appointmentId,
        timestamp: new Date().toISOString()
      }));
    }
  }
}

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 [WebRTC Call Server] Server running on port ${PORT}`);
  console.log(`🔗 [WebRTC Call Server] WebSocket endpoint: ws://localhost:${PORT}/call-signaling`);
  console.log(`🏥 [WebRTC Call Server] Health endpoint: http://localhost:${PORT}/health`);
  console.log(`📞 [WebRTC Call Server] Ready for audio and video calls!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 [WebRTC Call Server] Shutting down gracefully...');
  server.close(() => {
    console.log('✅ [WebRTC Call Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 [WebRTC Call Server] Shutting down gracefully...');
  server.close(() => {
    console.log('✅ [WebRTC Call Server] Server closed');
    process.exit(0);
  });
});
