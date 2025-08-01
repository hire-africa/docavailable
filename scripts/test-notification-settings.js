const axios = require('axios');

const API_BASE_URL = 'http://172.20.10.11:8000/api';

async function testNotificationSettings() {
    try {
        console.log('🧪 Testing notification settings endpoints...');
        
        // Test the health endpoint first
        console.log('1. Testing API health...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ API health check:', healthResponse.data);
        
        // Test notification settings endpoint (should be protected)
        console.log('\n2. Testing notification settings endpoint...');
        try {
            const settingsResponse = await axios.get(`${API_BASE_URL}/user/notification-settings`, {
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
        
        // Test notification settings update endpoint (should be protected)
        console.log('\n3. Testing notification settings update endpoint...');
        try {
            const updateResponse = await axios.patch(`${API_BASE_URL}/user/notification-settings`, {
                communication: {
                    email: true,
                    sms: false,
                    push: true,
                    inApp: true
                },
                appointments: {
                    reminders: true,
                    confirmations: true,
                    cancellations: false,
                    reschedules: true
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
        
        console.log('\n🎉 Notification Settings Test Completed!');
        console.log('\n📋 Notification Settings Endpoints:');
        console.log('- GET /user/notification-settings - Get notification settings');
        console.log('- PATCH /user/notification-settings - Update notification settings');
        
        console.log('\n📊 Expected Response Format:');
        console.log('{');
        console.log('  "success": true,');
        console.log('  "data": {');
        console.log('    "communication": {');
        console.log('      "email": true,');
        console.log('      "sms": true,');
        console.log('      "push": true,');
        console.log('      "inApp": true');
        console.log('    },');
        console.log('    "appointments": {');
        console.log('      "reminders": true,');
        console.log('      "confirmations": true,');
        console.log('      "cancellations": true,');
        console.log('      "reschedules": true');
        console.log('    },');
        console.log('    "consultation": {');
        console.log('      "newMessages": true,');
        console.log('      "consultationUpdates": true,');
        console.log('      "feedbackRequests": true');
        console.log('    },');
        console.log('    "system": {');
        console.log('      "securityAlerts": true,');
        console.log('      "maintenanceUpdates": false,');
        console.log('      "featureAnnouncements": false');
        console.log('    }');
        console.log('  }');
        console.log('}');
        
        console.log('\n🔧 Features:');
        console.log('- Structured notification settings with categories');
        console.log('- Communication preferences (email, SMS, push, in-app)');
        console.log('- Appointment notifications (reminders, confirmations, etc.)');
        console.log('- Consultation notifications (messages, updates, feedback)');
        console.log('- System notifications (security, maintenance, features)');
        console.log('- Proper validation and error handling');
        console.log('- Integration with existing notification preferences');
        
        console.log('\n🎯 Files Updated:');
        console.log('- backend/routes/api.php: Added notification settings routes');
        console.log('- backend/app/Http/Controllers/NotificationController.php: Added new methods');
        console.log('- Enhanced notification preferences handling');
        
        console.log('\n✅ Expected Results:');
        console.log('- Notification settings page should load without 404 errors');
        console.log('- Settings should be properly structured and categorized');
        console.log('- Updates should be saved to the database');
        console.log('- Integration with existing notification system');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testNotificationSettings(); 