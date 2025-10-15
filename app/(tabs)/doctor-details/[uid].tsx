import { FontAwesome } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import AudioCallModal from '../../../components/AudioCallModal';
import DirectBookingModal from '../../../components/DirectBookingModal';
import DoctorProfilePicture from '../../../components/DoctorProfilePicture';
import SessionTypeSelectionModal, { SessionType } from '../../../components/SessionTypeSelectionModal';
import { DoctorProfileSkeleton } from '../../../components/skeleton';
import SubscriptionModal from '../../../components/SubscriptionModal';
import VideoCallModal from '../../../components/VideoCallModal';
import { useAuth } from '../../../contexts/AuthContext';
import { apiService } from '../../../services/apiService';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;

interface DoctorProfile {
  id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  specialization: string;
  specializations?: string[];
  sub_specialization?: string;
  languages_spoken?: string[];
  years_of_experience: number;
  bio?: string;
  rating: number;
  total_ratings: number;
  city?: string;
  country?: string;
  profile_picture?: string;
  profile_picture_url?: string;
  status: string;
  is_online?: boolean;
}



export default function DoctorProfilePage() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { user, userData } = useAuth();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showSessionTypeModal, setShowSessionTypeModal] = useState(false);
  const [showDirectBookingModal, setShowDirectBookingModal] = useState(false);
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType>('text');
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  // Direct booking call state
  const [showAudioCallModal, setShowAudioCallModal] = useState(false);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [directSessionId, setDirectSessionId] = useState<string | null>(null);
  const [startingSession, setStartingSession] = useState(false);

  useEffect(() => {
    if (uid) {
      fetchDoctorProfile();
    }
  }, [uid]);

  useEffect(() => {
    // Load user's current subscription
    const loadSubscription = async () => {
      try {
        const response = await apiService.get('/subscription');
        if (response.success && response.data) {
          setCurrentSubscription(response.data);
        } else {
          setCurrentSubscription(null);
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
        setCurrentSubscription(null);
      }
    };

    loadSubscription();
  }, []);

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/doctors/${uid}`);
      
      if (response.success && response.data) {
        console.log('Doctor data received:', response.data);
        console.log('Languages spoken:', response.data.languages_spoken);
        setDoctor(response.data);
      } else {
        console.error('Failed to fetch doctor profile:', response.message);
      }
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number, size: number = 16) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <FontAwesome key={i} name="star" size={size} color="#FFD700" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <FontAwesome key={i} name="star-half-o" size={size} color="#FFD700" />
        );
      } else {
        stars.push(
          <FontAwesome key={i} name="star-o" size={size} color="#FFD700" />
        );
      }
    }
    return stars;
  };

  const handleDirectBooking = async () => {
    if (!doctor || !userData) return;
    
    // Show the session type selection modal
    setShowSessionTypeModal(true);
  };

  const handleSessionTypeSelect = (sessionType: SessionType) => {
    setSelectedSessionType(sessionType);
    setShowSessionTypeModal(false);
    
    // Show the booking modal with selected session type
    setShowDirectBookingModal(true);
  };

  const handleDirectBookingConfirm = async (reason: string, sessionType: SessionType) => {
    if (!doctor || !userData) return;
    
    try {
      setStartingSession(true);
      let response;
      
      if (sessionType === 'text') {
        // Start text session with reason
        response = await apiService.post('/text-sessions/start', {
          doctor_id: doctor.id,
          reason: reason
        });
      } else if (sessionType === 'audio' || sessionType === 'video') {
        // Generate a direct session ID so both peers can connect to the same signaling room
        const provisionalAppointmentId = `direct_session_${Date.now()}`;
        // Start call session on backend so it can notify the doctor via push (for background/killed delivery)
        response = await apiService.post('/call-sessions/start', {
          call_type: sessionType === 'audio' ? 'voice' : 'video',
          appointment_id: provisionalAppointmentId,
          doctor_id: doctor.id,
          reason: reason
        });
      }
      
      if (response && response.success) {
        // Close the direct booking modal
        setShowDirectBookingModal(false);
        
        if (sessionType === 'text') {
          // For text sessions, navigate to chat using the returned session id
          const sessionData = response.data as any;
          const chatId = `text_session_${sessionData.session_id}`;
          router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: chatId } });
        } else {
          // For audio/video, reuse the same call flow used in Chat by opening the call modals directly
          const sessionData = response.data as any;
          const appointmentId = sessionData?.appointment_id || `direct_session_${Date.now()}`;
          setDirectSessionId(appointmentId);
          if (sessionType === 'audio') {
            setShowAudioCallModal(true);
          } else {
            setShowVideoCallModal(true);
          }
        }
      } else {
        Alert.alert('Error', response?.message || 'Failed to start session');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      Alert.alert('Error', 'Failed to start session. Please try again.');
    } finally {
      setStartingSession(false);
    }
  };

  const handleBookAppointment = () => {
    if (!doctor) return;
    router.push({ 
      pathname: '/(tabs)/doctor-details/BookAppointmentFlow', 
      params: { 
        doctorId: doctor.id.toString(),
        doctorName: doctor.display_name || `${doctor.first_name} ${doctor.last_name}`,
        specialization: (doctor.specializations && doctor.specializations.length > 0)
          ? doctor.specializations.join(', ')
          : (doctor.specialization || 'General Medicine')
      } 
    });
  };

  const handleCloseSubscriptionModal = () => {
    setShowSubscriptionModal(false);
  };

  const handleBuySessions = () => {
    setShowSubscriptionModal(false);
    // Navigate to patient dashboard with subscriptions tab
    router.push({ 
      pathname: '/patient-dashboard',
      params: { tab: 'home' }
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <FontAwesome name="arrow-left" size={20} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Loading...</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <DoctorProfileSkeleton />
        </View>
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <FontAwesome name="arrow-left" size={20} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Doctor Not Found</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <FontAwesome name="user-md" size={48} color="#999" />
          <Text style={styles.errorText}>Doctor not found</Text>
        </View>
      </View>
    );
  }

  const isOnline = doctor.is_online || false;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Dr. {doctor.first_name} {doctor.last_name}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profileImageContainer}>
            {doctor.profile_picture_url || doctor.profile_picture ? (
              <DoctorProfilePicture
                profilePictureUrl={doctor.profile_picture_url}
                profilePicture={doctor.profile_picture}
                size={100}
                name={`${doctor.first_name} ${doctor.last_name}`}
              />
            ) : (
              <DoctorProfilePicture
                size={100}
                style={styles.profileImage}
                name={`${doctor.first_name} ${doctor.last_name}`}
              />
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.doctorName}>
              Dr. {doctor.first_name} {doctor.last_name}
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
            
            {doctor.sub_specialization && (
              <Text style={styles.subSpecialization}>{doctor.sub_specialization}</Text>
            )}
            
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#999' }]} />
              <Text style={[styles.statusText, { color: isOnline ? '#4CAF50' : '#999' }]}>
                {isOnline ? 'Online Now' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {/* Professional Information Card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Professional Information</Text>
          
          {/* Years of Experience */}
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <FontAwesome name="clock-o" size={18} color="#4CAF50" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Experience</Text>
              <Text style={styles.infoValue}>{doctor.years_of_experience}+ years of experience</Text>
            </View>
          </View>

          {/* Location */}
          {(doctor.city || doctor.country) && (
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <FontAwesome name="map-marker" size={18} color="#4CAF50" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>
                  {[doctor.city, doctor.country].filter(Boolean).join(', ')}
                </Text>
              </View>
            </View>
          )}

          {/* Languages */}
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <FontAwesome name="language" size={18} color="#4CAF50" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Languages</Text>
              {doctor.languages_spoken && doctor.languages_spoken.length > 0 ? (
                <View style={styles.languagesContainer}>
                  {doctor.languages_spoken.map((language, idx) => (
                    <View key={idx} style={styles.languageChip}>
                      <Text style={styles.languageChipText}>{language}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.languagesContainer}>
                  <View style={styles.languageChip}>
                    <Text style={styles.languageChipText}>English</Text>
                  </View>
                  <View style={styles.languageChip}>
                    <Text style={styles.languageChipText}>Chichewa</Text>
                  </View>
                  <View style={styles.languageChip}>
                    <Text style={styles.languageChipText}>French</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Bio Card */}
        {doctor.bio && (
          <View style={styles.bioCard}>
            <Text style={styles.sectionTitle}>About Dr. {doctor.first_name}</Text>
            <Text style={styles.bioText}>{doctor.bio}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[
              styles.directBookingButton,
              !isOnline && styles.directBookingButtonDisabled
            ]}
            onPress={handleDirectBooking}
            disabled={!isOnline}
          >
            <Text style={[
              styles.directBookingButtonText,
              !isOnline && styles.directBookingButtonTextDisabled
            ]}>
              {isOnline ? 'Talk Now' : 'Talk Now (Offline)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.bookAppointmentButton}
            onPress={handleBookAppointment}
          >
            <Text style={styles.bookAppointmentButtonText}>Book Appointment</Text>
          </TouchableOpacity>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsCard}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
            <View style={styles.ratingSummary}>
              <View style={styles.starsContainer}>
                {renderStars(doctor.rating, 20)}
              </View>
              <Text style={styles.ratingText}>
                {doctor.rating ? doctor.rating.toFixed(1) : '0.0'} ({doctor.total_ratings || 0} reviews)
              </Text>
            </View>
          </View>
          
          {/* Individual Reviews Placeholder */}
          <View style={styles.reviewsList}>
            <Text style={styles.noReviewsText}>
              {doctor.total_ratings === 0 ? 'No reviews yet' : 'Reviews will be displayed here'}
            </Text>
          </View>
        </View>

        {/* Similar Doctors Section */}
        <View style={styles.similarDoctorsCard}>
          <Text style={styles.sectionTitle}>Similar Doctors</Text>
          <Text style={styles.similarDoctorsText}>
            Recommended doctors in the same specialization will appear here
          </Text>
        </View>
      </ScrollView>

      {/* Subscription Modal */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={handleCloseSubscriptionModal}
        onBuySessions={handleBuySessions}
      />

      {/* Session Type Selection Modal */}
      <SessionTypeSelectionModal
        visible={showSessionTypeModal}
        onClose={() => setShowSessionTypeModal(false)}
        onSelectSessionType={handleSessionTypeSelect}
        doctorName={`${doctor?.first_name} ${doctor?.last_name}`}
        subscription={currentSubscription}
      />

      {/* Direct Booking Modal */}
      <DirectBookingModal
        visible={showDirectBookingModal}
        onClose={() => setShowDirectBookingModal(false)}
        onConfirm={handleDirectBookingConfirm}
        doctorName={`${doctor?.first_name} ${doctor?.last_name}`}
        sessionType={selectedSessionType}
        loading={startingSession}
        subscription={currentSubscription}
      />

      {/* Outgoing audio call modal (reuses chat call flow) */}
      {directSessionId && (
        <AudioCallModal
          visible={showAudioCallModal}
          onClose={() => setShowAudioCallModal(false)}
          appointmentId={directSessionId}
          userId={(user?.id ?? userData?.id ?? 0).toString()}
          isDoctor={(user?.user_type || userData?.user_type) === 'doctor'}
          doctorId={doctor?.id}
          doctorName={`${doctor?.first_name} ${doctor?.last_name}`}
          patientName={user?.display_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()}
          otherParticipantProfilePictureUrl={doctor?.profile_picture_url || doctor?.profile_picture}
          isIncomingCall={false}
          onCallTimeout={() => Alert.alert('Call Timeout', 'The doctor did not answer. Please try again later.')}
          onCallRejected={() => Alert.alert('Call Rejected', 'The doctor is not available right now. Please try again later.')}
        />
      )}

      {/* Outgoing video call modal (reuses chat call flow) */}
      {directSessionId && showVideoCallModal && (
        <VideoCallModal
          appointmentId={directSessionId}
          userId={(user?.id ?? userData?.id ?? 0).toString()}
          isDoctor={(user?.user_type || userData?.user_type) === 'doctor'}
          doctorId={doctor?.id}
          doctorName={`${doctor?.first_name} ${doctor?.last_name}`}
          patientName={user?.display_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()}
          otherParticipantProfilePictureUrl={doctor?.profile_picture_url || doctor?.profile_picture}
          onEndCall={() => setShowVideoCallModal(false)}
          onCallTimeout={() => Alert.alert('Call Timeout', 'The doctor did not answer. Please try again later.')}
          onCallRejected={() => Alert.alert('Call Rejected', 'The doctor is not available right now. Please try again later.')}
          isIncomingCall={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  // Profile Header Card
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0F2E9',
  },
  profileInfo: {
    alignItems: 'center',
  },
  doctorName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    marginBottom: 8,
  },
  specialization: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  specializationChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  specializationChip: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  specializationChipText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  subSpecialization: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Professional Information Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
    lineHeight: 22,
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  languageChip: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  languageChipText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  // Bio Card
  bioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  bioText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  // Action Buttons
  actionButtonsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  directBookingButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  directBookingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  directBookingButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  directBookingButtonTextDisabled: {
    color: '#999',
  },
  bookAppointmentButton: {
    backgroundColor: '#F1F3F4',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bookAppointmentButtonText: {
    color: '#222',
    fontSize: 16,
    fontWeight: '700',
  },
  // Reviews Card
  reviewsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewsHeader: {
    marginBottom: 16,
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  reviewsList: {
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noReviewsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  // Similar Doctors Card
  similarDoctorsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  similarDoctorsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
}); 