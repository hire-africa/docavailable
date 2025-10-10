/**
 * WebRTC Client Service - Unified approach for all WebSocket connections
 * Replaces multiple conflicting WebSocket services with a single, clean implementation
 */

import { environment } from '../config/environment';
import { UnifiedWebSocketService, WebSocketConfig, WebSocketMessage } from './unifiedWebSocketService';

export interface WebRTCClientConfig {
  appointmentId: string;
  userId: string;
  authToken?: string;
  connectionType: 'audio' | 'chat';
}

export interface WebRTCEvents {
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onOffer?: (offer: any) => void;
  onAnswer?: (answer: any) => void;
  onIceCandidate?: (candidate: any) => void;
  onChatMessage?: (message: any) => void;
  onTypingIndicator?: (isTyping: boolean, senderId: string) => void;
  onSessionStatus?: (status: any) => void;
  onSessionEnded?: (reason: string) => void;
}

export class WebRTCClientService {
  private audioService: UnifiedWebSocketService | null = null;
  private chatService: UnifiedWebSocketService | null = null;
  private events: WebRTCEvents;
  private config: WebRTCClientConfig;

  constructor(config: WebRTCClientConfig, events: WebRTCEvents = {}) {
    this.config = config;
    this.events = events;
  }

  /**
   * Connect to both audio and chat signaling servers
   */
  async connect(): Promise<void> {
    try {
      console.log('🔌 [WebRTCClient] Connecting to signaling servers...');

      // Connect to audio signaling
      await this.connectAudio();

      // Connect to chat signaling
      await this.connectChat();

      console.log('✅ [WebRTCClient] Connected to all signaling servers');
    } catch (error) {
      console.error('❌ [WebRTCClient] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Connect to audio signaling server
   */
  private async connectAudio(): Promise<void> {
    const audioConfig: WebSocketConfig = {
      url: environment.WEBRTC_SIGNALING_URL,
      appointmentId: this.config.appointmentId,
      userId: this.config.userId,
      authToken: this.config.authToken,
      connectionType: 'audio',
      onOpen: () => {
        console.log('✅ [WebRTCClient] Audio signaling connected');
        this.events.onOpen?.();
      },
      onMessage: (message) => {
        this.handleAudioMessage(message);
      },
      onClose: (event) => {
        console.log('🔌 [WebRTCClient] Audio signaling closed:', event.code);
        this.events.onClose?.(event);
      },
      onError: (error) => {
        console.error('❌ [WebRTCClient] Audio signaling error:', error);
        this.events.onError?.(error);
      }
    };

    this.audioService = new UnifiedWebSocketService(audioConfig);
    await this.audioService.connect();
  }

  /**
   * Connect to chat signaling server
   */
  private async connectChat(): Promise<void> {
    const chatConfig: WebSocketConfig = {
      url: environment.WEBRTC_CHAT_SIGNALING_URL,
      appointmentId: this.config.appointmentId,
      userId: this.config.userId,
      authToken: this.config.authToken,
      connectionType: 'chat',
      onOpen: () => {
        console.log('✅ [WebRTCClient] Chat signaling connected');
      },
      onMessage: (message) => {
        this.handleChatMessage(message);
      },
      onClose: (event) => {
        console.log('🔌 [WebRTCClient] Chat signaling closed:', event.code);
      },
      onError: (error) => {
        console.error('❌ [WebRTCClient] Chat signaling error:', error);
      }
    };

    this.chatService = new UnifiedWebSocketService(chatConfig);
    await this.chatService.connect();
  }

  /**
   * Handle audio signaling messages
   */
  private handleAudioMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'offer':
        console.log('📞 [WebRTCClient] Received offer');
        this.events.onOffer?.(message.offer);
        break;
      case 'answer':
        console.log('📞 [WebRTCClient] Received answer');
        this.events.onAnswer?.(message.answer);
        break;
      case 'ice-candidate':
        console.log('🧊 [WebRTCClient] Received ICE candidate');
        this.events.onIceCandidate?.(message.candidate);
        break;
      case 'call-ended':
        console.log('📞 [WebRTCClient] Call ended');
        this.events.onMessage?.(message);
        break;
      case 'call-answered':
        console.log('📞 [WebRTCClient] Call answered');
        this.events.onMessage?.(message);
        break;
      case 'call-rejected':
        console.log('📞 [WebRTCClient] Call rejected');
        this.events.onMessage?.(message);
        break;
      default:
        this.events.onMessage?.(message);
    }
  }

  /**
   * Handle chat signaling messages
   */
  private handleChatMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'chat-message':
        console.log('💬 [WebRTCClient] Received chat message');
        this.events.onChatMessage?.(message.message);
        break;
      case 'typing-indicator':
        console.log('⌨️ [WebRTCClient] Received typing indicator');
        this.events.onTypingIndicator?.(message.isTyping, message.senderId);
        break;
      case 'session-status-response':
        console.log('📊 [WebRTCClient] Received session status');
        this.events.onSessionStatus?.(message.sessionData);
        break;
      case 'session-ended':
        console.log('🔚 [WebRTCClient] Session ended');
        this.events.onSessionEnded?.(message.reason);
        break;
      default:
        this.events.onMessage?.(message);
    }
  }

  /**
   * Send WebRTC offer
   */
  sendOffer(offer: any): boolean {
    if (!this.audioService?.connected) {
      console.warn('⚠️ [WebRTCClient] Audio service not connected');
      return false;
    }

    return this.audioService.send({
      type: 'offer',
      offer: offer
    });
  }

  /**
   * Send WebRTC answer
   */
  sendAnswer(answer: any): boolean {
    if (!this.audioService?.connected) {
      console.warn('⚠️ [WebRTCClient] Audio service not connected');
      return false;
    }

    return this.audioService.send({
      type: 'answer',
      answer: answer
    });
  }

  /**
   * Send ICE candidate
   */
  sendIceCandidate(candidate: any): boolean {
    if (!this.audioService?.connected) {
      console.warn('⚠️ [WebRTCClient] Audio service not connected');
      return false;
    }

    return this.audioService.send({
      type: 'ice-candidate',
      candidate: candidate
    });
  }

  /**
   * Send chat message
   */
  sendChatMessage(message: any): boolean {
    if (!this.chatService?.connected) {
      console.warn('⚠️ [WebRTCClient] Chat service not connected');
      return false;
    }

    return this.chatService.send({
      type: 'chat-message',
      message: message
    });
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(isTyping: boolean): boolean {
    if (!this.chatService?.connected) {
      console.warn('⚠️ [WebRTCClient] Chat service not connected');
      return false;
    }

    return this.chatService.send({
      type: 'typing-indicator',
      isTyping: isTyping
    });
  }

  /**
   * Request session status
   */
  requestSessionStatus(): boolean {
    if (!this.chatService?.connected) {
      console.warn('⚠️ [WebRTCClient] Chat service not connected');
      return false;
    }

    return this.chatService.send({
      type: 'session-status-request'
    });
  }

  /**
   * End session
   */
  endSession(reason: string = 'General Checkup'): boolean {
    if (!this.chatService?.connected) {
      console.warn('⚠️ [WebRTCClient] Chat service not connected');
      return false;
    }

    return this.chatService.send({
      type: 'session-end-request',
      reason: reason
    });
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return (this.audioService?.connected || false) && (this.chatService?.connected || false);
  }

  /**
   * Check if audio is connected
   */
  get isAudioConnected(): boolean {
    return this.audioService?.connected || false;
  }

  /**
   * Check if chat is connected
   */
  get isChatConnected(): boolean {
    return this.chatService?.connected || false;
  }

  /**
   * Disconnect from all services
   */
  disconnect(): void {
    console.log('🔌 [WebRTCClient] Disconnecting from all services...');
    
    if (this.audioService) {
      this.audioService.close();
      this.audioService = null;
    }
    
    if (this.chatService) {
      this.chatService.close();
      this.chatService = null;
    }
    
    console.log('✅ [WebRTCClient] Disconnected from all services');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WebRTCClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update existing services if connected
    if (this.audioService) {
      this.audioService.updateConfig({
        appointmentId: this.config.appointmentId,
        userId: this.config.userId,
        authToken: this.config.authToken
      });
    }
    
    if (this.chatService) {
      this.chatService.updateConfig({
        appointmentId: this.config.appointmentId,
        userId: this.config.userId,
        authToken: this.config.authToken
      });
    }
  }
}

// Factory function for easy usage
export function createWebRTCClient(config: WebRTCClientConfig, events?: WebRTCEvents): WebRTCClientService {
  return new WebRTCClientService(config, events);
}

export default WebRTCClientService;
