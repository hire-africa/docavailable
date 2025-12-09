const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { formidable } = require('formidable');

const PORT = 8089;
const UPLOAD_DIR = '/var/www/docavailable/storage/app/public';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_AUDIO_TYPES = ['audio/mp4', 'audio/m4a', 'audio/wav', 'audio/mpeg'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// Create upload directory if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Create temp directory for uploads
const tempDir = path.join(UPLOAD_DIR, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Create voice messages directory
const voiceDir = path.join(UPLOAD_DIR, 'chat_voice_messages');
if (!fs.existsSync(voiceDir)) {
  fs.mkdirSync(voiceDir, { recursive: true });
}

// Create images directory
const imagesDir = path.join(UPLOAD_DIR, 'chat_images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Audio serving function
function serveAudioFile(req, res, audioPath) {
  // Security check - prevent directory traversal
  if (audioPath.includes('..') || audioPath.includes('//')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid path');
    return;
  }

  const fullPath = path.join(UPLOAD_DIR, audioPath);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Audio file not found');
    return;
  }

  // Get file stats
  const stats = fs.statSync(fullPath);
  const fileSize = stats.size;
  const range = req.headers.range;

  if (range) {
    // Handle range requests for partial content
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(fullPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/m4a',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    // Serve full file
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'audio/m4a',
    };
    res.writeHead(200, head);
    fs.createReadStream(fullPath).pipe(res);
  }
}

// Image serving function
function serveImageFile(req, res, imagePath) {
  // Security check - prevent directory traversal
  if (imagePath.includes('..') || imagePath.includes('//')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid path');
    return;
  }

  const fullPath = path.join(UPLOAD_DIR, imagePath);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Image not found');
    return;
  }

  // Get file stats
  const stats = fs.statSync(fullPath);
  const fileSize = stats.size;
  const range = req.headers.range;

  if (range) {
    // Handle range requests for partial content
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(fullPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'image/jpeg',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    // Serve full file
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'image/jpeg',
    };
    res.writeHead(200, head);
    fs.createReadStream(fullPath).pipe(res);
  }
}

// File upload handler (handles both voice and images)
function handleFileUpload(req, res) {
  const form = formidable({
    uploadDir: tempDir,
    maxFileSize: MAX_FILE_SIZE,
    filter: function ({ name, originalFilename, mimetype }) {
      return name === 'file' && (ALLOWED_AUDIO_TYPES.includes(mimetype) || ALLOWED_IMAGE_TYPES.includes(mimetype));
    }
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('File upload error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Upload failed' }));
      return;
    }

    try {
      const uploadedFile = files.file[0];
      const appointmentId = fields.appointment_id ? fields.appointment_id[0] : '120';

      if (!uploadedFile) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'No file provided' }));
        return;
      }

      // Determine if it's an image or audio file
      const isImage = ALLOWED_IMAGE_TYPES.includes(uploadedFile.mimetype);
      const folderName = isImage ? 'chat_images' : 'chat_voice_messages';
      const filenamePrefix = isImage ? 'image' : 'voice';

      // Create appointment directory
      const appointmentDir = path.join(UPLOAD_DIR, folderName, appointmentId);
      if (!fs.existsSync(appointmentDir)) {
        fs.mkdirSync(appointmentDir, { recursive: true });
      }

      // Generate filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 8);
      const ext = path.extname(uploadedFile.originalFilename || '');
      const filename = `${filenamePrefix}_${timestamp}_${randomId}${ext}`;
      const finalPath = path.join(appointmentDir, filename);

      // Move file to final location
      fs.renameSync(uploadedFile.filepath, finalPath);

      // Return success response
      const relativePath = `${folderName}/${appointmentId}/${filename}`;
      const mediaUrl = isImage ? `/api/images/${relativePath}` : `/api/audio/${relativePath}`;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          media_url: mediaUrl,
          url: mediaUrl,
          filename: filename,
          appointment_id: appointmentId,
          file_type: isImage ? 'image' : 'audio'
        }
      }));

      console.log(`✅ File uploaded: ${finalPath} (${isImage ? 'image' : 'audio'})`);
    } catch (error) {
      console.error('File processing error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Processing failed' }));
    }
  });
}

// WebSocket server for chat signaling
const wss = new WebSocket.Server({ port: PORT + 1 });

wss.on('connection', (ws, req) => {
  console.log('🔌 WebRTC chat client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Chat message received:', data);
      
      // Echo back to client
      ws.send(JSON.stringify({
        ...data,
        timestamp: Date.now(),
        server: 'webrtc-chat'
      }));
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebRTC chat client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebRTC chat error:', error);
  });
});

// HTTP server for file uploads and serving
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle audio file serving
  if (req.url && req.url.startsWith('/api/audio/')) {
    const audioPath = req.url.replace('/api/audio/', '');
    serveAudioFile(req, res, audioPath);
    return;
  }

  // Handle image file serving
  if (req.url && req.url.startsWith('/api/images/')) {
    const imagePath = req.url.replace('/api/images/', '');
    serveImageFile(req, res, imagePath);
    return;
  }

  // Handle file upload (both voice and images)
  if (req.url === '/api/upload/voice-message' && req.method === 'POST') {
    handleFileUpload(req, res);
    return;
  }

  // Handle image upload specifically
  if (req.url === '/api/upload/image' && req.method === 'POST') {
    handleFileUpload(req, res);
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: 'webrtc-chat-server',
      features: ['voice-upload', 'image-upload', 'voice-serving', 'image-serving']
    }));
    return;
  }

  // Default response
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('WebRTC Chat Server - Not found');
});

server.listen(PORT, () => {
  console.log(`🔊 WebRTC Chat Server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  console.log(`🎵 Voice messages: ${voiceDir}`);
  console.log(`🖼️  Images: ${imagesDir}`);
  console.log(`📡 WebSocket on port ${PORT + 1}`);
});
