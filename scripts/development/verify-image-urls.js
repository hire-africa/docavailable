const axios = require('axios');

async function verifyImageUrls() {
    try {
        console.log('🔍 Verifying Image URLs\n');

        // Test the known image URL
        const testUrl = 'http://172.20.10.11:8000/storage/profile-pictures/9b7cfdaf-df10-4873-bd41-ddf8e50694eb.jpg';
        console.log('Testing URL:', testUrl);
        
        try {
            const response = await axios.get(testUrl, { 
                timeout: 5000,
                responseType: 'arraybuffer',
                validateStatus: () => true
            });
            
            if (response.status === 200) {
                console.log(`✅ SUCCESS! Image is accessible (${response.data.length} bytes)`);
                console.log('This means the storage URLs are working correctly!');
                
                // Check file type
                const buffer = Buffer.from(response.data);
                const header = buffer.slice(0, 4).toString('hex');
                if (header.startsWith('ffd8ff')) {
                    console.log('✅ Valid JPEG file');
                }
            } else {
                console.log(`❌ Image not accessible (Status: ${response.status})`);
                console.log('This might indicate:');
                console.log('1. Laravel server not running');
                console.log('2. Storage link not created');
                console.log('3. File permissions issue');
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
            console.log('Make sure Laravel server is running on port 8000');
        }

        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Start Laravel server: cd backend && php artisan serve --host=0.0.0.0 --port=8000');
        console.log('2. Test the URL in your browser: http://172.20.10.11:8000/storage/profile-pictures/9b7cfdaf-df10-4873-bd41-ddf8e50694eb.jpg');
        console.log('3. If the image loads in browser, the URLs are working correctly');

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

verifyImageUrls(); 