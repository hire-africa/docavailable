const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.11:8000';

async function runDiagnostic() {
  console.log('🔍 Starting comprehensive network diagnostic...\n');

  // Test 1: Basic connectivity
  console.log('1️⃣ Testing basic network connectivity...');
  try {
    const { stdout } = await execAsync(`ping -n 4 172.20.10.11`);
    console.log('✅ Ping successful:', stdout.split('\n')[1]);
  } catch (error) {
    console.log('❌ Ping failed:', error.message);
  }

  // Test 2: Port connectivity
  console.log('\n2️⃣ Testing port 8000 connectivity...');
  try {
    const { stdout } = await execAsync(`netstat -an | findstr :8000`);
    console.log('✅ Port 8000 status:', stdout || 'No active connections on port 8000');
  } catch (error) {
    console.log('❌ Port check failed:', error.message);
  }

  // Test 3: HTTP connectivity
  console.log('\n3️⃣ Testing HTTP connectivity to backend...');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`, {
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
      }
    });
    console.log('✅ Backend is responding:', response.data);
  } catch (error) {
    console.log('❌ Backend connection failed:', {
      message: error.message,
      code: error.code,
      status: error.response?.status
    });
  }

  // Test 4: Environment variables
  console.log('\n4️⃣ Checking environment configuration...');
  console.log('API_BASE_URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
  console.log('LARAVEL_API_URL:', process.env.EXPO_PUBLIC_LARAVEL_API_URL);

  // Test 5: Local network interfaces
  console.log('\n5️⃣ Checking local network interfaces...');
  try {
    const { stdout } = await execAsync('ipconfig');
    const lines = stdout.split('\n');
    const relevantLines = lines.filter(line => 
      line.includes('IPv4') || line.includes('172.20.10') || line.includes('192.168')
    );
    console.log('Network interfaces:', relevantLines.slice(0, 5));
  } catch (error) {
    console.log('❌ Network interface check failed:', error.message);
  }

  console.log('\n🔍 Diagnostic complete!');
}

runDiagnostic().catch(console.error); 