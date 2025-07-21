#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors/safe');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.11:8000/api';
const BACKEND_URL = 'http://172.20.10.11:8000';

const log = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  switch (type) {
    case 'success':
      console.log(colors.green(`[${timestamp}] ✅ ${message}`));
      break;
    case 'error':
      console.log(colors.red(`[${timestamp}] ❌ ${message}`));
      break;
    case 'warning':
      console.log(colors.yellow(`[${timestamp}] ⚠️  ${message}`));
      break;
    case 'info':
      console.log(colors.blue(`[${timestamp}] ℹ️  ${message}`));
      break;
    default:
      console.log(`[${timestamp}] ${message}`);
  }
};

const testPing = async (host) => {
  try {
    const { stdout } = await execAsync(`ping -n 1 ${host}`);
    return stdout.includes('TTL=') || stdout.includes('time=');
  } catch (error) {
    return false;
  }
};

const testPort = async (host, port) => {
  try {
    const { stdout } = await execAsync(`netstat -an | findstr :${port}`);
    return stdout.includes(`:${port}`);
  } catch (error) {
    return false;
  }
};

const testHttpConnectivity = async (url, timeout = 5000) => {
  try {
    const response = await axios.get(url, {
      timeout,
      headers: {
        'Accept': 'application/json',
      }
    });
    return {
      success: true,
      status: response.status,
      data: response.data,
      responseTime: response.headers['x-response-time'] || 'unknown'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      status: error.response?.status
    };
  }
};

const runDiagnostics = async () => {
  console.log(colors.cyan.bold('\n🔍 Network Diagnostic Tool\n'));
  console.log(colors.gray(`Target Backend: ${BACKEND_URL}`));
  console.log(colors.gray(`API Endpoint: ${API_BASE_URL}`));
  console.log(colors.gray(`Platform: ${process.platform}`));
  console.log(colors.gray(`Node Version: ${process.version}\n`));

  // Test 1: Basic ping
  log('Testing basic network connectivity...', 'info');
  const pingResult = await testPing('172.20.10.11');
  if (pingResult) {
    log('Ping to 172.20.10.11 successful', 'success');
  } else {
    log('Ping to 172.20.10.11 failed', 'error');
  }

  // Test 2: Port check
  log('Checking if port 8000 is listening...', 'info');
  const portResult = await testPort('172.20.10.11', 8000);
  if (portResult) {
    log('Port 8000 is listening', 'success');
  } else {
    log('Port 8000 is not listening', 'warning');
  }

  // Test 3: HTTP connectivity with different timeouts
  log('Testing HTTP connectivity with 5s timeout...', 'info');
  const httpResult5s = await testHttpConnectivity(`${BACKEND_URL}/api/health`, 5000);
  if (httpResult5s.success) {
    log(`HTTP test passed (${httpResult5s.status})`, 'success');
  } else {
    log(`HTTP test failed: ${httpResult5s.error}`, 'error');
  }

  // Test 4: HTTP connectivity with longer timeout
  log('Testing HTTP connectivity with 30s timeout...', 'info');
  const httpResult30s = await testHttpConnectivity(`${BACKEND_URL}/api/health`, 30000);
  if (httpResult30s.success) {
    log(`HTTP test passed (${httpResult30s.status})`, 'success');
  } else {
    log(`HTTP test failed: ${httpResult30s.error}`, 'error');
  }

  // Test 5: Direct backend health check
  log('Testing direct backend health endpoint...', 'info');
  const healthResult = await testHttpConnectivity(`${API_BASE_URL}/health`, 10000);
  if (healthResult.success) {
    log('Backend health check passed', 'success');
    console.log(colors.gray(`Response: ${JSON.stringify(healthResult.data, null, 2)}`));
  } else {
    log(`Backend health check failed: ${healthResult.error}`, 'error');
  }

  // Test 6: Network interface check
  log('Checking network interfaces...', 'info');
  try {
    const { stdout } = await execAsync('ipconfig');
    const lines = stdout.split('\n');
    const ipLines = lines.filter(line => line.includes('IPv4 Address'));
    console.log(colors.gray('Available IP addresses:'));
    ipLines.forEach(line => {
      const match = line.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (match) {
        console.log(colors.gray(`  - ${match[1]}`));
      }
    });
  } catch (error) {
    log('Could not get network interfaces', 'warning');
  }

  // Test 7: Firewall check
  log('Checking Windows Firewall status...', 'info');
  try {
    const { stdout } = await execAsync('netsh advfirewall show allprofiles state');
    if (stdout.includes('ON')) {
      log('Windows Firewall is enabled - this might block connections', 'warning');
    } else {
      log('Windows Firewall is disabled', 'info');
    }
  } catch (error) {
    log('Could not check firewall status', 'warning');
  }

  console.log(colors.cyan.bold('\n📋 Recommendations:\n'));
  
  if (!pingResult) {
    console.log(colors.red('• Your PC cannot ping 172.20.10.11 - check network configuration'));
  }
  
  if (!portResult) {
    console.log(colors.yellow('• Port 8000 might not be listening - ensure backend is running'));
  }
  
  if (!httpResult5s.success && httpResult30s.success) {
    console.log(colors.yellow('• Backend responds but is slow - consider network optimization'));
  }
  
  if (!httpResult30s.success) {
    console.log(colors.red('• Backend is not reachable - check:'));
    console.log(colors.gray('  - Backend server is running'));
    console.log(colors.gray('  - Firewall allows port 8000'));
    console.log(colors.gray('  - Network allows connections to 172.20.10.11'));
  }
  
  if (httpResult30s.success) {
    console.log(colors.green('• Backend is reachable from this machine'));
    console.log(colors.yellow('• If mobile app still fails, the issue is likely:'));
    console.log(colors.gray('  - Mobile device cannot reach PC IP'));
    console.log(colors.gray('  - Different network segment'));
    console.log(colors.gray('  - Mobile carrier restrictions'));
  }

  console.log(colors.cyan.bold('\n🔧 Quick Fixes:\n'));
  console.log(colors.gray('1. Ensure backend is running: php artisan serve --host=0.0.0.0 --port=8000'));
  console.log(colors.gray('2. Check Windows Firewall: Allow port 8000'));
  console.log(colors.gray('3. Try different IP: Use your PC\'s actual local IP'));
  console.log(colors.gray('4. Test on same network: Ensure phone and PC are on same WiFi'));
  console.log(colors.gray('5. Try localhost: Use 127.0.0.1 or 172.20.10.11 for simulator testing'));
};

// Run diagnostics
runDiagnostics().catch(error => {
  console.error(colors.red.bold('\n💥 Diagnostic failed:'), error.message);
  process.exit(1);
}); 