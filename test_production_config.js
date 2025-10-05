const fs = require('fs');
const path = require('path');

console.log('🧪 Production Build Configuration Test');
console.log('======================================\n');

// Test 1: Check network security config exists
console.log('1. Checking network security configuration...');
const networkConfigPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'res', 'xml', 'network_security_config.xml');
if (fs.existsSync(networkConfigPath)) {
    console.log('✅ Network security config exists');
    const content = fs.readFileSync(networkConfigPath, 'utf8');
    if (content.includes('46.101.123.123')) {
        console.log('✅ WebRTC server domain configured in network security');
    } else {
        console.log('⚠️ WebRTC server domain not found in network security config');
    }
} else {
    console.log('❌ Network security config missing');
    console.log('💡 Run: mkdir -p android/app/src/main/res/xml');
}

// Test 2: Check AndroidManifest.xml permissions
console.log('\n2. Checking Android permissions...');
const manifestPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
    const manifest = fs.readFileSync(manifestPath, 'utf8');
    
    const requiredPermissions = [
        'android.permission.INTERNET',
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.WAKE_LOCK'
    ];
    
    let missingPermissions = [];
    requiredPermissions.forEach(permission => {
        if (manifest.includes(permission)) {
            console.log(`✅ ${permission}`);
        } else {
            console.log(`❌ ${permission}`);
            missingPermissions.push(permission);
        }
    });
    
    if (manifest.includes('networkSecurityConfig')) {
        console.log('✅ Network security config referenced in manifest');
    } else {
        console.log('❌ Network security config not referenced in manifest');
    }
    
    if (missingPermissions.length === 0) {
        console.log('✅ All required permissions present');
    } else {
        console.log(`⚠️ Missing ${missingPermissions.length} permissions`);
    }
} else {
    console.log('❌ AndroidManifest.xml not found');
}

// Test 3: Check EAS build configuration
console.log('\n3. Checking EAS build configuration...');
const easConfigPath = path.join(__dirname, 'eas.json');
if (fs.existsSync(easConfigPath)) {
    const easConfig = JSON.parse(fs.readFileSync(easConfigPath, 'utf8'));
    
    if (easConfig.build?.production?.env) {
        const prodEnv = easConfig.build.production.env;
        console.log('✅ Production build configuration exists');
        
        // Check WebRTC URLs
        const signalingUrl = prodEnv.EXPO_PUBLIC_WEBRTC_SIGNALING_URL;
        const chatSignalingUrl = prodEnv.EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL;
        
        if (signalingUrl && signalingUrl.startsWith('wss://')) {
            console.log('✅ Production signaling URL uses secure WebSocket (wss://)');
        } else {
            console.log('⚠️ Production signaling URL should use wss:// for secure connection');
            console.log(`   Current: ${signalingUrl}`);
        }
        
        if (chatSignalingUrl && chatSignalingUrl.startsWith('wss://')) {
            console.log('✅ Production chat signaling URL uses secure WebSocket (wss://)');
        } else {
            console.log('⚠️ Production chat signaling URL should use wss:// for secure connection');
            console.log(`   Current: ${chatSignalingUrl}`);
        }
        
        // Check API URL
        const apiUrl = prodEnv.EXPO_PUBLIC_API_BASE_URL;
        if (apiUrl && apiUrl.startsWith('https://')) {
            console.log('✅ Production API URL uses HTTPS');
        } else {
            console.log('⚠️ Production API URL should use HTTPS');
            console.log(`   Current: ${apiUrl}`);
        }
        
    } else {
        console.log('❌ Production build environment variables not configured');
    }
    
    if (easConfig.build?.preview?.env) {
        console.log('✅ Preview build configuration exists');
    } else {
        console.log('⚠️ Preview build configuration missing');
    }
} else {
    console.log('❌ EAS configuration (eas.json) not found');
}

// Test 4: Check app configuration
console.log('\n4. Checking app configuration...');
const appConfigPath = path.join(__dirname, 'app.config.js');
if (fs.existsSync(appConfigPath)) {
    console.log('✅ App configuration exists');
    
    // Basic syntax check
    try {
        delete require.cache[require.resolve('./app.config.js')];
        const appConfig = require('./app.config.js');
        
        if (appConfig.expo?.extra?.webrtc) {
            console.log('✅ WebRTC configuration found in app config');
            
            const webrtcConfig = appConfig.expo.extra.webrtc;
            if (typeof webrtcConfig.signalingUrl === 'string') {
                console.log('✅ Signaling URL configuration is valid');
            } else {
                console.log('⚠️ Signaling URL configuration may have issues');
            }
        } else {
            console.log('⚠️ WebRTC configuration not found in app config');
        }
        
        if (appConfig.expo?.android?.permissions) {
            console.log('✅ Android permissions configured in app config');
        } else {
            console.log('⚠️ Android permissions not found in app config');
        }
        
    } catch (error) {
        console.log('❌ App configuration has syntax errors:', error.message);
    }
} else {
    console.log('❌ App configuration not found');
}

// Test 5: Check for common production issues
console.log('\n5. Checking for common production issues...');

// Check if WebRTC server is accessible
console.log('🌐 Testing WebRTC server connectivity...');
console.log('💡 Run this manually: telnet 46.101.123.123 8082');
console.log('💡 For production: telnet 46.101.123.123 8083');

// Check file structure
const requiredDirs = [
    'android/app/src/main/res/xml',
    'services',
    'app/services'
];

requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
        console.log(`✅ Directory exists: ${dir}`);
    } else {
        console.log(`⚠️ Directory missing: ${dir}`);
    }
});

console.log('\n📋 Summary:');
console.log('===========');
console.log('If all checks pass with ✅, your production build should work correctly.');
console.log('If you see ❌ or ⚠️, fix those issues before building for production.');
console.log('\n🚀 To build for production:');
console.log('   eas build --platform android --profile production');
console.log('\n📱 To test in preview:');
console.log('   eas build --platform android --profile preview');

console.log('\n🔧 WebRTC Server Requirements:');
console.log('   - Development: ws://46.101.123.123:8082 (HTTP WebSocket)');
console.log('   - Production: wss://46.101.123.123:8083 (HTTPS WebSocket)');
console.log('   - Make sure your server supports both protocols');