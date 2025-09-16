// OpenAI Service for DocAvailable Chatbot
// Handles AI-powered health assistance using OpenAI's GPT models

import { environment } from '../config/environment';

// Response interfaces
export interface OpenAIResponse {
  text: string;
  shouldBookAppointment: boolean;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
  suggestions?: string[];
}

export interface StreamingResponse {
  text: string;
  isComplete: boolean;
  type: 'chunk' | 'complete';
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ConversationContext {
  messages: ConversationMessage[];
  lastActivity: Date;
  userId: string;
}

// System prompt for the health assistant
const SYSTEM_PROMPT = `You are DocBot, a helpful AI health assistant for DocAvailable, a telemedicine platform. Your role is to:

1. Provide general health information and guidance
2. Help users understand when to seek medical care
3. Encourage booking appointments with real doctors for personal health concerns
4. Maintain a professional, caring, and empathetic tone
5. Never provide specific medical diagnoses or treatments
6. Always recommend consulting with healthcare professionals for personal health issues

Guidelines:
- Keep responses concise but helpful (under 200 words)
- Use simple, clear language
- Be encouraging about seeking professional medical care
- For urgent symptoms (chest pain, severe bleeding, unconsciousness), strongly recommend immediate medical attention
- For general health questions, provide educational information
- Always end with encouragement to book an appointment for personal concerns

Remember: You are an assistant, not a replacement for professional medical care.`;

// Conversation memory storage
const conversationMemory = new Map<string, ConversationContext>();

// Predefined responses for common queries
const RESPONSES = {
  greeting: [
    "Hello! I'm DocBot, your AI health assistant. I'm here to help with general health questions and guide you to the right care. How can I assist you today?",
    "Hi there! I'm DocBot, ready to help with your health questions. Remember, I can provide general guidance, but for personal health concerns, I'll help you connect with our qualified doctors. What would you like to know?",
    "Welcome! I'm DocBot, your health assistant. I can answer general health questions and help you understand when to seek medical care. What can I help you with today?"
  ],
  appointment: [
    "I'd be happy to help you book an appointment! You can schedule with our qualified doctors through the app. Would you like me to guide you through the booking process?",
    "For personal health concerns, I recommend booking an appointment with one of our doctors. They can provide personalized care and proper medical advice. Shall I help you find available appointment slots?",
    "That's a great question! For the best care, I'd suggest booking an appointment with one of our experienced doctors. They can give you personalized advice based on your specific situation."
  ],
  emergency: [
    "This sounds like it could be a medical emergency. Please seek immediate medical attention by calling emergency services or going to the nearest hospital. Your safety is the top priority.",
    "I'm concerned about what you're describing. This may require immediate medical attention. Please contact emergency services right away or go to the nearest emergency room.",
    "This sounds serious and potentially urgent. Please don't wait - seek immediate medical care by calling emergency services or visiting the nearest hospital immediately."
  ],
  general: [
    "That's a good question about health and wellness. While I can provide general information, for personalized medical advice, I'd recommend consulting with one of our doctors.",
    "I understand your concern. For the most accurate and personalized guidance, I'd suggest booking an appointment with one of our qualified healthcare providers.",
    "That's an important health topic. I can share general information, but for your specific situation, our doctors can provide the best personalized care and advice."
  ]
};

export class OpenAIService {
  // Conversation memory - store recent conversations
  private static conversations = new Map<string, ConversationContext>();

