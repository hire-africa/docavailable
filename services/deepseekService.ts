// DeepSeek Service for handling health-related questions
// Uses DeepSeek API for intelligent responses with fallback to keyword-based system

import { DEEPSEEK_CONFIG } from '../config/deepseek';

export interface DeepSeekResponse {
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
  symptoms: ['pain', 'fever', 'cough', 'headache', 'nausea', 'dizziness', 'fatigue', 'shortness of breath'],
  urgent: ['chest pain', 'severe', 'bleeding', 'unconscious', 'difficulty breathing'],
  general: ['diet', 'exercise', 'sleep', 'stress', 'hygiene']
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

export class DeepSeekService {
  static async getResponse(userInput: string): Promise<DeepSeekResponse> {
    try {
      const response = await this.getDeepSeekResponse(userInput);
      return response;
    } catch (error) {
      console.error('DeepSeek API error:', error);
      // Fallback to basic responses
      return this.getBasicResponse(userInput);
    }
  }

  private static async getDeepSeekResponse(userInput: string): Promise<DeepSeekResponse> {
    const requestBody = {
      model: DEEPSEEK_CONFIG.model,
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
    
    // Determine if appointment booking is recommended
    const shouldBookAppointment = this.shouldRecommendAppointment(userInput, aiResponse);
    const urgency = this.determineUrgency(userInput);

    return {
      text: aiResponse,
      shouldBookAppointment,
      urgency
    };
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

  private static getBasicResponse(userInput: string): DeepSeekResponse {
    const input = userInput.toLowerCase();
    
    // Check for urgent symptoms
    if (HEALTH_KEYWORDS.urgent.some(keyword => input.includes(keyword))) {
      const response = RESPONSES.urgent_symptoms[Math.floor(Math.random() * RESPONSES.urgent_symptoms.length)];
      return {
        text: response,
        shouldBookAppointment: true,
        urgency: 'high'
      };
    }
    
    // Check for general symptoms
    if (HEALTH_KEYWORDS.symptoms.some(keyword => input.includes(keyword))) {
      const response = RESPONSES.urgent_symptoms[Math.floor(Math.random() * RESPONSES.urgent_symptoms.length)];
      return {
        text: response,
        shouldBookAppointment: true,
        urgency: 'medium'
      };
    }
    
    // Check for appointment-related queries
    if (input.includes('appointment') || input.includes('book') || input.includes('doctor')) {
      const response = RESPONSES.appointment_guide[Math.floor(Math.random() * RESPONSES.appointment_guide.length)];
      return {
        text: response,
        shouldBookAppointment: true,
        urgency: 'low'
      };
    }
    
    // Check for general health questions
    if (HEALTH_KEYWORDS.general.some(keyword => input.includes(keyword))) {
      const response = RESPONSES.general_health[Math.floor(Math.random() * RESPONSES.general_health.length)];
      return {
        text: response,
        shouldBookAppointment: false,
        urgency: 'low'
      };
    }
    
    // Default welcome response
    const response = RESPONSES.welcome[Math.floor(Math.random() * RESPONSES.welcome.length)];
    return {
      text: response,
      shouldBookAppointment: false,
      urgency: 'low'
    };
  }
}
