const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// -------------------
// GLOBAL STATE
// -------------------
const connections = new Map();
const callSessions = new Map();
const userNotificationConnections = new Map();

// -------------------
// UTILITY FUNCTIONS
// -------------------
function safeSend(ws, payload) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
        ws.send(JSON.stringify(payload));
        return true;
    } catch (e) {
        console.error('❌ safeSend failed:', e.message);
        return false;
    }
}

const BACKEND_URL = process.env.BACKEND_URL || 'https://docavailable1-izk3m.ondigitalocean.app';
const SERVER_SECRET = process.env.CALL_SERVER_SECRET || '4230C7FB-E7F9-45CB-9798-749FBC82FF51';

function notifyBackendSessionEnded(appointmentId, wasConnected) {
    const body = JSON.stringify({
        appointment_id: appointmentId,
        reason: 'all_participants_disconnected',
        was_connected: wasConnected,
    });
    // Fire-and-forget — do not await, do not crash the signaling server on failure
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Server-Secret': SERVER_SECRET,
        },
    };
    const apiUrl = `${BACKEND_URL}/api/call-sessions/server-end`;
    const http_ = apiUrl.startsWith('https') ? require('https') : require('http');
    const req = http_.request(apiUrl, options, (res) => {
        console.log(`✅ [server-end] notified backend for ${appointmentId}: HTTP ${res.statusCode}`);
    });
    req.on('error', (err) => {
        console.error(`❌ [server-end] Failed to notify backend for ${appointmentId}:`, err.message);
    });
    req.write(body);
    req.end();
}

function cleanupSessionIfEmpty(appointmentId) {
    const session = callSessions.get(appointmentId);
    if (session && session.participants.size === 0) {
        const wasConnected = session.wasConnected || false;
        callSessions.delete(appointmentId);
        console.log(`🗑️ [Call Session] Cleaned up session ${appointmentId} (wasConnected: ${wasConnected})`);
        // FIX 2: Notify backend to end the DB call_session record
        notifyBackendSessionEnded(appointmentId, wasConnected);
    }
}

