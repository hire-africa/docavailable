const https = require('https');

const testBackend = async () => {
  const baseURL = 'https://docavailable-1.onrender.com';
  
  console.log('Testing backend health...');
  
  try {
    // Test health endpoint
    const healthResponse = await makeRequest(`${baseURL}/api/health`);
    console.log('Health endpoint response:', healthResponse);
    
    // Test register endpoint (should return 405 Method Not Allowed for GET)
    try {
      const registerResponse = await makeRequest(`${baseURL}/api/register`);
      console.log('Register endpoint response:', registerResponse);
    } catch (error) {
      console.log('Register endpoint error (expected):', error.message);
    }
    
  } catch (error) {
    console.error('Backend test failed:', error.message);
    
    // Check if it's returning HTML instead of JSON
    if (error.message.includes('HTML') || error.message.includes('<html')) {
      console.error('❌ Backend is returning HTML instead of JSON - deployment issue detected!');
      console.error('This indicates the Laravel application is not properly deployed.');
    }
  }
};

const makeRequest = (url) => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Check if response is HTML
          if (data.includes('<html') || data.includes('<!DOCTYPE')) {
            reject(new Error(`Backend returned HTML instead of JSON: ${data.substring(0, 200)}...`));
            return;
          }
          
          // Try to parse as JSON
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (parseError) {
          reject(new Error(`Failed to parse response as JSON: ${data.substring(0, 200)}...`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

testBackend();
