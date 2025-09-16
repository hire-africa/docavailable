import { WebRTCSignalingConfig, WebRTCSignalingMessage } from '../types/webrtc';

export class WebRTCApiService {
  private config: WebRTCSignalingConfig;
  private currentUserId: number = 0;

  constructor(config: WebRTCSignalingConfig) {
    this.config = config;
  }

  setCurrentUserId(userId: number): void {
    this.currentUserId = userId;
  }

  private getCurrentUserId(): number {
    return this.currentUserId || 0;
  }

  async sendSignalingMessage(message: WebRTCSignalingMessage): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/webrtc/signaling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          ...message,
          userId: this.getCurrentUserId(),
          appointmentId: this.config.appointmentId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('✅ Signaling message sent successfully');
    } catch (error) {
      console.error('❌ Error sending signaling message:', error);
      throw error;
    }
  }

  async getSignalingMessages(appointmentId: string): Promise<WebRTCSignalingMessage[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/webrtc/signaling/${appointmentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('❌ Error fetching signaling messages:', error);
      throw error;
    }
  }

  async clearSignalingMessages(appointmentId: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/webrtc/signaling/${appointmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('✅ Signaling messages cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing signaling messages:', error);
      throw error;
    }
  }
}
