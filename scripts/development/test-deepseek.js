// Test DeepSeek API integration
async function testDeepSeek() {
  console.log('🤖 Testing DeepSeek API Integration...\n');
  
  // Your API key
  const apiKey = 'sk-4678d79347b14a7fa5b0c9f0d728b166';
  
  if (!apiKey || apiKey === 'your-deepseek-api-key-here') {
    console.log('❌ No valid API key found. Please update the API key in the script.');
    return;
  }

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
      console.log(`✅ Response: ${aiResponse}\n`);
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('🎉 DeepSeek API test completed!');
}

// Run the test
testDeepSeek().catch(console.error);
