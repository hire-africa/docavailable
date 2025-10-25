const http = require('http');
const fs = require('fs');
const path = require('path');
const { formidable } = require('formidable');

const PORT = 8083;
const UPLOAD_DIR = '/var/www/docavailable/storage/app/public';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// Create upload directory if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
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

// Image upload handler
function handleImageUpload(req, res) {
  const form = formidable({
    uploadDir: path.join(UPLOAD_DIR, 'temp'),
    maxFileSize: MAX_FILE_SIZE,
    filter: function ({ name, originalFilename, mimetype }) {
      return name === 'file' && ALLOWED_IMAGE_TYPES.includes(mimetype);
    }
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Image upload error:', err);
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

      // Create appointment directory
      const appointmentDir = path.join(UPLOAD_DIR, 'chat_images', appointmentId);
      if (!fs.existsSync(appointmentDir)) {
        fs.mkdirSync(appointmentDir, { recursive: true });
      }

      // Generate filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 8);
      const ext = path.extname(uploadedFile.originalFilename || '');
      const filename = `image_${timestamp}_${randomId}${ext}`;
      const finalPath = path.join(appointmentDir, filename);

      // Move file to final location
      fs.renameSync(uploadedFile.filepath, finalPath);

      // Return success response
      const relativePath = `chat_images/${appointmentId}/${filename}`;
      const mediaUrl = `/api/images/${relativePath}`;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          media_url: mediaUrl,
          url: mediaUrl,
          filename: filename,
          appointment_id: appointmentId
        }
      }));

      console.log(`✅ Image uploaded: ${finalPath}`);
    } catch (error) {
      console.error('Image processing error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Processing failed' }));
    }
  });
}

// HTTP request handler
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

  // Handle image file serving
  if (req.url && req.url.startsWith('/api/images/')) {
    const imagePath = req.url.replace('/api/images/', '');
    serveImageFile(req, res, imagePath);
    return;
  }

  // Handle image upload
  if (req.url === '/api/upload/image' && req.method === 'POST') {
    handleImageUpload(req, res);
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'image-server' }));
    return;
  }

  // Default response
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Image server - Not found');
});

server.listen(PORT, () => {
  console.log(`🖼️  Image server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
});
