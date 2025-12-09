import Constants from 'expo-constants';

interface GlobalWebRTCService {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  onIncomingCall: (callback: (data: any) => void) => void;
}

class GlobalWebRTCServiceClass implements GlobalWebRTCService {
  private signalingChannel: WebSocket | null = null;
  private isConnected: boolean = false;
  private incomingCallCallback: ((data: any) => void) | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000; // 5 seconds

  constructor() {
    console.log('🌐 [GlobalWebRTCService] Initialized');
  }

  async connect(): Promise<void> {
    try {
      console.log('🌐 [GlobalWebRTCService] Connecting to global WebRTC signaling...');
      
      // Get WebRTC signaling URL
      const signalingUrl = 
        process.env.EXPO_PUBLIC_WEBRTC_SIGNALING_URL || 
        Constants.expoConfig?.extra?.EXPO_PUBLIC_WEBRTC_SIGNALING_URL ||
        environment.WEBRTC_SIGNALING_URL;
      
      // Connect with a global session ID
      const globalSessionId = 'global_signaling_session';
      const wsUrl = `${signalingUrl}?appointmentId=${encodeURIComponent(globalSessionId)}&userId=global`;
      
      console.log('🌐 [GlobalWebRTCService] WebSocket URL:', wsUrl);
      
      this.signalingChannel = new WebSocket(wsUrl);
      
      this.signalingChannel.onopen = () => {
        console.log('🌐 [GlobalWebRTCService] Connected to global signaling server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };
      
      this.signalingChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('🌐 [GlobalWebRTCService] Message received:', message.type);
          
          // Handle incoming call notifications
          if (message.type === 'incoming_call_notification') {
            console.log('📞 [GlobalWebRTCService] Incoming call notification received:', message);
            this.handleIncomingCallNotification(message);
          }
        } catch (error) {
          console.error('❌ [GlobalWebRTCService] Error parsing message:', error);
        }
      };
      
      this.signalingChannel.onclose = () => {
        console.log('🌐 [GlobalWebRTCService] Connection closed');
        this.isConnected = false;
        this.scheduleReconnect();
      };
      
      this.signalingChannel.onerror = (error) => {
        console.error('❌ [GlobalWebRTCService] WebSocket error:', error);
        this.isConnected = false;
        
        // Handle SSL/TLS connection errors with retry logic
        if (error.message && (
          error.message.includes('Connection reset by peer') ||
          error.message.includes('ssl') ||
          error.message.includes('TLS') ||
          error.message.includes('SSL')
        )) {
          console.warn('🔄 [GlobalWebRTCService] SSL/TLS connection error detected, will retry...');
          setTimeout(() => {
            this.scheduleReconnect();
          }, 2000);
          return;
        }
        
        // Don't immediately reconnect on control frame errors
        if (error.message && error.message.includes('Control frames must be final')) {
          console.log('🔄 [GlobalWebRTCService] Control frame error detected, will retry connection');
          // Wait a bit longer before reconnecting for control frame errors
          setTimeout(() => {
            this.scheduleReconnect();
          }, 10000); // 10 seconds delay
        } else {
          this.scheduleReconnect();
        }
      };
      
    } catch (error) {
      console.error('❌ [GlobalWebRTCService] Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('⚠️ [GlobalWebRTCService] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    // Use exponential backoff with jitter to avoid thundering herd
    const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = Math.min(baseDelay + jitter, 60000); // Cap at 60 seconds
    
    console.log(`🔄 [GlobalWebRTCService] Scheduling reconnect in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleIncomingCallNotification(message: any): void {
    try {
      console.log('📞 [GlobalWebRTCService] Processing incoming call notification:', message);
      
      // Extract call data
      const callData = {
        type: 'incoming_call',
        appointment_id: message.appointmentId,
        appointmentId: message.appointmentId,
        call_type: message.callType || 'audio',
        callType: message.callType || 'audio',
        doctor_name: message.doctorName || message.doctor_name,
        doctorName: message.doctorName || message.doctor_name,
        doctor_profile_picture: message.doctorProfilePicture || message.doctor_profile_picture,
        doctorProfilePicture: message.doctorProfilePicture || message.doctor_profile_picture,
        caller_id: message.callerId || message.caller_id,
        doctor_id: message.doctorId || message.doctor_id,
        isIncomingCall: 'true'
      };
      
      console.log('📞 [GlobalWebRTCService] Call data prepared:', callData);
      
      // Notify the callback
      if (this.incomingCallCallback) {
        this.incomingCallCallback(callData);
      }
      
    } catch (error) {
      console.error('❌ [GlobalWebRTCService] Error handling incoming call notification:', error);
    }
  }

  onIncomingCall(callback: (data: any) => void): void {
    this.incomingCallCallback = callback;
  }

  disconnect(): void {
    console.log('🌐 [GlobalWebRTCService] Disconnecting...');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.signalingChannel) {
      this.signalingChannel.close();
      this.signalingChannel = null;
    }
    
    this.isConnected = false;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const globalWebRTCService = new GlobalWebRTCServiceClass();
export default globalWebRTCService;
