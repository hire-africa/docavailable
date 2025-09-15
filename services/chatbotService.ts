// Chatbot Service for handling health-related questions
// Uses DeepSeek API for intelligent responses with fallback to keyword-based system

import { DeepSeekResponse, DeepSeekService } from './deepseekService';

// Re-export the interface for backward compatibility
export interface ChatbotResponse extends DeepSeekResponse {}



export class ChatbotService {
  static async getResponse(userInput: string): Promise<ChatbotResponse> {
    // Delegate to DeepSeek service
    return DeepSeekService.getResponse(userInput);
  }


} 