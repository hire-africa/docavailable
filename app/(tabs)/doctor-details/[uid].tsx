import { FontAwesome } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { apiService } from '../../../app/services/apiService';
import DirectBookingModal from '../../../components/DirectBookingModal';
import DoctorProfilePicture from '../../../components/DoctorProfilePicture';
import SubscriptionModal from '../../../components/SubscriptionModal';
import { Colors } from '../../../constants/Colors';
import { useAuth } from '../../../contexts/AuthContext';

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

const defaultProfileImage = require('../../../assets/images/doctor-illustration.png');

export default function DoctorProfilePage() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { userData } = useAuth();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showDirectBookingModal, setShowDirectBookingModal] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

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
      const response = await apiService.get<DoctorProfile>(`/doctors/${uid}`);
      
      if (response.success && response.data) {
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
    
    // Check if user has subscription with text sessions
    if (!currentSubscription || (currentSubscription.textSessionsRemaining || 0) <= 0) {
      setShowSubscriptionModal(true);
      return;
    }
    
    // Show the direct booking modal instead of directly calling the API
    setShowDirectBookingModal(true);
  };

  const handleDirectBookingConfirm = async (reason: string) => {
    if (!doctor || !userData) return;
    
    try {
      // Start text session with reason
      const response = await apiService.post('/text-sessions/start', {
        doctor_id: doctor.id,
        reason: reason
      });
      
      if (response.success && response.data) {
        const sessionData = response.data as any;
        
        // Close the modal
        setShowDirectBookingModal(false);
        
        // Show success message
        Alert.alert(
          'Direct Booking Started!',
          `You are now connected with Dr. ${doctor.first_name} ${doctor.last_name}. You can send one message and the doctor will respond within 2 minutes.`,
          [
            {
              text: 'Go to Chat',
              onPress: () => {
                // Navigate to chat using text session ID with proper prefix
                const chatId = `text_session_${sessionData.session_id}`;
                router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: chatId } });
              }
            },
            {
              text: 'Go to Messages',
              onPress: () => {
                // Navigate to messages tab with the new session
                router.push({
                  pathname: '/patient-dashboard',
                  params: { 
                    tab: 'messages',
                    sessionId: sessionData.session_id.toString()
                  }
                });
              }
            },
            {
              text: 'Stay Here',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to start direct booking');
      }
    } catch (error) {
      console.error('Error starting direct booking:', error);
      Alert.alert('Error', 'Failed to start direct booking. Please try again.');
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>Loading doctor profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <FontAwesome name="user-md" size={48} color="#999" />
          <Text style={styles.errorText}>Doctor not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOnline = doctor.is_online || false;

  return (
    <SafeAreaView style={styles.container}>
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Image */}
        <View style={styles.profileImageContainer}>
          {doctor.profile_picture_url || doctor.profile_picture ? (
            <DoctorProfilePicture
              profilePictureUrl={doctor.profile_picture_url}
              profilePicture={doctor.profile_picture}
              size={120}
              name={`${doctor.first_name} ${doctor.last_name}`}
            />
          ) : (
            <Image
              source={defaultProfileImage}
              style={styles.profileImage}
            />
          )}
        </View>

        {/* Doctor Name */}
        <Text style={styles.doctorName}>
          Dr. {doctor.first_name} {doctor.last_name}
        </Text>

        {/* Specialization and Status */}
        <View style={styles.specializationContainer}>
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

        {/* Bio */}
        {doctor.bio && (
          <View style={styles.bioContainer}>
            <Text style={styles.bioText}>{doctor.bio}</Text>
          </View>
        )}

        {/* Experience and Rating */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <FontAwesome name="clock-o" size={16} color="#666" />
            <Text style={styles.detailText}>{doctor.years_of_experience}+ years experience</Text>
          </View>
          
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStars(doctor.rating, 16)}
            </View>
            <Text style={styles.ratingText}>
              {doctor.rating ? doctor.rating.toFixed(1) : '0.0'} ({doctor.total_ratings || 0} reviews)
            </Text>
          </View>

          {(doctor.city || doctor.country) && (
            <View style={styles.detailRow}>
              <FontAwesome name="map-marker" size={16} color="#666" />
              <Text style={styles.detailText}>
                {[doctor.city, doctor.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>

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
              {isOnline ? 'Direct Booking' : 'Direct Booking (Offline)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.bookAppointmentButton}
            onPress={handleBookAppointment}
          >
            <Text style={styles.bookAppointmentButtonText}>Book Appointment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Subscription Modal */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={handleCloseSubscriptionModal}
        onBuySessions={handleBuySessions}
      />

      {/* Direct Booking Modal */}
      <DirectBookingModal
        visible={showDirectBookingModal}
        onClose={() => setShowDirectBookingModal(false)}
        onConfirm={handleDirectBookingConfirm}
        doctorName={`${doctor?.first_name} ${doctor?.last_name}`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0F2E9',
  },
  doctorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  specializationContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  specialization: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    marginVertical: 4,
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
  bioContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  bioText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  detailsContainer: {
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 15,
    color: '#666',
    marginLeft: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 15,
    color: '#666',
  },
  actionButtonsContainer: {
    gap: 12,
    marginBottom: 40,
  },
  directBookingButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
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
    fontWeight: 'bold',
  },
  directBookingButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  directBookingButtonTextDisabled: {
    color: '#999',
  },
  bookAppointmentButton: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bookAppointmentButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
}); 