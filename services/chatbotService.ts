// Chatbot Service for handling health-related questions
// Uses OpenAI API for intelligent responses with fallback to keyword-based system

import { OpenAIResponse, OpenAIService } from './openaiService';

// Re-export the interface for backward compatibility
export interface ChatbotResponse extends OpenAIResponse {}



export class ChatbotService {
  static async getResponse(userInput: string): Promise<ChatbotResponse> {
    // Delegate to OpenAI service
    return OpenAIService.getResponse(userInput);
  }


} 