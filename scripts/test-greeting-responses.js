// Test script to verify updated greeting responses

// Polyfill for AbortSignal.timeout
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function timeout(ms) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

console.log('🧪 Testing updated greeting responses...\n');

// Mock environment and config
const mockEnvironment = {
  DEEPSEEK_API_KEY: 'sk-4678d79347b14a7fa5b0c9f0d728b166'
};

const mockConfig = {
  apiKey: mockEnvironment.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  maxTokens: 300,
  temperature: 0.7,
};

async function testGreetingResponses() {
  const testInputs = [
    "Hello",
    "Hi there",
    "Hey",
    "", // Empty input
    "How are you?"
  ];
  
  for (const input of testInputs) {
    console.log(`\n🧪 Testing: "${input}"`);
    
    try {
      // Test the fetch with AbortSignal.timeout
      const requestBody = {
        model: mockConfig.model,
        messages: [
          {
            role: "system",
            content: `You are DocBot, the AI health assistant for DocAvailable - a leading telemedicine platform. Your role is to:

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
2. For simple greetings (hello, hi, hey, how are you), respond naturally and casually like a friend would - just say hello back and ask how you can help
3. DO NOT mention app features, DocAvailable, or booking appointments in greeting responses
4. For health questions, mention specific app features: "Discover tab" for booking, "DocBot" for questions
5. Include relevant health tips that are practical and accessible
6. When symptoms are mentioned, emphasize the convenience of virtual consultations
7. Mention that consultations are available in multiple languages
8. Reference local healthcare practices when appropriate
9. Be encouraging about preventive care and regular check-ups

**Medical Disclaimers (only for health questions):**
- For health-related questions, remind users you're not a doctor
- For urgent symptoms, recommend immediate medical attention
- For chronic conditions, suggest regular doctor consultations
- Never provide specific treatment recommendations

**App Integration:**
- Guide users to the "Discover" tab for booking appointments
- Mention the convenience of virtual consultations from home
- Reference the app's secure payment system
- Encourage users to save their health information in the app

Remember: For greetings, just be friendly and casual. Save the app features and medical guidance for actual health questions.`
          },
          {
            role: "user",
            content: input
          }
        ],
        max_tokens: mockConfig.maxTokens,
        temperature: mockConfig.temperature,
      };

      console.log('📡 Making API call...');
      
      const response = await fetch(`${mockConfig.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ API Error: ${errorText}`);
        continue;
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || "No response received";
      
      console.log(`✅ Response: ${aiResponse}`);
      
      // Check if response is conversational for greetings
      const isGreeting = input.toLowerCase().includes('hello') || 
                        input.toLowerCase().includes('hi') || 
                        input.toLowerCase().includes('hey') || 
                        input === '';
      
      if (isGreeting) {
        // Check for medical disclaimers in greeting responses
        const hasMedicalDisclaimer = aiResponse.toLowerCase().includes('not a doctor') || 
                                   aiResponse.toLowerCase().includes('medical advice') ||
                                   aiResponse.toLowerCase().includes('healthcare professional');
        
        if (hasMedicalDisclaimer) {
          console.log('⚠️  Medical disclaimer found in greeting response');
        } else {
          console.log('✅ No medical disclaimer in greeting response');
        }
        
        // Check for app features in greeting responses
        const hasAppFeatures = aiResponse.toLowerCase().includes('discover tab') || 
                             aiResponse.toLowerCase().includes('docavailable') ||
                             aiResponse.toLowerCase().includes('appointment');
        
        if (hasAppFeatures) {
          console.log('⚠️  App features mentioned in greeting response');
        } else {
          console.log('✅ No app features in greeting response');
        }
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      
      if (error.name === 'AbortError') {
        console.log('⏰ Request timed out');
      }
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🎉 Greeting response test completed!');
}

// Run the test
testGreetingResponses().catch(console.error);
