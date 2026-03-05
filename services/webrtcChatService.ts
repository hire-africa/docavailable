import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatConfig, ChatEvents, ChatMessage } from '../types/chat';
import { validateMessage } from '../utils/messageSanitization';
import { imageService } from './imageService';
import { mediaUploadQueueService } from './mediaUploadQueueService';
import { SecureWebSocketService } from './secureWebSocketService';
import { voiceRecordingService } from './voiceRecordingService';

export class WebRTCChatService {
  private config: ChatConfig;
  private events: ChatEvents;
  private websocket: WebSocket | null = null;
  private secureWebSocket: SecureWebSocketService | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3; // Reduced from 5 to prevent excessive reconnection attempts
  private reconnectDelay: number = 2000; // Increased base delay from 1000ms to 2000ms
  private messages: ChatMessage[] = [];
  private storageKey: string;
  private processedMessageHashes: Set<string> = new Set();
  private onTypingIndicator?: (isTyping: boolean, senderId?: number) => void;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastPingTime = 0;
  private pingTimeout = 60000; // Increased from 30 to 60 seconds for more stable connections
  private connectionTimeout = 30000; // 30 seconds connection timeout
  private isSyncing = false; // Flag to prevent multiple simultaneous syncs
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private savePromise: Promise<void> | null = null;
  private saveResolve: (() => void) | null = null;

  constructor(config: ChatConfig, events: ChatEvents) {
    console.log('🔧 [WebRTCChat] Constructor called with config:', {
      appointmentId: config.appointmentId,
      userId: config.userId,
      userName: config.userName,
      sessionType: config.sessionType,
      webrtcConfig: config.webrtcConfig
    });

    this.config = config;
    this.events = events;
    // Include session type in storage key to prevent conflicts between text sessions and appointments
    const sessionType = config.sessionType || 'appointment';
    this.storageKey = `webrtc_messages_${sessionType}_${config.appointmentId}`;
    this.processedMessageHashes = new Set();

    console.log('✅ [WebRTCChat] Constructor completed successfully');
  }

  // Load messages from AsyncStorage
  private async loadMessages(): Promise<void> {
    try {
      const storedMessages = await AsyncStorage.getItem(this.storageKey);
      if (storedMessages) {
        this.messages = JSON.parse(storedMessages);
        console.log('📱 [WebRTCChat] Loaded messages from storage:', this.messages.length);
      }
    } catch (error) {
      console.error('❌ [WebRTCChat] Error loading messages from storage:', error);
    }
  }

