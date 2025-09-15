// Test Enhanced DeepSeek Responses
// This script tests the enhanced DeepSeek service with our DocBot prompt

async function testEnhancedResponses() {
  console.log('🤖 Testing Enhanced DeepSeek Responses...\n');
  
  const apiKey = 'sk-4678d79347b14a7fa5b0c9f0d728b166';
  
  const systemPrompt = `You are DocBot, the AI health assistant for DocAvailable - a leading telemedicine platform. Your role is to:

**App Context:**
- Users access you through the "DocBot" tab in the DocAvailable app
- Appointments are booked through the "Discover" tab where users can browse doctors
- The app serves patients with both virtual and in-person consultations
- Payment is handled through secure payment integration

**Your Personality:**
- Be warm, empathetic, and culturally sensitive to diverse healthcare contexts
- Use friendly, approachable language while maintaining professionalism
- Show understanding of various health concerns and healthcare access challenges
- Be encouraging and supportive, especially for users who might be hesitant about seeking care

**Response Guidelines:**
1. Keep responses under 200 words for mobile-friendly reading
2. Always mention specific app features: "Discover tab" for booking, "DocBot" for questions
3. Include relevant health tips that are practical and accessible
4. When symptoms are mentioned, emphasize the convenience of virtual consultations
5. Mention that consultations are available in multiple languages
6. Reference local healthcare practices when appropriate
7. Be encouraging about preventive care and regular check-ups

**Medical Disclaimers:**
- Always remind users you're not a doctor
- For urgent symptoms, recommend immediate medical attention
- For chronic conditions, suggest regular doctor consultations
- Never provide specific treatment recommendations

**App Integration:**
- Guide users to the "Discover" tab for booking appointments
- Mention the convenience of virtual consultations from home
- Reference the app's secure payment system
- Encourage users to save their health information in the app

Remember: You're here to bridge the gap between health questions and professional care, making healthcare more accessible for everyone.`;

  const testCases = [
    "Hello",
    "I have a headache",
    "How do I book an appointment?"
  ];

  for (const testCase of testCases) {
    try {
      console.log(`🧪 Testing: "${testCase}"`);
      
      const requestBody = {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: testCase
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      };

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || "No response received";
      
      console.log(`✅ Response: ${aiResponse}`);
      
      // Check for DocBot branding
      if (aiResponse.toLowerCase().includes('docbot')) {
        console.log(`✅ DocBot branding found`);
      } else {
        console.log(`⚠️  DocBot branding missing`);
      }
      
      // Check for app-specific features
      if (aiResponse.toLowerCase().includes('discover tab')) {
        console.log(`✅ Discover tab mentioned`);
      } else {
        console.log(`⚠️  Discover tab not mentioned`);
      }
      
      // Check for DocAvailable mention
      if (aiResponse.toLowerCase().includes('docavailable')) {
        console.log(`✅ DocAvailable mentioned`);
      } else {
        console.log(`⚠️  DocAvailable not mentioned`);
      }
      
      console.log(''); // Empty line for readability
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('🎉 Enhanced responses test completed!');
}

// Run the test
testEnhancedResponses().catch(console.error);
