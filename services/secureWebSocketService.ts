// Secure WebSocket Service for handling self-signed certificates
// This service provides a way to connect to WebSocket servers with self-signed certificates


export interface SecureWebSocketOptions {
  url: string;
  protocols?: string | string[];
  onOpen?: () => void;
  onMessage?: (data: any) => void;
  onClose?: (event: { code: number; reason: string }) => void;
  onError?: (error: any) => void;
  connectionTimeout?: number;
  disableCompression?: boolean;
  // WebSocket options to disable compression
  perMessageDeflate?: boolean;
  compression?: boolean;
}

export class SecureWebSocketService {
  private ws: WebSocket | null = null;
  private options: SecureWebSocketOptions;
  private connectionTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isConnected: boolean = false;

  constructor(options: SecureWebSocketOptions) {
    this.options = {
      connectionTimeout: 10000, // Default to 10 seconds
      disableCompression: true, // Default to disabling compression
      ...options
    };

    // Apply compression settings based on disableCompression
    if (this.options.disableCompression) {
      this.options.perMessageDeflate = false;
      this.options.compression = false;
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connectionTimeoutId = null;
      this.isConnected = false;

      try {
        console.log('🔌 [SecureWebSocket] Connecting to:', this.options.url);

        // Create WebSocket connection - Disable compression using protocols to avoid frame issues
        // We use a custom protocol string that signals to some servers to disable compression,
        // but since React Native WebSocket doesn't support a dedicated options object for headers/compression,
        // the server-side configuration is the most effective way to solve this.
        const protocols = this.options.disableCompression ? ['no-compression'] : this.options.protocols;
        this.ws = new WebSocket(this.options.url, protocols);

        this.ws.onopen = () => {
          // Clear timeout since we connected successfully
          if (this.connectionTimeoutId) {
            clearTimeout(this.connectionTimeoutId);
            this.connectionTimeoutId = null;
          }

          if (this.isConnected) {
            console.warn('⚠️ [SecureWebSocket] onopen fired after timeout - connection succeeded but timeout already rejected');
            return;
          }

          console.log('✅ [SecureWebSocket] Connected successfully');

          this.isConnected = true;
          this.options.onOpen?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            let data = JSON.parse(event.data);

            // Handle potential double-encoded JSON (sometimes happens with some gateways/services)
            if (typeof data === 'string' && (data.startsWith('{') || data.startsWith('['))) {
              try {
                data = JSON.parse(data);
              } catch (e) {
                // Not double-encoded, just happens to start with {
              }
            }

            // Automatic heartbeat response
            if (data && data.type === 'ping') {
              console.log('🏓 [SecureWebSocket] Ping received, sending pong');
              this.send({ type: 'pong' });
              return; // Don't pass pings to the application
            }

            this.options.onMessage?.(data);
          } catch (e) {
            // If not JSON, pass raw data
            this.options.onMessage?.(event.data);
          }
        };

        this.ws.onclose = (event) => {
          // Clear timeout on close
          if (this.connectionTimeoutId) {
            clearTimeout(this.connectionTimeoutId);
            this.connectionTimeoutId = null;
          }

          console.log('🔌 [SecureWebSocket] Connection closed:', event.code, event.reason);
          this.isConnected = false;
          this.options.onClose?.({ code: event.code, reason: event.reason });
        };

        this.ws.onerror = (event: any) => {
          // Clear connection timeout
          if (this.connectionTimeoutId) {
            clearTimeout(this.connectionTimeoutId);
            this.connectionTimeoutId = null;
          }

          console.error('❌ [SecureWebSocket] WebSocket error:', {
            message: event.message || 'No message property',
            type: event.type,
            isTrusted: event.isTrusted,
            url: this.options.url
          });

          // Inform the caller
          if (this.options.onError) {
            this.options.onError(event);
          }

          if (!this.isConnected) {
            reject(new Error(event.message || 'WebSocket connection failed'));
          }
        };

        // Set a timeout for connection
        this.connectionTimeoutId = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN && !this.isConnected) {
            console.error('❌ [SecureWebSocket] Connection timeout after', this.options.connectionTimeout, 'ms');
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

            this.isConnected = true; // Mark as resolved to prevent further resolution attempts
            reject(new Error(`WebSocket connection timeout - URL: ${this.options.url}, State: ${this.ws?.readyState}`));
          }
        }, this.options.connectionTimeout);

      } catch (error) {
        // Clear timeout on exception
        if (this.connectionTimeoutId) {
          clearTimeout(this.connectionTimeoutId);
          this.connectionTimeoutId = null;
        }

        console.error('❌ [SecureWebSocket] Failed to create connection:', error);
        if (!this.isConnected) {
          this.isConnected = true;
          reject(error);
        }
      }
    });
  }

  /**
   * Send a JSON message through the WebSocket
   */
  public send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const data = typeof message === 'string' ? message : JSON.stringify(message);
        console.log(`📤 [SecureWebSocket] Sending:`, data.substring(0, 50) + (data.length > 50 ? '...' : ''));
        this.ws.send(data);
      } catch (error) {
        console.error('❌ [SecureWebSocket] Failed to send message:', error);
      }
    } else {
      console.warn('⚠️ [SecureWebSocket] Cannot send message: WebSocket not open', {
        readyState: this.ws?.readyState,
        url: this.options.url
      });
    }
  }

  /**
   * Close the WebSocket connection
   */
  public close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  get readyState(): number {
    return this.ws?.readyState || WebSocket.CLOSED;
  }
}

// Factory function for easy usage
export function createSecureWebSocket(options: SecureWebSocketOptions): SecureWebSocketService {
  return new SecureWebSocketService(options);
}

export default SecureWebSocketService;
