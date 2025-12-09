// Test Streaming and Conversation Memory Features
// This script tests the enhanced DeepSeek service with streaming and conversation memory

// Polyfill for AbortSignal.timeout
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function timeout(ms) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

console.log('🧪 Testing Streaming and Conversation Memory Features...\n');

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
  
  getStreamingResponse: async (userInput, onChunk, userContext, userId = 'default') => {
    console.log(`📡 Streaming response for: "${userInput}"`);
    
    // Get conversation context
    const context = DeepSeekService.getConversationContext(userId);
    
    // Add user message to conversation
    DeepSeekService.addToConversation(userId, {
      role: 'user',
      content: userInput,
      timestamp: new Date()
    });
    
    // Build messages array with conversation history
    const messages = [
      {
        role: "system",
        content: "You are DocBot, a helpful health assistant. Keep responses brief and friendly."
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

    try {
      const response = await fetch(`${mockConfig.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
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
        reader.releaseLock();
      }
    } catch (error) {
      console.error('❌ Streaming error:', error.message);
      throw error;
    }
  }
};

async function testStreamingAndConversation() {
  const testConversation = [
    "Hello",
    "I have a headache",
    "It's been going on for 2 days",
    "What should I do?"
  ];
  
  console.log('🔄 Testing conversation with streaming responses...\n');
  
  for (let i = 0; i < testConversation.length; i++) {
    const userInput = testConversation[i];
    console.log(`\n🧪 Message ${i + 1}: "${userInput}"`);
    
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
    
    // Add delay between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🧹 Testing conversation clearing...');
  DeepSeekService.clearConversation();
  const context = DeepSeekService.getConversationContext();
  console.log(`✅ Conversation cleared: ${context.messages.length} messages remaining`);
  
  console.log('\n🎉 Streaming and conversation memory test completed!');
}

// Run the test
testStreamingAndConversation().catch(console.error);
