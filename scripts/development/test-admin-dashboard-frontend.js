const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testAdminDashboardFrontend() {
    try {
        console.log('🔍 Testing Admin Dashboard Frontend Logic\n');

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

        // Test 2: Test the exact same call that adminService.getPendingDoctors makes
        console.log('\n2️⃣ Testing adminService.getPendingDoctors equivalent...');
        try {
            const params = new URLSearchParams();
            params.append('page', '1');
            params.append('per_page', '20');
            
            const pendingResponse = await axios.get(`${BASE_URL}/admin/doctors/pending?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Accept': 'application/json'
                }
            });

            console.log('✅ API call successful');
            console.log('   Response structure:', {
                success: pendingResponse.data.success,
                hasData: !!pendingResponse.data.data,
                dataType: typeof pendingResponse.data.data,
                isArray: Array.isArray(pendingResponse.data.data)
            });

            if (pendingResponse.data.success && pendingResponse.data.data) {
                const data = pendingResponse.data.data;
                console.log('   Data structure:', {
                    hasData: !!data.data,
                    dataLength: data.data ? data.data.length : 'N/A',
                    total: data.total,
                    currentPage: data.current_page
                });

                if (data.data && data.data.length > 0) {
                    console.log('   First doctor:', {
                        id: data.data[0].id,
                        name: data.data[0].display_name,
                        email: data.data[0].email,
                        status: data.data[0].status
                    });
                }
            }
        } catch (error) {
            console.log('❌ API call failed:', error.response?.data?.message || error.message);
        }

        // Test 3: Test dashboard stats
        console.log('\n3️⃣ Testing dashboard stats...');
        try {
            const statsResponse = await axios.get(`${BASE_URL}/admin/dashboard-stats`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Accept': 'application/json'
                }
            });

            if (statsResponse.data.success) {
                console.log('✅ Dashboard stats working');
                console.log('   Stats data:', statsResponse.data.data);
            } else {
                console.log('❌ Dashboard stats failed:', statsResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Dashboard stats error:', error.response?.data?.message || error.message);
        }

        console.log('\n🎯 SUMMARY:');
        console.log('Frontend admin dashboard should work if these tests pass');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAdminDashboardFrontend(); 