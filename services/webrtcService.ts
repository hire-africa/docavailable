export interface WebRTCServiceEvents {
  onConnectionChange: (connected: boolean) => void;
  onError: (error: string) => void;
}

// Custom EventEmitter implementation for React Native
class CustomEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: Function): void {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(listener);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(...args));
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

export class WebRTCService extends CustomEventEmitter {
  private isConnected: boolean = false;
  private connectionCallbacks: ((connected: boolean) => void)[] = [];

  constructor() {
    super();
  }

  /**
   * Initialize WebRTC service
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔌 WebRTC Service: Initializing...');
      
      // Mark as connected since actual WebRTC signaling is handled by AudioCallService
      this.isConnected = true;
      
      // Notify connection change
      this.connectionCallbacks.forEach(callback => callback(true));
      
      console.log('✅ WebRTC Service: Initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ WebRTC Service: Initialization failed:', error);
      this.connectionCallbacks.forEach(callback => callback(false));
      return false;
    }
  }

  /**
   * Check if connected
   */
  isConnectedToSignaling(): boolean {
    return this.isConnected;
  }

  /**
   * Add connection change callback
   */
  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionCallbacks.push(callback);
  }

  /**
   * Remove connection change callback
   */
  removeConnectionChangeCallback(callback: (connected: boolean) => void): void {
    const index = this.connectionCallbacks.indexOf(callback);
    if (index > -1) {
      this.connectionCallbacks.splice(index, 1);
    }
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    this.isConnected = false;
    this.connectionCallbacks.forEach(callback => callback(false));
  }
}

export const webrtcService = new WebRTCService();
