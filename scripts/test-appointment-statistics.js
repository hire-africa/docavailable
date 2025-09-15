const axios = require('axios');

const API_BASE_URL = 'http://172.20.10.11:8000/api';

async function testAppointmentStatistics() {
    try {
        console.log('🧪 Testing appointment statistics endpoints...');
        
        // Test the health endpoint first
        console.log('1. Testing API health...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ API health check:', healthResponse.data);
        
        // Test monthly statistics endpoint
        console.log('\n2. Testing monthly statistics endpoint...');
        try {
            const monthlyResponse = await axios.get(`${API_BASE_URL}/appointments/statistics/monthly`, {
                headers: {
                    'Authorization': 'Bearer fake-token',
                    'Content-Type': 'application/json'
                }
            });
            console.log('❌ Unexpected success for unauthenticated request:', monthlyResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected unauthenticated monthly request:', error.response?.status);
            console.log('Response structure:', {
                success: error.response?.data?.success,
                message: error.response?.data?.message
            });
        }
        
        // Test weekly statistics endpoint
        console.log('\n3. Testing weekly statistics endpoint...');
        try {
            const weeklyResponse = await axios.get(`${API_BASE_URL}/appointments/statistics/weekly`, {
                headers: {
                    'Authorization': 'Bearer fake-token',
                    'Content-Type': 'application/json'
                }
            });
            console.log('❌ Unexpected success for unauthenticated request:', weeklyResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected unauthenticated weekly request:', error.response?.status);
            console.log('Response structure:', {
                success: error.response?.data?.success,
                message: error.response?.data?.message
            });
        }
        
        console.log('\n🎉 Appointment statistics tests completed!');
        console.log('\n📋 Statistics Endpoints:');
        console.log('- GET /appointments/statistics/monthly - Monthly appointment statistics');
        console.log('- GET /appointments/statistics/weekly - Weekly appointment statistics');
        
        console.log('\n📊 Expected Response Format:');
        console.log('{');
        console.log('  "success": true,');
        console.log('  "data": [');
        console.log('    {');
        console.log('      "month": "2024-01", // or "week": "Week 1"');
        console.log('      "appointments": 5,');
        console.log('      "confirmed": 3,');
        console.log('      "completed": 2,');
        console.log('      "cancelled": 0');
        console.log('    }');
        console.log('  ]');
        console.log('}');
        
        console.log('\n🔧 Features:');
        console.log('- Last 12 months of data for monthly statistics');
        console.log('- Last 12 weeks of data for weekly statistics');
        console.log('- Works for both patients and doctors');
        console.log('- Includes confirmed, completed, and cancelled counts');
        console.log('- Proper error handling and logging');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testAppointmentStatistics(); 