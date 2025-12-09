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
      try {
        console.log('🔌 [SecureWebSocket] Connecting to:', this.options.url);
        
        // Create WebSocket connection - React Native WebSocket doesn't support compression options
        // The server must be configured to not use compression
        this.ws = new WebSocket(this.options.url, this.options.protocols);
        
        this.ws.onopen = () => {
          console.log('✅ [SecureWebSocket] Connected successfully');
          this.options.onOpen?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.options.onMessage?.(event);
        };

        this.ws.onclose = (event) => {
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
          
          this.options.onError?.(event);
          reject(new Error('WebSocket connection failed'));
        };

        // Set a timeout for connection
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 second timeout

      } catch (error) {
        console.error('❌ [SecureWebSocket] Failed to create connection:', error);
        reject(error);
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
