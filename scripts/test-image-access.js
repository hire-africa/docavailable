const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://172.20.10.11:8000';

async function testImageAccess() {
    try {
        console.log('🔍 Testing Image Access...\n');

        // Check if we can access a profile picture
        const storagePath = path.join(__dirname, '../backend/storage/app/public/profile-pictures');
        
        if (fs.existsSync(storagePath)) {
            const files = fs.readdirSync(storagePath);
            if (files.length > 0) {
                const testFile = files[0];
                const testUrl = `${BASE_URL}/storage/profile-pictures/${testFile}`;
                
                console.log(`Testing URL: ${testUrl}`);
                
                try {
                    const response = await axios.get(testUrl, { 
                        timeout: 5000,
                        responseType: 'arraybuffer',
                        validateStatus: () => true
                    });
                    
                    console.log(`Status: ${response.status}`);
                    console.log(`Size: ${response.data.length} bytes`);
                    
                    if (response.status === 200) {
                        console.log('✅ Image is accessible!');
                        
                        // Check if it's a valid image
                        const buffer = Buffer.from(response.data);
                        const header = buffer.slice(0, 4).toString('hex');
                        console.log(`File header: ${header}`);
                        
                        if (header.startsWith('ffd8ff')) {
                            console.log('✅ Valid JPEG file');
                        } else if (header.startsWith('89504e47')) {
                            console.log('✅ Valid PNG file');
                        } else {
                            console.log('⚠️  Unknown file format');
                        }
                    } else {
                        console.log('❌ Image not accessible');
                        console.log('Response headers:', response.headers);
                    }
                } catch (error) {
                    console.log(`❌ Error: ${error.message}`);
                }
            }
        }

        // Also test documents
        const documentsPath = path.join(__dirname, '../backend/storage/app/public/documents');
        
        if (fs.existsSync(documentsPath)) {
            const files = fs.readdirSync(documentsPath);
            if (files.length > 0) {
                const testFile = files[0];
                const testUrl = `${BASE_URL}/storage/documents/${testFile}`;
                
                console.log(`\nTesting document URL: ${testUrl}`);
                
                try {
                    const response = await axios.get(testUrl, { 
                        timeout: 5000,
                        responseType: 'arraybuffer',
                        validateStatus: () => true
                    });
                    
                    console.log(`Status: ${response.status}`);
                    console.log(`Size: ${response.data.length} bytes`);
                    
                    if (response.status === 200) {
                        console.log('✅ Document is accessible!');
                    } else {
                        console.log('❌ Document not accessible');
                    }
                } catch (error) {
                    console.log(`❌ Error: ${error.message}`);
                }
            }
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testImageAccess(); 