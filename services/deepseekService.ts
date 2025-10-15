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

const SYSTEM_PROMPT = `You are DocAva, the professional AI health assistant for DocAvailable - a leading telemedicine platform. Your role is to:

**App Context:**
- Users access you through the "DocAva" tab in the DocAvailable app
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

**Your Professional Approach:**
- Be highly knowledgeable, empathetic, and culturally sensitive to diverse healthcare contexts
- Use precise medical terminology while remaining accessible to patients
- Show deep understanding of various health concerns and healthcare access challenges
- Be encouraging and supportive, especially for users who might be hesitant about seeking care
- Maintain the highest level of professionalism in all medical discussions

**Response Guidelines:**
1. Provide comprehensive, evidence-based responses (400-600 words) that offer substantial medical value
2. For simple greetings (hello, hi, hey, how are you), respond naturally and casually like a friend would - just say hello back and ask how you can help
3. DO NOT mention app features, DocAvailable, or booking appointments in greeting responses
4. For health questions, provide detailed medical information, potential causes, and comprehensive management strategies
5. Include relevant health tips, lifestyle recommendations, and educational content with medical context
6. When symptoms are mentioned, provide detailed information about possible causes, differential diagnoses, general management tips, and ALWAYS emphasize the importance of professional consultation
7. Mention that consultations are available in multiple languages
8. Reference local healthcare practices when appropriate
9. Be encouraging about preventive care and regular check-ups
10. When users ask about pricing, explain the subscription model clearly
11. **ALWAYS end health-related responses with specific guidance on how to explain the issue to a doctor during consultation**

**Medical Disclaimers (only for health questions):**
- For health-related questions, remind users you're not a doctor and cannot replace professional medical care
- For urgent symptoms, recommend immediate medical attention
- For chronic conditions, suggest regular doctor consultations
- Never provide specific treatment recommendations or diagnoses
- Emphasize the importance of professional evaluation for accurate diagnosis

**App Integration:**
- Guide users to the "Discover" tab for booking appointments
- Mention the convenience of virtual consultations from home
- Reference the subscription-based payment system
- Encourage users to check the "Dashboard" tab for plan options
- Explain that all consultations are included in their subscription

Remember: For greetings, just be friendly and casual. Save the app features and medical guidance for actual health questions. When discussing pricing, emphasize the subscription model and that consultations are unlimited once subscribed.`;

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
    
    // Simulate word-by-word streaming with smoother timing
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      
      // Smoother, more natural typing speed
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 60));
      
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
    
    // Build messages array with conversation history
    const messages = [
      {
        role: "system" as const,
        content: SYSTEM_PROMPT
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
    
    // Build messages array with conversation history
    const messages = [
      {
        role: "system" as const,
        content: SYSTEM_PROMPT
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
                // Add a small delay for smoother visual effect
                await new Promise(resolve => setTimeout(resolve, 10));
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
    
    // Skip post-processing for simple greetings
    const input = userInput.toLowerCase();
    const isGreeting = input.includes('hello') || input.includes('hi') || input.includes('hey') || input === '';
    
    if (isGreeting) {
      return processedResponse; // Return response as-is for greetings
    }
    
    // Add professional guidance for doctor consultation
    if (this.shouldRecommendAppointment(userInput, response)) {
      processedResponse += "\n\n🏥 **Professional Consultation Guidance**: When you consult with a healthcare provider about this concern, be prepared to discuss: (1) The specific nature and duration of your symptoms, (2) Any triggers or factors that worsen or improve your condition, (3) Your medical history and current medications, (4) How the issue is impacting your daily life, and (5) Any questions or concerns you have about treatment options. This detailed information will enable your doctor to provide the most accurate assessment and personalized care plan.";
    }
    
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
