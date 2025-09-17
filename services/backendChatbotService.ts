// Backend Chatbot Service
// Calls the backend API for AI responses instead of using local OpenAI

import { environment } from '../config/environment';

export interface BackendChatbotResponse {
  text: string;
  shouldBookAppointment: boolean;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
  suggestions?: string[];
}

export interface BackendStreamingResponse {
  text: string;
  isComplete: boolean;
  type: 'chunk' | 'complete';
}

export class BackendChatbotService {
  private static baseUrl = environment.LARAVEL_API_URL;

  /**
   * Get AI response from backend
   */
  static async getResponse(
    userInput: string, 
    userContext?: any, 
    userId: string = 'default'
  ): Promise<BackendChatbotResponse> {
    try {
      console.log('🤖 Calling backend chatbot API...');
      
      const response = await fetch(`${this.baseUrl}/api/chatbot/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          user_id: userId,
          context: userContext || {}
        })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Backend API returned error');
      }

      console.log('✅ Backend chatbot response received:', data.data);
      return data.data;

    } catch (error) {
      console.error('❌ Backend chatbot error:', error);
      
      // Return fallback response
      return this.getFallbackResponse(userInput);
    }
  }

  /**
   * Get streaming AI response from backend
   */
  static async getStreamingResponse(
    userInput: string, 
    onChunk: (chunk: BackendStreamingResponse) => void,
    userContext?: any, 
    userId: string = 'default'
  ): Promise<BackendChatbotResponse> {
    try {
      console.log('🤖 Calling backend chatbot streaming API...');
      
      const response = await fetch(`${this.baseUrl}/api/chatbot/streaming`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          user_id: userId,
          context: userContext || {}
        })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Backend API returned error');
      }

      // Simulate streaming by breaking the response into chunks
      const fullResponse = data.data;
      const words = fullResponse.text.split(' ');
      let currentText = '';
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        
        onChunk({
          text: words[i] + (i < words.length - 1 ? ' ' : ''),
          isComplete: i === words.length - 1,
          type: i === words.length - 1 ? 'complete' : 'chunk'
        });
        
        // Small delay to simulate streaming
        if (i < words.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log('✅ Backend chatbot streaming complete:', fullResponse);
      return fullResponse;

    } catch (error) {
      console.error('❌ Backend chatbot streaming error:', error);
      
      // Return fallback response
      const fallback = this.getFallbackResponse(userInput);
      onChunk({
        text: fallback.text,
        isComplete: true,
        type: 'complete'
      });
      
      return fallback;
    }
  }

  /**
   * Get fallback response when backend is not available
   */
  private static getFallbackResponse(userInput: string): BackendChatbotResponse {
    const input = userInput.toLowerCase();

    // Basic keyword-based responses
    if (input.includes('hello') || input.includes('hi')) {
      return {
        text: 'Hello! I\'m DocBot, your health assistant. How can I help you today? For personalized medical advice, I recommend booking an appointment with one of our doctors.',
        shouldBookAppointment: true,
        urgency: 'low',
        confidence: 0.7,
        suggestions: ['Book an appointment', 'Ask about symptoms', 'Get health tips']
      };
    }

    if (input.includes('pain') || input.includes('hurt')) {
      return {
        text: 'I understand you\'re experiencing pain. While I can provide general information, it\'s important to consult with a healthcare professional for proper evaluation. Would you like to book an appointment with one of our doctors?',
        shouldBookAppointment: true,
        urgency: 'medium',
        confidence: 0.8,
        suggestions: ['Book an appointment', 'Describe your symptoms', 'Emergency care']
      };
    }

    if (input.includes('emergency') || input.includes('urgent')) {
      return {
        text: 'If this is a medical emergency, please call 911 or go to the nearest emergency room immediately. For non-emergency concerns, you can book an appointment with our doctors.',
        shouldBookAppointment: false,
        urgency: 'high',
        confidence: 0.9,
        suggestions: ['Call 911', 'Book urgent appointment', 'Find emergency room']
      };
    }

    // Default response
    return {
      text: 'Thank you for your message. I\'m here to help with general health questions. For personalized medical advice, I recommend booking an appointment with one of our qualified doctors.',
      shouldBookAppointment: true,
      urgency: 'low',
      confidence: 0.6,
      suggestions: ['Book an appointment', 'Ask a question', 'Get health information']
    };
  }
}

