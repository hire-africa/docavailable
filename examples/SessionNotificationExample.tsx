import React, { useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { SessionNotificationHandler } from '../services/sessionNotificationHandler';
import { SessionNotificationService } from '../services/sessionNotificationService';

/**
 * Example component showing how to use session notifications
 */
export const SessionNotificationExample: React.FC = () => {
  
  useEffect(() => {
    // Initialize session notification handlers when component mounts
    SessionNotificationHandler.initialize();
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  const testSessionStarted = async () => {
    try {
      await SessionNotificationService.sendSessionStartedNotification(
        {
          sessionId: 'demo-session-123',
          sessionType: 'text',
          doctorName: 'Dr. Demo Doctor',
          reason: 'General consultation'
        },
        'patient',
        'demo-patient-id'
      );
      
      Alert.alert('Success', 'Session started notification sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send notification');
      console.error('Notification error:', error);
    }
  };

  const testSessionEnded = async () => {
    try {
      await SessionNotificationService.sendSessionEndedNotification(
        {
          sessionId: 'demo-session-123',
          sessionType: 'text',
          doctorName: 'Dr. Demo Doctor'
        },
        'patient',
        'demo-patient-id',
        '15 minutes'
      );
      
      Alert.alert('Success', 'Session ended notification sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send notification');
      console.error('Notification error:', error);
    }
  };

  const testSessionReminder = async () => {
    try {
      await SessionNotificationService.sendSessionReminderNotification(
        {
          sessionId: 'demo-session-456',
          sessionType: 'video',
          doctorName: 'Dr. Demo Doctor',
          appointmentId: 'demo-appointment-789'
        },
        'patient',
        'demo-patient-id',
        5 // 5 minutes until start
      );
      
      Alert.alert('Success', 'Session reminder notification sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send notification');
      console.error('Notification error:', error);
    }
  };

  return (
    <View style={{ padding: 20, gap: 15 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Session Notification Testing
      </Text>
      
      <Button
        title="Test Session Started Notification"
        onPress={testSessionStarted}
      />
      
      <Button
        title="Test Session Ended Notification"
        onPress={testSessionEnded}
      />
      
      <Button
        title="Test Session Reminder Notification"
        onPress={testSessionReminder}
      />
      
      <Text style={{ marginTop: 20, fontSize: 14, color: '#666' }}>
        These buttons will test the session notification system.
        Check your notification panel and console logs.
      </Text>
    </View>
  );
};

export default SessionNotificationExample;
