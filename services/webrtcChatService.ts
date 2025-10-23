import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatConfig, ChatEvents, ChatMessage } from '../types/chat';
import { imageService } from './imageService';
import { mediaUploadQueueService } from './mediaUploadQueueService';
import { voiceRecordingService } from './voiceRecordingService';

export class WebRTCChatService {
  private config: ChatConfig;
  private events: ChatEvents;
  private websocket: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private messages: ChatMessage[] = [];
  private storageKey: string;
  private processedMessageHashes: Set<string> = new Set();
  private onTypingIndicator?: (isTyping: boolean) => void;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastPingTime = 0;
  private pingTimeout = 30000; // 30 seconds

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

  // Save messages to AsyncStorage
  private async saveMessages(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.messages));
      console.log('💾 [WebRTCChat] Saved messages to storage:', this.messages.length);
    } catch (error) {
      console.error('❌ [WebRTCChat] Error saving messages to storage:', error);
    }
  }

  // Add message and save to storage
  private async addMessage(message: ChatMessage): Promise<void> {
    // Check if message already exists to prevent duplicates
    const existingMessage = this.messages.find(msg => msg.id === message.id);
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
const base = this.config.webrtcConfig?.signalingUrl || 'wss://docavailable.org/chat-signaling';
        const wsUrl = `${base}?appointmentId=${encodeURIComponent(this.config.appointmentId)}&userId=${encodeURIComponent(String(this.config.userId))}&authToken=${encodeURIComponent(token || '')}`;
        console.log('🔌 [WebRTCChat] Connecting to WebRTC chat signaling:', wsUrl);
        console.log('🔌 [WebRTCChat] Config:', this.config);
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = async () => {
          console.log('✅ [WebRTCChat] WebRTC chat connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Start health monitoring
          this.startHealthCheck();
          
          // Auto-sync with server when connecting to ensure we have latest messages
          try {
            console.log('🔄 [WebRTCChat] Auto-syncing with server on connect...');
            await this.syncWithServer();
          } catch (error) {
            console.error('❌ [WebRTCChat] Auto-sync failed on connect:', error);
          }
          
          resolve();
        };
        
        this.websocket.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 [WebRTCChat] Message received:', data.type);
            console.log('📨 [WebRTCChat] Message data:', JSON.stringify(data, null, 2));
            
            // Handle session-ended messages for real-time notifications
            if (data.type === 'session-ended') {
              console.log('🏁 [WebRTCChat] Session ended message received:', data);
              if (this.events.onSessionEnded) {
                this.events.onSessionEnded(
                  this.config.appointmentId, 
                  data.reason || 'manual_end', 
                  this.config.sessionType || 'appointment'
                );
              }
              return;
            }
            
            // Ignore other session-related messages - these should be handled by the session service
            if (data.type === 'session-end-request' || 
                data.type === 'session-end-success' || 
                data.type === 'session-end-error' ||
                data.type === 'session-activated' ||
                data.type === 'session-expired' ||
                data.type === 'session-deduction' ||
                data.type === 'session-status-request' ||
                data.type === 'session-status') {
              console.log('📨 [WebRTCChat] Ignoring session-related message:', data.type);
              return;
            }
            
            if (data.type === 'chat-message' && (data.message || data.content)) {
              // Normalize shape whether nested under message or flattened
              const raw = data.message ? data.message : data;
              const messageId = String(raw.id ?? raw.temp_id ?? raw.tempId ?? `ws_${Date.now()}`);
              
              console.log('📨 [WebRTCChat] Processing WebSocket message:', {
                messageId,
                type: data.type,
                hasMessage: !!data.message,
                hasContent: !!data.content,
                rawId: raw.id,
                rawTempId: raw.temp_id,
                rawTempId2: raw.tempId
              });
              
              const normalized: ChatMessage = {
                id: messageId,
                sender_id: String(raw.sender_id ?? raw.senderId ?? ''),
                sender_name: raw.sender_name ?? raw.senderName ?? '',
                message: raw.message ?? raw.content ?? '',
                message_type: raw.message_type ?? raw.messageType ?? 'text',
                media_url: raw.media_url ?? raw.mediaUrl,
                created_at: raw.created_at ?? raw.createdAt ?? raw.timestamp ?? new Date().toISOString(),
                delivery_status: raw.delivery_status ?? 'delivered'
              };

              const messageHash = this.createMessageHash({
                message: normalized.message,
                sender_id: normalized.sender_id,
                created_at: normalized.created_at,
              } as any);
              console.log('📨 [WebRTCChat] Processing chat message:', normalized.id, 'hash:', messageHash);
              
              // Ensure processedMessageHashes is initialized
              if (!this.processedMessageHashes) {
                this.processedMessageHashes = new Set();
              }
              
              // Check if we've already processed this message (by hash)
              if (this.processedMessageHashes.has(messageHash)) {
                console.log('⚠️ [WebRTCChat] Message already processed, skipping duplicate:', messageHash);
                return;
              }
              
              console.log('📨 [WebRTCChat] Message sender ID:', normalized.sender_id, 'type:', typeof normalized.sender_id);
              console.log('📨 [WebRTCChat] Current user ID:', this.config.userId, 'type:', typeof this.config.userId);
              
              // Convert both IDs to strings for reliable comparison
              const senderIdStr = String(normalized.sender_id);
              const userIdStr = String(this.config.userId);
              
              console.log('🔍 [WebRTCChat] Debug - senderIdStr:', senderIdStr, 'userIdStr:', userIdStr);
              console.log('🔍 [WebRTCChat] Debug - comparison result:', senderIdStr === userIdStr);
              
              // Check if this is our own message - if so, ignore it to prevent duplication
              if (senderIdStr === userIdStr) {
                console.log('⚠️ [WebRTCChat] Received own message via WebSocket - ignoring to prevent duplication');
                return; // Don't process our own message from WebSocket
              } else {
                console.log('✅ [WebRTCChat] Received message from other participant');
                
                // Mark message as processed (by hash)
                this.processedMessageHashes.add(messageHash);
                
                // Store the message and trigger event for other participants' messages
                await this.addMessage(normalized);
                console.log('📨 [WebRTCChat] Triggering onMessage event for message:', normalized.id);
                this.events.onMessage(normalized);
              }
            } else if (data.type === 'typing-indicator') {
              console.log('⌨️ [WebRTCChat] Typing indicator received:', data.isTyping, 'from sender:', data.senderId);
              this.onTypingIndicator?.(data.isTyping, data.senderId);
            } else if (data.type === 'pong') {
              // Update last ping time when we receive pong
              this.lastPingTime = Date.now();
              console.log('🏓 [WebRTCChat] Pong received, connection healthy');
            }
          } catch (error) {
            console.error('❌ Error parsing WebRTC chat message:', error);
          }
        };
        
        this.websocket.onerror = (error) => {
          console.error('❌ [WebRTCChat] WebRTC chat error:', error);
          console.error('❌ [WebRTCChat] Error details:', {
            type: error.type,
            target: error.target?.url,
            readyState: error.target?.readyState
          });
          
          // Check if it's a connection error (HTTP 200 instead of 101)
          if (error.message && error.message.includes('Expected HTTP 101')) {
            console.error('❌ [WebRTCChat] WebSocket server not properly configured - getting HTTP 200 instead of 101');
            this.events.onError('WebSocket server not available. Using fallback mode.');
            // Don't try to reconnect if server is misconfigured
            reject(new Error('WebSocket server not properly configured'));
            return;
          }
          
          // Handle SSL/TLS connection errors with retry logic
          if (error.message && (
            error.message.includes('Connection reset by peer') ||
            error.message.includes('ssl') ||
            error.message.includes('TLS') ||
            error.message.includes('SSL')
          )) {
            console.warn('🔄 [WebRTCChat] SSL/TLS connection error detected, will retry...');
            this.events.onError('Connection error, retrying...');
            
            // Don't reject immediately for SSL errors, let reconnection handle it
            setTimeout(() => {
              if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.handleReconnect();
              } else {
                reject(new Error('SSL connection failed after multiple attempts'));
              }
            }, 2000);
            return;
          }
          
          this.events.onError('WebRTC connection error');
          reject(error);
        };
        
        this.websocket.onclose = (event) => {
          console.log('🔌 WebRTC chat disconnected:', event.code);
          this.isConnected = false;
          this.stopHealthCheck();
          
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.handleReconnect();
          }
        };
        
      } catch (error) {
        console.error('❌ Error creating WebRTC chat connection:', error);
        reject(error);
      }
    });
  }

  async sendMessage(message: string): Promise<ChatMessage | null> {
    if (!this.isConnected || !this.websocket) {
      throw new Error('WebRTC chat not connected');
    }

    // Generate a more unique message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get auth token for API calls
    const authToken = await this.getAuthToken();
    
    const messageData = {
      type: 'chat-message',
      content: message,
      messageType: 'text',
      senderId: this.config.userId,
      senderName: this.config.userName,
      tempId: messageId,
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sending'
    };

    try {
      console.log('📤 [WebRTCChat] Sending message:', messageId, 'to WebSocket with auth token');
      this.websocket.send(JSON.stringify(messageData));
      
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
        sender_id: this.config.userId,
        sender_name: this.config.userName,
        message: message,
        message_type: 'text',
        created_at: new Date().toISOString(),
        delivery_status: 'sending'
      };
      
      // Store the sent message locally and save to AsyncStorage
      await this.addMessage(chatMessage);
      
      // Trigger the onMessage event so the sender can see their own message immediately
      console.log('📤 [WebRTCChat] Triggering onMessage event for sent message:', messageId);
      if (this.events.onMessage) {
        this.events.onMessage(chatMessage);
        console.log('✅ [WebRTCChat] onMessage event triggered successfully for:', messageId);
      } else {
        console.error('❌ [WebRTCChat] onMessage function is not defined!');
      }
      
      console.log('📤 [WebRTCChat] Message sent successfully:', messageId);
      return chatMessage;
    } catch (error) {
      console.error('❌ [WebRTCChat] Failed to send message:', error);
      throw error;
    }
  }

  async sendVoiceMessage(audioUri: string, appointmentId: number | string): Promise<ChatMessage | null> {
    if (!this.isConnected || !this.websocket) {
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

      // Upload the voice file first
      const mediaUrl = await voiceRecordingService.uploadVoiceMessage(numericAppointmentId, audioUri);
      
      if (!mediaUrl) {
        throw new Error('Failed to upload voice message');
      }

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const authToken = await this.getAuthToken();
      
      const messageData = {
        type: 'chat-message',
        content: 'Voice message', // Placeholder text
        messageType: 'voice',
        senderId: this.config.userId,
        senderName: this.config.userName,
        mediaUrl: mediaUrl,
        tempId: messageId,
        createdAt: new Date().toISOString(),
        deliveryStatus: 'sending'
      };

      console.log('📤 [WebRTCChat] Sending voice message:', messageId);
      this.websocket.send(JSON.stringify(messageData));
      
      const messageHash = this.createMessageHash(messageData);
      this.processedMessageHashes.add(messageHash);
      
      // Convert to ChatMessage format for storage
      const chatMessage: ChatMessage = {
        id: messageId,
        sender_id: this.config.userId,
        sender_name: this.config.userName,
        message: 'Voice message',
        message_type: 'voice',
        media_url: mediaUrl,
        created_at: new Date().toISOString(),
        delivery_status: 'sending'
      };
      
      await this.addMessage(chatMessage);
      this.events.onMessage(chatMessage);

      // Also persist the voice message to the backend API for consistency and to ensure proper typing/media_url in history
      try {
        if (authToken) {
          const appointmentIdForApi = (typeof appointmentId === 'string') ? appointmentId : String(numericAppointmentId);
          const apiUrl = `${this.config.baseUrl}/api/chat/${appointmentIdForApi}/messages`;
          console.log('📤 [WebRTCChat] Persisting voice message to backend:', apiUrl);
          const resp = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: 'Voice message',
              message_type: 'voice',
              media_url: mediaUrl,
              temp_id: messageId,
            }),
          });
          if (!resp.ok) {
            console.warn('⚠️ [WebRTCChat] Backend persist returned non-OK:', resp.status);
          } else {
            const json = await resp.json().catch(() => null);
            console.log('✅ [WebRTCChat] Backend persisted voice message:', json?.success);
          }
        } else {
          console.warn('⚠️ [WebRTCChat] No auth token available to persist voice message to backend');
        }
      } catch (persistErr) {
        console.warn('⚠️ [WebRTCChat] Failed to persist voice message to backend:', persistErr);
      }
      
      console.log('📤 [WebRTCChat] Voice message sent successfully:', messageId);
      return chatMessage;
    } catch (error) {
      console.error('❌ [WebRTCChat] Failed to send voice message:', error);
      throw error;
    }
  }

  async sendImageMessage(imageUri: string, appointmentId: number | string): Promise<ChatMessage | null> {
    if (!this.isConnected || !this.websocket) {
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

      // Upload the image first
      const uploadResult = await imageService.uploadImage(numericAppointmentId, imageUri);
      
      if (!uploadResult.success || !uploadResult.mediaUrl) {
        throw new Error('Failed to upload image');
      }

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const authToken = await this.getAuthToken();
      
      const messageData = {
        type: 'chat-message',
        content: 'Image', // Placeholder text
        messageType: 'image',
        senderId: this.config.userId,
        senderName: this.config.userName,
        mediaUrl: uploadResult.mediaUrl,
        tempId: messageId,
        createdAt: new Date().toISOString(),
        deliveryStatus: 'sending'
      };

      console.log('📤 [WebRTCChat] Sending image message:', messageId);
      this.websocket.send(JSON.stringify(messageData));
      
      const messageHash = this.createMessageHash(messageData);
      this.processedMessageHashes.add(messageHash);
      
      // Convert to ChatMessage format for storage
      const chatMessage: ChatMessage = {
        id: messageId,
        sender_id: this.config.userId,
        sender_name: this.config.userName,
        message: 'Image',
        message_type: 'image',
        media_url: uploadResult.mediaUrl,
        created_at: new Date().toISOString(),
        delivery_status: 'sending'
      };
      
      await this.addMessage(chatMessage);
      this.events.onMessage(chatMessage);
      
      console.log('📤 [WebRTCChat] Image message sent successfully:', messageId);
      return chatMessage;
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
          sender_id: this.config.userId,
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
          sender_id: this.config.userId,
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
            message.message = progress.status === 'image' ? 'Image' : 'Voice message';
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
    try {
      console.log('🔄 [WebRTCChat] Syncing with server...');
      
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
      
      // Create a map of local messages by ID for quick lookup
      const localMessageMap = new Map(this.messages.map(msg => [msg.id, msg]));
      
      // Add server messages that aren't already in local storage
      const newMessages = serverMessages.filter(serverMsg => !localMessageMap.has(serverMsg.id));
      
      if (newMessages.length > 0) {
        console.log('✅ [WebRTCChat] Found', newMessages.length, 'new messages from server');
        
        // Add new messages to local storage
        for (const message of newMessages) {
          await this.addMessage(message);
        }
      } else {
        console.log('✅ [WebRTCChat] No new messages from server');
      }
      
      return this.messages;
    } catch (error) {
      console.error('❌ [WebRTCChat] Error syncing with server:', error);
      return this.messages;
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
    if (this.websocket) {
      this.websocket.close(1000, 'Normal closure');
      this.websocket = null;
    }
    this.isConnected = false;
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ [WebRTCChat] Max reconnection attempts reached');
      this.events.onError('Connection lost. Please refresh the session.');
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff with jitter for better reconnection
    const baseDelay = this.reconnectDelay;
    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const finalDelay = Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
    
    console.log(`🔄 [WebRTCChat] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${Math.round(finalDelay)}ms...`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('❌ WebRTC chat reconnection failed:', error);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect();
        }
      });
    }, finalDelay);
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  private startHealthCheck(): void {
    this.stopHealthCheck();
    this.lastPingTime = Date.now();
    
    this.healthCheckInterval = setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        const now = Date.now();
        if (now - this.lastPingTime > this.pingTimeout) {
          console.warn('🔄 [WebRTCChat] Health check timeout, reconnecting...');
          this.handleReconnect();
        } else {
          // Send ping to keep connection alive
          try {
            this.websocket.send(JSON.stringify({ type: 'ping', timestamp: now }));
            this.lastPingTime = now;
          } catch (error) {
            console.error('❌ [WebRTCChat] Failed to send ping:', error);
            this.handleReconnect();
          }
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Set typing indicator callback
  setOnTypingIndicator(callback: (isTyping: boolean) => void): void {
    this.onTypingIndicator = callback;
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
    
    // Create a hash based on content, sender, and timestamp (rounded to nearest minute to handle small time differences)
    const timeRounded = new Date(timestamp).setSeconds(0, 0).toString();
    const hash = `${senderId}_${content}_${timeRounded}`;
    
    console.log('🔍 [WebRTCChat] Created message hash:', hash, 'for message:', message.tempId || message.id);
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
