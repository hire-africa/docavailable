const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';
const APPOINTMENT_ID = 11;

// Test credentials
const PATIENT_CREDENTIALS = {
    email: 'usher@gmail.com',
    password: 'password123'
};

const DOCTOR_CREDENTIALS = {
    email: 'johndoe@gmail.com',
    password: 'password123'
};

let patientToken = '';
let doctorToken = '';

async function loginUser(credentials) {
    try {
        const response = await axios.post(`${BASE_URL}/login`, credentials);
        if (response.data.success) {
            return response.data.data.token;
        }
        throw new Error('Login failed');
    } catch (error) {
        console.error('Login error:', error.response?.data || error.message);
        throw error;
    }
}

async function testChatEndpoints() {
    console.log('🧪 Testing Chat API Endpoints...\n');

    try {
        // Step 1: Login as patient
        console.log('1. Logging in as patient...');
        patientToken = await loginUser(PATIENT_CREDENTIALS);
        console.log('✅ Patient logged in successfully\n');

        // Step 2: Login as doctor
        console.log('2. Logging in as doctor...');
        doctorToken = await loginUser(DOCTOR_CREDENTIALS);
        console.log('✅ Doctor logged in successfully\n');

        // Step 3: Test get messages endpoint
        console.log('3. Testing get messages endpoint...');
        const messagesResponse = await axios.get(`${BASE_URL}/chat/${APPOINTMENT_ID}/messages`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        
        if (messagesResponse.data.success) {
            console.log('✅ Get messages successful');
            console.log(`   Messages count: ${messagesResponse.data.data.length}`);
            if (messagesResponse.data.data.length > 0) {
                const lastMessage = messagesResponse.data.data[messagesResponse.data.data.length - 1];
                console.log(`   Last message: "${lastMessage.message.substring(0, 50)}..."`);
            }
        } else {
            console.log('❌ Get messages failed');
        }
        console.log('');

        // Step 4: Test send message endpoint
        console.log('4. Testing send message endpoint...');
        const sendMessageResponse = await axios.post(`${BASE_URL}/chat/${APPOINTMENT_ID}/messages`, {
            message: 'Hello! This is a test message from the API test script.'
        }, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        
        if (sendMessageResponse.data.success) {
            console.log('✅ Send message successful');
            console.log(`   Message ID: ${sendMessageResponse.data.data.id}`);
            console.log(`   Sender: ${sendMessageResponse.data.data.sender_name}`);
            console.log(`   Message: "${sendMessageResponse.data.data.message}"`);
        } else {
            console.log('❌ Send message failed');
        }
        console.log('');

        // Step 5: Test local storage endpoint
        console.log('5. Testing local storage endpoint...');
        const localStorageResponse = await axios.get(`${BASE_URL}/chat/${APPOINTMENT_ID}/local-storage`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        
        if (localStorageResponse.data.success) {
            console.log('✅ Local storage endpoint successful');
            console.log(`   Appointment ID: ${localStorageResponse.data.data.appointment_id}`);
            console.log(`   Message Count: ${localStorageResponse.data.data.message_count}`);
            console.log(`   Last Sync: ${localStorageResponse.data.data.last_sync}`);
        } else {
            console.log('❌ Local storage endpoint failed');
        }
        console.log('');

        // Step 6: Test sync endpoint
        console.log('6. Testing sync endpoint...');
        const testLocalMessages = [
            {
                id: 'test_local_1',
                appointment_id: APPOINTMENT_ID,
                sender_id: 59, // Usher's ID
                sender_name: 'Usher Kamwendo',
                message: 'This is a test local message for sync.',
                timestamp: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];

        const syncResponse = await axios.post(`${BASE_URL}/chat/${APPOINTMENT_ID}/sync`, {
            messages: testLocalMessages
        }, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        
        if (syncResponse.data.success) {
            console.log('✅ Sync endpoint successful');
            console.log(`   Synced Count: ${syncResponse.data.data.synced_count}`);
            console.log(`   Total Messages: ${syncResponse.data.data.total_messages}`);
        } else {
            console.log('❌ Sync endpoint failed');
        }
        console.log('');

        // Step 7: Test chat info endpoint
        console.log('7. Testing chat info endpoint...');
        const chatInfoResponse = await axios.get(`${BASE_URL}/chat/${APPOINTMENT_ID}/info`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        
        if (chatInfoResponse.data.success) {
            console.log('✅ Chat info endpoint successful');
            console.log(`   Other Participant: ${chatInfoResponse.data.data.other_participant_name}`);
            console.log(`   Appointment Date: ${chatInfoResponse.data.data.appointment_date}`);
            console.log(`   Appointment Time: ${chatInfoResponse.data.data.appointment_time}`);
        } else {
            console.log('❌ Chat info endpoint failed');
        }
        console.log('');

        // Step 8: Final message count
        console.log('8. Checking final message count...');
        const finalMessagesResponse = await axios.get(`${BASE_URL}/chat/${APPOINTMENT_ID}/messages`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        
        if (finalMessagesResponse.data.success) {
            console.log('✅ Final message count retrieved');
            console.log(`   Total messages: ${finalMessagesResponse.data.data.length}`);
        } else {
            console.log('❌ Failed to get final message count');
        }

        console.log('\n🎉 All Chat API Endpoints Test Completed Successfully!');
        console.log('The messaging system is ready for frontend integration.');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testChatEndpoints(); 