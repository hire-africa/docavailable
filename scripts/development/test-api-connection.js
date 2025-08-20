// Test DeepSeek API Connection
// This script tests if the DeepSeek API is working correctly

async function testDeepSeekAPIConnection() {
  console.log('🔍 Testing DeepSeek API Connection...\n');
  
  // API key from environment
  const apiKey = 'sk-4678d79347b14a7fa5b0c9f0d728b166';
  
  if (!apiKey || apiKey === 'your-deepseek-api-key-here') {
    console.log('❌ No valid API key found.');
    return;
  }

  console.log('📡 Testing API connection...');

  try {
    const requestBody = {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are DocBot, a helpful health assistant. Keep responses brief and friendly."
        },
        {
          role: "user",
          content: "Hello"
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    };

    console.log('🌐 Making API request...');
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ API Error: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log('✅ API Response received successfully!');
    console.log(`📝 Response: ${data.choices?.[0]?.message?.content || 'No content'}`);
    
    // Check if response looks like DeepSeek
    const responseText = data.choices?.[0]?.message?.content || '';
    if (responseText.length > 10) {
      console.log('✅ DeepSeek API is working correctly!');
    } else {
      console.log('⚠️  Response seems too short, might be an error');
    }

  } catch (error) {
    console.log(`❌ Network/Connection Error: ${error.message}`);
    console.log('This might indicate:');
    console.log('- Network connectivity issues');
    console.log('- Invalid API key');
    console.log('- API service down');
    console.log('- CORS issues (if running in browser)');
  }
}

// Run the test
testDeepSeekAPIConnection().catch(console.error);
