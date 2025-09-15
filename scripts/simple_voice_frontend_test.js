/**
 * Simple frontend voice recording test
 * This script tests basic functionality without requiring ES6 modules
 */

console.log('🎤 Simple Voice Recording Frontend Test\n');

// Test 1: Check if FormData is available
console.log('Test 1: Checking FormData availability');
if (typeof FormData !== 'undefined') {
    console.log('✅ FormData is available');
    
    // Test FormData creation
    try {
        const formData = new FormData();
        formData.append('test', 'value');
        console.log('✅ FormData creation successful');
    } catch (error) {
        console.log('❌ FormData creation failed:', error.message);
    }
} else {
    console.log('❌ FormData is not available');
}

// Test 2: Check if fetch is available
console.log('\nTest 2: Checking fetch availability');
if (typeof fetch !== 'undefined') {
    console.log('✅ Fetch is available');
} else {
    console.log('❌ Fetch is not available');
}

// Test 3: Check file structure
console.log('\nTest 3: Checking file structure');
const fs = require('fs');
const path = require('path');

const filesToCheck = [
    '../services/voiceRecordingService.ts',
    '../components/VoiceMessagePlayer.tsx',
    '../app/chat/[appointmentId].tsx',
    '../app/services/apiService.ts',
    '../services/messageStorageService.ts'
];

filesToCheck.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${file} exists`);
        
        // Check if file contains voice recording code
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('voice') || content.includes('Voice') || content.includes('recording')) {
            console.log(`   Contains voice recording code`);
        }
    } else {
        console.log(`❌ ${file} not found`);
    }
});

// Test 4: Check package.json for expo-av
console.log('\nTest 4: Checking package.json for expo-av');
const packageJsonPath = path.join(__dirname, '../package.json');
if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.dependencies && packageJson.dependencies['expo-av']) {
        console.log('✅ expo-av is in dependencies');
        console.log(`   Version: ${packageJson.dependencies['expo-av']}`);
    } else {
        console.log('❌ expo-av not found in dependencies');
    }
} else {
    console.log('❌ package.json not found');
}

// Test 5: Check for voice recording imports in chat component
console.log('\nTest 5: Checking chat component for voice recording imports');
const chatComponentPath = path.join(__dirname, '../app/chat/[appointmentId].tsx');
if (fs.existsSync(chatComponentPath)) {
    const chatContent = fs.readFileSync(chatComponentPath, 'utf8');
    
    const checks = [
        { name: 'voiceRecordingService import', pattern: 'voiceRecordingService' },
        { name: 'VoiceMessagePlayer import', pattern: 'VoiceMessagePlayer' },
        { name: 'isRecording state', pattern: 'isRecording' },
        { name: 'recordingDuration state', pattern: 'recordingDuration' },
        { name: 'startRecording function', pattern: 'startRecording' },
        { name: 'stopRecording function', pattern: 'stopRecording' },
        { name: 'sendVoiceMessage function', pattern: 'sendVoiceMessage' }
    ];
    
    checks.forEach(check => {
        if (chatContent.includes(check.pattern)) {
            console.log(`✅ ${check.name} found`);
        } else {
            console.log(`❌ ${check.name} not found`);
        }
    });
} else {
    console.log('❌ Chat component not found');
}

// Test 6: Check voice recording service
console.log('\nTest 6: Checking voice recording service');
const voiceServicePath = path.join(__dirname, '../services/voiceRecordingService.ts');
if (fs.existsSync(voiceServicePath)) {
    const voiceServiceContent = fs.readFileSync(voiceServicePath, 'utf8');
    
    const checks = [
        { name: 'expo-av import', pattern: 'expo-av' },
        { name: 'Audio import', pattern: 'Audio' },
        { name: 'startRecording method', pattern: 'startRecording' },
        { name: 'stopRecording method', pattern: 'stopRecording' },
        { name: 'uploadVoiceMessage method', pattern: 'uploadVoiceMessage' },
        { name: 'FormData usage', pattern: 'FormData' },
        { name: 'audio/mp4 MIME type', pattern: 'audio/mp4' }
    ];
    
    checks.forEach(check => {
        if (voiceServiceContent.includes(check.pattern)) {
            console.log(`✅ ${check.name} found`);
        } else {
            console.log(`❌ ${check.name} not found`);
        }
    });
} else {
    console.log('❌ Voice recording service not found');
}

// Test 7: Check voice message player component
console.log('\nTest 7: Checking voice message player component');
const playerComponentPath = path.join(__dirname, '../components/VoiceMessagePlayer.tsx');
if (fs.existsSync(playerComponentPath)) {
    const playerContent = fs.readFileSync(playerComponentPath, 'utf8');
    
    const checks = [
        { name: 'expo-av import', pattern: 'expo-av' },
        { name: 'Audio import', pattern: 'Audio' },
        { name: 'audioUri prop', pattern: 'audioUri' },
        { name: 'isOwnMessage prop', pattern: 'isOwnMessage' },
        { name: 'playPause function', pattern: 'playPause' },
        { name: 'formatTime function', pattern: 'formatTime' }
    ];
    
    checks.forEach(check => {
        if (playerContent.includes(check.pattern)) {
            console.log(`✅ ${check.name} found`);
        } else {
            console.log(`❌ ${check.name} not found`);
        }
    });
} else {
    console.log('❌ Voice message player component not found');
}

console.log('\n🎉 Simple frontend voice recording test completed!');
console.log('\nNext steps to test the actual functionality:');
console.log('1. Start your React Native/Expo app');
console.log('2. Navigate to a chat conversation');
console.log('3. Tap the microphone button to start recording');
console.log('4. Speak for a few seconds');
console.log('5. Tap the stop button to end recording');
console.log('6. Tap send to upload the voice message');
console.log('7. Check the console for any error messages');
console.log('\nIf you see 422 errors, check:');
console.log('- File type and size');
console.log('- Authentication token');
console.log('- Network connectivity');
console.log('- Backend logs for validation errors'); 