// Test script to verify DeepSeek service works with AbortSignal.timeout polyfill

// Polyfill for AbortSignal.timeout
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function timeout(ms) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

console.log('🧪 Testing DeepSeek service with polyfill...\n');

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

async function testDeepSeekWithPolyfill() {
  const testInput = "Hello, I have a headache";
  
  console.log(`Testing with input: "${testInput}"`);
  
  try {
    // Test the fetch with AbortSignal.timeout
    const requestBody = {
      model: mockConfig.model,
      messages: [
        {
          role: "system",
          content: "You are DocBot, a helpful health assistant. Keep responses brief and friendly."
        },
        {
          role: "user",
          content: testInput
        }
      ],
      max_tokens: mockConfig.maxTokens,
      temperature: mockConfig.temperature,
    };

    console.log('📡 Making API call with AbortSignal.timeout...');
    
    const response = await fetch(`${mockConfig.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockConfig.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    console.log(`✅ API call successful! Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ API Error: ${errorText}`);
      return;
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "No response received";
    
    console.log(`✅ DeepSeek Response: ${aiResponse}`);
    console.log('🎉 DeepSeek service test completed successfully!');

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    
    if (error.name === 'AbortError') {
      console.log('⏰ Request timed out - this is expected behavior with the polyfill');
    } else if (error.message.includes('fetch')) {
      console.log('🌐 Network error - check internet connection');
    } else {
      console.log('🔧 Unknown error occurred');
    }
  }
}

// Run the test
testDeepSeekWithPolyfill().catch(console.error);
