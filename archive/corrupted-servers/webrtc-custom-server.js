const https = require('https');
const fs = require('fs');
const crypto = require('crypto');

// Load SSL certificates
const options = {
  key: fs.readFileSync('/etc/ssl/private/docavailable.org.key'),
  cert: fs.readFileSync('/etc/ssl/certs/docavailable.org.crt')
};

// Create HTTPS server
const server = https.createServer(options);

// Store active connections by appointment ID
const connections = new Map();

// WebSocket frame constants
const OPCODE_TEXT = 0x1;
const OPCODE_BINARY = 0x2;
const OPCODE_CLOSE = 0x8;
const OPCODE_PING = 0x9;
const OPCODE_PONG = 0xA;

// WebSocket close codes
const CLOSE_NORMAL = 1000;
const CLOSE_GOING_AWAY = 1001;
const CLOSE_PROTOCOL_ERROR = 1002;
const CLOSE_UNSUPPORTED = 1003;
const CLOSE_NO_STATUS = 1005;
const CLOSE_ABNORMAL = 1006;
const CLOSE_INVALID_FRAME = 1007;
const CLOSE_POLICY_VIOLATION = 1008;
const CLOSE_MESSAGE_TOO_BIG = 1009;
const CLOSE_MANDATORY_EXTENSION = 1010;
const CLOSE_INTERNAL_ERROR = 1011;
const CLOSE_SERVICE_RESTART = 1012;
const CLOSE_TRY_AGAIN_LATER = 1013;
const CLOSE_BAD_GATEWAY = 1014;
const CLOSE_TLS_HANDSHAKE = 1015;

// Generate WebSocket accept key
function generateAcceptKey(clientKey) {
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  return crypto.createHash('sha1').update(clientKey + GUID).digest('base64');
}

// Parse WebSocket frame
function parseFrame(buffer) {
  if (buffer.length < 2) return null;
  
  const firstByte = buffer[0];
  const secondByte = buffer[1];
  
  const fin = (firstByte & 0x80) !== 0;
  const opcode = firstByte & 0x0F;
  const masked = (secondByte & 0x80) !== 0;
  let payloadLength = secondByte & 0x7F;
  
  let payloadStart = 2;
  
  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(2);
    payloadStart = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    payloadLength = buffer.readUInt32BE(6);
    payloadStart = 10;
  }
  
  if (masked) {
    if (buffer.length < payloadStart + 4 + payloadLength) return null;
    const mask = buffer.slice(payloadStart, payloadStart + 4);
    const payload = buffer.slice(payloadStart + 4, payloadStart + 4 + payloadLength);
    
    // Unmask payload
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= mask[i % 4];
    }
    
    return {
      fin,
      opcode,
      masked,
      payload,
      totalLength: payloadStart + 4 + payloadLength
    };
  } else {
    if (buffer.length < payloadStart + payloadLength) return null;
    const payload = buffer.slice(payloadStart, payloadStart + payloadLength);
    
    return {
      fin,
      opcode,
      masked,
      payload,
      totalLength: payloadStart + payloadLength
    };
  }
}

// Create WebSocket frame
function createFrame(opcode, payload, masked = false) {
  const payloadLength = payload.length;
  let frameLength = 2;
  
  if (payloadLength < 126) {
    frameLength += payloadLength;
  } else if (payloadLength < 65536) {
    frameLength += 2 + payloadLength;
  } else {
    frameLength += 8 + payloadLength;
  }
  
  if (masked) {
    frameLength += 4;
  }
  
  const frame = Buffer.alloc(frameLength);
  let offset = 0;
  
  // First byte: FIN=1, opcode
  frame[offset++] = 0x80 | opcode;
  
  // Second byte: MASK=0, payload length
  if (payloadLength < 126) {
    frame[offset++] = payloadLength;
  } else if (payloadLength < 65536) {
    frame[offset++] = 126;
    frame.writeUInt16BE(payloadLength, offset);
    offset += 2;
  } else {
    frame[offset++] = 127;
    frame.writeUInt32BE(0, offset);
    offset += 4;
    frame.writeUInt32BE(payloadLength, offset);
    offset += 4;
  }
  
  // Copy payload
  payload.copy(frame, offset);
  
  return frame;
}