// -------------------
// HTTP SERVER
// -------------------
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            connections: connections.size,
            activeCallSessions: callSessions.size,
            notificationUsers: userNotificationConnections.size,
            globalEventUsers: userNotificationConnections.size, // Same map, alias for clarity
            uptime: process.uptime()
        }));
        return;
    }

    if (parsedUrl.pathname === '/broadcast-system-event' && req.method === 'POST') {
        const providedSecret = req.headers['x-server-secret'];
        if (!providedSecret || providedSecret !== SERVER_SECRET) {
            console.warn(`🔒 [broadcast-system-event] Unauthorized attempt from ${req.socket.remoteAddress}`);
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Unauthorized' }));
            return;
        }

        let body = '';
        req.on('data', (chunk) => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const userId = String(payload.userId || '');
                const eventType = String(payload.type || 'system_event');

                if (!userId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'userId is required' }));
                    return;
                }

                // Construct message - spread payload but ensure type is consistent
                const message = {
                    source: 'system_broadcast',
                    timestamp: new Date().toISOString(),
                    ...payload,
                    type: eventType
                };

                const userConns = userNotificationConnections.get(userId) || new Set();
                let sent = 0;
                userConns.forEach((ws) => {
                    if (ws.readyState === WebSocket.OPEN && safeSend(ws, message)) sent++;
                });

                console.log(`📢 [broadcast-system-event] user=${userId} type=${eventType} sent=${sent}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, sent }));
            } catch (e) {
                console.error('❌ broadcast-system-event error:', e.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Invalid JSON body' }));
            }
        });
        return;
    }

    if (parsedUrl.pathname === '/broadcast-incoming-call' && req.method === 'POST') {
        const providedSecret = req.headers['x-server-secret'];
        if (!providedSecret || providedSecret !== SERVER_SECRET) {
            console.warn(`🔒 [broadcast-incoming-call] Unauthorized attempt from ${req.socket.remoteAddress}`);
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Unauthorized' }));
            return;
        }

        let body = '';
        req.on('data', (chunk) => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const receiverUserId = String(payload.receiverUserId || payload.userId || '');
                const appointmentId = String(payload.appointmentId || payload.appointment_id || '');
                const rawCallType = String(payload.callType || payload.call_type || 'audio').toLowerCase();
                const callType = rawCallType === 'video' ? 'video' : 'audio';
                const callerName = payload.callerName || payload.doctorName || payload.doctor_name || '';
                const callerAvatar = payload.callerProfilePicture || payload.doctorProfilePicture || payload.doctor_profile_picture || '';
                const callerId = payload.callerId || payload.doctorId || payload.doctor_id || payload.caller_id || null;

                if (!receiverUserId || !appointmentId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'receiverUserId and appointmentId are required' }));
                    return;
                }

                const message = {
                    type: 'incoming_call',
                    appointment_id: appointmentId,
                    call_type: callType,
                    doctor_name: callerName,
                    doctor_profile_picture: callerAvatar,
                    doctor_id: callerId != null ? String(callerId) : undefined,
                    isIncomingCall: 'true',
                    source: 'websocket_notification',
                    timestamp: new Date().toISOString()
                };

                const userConns = userNotificationConnections.get(receiverUserId) || new Set();
                let sent = 0;
                userConns.forEach((ws) => {
                    if (ws.readyState === WebSocket.OPEN && safeSend(ws, message)) sent++;
                });

                console.log(`📞 [broadcast-incoming-call] receiver=${receiverUserId} appointment=${appointmentId} callType=${callType} sent=${sent}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, sent }));
            } catch (e) {
                console.error('❌ broadcast-incoming-call error:', e.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Invalid JSON body' }));
            }
        });
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebRTC Call Signaling Server - Ready!');
});

// -------------------
// WEBSOCKET SERVERS (noServer mode to avoid dual-upgrade-handler conflict)
// -------------------
const wss = new WebSocket.Server({ noServer: true, perMessageDeflate: false });
const notificationWss = new WebSocket.Server({ noServer: true, perMessageDeflate: false });

// Single upgrade handler — routes by path to the correct WebSocket server.
// This prevents the bug where two WebSocket.Server instances each attach their
// own 'upgrade' listener, and the non-matching one writes an HTTP 400 response
// to the already-upgraded socket, corrupting the WebSocket frame stream.
server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, 'http://localhost');

    if (pathname === '/call-signaling') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else if (pathname === '/incoming-call-notifications' || pathname === '/global-events') {
        notificationWss.handleUpgrade(request, socket, head, (ws) => {
            notificationWss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

// -------------------
// HEARTBEAT - uses JSON ping instead of ws.ping() (React Native doesn't support raw ping frames)
// -------------------
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            console.log('💀 Terminating dead connection');
            return ws.terminate();
        }
        ws.isAlive = false;
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify({ type: 'ping' }));
            } catch (e) {
                ws.terminate();
            }
        }
    });
}, 30000);

setInterval(() => {
    notificationWss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify({ type: 'ping' }));
            } catch (e) {
                ws.terminate();
            }
        }
    });
}, 30000);

