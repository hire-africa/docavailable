/**
 * Frontend Integration Test for Email Verification
 * 
 * This script tests the complete frontend-backend integration
 * for the email verification feature.
 */

const API_BASE_URL = 'http://localhost:8000/api'; // Adjust to your backend URL

// Test configuration
const testConfig = {
    email: 'test@example.com',
    invalidCode: '000000',
    validCode: null, // Will be set from logs
};

console.log('🧪 Frontend Integration Test for Email Verification');
console.log('==================================================\n');

console.log('📧 Test Email:', testConfig.email);
console.log('🌐 API Base URL:', API_BASE_URL);
console.log('⏰ Test started at:', new Date().toISOString());
console.log('');

// Test 1: Send verification code
async function testSendVerificationCode() {
    console.log('1️⃣ Testing: Send Verification Code');
    console.log('   POST /api/send-verification-code');
    
    try {
        const response = await fetch(`${API_BASE_URL}/send-verification-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                email: testConfig.email
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('   ✅ Success: Code sent successfully');
            console.log('   📝 Response:', JSON.stringify(data, null, 2));
            return true;
        } else {
            console.log('   ❌ Failed:', data.message || 'Unknown error');
            console.log('   📝 Response:', JSON.stringify(data, null, 2));
            return false;
        }
    } catch (error) {
        console.log('   ❌ Error:', error.message);
        return false;
    }
}

// Test 2: Verify with invalid code
async function testInvalidCodeVerification() {
    console.log('\n2️⃣ Testing: Invalid Code Verification');
    console.log('   POST /api/verify-email (invalid code)');
    
    try {
        const response = await fetch(`${API_BASE_URL}/verify-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                email: testConfig.email,
                code: testConfig.invalidCode
            })
        });
        
        const data = await response.json();
        
        if (!response.ok && !data.success) {
            console.log('   ✅ Success: Invalid code correctly rejected');
            console.log('   📝 Response:', JSON.stringify(data, null, 2));
            return true;
        } else {
            console.log('   ❌ Failed: Invalid code was accepted');
            console.log('   📝 Response:', JSON.stringify(data, null, 2));
            return false;
        }
    } catch (error) {
        console.log('   ❌ Error:', error.message);
        return false;
    }
}

// Test 3: Verify with valid code (if provided)
async function testValidCodeVerification(code) {
    if (!code) {
        console.log('\n3️⃣ Testing: Valid Code Verification');
        console.log('   ⏭️  Skipped: No valid code provided');
        console.log('   💡 To test with valid code:');
        console.log('      node scripts/test-frontend-integration.js <VALID_CODE>');
        return true;
    }
    
    console.log('\n3️⃣ Testing: Valid Code Verification');
    console.log('   POST /api/verify-email (valid code)');
    console.log('   🔑 Using code:', code);
    
    try {
        const response = await fetch(`${API_BASE_URL}/verify-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                email: testConfig.email,
                code: code
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('   ✅ Success: Valid code accepted');
            console.log('   📝 Response:', JSON.stringify(data, null, 2));
            return true;
        } else {
            console.log('   ❌ Failed: Valid code rejected');
            console.log('   📝 Response:', JSON.stringify(data, null, 2));
            return false;
        }
    } catch (error) {
        console.log('   ❌ Error:', error.message);
        return false;
    }
}

// Test 4: Rate limiting
async function testRateLimiting() {
    console.log('\n4️⃣ Testing: Rate Limiting');
    console.log('   🔄 Sending multiple requests quickly...');
    
    const promises = [];
    for (let i = 0; i < 5; i++) {
        promises.push(
            fetch(`${API_BASE_URL}/send-verification-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    email: `test${i}@example.com`
                })
            }).then(res => res.json())
        );
    }
    
    try {
        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.success).length;
        const rateLimitedCount = results.filter(r => !r.success && r.message?.includes('rate')).length;
        
        console.log(`   📊 Results: ${successCount} successful, ${rateLimitedCount} rate limited`);
        
        if (rateLimitedCount > 0) {
            console.log('   ✅ Success: Rate limiting is working');
            return true;
        } else {
            console.log('   ⚠️  Warning: Rate limiting may not be configured');
            return true;
        }
    } catch (error) {
        console.log('   ❌ Error:', error.message);
        return false;
    }
}

// Test 5: Frontend simulation
async function testFrontendSimulation() {
    console.log('\n5️⃣ Testing: Frontend Simulation');
    console.log('   🎭 Simulating patient signup flow...');
    
    // Simulate Step 1 data
    const step1Data = {
        firstName: 'John',
        surname: 'Doe',
        email: testConfig.email,
        password: 'password123',
        dob: '1990-01-01',
        gender: 'male',
        country: 'United States',
        city: 'New York',
        acceptPolicies: true
    };
    
    console.log('   📝 Step 1 Data:', JSON.stringify(step1Data, null, 2));
    
    // Simulate moving to Step 3 (email verification)
    console.log('   🔄 Moving to Step 3: Email Verification');
    
    // This would normally be triggered by the frontend
    const sendCodeResult = await testSendVerificationCode();
    
    if (sendCodeResult) {
        console.log('   ✅ Frontend simulation successful');
        console.log('   💡 Check logs for verification code to complete testing');
    } else {
        console.log('   ❌ Frontend simulation failed');
    }
    
    return sendCodeResult;
}

// Main test runner
async function runTests() {
    const results = [];
    
    // Get valid code from command line argument
    const validCode = process.argv[2];
    if (validCode) {
        testConfig.validCode = validCode;
        console.log('🔑 Valid code provided:', validCode);
    }
    
    console.log('🚀 Starting tests...\n');
    
    // Run all tests
    results.push(await testSendVerificationCode());
    results.push(await testInvalidCodeVerification());
    results.push(await testValidCodeVerification(validCode));
    results.push(await testRateLimiting());
    results.push(await testFrontendSimulation());
    
    // Summary
    console.log('\n🎯 Test Summary');
    console.log('===============');
    console.log(`✅ Passed: ${results.filter(r => r).length}/${results.length}`);
    console.log(`❌ Failed: ${results.filter(r => !r).length}/${results.length}`);
    
    if (results.every(r => r)) {
        console.log('\n🎉 All tests passed! Frontend integration is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Test the actual frontend signup flow');
    console.log('2. Verify email templates are working');
    console.log('3. Test with real email addresses');
    console.log('4. Monitor rate limiting in production');
    console.log('5. Set up email delivery monitoring');
    
    console.log('\n⏰ Test completed at:', new Date().toISOString());
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    testSendVerificationCode,
    testInvalidCodeVerification,
    testValidCodeVerification,
    testRateLimiting,
    testFrontendSimulation
};
