// Test fallback system when DeepSeek API is not available
const { DeepSeekService } = require('../../services/deepseekService');

async function testFallback() {
  console.log('🧪 Testing Fallback System...\n');
  
  const testCases = [
    "Hello, how are you?",
    "I have a headache",
    "What is a healthy diet?",
    "I have chest pain",
    "How do I book an appointment?",
    "Thank you for your help"
  ];

  for (const testCase of testCases) {
    try {
      console.log(`Testing: "${testCase}"`);
      
      // This will use the fallback system since we're not in a React Native environment
      const response = await DeepSeekService.getResponse(testCase);
      
      console.log(`✅ Response: ${response.text}`);
      console.log(`📅 Should book appointment: ${response.shouldBookAppointment}`);
      console.log(`🚨 Urgency: ${response.urgency}\n`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('🎉 Fallback system test completed!');
}

// Run the test
testFallback().catch(console.error);
