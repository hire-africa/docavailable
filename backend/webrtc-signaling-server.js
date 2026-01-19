#!/usr/bin/env node

/**
 * Unified WebRTC Signaling Server
 * Clean, production-ready WebSocket server for DocAvailable
 * Handles both audio and chat signaling with proper error handling
 */

const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');
const axios = require('axios');

// Configuration
const CONFIG = {
  PORT: process.env.WEBRTC_SIGNALING_PORT || 8080,
  API_BASE_URL: process.env.API_BASE_URL || 'https://docavailable-3vbdv.ondigitalocean.app',
  API_AUTH_TOKEN: process.env.API_AUTH_TOKEN || 'your-api-token',
  SSL_CERT_PATH: '/etc/letsencrypt/live/docavailable.org/fullchain.pem',
  SSL_KEY_PATH: '/etc/letsencrypt/live/docavailable.org/privkey.pem',
  MAX_PAYLOAD: 16 * 1024 * 1024, // 16MB
  PING_INTERVAL: 30000, // 30 seconds
  PONG_TIMEOUT: 5000, // 5 seconds
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  MAX_RECONNECT_ATTEMPTS: 5
};

// Global state
const connections = new Map(); // appointmentId -> Set of WebSocket connections
const sessionTimers = new Map(); // sessionId -> timer
const processedOffers = new Map(); // offerKey -> timestamp

// Create HTTP/HTTPS server
let server;
let isHTTPS = false;

try {
  // Try to create HTTPS server with SSL certificates
  if (fs.existsSync(CONFIG.SSL_CERT_PATH) && fs.existsSync(CONFIG.SSL_KEY_PATH)) {
    const sslOptions = {
      cert: fs.readFileSync(CONFIG.SSL_CERT_PATH),
      key: fs.readFileSync(CONFIG.SSL_KEY_PATH)
    };
    server = https.createServer(sslOptions);
    isHTTPS = true;
    console.log('🔒 HTTPS server created with SSL certificates');
  } else {
    throw new Error('SSL certificates not found');
  }
} catch (error) {
  console.warn('⚠️ SSL certificates not found, falling back to HTTP:', error.message);
  server = http.createServer();
  isHTTPS = false;
}

// Create WebSocket servers with optimal configuration
const audioWss = new WebSocket.Server({
  server,
  path: '/audio-signaling',
  perMessageDeflate: false, // Disable compression completely
  maxPayload: CONFIG.MAX_PAYLOAD,
  noServer: false,
  skipUTF8Validation: true // Skip UTF-8 validation to avoid compression issues
});

const chatWss = new WebSocket.Server({
  server,
  path: '/chat-signaling',
  perMessageDeflate: false, // Disable compression completely
  maxPayload: CONFIG.MAX_PAYLOAD,
  noServer: false,
  skipUTF8Validation: true // Skip UTF-8 validation to avoid compression issues
});

// Utility functions
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;

  // Filter out DEBUG level ping/pong messages to reduce spam
  if (level === 'DEBUG' && (message.includes('Ping received') || message.includes('Pong received'))) {
    return; // Skip logging ping/pong messages
  }

  console.log(`${prefix} ${message}`);
  if (data) {
    console.log(`${prefix} Data:`, JSON.stringify(data, null, 2));
  }
}

function safeSend(ws, message) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    } else {
      log('WARN', 'WebSocket not open, cannot send message', { type: message.type, readyState: ws?.readyState });
      return false;
    }
  } catch (error) {
    log('ERROR', 'Error sending WebSocket message', { error: error.message, type: message.type });
    return false;
  }
}

function extractAppointmentId(req) {
  const urlParts = url.parse(req.url, true);
  const pathParts = urlParts.pathname.split('/');

  // Try to get appointment ID from query parameter first
  let appointmentId = urlParts.query.appointmentId;

  // If not in query, try to extract from path
  if (!appointmentId) {
    // Handle paths like /audio-signaling/text_session_123
    if (pathParts.length > 2) {
      appointmentId = pathParts[pathParts.length - 1];
    }
  }

  return appointmentId;
}

