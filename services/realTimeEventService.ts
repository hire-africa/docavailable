import { NotificationService } from './notificationService';

export interface RealTimeEvent {
  id: string;
  type: 'appointment' | 'session' | 'payment' | 'message' | 'system';
  action: 'created' | 'confirmed' | 'cancelled' | 'started' | 'ended' | 'completed' | 'received' | 'sent';
  title: string;
  description: string;
  timestamp: Date;
  data?: any;
  userId?: string;
  userType?: 'patient' | 'doctor';
}

export class RealTimeEventService {
  private static listeners: ((event: RealTimeEvent) => void)[] = [];

  /**
   * Subscribe to real-time events
   */
  static subscribe(listener: (event: RealTimeEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Emit a real-time event
   */
  private static emit(event: RealTimeEvent) {
    console.log('📡 [RealTimeEvent] Emitting event:', event);
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Handle appointment events
   */
  static async handleAppointmentEvent(
    action: 'created' | 'confirmed' | 'cancelled' | 'completed',
    appointmentData: any,
    userType: 'patient' | 'doctor'
  ) {
    const event: RealTimeEvent = {
      id: `appointment_${action}_${appointmentData.id}_${Date.now()}`,
      type: 'appointment',
      action,
      title: this.getAppointmentTitle(action, appointmentData, userType),
      description: this.getAppointmentDescription(action, appointmentData, userType),
      timestamp: new Date(),
      data: appointmentData,
      userId: userType === 'patient' ? appointmentData.patient_id : appointmentData.doctor_id,
      userType
    };

    // Add to activities
    this.addToActivities(event);
    
    // Add to notifications
    await this.addToNotifications(event);
    
    // Emit event
    this.emit(event);
  }

  /**
   * Handle session events
   */
  static async handleSessionEvent(
    action: 'started' | 'ended' | 'completed',
    sessionData: any,
    userType: 'patient' | 'doctor'
  ) {
    const event: RealTimeEvent = {
      id: `session_${action}_${sessionData.id}_${Date.now()}`,
      type: 'session',
      action,
      title: this.getSessionTitle(action, sessionData, userType),
      description: this.getSessionDescription(action, sessionData, userType),
      timestamp: new Date(),
      data: sessionData,
      userId: userType === 'patient' ? sessionData.patient_id : sessionData.doctor_id,
      userType
    };

    // Add to activities
    this.addToActivities(event);
    
    // Add to notifications
    await this.addToNotifications(event);
    
    // Emit event
    this.emit(event);
  }

  /**
   * Handle payment events
   */
  static async handlePaymentEvent(
    action: 'received' | 'processed' | 'deducted',
    paymentData: any,
    userType: 'patient' | 'doctor'
  ) {
    const event: RealTimeEvent = {
      id: `payment_${action}_${paymentData.id || Date.now()}_${Date.now()}`,
      type: 'payment',
      action,
      title: this.getPaymentTitle(action, paymentData, userType),
      description: this.getPaymentDescription(action, paymentData, userType),
      timestamp: new Date(),
      data: paymentData,
      userId: paymentData.user_id,
      userType
    };

    // Add to activities
    this.addToActivities(event);
    
    // Add to notifications
    await this.addToNotifications(event);
    
    // Emit event
    this.emit(event);
  }

  /**
   * Handle message events
   */
  static async handleMessageEvent(
    action: 'sent' | 'received',
    messageData: any,
    userType: 'patient' | 'doctor'
  ) {
    const event: RealTimeEvent = {
      id: `message_${action}_${messageData.id}_${Date.now()}`,
      type: 'message',
      action,
      title: this.getMessageTitle(action, messageData, userType),
      description: this.getMessageDescription(action, messageData, userType),
      timestamp: new Date(),
      data: messageData,
      userId: userType === 'patient' ? messageData.patient_id : messageData.doctor_id,
      userType
    };

    // Add to activities
    this.addToActivities(event);
    
    // Add to notifications
    await this.addToNotifications(event);
    
    // Emit event
    this.emit(event);
  }

  /**
   * Add event to activities
   */
  private static addToActivities(event: RealTimeEvent) {
    // This will be handled by the component that subscribes to events
    console.log('📱 [RealTimeEvent] Adding to activities:', event);
  }

  /**
   * Add event to notifications
   */
  private static async addToNotifications(event: RealTimeEvent) {
    try {
      await NotificationService.addNotification({
        type: event.type as any,
        title: event.title,
        message: event.description,
        actionUrl: this.getActionUrl(event.type, event.action),
        recipientType: 'specific',
        recipientId: event.userId,
        sentBy: 'System'
      });
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  }

  // Helper methods for generating titles and descriptions
  private static getAppointmentTitle(action: string, data: any, userType: string): string {
    switch (action) {
      case 'created':
        return userType === 'patient' ? 'Appointment Requested' : 'New Appointment Request';
      case 'confirmed':
        return userType === 'patient' ? 'Appointment Confirmed' : 'Appointment Confirmed';
      case 'cancelled':
        return userType === 'patient' ? 'Appointment Cancelled' : 'Appointment Cancelled';
      case 'completed':
        return userType === 'patient' ? 'Appointment Completed' : 'Appointment Completed';
      default:
        return 'Appointment Update';
    }
  }

  private static getAppointmentDescription(action: string, data: any, userType: string): string {
    const doctorName = data.doctor_name || 'Dr. ' + (data.doctor?.first_name || 'Doctor');
    const patientName = data.patient_name || data.patient?.first_name || 'Patient';
    const date = new Date(data.appointment_date || data.date).toLocaleDateString();
    
    switch (action) {
      case 'created':
        return userType === 'patient' 
          ? `Your appointment request with ${doctorName} for ${date} has been sent`
          : `New appointment request from ${patientName} for ${date}`;
      case 'confirmed':
        return userType === 'patient'
          ? `Your appointment with ${doctorName} on ${date} has been confirmed`
          : `You confirmed the appointment with ${patientName} for ${date}`;
      case 'cancelled':
        return userType === 'patient'
          ? `Your appointment with ${doctorName} on ${date} has been cancelled`
          : `Appointment with ${patientName} for ${date} has been cancelled`;
      case 'completed':
        return userType === 'patient'
          ? `Your appointment with ${doctorName} on ${date} has been completed`
          : `Appointment with ${patientName} for ${date} has been completed`;
      default:
        return 'Appointment status updated';
    }
  }

  private static getSessionTitle(action: string, data: any, userType: string): string {
    switch (action) {
      case 'started':
        return userType === 'patient' ? 'Session Started' : 'Patient Started Session';
      case 'ended':
        return userType === 'patient' ? 'Session Ended' : 'Session Ended';
      case 'completed':
        return userType === 'patient' ? 'Session Completed' : 'Session Completed';
      default:
        return 'Session Update';
    }
  }

  private static getSessionDescription(action: string, data: any, userType: string): string {
    const doctorName = data.doctor_name || 'Dr. ' + (data.doctor?.first_name || 'Doctor');
    const patientName = data.patient_name || data.patient?.first_name || 'Patient';
    const sessionType = data.type || 'consultation';
    
    switch (action) {
      case 'started':
        return userType === 'patient'
          ? `Your ${sessionType} session with ${doctorName} has started`
          : `${patientName} started a ${sessionType} session`;
      case 'ended':
        return userType === 'patient'
          ? `Your ${sessionType} session with ${doctorName} has ended`
          : `Session with ${patientName} has ended`;
      case 'completed':
        return userType === 'patient'
          ? `Your ${sessionType} session with ${doctorName} has been completed`
          : `Session with ${patientName} has been completed`;
      default:
        return 'Session status updated';
    }
  }

  private static getPaymentTitle(action: string, data: any, userType: string): string {
    switch (action) {
      case 'received':
        return userType === 'doctor' ? 'Payment Received' : 'Payment Processed';
      case 'processed':
        return 'Payment Processed';
      case 'deducted':
        return 'Session Deducted';
      default:
        return 'Payment Update';
    }
  }

  private static getPaymentDescription(action: string, data: any, userType: string): string {
    const amount = data.amount || data.payment_amount || 0;
    
    switch (action) {
      case 'received':
        return userType === 'doctor'
          ? `You received $${amount} for completed session(s)`
          : `Payment of $${amount} has been processed`;
      case 'processed':
        return `Payment of $${amount} has been processed successfully`;
      case 'deducted':
        return `One session has been deducted from your plan`;
      default:
        return 'Payment status updated';
    }
  }

  private static getMessageTitle(action: string, data: any, userType: string): string {
    return action === 'sent' ? 'Message Sent' : 'New Message';
  }

  private static getMessageDescription(action: string, data: any, userType: string): string {
    const doctorName = data.doctor_name || 'Dr. ' + (data.doctor?.first_name || 'Doctor');
    const patientName = data.patient_name || data.patient?.first_name || 'Patient';
    
    if (action === 'sent') {
      return userType === 'patient'
        ? `Message sent to ${doctorName}`
        : `Message sent to ${patientName}`;
    } else {
      return userType === 'patient'
        ? `New message from ${doctorName}`
        : `New message from ${patientName}`;
    }
  }

  private static getActionUrl(type: string, action: string): string | undefined {
    switch (type) {
      case 'appointment':
        return '/my-appointments';
      case 'session':
        return '/messages';
      case 'payment':
        return '/earnings';
      case 'message':
        return '/messages';
      default:
        return undefined;
    }
  }
}
