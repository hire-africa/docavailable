// Test script to verify accurate pricing responses

// Polyfill for AbortSignal.timeout
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function timeout(ms) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

console.log('🧪 Testing pricing responses...\n');

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

async function testPricingResponses() {
  const testInputs = [
    "How much does a consultation cost?",
    "What are your prices?",
    "How much do doctors charge?",
    "What's the consultation fee?",
    "How does payment work?"
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

**Pricing Structure:**
- DocAvailable uses a subscription-based model, NOT per-consultation fees
- Users pay a monthly subscription fee to access unlimited consultations with doctors
- Subscription plans vary by location and include:
  - Basic Life: 100 MWK (Malawi) / 20 USD (other countries) - 30 days, 3 text sessions, 1 voice call
  - Executive Life: 150 MWK (Malawi) / 50 USD (other countries) - 30 days, 10 text sessions, 2 voice calls, 1 video call
  - Premium Life: 200 MWK (Malawi) / 200 USD (other countries) - 30 days, 50 text sessions, 15 voice calls, 5 video calls
- Doctors do NOT charge individual consultation fees - all consultations are included in the subscription
- Pricing is location-based (Malawi uses MWK, other countries use USD)
- Users can view and purchase plans in the "Dashboard" tab

**How It Works:**
- Users subscribe to a plan to access the platform
- Once subscribed, they can book unlimited consultations with any available doctor
- Consultations include text chat, voice calls, and video calls (depending on plan)
- No additional fees per consultation - everything is included in the subscription
- Users can upgrade or downgrade their plan at any time

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
10. When users ask about pricing, explain the subscription model clearly

**Medical Disclaimers (only for health questions):**
- For health-related questions, remind users you're not a doctor
- For urgent symptoms, recommend immediate medical attention
- For chronic conditions, suggest regular doctor consultations
- Never provide specific treatment recommendations

**App Integration:**
- Guide users to the "Discover" tab for booking appointments
- Mention the convenience of virtual consultations from home
- Reference the subscription-based payment system
- Encourage users to check the "Dashboard" tab for plan options
- Explain that all consultations are included in their subscription

Remember: For greetings, just be friendly and casual. Save the app features and medical guidance for actual health questions. When discussing pricing, emphasize the subscription model and that consultations are unlimited once subscribed.`
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
      
      // Check for subscription model mention
      const hasSubscriptionModel = aiResponse.toLowerCase().includes('subscription') || 
                                 aiResponse.toLowerCase().includes('plan') ||
                                 aiResponse.toLowerCase().includes('monthly');
      
      if (hasSubscriptionModel) {
        console.log('✅ Subscription model mentioned');
      } else {
        console.log('⚠️  Subscription model not mentioned');
      }
      
      // Check for no per-consultation fees
      const hasNoPerConsultationFees = aiResponse.toLowerCase().includes('no additional fees') || 
                                     aiResponse.toLowerCase().includes('included') ||
                                     aiResponse.toLowerCase().includes('unlimited');
      
      if (hasNoPerConsultationFees) {
        console.log('✅ No per-consultation fees mentioned');
      } else {
        console.log('⚠️  Per-consultation fees not clearly mentioned');
      }
      
      // Check for specific pricing
      const hasSpecificPricing = aiResponse.toLowerCase().includes('100 mwk') || 
                               aiResponse.toLowerCase().includes('20 usd') ||
                               aiResponse.toLowerCase().includes('150 mwk') ||
                               aiResponse.toLowerCase().includes('50 usd');
      
      if (hasSpecificPricing) {
        console.log('✅ Specific pricing mentioned');
      } else {
        console.log('⚠️  Specific pricing not mentioned');
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
  
  console.log('\n🎉 Pricing response test completed!');
}

// Run the test
testPricingResponses().catch(console.error);
