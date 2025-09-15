// Debug DeepSeek Service
// This script tests the DeepSeek service directly to see what's happening

// Mock the environment for testing
const mockEnvironment = {
  DEEPSEEK_API_KEY: 'sk-4678d79347b14a7fa5b0c9f0d728b166'
};

// Mock the config
const mockConfig = {
  apiKey: mockEnvironment.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  maxTokens: 300,
  temperature: 0.7,
};

async function testDeepSeekService() {
  console.log('🔍 Debugging DeepSeek Service...\n');
  
  const testInputs = [
    "Hello",
    "I have a headache",
    "How do I book an appointment?"
  ];

  for (const input of testInputs) {
    console.log(`\n🧪 Testing: "${input}"`);
    
    try {
      // Test direct API call first
      console.log('📡 Making direct API call...');
      
      const requestBody = {
        model: mockConfig.model,
        messages: [
          {
            role: "system",
            content: "You are DocBot, a helpful health assistant. Keep responses brief and friendly."
          },
          {
            role: "user",
            content: input
          }
        ],
        max_tokens: mockConfig.maxTokens,
        temperature: mockConfig.temperature,
      };

      const startTime = Date.now();
      
      const response = await fetch(`${mockConfig.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const endTime = Date.now();
      console.log(`⏱️  API call took ${endTime - startTime}ms`);
      console.log(`📊 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ API Error: ${errorText}`);
        continue;
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || "No response received";
      
      console.log(`✅ DeepSeek Response: ${aiResponse}`);
      
      // Check if this looks like a real DeepSeek response
      if (aiResponse.length > 20 && !aiResponse.includes('error')) {
        console.log('✅ This appears to be a genuine DeepSeek response');
      } else {
        console.log('⚠️  This might not be a genuine DeepSeek response');
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      
      if (error.name === 'AbortError') {
        console.log('⏰ Request timed out - API might be slow or unresponsive');
      } else if (error.message.includes('fetch')) {
        console.log('🌐 Network error - check internet connection');
      } else {
        console.log('🔧 Unknown error occurred');
      }
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🎉 Debug test completed!');
}

// Run the debug test
testDeepSeekService().catch(console.error);
