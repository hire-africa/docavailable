import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import DoctorProfilePicture from '../../components/DoctorProfilePicture';
import { EndedSession, endedSessionStorageService } from '../../services/endedSessionStorageService';

interface Message {
  id: number;
  message: string;
  sender_id: number;
  sender_name: string;
  created_at: string;
  message_type?: string;
  media_url?: string;
}

export default function EndedSessionPage() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const [session, setSession] = useState<EndedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEndedSession();
  }, [appointmentId]);

  const loadEndedSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!appointmentId) {
        setError('No appointment ID provided');
        return;
      }

      const sessionId = parseInt(appointmentId, 10);
      const sessionData = await endedSessionStorageService.getEndedSession(sessionId);
      
      if (sessionData) {
        setSession(sessionData);
      } else {
        setError('Session not found');
      }
    } catch (err) {
      console.error('Error loading ended session:', err);
      setError('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number | undefined): string => {
    if (!minutes) return 'Unknown duration';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageItem,
      item.sender_id === session?.patient_id ? styles.myMessage : styles.otherMessage
    ]}>
      <Text style={styles.messageText}>{item.message}</Text>
      <Text style={styles.messageTime}>
        {new Date(item.created_at).toLocaleTimeString()}
      </Text>
      {item.media_url && (
        <View style={styles.mediaContainer}>
          <Text style={styles.mediaText}>📎 Attachment</Text>
        </View>
      )}
    </View>
  );

  const handleBackPress = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={{ marginTop: 10, color: '#666' }}>Loading session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <FontAwesome name="exclamation-triangle" size={48} color="#FF6B6B" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#666', textAlign: 'center' }}>
            {error || 'Session not found'}
          </Text>
          <TouchableOpacity 
            style={{ marginTop: 24, padding: 12, backgroundColor: '#4CAF50', borderRadius: 8 }}
            onPress={handleBackPress}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        backgroundColor: '#fff',
      }}>
        <TouchableOpacity onPress={handleBackPress} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        {/* Profile Picture */}
        <View style={{ marginRight: 12 }}>
          {session.doctor_profile_picture_url ? (
            <Image 
              source={{ uri: session.doctor_profile_picture_url }} 
              style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#4CAF50' }}
            />
          ) : session.doctor_profile_picture ? (
            <Image 
              source={{ uri: session.doctor_profile_picture }} 
              style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#4CAF50' }}
            />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#4CAF50' }}>
              <Ionicons name="person" size={20} color="#4CAF50" />
            </View>
          )}
        </View>
        
        {/* Name */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>
            {session.doctor_name || 'Doctor'}
          </Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            Session ended
          </Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
                     {/* End-to-End Encryption Message */}
           <View style={{
             backgroundColor: '#E8F5E9',
             borderRadius: 12,
             padding: 16,
             marginBottom: 16,
             flexDirection: 'row',
             alignItems: 'flex-start',
           }}>
             <Ionicons 
               name="shield-checkmark" 
               size={18} 
               color="#4CAF50" 
               style={{ marginRight: 8, marginTop: 2, flexShrink: 0 }}
             />
             <Text style={{
               fontSize: 14,
               color: '#4CAF50',
               fontWeight: '500',
               flex: 1,
               flexWrap: 'wrap',
             }}>
               End-to-end encrypted • Messages are secure
             </Text>
           </View>

          {/* Messages */}
          {session.messages && session.messages.length > 0 ? (
            session.messages.map((message) => (
              <View key={message.id} style={[
                styles.messageItem,
                message.sender_id === session.patient_id ? styles.myMessage : styles.otherMessage
              ]}>
                <Text style={styles.messageText}>{message.message}</Text>
                <Text style={styles.messageTime}>
                  {new Date(message.created_at).toLocaleTimeString()}
                </Text>
                {message.media_url && (
                  <View style={styles.mediaContainer}>
                    <Text style={styles.mediaText}>📎 Attachment</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyMessages}>
              <FontAwesome name="comments" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No messages found</Text>
            </View>
          )}

          {/* Session Info Card at the bottom */}
          <View style={styles.sessionInfoCard}>
            <View style={styles.doctorInfo}>
              <DoctorProfilePicture
                profilePictureUrl={session.doctor_profile_picture_url}
                profilePicture={session.doctor_profile_picture}
                size={50}
                name={session.doctor_name || 'Doctor'}
              />
              <View style={styles.doctorDetails}>
                <Text style={styles.doctorName}>{session.doctor_name}</Text>
                <Text style={styles.sessionReason}>{session.reason || 'General Checkup'}</Text>
              </View>
            </View>

            <View style={styles.sessionDetails}>
              <View style={styles.detailRow}>
                <FontAwesome name="calendar" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {formatDate(session.appointment_date)}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <FontAwesome name="clock-o" size={16} color="#666" />
                <Text style={styles.detailText}>
                  Duration: {formatDuration(session.session_duration)}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <FontAwesome name="comments" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {session.message_count} messages
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <FontAwesome name="calendar-check-o" size={16} color="#666" />
                <Text style={styles.detailText}>
                  Ended: {formatDate(session.ended_at)}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Disabled Input Area */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        backgroundColor: '#fff',
      }}>
        {/* Image Button - Disabled */}
        <TouchableOpacity
          disabled={true}
          style={{
            padding: 8,
            marginRight: 8,
            opacity: 0.3,
          }}
        >
          <Ionicons name="image" size={24} color="#999" />
        </TouchableOpacity>
        
        {/* Camera Button - Disabled */}
        <TouchableOpacity
          disabled={true}
          style={{
            padding: 8,
            marginRight: 8,
            opacity: 0.3,
          }}
        >
          <Ionicons name="camera" size={24} color="#999" />
        </TouchableOpacity>
        
                 {/* Text Input - Allows typing but can't send */}
         <TextInput
           placeholder="Session ended - messages disabled"
           style={{
             flex: 1,
             borderWidth: 1,
             borderColor: '#E5E5E5',
             borderRadius: 20,
             paddingHorizontal: 16,
             paddingVertical: 12,
             fontSize: 16,
             marginRight: 8,
             backgroundColor: '#fff',
           }}
           multiline
           editable={true}
         />
        
        {/* Send Button - Disabled */}
        <TouchableOpacity
          disabled={true}
          style={{
            backgroundColor: '#E5E5E5',
            borderRadius: 20,
            padding: 12,
            minWidth: 44,
            alignItems: 'center',
            opacity: 0.3,
          }}
        >
          <Ionicons name="mic" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  messageItem: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: '#4CAF50',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#E0E0E0',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  mediaContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
  },
  mediaText: {
    fontSize: 12,
    color: '#666',
  },
  emptyMessages: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  sessionInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 24,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  doctorDetails: {
    marginLeft: 16,
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sessionReason: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  sessionDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
});
