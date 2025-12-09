/**
 * Unified WebSocket Service for DocAvailable
 * Handles both audio and chat signaling with proper error handling and reconnection
 */

export interface WebSocketConfig {
  url: string;
  appointmentId: string;
  userId: string;
  authToken?: string;
  connectionType: 'audio' | 'chat';
  onOpen?: () => void;
  onMessage?: (message: any) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
}

export interface WebSocketMessage {
  type: string;
  appointmentId: string;
  userId: string;
  timestamp: string;
  [key: string]: any;
}

export class UnifiedWebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      console.log('🔌 [UnifiedWebSocket] Already connecting or connected');
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.buildWebSocketUrl();
        console.log('🔌 [UnifiedWebSocket] Connecting to:', wsUrl);

        this.ws = new WebSocket(wsUrl);

        // Connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            console.error('❌ [UnifiedWebSocket] Connection timeout');
            this.ws?.close();
            this.isConnecting = false;
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 seconds

        this.ws.onopen = () => {
          console.log('✅ [UnifiedWebSocket] Connected successfully');
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.config.onOpen?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 [UnifiedWebSocket] Message received:', message.type);
            this.config.onMessage?.(message);
          } catch (error) {
            console.error('❌ [UnifiedWebSocket] Error parsing message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 [UnifiedWebSocket] Connection closed:', event.code, event.reason);
          this.isConnecting = false;
          this.isConnected = false;
          this.stopHeartbeat();
          this.config.onClose?.(event);

          // Attempt reconnection if not a normal closure
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ [UnifiedWebSocket] Connection error:', error);
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          this.config.onError?.(error);
          reject(error);
        };

      } catch (error) {
        console.error('❌ [UnifiedWebSocket] Failed to create connection:', error);
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Send message through WebSocket
   */
  send(message: Partial<WebSocketMessage>): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ [UnifiedWebSocket] Cannot send message - WebSocket not connected');
      return false;
    }

    try {
      const fullMessage: WebSocketMessage = {
        ...message,
        appointmentId: this.config.appointmentId,
        userId: this.config.userId,
        timestamp: new Date().toISOString()
      } as WebSocketMessage;

      this.ws.send(JSON.stringify(fullMessage));
      console.log('📤 [UnifiedWebSocket] Message sent:', fullMessage.type);
      return true;
    } catch (error) {
      console.error('❌ [UnifiedWebSocket] Error sending message:', error);
      return false;
    }
  }

  /**
   * Close WebSocket connection
   */
  close(code?: number, reason?: string): void {
    if (this.ws) {
      console.log('🔌 [UnifiedWebSocket] Closing connection');
      this.stopHeartbeat();
      this.clearReconnectTimeout();
      this.ws.close(code || 1000, reason || 'Client closing');
      this.ws = null;
      this.isConnected = false;
      this.isConnecting = false;
    }
  }

  /**
   * Get connection state
   */
  get readyState(): number {
    return this.ws?.readyState || WebSocket.CLOSED;
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Build WebSocket URL with query parameters
   */
  private buildWebSocketUrl(): string {
    const url = new URL(this.config.url);
    url.searchParams.set('appointmentId', this.config.appointmentId);
    url.searchParams.set('userId', this.config.userId);
    
    if (this.config.authToken) {
      url.searchParams.set('authToken', this.config.authToken);
    }

    return url.toString();
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    console.log(`🔄 [UnifiedWebSocket] Scheduling reconnection attempt ${this.reconnectAttempts + 1} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('❌ [UnifiedWebSocket] Reconnection failed:', error);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          console.error('❌ [UnifiedWebSocket] Max reconnection attempts reached');
        }
      });
    }, delay);
  }

  /**
   * Clear reconnection timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.ping();
          console.log('🏓 [UnifiedWebSocket] Heartbeat sent');
        } catch (error) {
          console.error('❌ [UnifiedWebSocket] Error sending heartbeat:', error);
        }
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Reset reconnection attempts (useful for manual reconnection)
   */
  resetReconnectionAttempts(): void {
    this.reconnectAttempts = 0;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Factory function for easy usage
export function createUnifiedWebSocket(config: WebSocketConfig): UnifiedWebSocketService {
  return new UnifiedWebSocketService(config);
}

export default UnifiedWebSocketService;