// Handle WebSocket connection
function handleWebSocketConnection(socket, path) {
  console.log(`🔌 New WebSocket connection for path: ${path}`);
  
  let buffer = Buffer.alloc(0);
  let appointmentId = null;
  let userId = null;
  
  // Parse query parameters from path
  if (path.includes('?')) {
    const queryString = path.split('?')[1];
    const params = new URLSearchParams(queryString);
    appointmentId = params.get('appointmentId');
    userId = params.get('userId');
  }
  
  console.log(`📞 Connection for appointment: ${appointmentId}`);
  console.log(`👤 User ID: ${userId}`);
  
  // Store connection
  if (appointmentId) {
    if (!connections.has(appointmentId)) {
      connections.set(appointmentId, new Map());
    }
    connections.get(appointmentId).set(userId, socket);
  }
  
  // Send connection established message
  const connectionMessage = {
    type: 'connection-established',
    appointmentId: appointmentId,
    timestamp: new Date().toISOString()
  };
  
  const frame = createFrame(OPCODE_TEXT, Buffer.from(JSON.stringify(connectionMessage)));
  socket.write(frame);
  console.log('📤 Sending connection established message');
  
  // Handle incoming data
  socket.on('data', (data) => {
    buffer = Buffer.concat([buffer, data]);
    
    while (buffer.length > 0) {
      const frame = parseFrame(buffer);
      if (!frame) break;
      
      buffer = buffer.slice(frame.totalLength);
      
      if (frame.opcode === OPCODE_TEXT) {
        try {
          const message = JSON.parse(frame.payload.toString());
          console.log('📨 Received message:', message.type, 'from user:', userId);
          
          // Add appointment and user info to message
          const fullMessage = {
            ...message,
            appointmentId: appointmentId,
            userId: userId,
            timestamp: new Date().toISOString()
          };
          
          // Broadcast to other participants in the same appointment
          if (appointmentId && connections.has(appointmentId)) {
            const appointmentConnections = connections.get(appointmentId);
            for (const [otherUserId, otherSocket] of appointmentConnections) {
              if (otherUserId !== userId && otherSocket !== socket) {
                const responseFrame = createFrame(OPCODE_TEXT, Buffer.from(JSON.stringify(fullMessage)));
                otherSocket.write(responseFrame);
                console.log(`📤 Broadcasting to user ${otherUserId}`);
              }
            }
          }
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      } else if (frame.opcode === OPCODE_PING) {
        // Respond to ping with pong
        const pongFrame = createFrame(OPCODE_PONG, frame.payload);
        socket.write(pongFrame);
        console.log('🏓 Responded to ping with pong');
      } else if (frame.opcode === OPCODE_CLOSE) {
        console.log('🔌 Client requested close');
        socket.end();
      }
    }
  });
  
  // Handle connection close
  socket.on('close', () => {
    console.log(`🔌 Connection closed for appointment ${appointmentId}: ${socket.readyState}`);
    if (appointmentId && connections.has(appointmentId)) {
      connections.get(appointmentId).delete(userId);
      if (connections.get(appointmentId).size === 0) {
        connections.delete(appointmentId);
        console.log(`🧹 Cleaned up connections for appointment ${appointmentId}`);
      }
    }
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
}

// Handle HTTP upgrade requests
server.on('upgrade', (request, socket, head) => {
  const path = request.url;
  
  if (path.startsWith('/audio-signaling') || path.startsWith('/chat-signaling')) {
    // Handle WebSocket upgrade
    const clientKey = request.headers['sec-websocket-key'];
    const acceptKey = generateAcceptKey(clientKey);
    
    const response = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '',
      ''
    ].join('\r\n');
    
    socket.write(response);
    socket.write(head);
    
    // Handle the WebSocket connection
    handleWebSocketConnection(socket, path);
  } else {
    // Reject non-WebSocket requests
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.end();
  }
});

// Health check endpoint
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      connections: connections.size,
      type: 'custom-websocket-server'
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Custom WebSocket server running on port ${PORT}`);
  console.log(`🔗 Audio signaling: wss://docavailable.org/audio-signaling`);
  console.log(`🔗 Chat signaling: wss://docavailable.org/chat-signaling`);
  console.log(`🏥 Health check: https://docavailable.org:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down WebSocket server...');
  server.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down WebSocket server...');
  server.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});
