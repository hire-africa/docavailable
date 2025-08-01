#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors/safe');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.11:8000';
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
    case 'debug':
      console.log(colors.gray(`[${timestamp}] 🔍 ${message}`));
      break;
    default:
      console.log(`[${timestamp}] ${message}`);
  }
};

const section = (title) => {
  console.log('\n' + colors.cyan.bold('=' .repeat(60)));
  console.log(colors.cyan.bold(`  ${title}`));
  console.log(colors.cyan.bold('=' .repeat(60)));
};

const testEndpoint = async (url, method = 'GET', data = null, headers = {}) => {
  try {
    log(`Testing ${method} ${url}`, 'debug');
    
    const config = {
      method,
      url,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    
    log(`✅ SUCCESS: ${method} ${url} (${response.status})`, 'success');
    console.log(colors.gray(`   Response: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...`));
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    log(`❌ FAILED: ${method} ${url}`, 'error');
    if (error.response) {
      console.log(colors.red(`   Status: ${error.response.status}`));
      console.log(colors.red(`   Error: ${error.response.data?.message || 'Unknown error'}`));
      if (error.response.data?.errors) {
        console.log(colors.red(`   Validation Errors: ${JSON.stringify(error.response.data.errors, null, 2)}`));
      }
    } else if (error.request) {
      console.log(colors.red(`   Network Error: ${error.message}`));
      console.log(colors.red(`   Code: ${error.code}`));
    } else {
      console.log(colors.red(`   Error: ${error.message}`));
    }
    return { success: false, error: error.message, status: error.response?.status };
  }
};

const checkServerStatus = async () => {
  try {
    const { stdout } = await execAsync('netstat -an | findstr :8000');
    if (stdout.includes(':8000')) {
      log('Laravel server is running on port 8000', 'success');
      return true;
    } else {
      log('Laravel server is NOT running on port 8000', 'error');
      return false;
    }
  } catch (error) {
    log('Could not check server status', 'warning');
    return false;
  }
};

const checkLaravelLogs = async () => {
  try {
    log('Checking Laravel logs...', 'info');
    const { stdout } = await execAsync('Get-Content storage/logs/laravel.log -Tail 10', { shell: 'powershell' });
    if (stdout.trim()) {
      console.log(colors.yellow('Recent Laravel logs:'));
      console.log(colors.gray(stdout));
    } else {
      log('No recent Laravel logs found', 'info');
    }
  } catch (error) {
    log('Could not read Laravel logs', 'warning');
  }
};

const runDiagnostics = async () => {
  console.log(colors.magenta.bold('\n🔍 COMPREHENSIVE BACKEND CONNECTION DEBUGGER\n'));
  console.log(colors.gray(`Target Backend: ${BACKEND_URL}`));
  console.log(colors.gray(`API Base URL: ${API_BASE_URL}`));
  console.log(colors.gray(`Platform: ${process.platform}`));
  console.log(colors.gray(`Node Version: ${process.version}\n`));

  // 1. Check if server is running
  section('1. SERVER STATUS CHECK');
  const serverRunning = await checkServerStatus();
  
  if (!serverRunning) {
    log('Starting Laravel server...', 'info');
    try {
      exec('php artisan serve --host=0.0.0.0 --port=8000', (error, stdout, stderr) => {
        if (error) {
          log(`Server start error: ${error.message}`, 'error');
        }
        if (stdout) log(`Server output: ${stdout}`, 'debug');
        if (stderr) log(`Server stderr: ${stderr}`, 'warning');
      });
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    } catch (error) {
      log(`Failed to start server: ${error.message}`, 'error');
    }
  }

  // 2. Test basic connectivity
  section('2. BASIC CONNECTIVITY TEST');
  await testEndpoint(`${BACKEND_URL}/api/health`);
  await testEndpoint(`${BACKEND_URL}/api/health`, 'GET', null, { 'User-Agent': 'DebugScript/1.0' });

  // 3. Test authentication endpoints
  section('3. AUTHENTICATION ENDPOINTS TEST');
  
  // Test registration with sample data
  const registrationData = {
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
    password_confirmation: 'password123',
    first_name: 'Test',
    last_name: 'User',
    user_type: 'patient'
  };
  
  await testEndpoint(`${BACKEND_URL}/api/register`, 'POST', registrationData);
  
  // Test login with invalid credentials (should fail gracefully)
  const loginData = {
    email: 'invalid@example.com',
    password: 'wrongpassword'
  };
  
  await testEndpoint(`${BACKEND_URL}/api/login`, 'POST', loginData);

  // 4. Test protected endpoints (should fail without auth)
  section('4. PROTECTED ENDPOINTS TEST (Should fail without auth)');
  await testEndpoint(`${BACKEND_URL}/api/user`);
  await testEndpoint(`${BACKEND_URL}/api/appointments`);

  // 5. Test CORS headers
  section('5. CORS HEADERS TEST');
  try {
    const response = await axios.options(`${BACKEND_URL}/api/health`, {
      headers: {
        'Origin': 'http://172.20.10.11:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    log('CORS preflight request successful', 'success');
    console.log(colors.gray(`   CORS Headers: ${JSON.stringify(response.headers, null, 2)}`));
  } catch (error) {
    log('CORS preflight request failed', 'error');
    console.log(colors.red(`   Error: ${error.message}`));
  }

  // 6. Test different network interfaces
  section('6. NETWORK INTERFACE TEST');
  const testUrls = [
            'http://172.20.10.11:8000/api/health',
    'http://127.0.0.1:8000/api/health',
    'http://172.20.10.11:8000/api/health'
  ];
  
  for (const url of testUrls) {
    await testEndpoint(url);
  }

  // 7. Check Laravel logs
  section('7. LARAVEL LOGS CHECK');
  await checkLaravelLogs();

  // 8. Environment check
  section('8. ENVIRONMENT CONFIGURATION CHECK');
  try {
    const { stdout } = await execAsync('php artisan config:show app.url', { cwd: './' });
    log(`App URL: ${stdout.trim()}`, 'info');
  } catch (error) {
    log('Could not get app URL config', 'warning');
  }

  try {
    const { stdout } = await execAsync('php artisan route:list --path=api | head -20', { shell: 'bash' });
    log('Available API routes:', 'info');
    console.log(colors.gray(stdout));
  } catch (error) {
    // Try PowerShell version
    try {
      const { stdout } = await execAsync('php artisan route:list --path=api', { shell: 'powershell' });
      log('Available API routes:', 'info');
      console.log(colors.gray(stdout.substring(0, 1000)));
    } catch (error2) {
      log('Could not list routes', 'warning');
    }
  }

  // 9. Final recommendations
  section('9. DIAGNOSIS SUMMARY');
  
  console.log(colors.cyan.bold('\n📋 RECOMMENDATIONS:\n'));
  
  if (!serverRunning) {
    console.log(colors.red('• Laravel server is not running'));
    console.log(colors.gray('  Run: php artisan serve --host=0.0.0.0 --port=8000'));
  } else {
    console.log(colors.green('• Laravel server is running ✅'));
  }
  
  console.log(colors.yellow('\n🔧 COMMON SOLUTIONS:\n'));
  console.log(colors.gray('1. Ensure .env file exists with proper configuration'));
  console.log(colors.gray('2. Check Windows Firewall allows port 8000'));
  console.log(colors.gray('3. Verify mobile device is on same WiFi network'));
  console.log(colors.gray('4. Clear Laravel cache: php artisan cache:clear'));
  console.log(colors.gray('5. Check Laravel logs: storage/logs/laravel.log'));
  
  console.log(colors.cyan.bold('\n🚀 NEXT STEPS:\n'));
  console.log(colors.gray('1. Fix any errors shown above'));
  console.log(colors.gray('2. Test endpoints in mobile app'));
  console.log(colors.gray('3. Check mobile app console for detailed errors'));
  console.log(colors.gray('4. Verify API calls in mobile app use correct URLs'));
};

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection: ${reason}`, 'error');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'error');
  process.exit(1);
});

// Run diagnostics
runDiagnostics().catch(error => {
  console.error(colors.red.bold('\n💥 Diagnostic failed:'), error.message);
  process.exit(1);
}); 