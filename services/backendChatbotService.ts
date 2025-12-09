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
          context: userContext || {},
          max_tokens: 150,
          response_style: 'concise'
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
          context: userContext || {},
          max_tokens: 150,
          response_style: 'concise'
        })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Backend API returned error');
      }

      // Keep markdown intact for proper rendering
      const fullResponse = data.data;
      
      // Simulate streaming by breaking the response into chunks
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
        text: 'Hi! I\'m AI Doc. How can I help? For medical advice, book an appointment.',
        shouldBookAppointment: true,
        urgency: 'low',
        confidence: 0.7,
        suggestions: ['Book appointment', 'Ask symptoms', 'Health tips']
      };
    }

    if (input.includes('pain') || input.includes('hurt')) {
      return {
        text: 'I understand you\'re in pain. For proper evaluation, consult a healthcare professional. Book an appointment?',
        shouldBookAppointment: true,
        urgency: 'medium',
        confidence: 0.8,
        suggestions: ['Book appointment', 'Describe symptoms', 'Emergency care']
      };
    }

    if (input.includes('emergency') || input.includes('urgent')) {
      return {
        text: 'Medical emergency? Call 911 or go to ER immediately. For non-emergency, book an appointment.',
        shouldBookAppointment: false,
        urgency: 'high',
        confidence: 0.9,
        suggestions: ['Call 911', 'Book urgent appointment', 'Find ER']
      };
    }

    // Default response
    return {
      text: 'Thanks! I can help with general health questions. For medical advice, book an appointment.',
      shouldBookAppointment: true,
      urgency: 'low',
      confidence: 0.6,
      suggestions: ['Book appointment', 'Ask question', 'Health info']
    };
  }
}

