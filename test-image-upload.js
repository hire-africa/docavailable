const FormData = require('form-data');
const fs = require('fs');

async function testImageUpload() {
  try {
    console.log('🧪 Testing image upload to WebRTC server...');
    
    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
    
    const form = new FormData();
    form.append('file', testImageBuffer, {
      filename: 'test.png',
      contentType: 'image/png'
    });
    form.append('appointment_id', '120');
    
    const http = require('http');
    const response = await new Promise((resolve, reject) => {
      const req = http.request('http://46.101.123.123:8089/api/upload/image', {
        method: 'POST',
        headers: {
          ...form.getHeaders(),
          'Authorization': 'Bearer test-token'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(JSON.parse(data))
          });
        });
      });
      req.on('error', reject);
      form.pipe(req);
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Image upload successful:', data);
    } else {
      console.error('❌ Image upload failed:', response.status);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testImageUpload();
