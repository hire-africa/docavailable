import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import DoctorProfilePicture from '../../components/DoctorProfilePicture';
import { environment } from '../../config/environment';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { stripDoctorPrefix, withDoctorPrefix } from '../../utils/name';
import { apiService } from '../services/apiService';

const { width } = Dimensions.get('window');

interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
  specialization: string;
  specializations?: string[];
  years_of_experience: number;
  professional_bio: string;
  profile_picture?: string;
  profile_picture_url?: string;
  is_online?: boolean;
  working_hours?: any;
  max_patients_per_day?: number;
  rating?: number;
  review_count?: number;
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

export default function DoctorProfileScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(false);
  const [activeSession, setActiveSession] = useState<SessionInfo | null>(null);

  const fetchDoctorProfile = async () => {
    try {
      const response = await apiService.get(`/doctors/${id}`);
      
      if (response.success && response.data) {
        setDoctor(response.data);
      } else {
        Alert.alert('Error', 'Failed to load doctor profile');
      }
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      Alert.alert('Error', 'Failed to load doctor profile');
    } finally {
      setLoading(false);
    }
  };

  const checkActiveSession = async () => {
    try {
      const response = await fetch(`${environment.LARAVEL_API_URL}/api/text-sessions/active`, {
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

  const startInstantSession = async () => {
    if (!doctor) return;

    setStartingSession(true);
    try {
      const response = await fetch(`${environment.LARAVEL_API_URL}/api/text-sessions/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doctor_id: doctor.id }),
      });

      const data = await response.json();

      if (response.ok) {
        setActiveSession(data.data);
        console.log(`Session Started: You are now connected with Dr. ${doctor.first_name} ${doctor.last_name}. Response time: ${data.data.doctor.response_time} minutes.`);
        // Navigate directly to chat without showing alert
        const chatId = `text_session_${data.data.session_id}`;
        router.push(`/chat/${chatId}`);
      } else {
        console.error('Error:', data.message || 'Failed to start session');
        // Session start error logged to console only - no modal shown
      }
    } catch (error) {
      console.error('Error starting session:', error);
      // Session start error logged to console only - no modal shown
    } finally {
      setStartingSession(false);
    }
  };

  const bookAppointment = () => {
    router.push(`/book-appointment/${doctor?.id}`);
  };

  useEffect(() => {
    fetchDoctorProfile();
    checkActiveSession();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading doctor profile...</Text>
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="medical" size={48} color={Colors.gray} />
        <Text style={styles.errorText}>Doctor not found</Text>
      </View>
    );
  }

  const isOnline = doctor.is_online;
  const canStartSession = isOnline && !activeSession && user?.role === 'patient';
  const showTalkNowButton = user?.role === 'patient' && !activeSession;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <DoctorProfilePicture
                profilePictureUrl={doctor.profile_picture_url}
                profilePicture={doctor.profile_picture}
                size={120}
                name={stripDoctorPrefix(`${doctor.first_name} ${doctor.last_name}`)}
                style={styles.profileImage}
              />
            <View style={styles.profileInfo}>
              <Text style={styles.doctorName}>
                {withDoctorPrefix(`${doctor.first_name} ${doctor.last_name}`)}
              </Text>
              {Array.isArray(doctor.specializations) && doctor.specializations.length > 0 ? (
                <View style={styles.specializationChipsContainer}>
                  {doctor.specializations.map((spec, idx) => (
                    <View key={`${spec}-${idx}`} style={styles.specializationChip}>
                      <Text style={styles.specializationChipText}>{spec}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.specialization}>{doctor.specialization}</Text>
              )}
              <Text style={styles.experience}>
                {doctor.years_of_experience} years of experience
              </Text>
              {doctor.rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color={Colors.warning} />
                  <Text style={styles.rating}>
                    {doctor.rating ? doctor.rating.toFixed(1) : '0.0'} ({doctor.review_count || 0} reviews)
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Online Status */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: isOnline ? Colors.success : Colors.gray }]}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.success : Colors.gray }]} />
              <Text style={[styles.statusText, { color: isOnline ? Colors.success : Colors.gray }]}>
                {isOnline ? 'Online Now' : 'Offline'}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {showTalkNowButton && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.talkNowButton,
                  !canStartSession && styles.actionButtonDisabled,
                  startingSession && styles.actionButtonDisabled,
                ]}
                onPress={canStartSession ? startInstantSession : undefined}
                disabled={!canStartSession || startingSession}
              >
                {startingSession ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="chatbubble" size={18} color={canStartSession ? "white" : "rgba(255,255,255,0.5)"} />
                    <Text style={[styles.actionButtonText, !canStartSession && styles.actionButtonTextDisabled]}>
                      {canStartSession ? 'Talk Now' : 'Offline'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.bookButton]} 
              onPress={bookAppointment}
            >
              <Ionicons name="calendar" size={18} color="white" />
              <Text style={styles.actionButtonText}>Book Appointment</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{doctor.professional_bio}</Text>
        </View>

        {/* Services Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.servicesList}>
            <View style={styles.serviceItem}>
              <Ionicons name="calendar" size={20} color="#4CAF50" />
              <Text style={styles.serviceText}>Appointments</Text>
            </View>
            {isOnline && (
              <View style={styles.serviceItem}>
                <Ionicons name="chatbubble" size={20} color={Colors.success} />
                <Text style={styles.serviceText}>Instant Text Sessions</Text>
              </View>
            )}
          </View>
        </View>

        {/* Instant Session Info */}
        {isOnline && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="flash" size={20} color={Colors.warning} />
              <Text style={styles.infoTitle}>Instant Text Session</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={16} color={Colors.text} />
              <Text style={styles.infoText}>10 minutes per session</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="speedometer" size={16} color={Colors.text} />
              <Text style={styles.infoText}>2-minute response time</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="card" size={16} color={Colors.text} />
              <Text style={styles.infoText}>Uses your subscription sessions</Text>
            </View>
          </View>
        )}

        {/* Active Session Warning */}
        {activeSession && (
          <View style={styles.activeSessionCard}>
            <View style={styles.activeSessionHeader}>
              <Ionicons name="chatbubbles" size={20} color={Colors.success} />
              <Text style={styles.activeSessionTitle}>Active Session</Text>
            </View>
            <Text style={styles.activeSessionText}>
              You are currently in a session with Dr. {activeSession.doctor.name}
            </Text>
            <TouchableOpacity
              style={styles.goToChatButton}
              onPress={() => router.push(`/chat/${activeSession.session_id}`)}
            >
              <Text style={styles.goToChatButtonText}>Continue Chat</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 18,
    color: Colors.gray,
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingBottom: 30,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  specializationChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  specializationChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
  },
  specializationChipText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 14,
    fontWeight: '600',
  },
  experience: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 4,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  lastSeen: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  section: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  servicesList: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  infoCard: {
    margin: 20,
    padding: 16,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 8,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.success,
    marginLeft: 8,
  },
  activeSessionText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  goToChatButton: {
    backgroundColor: Colors.success,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  goToChatButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  actionButtonTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  talkNowButton: {
    backgroundColor: Colors.success,
  },
  bookButton: {
    backgroundColor: '#4CAF50',
  },
}); 