// Simple environment test
require('dotenv').config();

console.log('=== Environment Variables Test ===');
console.log('GOOGLE_CLIENT_ID:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET);

// Check if .env file exists and is readable
const fs = require('fs');
if (fs.existsSync('.env')) {
    console.log('\n=== .env file exists ===');
    const envContent = fs.readFileSync('.env', 'utf8');
    const googleClientIdLine = envContent.split('\n').find(line => line.includes('EXPO_PUBLIC_GOOGLE_CLIENT_ID'));
    const googleClientSecretLine = envContent.split('\n').find(line => line.includes('EXPO_PUBLIC_GOOGLE_CLIENT_SECRET'));
    
    console.log('Client ID line:', googleClientIdLine);
    console.log('Client Secret line:', googleClientSecretLine);
} else {
    console.log('\n=== .env file not found ===');
}
