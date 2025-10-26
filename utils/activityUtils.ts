export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  color: string;
}

export function addRealtimeActivity(
  activities: Activity[],
  type: string,
  title: string,
  description?: string,
  icon?: string,
  color?: string
): Activity[] {
  const newActivity: Activity = {
    id: `realtime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    description: description || '',
    timestamp: new Date(),
    icon: icon || 'infoCircle',
    color: color || '#4CAF50'
  };

  return [newActivity, ...activities];
}

export function formatTimestamp(timestamp: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return timestamp.toLocaleDateString();
  }
}

export function generateUserActivities(
  userType: 'patient' | 'doctor',
  userData: any,
  appointments: any[],
  messages: any[],
  subscription: any
): Activity[] {
  const activities: Activity[] = [];

  // Generate activities based on user type
  if (userType === 'patient') {
    // Patient-specific activities
    if (appointments && appointments.length > 0) {
      appointments.forEach((appointment, index) => {
        if (index < 5) { // Limit to recent 5 appointments
          const status = appointment.status === 'confirmed' ? 'Confirmed' : 
                        appointment.status === 'pending' ? 'Pending' : 
                        appointment.status === 'cancelled' ? 'Cancelled' : 'Scheduled';
          
          activities.push({
            id: `appointment_${appointment.id || index}`,
            type: 'appointment',
            title: `${status} Appointment`,
            description: `Dr. ${appointment.doctor_name || 'Doctor'} - ${new Date(appointment.appointment_date || Date.now()).toLocaleDateString()}`,
            timestamp: new Date(appointment.created_at || Date.now()),
            icon: status === 'Confirmed' ? 'calendarCheck' : status === 'Pending' ? 'clock' : status === 'Cancelled' ? 'times' : 'calendar',
            color: status === 'Confirmed' ? '#4CAF50' : status === 'Pending' ? '#FF9800' : status === 'Cancelled' ? '#F44336' : '#2196F3'
          });
        }
      });
    }

    // Add subscription activities
    if (subscription) {
      activities.push({
        id: `subscription_${subscription.id || 'current'}`,
        type: 'subscription',
        title: 'Health Plan Active',
        description: `Plan: ${subscription.plan_name || 'Premium'} - ${subscription.isActive ? 'Active' : 'Inactive'}`,
        timestamp: new Date(subscription.created_at || Date.now()),
        icon: 'heart',
        color: subscription.isActive ? '#E91E63' : '#999'
      });
    }

    // Add general user activities
    if (userData?.created_at) {
      activities.push({
        id: `welcome_${userData.id}`,
        type: 'welcome',
        title: 'Welcome to DocAvailable!',
        description: 'Your account has been created successfully',
        timestamp: new Date(userData.created_at),
        icon: 'heart',
        color: '#E91E63'
      });
    }

    // Add admin notifications as activities
    activities.push({
      id: 'admin_notification_1',
      type: 'system',
      title: 'System Update',
      description: 'New features and improvements have been added to the app',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      icon: 'infoCircle',
      color: '#607D8B'
    });

    activities.push({
      id: 'admin_notification_2',
      type: 'system',
      title: 'Health Tips',
      description: 'Remember to stay hydrated and maintain regular exercise',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      icon: 'heart',
      color: '#E91E63'
    });

  } else if (userType === 'doctor') {
    // Doctor-specific activities
    if (appointments && appointments.length > 0) {
      appointments.forEach((appointment, index) => {
        if (index < 5) { // Limit to recent 5 appointments
          const status = appointment.status === 'confirmed' ? 'Confirmed' : 
                        appointment.status === 'pending' ? 'Pending' : 'New Request';
          
          activities.push({
            id: `appointment_${appointment.id || index}`,
            type: 'appointment',
            title: `${status} Appointment`,
            description: `Patient: ${appointment.patient_name || 'Unknown'}`,
            timestamp: new Date(appointment.created_at || Date.now()),
            icon: status === 'Confirmed' ? 'checkmark' : status === 'Pending' ? 'clock' : 'userMd',
            color: status === 'Confirmed' ? '#4CAF50' : status === 'Pending' ? '#FF9800' : '#2196F3'
          });
        }
      });
    }

    // Add wallet activities if available
    if (userData?.wallet_balance !== undefined) {
      activities.push({
        id: `wallet_${userData.id}`,
        type: 'wallet',
        title: 'Payment Received',
        description: `Current balance: $${userData.wallet_balance || 0}`,
        timestamp: new Date(),
        icon: 'dollar',
        color: '#FF9800'
      });
    }

    // Add general doctor activities
    if (userData?.created_at) {
      activities.push({
        id: `welcome_doctor_${userData.id}`,
        type: 'welcome',
        title: 'Welcome to DocAvailable!',
        description: 'Your doctor account is ready',
        timestamp: new Date(userData.created_at),
        icon: 'userMd',
        color: '#2196F3'
      });
    }

    // Add admin notifications for doctors
    activities.push({
      id: 'admin_notification_doctor_1',
      type: 'system',
      title: 'Platform Update',
      description: 'New consultation features and payment improvements available',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      icon: 'infoCircle',
      color: '#607D8B'
    });
  }

  // Add message activities if any
  if (messages && messages.length > 0) {
    messages.slice(0, 3).forEach((message, index) => {
      activities.push({
        id: `message_${message.id || index}`,
        type: 'message',
        title: 'New Message',
        description: message.content?.substring(0, 50) + '...' || 'You have a new message',
        timestamp: new Date(message.created_at || Date.now()),
        icon: 'message',
        color: '#2196F3'
      });
    });
  }

  // Add payment activities
  activities.push({
    id: 'payment_activity_1',
    type: 'payment',
    title: 'Payment Processed',
    description: 'Your recent transaction has been completed successfully',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    icon: 'dollar',
    color: '#FF9800'
  });

  // Add reminder activities
  activities.push({
    id: 'reminder_activity_1',
    type: 'reminder',
    title: 'Appointment Reminder',
    description: 'Your upcoming appointment is in 2 hours',
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    icon: 'clock',
    color: '#9C27B0'
  });

  // Sort activities by timestamp (newest first)
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}