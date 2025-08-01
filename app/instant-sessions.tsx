import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';

interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
  specialization: string;
  years_of_experience: number;
  professional_bio: string;
  last_online_at: string;
}

interface SessionInfo {
  session_id: number;
  doctor: {
    id: number;
    name: string;
    specialization: string;
    response_time: number;
  };
  session_info: {
    started_at: string;
    total_duration_minutes: number;
    sessions_used: number;
    sessions_remaining: number;
  };
}

export default function InstantSessionsScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSession, setActiveSession] = useState<SessionInfo | null>(null);
  const [startingSession, setStartingSession] = useState(false);

  const fetchAvailableDoctors = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/text-sessions/available-doctors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDoctors(data.data);
      } else {
        console.error('Failed to fetch available doctors');
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const checkActiveSession = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/text-sessions/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.data);
      } else if (response.status === 404) {
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  };

  const startSession = async (doctorId: number) => {
    setStartingSession(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/text-sessions/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doctor_id: doctorId }),
      });

      const data = await response.json();

      if (response.ok) {
        setActiveSession(data.data);
        Alert.alert(
          'Session Started!',
          `You can now send one message to Dr. ${data.data.doctor.name}. The doctor will respond within 90 seconds.`,
          [
            {
              text: 'Go to Chat',
              onPress: () => {
                const chatId = `text_session_${data.data.session_id}`;
                router.push(`/chat/${chatId}`);
              },
            },
            {
              text: 'Stay Here',
              style: 'cancel',
            },
          ]
        );
      } else {
        // Handle specific error cases
        if (response.status === 400 && data.message?.includes('already have an active session')) {
          Alert.alert(
            'Active Session Found', 
            'You already have an active text session. Please check your messages or wait for the current session to end before starting a new one.',
            [
              {
                text: 'View Messages',
                onPress: () => {
                  // Navigate to messages tab
                  router.push('/patient-dashboard?tab=messages');
                }
              },
              {
                text: 'Stay Here',
                style: 'cancel'
              }
            ]
          );
        } else {
          Alert.alert('Error', data.message || 'Failed to start session');
        }
      }
    } catch (error) {
      console.error('Error starting session:', error);
      Alert.alert('Error', 'Failed to start session. Please try again.');
    } finally {
      setStartingSession(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchAvailableDoctors(), checkActiveSession()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading available doctors...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Instant Text Sessions</Text>
        <Text style={styles.subtitle}>
          Connect with online doctors instantly
        </Text>
      </View>

      {activeSession && (
        <View style={styles.activeSessionCard}>
          <View style={styles.activeSessionHeader}>
                            <Text style={{ fontSize: 48, color: "#CCC" }}>💬</Text>
            <Text style={styles.activeSessionTitle}>Active Session</Text>
          </View>
          <Text style={styles.activeSessionText}>
            You are currently in a session with Dr. {activeSession.doctor.name}
          </Text>
          <Text style={styles.activeSessionText}>
            Remaining time: {activeSession.session_info.total_duration_minutes} minutes
          </Text>
          <TouchableOpacity
            style={styles.goToChatButton}
            onPress={() => router.push(`/chat/${activeSession.session_id}`)}
          >
            <Text style={styles.goToChatButtonText}>Continue Chat</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Doctors</Text>
        {doctors.length === 0 ? (
          <View style={styles.emptyState}>
                            <Text style={{ fontSize: 24, color: "#4CAF50" }}>🏥</Text>
            <Text style={styles.emptyStateText}>No doctors available right now</Text>
            <Text style={styles.emptyStateSubtext}>
              Check back later or try again in a few minutes
            </Text>
          </View>
        ) : (
          doctors.map((doctor) => (
            <View key={doctor.id} style={styles.doctorCard}>
              <View style={styles.doctorInfo}>
                <View style={styles.doctorHeader}>
                  <Text style={styles.doctorName}>
                    Dr. {doctor.first_name} {doctor.last_name}
                  </Text>
                  <View style={styles.onlineIndicator}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>Online</Text>
                  </View>
                </View>
                <Text style={styles.doctorSpecialization}>
                  {doctor.specialization}
                </Text>
                <Text style={styles.doctorExperience}>
                  {doctor.years_of_experience} years of experience
                </Text>
                {doctor.professional_bio && (
                  <Text style={styles.doctorBio} numberOfLines={2}>
                    {doctor.professional_bio}
                  </Text>
                )}
                <Text style={styles.lastSeen}>
                  Last seen: {new Date(doctor.last_online_at).toLocaleTimeString()}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.startSessionButton,
                  startingSession && styles.startSessionButtonDisabled,
                ]}
                onPress={() => startSession(doctor.id)}
                disabled={startingSession}
              >
                {startingSession ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Text style={{ fontSize: 20, color: "#4CAF50" }}>💬</Text>
                    <Text style={styles.startSessionButtonText}>Start Session</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How it works:</Text>
                 <View style={styles.infoItem}>
                               <Text style={{ fontSize: 20, color: "#4CAF50" }}>⏰</Text>
           <Text style={styles.infoText}>Each session is 10 minutes long</Text>
         </View>
         <View style={styles.infoItem}>
                               <Text style={{ fontSize: 20, color: "#4CAF50" }}>⚡</Text>
           <Text style={styles.infoText}>Doctors respond within 2 minutes</Text>
         </View>
         <View style={styles.infoItem}>
                               <Text style={{ fontSize: 20, color: "#4CAF50" }}>💳</Text>
           <Text style={styles.infoText}>Uses your subscription text sessions</Text>
         </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text,
  },
  header: {
    padding: 20,
    backgroundColor: '#4CAF50',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeSessionCard: {
    margin: 20,
    padding: 16,
    backgroundColor: Colors.success + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  activeSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeSessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.success,
    marginLeft: 8,
  },
  activeSessionText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  goToChatButton: {
    backgroundColor: Colors.success,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  goToChatButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  doctorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorInfo: {
    marginBottom: 16,
  },
  doctorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: 4,
  },
  onlineText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  doctorSpecialization: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
  },
  doctorExperience: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 8,
  },
  doctorBio: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  lastSeen: {
    fontSize: 12,
    color: Colors.gray,
  },
  startSessionButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  startSessionButtonDisabled: {
    opacity: 0.6,
  },
  startSessionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  infoSection: {
    margin: 20,
    padding: 16,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
}); 