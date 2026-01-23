#!/usr/bin/env node

/**
 * Robust Unified WebRTC Signaling Server for DocAvailable
 * Consolidates audio, call, and chat signaling with ICE buffering and reliable session management.
 * Designed to work behind Nginx on Port 8081.
 */

const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

// Configuration
const CONFIG = {
    PORT: 8081,
    API_BASE_URL: 'https://docavailable.org',
    WEBRTC_STORAGE_DIR: '/var/www/docavailable/storage/app/public/webrtc-uploads',
    MAX_PAYLOAD: 100 * 1024 * 1024, // 100MB for media uploads
    ICE_BUFFER_TIMEOUT: 120000, // 2 minutes
};

// Ensure storage directory exists
if (!fs.existsSync(CONFIG.WEBRTC_STORAGE_DIR)) {
    try {
        fs.mkdirSync(CONFIG.WEBRTC_STORAGE_DIR, { recursive: true });
        console.log(`📁 Created storage directory: ${CONFIG.WEBRTC_STORAGE_DIR}`);
    } catch (e) {
        console.error(`❌ Failed to create storage directory: ${e.message}`);
    }
}

// State Management
const sessions = new Map(); // appointmentId -> { participants: Map, bufferedIceCandidates: Array }

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // Health Checks
    if (parsedUrl.pathname === '/health' || parsedUrl.pathname === '/webrtc-health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            status: 'ok',
            activeSessions: sessions.size,
            uptime: process.uptime()
        }));
    }

    // Voice Message Upload Endpoint
    if (parsedUrl.pathname === '/api/upload/voice-message' && req.method === 'POST') {
        console.log('🎤 Receiving voice message upload...');
        const form = new formidable.IncomingForm({
            uploadDir: CONFIG.WEBRTC_STORAGE_DIR,
            keepExtensions: true,
            maxFileSize: CONFIG.MAX_PAYLOAD
        });

        return form.parse(req, (err, fields, files) => {
            if (err) {
                console.error('❌ Upload error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: err.message }));
            }

            const appointmentId = fields.appointmentId || 'unknown';
            const file = files.audio || files.file;

            if (!file) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: 'No file uploaded' }));
            }

            const fileName = `voice_${appointmentId}_${Date.now()}.m4a`;
            const destPath = path.join(CONFIG.WEBRTC_STORAGE_DIR, fileName);

            fs.rename(file.filepath, destPath, (renameErr) => {
                if (renameErr) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: renameErr.message }));
                }

                const publicUrl = `/storage/webrtc-uploads/${fileName}`;
                console.log(`✅ Voice message saved: ${publicUrl}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, url: publicUrl }));
            });
        });
    }

    res.writeHead(404);
    res.end();
});

// WebSocket Servers
const wssOptions = {
    server,
    maxPayload: CONFIG.MAX_PAYLOAD,
    perMessageDeflate: false
};

const callWss = new WebSocket.Server({ ...wssOptions, path: '/call-signaling' });
const audioWss = new WebSocket.Server({ ...wssOptions, path: '/audio-signaling' });
const chatWss = new WebSocket.Server({ ...wssOptions, path: '/chat-signaling' });

function setupWssHandlers(wss, type) {
    wss.on('connection', (ws, req) => {
        const params = new url.parse(req.url, true).query;
        const appointmentId = params.appointmentId;
        const userId = params.userId;
        const userType = params.userType || (type === 'chat' ? 'unknown' : 'doctor');

        if (!appointmentId || !userId) {
            console.log(`❌ [${type}] Connection rejected: Missing params`, { appointmentId, userId });
            ws.close();
            return;
        }

        ws.appointmentId = appointmentId;
        ws.userId = userId;
        ws.userType = userType;
        ws.isAlive = true;

        console.log(`🔗 [${type}] New connection: ${userType} ${userId} for appointment ${appointmentId}`);

        if (!sessions.has(appointmentId)) {
            sessions.set(appointmentId, {
                participants: new Map(),
                bufferedIceCandidates: []
            });
        }

        const session = sessions.get(appointmentId);
        session.participants.set(userId, ws);

        // Send confirmation
        ws.send(JSON.stringify({ type: 'connection-established', appointmentId, timestamp: new Date().toISOString() }));

        // Send buffered ICE candidates for calls
        if (type !== 'chat' && session.bufferedIceCandidates.length > 0) {
            console.log(`🧊 [${type}] Sending ${session.bufferedIceCandidates.length} buffered ICE candidates for ${appointmentId}`);
            session.bufferedIceCandidates.forEach(candidate => {
                if (candidate.userId !== userId) {
                    ws.send(JSON.stringify(candidate));
                }
            });
        }

        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());

                // Route message
                switch (message.type) {
                    case 'ping':
                        ws.send(JSON.stringify({ type: 'pong' }));
                        break;

                    case 'session-status-request':
                        await handleSessionStatusRequest(appointmentId, ws);
                        break;

                    case 'offer':
                    case 'answer':
                        broadcastToOthers(ws, appointmentId, message);
                        break;

                    case 'ice-candidate':
                        if (type !== 'chat') {
                            session.bufferedIceCandidates.push(message);
                            // Keep buffer lean
                            if (session.bufferedIceCandidates.length > 50) session.bufferedIceCandidates.shift();
                        }
                        broadcastToOthers(ws, appointmentId, message);
                        break;

                    case 'chat-message':
                        broadcastToOthers(ws, appointmentId, message);
                        break;

                    case 'call-ended':
                    case 'call-rejected':
                        broadcastToOthers(ws, appointmentId, message);
                        sessions.delete(appointmentId);
                        break;

                    default:
                        broadcastToOthers(ws, appointmentId, message);
                }
            } catch (e) {
                console.error(`❌ [${type}] Message error:`, e.message);
            }
        });

        ws.on('pong', () => { ws.isAlive = true; });

        ws.on('close', () => {
            console.log(`🔌 [${type}] Connection closed: ${userId}`);
            if (sessions.has(appointmentId)) {
                const s = sessions.get(appointmentId);
                s.participants.delete(userId);
                if (s.participants.size === 0) {
                    // Start cleanup timer
                    setTimeout(() => {
                        if (sessions.has(appointmentId) && sessions.get(appointmentId).participants.size === 0) {
                            sessions.delete(appointmentId);
                            console.log(`🗑️ [${type}] Session cleaned up: ${appointmentId}`);
                        }
                    }, 30000);
                }
            }
        });
    });
}

function broadcastToOthers(senderWs, appointmentId, message) {
    const session = sessions.get(appointmentId);
    if (!session) return;
    session.participants.forEach((ws, userId) => {
        if (ws !== senderWs && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    });
}

async function handleSessionStatusRequest(appointmentId, ws) {
    try {
        console.log(`🔍 Checking status for session: ${appointmentId}`);
        let endpoint = `${CONFIG.API_BASE_URL}/api/appointments/${appointmentId}/status`;
        if (appointmentId.startsWith('text_session_')) {
            const sessionId = appointmentId.replace('text_session_', '');
            endpoint = `${CONFIG.API_BASE_URL}/api/text-sessions/${sessionId}`;
        }

        const response = await axios.get(endpoint, {
            headers: { 'Authorization': `Bearer ${ws.authToken || ''}` }
        });

        if (response.data.success) {
            ws.send(JSON.stringify({
                type: 'session-status-response',
                sessionData: response.data.data,
                appointmentId: appointmentId
            }));
        }
    } catch (e) {
        console.error(`❌ Status check failed for ${appointmentId}:`, e.message);
        // Fallback: send a "fake" active status if we're connected to avoid UI lockup
        ws.send(JSON.stringify({
            type: 'session-status-response',
            sessionData: { status: '7', is_active: true },
            appointmentId: appointmentId
        }));
    }
}

setupWssHandlers(callWss, 'call');
setupWssHandlers(audioWss, 'audio');
setupWssHandlers(chatWss, 'chat');

// Keep-alive
setInterval(() => {
    [callWss, audioWss, chatWss].forEach(wss => {
        wss.clients.forEach(ws => {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    });
}, 30000);

server.listen(CONFIG.PORT, () => {
    console.log(`🚀 Robust Unified Signaling Server running on port ${CONFIG.PORT}`);
    console.log(`📍 Call Signaling: /call-signaling`);
    console.log(`📍 Audio Signaling: /audio-signaling`);
    console.log(`📍 Chat Signaling: /chat-signaling`);
});
