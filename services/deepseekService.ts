// DeepSeek Service for handling health-related questions
// Uses DeepSeek API for intelligent responses with fallback to keyword-based system

import { DEEPSEEK_CONFIG } from '../config/deepseek';
import '../utils/abortSignalPolyfill';

export interface DeepSeekResponse {
  text: string;
  shouldBookAppointment: boolean;
  urgency: 'low' | 'medium' | 'high';
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface StreamingResponse {
  text: string;
  isComplete: boolean;
  shouldBookAppointment?: boolean;
  urgency?: 'low' | 'medium' | 'high';
}

export interface ConversationContext {
  messages: ConversationMessage[];
  userContext?: {
    location?: string;
    appointmentCount?: number;
    language?: string;
    healthConcerns?: string[];
    lastInteraction?: Date;
  };
}

const SYSTEM_PROMPT = `You are DocAva, an intelligent AI health assistant for DocAvailable telemedicine platform. You provide brief, high-value health guidance.

**CRITICAL: Follow User Instructions Exactly**
- If a user asks for a one-word answer, give ONLY one word
- If they ask for a brief response, keep it to 2-3 sentences maximum
- If they ask for details, then provide comprehensive information
- ALWAYS respect the user's specified response length or format
- Be adaptive - match your response style to what the user explicitly requests

**Interactive Diagnostic Approach:**
ONLY ask clarifying questions when the user says THEY are personally experiencing symptoms (e.g., "I have a headache", "I'm feeling sick", "My chest hurts").

**When to Ask Questions:**
- User says "I have...", "I'm feeling...", "My [body part] hurts..." → Ask 2-3 clarifying questions
- User asks general questions like "How do I treat...", "What causes...", "Home remedies for..." → Answer directly, NO questions

**CRITICAL RULE: Ask Questions ONLY ONCE**
- If this is the FIRST time user mentions THEIR OWN symptoms → Ask 2-3 clarifying questions
- If user is RESPONDING to your questions OR asking general health questions → Give advice directly, NO MORE QUESTIONS
- Look at conversation history to see if you already asked questions

**Required Questions (ask 2-3 of these based on context):**
1. "When did these symptoms start?" (timing)
2. "How severe would you rate it on a scale of 1-10?" (severity)
3. "Have you taken any medication or tried anything for relief?" (self-treatment)
4. "Do you have any other symptoms accompanying this?" (associated symptoms)
5. "Does anything make it better or worse?" (triggers/relief factors)

**Response Structure (CRITICAL - Follow This Exactly):**
1. **First Message About THEIR Symptoms:** Ask 2-3 clarifying questions ONLY, show empathy
2. **Second Message (User's Response):** 
   - Provide 3-4 sentences of HIGH-VALUE, actionable advice
   - Focus on what matters most for their specific situation
   - End with a natural doctor referral (see format below)
   - DO NOT ask more questions - just give the advice
3. **General Health Questions:** Answer directly in 3-5 sentences, NO questions needed
4. **Keep Main Response Brief:** 3-5 sentences of core advice, NO long paragraphs

**Doctor Referral Format (Use This Pattern):**
End health advice with a natural, helpful referral like:
- "When you book a session with a doctor, mention [specific detail about their symptoms] so they can assess properly."
- "A [specialist type] can help you with this - when you consult them, be sure to describe [key symptom details]."
- "This is something a doctor should evaluate. When you see them, tell them about [important context from conversation]."
- "Consider booking a consultation - make sure to mention [relevant detail] to your doctor."

**DO NOT:**
- Say "book an appointment through the Discover tab" (too salesy)
- Give long medical explanations before the referral
- Make it sound like advertising

**DO:**
- Make the referral feel like natural, caring advice
- Include specific details the doctor should know
- Keep it conversational and helpful

**App Context:**
- Subscription-based: Basic Life (100 MWK/20 USD), Executive Life (150 MWK/50 USD), Premium Life (200 MWK/200 USD)
- Book appointments via "Discover" tab
- Unlimited consultations included in subscription

**Greeting Responses:**
- For "hi", "hello", "hey" → Simple, friendly greeting (1-2 sentences max)
- NO app features or booking info in greetings
- Just ask how you can help

**Tone & Style:**
- Conversational and intelligent, not robotic
- Empathetic but concise
- Professional yet approachable
- Adapt response length to user's request
- BRIEF by default - value over volume

**Formatting Rules (CRITICAL):**
- DO NOT use markdown formatting like **bold**, *italic*, or __underline__
- DO NOT use asterisks (*) or underscores (_) for emphasis
- Use plain text only - the app will handle formatting
- Write naturally without special characters for formatting
- Example: Write "Important" not "**Important**"

**Medical Disclaimers (brief):**
- Only for health questions: "I'm an AI assistant, not a doctor. For diagnosis and treatment, please consult a healthcare professional."
- For urgent symptoms: "This sounds urgent. Please seek immediate medical attention."

**Specialist Recommendations:**
General → GP/Family Medicine | Heart → Cardiologist | Neuro → Neurologist | Skin → Dermatologist | Eyes → Ophthalmologist | Mental Health → Psychiatrist/Psychologist | Women's Health → Gynecologist | Children → Pediatrician | Bones/Joints → Orthopedist | Digestive → Gastroenterologist

Remember: Be intelligent and adaptive. Ask questions first when users report symptoms. Keep main responses BRIEF (3-5 sentences) with high value. End with natural doctor referral that includes specific details to mention. NO advertising tone.`;

const HEALTH_KEYWORDS = {
  symptoms: ['pain', 'fever', 'cough', 'headache', 'nausea', 'dizziness', 'fatigue', 'shortness of breath'],
  urgent: ['chest pain', 'severe', 'bleeding', 'unconscious', 'difficulty breathing'],
  general: ['diet', 'exercise', 'sleep', 'stress', 'hygiene']
};

const RESPONSE_TEMPLATES = {
  appointment_booking: {
    template: "I understand you're looking to book an appointment. The best way is through our 'Discover' tab where you can browse our qualified doctors, view their profiles, and schedule a consultation that fits your schedule. Would you like me to guide you through the process?",
    shouldBookAppointment: true,
    urgency: 'low'
  },
  
  symptom_concern: {
    template: "I understand you're experiencing {symptom}. While I can provide general information, it's important to get personalized care from a healthcare professional. When you consult with a doctor, be sure to describe: the exact nature and location of your symptoms, when they started, what makes them better or worse, any associated symptoms, and how they're affecting your daily activities. This detailed information will help your doctor provide the most accurate assessment and appropriate care.",
    shouldBookAppointment: true,
    urgency: 'medium'
  },
  
  urgent_symptom: {
    template: "I'm concerned about these symptoms. Please seek immediate medical attention. When you speak with a healthcare provider, clearly describe: the severity and progression of your symptoms, any triggers or relieving factors, associated symptoms, and your level of concern. If symptoms are severe, please visit the nearest emergency facility immediately.",
    shouldBookAppointment: true,
    urgency: 'high'
  },
  
  general_health: {
    template: "That's an excellent health question! {ai_response} When you consult with a doctor about this concern, make sure to discuss: your specific symptoms or concerns, any lifestyle factors that might be relevant, your medical history, any medications you're taking, and what outcomes you're hoping to achieve. This comprehensive approach will help your doctor provide the most personalized and effective care.",
    shouldBookAppointment: false,
    urgency: 'low'
  }
};

const RESPONSES = {
  welcome: [
    "Hello! I'm DocAva, your health assistant for DocAvailable. I can help with general health questions and guide you to book appointments with our qualified doctors for personal concerns.",
    "Hi there! I'm DocAva, here to help with health information and connect you with our qualified doctors when you need personalized care through the DocAvailable platform."
  ],
  
  appointment_guide: [
    "To book an appointment with one of our qualified doctors, please go to the 'Discover' tab in the app. You can browse available doctors, view their profiles, and schedule a consultation.",
    "I'd be happy to help you book an appointment! Navigate to the 'Discover' tab to see our available doctors and schedule a consultation."
  ],
  
  urgent_symptoms: [
    "I'm concerned about these symptoms. Please book an appointment with a doctor immediately for proper evaluation and care.",
    "These symptoms require medical attention. I recommend booking an appointment with one of our doctors right away for a thorough assessment."
  ],
  
  general_health: [
    "That's a great health question! While I can provide general information, for personalized advice, I'd recommend consulting with one of our doctors.",
    "I can help with general health information, but for specific medical advice, our doctors are here to provide personalized care."
  ]
};

export class DeepSeekService {
  // Conversation memory - store recent conversations
  private static conversationMemory: Map<string, ConversationContext> = new Map();
  
