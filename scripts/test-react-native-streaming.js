// Test React Native Streaming Implementation
// This script tests the improved streaming with fallback support

// Polyfill for AbortSignal.timeout
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function timeout(ms) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

console.log('🧪 Testing React Native Streaming Implementation...\n');

// Mock environment and config
const mockEnvironment = {
  DEEPSEEK_API_KEY: 'sk-4678d79347b14a7fa5b0c9f0d728b166'
};

const mockConfig = {
  apiKey: mockEnvironment.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  maxTokens: 600,
  temperature: 0.7,
};

// Mock conversation memory
let conversationMemory = new Map();

// Mock DeepSeek service methods
const DeepSeekService = {
  getConversationContext: (userId = 'default') => {
    return conversationMemory.get(userId) || {
      messages: [],
      userContext: {}
    };
  },
  
  addToConversation: (userId, message) => {
    const context = DeepSeekService.getConversationContext(userId);
    context.messages.push(message);
    
    if (context.messages.length > 10) {
      context.messages = context.messages.slice(-10);
    }
    
    conversationMemory.set(userId, context);
  },
  
  clearConversation: (userId = 'default') => {
    conversationMemory.delete(userId);
  },
  
  // Check if streaming is supported
  checkStreamingSupport: async () => {
    try {
      console.log('🔍 Checking streaming support...');
      const testResponse = await fetch('https://httpbin.org/stream/1', {
        method: 'GET',
      });
      
      const isSupported = testResponse.body !== null && typeof testResponse.body?.getReader === 'function';
      console.log(`✅ Streaming support: ${isSupported ? 'Available' : 'Not available'}`);
      return isSupported;
    } catch (error) {
      console.log('❌ Streaming support check failed:', error.message);
      return false;
    }
  },
  
  // Simulated streaming for unsupported environments
  getSimulatedStreamingResponse: async (userInput, onChunk, userContext, userId = 'default') => {
    console.log('🎭 Using simulated streaming...');
    
    // Get full response first
    const fullResponse = await DeepSeekService.getFullResponse(userInput, userContext, userId);
    
    // Simulate streaming by sending chunks
    const words = fullResponse.text.split(' ');
    let currentText = '';
    
    // Send initial chunk
    onChunk({
      text: '',
      isComplete: false
    });
    
    // Simulate word-by-word streaming
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      
      // Add delay to simulate real streaming
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      
      onChunk({
        text: currentText,
        isComplete: false
      });
    }
    
    // Send final chunk
    onChunk({
      text: fullResponse.text,
      isComplete: true,
      shouldBookAppointment: fullResponse.shouldBookAppointment,
      urgency: fullResponse.urgency
    });
    
    return fullResponse;
  },
  
  // Get full response (non-streaming)
  getFullResponse: async (userInput, userContext, userId = 'default') => {
    console.log('📡 Getting full response...');
    
    const context = DeepSeekService.getConversationContext(userId);
    
    // Add user message to conversation
    DeepSeekService.addToConversation(userId, {
      role: 'user',
      content: userInput,
      timestamp: new Date()
    });
    
    const messages = [
      {
        role: "system",
        content: "You are DocBot, a helpful health assistant. Provide detailed, helpful responses that give real value to users. Always end health-related responses with a gentle reminder to book a consultation for personalized care."
      },
      ...context.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: "user",
        content: userInput
      }
    ];

    const requestBody = {
      model: mockConfig.model,
      messages,
      max_tokens: mockConfig.maxTokens,
      temperature: mockConfig.temperature,
    };

    try {
      const response = await fetch(`${mockConfig.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process your request.";
      
      // Add assistant response to conversation
      DeepSeekService.addToConversation(userId, {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      });
      
      return {
        text: aiResponse,
        shouldBookAppointment: userInput.toLowerCase().includes('pain') || userInput.toLowerCase().includes('symptom'),
        urgency: userInput.toLowerCase().includes('chest pain') ? 'high' : 'medium'
      };
    } catch (error) {
      console.error('❌ Full response error:', error.message);
      throw error;
    }
  },
  
  // Main streaming method with fallback
  getStreamingResponse: async (userInput, onChunk, userContext, userId = 'default') => {
    try {
      console.log('🚀 Starting streaming response...');
      
      // Check if streaming is supported
      const isStreamingSupported = await DeepSeekService.checkStreamingSupport();
      
      if (isStreamingSupported) {
        console.log('✅ Using real streaming...');
        return await DeepSeekService.getRealStreamingResponse(userInput, onChunk, userContext, userId);
      } else {
        console.log('🎭 Using simulated streaming...');
        return await DeepSeekService.getSimulatedStreamingResponse(userInput, onChunk, userContext, userId);
      }
    } catch (error) {
      console.error('❌ Streaming error:', error.message);
      console.log('🔄 Falling back to simulated streaming...');
      return await DeepSeekService.getSimulatedStreamingResponse(userInput, onChunk, userContext, userId);
    }
  },
  
  // Real streaming implementation
  getRealStreamingResponse: async (userInput, onChunk, userContext, userId = 'default') => {
    console.log('📡 Using real streaming...');
    
    const context = DeepSeekService.getConversationContext(userId);
    
    // Add user message to conversation
    DeepSeekService.addToConversation(userId, {
      role: 'user',
      content: userInput,
      timestamp: new Date()
    });
    
    const messages = [
      {
        role: "system",
        content: "You are DocBot, a helpful health assistant. Provide detailed, helpful responses that give real value to users. Always end health-related responses with a gentle reminder to book a consultation for personalized care."
      },
      ...context.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: "user",
        content: userInput
      }
    ];

    const requestBody = {
      model: mockConfig.model,
      messages,
      max_tokens: mockConfig.maxTokens,
      temperature: mockConfig.temperature,
      stream: true,
    };

    const response = await fetch(`${mockConfig.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockConfig.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    // Check if response body supports streaming
    if (!response.body || typeof response.body.getReader !== 'function') {
      throw new Error('Streaming not supported in this environment');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              // Add assistant response to conversation
              DeepSeekService.addToConversation(userId, {
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date()
              });
              
              // Send final chunk
              onChunk({
                text: fullResponse,
                isComplete: true,
                shouldBookAppointment: userInput.toLowerCase().includes('pain') || userInput.toLowerCase().includes('symptom'),
                urgency: userInput.toLowerCase().includes('chest pain') ? 'high' : 'medium'
              });
              
              return {
                text: fullResponse,
                shouldBookAppointment: userInput.toLowerCase().includes('pain') || userInput.toLowerCase().includes('symptom'),
                urgency: userInput.toLowerCase().includes('chest pain') ? 'high' : 'medium'
              };
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              
              if (content) {
                fullResponse += content;
                onChunk({
                  text: fullResponse,
                  isComplete: false
                });
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      try {
        reader.releaseLock();
      } catch (e) {
        // Ignore errors when releasing lock
      }
    }
  }
};

async function testReactNativeStreaming() {
  const testInputs = [
    "Hello",
    "I have a headache",
    "It's been going on for 2 days"
  ];
  
  console.log('🔄 Testing React Native streaming implementation...\n');
  
  for (let i = 0; i < testInputs.length; i++) {
    const userInput = testInputs[i];
    console.log(`\n🧪 Test ${i + 1}: "${userInput}"`);
    
    try {
      let chunksReceived = 0;
      let finalResponse = '';
      
      await DeepSeekService.getStreamingResponse(
        userInput,
        (chunk) => {
          chunksReceived++;
          finalResponse = chunk.text;
          
          if (chunk.isComplete) {
            console.log(`✅ Final response (${chunksReceived} chunks): ${finalResponse.substring(0, 100)}...`);
            console.log(`📊 Response stats: Complete=${chunk.isComplete}, ShouldBook=${chunk.shouldBookAppointment}, Urgency=${chunk.urgency}`);
          } else {
            console.log(`📝 Chunk ${chunksReceived}: ${chunk.text.substring(0, 50)}...`);
          }
        }
      );
      
      // Check conversation memory
      const context = DeepSeekService.getConversationContext();
      console.log(`💾 Conversation memory: ${context.messages.length} messages`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🧹 Testing conversation clearing...');
  DeepSeekService.clearConversation();
  const context = DeepSeekService.getConversationContext();
  console.log(`✅ Conversation cleared: ${context.messages.length} messages remaining`);
  
  console.log('\n🎉 React Native streaming test completed!');
}

// Run the test
testReactNativeStreaming().catch(console.error);
