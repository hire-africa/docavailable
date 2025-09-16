const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const axios = require('axios');

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

// Store session timers and states
const sessionTimers = new Map();
const sessionStates = new Map();

// API base URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

// Handle WebSocket connections for both audio and chat
const handleConnection = (ws, req, connectionType) => {
  console.log('🔌 New WebSocket connection established');
  
  // Extract appointment ID from URL path or query parameters
  const urlParts = url.parse(req.url, true);
  const pathParts = urlParts.pathname.split('/');
  let appointmentId = pathParts[pathParts.length - 1];
  
  // If no appointment ID in path, try query parameter
  if (!appointmentId || appointmentId === 'audio-signaling' || appointmentId === 'chat-signaling') {
    appointmentId = urlParts.query.appointmentId;
  }
  
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
      
      // Handle different message types
      switch (data.type) {
        case 'offer':
        case 'answer':
        case 'ice-candidate':
        case 'call-ended':
        case 'call-answered':
        case 'call-rejected':
        case 'call-timeout':
          // Handle call-based session activation
          if (data.type === 'call-answered') {
            handleCallAnswered(appointmentId, data, ws);
          } else if (data.type === 'call-rejected' || data.type === 'call-timeout') {
            handleCallRejected(appointmentId, data, ws);
          }
          // Broadcast to others
          broadcastToOthers(ws, appointmentId, data);
          break;
          
        case 'chat-message':
          // Handle chat messages and session management
          handleChatMessage(appointmentId, data, ws);
          break;
          
        case 'session-status-request':
          // Handle session status requests
          handleSessionStatusRequest(appointmentId, ws);
          break;
          
        case 'session-end-request':
          // Handle manual session ending
          handleSessionEndRequest(appointmentId, data, ws);
          break;
          
        case 'appointment-start-request':
          // Handle appointment session start
          handleAppointmentStartRequest(appointmentId, data, ws);
          break;
          
        case 'typing-indicator':
          // Handle typing indicators
          broadcastToOthers(ws, appointmentId, data);
          break;
          
        case 'message-read':
          // Handle read receipts
          broadcastToOthers(ws, appointmentId, data);
          break;
          
        default:
          // Broadcast other messages to participants
          broadcastToOthers(ws, appointmentId, data);
      }
      
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
    cleanupSessionTimers(appointmentId);
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
};

// Set up event listeners for both WebSocket servers
audioWss.on('connection', (ws, req) => {
  console.log('🔌 [Audio] New audio WebSocket connection');
  handleConnection(ws, req, 'audio');
});
chatWss.on('connection', (ws, req) => {
  console.log('🔌 [Chat] New chat WebSocket connection');
  handleConnection(ws, req, 'chat');
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
  console.log(`📡 Audio WebSocket endpoint: ws://localhost:${PORT}/audio-signaling/{appointmentId}`);
  console.log(`💬 Chat WebSocket endpoint: ws://localhost:${PORT}/chat-signaling/{appointmentId}`);
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

// ========================================
// PUSH NOTIFICATION FUNCTIONS
// ========================================

// Send push notification for chat message
async function sendPushNotification(appointmentId, messageData, apiMessageData) {
  try {
    console.log(`🔔 [Backend] Sending push notification for message:`, {
      appointmentId,
      senderId: messageData.sender_id,
      messageId: apiMessageData.id
    });

    // Get appointment details to find recipient
    const appointmentResponse = await axios.get(`${API_BASE_URL}/api/appointments/${appointmentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.API_AUTH_TOKEN || 'your-api-token'}`,
        'Content-Type': 'application/json'
      }
    });

    if (!appointmentResponse.data.success) {
      console.error('❌ [Backend] Failed to get appointment details for notification');
      return;
    }

    const appointment = appointmentResponse.data.data;
    const senderId = messageData.sender_id;
    
    // Determine recipient
    let recipientId = null;
    if (senderId === appointment.patient_id) {
      recipientId = appointment.doctor_id;
    } else if (senderId === appointment.doctor_id) {
      recipientId = appointment.patient_id;
    }

    if (!recipientId) {
      console.error('❌ [Backend] Could not determine recipient for notification');
      return;
    }

    // Get recipient user details
    const userResponse = await axios.get(`${API_BASE_URL}/api/users/${recipientId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.API_AUTH_TOKEN || 'your-api-token'}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.data.success) {
      console.error('❌ [Backend] Failed to get recipient details for notification');
      return;
    }

    const recipient = userResponse.data.data;
    
    // Check if recipient has push notifications enabled
    if (!recipient.push_notifications_enabled || !recipient.push_token) {
      console.log('🔔 [Backend] Recipient has push notifications disabled or no token');
      return;
    }

    // Send notification via API
    const notificationResponse = await axios.post(`${API_BASE_URL}/api/notifications/send-chat-message`, {
      appointment_id: appointmentId,
      sender_id: senderId,
      recipient_id: recipientId,
      message: messageData.message,
      message_id: apiMessageData.id
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.API_AUTH_TOKEN || 'your-api-token'}`,
        'Content-Type': 'application/json'
      }
    });

    if (notificationResponse.data.success) {
      console.log('✅ [Backend] Push notification sent successfully');
    } else {
      console.error('❌ [Backend] Failed to send push notification:', notificationResponse.data);
    }

  } catch (error) {
    console.error('❌ [Backend] Error sending push notification:', error);
  }
}