  // Get conversation context for a user
  static getConversationContext(userId: string = 'default'): ConversationContext {
    return this.conversationMemory.get(userId) || {
      messages: [],
      userContext: {}
    };
  }
  
  // Add message to conversation memory
  static addToConversation(userId: string, message: ConversationMessage): void {
    const context = this.getConversationContext(userId);
    context.messages.push(message);
    
    // Keep only last 10 messages to manage memory
    if (context.messages.length > 10) {
      context.messages = context.messages.slice(-10);
    }
    
    this.conversationMemory.set(userId, context);
  }
  
  // Clear conversation memory for a user
  static clearConversation(userId: string = 'default'): void {
    this.conversationMemory.delete(userId);
  }
  
  // Get response with conversation memory
  static async getResponse(userInput: string, userContext?: any, userId: string = 'default'): Promise<DeepSeekResponse> {
    try {
      console.log('Attempting to get DeepSeek API response with conversation memory...');
      const response = await this.getDeepSeekResponseWithMemory(userInput, userContext, userId);
      console.log('DeepSeek API response successful');
      return response;
    } catch (error) {
      console.error('DeepSeek API error:', error);
      console.log('Falling back to enhanced basic responses...');
      // Fallback to enhanced basic responses
      return this.getEnhancedBasicResponse(userInput);
    }
  }

