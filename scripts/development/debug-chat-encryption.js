const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function debugChatEncryption() {
  console.log('🔍 Debugging Chat Encryption');
  console.log('=============================\n');

  try {
    // Step 1: Login as a user
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      email: 'test@example.com', // Replace with actual test user
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      console.error('Login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log('✅ Logged in as:', user.first_name, user.last_name);

    // Set auth header
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Step 2: Get or create a text session
    console.log('\n2. Getting text sessions...');
    const sessionsResponse = await axios.get(`${BASE_URL}/text-sessions`);
    
    if (!sessionsResponse.data.success) {
      console.error('Failed to get sessions:', sessionsResponse.data.message);
      return;
    }

    const sessions = sessionsResponse.data.data;
    console.log('Found sessions:', sessions.length);

    if (sessions.length === 0) {
      console.log('No sessions found, creating one...');
      // Create a new session
      const createResponse = await axios.post(`${BASE_URL}/text-sessions`, {
        patient_id: user.id,
        doctor_id: 1 // Assuming doctor ID 1 exists
      });

      if (!createResponse.data.success) {
        console.error('Failed to create session:', createResponse.data.message);
        return;
      }

      const sessionId = createResponse.data.data.session_id;
      console.log('✅ Created session:', sessionId);
    } else {
      const sessionId = sessions[0].session_id;
      console.log('✅ Using existing session:', sessionId);
    }

    const sessionId = sessions[0].session_id;

    // Step 3: Send a test message
    console.log('\n3. Sending test message...');
    const testMessage = 'Hello, this is a test message!';
    console.log('Original message:', testMessage);

    const sendResponse = await axios.post(`${BASE_URL}/text-sessions/${sessionId}/messages`, {
      text: testMessage,
      sender: user.id.toString()
    });

    if (!sendResponse.data.success) {
      console.error('Failed to send message:', sendResponse.data.message);
      return;
    }

    const messageData = sendResponse.data.data;
    console.log('✅ Message sent successfully');
    console.log('Message ID:', messageData.id);
    console.log('Encrypted content:', messageData.encrypted_content);
    console.log('IV:', messageData.iv);
    console.log('Tag:', messageData.tag);
    console.log('Algorithm:', messageData.algorithm);
    console.log('Is encrypted:', messageData.is_encrypted);

    // Step 4: Get local storage data
    console.log('\n4. Getting local storage data...');
    const localStorageResponse = await axios.get(`${BASE_URL}/text-sessions/${sessionId}/local-storage`);

    if (!localStorageResponse.data.success) {
      console.error('Failed to get local storage:', localStorageResponse.data.message);
      return;
    }

    const localData = localStorageResponse.data.data;
    console.log('✅ Local storage data retrieved');
    console.log('Messages count:', localData.messages.length);
    console.log('Encryption key exists:', !!localData.encryption_key);
    console.log('Session metadata exists:', !!localData.session_metadata);

    if (localData.messages.length > 0) {
      const lastMessage = localData.messages[localData.messages.length - 1];
      console.log('\nLast message details:');
      console.log('ID:', lastMessage.id);
      console.log('Encrypted content:', lastMessage.encrypted_content);
      console.log('IV:', lastMessage.iv);
      console.log('Tag:', lastMessage.tag);
      console.log('Algorithm:', lastMessage.algorithm);
      console.log('Is encrypted:', lastMessage.is_encrypted);
    }

    // Step 5: Test decryption manually
    console.log('\n5. Testing manual decryption...');
    if (localData.encryption_key && localData.messages.length > 0) {
      const lastMessage = localData.messages[localData.messages.length - 1];
      
      // Import the encryption service logic
      const crypto = require('crypto');
      
      // Simple base64 decode function
      function base64Decode(str) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const bytes = [];
        
        // Count padding
        let padding = 0;
        if (str.endsWith('==')) {
          padding = 2;
          str = str.slice(0, -2);
        } else if (str.endsWith('=')) {
          padding = 1;
          str = str.slice(0, -1);
        }
        
        for (let i = 0; i < str.length; i += 4) {
          const chunk1 = chars.indexOf(str[i]);
          const chunk2 = chars.indexOf(str[i + 1]);
          const chunk3 = i + 2 < str.length ? chars.indexOf(str[i + 2]) : -1;
          const chunk4 = i + 3 < str.length ? chars.indexOf(str[i + 3]) : -1;
          
          if (chunk1 === -1 || chunk2 === -1) continue;
          
          const byte1 = (chunk1 << 2) | (chunk2 >> 4);
          bytes.push(byte1);
          
          if (chunk3 !== -1) {
            const byte2 = ((chunk2 & 15) << 4) | (chunk3 >> 2);
            bytes.push(byte2);
            
            if (chunk4 !== -1) {
              const byte3 = ((chunk3 & 3) << 6) | chunk4;
              bytes.push(byte3);
            }
          }
        }
        
        return new Uint8Array(bytes);
      }

      // Decrypt the message
      try {
        const key = base64Decode(localData.encryption_key.encryption_key);
        const encryptedContent = base64Decode(lastMessage.encrypted_content);
        
        // Simple XOR decryption
        const decrypted = new Uint8Array(encryptedContent.length);
        for (let i = 0; i < encryptedContent.length; i++) {
          decrypted[i] = encryptedContent[i] ^ key[i % key.length];
        }
        
        const decoder = new TextDecoder();
        const decryptedText = decoder.decode(decrypted);
        
        console.log('✅ Manual decryption successful');
        console.log('Decrypted text:', decryptedText);
        console.log('Matches original:', decryptedText === testMessage);
      } catch (error) {
        console.error('❌ Manual decryption failed:', error.message);
      }
    }

  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

debugChatEncryption(); 