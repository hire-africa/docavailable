import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatConfig, ChatEvents, ChatMessage } from '../types/chat';
import { imageService } from './imageService';
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

  constructor(config: ChatConfig, events: ChatEvents) {
    this.config = config;
    this.events = events;
    // Include session type in storage key to prevent conflicts between text sessions and appointments
    const sessionType = config.sessionType || 'appointment';
    this.storageKey = `webrtc_messages_${sessionType}_${config.appointmentId}`;
    this.processedMessageHashes = new Set();
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
        
        const wsUrl = `${this.config.webrtcConfig?.chatSignalingUrl || 'ws://46.101.123.123:8082/chat-signaling'}/${this.config.appointmentId}`;
        console.log('🔌 [WebRTCChat] Connecting to WebRTC chat signaling:', wsUrl);
        console.log('🔌 [WebRTCChat] Config:', this.config);
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = async () => {
          console.log('✅ [WebRTCChat] WebRTC chat connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
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
            
            // Ignore session-related messages - these should be handled by the session service
            if (data.type === 'session-end-request' || 
                data.type === 'session-end-success' || 
                data.type === 'session-end-error' ||
                data.type === 'session-ended' ||
                data.type === 'session-activated' ||
                data.type === 'session-expired' ||
                data.type === 'session-deduction' ||
                data.type === 'session-status-request' ||
                data.type === 'session-status') {
              console.log('📨 [WebRTCChat] Ignoring session-related message:', data.type);
              return;
            }
            
            if (data.type === 'chat-message' && data.message) {
              const messageId = data.message.id;
              const messageHash = this.createMessageHash(data.message);
              console.log('📨 [WebRTCChat] Processing chat message:', messageId, 'hash:', messageHash);
              
              // Ensure processedMessageHashes is initialized
              if (!this.processedMessageHashes) {
                this.processedMessageHashes = new Set();
              }
              
              // Check if we've already processed this message (by hash)
              if (this.processedMessageHashes.has(messageHash)) {
                console.log('⚠️ [WebRTCChat] Message already processed, skipping duplicate:', messageHash);
                return;
              }
              
              console.log('📨 [WebRTCChat] Message sender ID:', data.message.sender_id, 'type:', typeof data.message.sender_id);
              console.log('📨 [WebRTCChat] Current user ID:', this.config.userId, 'type:', typeof this.config.userId);
              
              // Convert both IDs to strings for reliable comparison
              const senderIdStr = String(data.message.sender_id);
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
                await this.addMessage(data.message);
                console.log('📨 [WebRTCChat] Triggering onMessage event for message:', data.message.id);
                this.events.onMessage(data.message);
              }
            } else if (data.type === 'typing-indicator') {
              console.log('⌨️ [WebRTCChat] Typing indicator received:', data.isTyping, 'from sender:', data.senderId);
              this.onTypingIndicator?.(data.isTyping, data.senderId);
            }
          } catch (error) {
            console.error('❌ Error parsing WebRTC chat message:', error);
          }
        };
        
        this.websocket.onerror = (error) => {
          console.error('❌ [WebRTCChat] WebRTC chat error:', error);
          this.events.onError('WebRTC connection error');
          reject(error);
        };
        
        this.websocket.onclose = (event) => {
          console.log('🔌 WebRTC chat disconnected:', event.code);
          this.isConnected = false;
          
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
      message: {
        id: messageId,
        sender_id: this.config.userId,
        sender_name: this.config.userName,
        message: message,
        message_type: 'text',
        created_at: new Date().toISOString(),
        delivery_status: 'sending'
      },
      authToken: authToken
    };

    try {
      console.log('📤 [WebRTCChat] Sending message:', messageId, 'to WebSocket with auth token');
      this.websocket.send(JSON.stringify(messageData));
      
      // Ensure processedMessageHashes is initialized
      if (!this.processedMessageHashes) {
        this.processedMessageHashes = new Set();
      }
      
      // Mark message as processed to prevent duplicates (by hash)
      const messageHash = this.createMessageHash(messageData.message);
      this.processedMessageHashes.add(messageHash);
      
      // Store the sent message locally and save to AsyncStorage
      await this.addMessage(messageData.message);
      
      // Trigger the onMessage event so the sender can see their own message immediately
      console.log('📤 [WebRTCChat] Triggering onMessage event for sent message:', messageId);
      this.events.onMessage(messageData.message);
      
      console.log('📤 [WebRTCChat] Message sent successfully:', messageId);
      return messageData.message;
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
        message: {
          id: messageId,
          sender_id: this.config.userId,
          sender_name: this.config.userName,
          message: 'Voice message', // Placeholder text
          message_type: 'voice',
          media_url: mediaUrl,
          created_at: new Date().toISOString(),
          delivery_status: 'sending'
        },
        authToken: authToken
      };

      console.log('📤 [WebRTCChat] Sending voice message:', messageId);
      this.websocket.send(JSON.stringify(messageData));
      
      const messageHash = this.createMessageHash(messageData.message);
      this.processedMessageHashes.add(messageHash);
      
      await this.addMessage(messageData.message);
      this.events.onMessage(messageData.message);
      
      console.log('📤 [WebRTCChat] Voice message sent successfully:', messageId);
      return messageData.message;
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
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error('Failed to upload image');
      }

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const authToken = await this.getAuthToken();
      
      const messageData = {
        type: 'chat-message',
        message: {
          id: messageId,
          sender_id: this.config.userId,
          sender_name: this.config.userName,
          message: 'Image', // Placeholder text
          message_type: 'image',
          media_url: uploadResult.url,
          created_at: new Date().toISOString(),
          delivery_status: 'sending'
        },
        authToken: authToken
      };

      console.log('📤 [WebRTCChat] Sending image message:', messageId);
      this.websocket.send(JSON.stringify(messageData));
      
      const messageHash = this.createMessageHash(messageData.message);
      this.processedMessageHashes.add(messageHash);
      
      await this.addMessage(messageData.message);
      this.events.onMessage(messageData.message);
      
      console.log('📤 [WebRTCChat] Image message sent successfully:', messageId);
      return messageData.message;
    } catch (error) {
      console.error('❌ [WebRTCChat] Failed to send image message:', error);
      throw error;
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
    if (this.websocket) {
      this.websocket.close(1000, 'Normal closure');
      this.websocket = null;
    }
    this.isConnected = false;
  }

  private handleReconnect(): void {
    this.reconnectAttempts++;
    console.log(`🔄 Attempting WebRTC chat reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('❌ WebRTC chat reconnection failed:', error);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect();
        }
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
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
    const content = message.message || '';
    const senderId = message.sender_id || '';
    const timestamp = message.created_at || message.timestamp || '';
    
    // Create a hash based on content, sender, and timestamp (rounded to nearest minute to handle small time differences)
    const timeRounded = new Date(timestamp).setSeconds(0, 0).toString();
    const hash = `${senderId}_${content}_${timeRounded}`;
    
    console.log('🔍 [WebRTCChat] Created message hash:', hash, 'for message:', message.id);
    return hash;
  }
}
