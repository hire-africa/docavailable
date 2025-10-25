// Simple patch to add image support to the working WebRTC server
// This will be applied to webrtc-chat-server-working.js

// Add image serving function
function serveImageFile(req, res, imagePath) {
  if (imagePath.includes('..') || imagePath.includes('//')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid path');
    return;
  }

  const fullPath = path.join(UPLOAD_DIR, imagePath);
  
  if (!fs.existsSync(fullPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Image not found');
    return;
  }

  const stats = fs.statSync(fullPath);
  const fileSize = stats.size;
  const range = req.headers.range;

  if (range) {
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
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'image/jpeg',
    };
    res.writeHead(200, head);
    fs.createReadStream(fullPath).pipe(res);
  }
}

// Update the ALLOWED_AUDIO_TYPES to include images
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// Update the filter function in handleVoiceUpload to accept images
// Change the filter from:
// filter: function ({ name, originalFilename, mimetype }) {
//   return name === 'file' && ALLOWED_AUDIO_TYPES.includes(mimetype);
// }
// To:
// filter: function ({ name, originalFilename, mimetype }) {
//   return name === 'file' && (ALLOWED_AUDIO_TYPES.includes(mimetype) || ALLOWED_IMAGE_TYPES.includes(mimetype));
// }

// Add image serving route in the HTTP server
// Add this after the audio serving route:
// if (req.url && req.url.startsWith('/api/images/')) {
//   const imagePath = req.url.replace('/api/images/', '');
//   serveImageFile(req, res, imagePath);
//   return;
// }

// Update the file processing to handle images
// In the handleVoiceUpload function, after getting the uploadedFile:
// const isImage = ALLOWED_IMAGE_TYPES.includes(uploadedFile.mimetype);
// const folderName = isImage ? 'chat_images' : 'chat_voice_messages';
// const filenamePrefix = isImage ? 'image' : 'voice';
// const mediaUrl = isImage ? `/api/images/${relativePath}` : `/api/audio/${relativePath}`;
