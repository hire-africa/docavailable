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
          activities.push({
            id: `appointment_${appointment.id || index}`,
            type: 'appointment',
            title: `Appointment with Dr. ${appointment.doctor_name || 'Doctor'}`,
            description: `Scheduled for ${new Date(appointment.appointment_date || Date.now()).toLocaleDateString()}`,
            timestamp: new Date(appointment.created_at || Date.now()),
            icon: 'calendarCheck',
            color: '#4CAF50'
          });
        }
      });
    }

    // Add subscription activities
    if (subscription) {
      activities.push({
        id: `subscription_${subscription.id || 'current'}`,
        type: 'subscription',
        title: 'Active Subscription',
        description: `Plan: ${subscription.plan_name || 'Premium'}`,
        timestamp: new Date(subscription.created_at || Date.now()),
        icon: 'checkmark',
        color: '#4CAF50'
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
        color: '#FF6B6B'
      });
    }

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
            color: status === 'Confirmed' ? '#4CAF50' : status === 'Pending' ? '#FF9500' : '#2196F3'
          });
        }
      });
    }

    // Add wallet activities if available
    if (userData?.wallet_balance !== undefined) {
      activities.push({
        id: `wallet_${userData.id}`,
        type: 'wallet',
        title: 'Wallet Balance',
        description: `Current balance: $${userData.wallet_balance || 0}`,
        timestamp: new Date(),
        icon: 'money',
        color: '#4CAF50'
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
        color: '#9C27B0'
      });
    });
  }

  // Sort activities by timestamp (newest first)
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}