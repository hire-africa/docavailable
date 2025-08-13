const axios = require('axios');

const BASE_URL = 'https://docavailable-1.onrender.com';

async function testStorageLink() {
    console.log('🔍 Testing Storage Link After Deployment\n');
    
    // Test the storage link directly
    const testUrls = [
        `${BASE_URL}/storage/profile-pictures/doctor1.jpg`,
        `${BASE_URL}/storage/profile-pictures/doctor2.jpg`,
        `${BASE_URL}/storage/profile-pictures/doctor3.jpg`,
        `${BASE_URL}/storage/profile_pictures/kBznaFXCGfKH7Kb322zeCkH9Cyp4MWs8hos1hrsb.png`
    ];
    
    console.log('1️⃣ Testing direct storage access...');
    for (let i = 0; i < testUrls.length; i++) {
        const url = testUrls[i];
        console.log(`   Testing: ${url}`);
        
        try {
            const response = await axios.get(url, {
                timeout: 15000,
                validateStatus: () => true
            });
            
            console.log(`   Status: ${response.status}`);
            console.log(`   Content-Type: ${response.headers['content-type']}`);
            
            if (response.status === 200) {
                console.log(`   ✅ Storage link working!`);
                console.log(`   🎉 Found accessible image: ${url}`);
                return true;
            } else if (response.status === 404) {
                console.log(`   ❌ File not found (404)`);
            } else {
                console.log(`   ⚠️ Unexpected status: ${response.status}`);
            }
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.log(`   ❌ Timeout`);
            } else {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
        console.log('');
    }
    
    console.log('2️⃣ Testing API image serving route...');
    const apiUrls = [
        `${BASE_URL}/api/images/profile-pictures/doctor1.jpg`,
        `${BASE_URL}/api/images/profile-pictures/doctor2.jpg`,
        `${BASE_URL}/api/images/profile-pictures/doctor3.jpg`,
        `${BASE_URL}/api/images/profile_pictures/kBznaFXCGfKH7Kb322zeCkH9Cyp4MWs8hos1hrsb.png`
    ];
    
    for (let i = 0; i < apiUrls.length; i++) {
        const url = apiUrls[i];
        console.log(`   Testing: ${url}`);
        
        try {
            const response = await axios.get(url, {
                timeout: 15000,
                validateStatus: () => true
            });
            
            console.log(`   Status: ${response.status}`);
            console.log(`   Content-Type: ${response.headers['content-type']}`);
            
            if (response.status === 200) {
                console.log(`   ✅ API image serving working!`);
                console.log(`   🎉 Found accessible image: ${url}`);
                return true;
            } else if (response.status === 404) {
                console.log(`   ❌ File not found (404)`);
            } else {
                console.log(`   ⚠️ Unexpected status: ${response.status}`);
            }
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.log(`   ❌ Timeout`);
            } else {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
        console.log('');
    }
    
    console.log('❌ No working storage access found');
    console.log('💡 This means the storage link deployment needs to be checked');
    return false;
}

testStorageLink();
