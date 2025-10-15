import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import DirectBookingModal from '../components/DirectBookingModal';
import SessionTypeSelectionModal, { SessionType } from '../components/SessionTypeSelectionModal';
import { environment } from '../config/environment';
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
  id: number;
  patient_id: number;
  doctor_id: number;
  status: string;
  started_at: string;
  ended_at: string | null;
  last_activity_at: string;
  sessions_used: number;
  sessions_remaining_before_start: number;
  reason: string | null;
  chat_id: number | null;
  created_at: string;
  updated_at: string;
  doctor: {
    id: number;
    first_name: string;
    last_name: string;
    specialization: string;
    years_of_experience: number;
    professional_bio: string;
    last_online_at: string;
  };
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
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
  const [showSessionTypeModal, setShowSessionTypeModal] = useState(false);
  const [showDirectBookingModal, setShowDirectBookingModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType>('text');

  const fetchAvailableDoctors = async () => {
    try {
      const response = await fetch(`${environment.LARAVEL_API_URL}/api/text-sessions/available-doctors`, {
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
      const response = await fetch(`${environment.LARAVEL_API_URL}/api/text-sessions/active-sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Get the first active session if any exist
        const activeSessionData = data.data && data.data.length > 0 ? data.data[0] : null;
        setActiveSession(activeSessionData);
      } else if (response.status === 404) {
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  };

  const handleStartSession = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setShowSessionTypeModal(true);
  };

  const handleSessionTypeSelect = (sessionType: SessionType) => {
    setSelectedSessionType(sessionType);
    setShowSessionTypeModal(false);
    setShowDirectBookingModal(true);
  };

  const startSession = async (reason: string, sessionType: SessionType) => {
    // Enhanced validation to ensure doctorId is always present
    if (!selectedDoctor) {
      console.error('❌ [InstantSessions] No doctor selected');
      Alert.alert('Error', 'Please select a doctor first');
      return;
    }
    
    if (!selectedDoctor.id || selectedDoctor.id <= 0) {
      console.error('❌ [InstantSessions] Invalid doctor ID:', selectedDoctor.id);
      Alert.alert('Error', 'Invalid doctor selected. Please try again.');
      return;
    }
    
    console.log('🔍 [InstantSessions] Starting session with doctor:', {
      doctorId: selectedDoctor.id,
      doctorName: `${selectedDoctor.first_name} ${selectedDoctor.last_name}`,
      sessionType,
      reason
    });
    
    setStartingSession(true);
    try {
      let endpoint = '';
      let requestBody: any = { reason };
      
      if (sessionType === 'text') {
        endpoint = '/api/text-sessions/start';
        requestBody.doctor_id = selectedDoctor.id;
      } else if (sessionType === 'audio') {
        endpoint = '/api/call-sessions/start';
        requestBody.call_type = 'voice'; // Backend expects 'voice' not 'audio'
        requestBody.appointment_id = `direct_session_${Date.now()}`;
        requestBody.doctor_id = selectedDoctor.id; // Pass doctor ID for direct sessions
      } else if (sessionType === 'video') {
        endpoint = '/api/call-sessions/start';
        requestBody.call_type = 'video';
        requestBody.appointment_id = `direct_session_${Date.now()}`;
        requestBody.doctor_id = selectedDoctor.id; // Pass doctor ID for direct sessions
      }

      const response = await fetch(`${environment.LARAVEL_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        setActiveSession(data.data);
        setShowDirectBookingModal(false);
        
        // Add real-time activity for session started
        const activityType = sessionType === 'text' ? 'text_session_started' : 
                           sessionType === 'audio' ? 'audio_session_started' : 
                           'video_session_started';
        
        // Note: We can't directly update activities here since this component doesn't have access to the dashboard state
        // The activity will be added when the user returns to the dashboard
        console.log(`[ActivitySystem] ${sessionType} session started with Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`);
        
        // Navigate to appropriate screen based on session type
        if (sessionType === 'text') {
          // Navigate directly to chat without showing alert
          const chatId = `text_session_${data.data.session_id}`;
          router.push(`/chat/${chatId}`);
        } else {
          // For audio/video calls, use the data from the call-sessions response
          const sessionData = data.data;
          const appointmentId = sessionData?.appointment_id || `direct_session_${Date.now()}`;
          
          // Double-check doctorId before navigation
          if (!selectedDoctor.id || selectedDoctor.id <= 0) {
            console.error('❌ [InstantSessions] Invalid doctorId during navigation:', selectedDoctor.id);
            Alert.alert('Error', 'Invalid doctor data. Please try again.');
            return;
          }
          
          console.log('🔍 [InstantSessions] Navigating to call with params:', {
            sessionId: appointmentId,
            doctorId: selectedDoctor.id,
            doctorName: `${selectedDoctor.first_name} ${selectedDoctor.last_name}`,
            callType: sessionType
          });
          
          router.push({
            pathname: '/call',
            params: {
              sessionId: appointmentId,
              doctorId: selectedDoctor.id,
              doctorName: `${selectedDoctor.first_name} ${selectedDoctor.last_name}`,
              doctorSpecialization: selectedDoctor.specialization,
              callType: sessionType,
              isDirectSession: 'true'
            }
          });
        }
      } else {
        // Handle specific error cases - all logged to console only
        if (response.status === 400 && data.message?.includes('already have an active session')) {
          console.log('Active Session Found: You already have an active session. Please check your messages or wait for the current session to end before starting a new one.');
          // Navigate to messages tab
          router.push('/patient-dashboard?tab=messages');
        } else {
          console.error('Error:', data.message || 'Failed to start session');
        }
      }
    } catch (error) {
      console.error('Error starting session:', error);
      // Session start error logged to console only - no modal shown
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
    <>
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
               You are currently in a session with Dr. {activeSession.doctor.first_name} {activeSession.doctor.last_name}
             </Text>
             <Text style={styles.activeSessionText}>
               Started: {new Date(activeSession.started_at).toLocaleString()}
             </Text>
             <TouchableOpacity
               style={styles.goToChatButton}
               onPress={() => router.push(`/chat/text_session_${activeSession.id}`)}
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
                  onPress={() => handleStartSession(doctor)}
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

      <SessionTypeSelectionModal
        visible={showSessionTypeModal}
        onClose={() => setShowSessionTypeModal(false)}
        onSelectSessionType={handleSessionTypeSelect}
        doctorName={selectedDoctor ? `${selectedDoctor.first_name} ${selectedDoctor.last_name}` : ''}
      />

      <DirectBookingModal
        visible={showDirectBookingModal}
        onClose={() => setShowDirectBookingModal(false)}
        onConfirm={startSession}
        doctorName={selectedDoctor ? `${selectedDoctor.first_name} ${selectedDoctor.last_name}` : ''}
        sessionType={selectedSessionType}
        loading={startingSession}
      />
    </>
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