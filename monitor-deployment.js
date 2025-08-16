const https = require('https');

const BACKEND_URL = 'https://docavailable-5.onrender.com';
const CHECK_INTERVAL = 5000; // 5 seconds
const MAX_CHECKS = 30; // 2.5 minutes total
let checkCount = 0;

console.log('🚀 Monitoring Render Deployment...\n');

function checkHealth() {
    https.get(`${BACKEND_URL}/api/health`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            checkCount++;
            const now = new Date().toISOString();
            
            try {
                const response = JSON.parse(data);
                console.log(`[${now}] Health check #${checkCount}:`);
                console.log('Status:', response.status);
                console.log('Message:', response.message);
                
                if (response.database) {
                    console.log('\nDatabase Info:');
                    console.log('  Status:', response.database.status);
                    console.log('  Driver:', response.database.driver);
                    console.log('  Connected:', response.database.connected);
                    if (response.database.name) {
                        console.log('  Database:', response.database.name);
                    }
                    if (response.database.error) {
                        console.log('  Error:', response.database.error);
                    }
                }
                console.log('---\n');

                // Continue checking if we haven't reached max
                if (checkCount < MAX_CHECKS) {
                    setTimeout(checkHealth, CHECK_INTERVAL);
                } else {
                    console.log('✅ Monitoring complete!');
                    process.exit(0);
                }
            } catch (e) {
                console.log(`[${now}] Deployment not ready yet (Status: ${res.statusCode})`);
                if (checkCount < MAX_CHECKS) {
                    setTimeout(checkHealth, CHECK_INTERVAL);
                } else {
                    console.log('❌ Max checks reached. Please verify deployment manually.');
                    process.exit(1);
                }
            }
        });
    }).on('error', (err) => {
        console.log(`[${new Date().toISOString()}] Error: ${err.message}`);
        if (checkCount < MAX_CHECKS) {
            setTimeout(checkHealth, CHECK_INTERVAL);
        } else {
            console.log('❌ Max checks reached. Please verify deployment manually.');
            process.exit(1);
        }
    });
}

// Start monitoring
checkHealth();