  // Save messages to AsyncStorage with debouncing to prevent UI blocking
  private saveMessages(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    if (!this.savePromise) {
      this.savePromise = new Promise((resolve) => {
        this.saveResolve = resolve;
      });
    }

    this.saveTimeout = setTimeout(async () => {
      try {
        const startTime = Date.now();
        await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.messages));
        const duration = Date.now() - startTime;
        console.log(`💾 [WebRTCChat] Saved ${this.messages.length} messages to storage in ${duration}ms (debounced)`);
      } catch (error) {
        console.error('❌ [WebRTCChat] Error saving messages to storage:', error);
      } finally {
        const resolve = this.saveResolve;
        this.saveTimeout = null;
        this.savePromise = null;
        this.saveResolve = null;
        if (resolve) resolve();
      }
    }, 500); // 500ms debounce period

    return this.savePromise;
  }

  // Add message and save to storage
  private async addMessage(message: ChatMessage): Promise<void> {
    // Check if message already exists to prevent duplicates
    // Compare IDs as strings to handle number vs string mismatches
    const msgId = String(message.id);
    const msgTempId = message.temp_id ? String(message.temp_id) : null;
    const existingMessage = this.messages.find(msg => {
      // Match by ID (normalized to string)
      if (String(msg.id) === msgId) return true;
      // Match by temp_id
      if (msgTempId && msg.temp_id && String(msg.temp_id) === msgTempId) return true;
      if (msgTempId && String(msg.id) === msgTempId) return true;
      if (msg.temp_id && String(msg.temp_id) === msgId) return true;
      // Content-based dedup: same sender + same message text + same timestamp
      if (msg.message === message.message &&
        String(msg.sender_id) === String(message.sender_id) &&
        msg.created_at && message.created_at &&
        msg.created_at === message.created_at) return true;
      return false;
    });
    if (existingMessage) {
      console.log('⚠️ [WebRTCChat] Message already exists, skipping duplicate:', message.id);
      return;
    }

    this.messages.push(message);
    await this.saveMessages();
  }

  async connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Load existing messages first
        await this.loadMessages();

        // Initialize media upload queue service
        await mediaUploadQueueService.initialize();

        const token = await this.getAuthToken();

        // Production-only signaling path
        let base = this.config.webrtcConfig?.chatSignalingUrl || 'wss://docavailable.org/chat-signaling';

        // DIAGNOSTIC: Log URL status
        console.log('🔍 [WebRTCChat] Connecting to production signaling:', {
          finalBase: base,
          appointmentId: this.config.appointmentId,
          userId: this.config.userId,
          hasAuthToken: !!token
        });

        const wsUrl = `${base}?appointmentId=${encodeURIComponent(this.config.appointmentId)}&userId=${encodeURIComponent(String(this.config.userId))}&authToken=${encodeURIComponent(token || '')}`;
        console.log('🔌 [WebRTCChat] Connecting to WebRTC chat signaling:', wsUrl);

        // Connection timeout
        const connectionTimeoutId = setTimeout(() => {
          if (!this.isConnected) {
            console.error('❌ [WebRTCChat] Connection timeout after 15s');
            this.secureWebSocket?.close();
            reject(new Error('Connection timeout'));
          }
        }, 15000);

        // Use SecureWebSocketService with production URL
        this.secureWebSocket = new SecureWebSocketService({
          url: wsUrl,
          onOpen: async () => {
            clearTimeout(connectionTimeoutId);
            console.log('✅ [WebRTCChat] WebRTC chat connected successfully');

            // Assign internal WebSocket reference immediately on open
            this.websocket = (this.secureWebSocket as any).ws;

            // Verify WebSocket is working
            try {
              const testMessage = JSON.stringify({ type: 'ping', timestamp: Date.now() });
              this.secureWebSocket?.send(testMessage);
            } catch (testError) {
              console.error('❌ [WebRTCChat] WebSocket OPEN but send() failed');
              reject(new Error('WebSocket reports connected but cannot send messages'));
              return;
            }

            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.startHealthCheck();

            // Auto-sync with server
            try {
              await this.syncWithServer();
            } catch (error) {
              console.error('❌ [WebRTCChat] Auto-sync failed:', error);
            }

            resolve();
          },
          onMessage: async (data: any) => {
            try {
              console.log('📨 [WebRTCChat] Message received:', data.type);

              if (data.type === 'chat-message') {
                const raw = data.message || data;
                const normalized: ChatMessage = {
                  id: String(raw.id || raw.temp_id || raw.tempId || `ws_${Date.now()}`),
                  sender_id: Number(raw.sender_id || raw.senderId || 0),
                  sender_name: raw.sender_name || raw.senderName || '',
                  message: raw.message || raw.content || '',
                  message_type: (raw.message_type || raw.messageType || 'text'),
                  media_url: raw.media_url || raw.mediaUrl,
                  temp_id: raw.temp_id || raw.tempId,
                  created_at: raw.created_at || raw.createdAt || new Date().toISOString(),
                  delivery_status: (raw.delivery_status || raw.deliveryStatus || 'delivered')
                };

                // Ensure message_type is constrained to the supported union
                if (normalized.message_type !== 'text' && normalized.message_type !== 'image' && normalized.message_type !== 'voice') {
                  normalized.message_type = 'text';
                }

                // Deduplicate and add
                const messageHash = this.createMessageHash(normalized);
                if (!this.processedMessageHashes.has(messageHash)) {
                  this.processedMessageHashes.add(messageHash);
                  if (Number(normalized.sender_id) !== Number(this.config.userId)) {
                    await this.addMessage(normalized);
                  }
                  this.events.onMessage(normalized);
                }
              } else if (data.type === 'delivery-status' || data.type === 'read-receipt') {
                const messageId = String(data.messageId);
                const status = data.type === 'read-receipt' ? 'read' : data.status;

                console.log(`📊 [WebRTCChat] Received status update: ${messageId} -> ${status}`);

                // Update local message status
                const messageIndex = this.messages.findIndex(m => String(m.id) === messageId || (m.temp_id && String(m.temp_id) === messageId));
                if (messageIndex !== -1) {
                  this.messages[messageIndex].delivery_status = status;
                  await this.saveMessages();
                  this.events.onMessage(this.messages[messageIndex]);
                }
              } else if (data.type === 'typing-indicator') {
                this.onTypingIndicator?.(data.isTyping, data.senderId);
              } else if (data.type === 'session-ended') {
                this.events.onSessionEnded?.(this.config.appointmentId, data.reason || 'manual_end', this.config.sessionType || 'appointment');
              } else if (data.type === 'doctor-response-timer-started' ||
                data.type === 'doctor-response-timer-stopped' ||
                data.type === 'session-activated' ||
                data.type === 'session-status-response') {
                console.log(`⏱️ [WebRTCChat] Received detector message: ${data.type}`);
                this.events.onDetectorMessage?.(data);
              }
            } catch (error) {
              console.error('❌ Error parsing message:', error);
            }
          },
          onError: (error: any) => {
            console.error('❌ [WebRTCChat] Signaling error:', error);
            if (!this.isConnected) {
              this.events.onError('Connection error');
              reject(error);
            }
          },
          onClose: (event: CloseEvent) => {
            console.log('🔌 [WebRTCChat] Disconnected:', event.code, event.reason);
            this.isConnected = false;
            this.stopHealthCheck();

            if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
              this.handleReconnect();
            }
          }
        });

        // Connect
        this.secureWebSocket.connect().then(() => {
          this.websocket = (this.secureWebSocket as any).ws;
        }).catch((error) => {
          clearTimeout(connectionTimeoutId);
          reject(error);
        });

      } catch (error) {
        console.error('❌ Error in connect():', error);
        reject(error);
      }
    });
  }

  async sendMessage(message: string, replyTo?: { messageId: string; message: string; senderName: string }, preferredId?: string): Promise<ChatMessage | null> {
    console.log('📤 [WebRTCChat] sendMessage called with:', message, 'replyTo:', replyTo, 'preferredId:', preferredId);
    console.log('📤 [WebRTCChat] Connection status:', {
      isConnected: this.isConnected,
      hasWebSocket: !!this.websocket,
      websocketState: this.websocket?.readyState,
      isWebSocketOpen: this.websocket?.readyState === WebSocket.OPEN
    });

    // SECURITY: Validate message content before sending (client-side validation)
    // This prevents bypassing backend validation when using WebRTC
    const validationResult = validateMessage(message);
    if (!validationResult.isValid) {
      const errorMessage = `Message contains content that is not allowed: ${validationResult.reasons.join(', ')}`;
      console.error('❌ [WebRTCChat] Message validation failed:', errorMessage);
      console.error('❌ [WebRTCChat] Blocked reasons:', validationResult.reasons);
      throw new Error(errorMessage);
    }

    if (!this.isConnected || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.error('❌ [WebRTCChat] WebRTC chat not connected - cannot send message', {
        isConnected: this.isConnected,
        hasWebSocket: !!this.websocket,
        websocketState: this.websocket?.readyState,
        expectedState: WebSocket.OPEN
      });
      throw new Error('WebRTC chat not connected');
    }

    // Use preferred ID (from UI) or generate a new one
    const messageId = preferredId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const messageData: any = {
      type: 'chat-message',
      content: message,
      messageType: 'text',
      senderId: this.config.userId,
      senderName: this.config.userName,
      tempId: messageId,
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sending'
    };

    // Include replyTo if provided
    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    try {
      console.log('📤 [WebRTCChat] Sending message:', messageId, 'to WebSocket with auth token');
      console.log('📤 [WebRTCChat] Message data being sent:', JSON.stringify(messageData, null, 2));
      console.log('📤 [WebRTCChat] WebSocket readyState before send:', this.websocket.readyState);
      console.log('📤 [WebRTCChat] WebSocket URL:', this.websocket.url);

      // CRITICAL: Verify WebSocket is actually open before sending
      if (this.websocket.readyState !== WebSocket.OPEN) {
        console.error('❌ [WebRTCChat] CRITICAL: WebSocket readyState changed to', this.websocket.readyState, 'before send');
        throw new Error(`WebSocket not open - state: ${this.websocket.readyState}`);
      }

      try {
        this.websocket.send(JSON.stringify(messageData));
        console.log('✅ [WebRTCChat] Message sent to WebSocket successfully');
        console.log('📤 [WebRTCChat] Message sent to server, waiting for forwarding to other participants...');
      } catch (sendError) {
        console.error('❌ [WebRTCChat] CRITICAL: websocket.send() threw an error:', sendError);
        console.error('❌ [WebRTCChat] WebSocket state:', {
          readyState: this.websocket.readyState,
          url: this.websocket.url,
          isConnected: this.isConnected
        });
        throw new Error(`Failed to send message: ${sendError instanceof Error ? sendError.message : String(sendError)}`);
      }

      // Ensure processedMessageHashes is initialized
      if (!this.processedMessageHashes) {
        this.processedMessageHashes = new Set();
      }

      // Mark message as processed to prevent duplicates (by hash)
      const messageHash = this.createMessageHash(messageData);
      this.processedMessageHashes.add(messageHash);

      // Convert to ChatMessage format for storage
      const chatMessage: ChatMessage = {
        id: messageId,
        temp_id: messageId, // Use the same ID as temp_id for local reconciliation
        sender_id: Number(this.config.userId),
        sender_name: this.config.userName,
        message: message,
        message_type: 'text',
        created_at: new Date().toISOString(),
        delivery_status: 'sending'
      };

      // Store the sent message locally and save to AsyncStorage
      await this.addMessage(chatMessage);

      // CRITICAL: Always persist to backend API to ensure timer starts and messages are stored
      // Optimization: Fire-and-forget the backend persistence so it doesn't block the UI
      this.persistToBackend(chatMessage);

      // Note: We no longer trigger onMessage for the sender's own message here
      // because the UI adds it immediately and we return it from this function.
      // This prevents the "appears twice" flash during sending.

      console.log('📤 [WebRTCChat] Message sent successfully:', messageId);
      return chatMessage;
    } catch (error) {
      console.error('❌ [WebRTCChat] Failed to send message:', error);
      throw error;
    }
  }

  async sendVoiceMessage(audioUri: string, appointmentId: number | string): Promise<ChatMessage | null> {
    if (!this.isConnected || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.error('❌ [WebRTCChat] WebRTC chat not connected for voice message', {
        isConnected: this.isConnected,
        hasWebSocket: !!this.websocket,
        websocketState: this.websocket?.readyState,
        expectedState: WebSocket.OPEN
      });
      throw new Error('WebRTC chat not connected');
    }

    try {
      // Handle text sessions - extract numeric ID
      let numericAppointmentId: number;
      if (typeof appointmentId === 'string' && appointmentId.startsWith('text_session_')) {
        numericAppointmentId = parseInt(appointmentId.replace('text_session_', ''), 10);
      } else {
        numericAppointmentId = Number(appointmentId);
      }

      console.log('📤 [WebRTCChat] Starting voice message upload for appointment:', numericAppointmentId);

      // Upload the voice file first with retry logic
      let mediaUrl: string | null = null;
      let uploadAttempts = 0;
      const maxUploadAttempts = 3;

      while (!mediaUrl && uploadAttempts < maxUploadAttempts) {
        try {
          uploadAttempts++;
          console.log(`📤 [WebRTCChat] Voice upload attempt ${uploadAttempts}/${maxUploadAttempts}`);

          mediaUrl = await voiceRecordingService.uploadVoiceMessage(numericAppointmentId, audioUri);

          if (mediaUrl) {
            console.log('✅ [WebRTCChat] Voice upload successful:', mediaUrl);
            break;
          } else {
            console.warn(`⚠️ [WebRTCChat] Voice upload attempt ${uploadAttempts} returned null`);
          }
        } catch (uploadError: any) {
          console.error(`❌ [WebRTCChat] Voice upload attempt ${uploadAttempts} failed:`, uploadError);

          if (uploadAttempts >= maxUploadAttempts) {
            // Create a failed message for UI feedback
            const failedMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const failedMessage: ChatMessage = {
              id: failedMessageId,
              sender_id: Number(this.config.userId),
              sender_name: this.config.userName,
              message: '🎤 Voice message (upload failed)',
              message_type: 'voice',
              media_url: '', // Empty URL indicates failed upload
              created_at: new Date().toISOString(),
              delivery_status: 'failed'
            };

            await this.addMessage(failedMessage);
            this.events.onMessage(failedMessage);

            throw new Error(`Failed to upload voice message after ${maxUploadAttempts} attempts: ${uploadError.message}`);
          }

          // Wait before retry (exponential backoff)
          const retryDelay = 1000 * Math.pow(2, uploadAttempts - 1);
          console.log(`🔄 [WebRTCChat] Retrying voice upload in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      if (!mediaUrl) {
        throw new Error('Failed to upload voice message after all attempts');
      }

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const authToken = await this.getAuthToken();

      const messageData = {
        type: 'chat-message',
        content: '🎤 Voice message', // Voice message indicator
        messageType: 'voice',
        senderId: this.config.userId,
        senderName: this.config.userName,
        mediaUrl: mediaUrl,
        tempId: messageId,
        createdAt: new Date().toISOString(),
        deliveryStatus: 'sending'
      };

      console.log('📤 [WebRTCChat] Sending voice message via WebSocket:', messageId);
      this.websocket.send(JSON.stringify(messageData));

      const messageHash = this.createMessageHash(messageData);
      this.processedMessageHashes.add(messageHash);

      // Convert to ChatMessage format for storage
      const chatMessage: ChatMessage = {
        id: messageId,
        sender_id: Number(this.config.userId),
        sender_name: this.config.userName,
        message: '🎤 Voice message',
        message_type: 'voice',
        media_url: mediaUrl, // This is the FULL URL from backend upload
        created_at: new Date().toISOString(),
        delivery_status: 'sending'
      };

      console.log('✅ [WebRTCChat] Voice message prepared for storage:', {
        id: messageId,
        media_url: mediaUrl,
        is_full_url: mediaUrl?.startsWith('http')
      });

      await this.addMessage(chatMessage);
      this.events.onMessage(chatMessage);

      // Also persist the voice message to the backend API for consistency
      // Optimization: Fire-and-forget the backend persistence so it doesn't block the UI
      this.persistToBackend(chatMessage);

      console.log('📤 [WebRTCChat] Voice message sent successfully:', messageId);
      return chatMessage;
    } catch (error) {
      console.error('❌ [WebRTCChat] Failed to send voice message:', error);
      throw error;
    }
  }

  async sendImageMessage(imageUri: string, appointmentId: number | string): Promise<ChatMessage | null> {
    if (!this.isConnected || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.error('❌ [WebRTCChat] WebRTC chat not connected for image message', {
        isConnected: this.isConnected,
        hasWebSocket: !!this.websocket,
        websocketState: this.websocket?.readyState,
        expectedState: WebSocket.OPEN
      });
      throw new Error('WebRTC chat not connected');
    }

    try {
      // Handle text sessions - extract numeric ID
      let numericAppointmentId: number;
      if (typeof appointmentId === 'string' && appointmentId.startsWith('text_session_')) {
        numericAppointmentId = parseInt(appointmentId.replace('text_session_', ''), 10);
      } else {
        numericAppointmentId = Number(appointmentId);
      }

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Show image IMMEDIATELY with local URI and 'sending' status
      const immediateMessage: ChatMessage = {
        id: messageId,
        sender_id: Number(this.config.userId),
        sender_name: this.config.userName,
        message: '🖼️ Image',
        message_type: 'image',
        media_url: imageUri, // Local file URI for immediate display
        created_at: new Date().toISOString(),
        delivery_status: 'sending' // Show uploading status
      };

      console.log('📤 [WebRTCChat] Showing image immediately:', messageId);
      this.events.onMessage(immediateMessage);

      // Upload the image in background
      const uploadResult = await imageService.uploadImage(numericAppointmentId, imageUri);

      if (!uploadResult.success || !uploadResult.mediaUrl) {
        throw new Error(uploadResult.error || 'Failed to upload image');
      }

      const authToken = await this.getAuthToken();

      const messageData = {
        type: 'chat-message',
        content: '🖼️ Image',
        messageType: 'image',
        senderId: this.config.userId,
        senderName: this.config.userName,
        mediaUrl: uploadResult.mediaUrl,
        tempId: messageId,
        createdAt: new Date().toISOString(),
        deliveryStatus: 'sent'
      };

      console.log('📤 [WebRTCChat] Sending image message after upload:', messageId, 'URL:', uploadResult.mediaUrl);
      this.websocket.send(JSON.stringify(messageData));

      const messageHash = this.createMessageHash(messageData);
      this.processedMessageHashes.add(messageHash);

      // Update message with server URL and 'sent' status
      const uploadedMessage: ChatMessage = {
        id: messageId,
        sender_id: Number(this.config.userId),
        sender_name: this.config.userName,
        message: '🖼️ Image',
        message_type: 'image',
        media_url: uploadResult.mediaUrl,
        created_at: new Date().toISOString(),
        delivery_status: 'sent'
      };

      await this.addMessage(uploadedMessage);
      // Trigger onMessage again to update the existing message
      console.log('✅ [WebRTCChat] Image uploaded, updating message:', messageId);
      this.events.onMessage(uploadedMessage);

      // Also persist to backend API as fallback
      // Optimization: Fire-and-forget the backend persistence so it doesn't block the UI
      this.persistToBackend(uploadedMessage);

      // Message already added and updated above

      console.log('📤 [WebRTCChat] Image message sent successfully:', messageId);
      return uploadedMessage;
    } catch (error) {
      console.error('❌ [WebRTCChat] Failed to send image message:', error);
      throw error;
    }
  }

  /**
   * Send image message using enhanced service with queue
   */
  async sendImageMessageWithQueue(imageUri: string, appointmentId: number | string): Promise<{ success: boolean; tempId?: string; error?: string }> {
    try {
      // Handle text sessions - extract numeric ID
      let numericAppointmentId: number;
      if (typeof appointmentId === 'string' && appointmentId.startsWith('text_session_')) {
        numericAppointmentId = parseInt(appointmentId.replace('text_session_', ''), 10);
      } else {
        numericAppointmentId = Number(appointmentId);
      }

      // Import enhanced image service
      const { enhancedImageService } = await import('./enhancedImageService');

      // Add to upload queue
      const result = await enhancedImageService.pickAndQueueImage(numericAppointmentId);

      if (result.success && result.tempId) {
        // Create temporary message for immediate UI feedback
        const tempMessage: ChatMessage = {
          id: result.tempId,
          sender_id: Number(this.config.userId),
          sender_name: this.config.userName,
          message: 'Image uploading...',
          message_type: 'image',
          media_url: '',
          created_at: new Date().toISOString(),
          delivery_status: 'sending'
        };

        await this.addMessage(tempMessage);
        this.events.onMessage(tempMessage);

        // Subscribe to upload progress
        enhancedImageService.subscribeToImageProgress(result.tempId, (progress) => {
          this.handleUploadProgress(result.tempId!, progress);
        });
      }

      return result;
    } catch (error: any) {
      console.error('❌ [WebRTCChat] Failed to send image with queue:', error);
      return {
        success: false,
        error: error.message || 'Failed to send image'
      };
    }
  }

  /**
   * Send voice message using enhanced service with queue
   */
  async sendVoiceMessageWithQueue(audioUri: string, appointmentId: number | string): Promise<{ success: boolean; tempId?: string; error?: string }> {
    try {
      // Handle text sessions - extract numeric ID
      let numericAppointmentId: number;
      if (typeof appointmentId === 'string' && appointmentId.startsWith('text_session_')) {
        numericAppointmentId = parseInt(appointmentId.replace('text_session_', ''), 10);
      } else {
        numericAppointmentId = Number(appointmentId);
      }

      // Import enhanced voice service
      const { enhancedVoiceService } = await import('./enhancedVoiceService');

      // Add to upload queue
      const result = await enhancedVoiceService.stopRecordingAndQueue(numericAppointmentId);

      if (result.success && result.tempId) {
        // Create temporary message for immediate UI feedback
        const tempMessage: ChatMessage = {
          id: result.tempId,
          sender_id: Number(this.config.userId),
          sender_name: this.config.userName,
          message: 'Voice uploading...',
          message_type: 'voice',
          media_url: '',
          created_at: new Date().toISOString(),
          delivery_status: 'sending'
        };

        await this.addMessage(tempMessage);
        this.events.onMessage(tempMessage);

        // Subscribe to upload progress
        enhancedVoiceService.subscribeToVoiceProgress(result.tempId, (progress) => {
          this.handleUploadProgress(result.tempId!, progress);
        });
      }

      return result;
    } catch (error: any) {
      console.error('❌ [WebRTCChat] Failed to send voice with queue:', error);
      return {
        success: false,
        error: error.message || 'Failed to send voice message'
      };
    }
  }

  /**
   * Handle upload progress updates
   */
  private handleUploadProgress(tempId: string, progress: any): void {
    try {
      // Find the temporary message and update its status
      const messageIndex = this.messages.findIndex(msg => msg.id === tempId);

      if (messageIndex !== -1) {
        const message = this.messages[messageIndex];

        switch (progress.status) {
          case 'uploading':
            message.delivery_status = 'sending';
            message.message = `${progress.progress}% uploading...`;
            break;
          case 'completed':
            message.delivery_status = 'sent';
            message.message = progress.status === 'image' ? '🖼️ Image' : '🎤 Voice message';
            // Remove the temporary message as it will be replaced by the real message
            this.messages.splice(messageIndex, 1);
            break;
          case 'failed':
            message.delivery_status = 'sending';
            message.message = `Upload failed: ${progress.error || 'Unknown error'}`;
            break;
        }

        // Save updated messages
        this.saveMessages();

        // Notify UI of the update
        this.events.onMessage(message);
      }
    } catch (error) {
      console.error('❌ [WebRTCChat] Error handling upload progress:', error);
    }
  }

  async getMessages(): Promise<ChatMessage[]> {
    return this.messages;
  }

  // Sync messages with server to ensure we have the latest messages
  async syncWithServer(): Promise<ChatMessage[]> {
    // Prevent multiple simultaneous syncs
    if (this.isSyncing) {
      console.log('⚠️ [WebRTCChat] Already syncing with server, skipping duplicate call');
      return this.messages;
    }

    try {
      this.isSyncing = true;
      console.log('🔄 [WebRTCChat] Syncing with server...', {
        currentMessageCount: this.messages.length,
        appointmentId: this.config.appointmentId,
        userId: this.config.userId
      });

      // Get auth token for API calls
      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.error('❌ [WebRTCChat] No auth token available for server sync');
        return this.messages;
      }

      // Fetch messages from server
      const response = await fetch(`${this.config.baseUrl}/api/chat/${this.config.appointmentId}/messages`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ [WebRTCChat] Server sync failed with status:', response.status);
        return this.messages;
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ [WebRTCChat] Server sync returned non-JSON response:', contentType);
        const textResponse = await response.text();
        console.error('❌ [WebRTCChat] Response content:', textResponse);
        return this.messages;
      }

      const data = await response.json();
      if (!data.success || !data.data) {
        console.error('❌ [WebRTCChat] Server sync returned invalid data');
        return this.messages;
      }

      const serverMessages = data.data;
      console.log('📨 [WebRTCChat] Server returned', serverMessages.length, 'messages');

      // SAFETY MECHANISM: If server returns 0 messages but we have local messages,
      // do NOT overwrite local messages. This prevents history wipe on cache miss or server restarts.
      if (serverMessages.length === 0 && this.messages.length > 0) {
        console.warn('⚠️ [WebRTCChat] Server returned 0 messages but local has', this.messages.length, '. Keeping local messages.');
        // Don't save empty list over local history
        return this.messages;
      }

      // If we have messages, merge them to avoid duplicates and preserve unsent messages
      if (serverMessages.length > 0) {
        // Simple merge: prefer server messages but keep local-only messages (like ones currently sending)
        const merged = [...serverMessages];

        // Add local messages that are NOT in the server set
        // Use multiple matching strategies to prevent duplicates
        this.messages.forEach(localMsg => {
          const localId = String(localMsg.id);
          const localTempId = localMsg.temp_id ? String(localMsg.temp_id) : null;
          const exists = merged.some(m => {
            const serverId = String(m.id);
            const serverTempId = m.temp_id ? String(m.temp_id) : null;
            // Match by ID (normalized to string)
            if (serverId === localId) return true;
            // Match by temp_id cross-references
            if (localTempId && serverTempId && localTempId === serverTempId) return true;
            if (localTempId && serverId === localTempId) return true;
            if (serverTempId && localId === serverTempId) return true;
            // Content-based dedup: same sender + same message + same timestamp
            if (m.message === localMsg.message &&
              String(m.sender_id) === String(localMsg.sender_id) &&
              m.created_at && localMsg.created_at &&
              m.created_at === localMsg.created_at) return true;
            return false;
          });
          if (!exists) {
            // Only keep local messages that are genuinely not on the server
            // (e.g., messages still being sent)
            merged.push(localMsg);
          }
        });

        // Final dedup pass: remove any remaining duplicates by content fingerprint
        const seen = new Set<string>();
        const deduped = merged.filter(msg => {
          // Create a fingerprint from sender + message + timestamp
          const fingerprint = `${String(msg.sender_id)}_${msg.message}_${msg.created_at || ''}`;
          if (seen.has(fingerprint)) return false;
          seen.add(fingerprint);
          return true;
        });

        // Sort by timestamp (fallback to current time if invalid)
        deduped.sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeA - timeB;
        });

        this.messages = deduped;
      } else {
        // If server is empty and local is empty, just set to empty
        this.messages = serverMessages;
      }

      await this.saveMessages();
      console.log('✅ [WebRTCChat] Messages synced and saved to storage:', this.messages.length);
      return this.messages;
    } catch (error) {
      console.error('❌ [WebRTCChat] Error syncing with server:', error);
      return this.messages;
    } finally {
      this.isSyncing = false;
    }
  }

  // Clear messages from storage (useful when ending a session)
  async clearMessages(): Promise<void> {
    try {
      this.messages = [];
      await AsyncStorage.removeItem(this.storageKey);
      console.log('🗑️ [WebRTCChat] Cleared messages from storage');
    } catch (error) {
      console.error('❌ [WebRTCChat] Error clearing messages from storage:', error);
    }
  }

  // Get message count
  getMessageCount(): number {
    return this.messages.length;
  }

  // Force refresh messages from server (useful for debugging)
  async refreshMessagesFromServer(): Promise<ChatMessage[]> {
    try {
      console.log('🔄 [WebRTCChat] Force refreshing messages from server...');

      // Get auth token for API calls
      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.error('❌ [WebRTCChat] No auth token available for refresh');
        return this.messages;
      }

      // Fetch messages from server
      const response = await fetch(`${this.config.baseUrl}/api/chat/${this.config.appointmentId}/messages`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ [WebRTCChat] Server refresh failed with status:', response.status);
        return this.messages;
      }

      const data = await response.json();
      if (!data.success || !data.data) {
        console.error('❌ [WebRTCChat] Server refresh returned invalid data');
        return this.messages;
      }

      const serverMessages = data.data;
      console.log('📨 [WebRTCChat] Server returned', serverMessages.length, 'messages on refresh');

      // Replace local messages with server messages
      this.messages = serverMessages;
      await this.saveMessages();

      console.log('✅ [WebRTCChat] Messages refreshed from server');
      return this.messages;
    } catch (error) {
      console.error('❌ [WebRTCChat] Error refreshing messages from server:', error);
      return this.messages;
    }
  }

  async disconnect(): Promise<void> {
    this.stopHealthCheck();

    // Clear any pending reconnection attempts
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.websocket) {
      this.websocket.close(1000, 'Normal closure');
      this.websocket = null;
    }
    this.isConnected = false;
    this.reconnectAttempts = 0; // Reset reconnection attempts on disconnect
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ [WebRTCChat] Max reconnection attempts reached');
      this.events.onError('Connection lost. Please refresh the session.');
      return;
    }

    // Don't reconnect if already connected
    if (this.isConnected && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      console.log('✅ [WebRTCChat] Already connected, skipping reconnection');
      return;
    }

    this.reconnectAttempts++;

    // Exponential backoff with jitter for better reconnection
    const baseDelay = this.reconnectDelay;
    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 2000; // Increased jitter from 1000ms to 2000ms
    const finalDelay = Math.min(exponentialDelay + jitter, 60000); // Increased cap from 30s to 60s

    console.log(`🔄 [WebRTCChat] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${Math.round(finalDelay)}ms...`);

    // Clear any existing reconnection timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect().catch(error => {
        console.error('❌ WebRTC chat reconnection failed:', error);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect();
        }
      });
    }, finalDelay);
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.websocket && this.websocket.readyState === WebSocket.OPEN;
  }

  private startHealthCheck(): void {
    this.stopHealthCheck();
    this.lastPingTime = Date.now();

    this.healthCheckInterval = setInterval(() => {
      // Only check if we have a websocket and it's in a valid state
      const ws = this.websocket as any;
      if (ws && (ws.readyState === 1 || ws.readyState === 0)) { // 1 = OPEN, 0 = CONNECTING
        const now = Date.now();
        if (now - this.lastPingTime > this.pingTimeout) {
          console.warn('🔄 [WebRTCChat] Health check timeout, reconnecting...');
          this.handleReconnect();
        } else {
          // Send ping to keep connection alive
          try {
            ws.send(JSON.stringify({ type: 'ping', timestamp: now }));
            this.lastPingTime = now;
          } catch (error) {
            console.error('❌ [WebRTCChat] Failed to send ping:', error);
            // Only reconnect if the connection is actually broken
            if (ws.readyState === 3 || ws.readyState === 2) { // 3 = CLOSED, 2 = CLOSING
              this.handleReconnect();
            }
          }
        }
      } else if (ws && ws.readyState === 3) { // 3 = CLOSED
        // Only reconnect if the connection is actually closed
        console.warn('🔄 [WebRTCChat] Connection closed, attempting reconnection...');
        this.handleReconnect();
      }
      // Don't reconnect if websocket is null or in CONNECTING state
    }, 15000); // Increased from 10s to 15s to reduce frequency
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Send typing indicator
  sendTypingIndicator(isTyping: boolean, senderId?: number): void {
    if (!this.websocket || !this.isConnected) {
      console.log('⌨️ [WebRTCChat] Cannot send typing indicator - WebSocket not connected');
      return;
    }

    try {
      const message = {
        type: 'typing-indicator',
        appointmentId: this.config.appointmentId,
        isTyping: isTyping,
        senderId: senderId || this.config.userId
      };

      console.log('⌨️ [WebRTCChat] Sending typing indicator:', message);
      this.websocket.send(JSON.stringify(message));
    } catch (error) {
      console.error('❌ [WebRTCChat] Failed to send typing indicator:', error);
    }
  }

  // Set typing indicator callback
  setOnTypingIndicator(callback: (isTyping: boolean, senderId?: number) => void): void {
    this.onTypingIndicator = callback;
  }

  // Send delivery status update
  sendDeliveryStatus(messageId: string | number, status: 'delivered' | 'read' = 'delivered'): void {
    if (!this.websocket || !this.isConnected) return;

    try {
      const message = {
        type: 'delivery-status',
        appointmentId: this.config.appointmentId,
        messageId: String(messageId),
        status: status,
        senderId: this.config.userId
      };

      console.log('📊 [WebRTCChat] Sending delivery status:', message);
      this.websocket.send(JSON.stringify(message));
    } catch (error) {
      console.error('❌ [WebRTCChat] Failed to send delivery status:', error);
    }
  }

  // Send read receipt
  sendReadReceipt(messageId: string | number): void {
    if (!this.websocket || !this.isConnected) return;

    try {
      const message = {
        type: 'read-receipt',
        appointmentId: this.config.appointmentId,
        messageId: String(messageId),
        senderId: this.config.userId
      };

      console.log('📊 [WebRTCChat] Sending read receipt:', message);
      this.websocket.send(JSON.stringify(message));
    } catch (error) {
      console.error('❌ [WebRTCChat] Failed to send read receipt:', error);
    }
  }

  /**
   * Persist a message to the backend API in the background.
   * This ensures the UI is not blocked while waiting for slow API responses (e.g., push notifications).
   */
  private async persistToBackend(chatMessage: ChatMessage): Promise<void> {
    try {
      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.error('❌ [WebRTCChat] No auth token available to persist message to backend');
        return;
      }

      const apiUrl = `${this.config.baseUrl}/api/chat/${this.config.appointmentId}/messages`;
      console.log(`📤 [WebRTCChat] Background persisting ${chatMessage.message_type} message to backend:`, apiUrl);

      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: chatMessage.message,
          message_type: chatMessage.message_type,
          media_url: chatMessage.media_url,
          temp_id: chatMessage.temp_id || chatMessage.id,
          id: chatMessage.id, // Explicitly send the ID we generated
        }),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('❌ [WebRTCChat] Backend persist failed:', resp.status, errorText);
      } else {
        const json = await resp.json().catch(() => null);
        if (json?.success) {
          console.log(`✅ [WebRTCChat] Backend persisted ${chatMessage.message_type} message successfully:`, json.data?.id);

          // If backend returned a real database ID, update our local one
          if (json.data?.id && json.data.id !== chatMessage.id) {
            const oldId = chatMessage.id;
            const newId = json.data.id;

            // Update in-memory count
            const messageIndex = this.messages.findIndex(m => m.id === oldId || m.temp_id === oldId);
            if (messageIndex >= 0) {
              this.messages[messageIndex].id = newId;
              this.messages[messageIndex].temp_id = undefined;
              this.messages[messageIndex].delivery_status = 'delivered';
              await this.saveMessages();

              // Notify UI of the ID change
              this.events.onMessage(this.messages[messageIndex]);
            }
          }
        } else {
          console.warn('⚠️ [WebRTCChat] Backend persist returned non-success:', json);
        }
      }
    } catch (error) {
      console.error('❌ [WebRTCChat] Unexpected error in background persistence:', error);
    }
  }

  // Get auth token for API calls
  private async getAuthToken(): Promise<string> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      console.log('🔑 [WebRTCChat] Retrieved auth token:', token ? 'Present' : 'Missing');
      return token || '';
    } catch (error) {
      console.error('❌ [WebRTCChat] Failed to get auth token:', error);
      return '';
    }
  }

  // Create a unique hash for message deduplication based on content and sender
  private createMessageHash(message: any): string {
    const content = message.content || message.message || '';
    const senderId = message.senderId || message.sender_id || '';
    const timestamp = message.createdAt || message.created_at || message.timestamp || '';
    const tempId = message.tempId || message.temp_id || '';

    // Create a precise hash based on content, sender, timestamp and tempId
    // High-precision timestamp (ISO string) is used to avoid collisions while keeping echoes matched
    const hash = `hash_${senderId}_${content.substring(0, 50)}_${timestamp}_${tempId}`;

    console.log('🔍 [WebRTCChat] Created high-precision message hash:', hash, 'for message:', tempId || message.id);
    return hash;
  }

  // Send session end notification to refresh both participants' chats
  async sendSessionEndNotification(reason: string = 'manual_end'): Promise<void> {
    if (!this.websocket || !this.isConnected) {
      console.error('❌ [WebRTCChat] Cannot send session end notification - WebSocket not connected');
      return;
    }

    try {
      const message = {
        type: 'session-ended',
        appointmentId: this.config.appointmentId,
        reason: reason,
        endedAt: new Date().toISOString(),
        triggeredBy: this.config.userId
      };

      console.log('📤 [WebRTCChat] Sending session end notification:', message);
      this.websocket.send(JSON.stringify(message));
      console.log('✅ [WebRTCChat] Session end notification sent successfully');
    } catch (error) {
      console.error('❌ [WebRTCChat] Failed to send session end notification:', error);
      throw error;
    }
  }

  // Request session status to refresh chat data
  requestSessionStatus(): void {
    if (!this.websocket || !this.isConnected) {
      console.error('❌ [WebRTCChat] Cannot request session status - WebSocket not connected');
      return;
    }

    try {
      const message = {
        type: 'session-status-request',
        appointmentId: this.config.appointmentId
      };

      console.log('📤 [WebRTCChat] Requesting session status:', message);
      this.websocket.send(JSON.stringify(message));
      console.log('✅ [WebRTCChat] Session status request sent successfully');
    } catch (error) {
      console.error('❌ [WebRTCChat] Failed to request session status:', error);
    }
  }
}