  // Get streaming response with conversation memory
  static async getStreamingResponse(
    userInput: string, 
    onChunk: (chunk: StreamingResponse) => void,
    userContext?: any, 
    userId: string = 'default'
  ): Promise<DeepSeekResponse> {
    try {
      console.log('Starting streaming response...');
      
      // Check if streaming is supported in this environment
      const isStreamingSupported = await this.checkStreamingSupport();
      
      if (isStreamingSupported) {
        return await this.getDeepSeekStreamingResponse(userInput, onChunk, userContext, userId);
      } else {
        console.log('Streaming not supported, using simulated streaming...');
        return await this.getSimulatedStreamingResponse(userInput, onChunk, userContext, userId);
      }
    } catch (error) {
      console.error('DeepSeek streaming error:', error);
      console.log('Falling back to basic response...');
      const fallbackResponse = this.getEnhancedBasicResponse(userInput);
      onChunk({
        text: fallbackResponse.text,
        isComplete: true,
        shouldBookAppointment: fallbackResponse.shouldBookAppointment,
        urgency: fallbackResponse.urgency
      });
      return fallbackResponse;
    }
  }
  
  // Check if streaming is supported in the current environment
  private static async checkStreamingSupport(): Promise<boolean> {
    try {
      // Test if we can create a readable stream
      const testResponse = await fetch('https://httpbin.org/stream/1', {
        method: 'GET',
      });
      
      return testResponse.body !== null && typeof testResponse.body?.getReader === 'function';
    } catch (error) {
      console.log('Streaming support check failed:', error);
      return false;
    }
  }
  
