// Chatbot Service for handling health-related questions
// Uses OpenAI API for intelligent responses with fallback to keyword-based system

import OpenAI from 'openai';
import { OPENAI_CONFIG } from '../config/openai';

export interface ChatbotResponse {
  text: string;
  shouldBookAppointment: boolean;
  urgency: 'low' | 'medium' | 'high';
}

const SYSTEM_PROMPT = `You are a helpful healthcare assistant for a medical app called DocAvailable. Your role is to:

1. Answer basic health questions and provide general information
2. Help users understand common symptoms and conditions
3. Guide users to book appointments with real doctors for personal health issues
4. Provide health tips and wellness advice
5. NEVER give specific medical diagnoses or treatment recommendations
6. Always encourage users to consult with healthcare professionals for personal health concerns
7. Be friendly, caring, and professional
8. Keep responses concise (under 200 words)
9. If users mention symptoms, always recommend booking an appointment with a doctor
10. Mention that they can book appointments through the "Discover" tab in the app

Important: You are NOT a doctor and cannot provide medical advice. Always recommend professional medical consultation for health concerns.`;

const HEALTH_KEYWORDS = {
  // Symptoms that should prompt booking an appointment
  urgent: ['chest pain', 'shortness of breath', 'severe pain', 'bleeding', 'fever above 103', 'unconscious', 'seizure'],
  
  // Common symptoms that might need attention
  moderate: ['headache', 'fever', 'cough', 'fatigue', 'nausea', 'dizziness', 'back pain', 'joint pain'],
  
  // General health topics
  general: ['nutrition', 'exercise', 'sleep', 'stress', 'prevention', 'vaccination', 'hygiene']
};

const RESPONSES = {
  welcome: [
    "Hello! I'm your health assistant. I can help with general health questions and guide you to book appointments with our doctors for personal concerns.",
    "Hi there! I'm here to help with health information and connect you with our qualified doctors when you need personalized care."
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

// Initialize OpenAI client
let openai: OpenAI | null = null;

try {
  // Check if API key is configured
  if (OPENAI_CONFIG.apiKey && OPENAI_CONFIG.apiKey !== 'your-api-key-here') {
    openai = new OpenAI({
      apiKey: OPENAI_CONFIG.apiKey,
    });
    console.log('OpenAI initialized successfully');
  } else {
    console.log('OpenAI API key not configured, using fallback system');
  }
} catch (error) {
  console.log('OpenAI initialization failed, using fallback system:', error);
}

export class ChatbotService {
  static async getResponse(userInput: string): Promise<ChatbotResponse> {
    // Try OpenAI first if available
    if (openai) {
      try {
        const response = await this.getOpenAIResponse(userInput);
        return response;
      } catch (error) {
        console.error('OpenAI API error:', error);
        // Fallback to basic responses
        return this.getBasicResponse(userInput);
      }
    }
    
    // Use basic keyword-based system if OpenAI is not available
    return this.getBasicResponse(userInput);
  }

  private static async getOpenAIResponse(userInput: string): Promise<ChatbotResponse> {
    if (!openai) {
      throw new Error('OpenAI not initialized');
    }

    const completion = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: userInput
        }
      ],
      max_tokens: OPENAI_CONFIG.maxTokens,
      temperature: OPENAI_CONFIG.temperature,
    });

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request.";
    
    // Determine if appointment booking is recommended
    const shouldBookAppointment = this.shouldRecommendAppointment(userInput, response);
    const urgency = this.determineUrgency(userInput);

    return {
      text: response,
      shouldBookAppointment,
      urgency
    };
  }

  private static shouldRecommendAppointment(userInput: string, response: string): boolean {
    const urgentKeywords = ['pain', 'symptom', 'fever', 'cough', 'headache', 'nausea', 'dizzy', 'fatigue'];
    return urgentKeywords.some(keyword => userInput.toLowerCase().includes(keyword));
  }

  private static determineUrgency(userInput: string): 'low' | 'medium' | 'high' {
    const urgentKeywords = ['chest pain', 'shortness of breath', 'severe', 'bleeding', 'unconscious', 'seizure'];
    const moderateKeywords = ['headache', 'fever', 'cough', 'fatigue', 'nausea', 'dizziness', 'back pain'];
    
    if (urgentKeywords.some(keyword => userInput.toLowerCase().includes(keyword))) {
      return 'high';
    }
    if (moderateKeywords.some(keyword => userInput.toLowerCase().includes(keyword))) {
      return 'medium';
    }
    return 'low';
  }

  private static getBasicResponse(userInput: string): ChatbotResponse {
    const input = userInput.toLowerCase().trim();
    
    // Check for urgent symptoms
    if (HEALTH_KEYWORDS.urgent.some(keyword => input.includes(keyword))) {
      return {
        text: RESPONSES.urgent_symptoms[Math.floor(Math.random() * RESPONSES.urgent_symptoms.length)],
        shouldBookAppointment: true,
        urgency: 'high'
      };
    }
    
    // Check for appointment-related queries
    if (input.includes('appointment') || input.includes('book') || input.includes('doctor') || input.includes('consultation')) {
      return {
        text: RESPONSES.appointment_guide[Math.floor(Math.random() * RESPONSES.appointment_guide.length)],
        shouldBookAppointment: true,
        urgency: 'medium'
      };
    }
    
    // Check for moderate symptoms
    if (HEALTH_KEYWORDS.moderate.some(keyword => input.includes(keyword))) {
      return {
        text: "I understand you're experiencing symptoms. While I can provide general information, for proper evaluation and treatment, I'd recommend booking an appointment with one of our doctors. They can provide a thorough assessment and personalized care plan.",
        shouldBookAppointment: true,
        urgency: 'medium'
      };
    }
    
    // Check for general health topics
    if (HEALTH_KEYWORDS.general.some(keyword => input.includes(keyword))) {
      return {
        text: RESPONSES.general_health[Math.floor(Math.random() * RESPONSES.general_health.length)],
        shouldBookAppointment: false,
        urgency: 'low'
      };
    }
    
    // Greeting responses
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return {
        text: RESPONSES.welcome[Math.floor(Math.random() * RESPONSES.welcome.length)],
        shouldBookAppointment: false,
        urgency: 'low'
      };
    }
    
    // Thank you responses
    if (input.includes('thank') || input.includes('thanks')) {
      return {
        text: "You're welcome! I'm here to help. If you have more questions or need to book an appointment, feel free to ask. Remember, our doctors are always available for personalized care.",
        shouldBookAppointment: true,
        urgency: 'low'
      };
    }
    
    // Default response
    return {
      text: "Thank you for your question. While I can provide general health information, for personal health concerns, I'd recommend booking an appointment with one of our qualified doctors. They can provide personalized care and proper medical evaluation. Would you like help finding a doctor?",
      shouldBookAppointment: true,
      urgency: 'low'
    };
  }
} 