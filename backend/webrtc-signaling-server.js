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

// Store call session states
const callSessions = new Map();

// API base URL
const API_BASE_URL = process.env.API_BASE_URL || 'https://docavailable-3vbdv.ondigitalocean.app';

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
  
  // Handle dynamic paths like /chat-signaling/text_session_2
  if (appointmentId === 'audio-signaling' || appointmentId === 'chat-signaling') {
    // If the path is exactly /audio-signaling or /chat-signaling, try to get appointment ID from query
    appointmentId = urlParts.query.appointmentId;
  } else if (pathParts.length > 2) {
    // If path has more than 2 parts, the appointment ID is the last part
    appointmentId = pathParts[pathParts.length - 1];
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
  
  // Store auth token in connection metadata for later use
  ws.authToken = urlParts.query.authToken || process.env.API_AUTH_TOKEN || 'your-api-token';
  
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
          } else if (data.type === 'call-ended') {
            handleCallEnded(appointmentId, data, ws);
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
          console.log(`🔍 [Backend] Received session-status-request for appointment: ${appointmentId}`);
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
          // Handle typing indicators - add sender ID
          const typingData = {
            ...data,
            senderId: data.senderId || getUserIdFromConnection(ws)
          };
          broadcastToOthers(ws, appointmentId, typingData);
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
    cleanupCallSessionTimers(appointmentId);
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
      hasAuthToken: !!senderWs.authToken,
      message: data.message.message
    });

    // First, send to your existing API to store in database
    const authToken = senderWs.authToken || process.env.API_AUTH_TOKEN || 'your-api-token';
    const requestData = {
      message: data.message.message,
      message_type: data.message.message_type,
      media_url: data.message.media_url,
      temp_id: data.message.temp_id,
      message_id: data.message.id // Include the message ID from WebRTC
    };
    
    console.log(`📤 [Backend] Sending to API:`, {
      url: `${API_BASE_URL}/api/chat/${appointmentId}/messages`,
      data: requestData,
      authToken: authToken ? 'Present' : 'Missing'
    });
    
    const response = await axios.post(`${API_BASE_URL}/api/chat/${appointmentId}/messages`, requestData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📨 [Backend] API response:`, {
      success: response.data.success,
      messageId: response.data.data?.id
    });

    if (response.data.success) {
      // Check if this message triggers session activation
      await checkSessionActivation(appointmentId, data.message, response.data.data, senderWs);
      
      // Send push notification to the recipient
      await sendPushNotification(appointmentId, data.message, response.data.data);
      
      // Broadcast message to other participants (excluding sender)
      console.log(`📤 [Backend] Broadcasting message to other participants for appointment ${appointmentId}`);
      broadcastToOthers(senderWs, appointmentId, {
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
    } else {
      console.error('❌ [Backend] API returned error:', response.data);
    }
  } catch (error) {
    console.error('❌ [Backend] Error handling chat message:', error);
    console.error('❌ [Backend] Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });
    senderWs.send(JSON.stringify({
      type: 'error',
      message: 'Failed to send message',
      details: error.message
    }));
  }
}

// Check if message triggers session activation
async function checkSessionActivation(appointmentId, message, messageData, senderWs) {
  try {
    // Check if this is a text session (instant session)
    if (appointmentId.startsWith('text_session_')) {
      const sessionId = appointmentId.replace('text_session_', '');
      
      // Get session status from your API
      // Get auth token from the WebSocket connection that sent the message
      const authToken = senderWs.authToken || process.env.API_AUTH_TOKEN || 'your-api-token';
      const sessionResponse = await axios.get(`${API_BASE_URL}/api/text-sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (sessionResponse.data.success) {
        const sessionData = sessionResponse.data.data;
        
        console.log(`🔍 [SessionActivation] Checking session ${sessionId}:`, {
          status: sessionData.status,
          senderId: messageData.sender_id,
          patientId: sessionData.patient.id,
          doctorId: sessionData.doctor.id
        });
        
        // If session is waiting for doctor and doctor sent message, activate
        if (sessionData.status === 'waiting_for_doctor' && messageData.sender_id === sessionData.doctor.id) {
          console.log(`👨‍⚕️ [SessionActivation] Doctor message detected, activating session ${sessionId}`);
          await activateTextSession(sessionId, appointmentId);
        }
        
        // If session is waiting and patient sent message, start 90-second timer
        if (sessionData.status === 'waiting_for_doctor' && messageData.sender_id === sessionData.patient.id) {
          console.log(`👤 [SessionActivation] Patient message detected, starting 90-second timer for session ${sessionId}`);
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
    console.log(`🔄 [SessionActivation] Activating text session ${sessionId}`);
    
    const response = await axios.post(`${API_BASE_URL}/api/text-sessions/${sessionId}/activate`, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log(`✅ [SessionActivation] Text session ${sessionId} activated successfully`);
      
      // Stop the 90-second timer since doctor responded
      stopDoctorResponseTimer(sessionId, appointmentId);
      
      // Start auto-deduction timer (every 10 minutes)
      startAutoDeductionTimer(sessionId, appointmentId);
      
      // Notify all participants
      broadcastToAll(appointmentId, {
        type: 'session-activated',
        sessionId: sessionId,
        sessionType: 'instant',
        activatedAt: new Date().toISOString(),
        activatedBy: 'doctor_response'
      });
      
      console.log(`📢 [SessionActivation] Participants notified of session activation for ${sessionId}`);
    } else {
      console.error(`❌ [SessionActivation] Failed to activate session ${sessionId}:`, response.data);
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
    console.log(`⏰ [Timer] Cleared existing timer for session ${sessionId}`);
  }

  console.log(`⏰ [Timer] Starting 90-second timer for session ${sessionId}`);
  
  // Set new timer
  const timer = setTimeout(async () => {
    console.log(`⏰ [Timer] 90-second timer expired for session ${sessionId}`);
    await checkDoctorResponse(sessionId, appointmentId);
  }, 90000); // 90 seconds

  sessionTimers.set(`response_${sessionId}`, timer);
  
  // Store timer start time for tracking
  sessionStates.set(`response_${sessionId}`, {
    startTime: Date.now(),
    endTime: Date.now() + 90000,
    isActive: true
  });
  
  // Notify participants about timer start
  broadcastToAll(appointmentId, {
    type: 'doctor-response-timer-started',
    sessionId: sessionId,
    sessionType: 'instant',
    timeRemaining: 90,
    startTime: Date.now(),
    endTime: Date.now() + 90000
  });
  
  console.log(`✅ [Timer] Timer started and participants notified for session ${sessionId}`);
}

// Check if doctor responded within 90 seconds
async function checkDoctorResponse(sessionId, appointmentId) {
  try {
    console.log(`🔍 [Timer] Checking doctor response for session ${sessionId}`);
    
    const response = await axios.get(`${API_BASE_URL}/api/text-sessions/${sessionId}/check-response`);
    
    if (response.data.success) {
      const sessionData = response.data.data;
      
      console.log(`🔍 [Timer] Session ${sessionId} status:`, sessionData.status);
      
      if (sessionData.status === 'expired') {
        // Session expired, notify participants
        console.log(`❌ [Timer] Session ${sessionId} expired - doctor did not respond`);
        broadcastToAll(appointmentId, {
          type: 'session-expired',
          sessionId: sessionId,
          sessionType: 'instant',
          reason: 'Doctor did not respond within 90 seconds',
          expiredAt: new Date().toISOString()
        });
        
        // Clean up timer state
        sessionStates.delete(`response_${sessionId}`);
      } else if (sessionData.status === 'active') {
        console.log(`✅ [Timer] Session ${sessionId} is active - doctor responded`);
        // Timer was stopped by doctor response, clean up
        sessionStates.delete(`response_${sessionId}`);
      }
    }
  } catch (error) {
    console.error('❌ Error checking doctor response:', error);
  }
}

// Stop doctor response timer when doctor responds
function stopDoctorResponseTimer(sessionId, appointmentId) {
  console.log(`⏹️ [Timer] Stopping timer for session ${sessionId}`);
  
  // Clear the timer
  if (sessionTimers.has(`response_${sessionId}`)) {
    clearTimeout(sessionTimers.get(`response_${sessionId}`));
    sessionTimers.delete(`response_${sessionId}`);
  }
  
  // Clear timer state
  if (sessionStates.has(`response_${sessionId}`)) {
    const state = sessionStates.get(`response_${sessionId}`);
    const timeRemaining = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
    
    sessionStates.delete(`response_${sessionId}`);
    
    console.log(`✅ [Timer] Timer stopped for session ${sessionId}, was ${timeRemaining} seconds remaining`);
    
    // Notify participants that timer was stopped
    broadcastToAll(appointmentId, {
      type: 'doctor-response-timer-stopped',
      sessionId: sessionId,
      sessionType: 'instant',
      reason: 'Doctor responded',
      stoppedAt: new Date().toISOString()
    });
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
    console.log(`🔄 [Auto-Deduction] Processing for session: ${sessionId}`);
    
    const response = await axios.post(`${API_BASE_URL}/api/text-sessions/${sessionId}/auto-deduction`, {
      triggered_by: 'webrtc_server'
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.API_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log(`✅ [Auto-Deduction] Success for session: ${sessionId}`, {
        deductions_processed: response.data.data?.deductions_processed || 0,
        total_deductions: response.data.data?.total_deductions || 0
      });
      
      // Notify participants about deduction if any were processed
      if (response.data.data?.deductions_processed > 0) {
        broadcastToAll(appointmentId, {
          type: 'session-deduction',
          sessionId: sessionId,
          sessionType: 'instant',
          sessionsDeducted: response.data.data.deductions_processed,
          totalSessionsUsed: response.data.data.total_deductions,
          remainingSessions: 0 // This would need to be fetched separately
        });
      }
    } else {
      console.log(`⚠️ [Auto-Deduction] Failed for session: ${sessionId}`, response.data);
    }
  } catch (error) {
    console.error(`❌ [Auto-Deduction] Error for session: ${sessionId}:`, error.message);
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
      
      const response = await axios.get(`${API_BASE_URL}/api/text-sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        console.log(`✅ [Backend] Text session status API response successful for session ${sessionId}`);
        
        // Trigger auto-deduction as fallback if session is active
        if (response.data.data?.status === 'active') {
          console.log(`🔄 [Backend] Triggering auto-deduction fallback for active session ${sessionId}`);
          processAutoDeduction(sessionId, appointmentId);
        }
        
        // Also check for existing messages to determine if patient has sent a message
        let hasPatientMessage = false;
        let hasDoctorResponse = false;
        
        try {
          const messagesResponse = await axios.get(`${API_BASE_URL}/api/chat/${appointmentId}/messages`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
          console.log(`📨 [Backend] Messages API response for ${appointmentId}:`, messagesResponse.data.success ? 'Success' : 'Failed');
          
          if (messagesResponse.data.success) {
            hasPatientMessage = messagesResponse.data.data.some(msg => msg.sender_id !== response.data.data.doctor.id);
            hasDoctorResponse = messagesResponse.data.data.some(msg => msg.sender_id === response.data.data.doctor.id);
          }
        } catch (messagesError) {
          console.error(`❌ [Backend] Error fetching messages for ${appointmentId}:`, messagesError.message);
          // Continue without message analysis - this is not critical for session status
        }
        
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
      const response = await axios.get(`${API_BASE_URL}/api/appointments/${appointmentId}/status`, {
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
    console.error('❌ Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Send a more informative error response
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to get session status',
      error: error.message,
      appointmentId: appointmentId
    }));
  }
}

// Handle manual session ending
async function handleSessionEndRequest(appointmentId, data, ws) {
  try {
    console.log('🔚 [Backend] Handling session end request:', {
      appointmentId,
      reason: data.reason,
      hasAuthToken: !!data.authToken
    });
    
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
        
        // Send success response to the client
        ws.send(JSON.stringify({
          type: 'session-end-success',
          sessionId: sessionId,
          sessionType: 'instant',
          reason: data.reason || 'manual_end',
          endedAt: new Date().toISOString()
        }));
        
        // Notify all participants
        broadcastToAll(appointmentId, {
          type: 'session-ended',
          sessionId: sessionId,
          sessionType: 'instant',
          reason: data.reason || 'manual_end',
          endedAt: new Date().toISOString()
        });
      } else {
        // Send error response if API call failed
        ws.send(JSON.stringify({
          type: 'session-end-error',
          message: response.data.message || 'Failed to end session'
        }));
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
        // Send success response to the client
        ws.send(JSON.stringify({
          type: 'session-end-success',
          sessionId: appointmentId,
          sessionType: 'appointment',
          reason: data.reason || 'manual_end',
          endedAt: new Date().toISOString()
        }));
        
        // Notify all participants
        broadcastToAll(appointmentId, {
          type: 'session-ended',
          sessionId: appointmentId,
          sessionType: 'appointment',
          reason: data.reason || 'manual_end',
          endedAt: new Date().toISOString()
        });
      } else {
        // Send error response if API call failed
        ws.send(JSON.stringify({
          type: 'session-end-error',
          message: response.data.message || 'Failed to end session'
        }));
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
  console.log(`📤 [BroadcastToAll] Broadcasting to ${appointmentConnections.length} connections for appointment ${appointmentId}`);
  
  let sentCount = 0;
  appointmentConnections.forEach((connection, index) => {
    if (connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(data));
      sentCount++;
      console.log(`📤 [BroadcastToAll] Sent to connection ${index + 1}`);
    } else {
      console.log(`📤 [BroadcastToAll] Skipped closed connection ${index + 1}`);
    }
  });
  console.log(`📤 [BroadcastToAll] Sent to ${sentCount} connections total`);
}

// Helper function to get user ID from connection
function getUserIdFromConnection(ws) {
  // Try to extract user ID from connection metadata or auth token
  // This is a simplified implementation - you may need to enhance based on your auth system
  return ws.userId || null;
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

// Handle call answered - activate session and start call session
async function handleCallAnswered(appointmentId, data, ws) {
  try {
    console.log(`📞 Call answered for appointment: ${appointmentId}`);
    
    // Extract call type and user info from the data
    const callType = data.callType || 'voice'; // Default to voice if not specified
    const userId = data.userId || data.senderId;
    
    if (!userId) {
      console.error('❌ No user ID provided for call session');
      return;
    }
    
    // Start call session
    await startCallSession(appointmentId, userId, callType);
    
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

// Handle call ended - process final deduction
async function handleCallEnded(appointmentId, data, ws) {
  try {
    console.log(`📞 Call ended for appointment: ${appointmentId}`);
    
    const callType = data.callType || 'voice';
    const userId = data.userId || data.senderId;
    const sessionDuration = data.sessionDuration || 0;
    const wasConnected = data.wasConnected || false;
    
    if (!userId) {
      console.error('❌ No user ID provided for call session end');
      return;
    }
    
    // End call session and process final deduction
    await endCallSession(appointmentId, userId, callType, sessionDuration, wasConnected);
    
  } catch (error) {
    console.error('❌ Error handling call ended:', error);
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

// ========================================
// CALL SESSION MANAGEMENT FUNCTIONS
// ========================================

// Start a call session and deduct initial call
async function startCallSession(appointmentId, userId, callType) {
  try {
    console.log(`📞 Starting call session for user ${userId}, type: ${callType}`);
    
    const response = await axios.post(`${API_BASE_URL}/api/call-sessions/start`, {
      call_type: callType,
      appointment_id: appointmentId
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.API_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log(`✅ Call session started successfully for user ${userId}`);
      
      // Store call session state
      callSessions.set(`${appointmentId}_${userId}`, {
        callType: callType,
        startTime: Date.now(),
        isConnected: true,
        deductionsProcessed: 0,
        lastDeductionTime: Date.now()
      });
      
      // Start 10-minute deduction timer
      startCallDeductionTimer(appointmentId, userId, callType);
      
      // Notify participants about call session start
      broadcastToAll(appointmentId, {
        type: 'call-session-started',
        callType: callType,
        userId: userId,
        startedAt: new Date().toISOString()
      });
      
    } else {
      console.error(`❌ Failed to start call session for user ${userId}:`, response.data.message);
      
      // Notify participants about call session failure
      broadcastToAll(appointmentId, {
        type: 'call-session-failed',
        callType: callType,
        userId: userId,
        reason: response.data.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`❌ Error starting call session for user ${userId}:`, error.message);
  }
}

// Start 10-minute deduction timer for call sessions
function startCallDeductionTimer(appointmentId, userId, callType) {
  const sessionKey = `${appointmentId}_${userId}`;
  
  // Clear existing timer if any
  if (sessionTimers.has(`call_deduction_${sessionKey}`)) {
    clearInterval(sessionTimers.get(`call_deduction_${sessionKey}`));
  }

  // Set interval for every 10 minutes
  const timer = setInterval(async () => {
    await processCallDeduction(appointmentId, userId, callType);
  }, 10 * 60 * 1000); // 10 minutes

  sessionTimers.set(`call_deduction_${sessionKey}`, timer);
  
  console.log(`⏰ Call deduction timer started for user ${userId}, type: ${callType}`);
}

// Process call deduction every 10 minutes
async function processCallDeduction(appointmentId, userId, callType) {
  try {
    const sessionKey = `${appointmentId}_${userId}`;
    const session = callSessions.get(sessionKey);
    
    if (!session) {
      console.log(`⚠️ No call session found for ${sessionKey}`);
      return;
    }
    
    const sessionDuration = Math.floor((Date.now() - session.startTime) / 1000 / 60); // in minutes
    
    console.log(`🔄 Processing call deduction for user ${userId}, duration: ${sessionDuration} minutes`);
    
    const response = await axios.post(`${API_BASE_URL}/api/call-sessions/deduction`, {
      call_type: callType,
      appointment_id: appointmentId,
      session_duration: sessionDuration
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.API_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      const deductionsProcessed = response.data.data.deductions_processed;
      
      if (deductionsProcessed > 0) {
        // Update session state
        session.deductionsProcessed += deductionsProcessed;
        session.lastDeductionTime = Date.now();
        callSessions.set(sessionKey, session);
        
        console.log(`✅ Call deduction processed for user ${userId}: ${deductionsProcessed} deductions`);
        
        // Notify participants about deduction
        broadcastToAll(appointmentId, {
          type: 'call-deduction-processed',
          callType: callType,
          userId: userId,
          deductionsProcessed: deductionsProcessed,
          totalDeductions: session.deductionsProcessed,
          remainingCalls: response.data.data.remaining_calls,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.log(`⚠️ Call deduction failed for user ${userId}:`, response.data.message);
      
      // If insufficient calls, end the session
      if (response.data.message.includes('Insufficient remaining calls')) {
        await endCallSession(appointmentId, userId, callType, sessionDuration, true);
      }
    }
  } catch (error) {
    console.error(`❌ Error processing call deduction for user ${userId}:`, error.message);
  }
}

// End call session and process final deduction
async function endCallSession(appointmentId, userId, callType, sessionDuration = 0, wasConnected = false) {
  try {
    const sessionKey = `${appointmentId}_${userId}`;
    const session = callSessions.get(sessionKey);
    
    if (session) {
      // Calculate actual session duration if not provided
      if (sessionDuration === 0) {
        sessionDuration = Math.floor((Date.now() - session.startTime) / 1000); // in seconds
      }
      
      console.log(`📞 Ending call session for user ${userId}, duration: ${sessionDuration} seconds`);
      
      // Clear deduction timer
      if (sessionTimers.has(`call_deduction_${sessionKey}`)) {
        clearInterval(sessionTimers.get(`call_deduction_${sessionKey}`));
        sessionTimers.delete(`call_deduction_${sessionKey}`);
      }
      
      const response = await axios.post(`${API_BASE_URL}/api/call-sessions/end`, {
        call_type: callType,
        appointment_id: appointmentId,
        session_duration: sessionDuration,
        was_connected: wasConnected
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.API_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        const finalDeduction = response.data.data.final_deduction;
        
        if (finalDeduction > 0) {
          console.log(`✅ Final call deduction processed for user ${userId}: ${finalDeduction} deduction`);
        }
        
        // Notify participants about call session end
        broadcastToAll(appointmentId, {
          type: 'call-session-ended',
          callType: callType,
          userId: userId,
          sessionDuration: sessionDuration,
          wasConnected: wasConnected,
          finalDeduction: finalDeduction,
          totalDeductions: session.deductionsProcessed + finalDeduction,
          remainingCalls: response.data.data.remaining_calls,
          endedAt: new Date().toISOString()
        });
      }
      
      // Remove session from memory
      callSessions.delete(sessionKey);
      
    } else {
      console.log(`⚠️ No call session found to end for ${sessionKey}`);
    }
  } catch (error) {
    console.error(`❌ Error ending call session for user ${userId}:`, error.message);
  }
}

// Clean up call session timers
function cleanupCallSessionTimers(appointmentId) {
  // Clean up all call session timers for this appointment
  for (const [key, timer] of sessionTimers.entries()) {
    if (key.startsWith(`call_deduction_${appointmentId}_`)) {
      clearInterval(timer);
      sessionTimers.delete(key);
    }
  }
  
  // Clean up call session states
  for (const [key, session] of callSessions.entries()) {
    if (key.startsWith(`${appointmentId}_`)) {
      callSessions.delete(key);
    }
  }
}

module.exports = { server, audioWss, chatWss };
