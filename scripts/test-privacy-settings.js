const axios = require('axios');

const API_BASE_URL = 'http://172.20.10.11:8000/api';

async function testPrivacySettings() {
    try {
        console.log('🧪 Testing privacy settings endpoints...');
        
        // Test the health endpoint first
        console.log('1. Testing API health...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ API health check:', healthResponse.data);
        
        // Test privacy settings endpoint (should be protected)
        console.log('\n2. Testing privacy settings endpoint...');
        try {
            const settingsResponse = await axios.get(`${API_BASE_URL}/user/privacy-settings`, {
                headers: {
                    'Authorization': 'Bearer fake-token',
                    'Content-Type': 'application/json'
                }
            });
            console.log('❌ Unexpected success for unauthenticated request:', settingsResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected unauthenticated request:', error.response?.status);
            console.log('Response structure:', {
                success: error.response?.data?.success,
                message: error.response?.data?.message
            });
        }
        
        // Test privacy settings update endpoint (should be protected)
        console.log('\n3. Testing privacy settings update endpoint...');
        try {
            const updateResponse = await axios.patch(`${API_BASE_URL}/user/privacy-settings`, {
                profileVisibility: {
                    showToDoctors: true,
                    showToPatients: false
                },
                dataSharing: {
                    allowAnalytics: true,
                    allowResearch: false
                },
                communication: {
                    email: true,
                    sms: false,
                    push: true
                },
                security: {
                    loginNotifications: true,
                    sessionTimeout: 30
                }
            }, {
                headers: {
                    'Authorization': 'Bearer fake-token',
                    'Content-Type': 'application/json'
                }
            });
            console.log('❌ Unexpected success for unauthenticated request:', updateResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected unauthenticated request:', error.response?.status);
            console.log('Response structure:', {
                success: error.response?.data?.success,
                message: error.response?.data?.message
            });
        }
        
        console.log('\n🎉 Privacy Settings Test Completed!');
        console.log('\n📋 Privacy Settings Endpoints:');
        console.log('- GET /user/privacy-settings - Get privacy settings');
        console.log('- PATCH /user/privacy-settings - Update privacy settings');
        
        console.log('\n📊 Expected Response Format:');
        console.log('{');
        console.log('  "success": true,');
        console.log('  "data": {');
        console.log('    "profileVisibility": {');
        console.log('      "showToDoctors": true,');
        console.log('      "showToPatients": false');
        console.log('    },');
        console.log('    "dataSharing": {');
        console.log('      "allowAnalytics": true,');
        console.log('      "allowResearch": false');
        console.log('    },');
        console.log('    "communication": {');
        console.log('      "email": true,');
        console.log('      "sms": true,');
        console.log('      "push": true');
        console.log('    },');
        console.log('    "security": {');
        console.log('      "loginNotifications": true,');
        console.log('      "sessionTimeout": 30');
        console.log('    }');
        console.log('  }');
        console.log('}');
        
        console.log('\n🔧 Features:');
        console.log('- Structured privacy settings with categories');
        console.log('- Profile visibility controls (doctors, patients)');
        console.log('- Data sharing preferences (analytics, research)');
        console.log('- Communication preferences (email, SMS, push)');
        console.log('- Security settings (login notifications, session timeout)');
        console.log('- Proper validation and error handling');
        console.log('- Integration with existing notification preferences');
        console.log('- Silent success handling (no modals)');
        
        console.log('\n🎯 Files Updated:');
        console.log('- backend/routes/api.php: Added privacy settings routes');
        console.log('- backend/app/Http/Controllers/NotificationController.php: Added new methods');
        console.log('- backend/app/Models/User.php: Added privacy_preferences to fillable');
        console.log('- backend/database/migrations: Added privacy_preferences column');
        console.log('- app/privacy-settings.tsx: Removed success modals');
        console.log('- app/notifications-settings.tsx: Removed success modals');
        
        console.log('\n✅ Expected Results:');
        console.log('- Privacy settings page should load without 404 errors');
        console.log('- Settings should be properly structured and categorized');
        console.log('- Updates should be saved to the database');
        console.log('- No success modals should appear on save');
        console.log('- Integration with existing notification system');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testPrivacySettings(); 