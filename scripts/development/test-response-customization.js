// Test DeepSeek Response Customization
// This script tests the enhanced customization features

const testCases = [
  {
    name: "Symptom Concern - Headache",
    input: "I have a headache",
    expectedElements: ["appointment", "Discover tab", "consultation", "doctor", "DocBot"],
    expectedTone: "caring_professional",
    expectedUrgency: "medium"
  },
  {
    name: "Appointment Booking",
    input: "How do I book an appointment?",
    expectedElements: ["Discover tab", "browse doctors", "schedule", "DocAvailable"],
    expectedTone: "helpful_guide",
    expectedUrgency: "low"
  },
  {
    name: "General Health Question",
    input: "What's a healthy diet?",
    expectedElements: ["general information", "personalized advice", "doctor consultation"],
    expectedTone: "educational_supportive",
    expectedUrgency: "low"
  },
  {
    name: "Urgent Symptom",
    input: "I have chest pain",
    expectedElements: ["immediate medical attention", "emergency", "urgent consultation"],
    expectedTone: "urgent_caring",
    expectedUrgency: "high"
  },
  {
    name: "Payment Question",
    input: "How much does an appointment cost?",
    expectedElements: ["payment", "secure payment"],
    expectedTone: "informative_helpful",
    expectedUrgency: "low"
  },
  {
    name: "Language Support",
    input: "Can I speak with the doctor in my language?",
    expectedElements: ["multiple languages", "language"],
    expectedTone: "inclusive_supportive",
    expectedUrgency: "low"
  },
  {
    name: "Welcome Message",
    input: "Hello",
    expectedElements: ["DocBot", "DocAvailable", "health assistant"],
    expectedTone: "friendly_welcoming",
    expectedUrgency: "low"
  }
];

async function testResponseCustomization() {
  console.log('🤖 Testing Enhanced DeepSeek Response Customization...\n');
  
  // Your API key
  const apiKey = 'sk-4678d79347b14a7fa5b0c9f0d728b166';
  
  if (!apiKey || apiKey === 'your-deepseek-api-key-here') {
    console.log('❌ No valid API key found. Please update the API key in the script.');
    return;
  }

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

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    try {
      console.log(`🧪 Testing: ${testCase.name}`);
      console.log(`📝 Input: "${testCase.input}"`);
      
      const requestBody = {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: testCase.input
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
      
      // Post-process the response (simulating the postProcessResponse function)
      let processedResponse = aiResponse;
      
      // Add call-to-action for appointment booking
      if (testCase.input.toLowerCase().includes('pain') || testCase.input.toLowerCase().includes('symptom') || 
          testCase.input.toLowerCase().includes('fever') || testCase.input.toLowerCase().includes('cough') || 
          testCase.input.toLowerCase().includes('headache') || testCase.input.toLowerCase().includes('nausea')) {
        processedResponse += "\n\n💡 **Quick Tip**: You can book a consultation with our doctors through the 'Discover' tab in the app.";
      }
      
      // Add relevant app features
      if (testCase.input.toLowerCase().includes('payment') || testCase.input.toLowerCase().includes('cost')) {
        processedResponse += "\n\n💳 We offer secure payment options for your convenience.";
      }
      
      // Add language support mention
      if (testCase.input.toLowerCase().includes('language') || testCase.input.toLowerCase().includes('speak')) {
        processedResponse += "\n\n🌍 Our doctors can consult in multiple languages.";
      }
      
      console.log(`✅ Response: ${processedResponse}`);
      
      // Validate response quality
      const validation = validateResponse(processedResponse, testCase);
      if (validation.passed) {
        console.log(`✅ Test PASSED - ${validation.score}/100`);
        passedTests++;
      } else {
        console.log(`❌ Test FAILED - ${validation.score}/100`);
        console.log(`   Missing elements: ${validation.missingElements.join(', ')}`);
      }
      
      console.log(''); // Empty line for readability
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }
  
  console.log(`🎉 Testing completed! ${passedTests}/${totalTests} tests passed`);
  console.log(`📊 Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
}

function validateResponse(response, testCase) {
  let score = 0;
  const missingElements = [];
  
  // Check for expected elements
  for (const element of testCase.expectedElements) {
    if (response.toLowerCase().includes(element.toLowerCase())) {
      score += 15; // 15 points per expected element
    } else {
      missingElements.push(element);
    }
  }
  
  // Check for app-specific features
  if (response.toLowerCase().includes('docbot')) score += 10;
  if (response.toLowerCase().includes('docavailable')) score += 10;
  if (response.toLowerCase().includes('discover tab')) score += 10;
  
  // Check for appropriate tone indicators
  if (testCase.expectedTone === 'caring_professional' && 
      (response.toLowerCase().includes('care') || response.toLowerCase().includes('help'))) {
    score += 10;
  }
  
  if (testCase.expectedTone === 'urgent_caring' && 
      (response.toLowerCase().includes('immediate') || response.toLowerCase().includes('emergency'))) {
    score += 10;
  }
  
  // Check for medical disclaimers
  if (response.toLowerCase().includes('not a doctor') || response.toLowerCase().includes('consult')) {
    score += 10;
  }
  
  // Check for app integration mentions
  if (response.toLowerCase().includes('app') || response.toLowerCase().includes('platform')) {
    score += 10;
  }
  
  return {
    passed: score >= 70, // 70% threshold for passing
    score: Math.min(score, 100),
    missingElements
  };
}

// Run the test
testResponseCustomization().catch(console.error);
