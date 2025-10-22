import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/hooks/useAlert';
import authService from '@/services/authService';
import { NotificationService } from '@/services/notificationService';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    BackHandler,
    Dimensions,
    Image,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNavigation from '../components/BottomNavigation';
import OnboardingOverlay from '../components/OnboardingOverlay';
import DoctorActivationModal from '../components/DoctorActivationModal';
import { Activity, addRealtimeActivity, formatTimestamp, generateUserActivities } from '../utils/activityUtils';
import { getMissingFields } from '../utils/profileUtils';

import { FontAwesome } from '@expo/vector-icons';
import { apiService } from '../app/services/apiService';
import AlertDialog from '../components/AlertDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import DoctorProfilePicture from '../components/DoctorProfilePicture';
import Icon, { IconNames } from '../components/Icon';
import { RescheduleModal } from '../components/RescheduleModal';
import WorkingHours from '../components/WorkingHours';
import WorkingHoursCard from '../components/WorkingHoursCard';

const profileImage = require('../assets/images/profile.jpg');
const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 1200 : width;
const isLargeScreen = width > 768;

interface TabProps {
  icon: keyof typeof IconNames;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

interface BookingRequest {
  id: number;
  patient_name: string;
  patientProfilePictureUrl?: string;
  patientProfilePicture?: string;
  patientEmail?: string;
  patientGender?: string;
  patientCountry?: string;
  patientCity?: string;
  patientDateOfBirth?: string;
  // Support both old and new field names for compatibility
  date?: string;
  time?: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  reason?: string;
  status: string;
  createdAt?: string;
  reschedulePending?: boolean;
}

// Add DoctorType interface
interface DoctorType {
  id: string;
  name: string;
  is_active: boolean;
}

const Tab: React.FC<TabProps> = ({ icon, label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.tab, isActive && styles.activeTab]}
    onPress={onPress}
  >
    <Icon 
      name={icon} 
      size={24} 
      color={isActive ? '#4CAF50' : '#666'} 
    />
    <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]} numberOfLines={1}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function DoctorDashboard() {
  const { user, userData, loading, refreshUserData } = useAuth();
  const { alertState, showAlert, hideAlert, showSuccess, showError, showProcessing } = useAlert();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('home');
  const [showConfirm, setShowConfirm] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const [confirmedAppointments, setConfirmedAppointments] = useState<any[]>([]);
  const [activeTextSessions, setActiveTextSessions] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [loadingConfirmed, setLoadingConfirmed] = useState(false);
  const [loadingTextSessions, setLoadingTextSessions] = useState(false);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  const [selectedAcceptedRequest, setSelectedAcceptedRequest] = useState<BookingRequest | null>(null);
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  
  // Doctor activation state
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [appointmentsTab, setAppointmentsTab] = useState<'requests' | 'accepted'>('requests');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState('bank');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [earnings, setEarnings] = useState(0);
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [doctors, setDoctors] = useState<DoctorType[]>([]);
  const [enabledDaysCount, setEnabledDaysCount] = useState(0);

  // Refresh states
  const [refreshingHome, setRefreshingHome] = useState(false);
  const [refreshingAppointments, setRefreshingAppointments] = useState(false);
  const [refreshingMessages, setRefreshingMessages] = useState(false);
  const [refreshingWorkingHours, setRefreshingWorkingHours] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  // Sidebar state
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(0)).current;
  const [webSidebarTransform, setWebSidebarTransform] = useState(-300);

  // Prevent back button navigation
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Prevent back navigation - users must use logout button
        return true; // Return true to prevent default back behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [])
  );

  // Refresh user data when component mounts or when user data changes
  useEffect(() => {
    const refreshData = async () => {
      try {
        // // console.log('DoctorDashboard: Refreshing user data...');
        await refreshUserData();
      } catch (error) {
        console.error('DoctorDashboard: Error refreshing user data:', error);
      }
    };
    
    refreshData();
  }, []);

  // Log when user data changes
  useEffect(() => {
    if (userData) {
      // // console.log('DoctorDashboard: User data updated:', {
      //   profile_picture_url: userData.profile_picture_url,
      //   profile_picture: userData.profile_picture
      // });
    }
  }, [userData]);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  // Fetch booking requests for this doctor immediately when user logs in
  useEffect(() => {
    if (user) {
      fetchBookingRequests();
    }
  }, [user]);

  // Additional fetch when appointments tab is active (for real-time updates)
  useEffect(() => {
    if (user && activeTab === 'appointments') {
      fetchBookingRequests();
    }
  }, [user, activeTab]);

  // Refresh appointments when appointments tab becomes active
  useFocusEffect(
    useCallback(() => {
      if (user && activeTab === 'appointments') {
        // console.log('🔄 [DoctorDashboard] Appointments tab focused, refreshing data...');
        fetchBookingRequests();
        fetchConfirmedAppointments();
      }
    }, [user, activeTab])
  );

  // Fetch confirmed appointments immediately when user logs in
  useEffect(() => {
    if (user && user.id) { // Add user.id check
      fetchConfirmedAppointments();
      fetchActiveTextSessions();
    }
  }, [user]);

  // Additional fetch when messages tab is active (for real-time updates)
  useEffect(() => {
    if (user && activeTab === 'messages') {
      fetchConfirmedAppointments();
      fetchActiveTextSessions();
    }
  }, [user, activeTab]);

  // Fetch ratings immediately when user logs in
  useEffect(() => {
    if (user && user.id) { // Add user.id check
      fetchRatings();
    }
  }, [user]);

  // Fetch wallet info immediately when user logs in
  useEffect(() => {
    if (user && user.id) { // Add user.id check
      fetchWalletInfo();
    }
  }, [user]);

  // Refresh activities when appointments change or when user logs in
  useEffect(() => {
    if (user && user.id) {
      loadActivities();
    }
  }, [user, bookingRequests, confirmedAppointments]);

  // Check profile completion for onboarding
  useEffect(() => {
    const checkProfileCompletion = () => {
      console.log('🔍 [DoctorDashboard] Checking profile completion:', {
        userData: userData,
        hasUserData: !!userData,
        userType: userData?.user_type,
        bio: userData?.bio,
        professional_bio: userData?.professional_bio,
        specializations: userData?.specializations,
        languages_spoken: userData?.languages_spoken
      });
      
      if (userData) {
        const missing = getMissingFields(userData);
        console.log('🔍 [DoctorDashboard] Missing fields result:', missing);
        
        // Check if doctor needs activation (Google auth users with pending status)
        const needsActivation = userData.user_type === 'doctor' && 
                               userData.status === 'pending' && 
                               (!userData.national_id || !userData.medical_degree || !userData.medical_licence);
        
        if (needsActivation) {
          console.log('🔍 [DoctorDashboard] Doctor needs activation');
          setShowActivationModal(true);
          setShowOnboarding(false);
        } else if (missing.length > 0) {
          setMissingFields(missing);
          // Show onboarding overlay only if not dismissed in this session
          if (!showOnboarding && !onboardingDismissed) {
            console.log('🔍 [DoctorDashboard] Showing onboarding overlay');
            setShowOnboarding(true);
          }
        } else {
          console.log('🔍 [DoctorDashboard] Profile is complete, hiding overlay');
          setShowOnboarding(false);
        }
      }
    };

    checkProfileCompletion();
  }, [userData, showOnboarding, onboardingDismissed]);

  const updateEnabledDaysCount = async () => {
    try {
      if (!user?.id) return;
      
      const response = await authService.getDoctorAvailability(user.id.toString());
      if (response.success && response.data) {
        const workingHours = response.data.working_hours || {};
        const count = Object.values(workingHours).filter((day: any) => day.enabled).length;
        setEnabledDaysCount(count);
      }
    } catch (error) {
      console.error('Error updating enabled days count:', error);
    }
  };

  // Update enabled days count when working hours tab is active
  useEffect(() => {
    if (user && activeTab === 'working-hours') {
      updateEnabledDaysCount();
    }
  }, [user, activeTab]);

  // Update enabled days count when returning to home tab
  useEffect(() => {
    if (user && activeTab === 'home') {
      updateEnabledDaysCount();
    }
  }, [user, activeTab]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        // // console.log('DoctorDashboard: Screen focused, refreshing data');
        updateEnabledDaysCount();
        if (activeTab === 'home') {
          refreshHomeTab();
        }
      }
    }, [user, activeTab])
  );

  // Sidebar functions
  const openSidebar = () => {
    setSidebarVisible(true);
    if (Platform.OS === 'web') {
      setWebSidebarTransform(0);
    } else {
      Animated.timing(sidebarAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  };

  const closeSidebar = () => {
    if (Platform.OS === 'web') {
      setWebSidebarTransform(-300);
      setTimeout(() => setSidebarVisible(false), 350);
    } else {
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setSidebarVisible(false);
      });
    }
  };

  // Early returns - moved after all hooks
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!user) return null;

  const fetchAppointments = async () => {
    try {
      const response = await apiService.get('/appointments');
      if (response.success && response.data) {
        const responseData = response.data as any;
        setAppointments((responseData.data || responseData) as any[]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchBookingRequests = async () => {
    if (!user) return;

    setLoadingRequests(true);
    try {
      const response = await apiService.get('/appointments');
      if (response.success && response.data) {
        const responseData = response.data as any;
        const rawRequests = responseData.data || responseData;
        console.log('📋 [fetchBookingRequests] Raw appointment data:', rawRequests);
        
        // Transform the data to match the BookingRequest interface
        const requests = rawRequests.map((request: any) => ({
          id: request.id,
          patient_name: request.patientName || 'Patient',
          doctor_name: userData?.display_name || `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim(),
          patientProfilePictureUrl: request.patient?.profile_picture_url || null,
          patientProfilePicture: request.patient?.profile_picture || null,
          patientEmail: request.patient?.email,
          patientGender: request.patient?.gender || request.patient?.sex,
          patientCountry: request.patient?.country,
          patientCity: request.patient?.city,
          patientDateOfBirth: request.patient?.date_of_birth,
          // Map both old and new field names for compatibility
          date: request.appointment_date || request.date,
          time: request.appointment_time || request.time,
          appointment_date: request.appointment_date || request.date,
          appointment_time: request.appointment_time || request.time,
          appointment_type: request.appointment_type || 'text',
          reason: request.reason || null,
          status: request.status === 0 ? 'pending' : 
                  request.status === 1 ? 'confirmed' : 
                  request.status === 2 ? 'cancelled' : 
                  request.status === 3 ? 'completed' : 'pending',
          createdAt: request.created_at || '',
          reschedulePending: false
        }));
        
        // Log each transformed appointment's date and time
        requests.forEach((request: any, index: number) => {
          console.log(`📅 [fetchBookingRequests] Transformed Appointment ${index + 1}:`, {
            id: request.id,
            date: request.date,
            time: request.time,
            appointment_date: request.appointment_date,
            appointment_time: request.appointment_time,
            patientName: request.patient_name,
            reason: request.reason,
            patientGender: request.patientGender,
            status: request.status
          });
        });
        
        setBookingRequests(requests);
      }
    } catch (error) {
      console.error('Error fetching booking requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchConfirmedAppointments = async () => {
    if (!user) return;

    setLoadingConfirmed(true);
    try {
      // Fetch both confirmed and completed appointments for record keeping
      const response = await apiService.get('/appointments');
      if (response.success && response.data) {
        const responseData = response.data as any;
        const rawConfirmed = responseData.data || responseData;
        
        // Transform the data to match the BookingRequest interface and filter for confirmed/completed only
        console.log('📋 [fetchConfirmedAppointments] Raw appointments before filtering:', rawConfirmed.map((r: any) => ({
          id: r.id,
          status: r.status,
          patientName: r.patientName || `${r.patient?.first_name || ''} ${r.patient?.last_name || ''}`.trim(),
          patient: r.patient
        })));
        
        const confirmed = rawConfirmed
          .filter((request: any) => request.status === 1 || request.status === 3) // Only confirmed (1) and completed (3)
          .map((request: any) => ({
            id: request.id,
            patient_name: request.patientName || 'Patient',
            doctor_name: userData?.display_name || `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim(),
            patientProfilePictureUrl: request.patient?.profile_picture_url,
            patientProfilePicture: request.patient?.profile_picture,
            patientEmail: request.patient?.email,
            patientGender: request.patient?.gender || request.patient?.sex,
            patientCountry: request.patient?.country,
            patientCity: request.patient?.city,
            patientDateOfBirth: request.patient?.date_of_birth,
            appointment_date: request.appointment_date,
            appointment_time: request.appointment_time,
            appointment_type: request.appointment_type || 'text',
            reason: request.reason || '',
            status: request.status === 0 ? 'pending' : 
                    request.status === 1 ? 'confirmed' : 
                    request.status === 2 ? 'cancelled' : 
                    request.status === 3 ? 'completed' : 'pending',
            createdAt: request.created_at || '',
            reschedulePending: false
          }));
        
        console.log('📋 [fetchConfirmedAppointments] Filtered appointments:', confirmed.map((r: any) => ({
          id: r.id,
          status: r.status,
          patientName: r.patient_name,
          patientProfilePictureUrl: r.patientProfilePictureUrl
        })));
        
        setConfirmedAppointments(confirmed);
      }
    } catch (error) {
      console.error('Error fetching confirmed appointments:', error);
    } finally {
      setLoadingConfirmed(false);
    }
  };

  const fetchActiveTextSessions = async () => {
    if (!user) return;

    setLoadingTextSessions(true);
    try {
      // Get active text sessions for this doctor
      const response = await apiService.get('/text-sessions/active-sessions');
      if (response.success && response.data) {
        setActiveTextSessions(response.data as any[]);
      } else {
        setActiveTextSessions([]);
      }
    } catch (error) {
      console.error('Error fetching active text sessions:', error);
      setActiveTextSessions([]);
    } finally {
      setLoadingTextSessions(false);
    }
  };



  const fetchRatings = async () => {
    if (!user) return;

    setLoadingRatings(true);
    try {
      const response = await apiService.get('/reviews');
      if (response.success && response.data) {
        const responseData = response.data as any;
        setRatings((responseData.data || responseData) as any[]);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoadingRatings(false);
    }
  };

  const fetchWalletInfo = async () => {
    if (!user) return;

    setLoadingWallet(true);
    try {
      const response = await apiService.get('/doctor/wallet');
      if (response.success && response.data) {
        const responseData = response.data as any;
        setWalletInfo(responseData);
        setEarnings(responseData.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching wallet info:', error);
    } finally {
      setLoadingWallet(false);
    }
  };

  // Helper function to get action URL for activity type
  const getActionUrlForActivity = (activityType: string): string | undefined => {
    switch (activityType) {
      case 'appointment':
        return '/appointments';
      case 'message':
        return '/messages';
      case 'wallet':
        return '/earnings';
      default:
        return undefined;
    }
  };

  const loadActivities = async () => {
    try {
      // Small delay to ensure data is loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Filter out cancelled appointments to prevent showing cancelled activities
      const activeBookingRequests = bookingRequests.filter(req => req.status !== 'cancelled' && req.status !== 2);
      const activeConfirmedAppointments = confirmedAppointments.filter(apt => apt.status !== 'cancelled' && apt.status !== 2);
      
      console.log('[DoctorDashboard] Filtered appointment data:', {
        originalBookingRequests: bookingRequests.length,
        filteredBookingRequests: activeBookingRequests.length,
        originalConfirmedAppointments: confirmedAppointments.length,
        filteredConfirmedAppointments: activeConfirmedAppointments.length
      });
      
      // Generate activities from real user data (using filtered data)
      const userActivities = generateUserActivities(
        'doctor',
        userData,
        [...activeBookingRequests, ...activeConfirmedAppointments],
        [], // messages - you can add this if you have message data
        null // subscription - you can add this if you have subscription data
      );
      
      // Merge with existing activities, preserving real-time activities
      setActivities(prevActivities => {
        // Keep real-time activities (those created in the last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const realtimeActivities = prevActivities.filter(activity => 
          activity.timestamp > fiveMinutesAgo
        );
        
        // Combine real-time activities with generated activities
        const combinedActivities = [...realtimeActivities, ...userActivities];
        
        // Remove duplicates and sort by timestamp
        const uniqueActivities = combinedActivities.filter((activity, index, self) => 
          index === self.findIndex(a => a.id === activity.id)
        );
        
        return uniqueActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      });

      // Load unread notification count from service
      try {
        // Generate automated activities first
        const generatedActivities = generateUserActivities(
          'doctor',
          userData,
          [], // appointments - would be loaded from API
          [], // messages - would be loaded from API
          null // subscription - would be loaded from API
        );

        // Convert activities to notifications
        const activityNotifications = generatedActivities.map((activity, index) => ({
          id: `activity_${activity.id}`,
          title: activity.title,
          message: activity.description,
          type: activity.type as any,
          timestamp: activity.timestamp,
          isRead: index > 2, // Mark older activities as read
          actionUrl: getActionUrlForActivity(activity.type)
        }));

        // Get all notifications (including admin ones)
        const allNotifications = await NotificationService.getNotificationsForUser('doctor', userData?.id?.toString());
        
        // Combine with automated notifications
        const combinedNotifications = [...allNotifications];
        activityNotifications.forEach(autoNotif => {
          const exists = combinedNotifications.find(n => n.id === autoNotif.id);
          if (!exists) {
            combinedNotifications.push(autoNotif);
          }
        });

        const unreadCount = combinedNotifications.filter(n => !n.isRead).length;
        setUnreadNotificationCount(unreadCount);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const handleAcceptBooking = async (request: BookingRequest) => {
    // Check if appointment is expired
    if (isAppointmentExpired(request.date, request.time)) {
      showError('Error', 'Cannot accept expired appointment. The appointment time has already passed.');
      return;
    }

    try {
      // // console.log('🔄 [DoctorDashboard] Accepting appointment:', request.id);
      // // console.log('🔄 [DoctorDashboard] Request data:', {
      //   id: request.id,
      //   patientName: request.patientName,
      //   date: request.date,
      //   time: request.time,
      //   status: request.status
      // });
      
      const response = await apiService.patch(`/doctor/appointments/${request.id}/status`, {
        status: 'confirmed'
      });

      // // console.log('✅ [DoctorDashboard] Accept API response:', response);

      if (response.success) {
        showSuccess('Success', 'Booking request accepted successfully!');
        
        // Add real-time activity for appointment accepted
        setActivities(prevActivities => 
          addRealtimeActivity(
            prevActivities,
            'appointment_offer_accepted',
            'Appointment Accepted',
            `You accepted an appointment request from ${request.patient_name}`,
            {
              doctorName: userData?.display_name || `${userData?.first_name} ${userData?.last_name}`,
              patientName: request.patient_name,
              appointmentType: request.appointment_type
            }
          )
        );
        
        // Close the modal immediately
        setShowRequestModal(false);
        setSelectedRequest(null);
        
        // INSTANT UPDATE: Remove from booking requests and add to confirmed appointments immediately
        setBookingRequests(prev => prev.filter(req => req.id !== request.id));
        
        // Transform the request to match confirmed appointment format and add it immediately
        const confirmedAppointment = {
          id: request.id,
          patient_name: request.patient_name,
          doctor_name: userData?.display_name || `${userData?.first_name} ${userData?.last_name}`.trim(),
          patientProfilePictureUrl: request.patientProfilePictureUrl,
          patientProfilePicture: request.patientProfilePicture,
          patientEmail: request.patientEmail,
          patientGender: request.patientGender,
          patientPhone: request.patientPhone || '',
          appointment_date: request.appointment_date,
          appointment_time: request.appointment_time,
          date: request.date,
          time: request.time,
          reason: request.reason,
          appointment_type: request.appointment_type,
          status: 1, // confirmed status
          created_at: request.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setConfirmedAppointments(prev => [confirmedAppointment, ...prev]);
      } else {
        // console.error('❌ [DoctorDashboard] API returned success: false:', response);
        showError('Error', response.message || 'Failed to accept booking request. Please try again.');
      }
    } catch (error) {
      console.error('❌ [DoctorDashboard] Error accepting booking:', error);
      console.error('❌ [DoctorDashboard] Error details:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data
      });
      showError('Error', 'Failed to accept booking request. Please try again.');
    }
  };

  const handleRejectBooking = async (request: BookingRequest) => {
    try {
      // // console.log('🔄 [DoctorDashboard] Rejecting appointment:', request.id);
      // // console.log('🔄 [DoctorDashboard] Request data:', {
      //   id: request.id,
      //   patientName: request.patientName,
      //   date: request.date,
      //   time: request.time,
      //   status: request.status
      // });
      
      const response = await apiService.patch(`/doctor/appointments/${request.id}/status`, {
        status: 'cancelled'
      });

      // // console.log('✅ [DoctorDashboard] Reject API response:', response);

      if (response.success) {
        showSuccess('Success', 'Booking request rejected.');
        
        // Add real-time activity for appointment rejected
        setActivities(prevActivities => 
          addRealtimeActivity(
            prevActivities,
            'appointment_offer_rejected',
            'Appointment Rejected',
            `You rejected an appointment request from ${request.patient_name}`,
            {
              doctorName: userData?.display_name || `${userData?.first_name} ${userData?.last_name}`,
              patientName: request.patient_name,
              appointmentType: request.appointment_type
            }
          )
        );
        
        // Close the modal immediately
        setShowRequestModal(false);
        setSelectedRequest(null);
        
        // INSTANT UPDATE: Remove from booking requests immediately (no need to add to confirmed)
        setBookingRequests(prev => prev.filter(req => req.id !== request.id));
      } else {
        // console.error('❌ [DoctorDashboard] API returned success: false:', response);
        showError('Error', response.message || 'Failed to reject booking request. Please try again.');
      }
    } catch (error) {
      console.error('❌ [DoctorDashboard] Error rejecting booking:', error);
      console.error('❌ [DoctorDashboard] Error details:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data
      });
      showError('Error', 'Failed to reject booking request. Please try again.');
    }
  };

  const handleDeleteExpiredAppointment = async (request: BookingRequest) => {
    // // console.log('🗑️ [DoctorDashboard] Delete button clicked for appointment:', {
    //   id: request.id,
    //   patientName: request.patientName,
    //   date: request.date,
    //   time: request.time,
    //   status: request.status,
    //   isExpired: isAppointmentExpired(request.date, request.time)
    // });
    
    // Show confirmation dialog
    Alert.alert(
      'Delete Expired Appointment',
      `Are you sure you want to delete this expired appointment with ${request.patient_name}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // // console.log('🗑️ [DoctorDashboard] Confirmed deletion for appointment:', request.id);
              
              const response = await apiService.delete(`/doctor/appointments/${request.id}`);
              // // console.log('🗑️ [DoctorDashboard] Delete API response:', response);

              if (response.success) {
                showSuccess('Success', 'Expired appointment deleted successfully.');
                // Refresh all appointment data
                await Promise.all([
                  fetchBookingRequests(),
                  fetchConfirmedAppointments()
                ]);
                // // console.log('🗑️ [DoctorDashboard] List refreshed after deletion');
              } else {
                // console.error('❌ [DoctorDashboard] Delete failed - API returned success: false', {
                //   response: response
                // });
                showError('Error', response.message || 'Failed to delete expired appointment. Please try again.');
              }
            } catch (error: any) {
              console.error('❌ [DoctorDashboard] Error deleting expired appointment:', error);
              console.error('❌ [DoctorDashboard] Error details:', {
                message: error?.message,
                status: error?.response?.status,
                data: error?.response?.data,
                statusText: error?.response?.statusText
              });
              
              // Provide more specific error messages
              let errorMessage = 'Failed to delete expired appointment. Please try again.';
              if (error?.response?.status === 422) {
                const backendMessage = error?.response?.data?.message;
                if (backendMessage) {
                  errorMessage = backendMessage;
                } else {
                  errorMessage = 'Cannot delete this appointment. It may not be expired or in a deletable state (only pending or cancelled appointments can be deleted).';
                }
              } else if (error?.response?.status === 404) {
                // Appointment not found - treat as success since it's already gone
                showSuccess('Success', 'Appointment has been removed.');
                await fetchBookingRequests();
                return;
              } else if (error?.response?.status === 500) {
                const backendMessage = error?.response?.data?.message;
                if (backendMessage && backendMessage.includes('No query results for model')) {
                  // Appointment doesn't exist - treat as success since it's already gone
                  showSuccess('Success', 'Appointment has been removed.');
                  await fetchBookingRequests();
                  return;
                }
              } else if (error?.response?.status === 403) {
                errorMessage = 'You do not have permission to delete this appointment.';
              }
              
              showError('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleSelectPatient = (patient: BookingRequest) => {
    // Navigate to chat using appointment ID
    router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: patient.id } });
  };

  // Helper function to check if appointment is upcoming
  const isAppointmentUpcoming = (appointment: any) => {
    if (!appointment.appointment_date || !appointment.appointment_time) return false;
    
    try {
      const appointmentDate = new Date(appointment.appointment_date);
      const [timeStr] = appointment.appointment_time.split(' '); // Remove AM/PM if present
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(hours, minutes, 0, 0);
      
      const now = new Date();
      return appointmentDateTime.getTime() > now.getTime();
    } catch (error) {
      return false;
    }
  };

  const handleSelectTextSession = (session: any) => {
    // For text sessions, use the session ID with text_session_ prefix
    const chatId = `text_session_${session.id}`;
    router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: chatId } });
  };

  const handleTestChat = () => {
    // Navigate to test chat
    router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: '1' } });
  };

  const handleLogout = async () => {
      setShowConfirm(true);
  };

  const confirmLogout = async () => {
    setShowConfirm(false);
    try {
      await authService.signOut();
      router.replace('/');
    } catch (error) {
      showError('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }

    if (parseFloat(withdrawalAmount) > earnings) {
      Alert.alert('Insufficient Funds', 'You cannot withdraw more than your available earnings.');
      return;
    }

    setShowWithdrawalModal(false);
    showProcessing('Processing withdrawal...', 'Please wait while we process your withdrawal request.');

    try {
      const response = await apiService.post('/doctor/wallet/withdraw', {
        amount: parseFloat(withdrawalAmount),
        method: withdrawalMethod
      });

      if (response.success) {
        showSuccess('Success', 'Withdrawal request submitted successfully!');
        
        // Add real-time activity for withdrawal requested
        setActivities(prevActivities => 
          addRealtimeActivity(
            prevActivities,
            'withdrawal_requested',
            'Withdrawal Requested',
            `You requested a withdrawal of $${withdrawalAmount} via ${withdrawalMethod}`,
            {
              doctorName: userData?.display_name || `${userData?.first_name} ${userData?.last_name}`,
              amount: withdrawalAmount,
              method: withdrawalMethod
            }
          )
        );
        
        setWithdrawalAmount('');
        fetchWalletInfo(); // Refresh wallet info
      } else {
        showError('Error', response.message || 'Failed to submit withdrawal request');
      }
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      showError('Error', 'Failed to submit withdrawal request. Please try again.');
    }
  };

  // Manual refresh function for home tab
  const refreshHomeTab = async () => {
    if (!user?.id || refreshingHome) return;
    
    setRefreshingHome(true);
    try {
      // // console.log('🔄 Manual refresh of home tab...');
      
      // Refresh all home data with better error handling
      const promises = [
        fetchAppointments().catch(err => console.error('Error refreshing appointments:', err)),
        fetchBookingRequests().catch(err => console.error('Error refreshing booking requests:', err)),
        fetchConfirmedAppointments().catch(err => console.error('Error refreshing confirmed appointments:', err)),
        fetchActiveTextSessions().catch(err => console.error('Error refreshing text sessions:', err)),
        fetchRatings().catch(err => console.error('Error refreshing ratings:', err)),
        fetchWalletInfo().catch(err => console.error('Error refreshing wallet info:', err))
      ];
      
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('DoctorDashboard: Home refresh - Error:', error);
    } finally {
      setRefreshingHome(false);
    }
  };

  // Manual refresh function for appointments tab
  const refreshAppointmentsTab = async () => {
    if (!user?.id || refreshingAppointments) return;
    
    setRefreshingAppointments(true);
    try {
      // // console.log('🔄 Manual refresh of appointments tab...');
      
      // Refresh appointments data with better error handling
      const promises = [
        fetchBookingRequests().catch(err => console.error('Error refreshing booking requests:', err)),
        fetchConfirmedAppointments().catch(err => console.error('Error refreshing confirmed appointments:', err))
      ];
      
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('DoctorDashboard: Appointments refresh - Error:', error);
    } finally {
      setRefreshingAppointments(false);
    }
  };

  // Manual refresh function for messages tab
  const refreshMessagesTab = async () => {
    if (!user?.id || refreshingMessages) return;
    
    setRefreshingMessages(true);
    try {
      // // console.log('🔄 Manual refresh of messages tab...');
      
      // Refresh messages data with better error handling
      const promises = [
        fetchConfirmedAppointments().catch(err => console.error('Error refreshing confirmed appointments:', err)),
        fetchActiveTextSessions().catch(err => console.error('Error refreshing text sessions:', err))
      ];
      
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('DoctorDashboard: Messages refresh - Error:', error);
    } finally {
      setRefreshingMessages(false);
    }
  };

  // Manual refresh function for working hours tab
  const refreshWorkingHoursTab = async () => {
    if (!user?.id || refreshingWorkingHours) return;
    
    setRefreshingWorkingHours(true);
    try {
      // // console.log('🔄 Manual refresh of working hours tab...');
      
      // Refresh working hours data
      await updateEnabledDaysCount();
    } catch (error) {
      console.error('DoctorDashboard: Working hours refresh - Error:', error);
    } finally {
      setRefreshingWorkingHours(false);
    }
  };

  // Manual refresh function for profile tab
  const refreshProfileTab = async () => {
    if (!user?.id || refreshingProfile) return;
    
    setRefreshingProfile(true);
    try {
      // // console.log('🔄 Manual refresh of profile tab...');
      
      // Refresh user data
      const { refreshUserData } = useAuth();
      await refreshUserData().catch(err => console.error('Error refreshing user data:', err));
    } catch (error) {
      console.error('DoctorDashboard: Profile refresh - Error:', error);
    } finally {
      setRefreshingProfile(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MW', {
      style: 'currency',
      currency: 'MWK'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      console.log('🔍 [formatDate] Input dateString:', dateString);
      
      if (!dateString) {
        console.log('❌ [formatDate] No date string provided');
        return 'No date provided';
      }
      
      // Handle different date formats
      let date: Date;
      
      // If it's already in MM/DD/YYYY format, parse it properly
      if (dateString && dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1; // Month is 0-indexed
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          
          // Validate the date components
          if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year > 1900) {
            date = new Date(year, month, day);
          } else {
            console.error('❌ [formatDate] Invalid date components:', { month, day, year });
            return 'Invalid Date';
          }
        } else {
          console.error('❌ [formatDate] Invalid date format (not 3 parts):', dateString);
          return 'Invalid Date';
        }
      } else if (dateString && dateString.includes('-')) {
        // Handle ISO format (YYYY-MM-DD)
        date = new Date(dateString + 'T00:00:00');
      } else if (dateString) {
        // Try parsing as ISO string or other formats
        date = new Date(dateString);
      } else {
        console.error('❌ [formatDate] No date string provided');
        return 'Invalid Date';
      }
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.error('❌ [formatDate] Invalid date after parsing:', dateString);
        return 'Invalid Date';
      }
      
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      
      console.log('✅ [formatDate] Formatted date:', formattedDate);
      return formattedDate;
    } catch (error) {
      console.error('❌ [formatDate] Error formatting date:', error, 'Input:', dateString);
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString: string) => {
    try {
      console.log('🔍 [formatTime] Input timeString:', timeString);
      
      if (!timeString) {
        console.log('❌ [formatTime] No time string provided');
        return 'No time provided';
      }
      
      // Handle different time formats
      let time: Date;
      
      if (timeString.includes(':')) {
        // Handle HH:MM or HH:MM:SS format
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const minute = parseInt(minutes);
        
        console.log('🔍 [formatTime] Parsed time components:', { hour, minute });
        
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          time = new Date();
          time.setHours(hour, minute, 0, 0);
        } else {
          console.error('❌ [formatTime] Invalid time components:', { hour, minute });
          return 'Invalid Time';
        }
      } else {
        // Try parsing as other formats
        time = new Date(`2000-01-01T${timeString}`);
      }
      
      // Check if the time is valid
      if (isNaN(time.getTime())) {
        console.error('❌ [formatTime] Invalid time after parsing:', timeString);
        return 'Invalid Time';
      }
      
      const formattedTime = time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      console.log('✅ [formatTime] Formatted time:', formattedTime);
      return formattedTime;
    } catch (error) {
      console.error('❌ [formatTime] Error formatting time:', error, 'Input:', timeString);
      return 'Invalid Time';
    }
  };

  const getConsultationTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return 'Text Consultation';
      case 'voice': return 'Voice Call';
      case 'video': return 'Video Call';
      default: return type;
    }
  };

  const getConsultationTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return 'comments';
      case 'voice': return 'phone';
      case 'video': return 'video-camera';
      default: return 'comments';
    }
  };

  // Check if appointment has expired (past appointment time)
  const isAppointmentExpired = (date: string, time: string) => {
    try {
      // // console.log('🔍 [isAppointmentExpired] Checking:', { date, time });
      const appointmentDateTime = new Date(`${date}T${time}`);
      const now = new Date();
      const isExpired = appointmentDateTime < now;
      // // console.log('🔍 [isAppointmentExpired] Result:', { 
      //   appointmentDateTime: appointmentDateTime.toISOString(), 
      //   now: now.toISOString(), 
      //   isExpired 
      // });
      return isExpired;
    } catch (error) {
      console.error('❌ [isAppointmentExpired] Error checking appointment expiration:', error);
      return false;
    }
  };

  const handleOpenReschedule = (booking: BookingRequest) => {
    setSelectedAppointment(booking);
    setShowRescheduleModal(true);
  };

  const handleRescheduleSuccess = async () => {
    // Close the reschedule modal
    setShowRescheduleModal(false);
    setSelectedAppointment(null);
    // Refresh all appointment data
    await Promise.all([
      fetchBookingRequests(),
      fetchConfirmedAppointments()
    ]);
  };

  // Accept handler
  const handleAccept = async (callId: string, callData: any) => {
    setModalVisible(false);
    try {
      // Placeholder: callService is not defined. Implement call logic here if needed.
      // const { pc, localStream } = await callService.acceptCallAsDoctor(user.id, callId);
      // setActiveCall({
      //   pc,
      //   localStream,
      //   remoteParticipantName: callData.callerName || 'Patient',
      //   callType: callData.callType || 'voice',
      // });
    } catch (err: any) {
      Alert.alert('Call Error', err.message || 'Failed to accept call');
    }
  };

  // Reject handler
  const handleReject = async (callId: string) => {
    setModalVisible(false);
    try {
      // Placeholder: Implement call rejection logic here
      // // console.log('Call rejected:', callId);
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  };

  const handleCancelAppointment = (appt: any) => {
    setAppointmentToCancel(appt);
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = () => {
    setShowCancelConfirm(false);
    setCancelReason('');
    setShowCancelReasonModal(true);
  };

  const confirmCancelAppointment = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Reason required', 'Please provide a reason for cancellation.');
      return;
    }
    
    if (!appointmentToCancel) return;
    
    setShowCancelConfirm(false);
    setLoadingRequests(true);
    
    try {
      const response = await apiService.patch(`/appointments/${appointmentToCancel.id}`, {
        status: 2, // STATUS_CANCELLED = 2
        cancellation_reason: cancelReason,
        cancelled_by: 'doctor'
      });

      if (response.success) {
        showSuccess('Success', 'Appointment cancelled successfully.');
        setShowCancelReasonModal(false);
        setShowCancelConfirm(false);
        setAppointmentToCancel(null);
        setCancelReason('');
        
        // INSTANT UPDATE: Remove from confirmed appointments immediately
        setConfirmedAppointments(prev => prev.filter(appt => appt.id !== appointmentToCancel.id));
      } else {
        showError('Error', 'Failed to cancel appointment. Please try again.');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      showError('Error', 'Failed to cancel appointment. Please try again.');
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleCancelAcceptedAppointment = async (appointmentId: number) => {
    try {
      await apiService.delete(`/appointments/${appointmentId}`);
      showSuccess('Success', 'Appointment cancelled successfully');
      setSelectedAcceptedRequest(null);
      
      // INSTANT UPDATE: Remove from confirmed appointments immediately
      setConfirmedAppointments(prev => prev.filter(appt => appt.id !== appointmentId));
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      showError('Error', 'Failed to cancel appointment');
    }
  };

  const renderHomeContent = () => (
    <ScrollView 
      style={styles.content} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshingHome}
          onRefresh={refreshHomeTab}
          colors={['#4CAF50']}
          tintColor="#4CAF50"
        />
      }
    >
      {/* Welcome Section - Updated to match patient dashboard */}
      <View style={{...styles.header, alignItems: 'center', flexDirection: 'column', gap: 0, marginTop: 20, marginBottom: 24}}>
        {/* User Avatar */}
        <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: '#eee', marginBottom: 12 }}>
          {user?.profile_picture_url ? (
            <Image source={{ uri: user.profile_picture_url }} style={{ width: 56, height: 56, borderRadius: 28 }} />
          ) : user?.profile_picture ? (
            <Image source={{ uri: user.profile_picture }} style={{ width: 56, height: 56, borderRadius: 28 }} />
          ) : (
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#4CAF50' }}>
              <FontAwesome name="user-md" size={20} color="#4CAF50" />
            </View>
          )}
        </View>
        <Text
          style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: '#222',
            textAlign: 'center',
            marginBottom: 4,
            maxWidth: 220,
            lineHeight: 34,
            paddingHorizontal: 8,
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          Hi Dr. {user?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'}
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: '#666',
            textAlign: 'center',
            maxWidth: 260,
            lineHeight: 22,
            paddingHorizontal: 8,
          }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Manage your practice and patients
        </Text>
      </View>


      <View style={[styles.quickActions, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('appointments')}>
            <View style={styles.actionIcon}>
              <Icon name="calendar" size={20} color="#666" />
            </View>
            <Text style={styles.actionTitle}>Appointments</Text>
            <Text style={styles.actionSubtitle}>Manage bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('messages')}>
            <View style={styles.actionIcon}>
              <Icon name="message" size={20} color="#666" />
            </View>
            <Text style={styles.actionTitle}>Messages</Text>
            <Text style={styles.actionSubtitle}>Chat with patients</Text>
          </TouchableOpacity>

          <WorkingHoursCard onPress={() => setActiveTab('working-hours')} enabledDaysCount={enabledDaysCount} />

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/doctor-withdrawals')}>
            <View style={styles.actionIcon}>
              <FontAwesome name="money" size={20} color="#666" />
            </View>
            <Text style={styles.actionTitle}>Earnings</Text>
            <Text style={styles.actionSubtitle}>Withdraw funds</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.recentActivity}>
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: '#222',
          marginBottom: 16,
          textAlign: 'center'
        }}>Recent Activity</Text>
        {activities.length > 0 ? (
          activities.slice(0, 5).map((activity, index) => (
            <View key={activity.id} style={{
              backgroundColor: '#F8F9FA',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E8F5E8',
              marginBottom: index < 4 ? 12 : 0,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: activity.color + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  <Icon name={activity.icon as any} size={20} color={activity.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: '#222',
                    marginBottom: 2,
                  }}>{activity.title}</Text>
                  <Text style={{
                    fontSize: 12,
                    color: '#666',
                  }}>{formatTimestamp(activity.timestamp)}</Text>
                </View>
              </View>
              <Text style={{
                fontSize: 14,
                color: '#666',
                lineHeight: 20,
              }}>{activity.description}</Text>
            </View>
          ))
        ) : (
          <View style={{
            alignItems: 'center',
            paddingVertical: 20,
          }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#F0F0F0',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}>
              <Icon name="clock" size={24} color="#999" />
            </View>
            <Text style={{
              fontSize: 16,
              color: '#666',
              textAlign: 'center'
            }}>No recent activity.</Text>
          </View>
        )}
      </View>


    </ScrollView>
  );

  const renderAppointmentsContent = () => (
    <ScrollView 
      style={{...styles.content, backgroundColor: '#F8F9FA'}} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshingAppointments}
          onRefresh={async () => {
            setRefreshingAppointments(true);
            await Promise.all([
              fetchBookingRequests(),
              fetchConfirmedAppointments()
            ]);
            setRefreshingAppointments(false);
          }}
          colors={['#4CAF50']}
          tintColor="#4CAF50"
        />
      }
    >
      
      {/* Sub-tab button group */}
      <View style={{ flexDirection: 'row', marginBottom: 24, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 4, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }}>
        <TouchableOpacity
          style={{
            backgroundColor: appointmentsTab === 'requests' ? '#4CAF50' : 'transparent',
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 20,
            marginRight: 4,
          }}
          onPress={() => setAppointmentsTab('requests')}
        >
          <Text style={{ color: appointmentsTab === 'requests' ? '#fff' : '#7CB18F', fontWeight: 'bold', fontSize: 15 }}>Booking Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: appointmentsTab === 'accepted' ? '#4CAF50' : 'transparent',
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 20,
            marginLeft: 4,
          }}
          onPress={() => setAppointmentsTab('accepted')}
        >
          <Text style={{ color: appointmentsTab === 'accepted' ? '#fff' : '#7CB18F', fontWeight: 'bold', fontSize: 15 }}>Accepted Requests</Text>
        </TouchableOpacity>
      </View>
      {/* Booking Requests Tab */}
      {appointmentsTab === 'requests' && (
        loadingRequests ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading booking requests...</Text>
        </View>
      ) : bookingRequests.filter(request => request.status === 'pending' && !isAppointmentExpired(request.date, request.time)).length === 0 ? (
        <View style={{alignItems: 'center', marginTop: 60}}>
          <View style={{width: 80, height: 80, borderRadius: 40, backgroundColor: '#E0F2E9', alignItems: 'center', justifyContent: 'center', marginBottom: 18}}>
            <Icon name="calendar" size={20} color="#666" />
          </View>
          <Text style={{fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 6}}>No Pending Requests</Text>
          <Text style={{fontSize: 15, color: '#7CB18F', textAlign: 'center'}}>When patients book appointments, they&apos;ll appear here for your review</Text>
        </View>
      ) : (
        <View style={{backgroundColor: 'transparent', marginBottom: 8, paddingHorizontal: 2}}>
            {bookingRequests.filter(request => !request.reschedulePending && request.status === 'pending' && !isAppointmentExpired(request.date, request.time)).map((request) => {
              const isExpired = isAppointmentExpired(request.date, request.time);
              // // console.log('📋 [DoctorDashboard] Rendering appointment:', {
              //   id: request.id,
              //   patientName: request.patientName,
              //   date: request.date,
              //   time: request.time,
              //   status: request.status,
              //   isExpired
              // });
              
              return (
              <TouchableOpacity
                key={request.id}
                style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 20, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}}
                onPress={() => { setSelectedRequest(request); setShowRequestModal(true); }}
                activeOpacity={0.8}
              >
                <View style={{width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: '#E0F2E9', alignItems: 'center', justifyContent: 'center', marginRight: 16}}>
                  <DoctorProfilePicture
                    profilePictureUrl={request.patientProfilePictureUrl}
                    profilePicture={request.patientProfilePicture}
                    size={48}
                    name={request.patient_name}
                  />
                </View>
                <View style={{flex: 1}}>
                  <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', marginBottom: 2}} numberOfLines={1}>{request.patient_name}</Text>
                  <Text style={{color: '#7CB18F', fontSize: 14}} numberOfLines={1}>{formatDate(request.date)} • {formatTime(request.time)}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <View style={{backgroundColor: isExpired ? '#F8D7DA' : '#FFF3CD', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8}}>
                    <Text style={{color: isExpired ? '#721C24' : '#856404', fontSize: 12, fontWeight: 'bold'}}>{isExpired ? 'Expired' : 'Pending'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              );
          })}
        </View>
        )
      )}
      
      
      {/* Accepted Sessions Tab */}
      {appointmentsTab === 'accepted' && (
        loadingConfirmed ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading accepted requests...</Text>
          </View>
        ) : (
          renderAcceptedAppointmentsContent()
        )
      )}

      {/* Booking Request Details Modal */}
      <Modal visible={showRequestModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%', maxWidth: 420, position: 'relative' }}>
            <TouchableOpacity onPress={() => setShowRequestModal(false)} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' }}>
              <Text style={{ color: '#555', fontWeight: 'bold', fontSize: 16 }}>×</Text>
            </TouchableOpacity>
            {selectedRequest && (
              <>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <DoctorProfilePicture
                    profilePictureUrl={selectedRequest.patientProfilePictureUrl}
                    profilePicture={selectedRequest.patientProfilePicture}
                    size={72}
                    name={selectedRequest.patient_name}
                  />
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginTop: 10 }} numberOfLines={1}>{selectedRequest.patient_name}</Text>
                  {selectedRequest.patientEmail ? (
                    <Text style={{ fontSize: 14, color: '#666' }} numberOfLines={1}>{selectedRequest.patientEmail}</Text>
                  ) : null}
                  {(selectedRequest.patientCountry || selectedRequest.patientCity || selectedRequest.patientDateOfBirth || selectedRequest.patientGender) ? (
                    <Text style={{ fontSize: 14, color: '#4CAF50', marginTop: 4 }} numberOfLines={1}>
                      {selectedRequest.patientCity ? `${selectedRequest.patientCity}, ` : ''}
                      {selectedRequest.patientCountry || ''}
                      {(() => {
                        if (!selectedRequest.patientDateOfBirth) return '';
                        const dob = new Date(selectedRequest.patientDateOfBirth);
                        if (isNaN(dob.getTime())) return '';
                        const diff = Date.now() - dob.getTime();
                        const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
                        return age ? ` • ${age} yrs` : '';
                      })()}
                      {selectedRequest.patientGender ? ` • ${String(selectedRequest.patientGender).charAt(0).toUpperCase()}${String(selectedRequest.patientGender).slice(1)}` : ''}
                    </Text>
                  ) : null}
                </View>
                <View style={{ backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                  <Text style={{ color: '#222', fontWeight: '600', marginBottom: 8 }}>Appointment Details</Text>
                  <Text style={{ color: '#4CAF50', marginBottom: 4 }}>{formatDate(selectedRequest.date)} • {formatTime(selectedRequest.time)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ backgroundColor: '#E8F5E8', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 }}>
                      <Text style={{ color: '#2E7D32', fontWeight: '600' }}>{getConsultationTypeLabel(selectedRequest.appointment_type)}</Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: '#222', fontWeight: '600', marginBottom: 4 }}>Reason</Text>
                    <Text style={{ color: '#666' }}>
                      {selectedRequest.reason && selectedRequest.reason.trim() !== '' 
                        ? selectedRequest.reason 
                        : 'No reason provided'}
                    </Text>
                  </View>
                  <View style={{ marginTop: 12, backgroundColor: '#FFF8E1', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#FFE082' }}>
                    <Text style={{ color: '#8D6E63', fontSize: 12 }}>
                      Note: Please respect the scheduled appointment time. Late responses or missed appointments can lead to poor reviews and account suspension.
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#ADB5BD', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                    onPress={() => { 
                      if (selectedRequest) {
                        if (isAppointmentExpired(selectedRequest.date, selectedRequest.time)) {
                          handleDeleteExpiredAppointment(selectedRequest);
                        } else {
                          handleRejectBooking(selectedRequest);
                        }
                      }
                      setShowRequestModal(false); 
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                      {isAppointmentExpired(selectedRequest.date, selectedRequest.time) ? 'Delete' : 'Reject'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: isAppointmentExpired(selectedRequest.date, selectedRequest.time) ? '#E0E0E0' : '#4CAF50', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                    disabled={isAppointmentExpired(selectedRequest.date, selectedRequest.time)}
                    onPress={() => { if (selectedRequest) handleAcceptBooking(selectedRequest); setShowRequestModal(false); }}
                  >
                    <Text style={{ color: isAppointmentExpired(selectedRequest.date, selectedRequest.time) ? '#999' : '#fff', fontWeight: 'bold' }}>{isAppointmentExpired(selectedRequest.date, selectedRequest.time) ? 'Expired' : 'Accept'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal visible={showCancelConfirm} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 320 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Confirm Cancellation</Text>
            <Text style={{ marginBottom: 8 }}>Are you sure you want to cancel this appointment?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setShowCancelConfirm(false)} style={{ marginRight: 16 }}>
                <Text style={{ color: '#888', fontWeight: 'bold' }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCancelConfirm} style={{ backgroundColor: '#FF3B30', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 20 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Reason Input Modal */}
      <Modal visible={showCancelReasonModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 320 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Cancel Appointment</Text>
            <Text style={{ marginBottom: 8 }}>Please provide a reason for cancellation:</Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Reason..."
              style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8, marginBottom: 16 }}
              multiline
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setShowCancelReasonModal(false)} style={{ marginRight: 16 }}>
                <Text style={{ color: '#888', fontWeight: 'bold' }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmCancelAppointment} style={{ backgroundColor: '#FF3B30', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 20 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel Appointment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  const renderMessagesContent = () => (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>

      {/* Search Bar */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F5F5F5', 
        borderRadius: 25, 
        marginHorizontal: 20, 
        marginBottom: 16, 
        paddingHorizontal: 18, 
        height: 50,
        borderWidth: 1,
        borderColor: '#E5E5E5',
      }}>
        <Icon name="search" size={20} color="#999" />
        <TextInput
          style={{ flex: 1, fontSize: 16, color: '#333', backgroundColor: 'transparent', marginLeft: 12 }}
          placeholder="Search conversations..."
          placeholderTextColor="#999"
        />
      </View>

      {/* Unified Chat List - WhatsApp Style Inbox */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {(() => {
          // Get active text sessions and add to list
          const activeTextSessionItems = activeTextSessions.map(session => ({
            ...session,
            type: 'active_text',
            sortDate: new Date().getTime(), // Most recent
            isActive: true
          }));

          // Get confirmed appointments
          const confirmedAppointmentItems = confirmedAppointments.map(appt => ({
            ...appt,
            type: 'confirmed',
            sortDate: (() => {
              if (appt.updatedAt) return new Date(appt.updatedAt).getTime();
              if (appt.createdAt) return new Date(appt.createdAt).getTime();
              if (appt.date && appt.time) {
                try {
                  const [month, day, year] = (appt.date || '').split('/').map(Number);
                  const [hour, minute] = (appt.time || '').split(':').map(Number);
                  return new Date(year, month - 1, day, hour, minute).getTime();
                } catch {
                  return 0;
                }
              }
              return 0;
            })(),
            isActive: false
          }));

          // Combine all items and sort by date (most recent first)
          const allItems = [...activeTextSessionItems, ...confirmedAppointmentItems]
            .sort((a, b) => b.sortDate - a.sortDate);

          if (loadingConfirmed || loadingTextSessions) {
            return (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading patients...</Text>
              </View>
            );
          }

          if (allItems.length === 0) {
            return (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Icon name="user" size={20} color="#666" />
                </View>
                <Text style={styles.emptyStateTitle}>No Active Chats</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Patients will appear here once you accept their booking requests or start text sessions
                </Text>
                <View style={styles.emptyStateAction}>
                  <Icon name="calendar" size={20} color="#666" />
                  <Text style={styles.emptyStateActionText}>Check Appointments Tab</Text>
                </View>
              </View>
            );
          }

          return allItems.map((item, index) => {
            const isLastItem = index === allItems.length - 1;
            
            if (item.type === 'active_text') {
              // Render active text session as card
              return (
                <TouchableOpacity
                  key={`active_text_${item.id}`}
                  style={{ 
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    marginHorizontal: 20,
                    marginBottom: 12,
                    padding: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                    borderWidth: item.isActive ? 2 : 0,
                    borderColor: item.isActive ? '#4CAF50' : 'transparent'
                  }}
                  onPress={() => handleSelectTextSession(item)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ position: 'relative' }}>
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: '#4CAF50',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 16
                      }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>
                          {item.patient?.first_name?.charAt(0) || 'P'}
                        </Text>
                      </View>
                      {/* Active indicator */}
                      {item.isActive && (
                        <View style={{
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: '#4CAF50',
                          borderWidth: 2,
                          borderColor: '#FFFFFF'
                        }} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 4 }} numberOfLines={1}>
                        {item.patient_name || `${item.patient?.first_name || ''} ${item.patient?.last_name || ''}`.trim() || 'Unknown Patient'}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#4CAF50', marginBottom: 2 }} numberOfLines={1}>
                        Text Session
                      </Text>
                      <Text style={{ fontSize: 14, color: '#666' }} numberOfLines={1}>
                        {item.status === 'waiting_for_doctor' ? 'Waiting for response' : 'Active'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#999' }}>
                      Now
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            } else {
              // Render confirmed appointment as card
              return (
                <TouchableOpacity
                  key={`confirmed_${item.id || item.patientId || 'unknown'}`}
                  style={{ 
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    marginHorizontal: 20,
                    marginBottom: 12,
                    padding: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3
                  }}
                  onPress={() => handleSelectPatient(item)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: '#D1E7DD',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 16
                    }}>
                      <Text style={{ color: '#666', fontSize: 18, fontWeight: 'bold' }}>
                        {String(item.patient_name || `${item.patient?.first_name || ''} ${item.patient?.last_name || ''}`.trim() || 'Unknown Patient').charAt(0) || 'P'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 4 }} numberOfLines={1}>
                        {String(item.patient_name || 'Unknown Patient')}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#4CAF50', marginBottom: 2 }} numberOfLines={1}>
                        {String(item.reason || 'Chat')}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, color: '#666' }} numberOfLines={1}>
                          {item.consultationType === 'text' ? 'Text Chat' : 
                           item.consultationType === 'voice' ? 'Voice Call' : 
                           item.consultationType === 'video' ? 'Video Call' : 'Chat'}
                        </Text>
                        {isAppointmentUpcoming(item) && (
                          <View style={{
                            backgroundColor: '#FFF3E0',
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            marginLeft: 8,
                            borderWidth: 1,
                            borderColor: '#FFB74D',
                          }}>
                            <Text style={{ fontSize: 10, color: '#FF9800', fontWeight: '600' }}>
                              UPCOMING
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: '#999' }}>
                      {item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }
          });
        })()}
      </ScrollView>
    </View>
  );

  const renderProfileContent = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={{alignItems: 'center', marginBottom: 18}}>
        {user?.profile_picture_url ? (
          <Image source={{ uri: user.profile_picture_url }} style={{width: 96, height: 96, borderRadius: 48, backgroundColor: '#F0F8FF', marginBottom: 10}} />
        ) : user?.profile_picture ? (
          <Image source={{ uri: user.profile_picture }} style={{width: 96, height: 96, borderRadius: 48, backgroundColor: '#F0F8FF', marginBottom: 10}} />
        ) : (
          <View style={{width: 96, height: 96, borderRadius: 48, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 3, borderColor: '#4CAF50'}}>
            <FontAwesome name="user-md" size={32} color="#4CAF50" />
          </View>
        )}
        <Text style={{fontSize: 22, fontWeight: 'bold', color: '#222', textAlign: 'center'}}>{user?.display_name || user?.email?.split('@')[0] || 'Doctor'}</Text>
        {userData?.status === 'approved' && <Text style={{color: '#4CAF50', fontWeight: 'bold', fontSize: 15, textAlign: 'center', marginBottom: 2}}>Verified</Text>}
        <Text style={{color: '#4CAF50', fontSize: 15, textAlign: 'center', marginBottom: 2}}>Joined {userData?.created_at ? new Date(userData.created_at).getFullYear() : '2021'}</Text>
      </View>

      {/* Account Section */}
      <Text style={{fontSize: 17, fontWeight: 'bold', color: '#222', marginTop: 18, marginBottom: 8, marginLeft: 18}}>Account</Text>
      <View style={{backgroundColor: 'transparent', marginBottom: 8, paddingHorizontal: 8}}>
        <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}}>
          <View style={{width: 40, height: 40, borderRadius: 12, backgroundColor: '#E0F2E9', alignItems: 'center', justifyContent: 'center', marginRight: 16}}><Icon name="email" size={20} color="#666" /></View>
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>Email</Text>
          <Text style={{color: '#4CAF50', fontSize: 15, textAlign: 'right', flex: 1.2}}>{user?.email || 'Not provided'}</Text>
        </View>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => router.push('/doctor-withdrawals')}>
          <View style={{width: 40, height: 40, borderRadius: 12, backgroundColor: '#E0F2E9', alignItems: 'center', justifyContent: 'center', marginRight: 16}}><FontAwesome name="money" size={20} color="#666" /></View>
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>Earnings</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Settings Section */}
      <Text style={{fontSize: 17, fontWeight: 'bold', color: '#222', marginTop: 18, marginBottom: 8, marginLeft: 18}}>Settings</Text>
      <View style={{backgroundColor: 'transparent', marginBottom: 8, paddingHorizontal: 8}}>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => router.push('/doctor-profile')}>
          <View style={{width: 40, height: 40, borderRadius: 12, backgroundColor: '#E0F2E9', alignItems: 'center', justifyContent: 'center', marginRight: 16}}><Icon name="user" size={20} color="#666" /></View>
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>View Profile</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => router.push('/edit-doctor-profile')}>
          <View style={{width: 40, height: 40, borderRadius: 12, backgroundColor: '#E0F2E9', alignItems: 'center', justifyContent: 'center', marginRight: 16}}><Icon name="user" size={20} color="#666" /></View>
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>Edit Profile</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => router.push('/privacy-settings')}>
          <View style={{width: 40, height: 40, borderRadius: 12, backgroundColor: '#E0F2E9', alignItems: 'center', justifyContent: 'center', marginRight: 16}}><Icon name="eye" size={20} color="#666" /></View>
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>Privacy Settings</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => router.push('/notifications-settings')}>
          <View style={{width: 40, height: 40, borderRadius: 12, backgroundColor: '#E0F2E9', alignItems: 'center', justifyContent: 'center', marginRight: 16}}><Icon name="bell" size={20} color="#666" /></View>
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>Notifications</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
                 <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => setActiveTab('home')}>
           <View style={{width: 40, height: 40, borderRadius: 12, backgroundColor: '#E0F2E9', alignItems: 'center', justifyContent: 'center', marginRight: 16}}><Icon name="clock" size={20} color="#666" /></View>
           <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>Working Hours</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={[{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}, {marginTop: 20}]} onPress={handleLogout}>
        <View style={{width: 40, height: 40, borderRadius: 12, backgroundColor: '#E0F2E9', alignItems: 'center', justifyContent: 'center', marginRight: 16}}><Icon name="signOut" size={20} color="#666" /></View>
        <Text style={[{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}, {color: '#FF3B30'}]}>Logout</Text>
        <Icon name="chevronRight" size={20} color="#666" />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderWorkingHoursContent = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* Working Hours Component */}
      <View style={{marginBottom: 20}}>
        <WorkingHours />
      </View>
    </ScrollView>
  );

  const renderAcceptedAppointmentsContent = () => {
    if (confirmedAppointments.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No accepted appointments</Text>
        </View>
      );
    }
  
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{backgroundColor: 'transparent', marginBottom: 8, paddingHorizontal: 2}}>
          {confirmedAppointments.map((appointment) => (
            <TouchableOpacity
              key={appointment.id}
              style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 20, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}}
              onPress={() => setSelectedAcceptedRequest(appointment)}
              activeOpacity={0.8}
            >
              <View style={{width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: '#E0F2E9', alignItems: 'center', justifyContent: 'center', marginRight: 16}}>
                <DoctorProfilePicture
                  profilePictureUrl={appointment.patientProfilePictureUrl}
                  profilePicture={appointment.patientProfilePicture}
                  size={48}
                  name={appointment.patient_name}
                />
              </View>
              <View style={{flex: 1}}>
                <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', marginBottom: 2}} numberOfLines={1}>{appointment.patient_name}</Text>
                <Text style={{color: '#7CB18F', fontSize: 14}} numberOfLines={1}>
                  {formatDate(appointment.appointment_date)} • {formatTime(appointment.appointment_time)}
                </Text>
                <Text style={{color: '#666', fontSize: 13, marginTop: 2}} numberOfLines={1}>{appointment.appointment_type}</Text>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <View style={{backgroundColor: '#E8F5E8', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8}}>
                  <Text style={{color: '#2E7D32', fontSize: 12, fontWeight: 'bold'}}>Accepted</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  const showAcceptedRequestDetailsModal = () => {
    if (!selectedAcceptedRequest) return null;
  
    const patientAge = selectedAcceptedRequest.patientDateOfBirth 
      ? new Date().getFullYear() - new Date(selectedAcceptedRequest.patientDateOfBirth).getFullYear()
      : null;
  
    return (
      <Modal visible={!!selectedAcceptedRequest} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%', maxWidth: 420, position: 'relative' }}>
            <TouchableOpacity onPress={() => setSelectedAcceptedRequest(null)} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' }}>
              <Text style={{ color: '#555', fontWeight: 'bold', fontSize: 16 }}>×</Text>
            </TouchableOpacity>
            {selectedAcceptedRequest && (
              <>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <DoctorProfilePicture
                    profilePictureUrl={selectedAcceptedRequest.patientProfilePictureUrl}
                    profilePicture={selectedAcceptedRequest.patientProfilePicture}
                    size={72}
                    name={selectedAcceptedRequest.patient_name}
                  />
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginTop: 10 }} numberOfLines={1}>{selectedAcceptedRequest.patient_name}</Text>
                  {selectedAcceptedRequest.patientEmail ? (
                    <Text style={{ fontSize: 14, color: '#666' }} numberOfLines={1}>{selectedAcceptedRequest.patientEmail}</Text>
                  ) : null}
                  {(selectedAcceptedRequest.patientCountry || selectedAcceptedRequest.patientCity || selectedAcceptedRequest.patientDateOfBirth || selectedAcceptedRequest.patientGender) ? (
                    <Text style={{ fontSize: 14, color: '#4CAF50', marginTop: 4 }} numberOfLines={1}>
                      {selectedAcceptedRequest.patientCity ? `${selectedAcceptedRequest.patientCity}, ` : ''}
                      {selectedAcceptedRequest.patientCountry || ''}
                      {(() => {
                        if (!selectedAcceptedRequest.patientDateOfBirth) return '';
                        const dob = new Date(selectedAcceptedRequest.patientDateOfBirth);
                        if (isNaN(dob.getTime())) return '';
                        const diff = Date.now() - dob.getTime();
                        const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
                        return age ? ` • ${age} yrs` : '';
                      })()}
                      {selectedAcceptedRequest.patientGender ? ` • ${String(selectedAcceptedRequest.patientGender).charAt(0).toUpperCase()}${String(selectedAcceptedRequest.patientGender).slice(1)}` : ''}
                    </Text>
                  ) : null}
                </View>
                <View style={{ backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                  <Text style={{ color: '#222', fontWeight: '600', marginBottom: 8 }}>Appointment Details</Text>
                  <Text style={{ color: '#4CAF50', marginBottom: 4 }}>{formatDate(selectedAcceptedRequest.appointment_date)} • {formatTime(selectedAcceptedRequest.appointment_time)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ backgroundColor: '#E8F5E8', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 }}>
                      <Text style={{ color: '#2E7D32', fontWeight: '600' }}>{getConsultationTypeLabel(selectedAcceptedRequest.appointment_type)}</Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: '#222', fontWeight: '600', marginBottom: 4 }}>Reason</Text>
                    <Text style={{ color: '#666' }}>{selectedAcceptedRequest.reason || 'No reason provided'}</Text>
                  </View>
                  <View style={{ marginTop: 12, backgroundColor: '#FFF8E1', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#FFE082' }}>
                    <Text style={{ color: '#8D6E63', fontSize: 12 }}>
                      Note: Cancelling appointments may affect your rating and patient trust. Please only cancel if absolutely necessary.
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center', minWidth: 120 }}
                    onPress={() => handleCancelAppointment(selectedAcceptedRequest)}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel Appointment</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeContent();
      case 'appointments':
        return renderAppointmentsContent();
      case 'messages':
        return renderMessagesContent();
      case 'working-hours':
        return renderWorkingHoursContent();
      case 'profile':
        return renderProfileContent();
      case 'accepted':
        return renderAcceptedAppointmentsContent();
      default:
        return renderHomeContent();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 4, 
        backgroundColor: '#FFFFFF', 
        zIndex: 10,
        marginBottom: 8,
      }}>
        <TouchableOpacity style={styles.hamburgerButton} onPress={openSidebar}>
          <View style={styles.hamburgerIcon}>
            <View style={styles.hamburgerLine1} />
            <View style={styles.hamburgerLine2} />
            <View style={styles.hamburgerLine3} />
          </View>
        </TouchableOpacity>
        
        {/* Dynamic Header Content */}
        {activeTab === 'home' ? (
          <Image 
            source={require('../assets/images/DA logo green.png')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
        ) : activeTab === 'appointments' ? (
          <View style={{ height: 60, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Appointments</Text>
          </View>
        ) : activeTab === 'messages' ? (
          <View style={{ height: 60, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Messages</Text>
          </View>
        ) : activeTab === 'working-hours' ? (
          <View style={{ height: 60, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Working Hours</Text>
          </View>
        ) : activeTab === 'profile' ? (
          <View style={{ height: 60, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
        ) : (
          <Image 
            source={require('../assets/images/DA logo green.png')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
        )}
        
        {/* Notification Icon - Right side with margin */}
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => router.push('/notifications')}
        >
          <FontAwesome name="bell" size={20} color="#4CAF50" />
          {/* Unread notification badge */}
          {unreadNotificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadNotificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        {renderContent()}
      </View>
      
      <BottomNavigation
        tabs={[
          {
            icon: "home",
            label: "Home",
            isActive: activeTab === 'home',
            onPress: () => setActiveTab('home')
          },
          {
            icon: "calendar",
            label: "Appointments",
            isActive: activeTab === 'appointments',
            onPress: () => setActiveTab('appointments'),
            badge: (() => {
              const pendingRequests = bookingRequests.filter(req => req.status === 'pending' || req.status === 0);
              return pendingRequests.length > 0 ? pendingRequests.length : undefined;
            })()
          },
          {
            icon: "comments",
            label: "Messages",
            isActive: activeTab === 'messages',
            onPress: () => setActiveTab('messages')
          },
          {
            icon: "clock",
            label: "Working Hours",
            isActive: activeTab === 'working-hours',
            onPress: () => setActiveTab('working-hours')
          },
          ...(activeTab === 'accepted' ? [{
            icon: "calendar",
            label: "Accepted",
            isActive: activeTab === 'accepted',
            onPress: () => setActiveTab('accepted')
          }] : [])
        ]}
      />

      {/* Sidebar */}
      {sidebarVisible && (
        <View style={styles.sidebarOverlay}>
          <TouchableOpacity style={styles.sidebarOverlayTouchable} activeOpacity={1} onPress={closeSidebar} />
          <Animated.View
            style={[
              styles.sidebar,
              Platform.OS === 'web' ? {
                transform: `translateX(${webSidebarTransform}px)`,
              } : {
                transform: [
                  {
                    translateX: sidebarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-300, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <ScrollView 
              style={styles.sidebarScrollView}
              contentContainerStyle={styles.sidebarContent}
              showsVerticalScrollIndicator={true}
              bounces={true}
              alwaysBounceVertical={false}
              scrollEnabled={true}
            >
            {/* Profile Header */}
            <View style={styles.sidebarHeader}>
              {user?.profile_picture_url ? (
                <Image source={{ uri: user.profile_picture_url }} style={styles.sidebarProfileImage} />
              ) : user?.profile_picture ? (
                <Image source={{ uri: user.profile_picture }} style={styles.sidebarProfileImage} />
              ) : (
                <View style={[styles.sidebarProfileImage, { backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#4CAF50' }]}>
                  <FontAwesome name="user-md" size={24} color="#4CAF50" />
                </View>
              )}
              <Text style={styles.sidebarUserName}>{userData?.display_name || user?.display_name || 'Doctor'}</Text>
              <Text style={styles.sidebarUserEmail}>{userData?.email || user?.email || 'doctor@example.com'}</Text>
            </View>
            
            {/* Profile Section */}
            <View style={styles.sectionGroup}>
              <TouchableOpacity style={styles.sidebarMenuItem} onPress={() => { closeSidebar(); router.push('/doctor-profile'); }}>
                <View style={styles.iconBox}><Icon name="eye" size={20} color="#4CAF50" /></View>
                <Text style={styles.sidebarMenuItemText}>View Profile</Text>
                <View style={{ marginLeft: 'auto' }}>
                  <Icon name="chevronRight" size={20} color="#4CAF50" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarMenuItem} onPress={() => { closeSidebar(); router.push('/edit-doctor-profile'); }}>
                <View style={styles.iconBox}><Icon name="edit" size={20} color="#4CAF50" /></View>
                <Text style={styles.sidebarMenuItemText}>Edit Profile</Text>
                <View style={{ marginLeft: 'auto' }}>
                  <Icon name="chevronRight" size={20} color="#4CAF50" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarMenuItem} onPress={() => { closeSidebar(); router.push('/help-support'); }}>
                <View style={styles.iconBox}><Icon name="questionCircle" size={20} color="#4CAF50" /></View>
                <Text style={styles.sidebarMenuItemText}>Help & Support</Text>
                <View style={{ marginLeft: 'auto' }}>
                  <Icon name="chevronRight" size={20} color="#4CAF50" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarMenuItem} onPress={() => { closeSidebar(); router.push('/doctor-settings'); }}>
                <View style={styles.iconBox}><Icon name="cog" size={20} color="#4CAF50" /></View>
                <Text style={styles.sidebarMenuItemText}>Settings</Text>
                <View style={{ marginLeft: 'auto' }}>
                  <Icon name="chevronRight" size={20} color="#4CAF50" />
                </View>
              </TouchableOpacity>
            </View>
              
            
            {/* Logout */}
            <TouchableOpacity style={[styles.sidebarMenuItem, styles.lastMenuItem]} onPress={() => { closeSidebar(); handleLogout(); }}>
              <View style={styles.iconBox}><Icon name="signOut" size={20} color="#FF3B30" /></View>
              <Text style={[styles.sidebarMenuItemText, { color: '#FF3B30' }]}>Logout</Text>
              <View style={{ marginLeft: 'auto' }}>
                <Icon name="chevronRight" size={20} color="#FF3B30" />
              </View>
            </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      )}

      <ConfirmDialog
        visible={showConfirm}
        onConfirm={confirmLogout}
        onCancel={() => setShowConfirm(false)}
        message="Are you sure you want to logout?"
        type="logout"
      />
      <AlertDialog
        visible={alertState.visible}
        onClose={hideAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttonText={alertState.buttonText}
      />

      {/* Reschedule Modal */}
      <RescheduleModal
        visible={showRescheduleModal}
        appointment={selectedAppointment}
        onClose={() => {
          setShowRescheduleModal(false);
          setSelectedAppointment(null);
        }}
        onConfirm={handleRescheduleSuccess}
      />
      {showAcceptedRequestDetailsModal()}
      
      {/* Onboarding Overlay */}
      <OnboardingOverlay
        visible={showOnboarding}
        userType="doctor"
        missingFields={missingFields}
        onComplete={() => {
          setShowOnboarding(false);
          router.push('/edit-doctor-profile');
        }}
        onDismiss={() => {
          setShowOnboarding(false);
          setOnboardingDismissed(true);
        }}
      />
      
      {/* Doctor Activation Modal */}
      <DoctorActivationModal
        visible={showActivationModal}
        onClose={() => setShowActivationModal(false)}
        onSuccess={() => {
          setShowActivationModal(false);
          // Refresh user data to reflect the activation
          if (user) {
            // You might want to refresh the user data here
            console.log('Doctor account activated successfully');
          }
        }}
        userData={userData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  mainContent: {
    flex: 1,
    maxWidth: maxWidth,
    alignSelf: 'center',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 80, // Space for absolutely positioned bottom navigation
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? 40 : 20,
    // paddingTop: 20, // Removed to eliminate extra gap
  },
  header: {
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: isLargeScreen ? 32 : 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: isLargeScreen ? 18 : 16,
    color: '#666',
  },
  quickActions: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: isLargeScreen ? 22 : 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isWeb ? 24 : 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: '48%',
    marginBottom: 16,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: isLargeScreen ? 16 : 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: isLargeScreen ? 14 : 12,
    color: '#666',
    textAlign: 'center',
  },
  statsContainer: {
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isWeb ? 24 : 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: '48%',
    marginBottom: 16,
  },
  statNumber: {
    fontSize: isLargeScreen ? 32 : 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: isLargeScreen ? 14 : 12,
    color: '#666',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  appointmentList: {
    marginBottom: 30,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  appointmentTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
  },
  appointmentStatus: {
    alignSelf: 'flex-start',
  },
  statusPending: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusConfirmed: {
    backgroundColor: '#34C759',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  messageList: {
    marginBottom: 30,
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageSender: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  unreadIndicator: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  unreadText: {
    backgroundColor: '#FF3B30',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  profileSection: {
    marginBottom: 30,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 12,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
    flex: 1,
  },
  logoutText: {
    color: '#FF3B30',
  },
  recentActivity: {
    marginBottom: 30,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
  },
  activityTime: {
    fontSize: 14,
    color: '#666',
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyStateAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  emptyStateActionText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 8,
  },
  bookingRequestsList: {
    marginBottom: 30,
  },
  bookingRequestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestStatus: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  requestDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  reasonSection: {
    marginBottom: 8,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  acceptButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesHeader: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  messagesHeaderContent: {
    flexDirection: 'column',
  },
  messagesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  messagesTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 12,
  },
  messagesSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  messagesStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  patientsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedPatientCard: {
    backgroundColor: '#F0F8FF',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  patientCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  patientInfo: {
    flex: 1,
  },
  patientMeta: {
    flexDirection: 'column',
    gap: 4,
  },
  consultationTypeBadge: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  consultationTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentTimeText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  patientCardRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
    marginLeft: 4,
  },
  rescheduleButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  rescheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  balanceContainer: {
    padding: 8,
  },
  balanceText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  ratingsSection: {
    marginBottom: 30,
  },
  ratingsList: {
    marginBottom: 20,
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingDate: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  ratingComment: {
    fontSize: 14,
    color: '#666',
  },
  noRatingsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noRatingsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
  },
  noRatingsSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  moreRatingsText: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '600',
  },
  profileCardsRow: {
    flexDirection: 'row',
  },
  profileCardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
    minWidth: 0,
    marginBottom: 20,
  },
  profileCardNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'flex-start',
    gap: 22,
  },
  profileImageContainer: {
    width: 110,
    height: 110,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#F0F8FF',
    marginRight: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 22,
    resizeMode: 'cover',
  },
  profileInfoNew: {
    flex: 1,
  },
  profileNameNew: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  profileEmailNew: {
    fontSize: 15,
    color: '#444',
    marginBottom: 2,
  },
  profileTypeNew: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 2,
  },
  earningsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    alignItems: 'center',
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  earningsButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 28,
    alignSelf: 'center',
    marginTop: 8,
  },
  earningsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  welcomeHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  sidebarWelcomeText: {
    fontSize: 16,
    color: '#666666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
  },
  hamburgerButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  hamburgerIcon: {
    width: 20,
    height: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  hamburgerLine1: {
    width: 18,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  hamburgerLine2: {
    width: 14,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  hamburgerLine3: {
    width: 10,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  headerLogo: {
    width: 140,
    height: 60,
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    flexDirection: 'row',
  },
  sidebarOverlayTouchable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: 300,
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  sidebarScrollView: {
    flex: 1,
  },
  sidebarContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sidebarHeader: {
    marginTop: 32,
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 20,
  },
  sidebarProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  sidebarUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  sidebarUserEmail: {
    fontSize: 14,
    color: '#666',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  sectionGroup: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  sidebarMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sidebarMenuItemText: {
    fontSize: 16,
    color: '#222',
    marginLeft: 4,
    fontWeight: '600',
    flex: 1,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
    marginTop: 20,
  },
  chevron: {
    marginLeft: 8,
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestCardInfo: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalPatientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  patientDemographics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  demographicText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  modalDetails: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
  },
  modalNote: {
    marginBottom: 16,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    height: 60,
    lineHeight: 60,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 