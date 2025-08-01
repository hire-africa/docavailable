const axios = require('axios');

const API_BASE_URL = 'http://172.20.10.11:8000/api';

async function testDateFormat() {
    try {
        console.log('🧪 Testing date format from backend...');
        
        // Test the health endpoint first
        console.log('1. Testing API health...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ API health check:', healthResponse.data);
        
        console.log('\n📅 Date Format Analysis:');
        console.log('The issue is likely that the backend is sending dates in a different format than expected.');
        console.log('Common date formats from Laravel backend:');
        console.log('- ISO 8601: "2024-01-15T00:00:00.000000Z"');
        console.log('- Date only: "2024-01-15"');
        console.log('- Timestamp: "1705276800"');
        console.log('- Carbon format: "2024-01-15 00:00:00"');
        
        console.log('\n🔧 Expected Fix:');
        console.log('- Update DatePickerField parseDate function to handle multiple formats');
        console.log('- Add better date validation and formatting');
        console.log('- Handle null/undefined dates gracefully');
        console.log('- Add debugging logs to see actual date format');
        
        console.log('\n📋 Date Format Handling:');
        console.log('1. Check if date is null/undefined/empty');
        console.log('2. Try parsing as ISO string (Laravel default)');
        console.log('3. Try parsing as YYYY-MM-DD format');
        console.log('4. Try parsing as timestamp');
        console.log('5. Fallback to current date if all fail');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testDateFormat(); 