  // Get conversation context for a user
  private static getConversationContext(userId: string): ConversationContext {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, {
        messages: [],
        lastActivity: new Date(),
        userId
      });
    }
    return this.conversations.get(userId)!;
  }

  // Add message to conversation
  private static addToConversation(userId: string, message: ConversationMessage): void {
    const context = this.getConversationContext(userId);
    context.messages.push(message);
    context.lastActivity = new Date();
    
    // Keep only last 10 messages to manage memory
    if (context.messages.length > 10) {
      context.messages = context.messages.slice(-10);
    }
  }

  // Clear conversation for a user
  static clearConversation(userId: string): void {
    this.conversations.delete(userId);
  }

  // Main method to get AI response
  static async getResponse(userInput: string, userContext?: any, userId: string = 'default'): Promise<OpenAIResponse> {
    try {
      // Check if we have a valid API key
      if (!environment.OPENAI_API_KEY) {
        console.warn('OpenAI API key not configured, using fallback responses');
        return this.getFallbackResponse(userInput);
      }

      // Get AI response with conversation memory
      return await this.getOpenAIResponseWithMemory(userInput, userContext, userId);
    } catch (error) {
      console.error('OpenAI service error:', error);
      return this.getFallbackResponse(userInput);
    }
  }

  // Get streaming response
  static async getStreamingResponse(
    userInput: string, 
    onChunk: (chunk: StreamingResponse) => void,
    userContext?: any, 
    userId: string = 'default'
  ): Promise<OpenAIResponse> {
    try {
      if (!environment.OPENAI_API_KEY) {
        console.warn('OpenAI API key not configured, using fallback responses');
        const fallback = this.getFallbackResponse(userInput);
        onChunk({ text: fallback.text, isComplete: true, type: 'complete' });
        return fallback;
      }

      return await this.getOpenAIStreamingResponse(userInput, onChunk, userContext, userId);
    } catch (error) {
      console.error('OpenAI streaming service error:', error);
      const fallback = this.getFallbackResponse(userInput);
      onChunk({ text: fallback.text, isComplete: true, type: 'complete' });
      return fallback;
    }
  }

  // Get AI response with conversation memory
  private static async getOpenAIResponseWithMemory(userInput: string, userContext?: any, userId: string = 'default'): Promise<OpenAIResponse> {
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
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 300,
      temperature: 0.7,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${environment.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || "I'm sorry, I couldn't process your request. Please try again.";

    // Add AI response to conversation
    this.addToConversation(userId, {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });

    // Analyze response for booking recommendation and urgency
    const shouldBookAppointment = this.shouldRecommendBooking(userInput, aiResponse);
    const urgency = this.determineUrgency(userInput);

    return {
      text: aiResponse,
      shouldBookAppointment,
      urgency,
      confidence: 0.9,
      suggestions: this.generateSuggestions(userInput, aiResponse)
    };
  }

  // Get streaming response with conversation memory
  private static async getOpenAIStreamingResponse(
    userInput: string, 
    onChunk: (chunk: StreamingResponse) => void,
    userContext?: any, 
    userId: string = 'default'
  ): Promise<OpenAIResponse> {
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
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 300,
      temperature: 0.7,
      stream: true, // Enable streaming
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${environment.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    let fullResponse = '';
    const decoder = new TextDecoder();

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
              onChunk({ text: '', isComplete: true, type: 'complete' });
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                onChunk({ text: content, isComplete: false, type: 'chunk' });
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

    // Add AI response to conversation
    this.addToConversation(userId, {
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date()
    });

    // Analyze response for booking recommendation and urgency
    const shouldBookAppointment = this.shouldRecommendBooking(userInput, fullResponse);
    const urgency = this.determineUrgency(userInput);

    return {
      text: fullResponse,
      shouldBookAppointment,
      urgency,
      confidence: 0.9,
      suggestions: this.generateSuggestions(userInput, fullResponse)
    };
  }

  // Fallback response when API is not available
  private static getFallbackResponse(userInput: string): OpenAIResponse {
    const input = userInput.toLowerCase();
    
    // Check for greetings
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return {
        text: RESPONSES.greeting[Math.floor(Math.random() * RESPONSES.greeting.length)],
        shouldBookAppointment: false,
        urgency: 'low',
        confidence: 0.8
      };
    }
    
    // Check for appointment-related queries
    if (input.includes('appointment') || input.includes('book') || input.includes('schedule')) {
      return {
        text: RESPONSES.appointment[Math.floor(Math.random() * RESPONSES.appointment.length)],
        shouldBookAppointment: true,
        urgency: 'low',
        confidence: 0.8
      };
    }
    
    // Check for emergency symptoms
    if (this.determineUrgency(userInput) === 'high') {
      return {
        text: RESPONSES.emergency[Math.floor(Math.random() * RESPONSES.emergency.length)],
        shouldBookAppointment: true,
        urgency: 'high',
        confidence: 0.9
      };
    }
    
    // Default response
    return {
      text: RESPONSES.general[Math.floor(Math.random() * RESPONSES.general.length)],
      shouldBookAppointment: true,
      urgency: 'medium',
      confidence: 0.7
    };
  }

  // Determine if we should recommend booking an appointment
  private static shouldRecommendBooking(userInput: string, aiResponse: string): boolean {
    const input = userInput.toLowerCase();
    const response = aiResponse.toLowerCase();
    
    // Keywords that suggest booking is needed
    const bookingKeywords = [
      'appointment', 'book', 'schedule', 'doctor', 'medical', 'symptom', 'pain', 'concern',
      'check', 'examine', 'diagnose', 'treatment', 'medication', 'prescription'
    ];
    
    // Check if input or response contains booking keywords
    return bookingKeywords.some(keyword => 
      input.includes(keyword) || response.includes(keyword)
    );
  }

  // Determine urgency level based on input
  private static determineUrgency(userInput: string): 'low' | 'medium' | 'high' {
    const input = userInput.toLowerCase();
    
    // High urgency keywords
    const highUrgencyKeywords = [
      'chest pain', 'severe', 'bleeding', 'unconscious', 'difficulty breathing',
      'emergency', 'urgent', 'critical', 'life threatening', 'heart attack',
      'stroke', 'severe pain', 'can\'t breathe', 'choking'
    ];
    
    // Medium urgency keywords
    const mediumUrgencyKeywords = [
      'headache', 'fever', 'cough', 'fatigue', 'pain', 'nausea', 'dizzy',
      'weakness', 'sore', 'ache', 'uncomfortable', 'worried'
    ];
    
    if (highUrgencyKeywords.some(keyword => input.includes(keyword))) {
      return 'high';
    }
    
    if (mediumUrgencyKeywords.some(keyword => input.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  // Generate helpful suggestions based on input and response
  private static generateSuggestions(userInput: string, aiResponse: string): string[] {
    const suggestions: string[] = [];
    const input = userInput.toLowerCase();
    
    if (input.includes('pain') || input.includes('symptom')) {
      suggestions.push('Book an appointment with a doctor');
      suggestions.push('Keep track of your symptoms');
    }
    
    if (input.includes('diet') || input.includes('nutrition')) {
      suggestions.push('Consult with a nutritionist');
      suggestions.push('Keep a food diary');
    }
    
    if (input.includes('exercise') || input.includes('fitness')) {
      suggestions.push('Get a fitness assessment');
      suggestions.push('Start with light activities');
    }
    
    if (input.includes('mental') || input.includes('stress') || input.includes('anxiety')) {
      suggestions.push('Consider mental health support');
      suggestions.push('Practice relaxation techniques');
    }
    
    return suggestions;
  }
}
