import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { environment } from '../../config/environment';
import ImageMessage from '../../components/ImageMessage';
import VoiceMessagePlayer from '../../components/VoiceMessagePlayer';
import { SwipeableMessage } from '../../components/SwipeableMessage';
import { EndedSession, endedSessionStorageService } from '../../services/endedSessionStorageService';
import { withDoctorPrefix } from '../../utils/name';

interface Message {
  id: string | number;
  message: string;
  sender_id: number;
  sender_name?: string;
  created_at: string;
  message_type?: string;
  media_url?: string;
  delivery_status?: string;
  reactions?: any[];
  replyTo?: any;
}

import { useSecureScreen } from '../../hooks/useSecureScreen';

export default function EndedSessionPage() {
  // Enable screenshot prevention for viewing ended sessions
  useSecureScreen('Ended Session');
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<EndedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

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
          <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
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

  // Determine if current user is patient or doctor
  const isPatient = user?.user_type === 'patient';
  const currentUserId = user?.id || 0;
  
  // Determine other participant info
  const otherParticipantName = isPatient 
    ? (session.doctor_name || 'Doctor')
    : (session.patient_name || 'Patient');
  const otherParticipantProfilePicture = isPatient
    ? (session.doctor_profile_picture_url || session.doctor_profile_picture)
    : (user?.profile_picture_url || user?.profile_picture);

  // Format messages to match live chat format
  const messages: Message[] = (session.messages || []).map((msg: any) => {
    let mediaUrl = msg.media_url || msg.server_media_url || msg.audio_url || msg.voice_url;
    
    // CRITICAL FIX: Always convert to full URL if not already
    if (mediaUrl && !mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://') && !mediaUrl.startsWith('file://')) {
      // It's a relative path - construct full URL based on message type
      if (msg.message_type === 'voice' || msg.message_type === 'audio') {
        // Voice messages: path format is chat_voice_messages/{appointmentId}/voice_xxx.m4a
        let path = mediaUrl;
        
        // Extract path if it contains /api/audio/ (remove the /api/audio/ prefix)
        if (path.includes('/api/audio/')) {
          path = path.split('/api/audio/')[1];
        } else if (path.startsWith('/api/audio/')) {
          // Handle case where path starts with /api/audio/
          path = path.replace('/api/audio/', '');
        } else if (path.startsWith('api/audio/')) {
          // Handle case where path starts with api/audio/ (no leading slash)
          path = path.replace('api/audio/', '');
        }
        
        // Remove any leading slashes
        path = path.replace(/^\/+/, '');
        
        // Ensure path starts with chat_voice_messages/
        if (!path.startsWith('chat_voice_messages/')) {
          const sessionId = parseInt(appointmentId, 10);
          if (sessionId && !isNaN(sessionId)) {
            // If path is just a filename, prepend the folder structure
            if (!path.includes('/')) {
              path = `chat_voice_messages/${sessionId}/${path}`;
            } else {
              // Path might be missing the chat_voice_messages prefix
              path = `chat_voice_messages/${sessionId}/${path.split('/').pop()}`;
            }
          } else {
            path = `chat_voice_messages/${path}`;
          }
        }
        
        // Construct full URL using Laravel API URL
        mediaUrl = `${environment.LARAVEL_API_URL}/api/audio/${path}`;
      } else if (msg.message_type === 'image') {
        // Images: similar logic
        let path = mediaUrl;
        if (path.includes('/api/images/')) {
          path = path.split('/api/images/')[1];
        }
        if (!path.startsWith('chat_images/')) {
          const sessionId = parseInt(appointmentId, 10);
          if (sessionId && !isNaN(sessionId)) {
            path = `chat_images/${sessionId}/${path}`;
          } else {
            path = `chat_images/${path}`;
          }
        }
        mediaUrl = `${environment.LARAVEL_API_URL}/api/images/${path}`;
      } else if (mediaUrl.startsWith('/api/')) {
        // Absolute path starting with /api/
        mediaUrl = `${environment.LARAVEL_API_URL}${mediaUrl}`;
      } else if (mediaUrl.startsWith('/')) {
        // Absolute path starting with /
        mediaUrl = `${environment.LARAVEL_API_URL}/api${mediaUrl}`;
      }
    }
    // If it's already a full URL (http/https), use it as-is (same as live chat)

    return {
      id: msg.id || msg.temp_id || `msg_${Date.now()}_${Math.random()}`,
      message: msg.message || '',
      sender_id: msg.sender_id,
      sender_name: msg.sender_name,
      created_at: msg.created_at || msg.timestamp || new Date().toISOString(),
      message_type: msg.message_type || 'text',
      media_url: mediaUrl,
      delivery_status: msg.delivery_status || 'sent',
      reactions: msg.reactions,
      replyTo: msg.replyTo,
    };
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Background Wallpaper */}
        <Image
          source={require('../chat/white_wallpaper.jpg')}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            opacity: 0.8,
            zIndex: -1,
          }}
          resizeMode="cover"
        />
      
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
          borderBottomColor: '#E0E0E0',
        backgroundColor: '#fff',
      }}>
        <TouchableOpacity onPress={handleBackPress} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
          {/* Profile Picture and Name */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
            {otherParticipantProfilePicture ? (
            <Image 
                source={{ uri: otherParticipantProfilePicture }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  marginRight: 10,
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                }}
                resizeMode="cover"
            />
          ) : (
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#4CAF50',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
                borderWidth: 1,
                borderColor: '#E5E5E5',
              }}>
                <Ionicons name="person" size={18} color="#fff" />
            </View>
          )}
            <View style={{ flex: 1, justifyContent: 'center', minWidth: 0 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#333',
                  flexShrink: 1,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isPatient ? withDoctorPrefix(otherParticipantName) : otherParticipantName}
          </Text>
              <Text style={{
                fontSize: 12,
                color: '#999',
                marginTop: 2,
              }}>
            Session ended
          </Text>
            </View>
        </View>
      </View>

      {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 0,
          }}
          showsVerticalScrollIndicator={false}
        >
                     {/* End-to-End Encryption Message */}
           <View style={{
             backgroundColor: '#E8F5E9',
             borderRadius: 12,
             padding: 16,
             marginBottom: 16,
             flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
           }}>
             <Ionicons 
               name="shield-checkmark" 
               size={18} 
               color="#4CAF50" 
              style={{ marginRight: 8, marginTop: 1 }}
             />
             <Text style={{
              fontSize: 12,
               color: '#4CAF50',
               fontWeight: '500',
               flex: 1,
              lineHeight: 16,
             }}>
              Messages are end-to-end encrypted, only people in this chat can read, listen or share them.
             </Text>
           </View>

          {/* Messages */}
          {messages.length > 0 ? (
            messages.map((message, index) => {
              const uniqueKey = message.id ? `msg_${message.id}` : `fallback_${index}_${message.created_at}`;

              return (
                <SwipeableMessage
                  key={uniqueKey}
                  isSentByCurrentUser={message.sender_id === currentUserId}
                >
                  <View
                    style={{
                      alignSelf: message.sender_id === currentUserId ? 'flex-end' : 'flex-start',
                      marginBottom: 12,
                      maxWidth: '80%',
                    }}
                  >
                    {/* Reply reference */}
                    {message.replyTo && (
                      <View style={{
                        backgroundColor: message.sender_id === currentUserId ? '#3D9B5C' : '#E5E5E5',
                        paddingHorizontal: 12,
                        paddingTop: 8,
                        paddingBottom: 4,
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                        borderLeftWidth: 4,
                        borderLeftColor: message.sender_id === currentUserId ? '#2E7D47' : '#4CAF50',
                      }}>
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: message.sender_id === currentUserId ? '#FFFFFF' : '#4CAF50',
                          marginBottom: 2,
                        }}>
                          {message.replyTo.senderName || 'User'}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: message.sender_id === currentUserId ? 'rgba(255,255,255,0.9)' : '#666',
                          }}
                          numberOfLines={2}
                        >
                          {message.replyTo.message}
                        </Text>
                      </View>
                    )}

                    {/* Voice Message */}
                    {message.message_type === 'voice' && message.media_url ? (
                      <VoiceMessagePlayer
                        audioUri={message.media_url}
                        isOwnMessage={message.sender_id === currentUserId}
                        timestamp={new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        profilePictureUrl={
                          message.sender_id === currentUserId
                            ? (user?.profile_picture_url || user?.profile_picture || undefined)
                            : (otherParticipantProfilePicture || undefined)
                        }
                      />
                    ) : message.message_type === 'image' && message.media_url ? (
                      /* Image Message */
                      <ImageMessage
                        imageUrl={message.media_url}
                        isOwnMessage={message.sender_id === currentUserId}
                        timestamp={new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        deliveryStatus={message.delivery_status}
                        appointmentId={appointmentId}
                        profilePictureUrl={
                          message.sender_id === currentUserId
                            ? (user?.profile_picture_url || user?.profile_picture || undefined)
                            : (otherParticipantProfilePicture || undefined)
                        }
                      />
                    ) : (
                      /* Text Message */
                      <View
                        style={{
                          backgroundColor: message.sender_id === currentUserId ? '#4CAF50' : '#F0F0F0',
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderRadius: message.replyTo ? 0 : 20,
                          borderBottomLeftRadius: message.sender_id === currentUserId ? 20 : 4,
                          borderBottomRightRadius: message.sender_id === currentUserId ? 4 : 20,
                          borderTopLeftRadius: message.replyTo ? 0 : 20,
                          borderTopRightRadius: message.replyTo ? 0 : 20,
                        }}
                      >
                        <Text
                          style={{
                            color: message.sender_id === currentUserId ? '#fff' : '#333',
                            fontSize: 16,
                          }}
                        >
                          {message.message}
                        </Text>
                        <Text style={{
                          fontSize: 11,
                          color: message.sender_id === currentUserId ? 'rgba(255,255,255,0.7)' : '#999',
                          marginTop: 4,
                          alignSelf: 'flex-end',
                        }}>
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                  </View>
                )}
              </View>
                </SwipeableMessage>
              );
            })
          ) : (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Ionicons name="chatbubbles-outline" size={48} color="#CCC" />
              <Text style={{ marginTop: 16, fontSize: 16, color: '#999' }}>No messages found</Text>
            </View>
          )}
        </ScrollView>

      {/* Disabled Input Area */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 12, // Extra padding for iOS home indicator
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        backgroundColor: '#fff',
      }}>
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
        
          <View style={{
             flex: 1,
             borderWidth: 1,
             borderColor: '#E5E5E5',
             borderRadius: 20,
             paddingHorizontal: 16,
             paddingVertical: 12,
            marginRight: 8,
            backgroundColor: '#F5F5F5',
          }}>
            <Text style={{
              color: '#999',
             fontSize: 16,
            }}>
              Session ended
            </Text>
          </View>
          
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
            <Ionicons name="send" size={20} color="#999" />
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