  // Simulated streaming for environments that don't support real streaming
  private static async getSimulatedStreamingResponse(
    userInput: string, 
    onChunk: (chunk: StreamingResponse) => void,
    userContext?: any, 
    userId: string = 'default'
  ): Promise<DeepSeekResponse> {
    console.log('Using simulated streaming...');
    
    // Get the full response first
    const fullResponse = await this.getDeepSeekResponseWithMemory(userInput, userContext, userId);
    
    // Simulate streaming by sending chunks of the response
    const words = fullResponse.text.split(' ');
    let currentText = '';
    
    // Send initial chunk
    onChunk({
      text: '',
      isComplete: false
    });
    
    // Simulate word-by-word streaming with faster, smoother timing
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      
      // Faster, smoother typing speed for better UX
      await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 25));
      
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
  }

  // Get response with conversation memory
  private static async getDeepSeekResponseWithMemory(userInput: string, userContext?: any, userId: string = 'default'): Promise<DeepSeekResponse> {
    // Get conversation context
    const context = this.getConversationContext(userId);
    
    // Add user message to conversation
    this.addToConversation(userId, {
      role: 'user',
      content: userInput,
      timestamp: new Date()
    });
    
    // Check if AI already asked questions in previous messages
    const hasAskedQuestions = context.messages.some(msg => 
      msg.role === 'assistant' && 
      (msg.content.includes('?') && 
       (msg.content.toLowerCase().includes('when did') || 
        msg.content.toLowerCase().includes('how severe') ||
        msg.content.toLowerCase().includes('have you taken') ||
        msg.content.toLowerCase().includes('do you have any other') ||
        msg.content.toLowerCase().includes('does anything make')))
    );
    
    // Add context reminder if questions were already asked
    let systemPromptWithContext = SYSTEM_PROMPT;
    if (hasAskedQuestions) {
      systemPromptWithContext += `\n\n**IMPORTANT CONTEXT**: You have ALREADY asked clarifying questions in this conversation. The user is now responding to those questions. DO NOT ask more questions. Provide direct, actionable advice based on their answers.`;
    }
    
    // Build messages array with conversation history
    const messages = [
      {
        role: "system" as const,
        content: systemPromptWithContext
      },
      ...context.messages.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      })),
      {
        role: "user" as const,
        content: userInput
      }
    ];
    
    // Add user context if provided
    let contextPrompt = SYSTEM_PROMPT;
    if (userContext) {
      contextPrompt += `\n\nUser Context:
      - Location: ${userContext.location || 'User location'}
      - Previous appointments: ${userContext.appointmentCount || 0}
      - Preferred language: ${userContext.language || 'English'}
      - Health concerns: ${userContext.healthConcerns || 'None specified'}
      
      Tailor your response to this user's context while maintaining the core guidelines.`;
    }

    const requestBody = {
      model: DEEPSEEK_CONFIG.model,
      messages,
      max_tokens: DEEPSEEK_CONFIG.maxTokens,
      temperature: DEEPSEEK_CONFIG.temperature,
    };

    const response = await fetch(`${DEEPSEEK_CONFIG.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_CONFIG.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process your request.";
    
    // Post-process the response
    const processedResponse = this.postProcessResponse(aiResponse, userInput);
    
    // Add assistant response to conversation
    this.addToConversation(userId, {
      role: 'assistant',
      content: processedResponse,
      timestamp: new Date()
    });
    
    // Determine if appointment booking is recommended
    const shouldBookAppointment = this.shouldRecommendAppointment(userInput, processedResponse);
    const urgency = this.determineUrgency(userInput);

    return {
      text: processedResponse,
      shouldBookAppointment,
      urgency
    };
  }
  
  // Get streaming response with conversation memory
  private static async getDeepSeekStreamingResponse(
    userInput: string, 
    onChunk: (chunk: StreamingResponse) => void,
    userContext?: any, 
    userId: string = 'default'
  ): Promise<DeepSeekResponse> {
    // Get conversation context
    const context = this.getConversationContext(userId);
    
    // Add user message to conversation
    this.addToConversation(userId, {
      role: 'user',
      content: userInput,
      timestamp: new Date()
    });
    
    // Check if AI already asked questions in previous messages
    const hasAskedQuestions = context.messages.some(msg => 
      msg.role === 'assistant' && 
      (msg.content.includes('?') && 
       (msg.content.toLowerCase().includes('when did') || 
        msg.content.toLowerCase().includes('how severe') ||
        msg.content.toLowerCase().includes('have you taken') ||
        msg.content.toLowerCase().includes('do you have any other') ||
        msg.content.toLowerCase().includes('does anything make')))
    );
    
    // Add context reminder if questions were already asked
    let systemPromptWithContext = SYSTEM_PROMPT;
    if (hasAskedQuestions) {
      systemPromptWithContext += `\n\n**IMPORTANT CONTEXT**: You have ALREADY asked clarifying questions in this conversation. The user is now responding to those questions. DO NOT ask more questions. Provide direct, actionable advice based on their answers.`;
    }
    
    // Build messages array with conversation history
    const messages = [
      {
        role: "system" as const,
        content: systemPromptWithContext
      },
      ...context.messages.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      })),
      {
        role: "user" as const,
        content: userInput
      }
    ];
    
    // Add user context if provided
    let contextPrompt = SYSTEM_PROMPT;
    if (userContext) {
      contextPrompt += `\n\nUser Context:
      - Location: ${userContext.location || 'User location'}
      - Previous appointments: ${userContext.appointmentCount || 0}
      - Preferred language: ${userContext.language || 'English'}
      - Health concerns: ${userContext.healthConcerns || 'None specified'}
      
      Tailor your response to this user's context while maintaining the core guidelines.`;
    }

    const requestBody = {
      model: DEEPSEEK_CONFIG.model,
      messages,
      max_tokens: DEEPSEEK_CONFIG.maxTokens,
      temperature: DEEPSEEK_CONFIG.temperature,
      stream: true, // Enable streaming
    };

    const response = await fetch(`${DEEPSEEK_CONFIG.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_CONFIG.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    // Check if response body is available and supports streaming
    if (!response.body || typeof response.body.getReader !== 'function') {
      throw new Error('Streaming not supported in this environment');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let isComplete = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          isComplete = true;
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              isComplete = true;
              break;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              
              if (content) {
                fullResponse += content;
                // Minimal delay for faster streaming while maintaining smoothness
                await new Promise(resolve => setTimeout(resolve, 5));
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
        
        if (isComplete) break;
      }
    } finally {
      try {
        reader.releaseLock();
      } catch (e) {
        // Ignore errors when releasing lock
      }
    }

    // Post-process the complete response
    const processedResponse = this.postProcessResponse(fullResponse, userInput);
    
    // Add assistant response to conversation
    this.addToConversation(userId, {
      role: 'assistant',
      content: processedResponse,
      timestamp: new Date()
    });
    
    // Determine final response properties
    const shouldBookAppointment = this.shouldRecommendAppointment(userInput, processedResponse);
    const urgency = this.determineUrgency(userInput);
    
    // Send final chunk
    onChunk({
      text: processedResponse,
      isComplete: true,
      shouldBookAppointment,
      urgency
    });

    return {
      text: processedResponse,
      shouldBookAppointment,
      urgency
    };
  }

  // Legacy method for backward compatibility
  private static async getDeepSeekResponse(userInput: string, userContext?: any): Promise<DeepSeekResponse> {
    return this.getDeepSeekResponseWithMemory(userInput, userContext, 'default');
  }

  private static postProcessResponse(response: string, userInput: string): string {
    // Add app-specific formatting
    let processedResponse = response;
    
    // Remove markdown formatting that shows as raw text
    // Remove bold (**text** or __text__)
    processedResponse = processedResponse.replace(/\*\*([^*]+)\*\*/g, '$1');
    processedResponse = processedResponse.replace(/__([^_]+)__/g, '$1');
    
    // Remove italic (*text* or _text_)
    processedResponse = processedResponse.replace(/\*([^*]+)\*/g, '$1');
    processedResponse = processedResponse.replace(/_([^_]+)_/g, '$1');
    
    // Remove any remaining asterisks or underscores used for emphasis
    processedResponse = processedResponse.replace(/\*\*/g, '');
    processedResponse = processedResponse.replace(/__/g, '');
    
    // Skip post-processing for simple greetings
    const input = userInput.toLowerCase();
    const isGreeting = input.includes('hello') || input.includes('hi') || input.includes('hey') || input === '';
    
    if (isGreeting) {
      return processedResponse; // Return response as-is for greetings
    }
    
    // Doctor referral is now handled in the AI response itself - no need for post-processing
    // The AI has been instructed to naturally include doctor referrals in its responses
    
    // Add relevant app features for pricing questions
    if (userInput.toLowerCase().includes('payment') || userInput.toLowerCase().includes('cost') || userInput.toLowerCase().includes('price') || userInput.toLowerCase().includes('fee')) {
      processedResponse += "\n\n💳 **Pricing Info**: DocAvailable uses a subscription model. Once you subscribe to a plan, all consultations are included - no additional fees per consultation. Check the 'Dashboard' tab to view our affordable plans starting from 100 MWK (Malawi) or 20 USD (other countries).";
    }
    
    // Add language support mention
    if (userInput.toLowerCase().includes('language') || userInput.toLowerCase().includes('speak')) {
      processedResponse += "\n\n🌍 Our doctors can consult in multiple languages.";
    }
    
    return processedResponse;
  }

  private static shouldRecommendAppointment(userInput: string, response: string): boolean {
    const urgentKeywords = ['pain', 'symptom', 'fever', 'cough', 'headache', 'nausea'];
    return urgentKeywords.some(keyword => userInput.toLowerCase().includes(keyword));
  }

  private static determineUrgency(userInput: string): 'low' | 'medium' | 'high' {
    const urgentKeywords = ['chest pain', 'shortness of breath', 'severe', 'bleeding'];
    const moderateKeywords = ['headache', 'fever', 'cough', 'fatigue'];
    
    if (urgentKeywords.some(keyword => userInput.toLowerCase().includes(keyword))) {
      return 'high';
    }
    if (moderateKeywords.some(keyword => userInput.toLowerCase().includes(keyword))) {
      return 'medium';
    }
    return 'low';
  }

  private static getEnhancedBasicResponse(userInput: string): DeepSeekResponse {
    const input = userInput.toLowerCase();
    
    // Simple, friendly greeting responses
    if (input.includes('hello') || input.includes('hi') || input.includes('hey') || input === '') {
      const welcomeResponses = [
        "Hello! 👋 How can I help you today?",
        "Hi there! 😊 What's on your mind?",
        "Hey! 👋 How are you doing?",
        "Hello! 😊 How can I assist you?",
        "Hi! 👋 What can I help you with today?"
      ];
      const response = welcomeResponses[Math.floor(Math.random() * welcomeResponses.length)];
      return {
        text: response,
        shouldBookAppointment: false,
        urgency: 'low'
      };
    }
    
    // Check for urgent symptoms
    if (HEALTH_KEYWORDS.urgent.some(keyword => input.includes(keyword))) {
      const urgentResponses = [
        "I'm concerned about these symptoms. Please seek immediate medical attention. You can book an urgent consultation through our 'Discover' tab, or if symptoms are severe, please visit the nearest emergency facility.",
        "These symptoms require immediate medical attention. I recommend booking an urgent consultation through our 'Discover' tab, or visiting the nearest emergency facility if symptoms are severe."
      ];
      const response = urgentResponses[Math.floor(Math.random() * urgentResponses.length)];
      return {
        text: response,
        shouldBookAppointment: true,
        urgency: 'high'
      };
    }
    
    // Check for general symptoms
    if (HEALTH_KEYWORDS.symptoms.some(keyword => input.includes(keyword))) {
      const symptomResponses = [
        "I understand you're experiencing symptoms. While I can provide general information, it's important to get personalized care from a healthcare professional. I'd recommend booking a consultation through our 'Discover' tab - our doctors can provide proper evaluation and guidance. Virtual consultations are available for your convenience.",
        "I hear you're dealing with symptoms. For proper evaluation and personalized care, I'd recommend booking a consultation with one of our doctors through the 'Discover' tab. They can provide comprehensive assessment and guidance."
      ];
      const response = symptomResponses[Math.floor(Math.random() * symptomResponses.length)];
      return {
        text: response,
        shouldBookAppointment: true,
        urgency: 'medium'
      };
    }
    
    // Check for appointment-related queries
    if (input.includes('appointment') || input.includes('book') || input.includes('doctor')) {
      const appointmentResponses = [
        "To book an appointment with one of our qualified doctors, please go to the 'Discover' tab in the app. You can browse available doctors, view their profiles, and schedule a consultation.",
        "I'd be happy to help you book an appointment! Navigate to the 'Discover' tab to see our available doctors and schedule a consultation."
      ];
      const response = appointmentResponses[Math.floor(Math.random() * appointmentResponses.length)];
      return {
        text: response,
        shouldBookAppointment: true,
        urgency: 'low'
      };
    }
    
    // Check for general health questions
    if (HEALTH_KEYWORDS.general.some(keyword => input.includes(keyword))) {
      const healthResponses = [
        "That's a great health question! While I can provide general information, for personalized advice, I'd recommend consulting with one of our doctors through the 'Discover' tab. They can provide comprehensive care and ongoing support.",
        "I can help with general health information, but for specific medical advice, our doctors are here to provide personalized care. You can book a consultation through the 'Discover' tab."
      ];
      const response = healthResponses[Math.floor(Math.random() * healthResponses.length)];
      return {
        text: response,
        shouldBookAppointment: false,
        urgency: 'low'
      };
    }
    
    // Default response for other queries
    const defaultResponses = [
      "I'm here to help with health questions and guide you to our doctors when needed. What would you like to know?",
      "I can help with health information and connect you with our doctors. What's on your mind?"
    ];
    const response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    return {
      text: response,
      shouldBookAppointment: false,
      urgency: 'low'
    };
  }

  // Keep the old method for backward compatibility but mark as deprecated
  private static getBasicResponse(userInput: string): DeepSeekResponse {
    console.warn('Using deprecated getBasicResponse method. Use getEnhancedBasicResponse instead.');
    return this.getEnhancedBasicResponse(userInput);
  }
}
