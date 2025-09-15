// Test Conversation Flow
// This script tests the conversation flow to ensure consistent responses

const { DeepSeekService } = require('../../services/deepseekService');

async function testConversationFlow() {
  console.log('🤖 Testing Conversation Flow...\n');
  
  const conversationSteps = [
    {
      step: 1,
      input: "Hello",
      description: "Initial greeting"
    },
    {
      step: 2,
      input: "I have a headache",
      description: "Follow-up health question"
    },
    {
      step: 3,
      input: "How do I book an appointment?",
      description: "Appointment booking question"
    },
    {
      step: 4,
      input: "What's a healthy diet?",
      description: "General health question"
    }
  ];

  for (const step of conversationSteps) {
    try {
      console.log(`📝 Step ${step.step}: ${step.description}`);
      console.log(`💬 Input: "${step.input}"`);
      
      const response = await DeepSeekService.getResponse(step.input);
      
      console.log(`✅ Response: ${response.text}`);
      console.log(`📊 Should book appointment: ${response.shouldBookAppointment}`);
      console.log(`🚨 Urgency: ${response.urgency}`);
      
      // Check for DocBot branding
      if (response.text.toLowerCase().includes('docbot')) {
        console.log(`✅ DocBot branding found`);
      } else {
        console.log(`⚠️  DocBot branding missing`);
      }
      
      // Check for app-specific features
      if (response.text.toLowerCase().includes('discover tab')) {
        console.log(`✅ Discover tab mentioned`);
      } else {
        console.log(`⚠️  Discover tab not mentioned`);
      }
      
      console.log(''); // Empty line for readability
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('🎉 Conversation flow test completed!');
}

// Run the test
testConversationFlow().catch(console.error);