function addConnection(appointmentId, ws) {
  if (!connections.has(appointmentId)) {
    connections.set(appointmentId, new Set());
  }
  connections.get(appointmentId).add(ws);
  log('INFO', `Connection added for appointment ${appointmentId}`, {
    totalConnections: connections.get(appointmentId).size,
    totalAppointments: connections.size
  });
}

function removeConnection(appointmentId, ws) {
  const appointmentConnections = connections.get(appointmentId);
  if (appointmentConnections) {
    appointmentConnections.delete(ws);
    if (appointmentConnections.size === 0) {
      connections.delete(appointmentId);
      log('INFO', `Cleaned up connections for appointment ${appointmentId}`);
    } else {
      log('INFO', `Removed connection for appointment ${appointmentId}`, {
        remainingConnections: appointmentConnections.size
      });
    }
  }
}

function broadcastToOthers(senderWs, appointmentId, message) {
  const appointmentConnections = connections.get(appointmentId);
  if (!appointmentConnections) return;

  let sentCount = 0;
  appointmentConnections.forEach(ws => {
    if (ws !== senderWs && ws.readyState === WebSocket.OPEN) {
      if (safeSend(ws, message)) {
        sentCount++;
      }
    }
  });

  log('INFO', `Broadcasted message to ${sentCount} connections`, {
    appointmentId,
    messageType: message.type,
    totalConnections: appointmentConnections.size
  });
}

function broadcastToAll(appointmentId, message) {
  const appointmentConnections = connections.get(appointmentId);
  if (!appointmentConnections) return;

  let sentCount = 0;
  appointmentConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      if (safeSend(ws, message)) {
        sentCount++;
      }
    }
  });

  log('INFO', `Broadcasted message to all ${sentCount} connections`, {
    appointmentId,
    messageType: message.type
  });
}

