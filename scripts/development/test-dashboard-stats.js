const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testDashboardStats() {
    try {
        console.log('🔍 Testing Dashboard Stats Endpoint\n');

        // Test 1: Admin Login
        console.log('1️⃣ Testing admin login...');
        const loginResponse = await axios.post(`${BASE_URL}/login`, {
            email: 'admin@docavailable.com',
            password: 'admin123456'
        });

        if (!loginResponse.data.success) {
            console.log('❌ Admin login failed:', loginResponse.data.message);
            return;
        }

        const adminToken = loginResponse.data.data.token;
        console.log('✅ Admin login successful');

        // Test 2: Dashboard Stats
        console.log('\n2️⃣ Testing dashboard stats endpoint...');
        try {
            const statsResponse = await axios.get(`${BASE_URL}/admin/dashboard-stats`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Accept': 'application/json'
                }
            });

            console.log('✅ Dashboard stats response received');
            console.log('   Full response:', JSON.stringify(statsResponse.data, null, 2));
            
            if (statsResponse.data.success) {
                console.log('✅ Success flag is true');
                console.log('   Data exists:', !!statsResponse.data.data);
                console.log('   Data type:', typeof statsResponse.data.data);
                
                if (statsResponse.data.data) {
                    const stats = statsResponse.data.data;
                    console.log('   Stats data:', stats);
                    console.log('   Total users:', stats.total_users);
                    console.log('   Total doctors:', stats.total_doctors);
                    console.log('   Total patients:', stats.total_patients);
                } else {
                    console.log('❌ Data is null or undefined');
                }
            } else {
                console.log('❌ Success flag is false');
            }
        } catch (error) {
            console.log('❌ Dashboard stats error:', error.response?.data?.message || error.message);
            if (error.response) {
                console.log('   Response status:', error.response.status);
                console.log('   Response data:', error.response.data);
            }
        }

        console.log('\n🎯 SUMMARY:');
        console.log('Dashboard stats test completed');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testDashboardStats(); 