// ========================================
// SESSION MANAGEMENT FUNCTIONS
// ========================================

// Handle chat messages and session management
async function handleChatMessage(appointmentId, data, senderWs) {
  try {
    console.log(`📨 [Backend] Handling chat message for appointment ${appointmentId}:`, {
      messageId: data.message.id,
      senderId: data.message.sender_id,
      hasAuthToken: !!data.authToken,
      message: data.message.message
    });

    // First, send to your existing API to store in database
    const response = await axios.post(`${API_BASE_URL}/api/chat/${appointmentId}/messages`, {
      message: data.message.message,
      message_type: data.message.message_type,
      media_url: data.message.media_url,
      temp_id: data.message.temp_id,
      message_id: data.message.id // Include the message ID from WebRTC
    }, {
      headers: {
        'Authorization': `Bearer ${data.authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📨 [Backend] API response:`, {
      success: response.data.success,
      messageId: response.data.data?.id
    });

    if (response.data.success) {
      // Check if this message triggers session activation
      await checkSessionActivation(appointmentId, data.message, response.data.data);
      
      // Send push notification to the recipient
      await sendPushNotification(appointmentId, data.message, response.data.data);
      
      // Broadcast message to other participants (excluding sender)
      console.log(`📤 [Backend] Broadcasting message to other participants for appointment ${appointmentId}`);
      broadcastToOthers(senderWs, appointmentId, {
        type: 'chat-message',
        message: response.data.data
      });
    } else {
      console.error('❌ [Backend] API returned error:', response.data);
    }
  } catch (error) {
    console.error('❌ [Backend] Error handling chat message:', error);
    senderWs.send(JSON.stringify({
      type: 'error',
      message: 'Failed to send message'
    }));
  }
}

// Check if message triggers session activation
async function checkSessionActivation(appointmentId, message, messageData) {
  try {
    // Check if this is a text session (instant session)
    if (appointmentId.startsWith('text_session_')) {
      const sessionId = appointmentId.replace('text_session_', '');
      
      // Get session status from your API
      const sessionResponse = await axios.get(`${API_BASE_URL}/api/text-sessions/${sessionId}/status`, {
        headers: {
          'Authorization': `Bearer ${message.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (sessionResponse.data.success) {
        const sessionData = sessionResponse.data.data;
        
        // If session is waiting for doctor and doctor sent message, activate
        if (sessionData.status === 'waiting_for_doctor' && messageData.sender_id === sessionData.doctor_id) {
          await activateTextSession(sessionId, appointmentId);
        }
        
        // If session is waiting and patient sent message, start 90-second timer
        if (sessionData.status === 'waiting_for_doctor' && messageData.sender_id === sessionData.patient_id) {
          await startDoctorResponseTimer(sessionId, appointmentId);
        }
      }
    }
    // For appointments, no special activation logic needed - they activate at scheduled time
  } catch (error) {
    console.error('❌ Error checking session activation:', error);
  }
}

// Activate text session when doctor sends first message
async function activateTextSession(sessionId, appointmentId) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/text-sessions/${sessionId}/activate`, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log(`✅ Text session ${sessionId} activated`);
      
      // Start auto-deduction timer (every 10 minutes)
      startAutoDeductionTimer(sessionId, appointmentId);
      
      // Notify all participants
      broadcastToAll(appointmentId, {
        type: 'session-activated',
        sessionId: sessionId,
        sessionType: 'instant',
        activatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error activating text session:', error);
  }
}

// Start 90-second doctor response timer for text sessions
async function startDoctorResponseTimer(sessionId, appointmentId) {
  // Clear existing timer if any
  if (sessionTimers.has(`response_${sessionId}`)) {
    clearTimeout(sessionTimers.get(`response_${sessionId}`));
  }

  // Set new timer
  const timer = setTimeout(async () => {
    await checkDoctorResponse(sessionId, appointmentId);
  }, 90000); // 90 seconds

  sessionTimers.set(`response_${sessionId}`, timer);
  
  // Notify participants about timer start
  broadcastToAll(appointmentId, {
    type: 'doctor-response-timer-started',
    sessionId: sessionId,
    sessionType: 'instant',
    timeRemaining: 90
  });
}

// Check if doctor responded within 90 seconds
async function checkDoctorResponse(sessionId, appointmentId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/text-sessions/${sessionId}/check-response`);
    
    if (response.data.success) {
      const sessionData = response.data.data;
      
      if (sessionData.status === 'expired') {
        // Session expired, notify participants
        broadcastToAll(appointmentId, {
          type: 'session-expired',
          sessionId: sessionId,
          sessionType: 'instant',
          reason: 'Doctor did not respond within 90 seconds'
        });
      }
    }
  } catch (error) {
    console.error('❌ Error checking doctor response:', error);
  }
}

// Start auto-deduction timer for text sessions (every 10 minutes)
function startAutoDeductionTimer(sessionId, appointmentId) {
  // Clear existing timer if any
  if (sessionTimers.has(`deduction_${sessionId}`)) {
    clearInterval(sessionTimers.get(`deduction_${sessionId}`));
  }

  // Set interval for every 10 minutes
  const timer = setInterval(async () => {
    await processAutoDeduction(sessionId, appointmentId);
  }, 10 * 60 * 1000); // 10 minutes

  sessionTimers.set(`deduction_${sessionId}`, timer);
}

// Process auto-deduction for text sessions
async function processAutoDeduction(sessionId, appointmentId) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/text-sessions/${sessionId}/auto-deduct`, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      const deductionData = response.data.data;
      
      // Notify participants about deduction
      broadcastToAll(appointmentId, {
        type: 'session-deduction',
        sessionId: sessionId,
        sessionType: 'instant',
        sessionsDeducted: deductionData.sessionsDeducted,
        totalSessionsUsed: deductionData.totalSessionsUsed,
        remainingSessions: deductionData.remainingSessions
      });
    }
  } catch (error) {
    console.error('❌ Error processing auto-deduction:', error);
  }
}

// Handle session status requests
async function handleSessionStatusRequest(appointmentId, ws) {
  try {
    if (appointmentId.startsWith('text_session_')) {
      // Handle text session status
      const sessionId = appointmentId.replace('text_session_', '');
      
      const response = await axios.get(`${API_BASE_URL}/api/text-sessions/${sessionId}/status`);
      
      if (response.data.success) {
        ws.send(JSON.stringify({
          type: 'session-status',
          sessionType: 'instant',
          sessionData: response.data.data
        }));
      }
    } else {
      // Handle appointment status
      const response = await axios.get(`${API_BASE_URL}/api/appointments/${appointmentId}/status`);
      
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

// Handle manual session ending
async function handleSessionEndRequest(appointmentId, data, ws) {
  try {
    if (appointmentId.startsWith('text_session_')) {
      // Handle text session ending
      const sessionId = appointmentId.replace('text_session_', '');
      
      const response = await axios.post(`${API_BASE_URL}/api/text-sessions/${sessionId}/end`, {
        reason: data.reason || 'manual_end'
      }, {
        headers: {
          'Authorization': `Bearer ${data.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        // Clean up timers
        cleanupSessionTimers(appointmentId);
        
        // Notify all participants
        broadcastToAll(appointmentId, {
          type: 'session-ended',
          sessionId: sessionId,
          sessionType: 'instant',
          reason: data.reason || 'manual_end',
          endedAt: new Date().toISOString()
        });
      }
    } else {
      // Handle appointment ending
      const response = await axios.post(`${API_BASE_URL}/api/appointments/${appointmentId}/end`, {
        reason: data.reason || 'manual_end'
      }, {
        headers: {
          'Authorization': `Bearer ${data.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        // Notify all participants
        broadcastToAll(appointmentId, {
          type: 'session-ended',
          sessionId: appointmentId,
          sessionType: 'appointment',
          reason: data.reason || 'manual_end',
          endedAt: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('❌ Error ending session:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to end session'
    }));
  }
}

// Handle appointment session start
async function handleAppointmentStartRequest(appointmentId, data, ws) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/appointments/${appointmentId}/start`, {}, {
      headers: {
        'Authorization': `Bearer ${data.authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      // Notify all participants
      broadcastToAll(appointmentId, {
        type: 'appointment-started',
        sessionId: appointmentId,
        sessionType: 'appointment',
        startedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error starting appointment:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to start appointment'
    }));
  }
}

// Clean up session timers
function cleanupSessionTimers(appointmentId) {
  if (appointmentId.startsWith('text_session_')) {
    const sessionId = appointmentId.replace('text_session_', '');
    
    // Clear response timer
    if (sessionTimers.has(`response_${sessionId}`)) {
      clearTimeout(sessionTimers.get(`response_${sessionId}`));
      sessionTimers.delete(`response_${sessionId}`);
    }
    
    // Clear deduction timer
    if (sessionTimers.has(`deduction_${sessionId}`)) {
      clearInterval(sessionTimers.get(`deduction_${sessionId}`));
      sessionTimers.delete(`deduction_${sessionId}`);
    }
  }
}

// Helper function to broadcast to all participants
function broadcastToAll(appointmentId, data) {
  const appointmentConnections = connections.get(appointmentId) || [];
  appointmentConnections.forEach(connection => {
    if (connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(data));
    }
  });
}

// Helper function to broadcast to others (excluding sender)
function broadcastToOthers(senderWs, appointmentId, data) {
  const appointmentConnections = connections.get(appointmentId) || [];
  console.log(`📤 [Broadcast] Total connections for appointment ${appointmentId}: ${appointmentConnections.length}`);
  
  let sentCount = 0;
  appointmentConnections.forEach((connection, index) => {
    if (connection !== senderWs && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(data));
      sentCount++;
      console.log(`📤 [Broadcast] Sent to connection ${index + 1}`);
    } else if (connection === senderWs) {
      console.log(`📤 [Broadcast] Skipped sender connection ${index + 1}`);
    } else {
      console.log(`📤 [Broadcast] Skipped closed connection ${index + 1}`);
    }
  });
  console.log(`📤 [Broadcast] Sent to ${sentCount} other participants`);
}

// ========================================
// CALL-BASED SESSION MANAGEMENT FUNCTIONS
// ========================================

// Handle call answered - activate session
async function handleCallAnswered(appointmentId, data, ws) {
  try {
    console.log(`📞 Call answered for appointment: ${appointmentId}`);
    
    if (appointmentId.startsWith('text_session_')) {
      // Handle instant session activation
      const sessionId = appointmentId.replace('text_session_', '');
      await activateTextSession(sessionId, appointmentId);
    } else {
      // Handle appointment session activation
      await activateAppointmentSession(appointmentId);
    }
  } catch (error) {
    console.error('❌ Error handling call answered:', error);
  }
}

// Handle call rejected or timeout
async function handleCallRejected(appointmentId, data, ws) {
  try {
    console.log(`📞 Call rejected/timeout for appointment: ${appointmentId}`);
    
    // Notify all participants that call was not answered
    broadcastToAll(appointmentId, {
      type: 'call-not-answered',
      reason: data.type === 'call-timeout' ? 'timeout' : 'rejected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error handling call rejected:', error);
  }
}

// Activate appointment session when call is answered
async function activateAppointmentSession(appointmentId) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/appointments/${appointmentId}/start`, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log(`✅ Appointment session ${appointmentId} activated via call`);
      
      // Start auto-deduction timer (every 10 minutes)
      startAutoDeductionTimerForAppointment(appointmentId);
      
      // Notify all participants
      broadcastToAll(appointmentId, {
        type: 'session-activated',
        sessionId: appointmentId,
        sessionType: 'appointment',
        activatedAt: new Date().toISOString(),
        activationMethod: 'call'
      });
    }
  } catch (error) {
    console.error('❌ Error activating appointment session:', error);
  }
}

// Start auto-deduction timer for appointments (every 10 minutes)
function startAutoDeductionTimerForAppointment(appointmentId) {
  // Clear existing timer if any
  if (sessionTimers.has(`deduction_appointment_${appointmentId}`)) {
    clearInterval(sessionTimers.get(`deduction_appointment_${appointmentId}`));
  }

  // Set interval for every 10 minutes
  const timer = setInterval(async () => {
    await processAutoDeductionForAppointment(appointmentId);
  }, 10 * 60 * 1000); // 10 minutes

  sessionTimers.set(`deduction_appointment_${appointmentId}`, timer);
}

// Process auto-deduction for appointments
async function processAutoDeductionForAppointment(appointmentId) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/appointments/${appointmentId}/auto-deduct`, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      const deductionData = response.data.data;
      
      // Notify participants about deduction
      broadcastToAll(appointmentId, {
        type: 'session-deduction',
        sessionId: appointmentId,
        sessionType: 'appointment',
        sessionsDeducted: deductionData.sessionsDeducted,
        totalSessionsUsed: deductionData.totalSessionsUsed,
        remainingSessions: deductionData.remainingSessions
      });
    }
  } catch (error) {
    console.error('❌ Error processing auto-deduction for appointment:', error);
  }
}

// Server is already started above

// Add health check endpoint
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      connections: connections.size,
      port: PORT
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebRTC signaling server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down WebRTC signaling server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = { server, wss };
