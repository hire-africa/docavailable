const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function createTestDoctor() {
    try {
        console.log('👨‍⚕️ Creating Test Doctor\n');

        const testImageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
        
        const doctorData = new FormData();
        doctorData.append('first_name', 'Dr. John');
        doctorData.append('last_name', 'Smith');
        doctorData.append('email', `testdoctor${Date.now()}@example.com`);
        doctorData.append('password', 'password123');
        doctorData.append('password_confirmation', 'password123');
        doctorData.append('date_of_birth', '1980-01-01');
        doctorData.append('gender', 'male');
        doctorData.append('country', 'Malawi');
        doctorData.append('city', 'Lilongwe');
        doctorData.append('user_type', 'doctor');
        doctorData.append('profile_picture', testImageBase64);
        doctorData.append('occupation', 'Cardiologist');
        doctorData.append('years_of_experience', '15');
        doctorData.append('bio', 'Experienced cardiologist with 15 years of practice in cardiovascular medicine.');
        doctorData.append('national_id', testImageBase64);
        doctorData.append('medical_degree', testImageBase64);
        doctorData.append('medical_licence', testImageBase64);

        try {
            const registerResponse = await axios.post(`${BASE_URL}/register`, doctorData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (registerResponse.data.success) {
                console.log('✅ Doctor registration successful!');
                console.log('Doctor ID:', registerResponse.data.data.user.id);
                console.log('Email:', registerResponse.data.data.user.email);
                console.log('Status:', registerResponse.data.data.user.status);
                
                // Now approve the doctor using admin credentials
                console.log('\n🔧 Approving doctor...');
                
                // First login as admin
                const adminLoginResponse = await axios.post(`${BASE_URL}/login`, {
                    email: 'admin@doc.com',
                    password: 'admin123'
                });

                if (adminLoginResponse.data.success) {
                    const adminToken = adminLoginResponse.data.data.token;
                    
                    // Approve the doctor
                    const approveResponse = await axios.post(`${BASE_URL}/admin/doctors/${registerResponse.data.data.user.id}/approve`, {}, {
                        headers: {
                            'Authorization': `Bearer ${adminToken}`,
                            'Accept': 'application/json'
                        }
                    });

                    if (approveResponse.data.success) {
                        console.log('✅ Doctor approved successfully!');
                    } else {
                        console.log('❌ Doctor approval failed:', approveResponse.data.message);
                    }
                } else {
                    console.log('❌ Admin login failed:', adminLoginResponse.data.message);
                }
            } else {
                console.log('❌ Doctor registration failed:', registerResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Doctor registration error:', error.response?.data?.message || error.message);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

createTestDoctor(); 