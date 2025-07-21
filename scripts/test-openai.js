const OpenAI = require('openai');

// Test OpenAI API integration
async function testOpenAI() {
  console.log('🤖 Testing OpenAI API Integration...\n');
  
  // Your API key (replace with your actual key)
  const apiKey = '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';
  
  if (!apiKey || apiKey === 'your-api-key-here') {
    console.log('❌ No valid API key found. Please update the API key in the script.');
    return;
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  const systemPrompt = `You are a helpful healthcare assistant for a medical app called DocAvailable. Your role is to:

1. Answer basic health questions and provide general information
2. Help users understand common symptoms and conditions
3. Guide users to book appointments with real doctors for personal health issues
4. Provide health tips and wellness advice
5. NEVER give specific medical diagnoses or treatment recommendations
6. Always encourage users to consult with healthcare professionals for personal health concerns
7. Be friendly, caring, and professional
8. Keep responses concise (under 200 words)
9. If users mention symptoms, always recommend booking an appointment with a doctor
10. Mention that they can book appointments through the "Discover" tab in the app

Important: You are NOT a doctor and cannot provide medical advice. Always recommend professional medical consultation for health concerns.`;

  const testCases = [
    "Hello, how are you?",
    "I have a headache",
    "What is a healthy diet?",
    "I have chest pain",
    "How do I book an appointment?"
  ];

  for (const testCase of testCases) {
    try {
      console.log(`🧪 Testing: "${testCase}"`);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
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
      });

      const response = completion.choices[0]?.message?.content;
      console.log(`✅ Response: ${response}\n`);
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('🎉 OpenAI API test completed!');
}

// Run the test
testOpenAI().catch(console.error); 