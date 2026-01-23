// Secure WebSocket Service for handling self-signed certificates
// This service provides a way to connect to WebSocket servers with self-signed certificates


export interface SecureWebSocketOptions {
  url: string;
  protocols?: string | string[];
  onOpen?: () => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  ignoreSSLErrors?: boolean;
  // WebSocket options to disable compression
  perMessageDeflate?: boolean;
  compression?: boolean;
}

export class SecureWebSocketService {
  private ws: WebSocket | null = null;
  private options: SecureWebSocketOptions;

  constructor(options: SecureWebSocketOptions) {
    this.options = {
      ignoreSSLErrors: true, // Default to ignoring SSL errors for self-signed certs
      perMessageDeflate: false, // Disable compression to avoid frame issues
      compression: false, // Explicitly disable compression
      ...options
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let connectionTimeoutId: ReturnType<typeof setTimeout> | null = null;
      let isResolved = false;
      
      try {
        console.log('🔌 [SecureWebSocket] Connecting to:', this.options.url);
        
        // Create WebSocket connection - React Native WebSocket doesn't support compression options
        // The server must be configured to not use compression
        this.ws = new WebSocket(this.options.url, this.options.protocols);
        
        this.ws.onopen = () => {
          // Clear timeout since we connected successfully
          if (connectionTimeoutId) {
            clearTimeout(connectionTimeoutId);
            connectionTimeoutId = null;
          }
          
          if (isResolved) {
            console.warn('⚠️ [SecureWebSocket] onopen fired after timeout - connection succeeded but timeout already rejected');
            return;
          }
          
          console.log('✅ [SecureWebSocket] Connected successfully');
          
          // CRITICAL: Verify WebSocket is actually working by sending a test message
          try {
            const testMessage = JSON.stringify({ type: 'ping', timestamp: Date.now() });
            this.ws?.send(testMessage);
            console.log('✅ [SecureWebSocket] Test ping sent to verify connection is working');
          } catch (testError) {
            console.error('❌ [SecureWebSocket] CRITICAL: WebSocket reports OPEN but send() failed:', testError);
            isResolved = true;
            reject(new Error('WebSocket reports connected but cannot send messages'));
            return;
          }
          
          isResolved = true;
          this.options.onOpen?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          // CRITICAL: Log message reception to verify bidirectional communication
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'pong') {
              console.log('🏓 [SecureWebSocket] Pong received - bidirectional communication confirmed');
            } else if (data.type !== 'ping') {
              console.log('📨 [SecureWebSocket] Message received:', data.type);
            }
          } catch (e) {
            // Not JSON, that's okay
          }
          this.options.onMessage?.(event);
        };

        this.ws.onclose = (event) => {
          // Clear timeout on close
          if (connectionTimeoutId) {
            clearTimeout(connectionTimeoutId);
            connectionTimeoutId = null;
          }
          
          console.log('🔌 [SecureWebSocket] Connection closed:', event.code, event.reason);
          this.options.onClose?.(event);
        };

        this.ws.onerror = (event) => {
          console.error('❌ [SecureWebSocket] Connection error:', event);
          
          // If we're ignoring SSL errors and this is an SSL-related error, try to continue
          if (this.options.ignoreSSLErrors && this.isSSLError(event)) {
            console.log('🔧 [SecureWebSocket] SSL error detected but ignoring due to ignoreSSLErrors=true');
            // Don't reject, let the connection attempt to continue
            return;
          }
          
          // Clear timeout on error
          if (connectionTimeoutId) {
            clearTimeout(connectionTimeoutId);
            connectionTimeoutId = null;
          }
          
          if (!isResolved) {
            isResolved = true;
            this.options.onError?.(event);
            reject(new Error('WebSocket connection failed'));
          }
        };

        // Set a timeout for connection
        connectionTimeoutId = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN && !isResolved) {
            console.error('❌ [SecureWebSocket] Connection timeout after 10 seconds');
            console.error('🔍 [SecureWebSocket] WebSocket state:', {
              readyState: this.ws?.readyState,
              readyStateName: {
                0: 'CONNECTING',
                1: 'OPEN',
                2: 'CLOSING',
                3: 'CLOSED'
              }[this.ws?.readyState || 3],
              url: this.options.url
            });
            
            // Close the WebSocket before rejecting
            try {
              this.ws?.close();
            } catch (closeError) {
              console.warn('⚠️ [SecureWebSocket] Error closing WebSocket on timeout:', closeError);
            }
            
            isResolved = true;
            reject(new Error(`WebSocket connection timeout - URL: ${this.options.url}, State: ${this.ws?.readyState}`));
          }
        }, 10000); // 10 second timeout

      } catch (error) {
        // Clear timeout on exception
        if (connectionTimeoutId) {
          clearTimeout(connectionTimeoutId);
          connectionTimeoutId = null;
        }
        
        console.error('❌ [SecureWebSocket] Failed to create connection:', error);
        if (!isResolved) {
          isResolved = true;
          reject(error);
        }
      }
    });
  }

  send(data: string | ArrayBuffer | Blob): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn('⚠️ [SecureWebSocket] Cannot send data - WebSocket not connected');
    }
  }

  close(code?: number, reason?: string): void {
    if (this.ws) {
      this.ws.close(code, reason);
      this.ws = null;
    }
  }

  get readyState(): number {
    return this.ws?.readyState || WebSocket.CLOSED;
  }

  private isSSLError(event: Event): boolean {
    // Check if the error is SSL-related
    const errorMessage = (event as any)?.message || (event as any)?.error?.message || '';
    return errorMessage.toLowerCase().includes('ssl') || 
           errorMessage.toLowerCase().includes('certificate') ||
           errorMessage.toLowerCase().includes('handshake');
  }
}

// Factory function for easy usage
export function createSecureWebSocket(options: SecureWebSocketOptions): SecureWebSocketService {
  return new SecureWebSocketService(options);
}

export default SecureWebSocketService;
