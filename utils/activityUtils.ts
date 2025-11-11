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

    // Don't add fake activities - only real user data should show

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

    // Don't add fake activities - only real user data should show
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

  // Don't add fake payment/reminder activities - only real data should show

  // Sort activities by timestamp (newest first)
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}