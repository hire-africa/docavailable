/**
 * Patient Message Detection System - Client Integration Example
 * 
 * This file shows how to integrate with the patient message detection system
 * from the client side (React Native/Web applications).
 */

class PatientMessageDetectionClient {
  constructor(websocket, appointmentId, userId) {
    this.websocket = websocket;
    this.appointmentId = appointmentId;
    this.userId = userId;
    this.pendingMessages = new Map();
    this.setupMessageHandlers();
  }

  /**
   * Setup WebSocket message handlers for detection system
   */
  setupMessageHandlers() {
    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleDetectionMessage(data);
      } catch (error) {
        console.error('❌ Error parsing detection message:', error);
      }
    };
  }

  /**
   * Handle detection system messages
   */
  handleDetectionMessage(data) {
    switch (data.type) {
      case 'patient-message-pending':
        this.handlePatientMessagePending(data);
        break;
      case 'doctor-replied':
        this.handleDoctorReplied(data);
        break;
      case 'doctor-reply-success':
        this.handleDoctorReplySuccess(data);
        break;
      case 'doctor-reply-timeout':
        this.handleDoctorReplyTimeout(data);
        break;
      default:
        // Handle other message types
        break;
    }
  }

  /**
   * Handle when a patient message is pending doctor reply
   */
  handlePatientMessagePending(data) {
    console.log('👤 Patient message pending doctor reply:', data);
    
    // Store pending message
    this.pendingMessages.set(data.messageId, {
      ...data,
      receivedAt: new Date().toISOString()
    });

    // Show UI notification to doctor
    this.showDoctorNotification({
      title: 'Patient Message Pending',
      message: `Priority: ${data.priority.toUpperCase()}`,
      timeout: data.timeoutDuration,
      messageId: data.messageId
    });

    // Update UI to show pending status
    this.updatePendingMessagesUI();
  }

  /**
   * Handle when doctor replies to patient message
   */
  handleDoctorReplied(data) {
    console.log('👨‍⚕️ Doctor replied:', data);
    
    // Remove from pending messages
    this.pendingMessages.delete(data.messageId);
    
    // Show success notification
    this.showSuccessNotification({
      title: 'Reply Sent Successfully',
      message: 'Your reply was sent to the patient'
    });

    // Update UI
    this.updatePendingMessagesUI();
  }

  /**
   * Handle successful doctor reply (within timeout)
   */
  handleDoctorReplySuccess(data) {
    console.log('✅ Doctor reply success:', data);
    
    // Show success message
    this.showSuccessNotification({
      title: 'Reply Successful',
      message: `Replied to ${data.pendingMessagesCount} pending messages`
    });
  }

  /**
   * Handle doctor reply timeout
   */
  handleDoctorReplyTimeout(data) {
    console.log('⏰ Doctor reply timeout:', data);
    
    // Show timeout notification based on priority
    const notification = this.getTimeoutNotification(data);
    this.showTimeoutNotification(notification);

    // Update UI to show timeout status
    this.updateTimeoutUI(data);
  }

  /**
   * Get timeout notification based on priority
   */
  getTimeoutNotification(data) {
    switch (data.priority) {
      case 'critical':
        return {
          title: '🚨 CRITICAL TIMEOUT',
          message: 'Patient message timed out - Emergency escalation triggered',
          type: 'critical',
          actions: ['Escalate to Supervisor', 'Contact Backup Doctor']
        };
      case 'urgent':
        return {
          title: '⚠️ URGENT TIMEOUT',
          message: 'Patient message timed out - Supervisor notified',
          type: 'urgent',
          actions: ['Send Reminder', 'Contact Supervisor']
        };
      default:
        return {
          title: 'ℹ️ Reply Timeout',
          message: 'Patient message timed out - Gentle reminder sent',
          type: 'normal',
          actions: ['Send Gentle Reminder']
        };
    }
  }

  /**
   * Send a message with priority detection
   */
  sendMessage(message, options = {}) {
    const messageData = {
      type: 'chat-message',
      message: {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sender_id: this.userId,
        message: message,
        message_type: 'text',
        timestamp: new Date().toISOString(),
        // Add priority if specified
        ...(options.priority && { priority: options.priority })
      }
    };

    this.websocket.send(JSON.stringify(messageData));
    console.log('📤 Sent message with detection:', messageData);
  }

  /**
   * Send urgent message
   */
  sendUrgentMessage(message) {
    this.sendMessage(message, { priority: 'urgent' });
  }

  /**
   * Send critical message
   */
  sendCriticalMessage(message) {
    this.sendMessage(message, { priority: 'critical' });
  }

  /**
   * Get pending messages count
   */
  getPendingMessagesCount() {
    return this.pendingMessages.size;
  }

  /**
   * Get pending messages
   */
  getPendingMessages() {
    return Array.from(this.pendingMessages.values());
  }

  // UI Helper Methods (implement based on your UI framework)
  
  showDoctorNotification(notification) {
    // Implement based on your notification system
    console.log('🔔 Doctor Notification:', notification);
    // Example: showToast(notification.title, notification.message);
  }

  showSuccessNotification(notification) {
    // Implement based on your notification system
    console.log('✅ Success Notification:', notification);
    // Example: showSuccessToast(notification.message);
  }

  showTimeoutNotification(notification) {
    // Implement based on your notification system
    console.log('⏰ Timeout Notification:', notification);
    // Example: showAlert(notification.title, notification.message, notification.actions);
  }

  updatePendingMessagesUI() {
    // Update your UI to show pending messages
    console.log(`📋 Pending messages: ${this.pendingMessages.size}`);
    // Example: updatePendingMessagesBadge(this.pendingMessages.size);
  }

  updateTimeoutUI(data) {
    // Update UI to show timeout status
    console.log('⏰ Timeout UI update:', data);
    // Example: showTimeoutIndicator(data.messageId, data.priority);
  }
}

// Usage Examples:

// 1. Initialize detection client
const detectionClient = new PatientMessageDetectionClient(
  websocket, 
  'appointment_123', 
  'user_456'
);

// 2. Send normal message (will be detected as patient message)
detectionClient.sendMessage('Hello doctor, I have a question about my symptoms.');

// 3. Send urgent message
detectionClient.sendUrgentMessage('I need help ASAP with my medication side effects.');

// 4. Send critical message
detectionClient.sendCriticalMessage('EMERGENCY: I have severe chest pain and can\'t breathe!');

// 5. Check pending messages
console.log('Pending messages:', detectionClient.getPendingMessagesCount());

// 6. Get detection statistics
fetch('http://localhost:8080/detection-stats')
  .then(response => response.json())
  .then(stats => {
    console.log('Detection stats:', stats);
  });

// 7. Get pending messages for specific appointment
fetch('http://localhost:8080/pending-messages/appointment_123')
  .then(response => response.json())
  .then(data => {
    console.log('Pending messages for appointment:', data);
  });

export default PatientMessageDetectionClient;