// WebSocket connection handler
function handleConnection(ws, req, connectionType) {
  const appointmentId = extractAppointmentId(req);
  const userId = url.parse(req.url, true).query.userId;
  const authToken = url.parse(req.url, true).query.authToken;

  if (!appointmentId) {
    log('ERROR', 'No appointment ID provided', { url: req.url });
    ws.close(1000, 'Appointment ID required');
    return;
  }

  if (!userId) {
    log('ERROR', 'No user ID provided', { url: req.url });
    ws.close(1000, 'User ID required');
    return;
  }

  log('INFO', `New ${connectionType} WebSocket connection`, {
    appointmentId,
    userId,
    hasAuthToken: !!authToken
  });

  // Store connection
  addConnection(appointmentId, ws);

  // Store metadata
  ws.appointmentId = appointmentId;
  ws.userId = userId;
  ws.authToken = authToken || CONFIG.API_AUTH_TOKEN;
  ws.connectionType = connectionType;

  // Send connection confirmation
  safeSend(ws, {
    type: 'connection-established',
    appointmentId: appointmentId,
    connectionType: connectionType,
    timestamp: new Date().toISOString()
  });

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      log('INFO', `Message received`, {
        type: message.type,
        appointmentId,
        userId
      });

      // Add metadata to message
      message.appointmentId = appointmentId;
      message.userId = userId;
      message.timestamp = new Date().toISOString();

      // Handle different message types
      switch (message.type) {
        case 'offer':
          handleOffer(message, ws);
          break;
        case 'answer':
        case 'ice-candidate':
        case 'call-ended':
        case 'call-answered':
        case 'call-rejected':
        case 'call-timeout':
          broadcastToOthers(ws, appointmentId, message);
          break;
        case 'chat-message':
          handleChatMessage(message, ws);
          break;
        case 'typing-indicator':
        case 'message-read':
          broadcastToOthers(ws, appointmentId, message);
          break;
        case 'session-status-request':
          handleSessionStatusRequest(appointmentId, ws);
          break;
        case 'session-end-request':
          handleSessionEndRequest(message, ws);
          break;
        case 'resend-offer-request':
          handleResendOfferRequest(message, ws);
          break;
        default:
          broadcastToOthers(ws, appointmentId, message);
      }
    } catch (error) {
      log('ERROR', 'Error parsing message', { error: error.message });
      safeSend(ws, {
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle ping/pong
  ws.on('ping', (data) => {
    log('DEBUG', 'Ping received');
    if (ws.readyState === WebSocket.OPEN) {
      ws.pong(data);
    }
  });

  ws.on('pong', (data) => {
    log('DEBUG', 'Pong received');
  });

  // Handle errors
  ws.on('error', (error) => {
    log('ERROR', 'WebSocket error', {
      error: error.message,
      appointmentId,
      userId
    });
  });

  // Handle connection close
  ws.on('close', (code, reason) => {
    log('INFO', 'Connection closed', {
      code,
      reason: reason.toString(),
      appointmentId,
      userId
    });
    removeConnection(appointmentId, ws);
  });
}

// Message handlers
function handleOffer(message, ws) {
  const appointmentId = message.appointmentId;
  const userId = message.userId;

  // Check for duplicate offers
  const offerKey = `${appointmentId}_${userId}_${message.offer?.sdp?.substring(0, 50) || 'unknown'}`;
  if (processedOffers.has(offerKey)) {
    log('WARN', 'Duplicate offer detected and ignored', { offerKey });
    return;
  }

  processedOffers.set(offerKey, Date.now());

  // Clean up old offers (older than 5 minutes)
  const now = Date.now();
  for (const [key, timestamp] of processedOffers.entries()) {
    if (now - timestamp > 300000) {
      processedOffers.delete(key);
    }
  }

  log('INFO', 'Processing offer', { appointmentId, userId });
  broadcastToOthers(ws, appointmentId, message);
}

async function handleChatMessage(message, ws) {
  try {
    const appointmentId = message.appointmentId;
    const authToken = ws.authToken;

    log('INFO', 'Handling chat message', {
      appointmentId,
      messageId: message.message?.id
    });

    // Send to API
    const response = await axios.post(
      `${CONFIG.API_BASE_URL}/api/chat/${appointmentId}/messages`,
      {
        message: message.message.message,
        message_type: message.message.message_type,
        media_url: message.message.media_url,
        temp_id: message.message.temp_id,
        message_id: message.message.id
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      log('INFO', 'Message sent to API successfully', {
        messageId: response.data.data?.id
      });

      // Broadcast to all participants
      broadcastToAll(appointmentId, {
        type: 'chat-message',
        message: response.data.data
      });
    } else {
      log('ERROR', 'API returned error', { response: response.data });
    }
  } catch (error) {
    log('ERROR', 'Error handling chat message', {
      error: error.message,
      status: error.response?.status
    });
    safeSend(ws, {
      type: 'error',
      message: 'Failed to send message',
      details: error.message
    });
  }
}

async function handleSessionStatusRequest(appointmentId, ws) {
  try {
    const authToken = ws.authToken;

    log('INFO', 'Handling session status request', { appointmentId });

    let response;
    if (appointmentId.startsWith('text_session_')) {
      const sessionId = appointmentId.replace('text_session_', '');
      response = await axios.get(`${CONFIG.API_BASE_URL}/api/text-sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
    } else {
      // Use the new dedicated call-sessions status endpoint for all non-text sessions
      // This correctly handles both direct_session_... keys and numeric appointment IDs
      response = await axios.get(`${CONFIG.API_BASE_URL}/api/call-sessions/${appointmentId}/status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
    }

    if (response.data.success) {
      safeSend(ws, {
        type: 'session-status-response',
        sessionData: response.data.data,
        appointmentId: appointmentId,
        timestamp: new Date().toISOString()
      });
    } else {
      safeSend(ws, {
        type: 'error',
        message: 'Failed to get session status',
        appointmentId: appointmentId
      });
    }
  } catch (error) {
    log('ERROR', 'Error getting session status', {
      error: error.message,
      appointmentId
    });
    safeSend(ws, {
      type: 'error',
      message: 'Failed to get session status',
      details: error.message
    });
  }
}

async function handleSessionEndRequest(message, ws) {
  try {
    const appointmentId = message.appointmentId;
    const authToken = ws.authToken;

    log('INFO', 'Handling session end request', { appointmentId });

    let response;
    if (appointmentId.startsWith('text_session_')) {
      const sessionId = appointmentId.replace('text_session_', '');
      response = await axios.post(`${CONFIG.API_BASE_URL}/api/text-sessions/${sessionId}/end`, {
        reason: message.reason || 'General Checkup'
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
    } else {
      // Use the existing call-sessions end endpoint (passing appointment_id)
      // instead of the non-existent appointment end endpoint
      response = await axios.post(`${CONFIG.API_BASE_URL}/api/call-sessions/end`, {
        appointment_id: appointmentId,
        reason: message.reason || 'manual_end'
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
    }

    if (response.data.success) {
      safeSend(ws, {
        type: 'session-end-success',
        appointmentId: appointmentId,
        reason: message.reason || 'General Checkup',
        endedAt: new Date().toISOString()
      });

      // Notify all participants
      broadcastToAll(appointmentId, {
        type: 'session-ended',
        appointmentId: appointmentId,
        reason: message.reason || 'General Checkup',
        endedAt: new Date().toISOString()
      });
    } else {
      safeSend(ws, {
        type: 'session-end-error',
        message: response.data.message || 'Failed to end session'
      });
    }
  } catch (error) {
    log('ERROR', 'Error ending session', {
      error: error.message,
      appointmentId: message.appointmentId
    });
    safeSend(ws, {
      type: 'error',
      message: 'Failed to end session',
      details: error.message
    });
  }
}

function handleResendOfferRequest(message, ws) {
  const appointmentId = message.appointmentId;
  const userId = message.userId;

  log('INFO', 'Handling resend offer request', { appointmentId, userId });

  // Broadcast to all participants to resend their offers
  broadcastToAll(appointmentId, {
    type: 'resend-offer-request',
    appointmentId: appointmentId,
    userId: userId,
    timestamp: new Date().toISOString()
  });
}

// Set up WebSocket server event handlers
audioWss.on('connection', (ws, req) => {
  handleConnection(ws, req, 'audio');
});

chatWss.on('connection', (ws, req) => {
  handleConnection(ws, req, 'chat');
});

// Health check endpoint
server.on('request', (req, res) => {
  if (req.url === '/health') {
    const totalConnections = Array.from(connections.values()).reduce((sum, conns) => sum + conns.size, 0);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      protocol: isHTTPS ? 'https' : 'http',
      activeAppointments: connections.size,
      totalConnections: totalConnections,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start server
const PROTOCOL = isHTTPS ? 'https' : 'http';
const WS_PROTOCOL = isHTTPS ? 'wss' : 'ws';

server.listen(CONFIG.PORT, () => {
  log('INFO', 'WebRTC Signaling Server started', {
    port: CONFIG.PORT,
    protocol: PROTOCOL.toUpperCase(),
    audioEndpoint: `${WS_PROTOCOL}://docavailable.org:${CONFIG.PORT}/audio-signaling`,
    chatEndpoint: `${WS_PROTOCOL}://docavailable.org:${CONFIG.PORT}/chat-signaling`,
    healthCheck: `${PROTOCOL}://docavailable.org:${CONFIG.PORT}/health`
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  log('INFO', 'Shutting down WebRTC Signaling Server...');

  // Close all connections
  connections.forEach((appointmentConnections, appointmentId) => {
    appointmentConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Server shutting down');
      }
    });
  });

  server.close(() => {
    log('INFO', 'Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  log('INFO', 'Shutting down WebRTC Signaling Server...');
  server.close(() => {
    log('INFO', 'Server closed');
    process.exit(0);
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  log('ERROR', 'Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', 'Unhandled Rejection', { reason: reason.toString(), promise: promise.toString() });
  process.exit(1);
});

module.exports = { server, audioWss, chatWss };