// -------------------
// NOTIFICATION CHANNEL
// -------------------
notificationWss.on('connection', (ws, req) => {
    const { userId } = url.parse(req.url, true).query;
    if (!userId) {
        ws.close(1008, 'Missing userId');
        return;
    }

    const uid = String(userId);
    if (!userNotificationConnections.has(uid)) userNotificationConnections.set(uid, new Set());
    userNotificationConnections.get(uid).add(ws);

    // FIX: Set isAlive for heartbeat
    ws.isAlive = true;
    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);
            if (data.type === 'pong' || data.type === 'ping') ws.isAlive = true;
        } catch (e) { }
    });

    const pathname = url.parse(req.url, true).pathname;
    console.log(`🔔 [Notifications] User ${uid} subscribed via ${pathname}`);
    safeSend(ws, { type: 'notification-connection-established', userId: uid, timestamp: new Date().toISOString() });

    ws.on('close', () => {
        const set = userNotificationConnections.get(uid);
        if (set) {
            set.delete(ws);
            if (set.size === 0) userNotificationConnections.delete(uid);
        }
        console.log(`🔔 [Notifications] User ${uid} unsubscribed`);
    });

    ws.on('error', (err) => console.error('❌ Notification WebSocket error:', err.message));
});

// -------------------
// CALL SIGNALING
// -------------------
wss.on('connection', (ws, req) => {
    ws.isAlive = true;

    const { appointmentId, userId, userType = 'patient' } = url.parse(req.url, true).query;
    if (!appointmentId || !userId) {
        ws.close(1008, 'Missing appointmentId or userId');
        return;
    }

    console.log(`🔗 New connection: ${userType} ${userId} for appointment ${appointmentId}`);
    connections.set(ws, { appointmentId, userId, userType });

    if (!callSessions.has(appointmentId)) {
        callSessions.set(appointmentId, {
            participants: new Map(),
            offers: new Map(),
            answers: new Map(),
            iceCandidates: new Map(),
            wasConnected: false, // FIX 2: track if anyone was ever connected
        });
        console.log(`🆕 Created new session ${appointmentId}`);
    }

    const session = callSessions.get(appointmentId);
    session.participants.set(userId, { ws, userType });

    // If there's already an offer in the session, send it to the new participant
    session.offers.forEach((offer, offerUserId) => {
        if (offerUserId !== userId) {
            console.log(`📨 Replaying stored offer from ${offerUserId} to new participant ${userId}`);
            safeSend(ws, { type: 'offer', from: offerUserId, offer, appointmentId });
        }
    });

    safeSend(ws, { type: 'connection-established', appointmentId, userId, userType, timestamp: new Date().toISOString() });

    ws.on('message', async (msg) => {
        let data;
        try {
            data = JSON.parse(msg);
            // Handle double-encoded JSON strings (sometimes happens with certain client libraries)
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    // Not double-encoded, just a string that looks like JSON or simple string
                }
            }
        } catch (e) {
            console.error('❌ Invalid JSON received:', msg?.toString());
            return;
        }

        if (!data || typeof data !== 'object') {
            console.warn(`⚠️ Received non-object message: ${typeof data}`, data);
            return;
        }

        switch (data.type) {
            case 'ping':
                ws.isAlive = true;
                safeSend(ws, { type: 'pong' });
                break;

            case 'pong':
                ws.isAlive = true;
                break;

            case 'offer':
                session.offers.set(userId, data.offer);
                console.log(`📤 Offer from ${userId}, forwarding to ${session.participants.size - 1} other(s)`);
                session.participants.forEach((p, pid) => {
                    if (pid !== userId) safeSend(p.ws, { type: 'offer', from: userId, fromType: userType, offer: data.offer, appointmentId });
                });
                break;

            case 'resend-offer-request':
                // Someone is asking for the offer to be resent - replay stored offer
                session.offers.forEach((offer, offerUserId) => {
                    if (offerUserId !== userId) {
                        console.log(`🔄 Resending stored offer from ${offerUserId} to ${userId}`);
                        safeSend(ws, { type: 'offer', from: offerUserId, offer, appointmentId });
                    }
                });
                break;

            case 'answer':
                session.answers.set(userId, data.answer);
                console.log(`📤 Answer from ${userId}, forwarding to ${session.participants.size - 1} other(s)`);
                session.participants.forEach((p, pid) => {
                    if (pid !== userId) safeSend(p.ws, { type: 'answer', from: userId, fromType: userType, answer: data.answer, appointmentId });
                });
                break;

            case 'ice-candidate':
                if (!session.iceCandidates.has(userId)) session.iceCandidates.set(userId, []);
                session.iceCandidates.get(userId).push(data.candidate);
                session.participants.forEach((p, pid) => {
                    if (pid !== userId) safeSend(p.ws, { type: 'ice-candidate', from: userId, fromType: userType, candidate: data.candidate, appointmentId });
                });
                break;

            case 'call-ended':
            case 'call-rejected':
            case 'call-timeout':
            case 'call-answered':
                if (data.type === 'call-answered') {
                    session.wasConnected = true;
                }
                session.participants.forEach((p, pid) => {
                    // Filter: don't broadcast answered back to the one who answered
                    if (pid !== userId || data.type !== 'call-answered') {
                        safeSend(p.ws, { type: data.type, from: userId, fromType: userType, appointmentId, timestamp: new Date().toISOString() });
                    }
                });
                if (['call-ended', 'call-timeout', 'call-rejected'].includes(data.type)) {
                    session.participants.forEach((p) => {
                        try { p.ws.close(1000); } catch (e) { }
                    });
                    callSessions.delete(appointmentId);
                }
                break;

            case 'incoming_call_broadcast': {
                const targetDoctorId = String(data.doctorId || '');
                if (!targetDoctorId) {
                    console.warn('⚠️ [incoming_call_broadcast] Missing doctorId, ignoring');
                    break;
                }
                const message = {
                    type: 'incoming_call',
                    appointment_id: data.appointmentId || appointmentId,
                    call_type: data.callType === 'video' ? 'video' : 'voice',
                    caller_name: data.callerName || '',
                    caller_profile_picture: data.callerProfilePicture || '',
                    caller_id: data.callerId || userId,
                    isIncomingCall: 'true',
                    source: 'websocket_notification',
                    timestamp: new Date().toISOString()
                };
                const doctorConns = userNotificationConnections.get(targetDoctorId) || new Set();
                let sent = 0;
                doctorConns.forEach((doctorWs) => {
                    if (doctorWs.readyState === WebSocket.OPEN && safeSend(doctorWs, message)) sent++;
                });
                console.log(`📞 [incoming_call_broadcast] doctor=${targetDoctorId} appointment=${appointmentId} sent=${sent}`);
                break;
            }

            default:
                console.warn(`⚠️ Unknown message type: ${data.type} from user ${userId}`, JSON.stringify(data));
        }
    });

    ws.on('close', () => {
        console.log(`🔌 Connection closed: ${userType} ${userId}`);
        connections.delete(ws);
        if (session.participants.has(userId)) session.participants.delete(userId);
        cleanupSessionIfEmpty(appointmentId);
    });

    ws.on('error', (err) => console.error('❌ WebSocket error:', err.message));
});

// -------------------
// START SERVER
// -------------------
const PORT = process.env.WEBRTC_CALL_SIGNALING_PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 WebRTC Call Server running on port ${PORT}`);
    console.log(`🔗 Call signaling: ws://localhost:${PORT}/call-signaling`);
    console.log(`🔔 Incoming-call notifications: ws://localhost:${PORT}/incoming-call-notifications`);
    console.log(`📮 Broadcast endpoint: POST http://localhost:${PORT}/broadcast-incoming-call`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
});

// -------------------
// GRACEFUL SHUTDOWN
// -------------------
['SIGTERM', 'SIGINT'].forEach((sig) => {
    process.on(sig, () => {
        console.log(`🛑 Received ${sig}, shutting down...`);

        // Close signaling connections
        wss.clients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) ws.close(1000, 'Server shutting down');
        });

        // Close notification connections
        userNotificationConnections.forEach((set) => {
            set.forEach((ws) => {
                if (ws.readyState === WebSocket.OPEN) ws.close(1000, 'Server shutting down');
            });
        });

        server.close(() => process.exit(0));
    });
});
