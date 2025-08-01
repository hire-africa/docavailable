const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Debug attachment upload functionality
async function debugAttachmentUpload() {
  console.log('🔍 Debugging Attachment Upload...\n');

  try {
    // Test 1: Check backend endpoint
    console.log('1️⃣ Testing backend endpoint...');
    console.log('   Endpoint: POST /api/upload/chat-attachment');
    console.log('   Expected: 200 OK with file upload');
    
    // Test 2: Check validation rules
    console.log('\n2️⃣ Backend validation rules:');
    console.log('   - file: required|file|max:10240 (10MB)');
    console.log('   - Field name must be "file"');
    
    // Test 3: Check common 422 causes
    console.log('\n3️⃣ Common 422 error causes:');
    console.log('   ❌ Missing "file" field in FormData');
    console.log('   ❌ File size > 10MB');
    console.log('   ❌ Invalid file type');
    console.log('   ❌ FormData not properly constructed');
    console.log('   ❌ Missing Content-Type header');
    
    // Test 4: Frontend FormData structure
    console.log('\n4️⃣ Expected FormData structure:');
    console.log('   FormData:');
    console.log('   └── file: {');
    console.log('       uri: "file://path/to/image.jpg",');
    console.log('       type: "image/jpeg",');
    console.log('       name: "image_1234567890.jpg"');
    console.log('     }');
    
    // Test 5: Debug steps
    console.log('\n5️⃣ Debug steps:');
    console.log('   📱 Check console logs for:');
    console.log('      - "Uploading attachment:" log');
    console.log('      - "Upload response:" log');
    console.log('   🔧 Check backend logs for:');
    console.log('      - "Chat attachment upload request:" log');
    console.log('      - "File details:" log');
    console.log('      - Validation errors');
    
    console.log('\n🎯 Next steps:');
    console.log('1. Try uploading an image');
    console.log('2. Check console logs for upload details');
    console.log('3. Check backend logs for validation errors');
    console.log('4. Verify file size is under 10MB');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugAttachmentUpload(); 