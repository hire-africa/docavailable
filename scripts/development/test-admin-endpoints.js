const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testAdminEndpoints() {
    try {
        console.log('🔍 Testing Admin Endpoints\n');

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
        console.log('\n2️⃣ Testing dashboard stats...');
        try {
            const statsResponse = await axios.get(`${BASE_URL}/admin/dashboard-stats`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Accept': 'application/json'
                }
            });

            if (statsResponse.data.success) {
                console.log('✅ Dashboard stats working');
                console.log('   Stats:', statsResponse.data.stats);
            } else {
                console.log('❌ Dashboard stats failed:', statsResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Dashboard stats error:', error.response?.data?.message || error.message);
        }

        // Test 3: Pending Doctors
        console.log('\n3️⃣ Testing pending doctors endpoint...');
        try {
            const pendingResponse = await axios.get(`${BASE_URL}/admin/doctors/pending`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Accept': 'application/json'
                },
                params: {
                    page: 1,
                    per_page: 20
                }
            });

            if (pendingResponse.data.success) {
                console.log('✅ Pending doctors endpoint working');
                const data = pendingResponse.data.data;
                console.log('   Total pending doctors:', data.total);
                console.log('   Current page:', data.current_page);
                console.log('   Doctors on this page:', data.data.length);
                
                if (data.data.length > 0) {
                    console.log('   Sample doctor:', {
                        id: data.data[0].id,
                        name: data.data[0].display_name,
                        email: data.data[0].email,
                        status: data.data[0].status
                    });
                } else {
                    console.log('   No pending doctors found');
                }
            } else {
                console.log('❌ Pending doctors failed:', pendingResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Pending doctors error:', error.response?.data?.message || error.message);
            if (error.response?.status === 401) {
                console.log('   Authentication failed - check admin token');
            } else if (error.response?.status === 403) {
                console.log('   Permission denied - check admin role');
            }
        }

        // Test 4: Check if there are any doctors in the database
        console.log('\n4️⃣ Checking database for doctors...');
        try {
            const allUsersResponse = await axios.get(`${BASE_URL}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Accept': 'application/json'
                }
            });

            if (allUsersResponse.data.success) {
                const users = allUsersResponse.data.data.data || allUsersResponse.data.data;
                const doctors = users.filter(user => user.user_type === 'doctor');
                const pendingDoctors = doctors.filter(doctor => doctor.status === 'pending');
                
                console.log('✅ Users endpoint working');
                console.log('   Total users:', users.length);
                console.log('   Total doctors:', doctors.length);
                console.log('   Pending doctors:', pendingDoctors.length);
                
                if (pendingDoctors.length > 0) {
                    console.log('   Pending doctors found:');
                    pendingDoctors.forEach(doctor => {
                        console.log(`     - ${doctor.display_name} (${doctor.email}) - ${doctor.status}`);
                    });
                } else {
                    console.log('   No pending doctors in database');
                }
            } else {
                console.log('❌ Users endpoint failed:', allUsersResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Users endpoint error:', error.response?.data?.message || error.message);
        }

        console.log('\n🎯 SUMMARY:');
        console.log('Admin endpoints test completed');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('   Backend server is not running');
        } else if (error.code === 'ENOTFOUND') {
            console.log('   IP address not found');
        }
    }
}

testAdminEndpoints(); 