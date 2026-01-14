// Move all import statements to the top
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  BackHandler,
  Dimensions,
  Easing,
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
import Icon, { IconName } from '../components/Icon';
import { RealTimeEventService } from '../services/realTimeEventService';
import { Activity, addRealtimeActivity, generateUserActivities } from '../utils/activityUtils';

import AlertDialog from '../components/AlertDialog';
import CacheManagementModal from '../components/CacheManagementModal';
import ChatbotModal from '../components/ChatbotModal';
import ConfirmDialog from '../components/ConfirmDialog';
import DocBotChat from '../components/DocBotChat';
import DoctorCard from '../components/DoctorCard';
import DoctorProfilePicture from '../components/DoctorProfilePicture';
import EmergencyModal from '../components/EmergencyModal';
import { DoctorCardSkeleton } from '../components/skeleton';
import { stripDoctorPrefix, withDoctorPrefix } from '../utils/name';

import { useTextAppointmentConverter } from '../hooks/useTextAppointmentConverter';
import { appointmentService } from '../services/appointmentService';
import { EndedSessionMetadata, endedSessionStorageService } from '../services/endedSessionStorageService';
import { apiService } from './services/apiService';


import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/hooks/useAlert';
import { useAnonymousMode } from '@/hooks/useAnonymousMode';
import { useCustomTheme } from '@/hooks/useCustomTheme';
import { useThemedColors } from '@/hooks/useThemedColors';
import authService from '@/services/authService';
import { LocationInfo, LocationService } from '@/services/locationService';
import { NotificationService } from '@/services/notificationService';
import AppTour from '../components/AppTour';
import CheckoutWebViewModal from '../components/CheckoutWebViewModal';
import FilterModal from '../components/FilterModal';
import IncompleteProfileBlock from '../components/IncompleteProfileBlock';
import OnboardingOverlay from '../components/OnboardingOverlay';
import SpecializationFilterModal from '../components/SpecializationFilterModal';
import { Colors } from '../constants/Colors';
import appTourService from '../services/appTourService';
import favoriteDoctorsService from '../services/favoriteDoctorsService';
import { imageCacheService } from '../services/imageCacheService';
import { paymentsService } from '../services/paymentsService';
import { getMissingFields } from '../utils/profileUtils';
import Blog from './blog';
const profileImage = require('../assets/images/profile.jpg');
const discoverBanner1 = require('../assets/images/discover.png');
const discoverBanner2 = require('../assets/images/discover2.png');
const discoverBanner3 = require('../assets/images/discover3.png');
const discoverBanner5 = require('../assets/images/discover5.png');
const discoverBanner6 = require('../assets/images/discover6.png');

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 1200 : width;
const isLargeScreen = width > 768;

// Subscription plans will be loaded dynamically based on user location

interface TabProps {
  icon: IconName;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

// Local interfaces for subscription types
interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  textSessions: number;
  voiceCalls: number;
  videoCalls: number;
  features: string[];
  popular?: boolean;
  bestValue?: boolean;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  planName: string;
  plan_price: number;
  plan_currency: string;
  textSessionsRemaining: number;
  voiceCallsRemaining: number;
  videoCallsRemaining: number;
  totalTextSessions: number;
  totalVoiceCalls: number;
  totalVideoCalls: number;
  activatedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export default function PatientDashboard() {
  const { user, userData, loading, refreshUserData } = useAuth();
  const { alertState, showAlert, hideAlert, showSuccess, showError, showProcessing } = useAlert();
  const { isAnonymousModeEnabled } = useAnonymousMode();

  // Theme support
  const colors = useThemedColors();
  const { theme, isDark } = useCustomTheme();
  const isDarkMode = isAnonymousModeEnabled && isDark;

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [checkoutTxRef, setCheckoutTxRef] = useState('');
  const paymentPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [pendingLogout, setPendingLogout] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [showCacheManagement, setShowCacheManagement] = useState(false);
  const [isDocBotBottomHidden, setIsDocBotBottomHidden] = useState(false);

  const { triggerConversionCheck } = useTextAppointmentConverter({
    appointments: appointments || [],
    onTextSessionCreated: (textSession) => {
      console.log('🔄 [PatientDashboard] Text session created from appointment:', textSession);
      // Call the refresh function (using the function defined later)
      refreshMessagesTab();
    },
    onAppointmentUpdated: (appointmentId) => {
      console.log('🔄 [PatientDashboard] Appointment updated:', appointmentId);
      // Refresh appointments to get updated status
      refreshMessagesTab();
    },
  });

  const pollPaymentStatus = useCallback(async () => {
    if (!checkoutTxRef) return;
    try {
      console.log(`📡 Polling status for tx_ref: ${checkoutTxRef}`);
      const timestamp = new Date().getTime();
      const response = await fetch(`https://docavailable-3vbdv.ondigitalocean.app/api/payments/status?tx_ref=${checkoutTxRef}&t=${timestamp}`);
      const data = await response.json();
      console.log('📡 Poll result:', data);

      if (data && data.success) {
        console.log('✅ Payment confirmed! Closing modal...');
        // Stop polling
        if (paymentPollingRef.current) {
          clearInterval(paymentPollingRef.current);
          paymentPollingRef.current = null;
        }
        // Close modal
        setShowCheckoutModal(false);
        setShowSubscriptions(false);
        // Refresh user data
        await refreshUserData();

        // Small delay before alert to ensure modal is closed
        setTimeout(() => {
          Alert.alert('Payment Successful!', 'Your subscription has been activated.');
        }, 500);
      }
    } catch (error) {
      console.error('❌ Poll error:', error);
    }
  }, [checkoutTxRef, refreshUserData]);
  const params = useLocalSearchParams<{ tab?: string; sessionId?: string }>();
  const insets = useSafeAreaInsets();

  // Create theme-aware styles
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<string>('home');

  // Dummy implementations for missing functions
  // Dummy implementations for missing functions

  const checkApiHealth = useCallback(async () => {
    try {
      await apiService.get('/health');
    } catch (error) {
      // console.error('API Health check failed:', error);
    }
  }, []);
  const [showConfirm, setShowConfirm] = useState(false);





  const bottomNavAnim = useRef(new Animated.Value(0)).current;
  const [pressedPill, setPressedPill] = useState<string | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // App Tour state
  const [showAppTour, setShowAppTour] = useState(false);
  const [hasCheckedTour, setHasCheckedTour] = useState(false);
  const tourTabRefs = useRef<Record<string, React.RefObject<View>>>({});
  const discoverScrollViewRef = useRef<ScrollView>(null);

  // Initialize refs for tour elements
  useEffect(() => {
    // Initialize tab refs
    const tabKeys = ['home-tab', 'discover-tab', 'messages-tab', 'blogs-tab', 'docbot-tab'];
    tabKeys.forEach(key => {
      if (!tourTabRefs.current[key]) {
        tourTabRefs.current[key] = React.createRef<View>();
      }
    });

    // Initialize discover page refs
    const discoverKeys = ['discover-bookmark-btn', 'discover-search-bar', 'discover-doctors-list'];
    discoverKeys.forEach(key => {
      if (!tourTabRefs.current[key]) {
        tourTabRefs.current[key] = React.createRef<View>();
      }
    });
  }, []);

  // Check if app tour should be shown
  useEffect(() => {
    const checkTourStatus = async () => {
      if (!userData || userData.user_type !== 'patient' || hasCheckedTour) return;

      // Don't show tour if onboarding overlay is showing
      if (showOnboarding) return;

      // Check if tour has been completed
      setHasCheckedTour(true);
      const hasCompleted = await appTourService.hasCompletedTour('patient');
      if (!hasCompleted && !showAppTour) {
        // Ensure we're on home tab for tour
        setActiveTab('home');
        // Small delay to ensure UI is ready
        setTimeout(() => {
          setShowAppTour(true);
        }, 1000);
      }
    };

    checkTourStatus();
  }, [userData, showOnboarding, hasCheckedTour]);

  // Animate bottom nav
  const animateBottomNav = (hide: boolean) => {
    Animated.timing(bottomNavAnim, {
      toValue: hide ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  // Handle DocBot bottom hidden state change
  const handleDocBotBottomHiddenChange = (hidden: boolean) => {
    setIsDocBotBottomHidden(hidden);
    animateBottomNav(hidden);
  };


  // Load unread notification count from service
  const loadUnreadCount = async () => {
    try {
      // Only get real notifications from the service (no fake activities)
      const allNotifications = await NotificationService.getNotificationsForUser('patient', userData?.id?.toString());

      const unreadCount = allNotifications.filter(n => !n.isRead).length;
      setUnreadNotificationCount(unreadCount);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  // Update unread count when activities change
  useEffect(() => {
    loadUnreadCount();
  }, [activities]);

  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [planToPurchase, setPlanToPurchase] = useState<SubscriptionPlan | null>(null);
  const [showBookAppointmentConfirm, setShowBookAppointmentConfirm] = useState(false);
  const [doctorToBook, setDoctorToBook] = useState<any>(null);
  const [chatbotPulse] = useState(new Animated.Value(1));
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('');
  const [availableSpecializations, setAvailableSpecializations] = useState<string[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [loadingSpecializations, setLoadingSpecializations] = useState(false);
  const [showSpecializationModal, setShowSpecializationModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [visibleDoctorCards, setVisibleDoctorCards] = useState<number>(0);
  const doctorCardAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;
  const hasAnimatedDoctors = useRef(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteDoctors, setFavoriteDoctors] = useState<any[]>([]);
  const [favoritesRefreshTrigger, setFavoritesRefreshTrigger] = useState(0);

  // Function to refresh subscription data
  const refreshSubscriptionData = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('PatientDashboard: Refreshing subscription data...');
      const response = await apiService.get('/subscription');

      if (response.success && response.data) {
        console.log('PatientDashboard: Subscription data refreshed:', response.data);
        setCurrentSubscription(response.data);
      } else {
        console.log('PatientDashboard: No subscription data found');
        setCurrentSubscription(null);
      }
    } catch (error) {
      console.error('PatientDashboard: Error refreshing subscription:', error);
    }
  }, [user?.id]);

  // Function to load favorite doctors
  const loadFavoriteDoctors = useCallback(async () => {
    try {
      const favorites = await favoriteDoctorsService.getFavorites();
      // Map favorite doctor IDs to full doctor objects from the doctors list
      const favoriteDoctorObjects = doctors.filter(doc =>
        favorites.some(fav => fav.id === doc.id)
      );
      setFavoriteDoctors(favoriteDoctorObjects);
    } catch (error) {
      console.error('Error loading favorite doctors:', error);
    }
  }, [doctors]);

  // Load favorites when doctors list changes
  useEffect(() => {
    if (doctors.length > 0) {
      loadFavoriteDoctors();
    }
  }, [doctors, favoritesRefreshTrigger, loadFavoriteDoctors]);

  const loadActivities = async () => {
    try {
      // Generate activities from real user data
      const userActivities = generateUserActivities(
        'patient',
        userData,
        appointments,
        [], // messages - can be added later
        currentSubscription
      );

      // Get notifications and convert them to activities
      const notifications = await NotificationService.getNotificationsForUser('patient', userData?.id?.toString());
      const notificationActivities: Activity[] = notifications.map(notification => ({
        id: `notif_${notification.id}`,
        type: notification.type,
        title: notification.title,
        description: notification.message,
        timestamp: notification.timestamp,
        icon: getIconForNotificationType(notification.type),
        color: getColorForNotificationType(notification.type)
      }));

      // Merge user activities with notification activities
      setActivities(prevActivities => {
        // Keep real-time activities (those added via addRealtimeActivity)
        const realtimeActivities = prevActivities.filter(activity =>
          activity.id.startsWith('realtime_')
        );

        // Combine all activities
        const allActivities = [...realtimeActivities, ...userActivities, ...notificationActivities];

        // Remove duplicates based on ID
        const uniqueActivities = allActivities.filter((activity, index, self) =>
          index === self.findIndex(a => a.id === activity.id)
        );

        // Sort by timestamp (newest first)
        const sortedActivities = uniqueActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        console.log('📱 Activities loaded:', sortedActivities.length, 'items');
        console.log('📱 Activity breakdown:', {
          realtime: realtimeActivities.length,
          appointments: userActivities.filter(a => a.type === 'appointment').length,
          notifications: notificationActivities.length,
          total: sortedActivities.length
        });

        return sortedActivities;
      });
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  // Helper function to get icon for notification type
  const getIconForNotificationType = (type: string): string => {
    switch (type) {
      case 'appointment': return 'calendar';
      case 'message': return 'message';
      case 'payment': return 'dollar';
      case 'wallet': return 'dollar';
      case 'system': return 'infoCircle';
      case 'reminder': return 'clock';
      default: return 'bell';
    }
  };

  // Helper function to get color for notification type
  const getColorForNotificationType = (type: string): string => {
    switch (type) {
      case 'appointment': return '#4CAF50';
      case 'message': return '#2196F3';
      case 'payment': return '#FF9800';
      case 'wallet': return '#FF9800';
      case 'system': return '#607D8B';
      case 'reminder': return '#9C27B0';
      default: return '#666';
    }
  };

  // Subscribe to real-time events
  useEffect(() => {
    const unsubscribe = RealTimeEventService.subscribe((event) => {
      console.log('📡 [PatientDashboard] Received real-time event:', event);

      // Add real-time activity
      const newActivity: Activity = {
        id: event.id,
        type: event.type,
        title: event.title,
        description: event.description,
        timestamp: event.timestamp,
        icon: getIconForEventType(event.type, event.action),
        color: getColorForEventType(event.type, event.action)
      };

      setActivities(prevActivities =>
        addRealtimeActivity(prevActivities, event.type, event.title, event.description, newActivity.icon, newActivity.color)
      );
    });

    return unsubscribe;
  }, []);

  // Helper functions for event icons and colors
  const getIconForEventType = (type: string, action: string): string => {
    switch (type) {
      case 'appointment':
        return action === 'created' ? 'calendarPlus' :
          action === 'confirmed' ? 'calendarCheck' :
            action === 'cancelled' ? 'calendarTimes' : 'calendar';
      case 'session':
        return action === 'started' ? 'play' :
          action === 'ended' ? 'stop' : 'clock';
      case 'payment':
        return 'dollar';
      case 'message':
        return 'message';
      default:
        return 'infoCircle';
    }
  };

  const getColorForEventType = (type: string, action: string): string => {
    switch (type) {
      case 'appointment':
        return action === 'created' ? '#2196F3' :
          action === 'confirmed' ? '#4CAF50' :
            action === 'cancelled' ? '#F44336' : '#FF9800';
      case 'session':
        return action === 'started' ? '#4CAF50' :
          action === 'ended' ? '#F44336' : '#FF9800';
      case 'payment':
        return '#FF9800';
      case 'message':
        return '#2196F3';
      default:
        return '#607D8B';
    }
  };

  const [endedSessions, setEndedSessions] = useState<EndedSessionMetadata[]>([]);
  const [loadingEndedSessions, setLoadingEndedSessions] = useState(false);
  const [showEndedSessionMenu, setShowEndedSessionMenu] = useState<string | null>(null);
  const [selectedPatientAppointment, setSelectedPatientAppointment] = useState<any | null>(null);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [refreshingMessages, setRefreshingMessages] = useState(false);
  const [refreshingHome, setRefreshingHome] = useState(false);
  const [refreshingDoctors, setRefreshingDoctors] = useState(false);
  const [refreshingAppointments, setRefreshingAppointments] = useState(false);
  const [refreshingSubscriptions, setRefreshingSubscriptions] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [userCountry, setUserCountry] = useState<string>('Malawi');
  const [currentLocationInfo, setCurrentLocationInfo] = useState<LocationInfo | null>(null);
  const [activeTextSessions, setActiveTextSessions] = useState<any[]>([]);
  const [loadingTextSessions, setLoadingTextSessions] = useState(false);
  const [sessionElapsedTime, setSessionElapsedTime] = useState<number>(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isDiscoverBannerLoading, setIsDiscoverBannerLoading] = useState(true);
  const [showDiscoverBannerLoader, setShowDiscoverBannerLoader] = useState(false);
  const discoverBannerLoaderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discoverBanners = [
    discoverBanner1,
    discoverBanner2,
    discoverBanner3,
    discoverBanner5,
    discoverBanner6,
  ];

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hours = Math.floor(mins / 60);

    if (hours > 0) {
      const remainingMins = mins % 60;
      return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sidebarAnim = useRef(new Animated.Value(0)).current;
  const [webSidebarTransform, setWebSidebarTransform] = useState(-300);

  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

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
        // console.log('PatientDashboard: Refreshing user data...');
        await refreshUserData();
      } catch (error) {
        console.error('PatientDashboard: Error refreshing user data:', error);
      }
    };

    refreshData();
  }, []);

  // Log when user data changes
  useEffect(() => {
    if (userData) {
      // // console.log('PatientDashboard: User data updated:', {
      //   profile_picture_url: userData.profile_picture_url,
      //   profile_picture: userData.profile_picture
      // });
    }
  }, [userData]);

  // Auto-refresh timer for appointments - updates every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh appointments to get updated remaining time
      if (user) {
        appointmentService.getAppointments()
          .then((appointmentsData) => {
            setAppointments(appointmentsData);
          })
          .catch(error => {
            console.error('Auto-refresh: Error fetching appointments:', error);
          });
      }
    }, 60000); // Update every 60 seconds (1 minute)

    return () => clearInterval(interval);
  }, [user]);

  // Session Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeTextSessions.length > 0) {
      // Calculate initial elapsed time based on start time if available
      const session = activeTextSessions[0];
      if (session.started_at) {
        const startTime = new Date(session.started_at).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - startTime) / 1000);
        setSessionElapsedTime(elapsed > 0 ? elapsed : 0);
      }

      interval = setInterval(() => {
        setSessionElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setSessionElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTextSessions]);

  // Auto-switch discover banners every 12 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % discoverBanners.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [discoverBanners.length]);

  // Helper function to ensure appointments is always an array
  const getSafeAppointments = () => {
    return appointments || [];
  };

  // Check if appointment is ready for session
  const isAppointmentReadyForSession = (appointment: any) => {
    // If appointment is already in progress, it's definitely ready
    if (appointment.status === 'in_progress' || appointment.status === 7) return true;

    if (!appointment.date || !appointment.time) return false;

    const now = new Date();
    const [month, day, year] = (appointment.date || '').split('/').map(Number);
    const [hour, minute] = (appointment.time || '00:00').split(':').map(Number);
    const appointmentDate = new Date(year, month - 1, day, hour, minute);

    // Session is ready if appointment time has passed and status is confirmed
    // Handle both string 'confirmed' and numeric 1
    const isConfirmed = appointment.status === 'confirmed' || appointment.status === 1;
    return isConfirmed && now >= appointmentDate;
  };

  // Get appointment session status
  const getAppointmentSessionStatus = (appointment: any) => {
    // Handle in_progress status explicitly
    if (appointment.status === 'in_progress' || appointment.status === 7) return 'active';

    // Handle both string 'confirmed' and numeric 1
    const isConfirmed = appointment.status === 'confirmed' || appointment.status === 1;

    if (!isConfirmed) return 'pending';
    if (isAppointmentReadyForSession(appointment)) return 'ready';
    return 'scheduled';
  };

  // Helper function to check if appointment is upcoming
  const isAppointmentUpcoming = (appointment: any) => {
    const dateStr = appointment.appointment_date || appointment.date;
    const timeStr = appointment.appointment_time || appointment.time;

    if (!dateStr || !timeStr) return false;

    try {
      // Handle different date formats
      let appointmentDateTime;
      if (dateStr.includes('/')) {
        // Format: MM/DD/YYYY
        const [month, day, year] = dateStr.split('/').map(Number);
        const [hour, minute] = timeStr.split(':').map(Number);
        appointmentDateTime = new Date(year, month - 1, day, hour, minute);
      } else {
        // Format: YYYY-MM-DD
        appointmentDateTime = new Date(`${dateStr}T${timeStr}`);
      }

      const now = new Date();
      return appointmentDateTime.getTime() > now.getTime();
    } catch (error) {
      return false;
    }
  };

  const Tab: React.FC<TabProps> = ({ icon, label, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.tab, isActive && styles.activeTab]}
      onPress={onPress}
    >
      <Icon
        name={icon}
        size={24}
        color={isActive ? '#4CAF50' : '#666'}
        style={styles.tabIcon}
      />
      <Text style={[
        styles.tabLabel,
        isActive && styles.activeTabLabel
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      appointmentService.getAppointments()
        .then((appointmentsData) => {
          setAppointments(appointmentsData);
          // Trigger conversion check after appointments are loaded
          setTimeout(() => triggerConversionCheck(), 1000);
        })
        .catch(error => {
          console.error('❌ [PatientDashboard] Error fetching appointments:', error);
          setAppointments([]);
        });
    }
  }, [user, triggerConversionCheck]);

  useEffect(() => {
    if (user && user.id) { // Add user.id check to ensure user is fully loaded
      console.log('PatientDashboard: Loading subscription for user:', user.id);

      // Load user's current subscription from Laravel API
      apiService.get('/subscription')
        .then((response: any) => {
          console.log('PatientDashboard: Subscription API response:', response);

          if (response.success && response.data) {
            console.log('PatientDashboard: Setting subscription data:', response.data);
            setCurrentSubscription(response.data as UserSubscription);
          } else {
            console.log('PatientDashboard: No subscription data in response, setting to null');
            setCurrentSubscription(null);
          }
        })
        .catch(error => {
          console.error('PatientDashboard: Error loading subscription:', error);
          console.error('PatientDashboard: Error response:', error.response?.data);
          console.error('PatientDashboard: Error status:', error.response?.status);

          // Don't show error to user for subscription, just set null
          setCurrentSubscription(null);

          // If it's an authentication error, don't retry
          if (error.response?.status === 401) {
            console.log('PatientDashboard: Authentication error loading subscription, not retrying');
          }
        });
    } else {
      console.log('PatientDashboard: No user or user.id, skipping subscription load');
    }
  }, [user]);

  // Poll for subscription updates after payment (in case user doesn't get redirected properly)
  useEffect(() => {
    if (!user?.id) return;

    const pollForSubscriptionUpdates = () => {
      console.log('PatientDashboard: Polling for subscription updates...');

      apiService.get('/subscription')
        .then((response: any) => {
          if (response.success && response.data) {
            console.log('PatientDashboard: Polling found subscription update:', response.data);
            setCurrentSubscription(response.data);
          }
        })
        .catch(error => {
          console.log('PatientDashboard: Polling subscription check failed:', error.message);
        });
    };

    // Poll every 10 seconds for the first 2 minutes after component mount
    // This helps catch subscription updates if the payment redirect didn't work properly
    const pollInterval = setInterval(pollForSubscriptionUpdates, 10000);

    // Stop polling after 2 minutes
    const stopPollingTimeout = setTimeout(() => {
      clearInterval(pollInterval);
      console.log('PatientDashboard: Stopped polling for subscription updates');
    }, 120000); // 2 minutes

    return () => {
      clearInterval(pollInterval);
      clearTimeout(stopPollingTimeout);
    };
  }, [user?.id]);

  // Refresh subscription data when user returns to dashboard (e.g., after payment)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        console.log('PatientDashboard: Screen focused, refreshing subscription data...');
        refreshSubscriptionData();
      }
    }, [user?.id, refreshSubscriptionData])
  );

  // Refresh activities when user logs in or when data changes
  useEffect(() => {
    if (user?.id) {
      loadActivities();
    }
  }, [user, appointments, currentSubscription]);

  // Handle new appointment from navigation params
  const { newAppointment, sessionStarted } = useLocalSearchParams();
  useEffect(() => {
    if (newAppointment === 'true' && user?.id) {
      // Add real-time activity for appointment offer sent
      setActivities(prevActivities =>
        addRealtimeActivity(
          prevActivities,
          'appointment_offer_sent',
          'Appointment Offer Sent',
          'Your appointment request has been sent to the doctor. You\'ll receive a notification when they respond.',
          {
            doctorName: 'Selected Doctor',
            patientName: userData?.display_name || `${userData?.first_name} ${userData?.last_name}`,
            appointmentType: 'Consultation'
          }
        )
      );

      // Clear the parameter to prevent re-triggering
      router.replace({ pathname: '/patient-dashboard', params: { tab: 'discover' } });
    }

    if (sessionStarted === 'true' && user?.id) {
      // Add real-time activity for session started
      setActivities(prevActivities =>
        addRealtimeActivity(
          prevActivities,
          'text_session_started', // Default to text, could be enhanced to detect session type
          'Session Started',
          'You started a consultation session with a doctor.',
          {
            doctorName: 'Selected Doctor',
            patientName: userData?.display_name || `${userData?.first_name} ${userData?.last_name}`,
            sessionType: 'Consultation'
          }
        )
      );

      // Clear the parameter to prevent re-triggering
      router.replace({ pathname: '/patient-dashboard', params: { tab: 'discover' } });
    }
  }, [newAppointment, sessionStarted, user?.id, userData]);
  // Initialize location-based subscription plans
  useEffect(() => {
    const initializeLocationTracking = async () => {
      if (!userData) {
        // Default to Malawi pricing if no user data
        const registrationCountry = 'Malawi';
        const userCurrency = 'MWK';
        setUserCountry(registrationCountry);
        setCurrentLocationInfo({ country: registrationCountry, currency: userCurrency });

        // Load plans from Laravel API, filtered by currency
        try {
          const response = await apiService.get('/plans');
          if (response.success && (response as any).plans) {
            const filtered = (response as any).plans.filter((plan: any) => plan.currency === userCurrency);
            const transformedPlans = filtered.map((plan: any) => ({
              id: plan.id.toString(),
              name: plan.name,
              price: plan.price,
              currency: plan.currency,
              textSessions: plan.text_sessions || 0,
              voiceCalls: plan.voice_calls || 0,
              videoCalls: plan.video_calls || 0,
              features: Array.isArray(plan.features) ? plan.features : [],
              popular: plan.name.toLowerCase().includes('executive')
            }));
            setSubscriptionPlans(transformedPlans);
          } else {
            setPlansError('Unable to load subscription plans. Please try again later.');
            setSubscriptionPlans([]);
          }
        } catch (error) {
          console.error('Error loading plans from API:', error);
          setPlansError('Failed to load subscription plans. Please check your connection and try again.');
          setSubscriptionPlans([]);
        }
        return;
      }

      const registrationCountry = userData.country || 'Malawi';
      setUserCountry(registrationCountry);

      // Pricing rule: Malawi -> MWK, everyone else -> USD
      const userCurrency = (registrationCountry || '').toLowerCase() === 'malawi' ? 'MWK' : 'USD';
      setCurrentLocationInfo({ country: registrationCountry, currency: userCurrency });

      // Load plans from Laravel API, filtered by currency
      try {
        const response = await apiService.get('/plans');
        if (response.success && (response as any).plans) {
          const filtered = (response as any).plans.filter((plan: any) => plan.currency === userCurrency);
          const transformedPlans = filtered.map((plan: any) => ({
            id: plan.id.toString(),
            name: plan.name,
            price: plan.price,
            currency: plan.currency,
            textSessions: plan.text_sessions || 0,
            voiceCalls: plan.voice_calls || 0,
            videoCalls: plan.video_calls || 0,
            features: Array.isArray(plan.features) ? plan.features : [],
            popular: plan.name.toLowerCase().includes('executive')
          }));
          setSubscriptionPlans(transformedPlans);
        } else {
          setPlansError('Unable to load subscription plans. Please try again later.');
          setSubscriptionPlans([]);
        }
      } catch (error) {
        console.error('Error loading plans from API:', error);
        setPlansError('Failed to load subscription plans. Please check your connection and try again.');
        setSubscriptionPlans([]);
      }
    };

    if (user && user.id) { // Add user.id check
      initializeLocationTracking();
    }
  }, [userData, user]);

  // Check profile completion for onboarding
  useEffect(() => {
    const checkProfileCompletion = () => {
      console.log('🔍 [PatientDashboard] Checking profile completion:', {
        userData: userData,
        hasUserData: !!userData,
        userType: userData?.user_type
      });

      if (userData) {
        const missing = getMissingFields(userData);
        console.log('🔍 [PatientDashboard] Missing fields result:', missing);

        if (missing.length > 0) {
          setMissingFields(missing);
          // Show onboarding overlay only if not dismissed in this session
          if (!showOnboarding && !onboardingDismissed) {
            console.log('🔍 [PatientDashboard] Showing onboarding overlay');
            setShowOnboarding(true);
          }
        } else {
          console.log('🔍 [PatientDashboard] Profile is complete, hiding overlay');
          setShowOnboarding(false);
        }
      }
    };

    checkProfileCompletion();
  }, [userData, showOnboarding, onboardingDismissed]);

  // Request location permissions if not granted
  const requestLocationPermission = async () => {
    // GPS functionality removed - using registration location only
    showSuccess('Location Info', 'Pricing is based on your registered location.');
  };

  // Normalize backend image URI to a full URL for caching
  const getImageUrlForCache = (uri?: string | null): string | null => {
    if (!uri || typeof uri !== 'string') return null;
    if (uri.startsWith('http')) return uri;
    let clean = uri.trim();
    if (clean.startsWith('/storage/')) clean = clean.substring('/storage/'.length);
    if (clean.startsWith('storage/')) clean = clean.substring('storage/'.length);
    clean = clean.replace(/^\/+/, '');
    return `https://docavailable-3vbdv.ondigitalocean.app/api/images/${clean}`;
  };

  useEffect(() => {
    if (activeTab === 'discover') {
      // Only show loading spinner if we don't have any doctors yet
      if (doctors.length === 0) {
        setLoadingDoctors(true);
      }
      // Only reset animation if this is the first load
      if (!hasAnimatedDoctors.current) {
        setVisibleDoctorCards(0);
      }
      // Fetch real doctors from Laravel API
      apiService.get('/doctors/active')
        .then((response: any) => {
          // console.log('PatientDashboard: Raw doctors API response:', response);
          if (response.success && response.data) {
            // Handle paginated response from Laravel
            const doctorsData = response.data.data || response.data;
            // console.log('PatientDashboard: Fetched doctors:', doctorsData);

            if (Array.isArray(doctorsData)) {
              // Filter for approved doctors and add default values for missing fields
              const approvedDoctors = doctorsData
                .filter((doctor: any) => doctor.status === 'approved')
                .map((doctor: any) => {
                  const mappedDoctor = {
                    id: doctor.id,
                    first_name: doctor.first_name,
                    last_name: doctor.last_name,
                    name: doctor.display_name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Dr. Unknown',
                    specialization: doctor.specialization || doctor.occupation || 'General Medicine',
                    rating: doctor.rating || 4.5,
                    years_of_experience: doctor.years_of_experience || 5,
                    experience: doctor.years_of_experience || 5,
                    city: doctor.city,
                    country: doctor.country,
                    location: doctor.city || doctor.country || 'Malawi',
                    email: doctor.email,
                    status: doctor.status,
                    profile_picture: doctor.profile_picture,
                    profile_picture_url: doctor.profile_picture_url,
                    // Add availability data
                    is_online: doctor.is_online_for_instant_sessions || doctor.is_online || false,
                    working_hours: doctor.working_hours,
                    max_patients_per_day: doctor.max_patients_per_day
                  };

                  // Debug logging for doctors with profile pictures (storage issue identified)
                  if (doctor.profile_picture_url) {
                    console.log('PatientDashboard - Doctor with profile picture (storage not accessible):', {
                      name: mappedDoctor.name,
                      profile_picture_url: doctor.profile_picture_url
                    });
                  }

                  return mappedDoctor;
                });
              setDoctors(approvedDoctors);
              // Stop loading immediately when data arrives
              setLoadingDoctors(false);
              // If doctors were already cached (quick load), skip animation
              if (hasAnimatedDoctors.current) {
                setVisibleDoctorCards(approvedDoctors.length);
              } else {
                // Trigger animation start immediately
                setVisibleDoctorCards(0);
              }
              // Preload/cached profile pictures to avoid reloading on other pages
              try {
                const urlsToPreload = approvedDoctors
                  .map((d: any) => getImageUrlForCache(d.profile_picture_url || d.profile_picture))
                  .filter((u: any): u is string => typeof u === 'string' && u.length > 0);
                if (urlsToPreload.length > 0) {
                  imageCacheService.preloadImages(urlsToPreload).catch(() => { });
                }
              } catch { }
            } else {
              setDoctors([]);
              setLoadingDoctors(false);
            }
          } else {
            setDoctors([]);
            setLoadingDoctors(false);
          }
        })
        .catch((error) => {
          console.error('Error fetching doctors:', error);
          setDoctorsError('Failed to load doctors. Please check your connection and try again.');
          setDoctors([]);
          setLoadingDoctors(false);
        });

      // Fetch available specializations
      fetchSpecializations();
    }
  }, [activeTab]);


  // Load ended sessions when messages tab is active
  useEffect(() => {
    if (activeTab === 'messages' && user?.id) {
      loadEndedSessions();
      fetchActiveTextSessions();
    }
  }, [activeTab, user?.id]);

  // Auto-refresh mechanism for messages tab
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout | null = null;

    if (activeTab === 'messages' && user?.id) {
      // Initial load
      loadEndedSessions();
      fetchActiveTextSessions();

      // Set up periodic refresh every 30 seconds when messages tab is active
      refreshInterval = setInterval(() => {
        // console.log('🔄 Auto-refreshing messages tab...');
        loadEndedSessions();
        fetchActiveTextSessions();

        // Also refresh appointments to check for status changes
        if (user) {
          appointmentService.getAppointments()
            .then((appointmentsData) => {
              // console.log('PatientDashboard: Auto-refresh - Fetched appointments:', appointmentsData);
              setAppointments(appointmentsData);
            })
            .catch(error => {
              console.error('PatientDashboard: Auto-refresh - Error fetching appointments:', error);
            });
        }
      }, 30000); // 30 seconds
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [activeTab, user?.id]);

  // App state listener for refreshing when app comes back to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && activeTab === 'messages' && user?.id) {
        // console.log('🔄 App returned to foreground, refreshing messages...');
        loadEndedSessions();
        fetchActiveTextSessions();

        // Also refresh appointments
        if (user) {
          appointmentService.getAppointments()
            .then((appointmentsData) => {
              // console.log('PatientDashboard: App foreground refresh - Fetched appointments:', appointmentsData);
              setAppointments(appointmentsData);
            })
            .catch(error => {
              console.error('PatientDashboard: App foreground refresh - Error fetching appointments:', error);
            });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [activeTab, user?.id]);

  // Manual refresh function for messages tab
  const refreshMessagesTab = async () => {
    if (!user?.id || refreshingMessages) return;

    setRefreshingMessages(true);
    try {
      // console.log('🔄 Manual refresh of messages tab...');
      await Promise.all([
        loadEndedSessions().catch(err => console.error('Error refreshing ended sessions:', err)),
        fetchActiveTextSessions().catch(err => console.error('Error refreshing text sessions:', err))
      ]);

      // Also refresh appointments
      const appointmentsData = await appointmentService.getAppointments().catch(err => {
        console.error('Error refreshing appointments:', err);
        return [];
      });
      // console.log('PatientDashboard: Manual refresh - Fetched appointments:', appointmentsData);
      setAppointments(appointmentsData);

      // Trigger conversion check for text appointments
      triggerConversionCheck();
    } catch (error) {
      console.error('PatientDashboard: Manual refresh - Error:', error);
    } finally {
      setRefreshingMessages(false);
    }
  };




  // Manual refresh function for home tab
  const refreshHomeTab = async () => {
    if (!user?.id || refreshingHome) return;

    setRefreshingHome(true);
    try {
      // console.log('🔄 Manual refresh of home tab...');

      // Refresh appointments
      const appointmentsData = await appointmentService.getAppointments().catch(err => {
        console.error('Error refreshing appointments:', err);
        return [];
      });
      setAppointments(appointmentsData);

      // Refresh subscription
      await refreshSubscription().catch(err => console.error('Error refreshing subscription:', err));

      // Refresh API health
      await checkApiHealth().catch(err => console.error('Error checking API health:', err));
    } catch (error) {
      console.error('PatientDashboard: Home refresh - Error:', error);
    } finally {
      setRefreshingHome(false);
    }
  };

  // Manual refresh function for doctors tab
  const refreshDoctorsTab = async () => {
    if (!user?.id || refreshingDoctors) return;

    setRefreshingDoctors(true);
    try {
      // console.log('🔄 Manual refresh of doctors tab...');

      // Use the same endpoint as the original loading logic
      const response = await apiService.get('/doctors/active');
      // console.log('PatientDashboard: Doctors API response:', response);

      if (response && response.success && response.data) {
        // Handle paginated response from Laravel (same as original logic)
        const doctorsData = response.data.data || response.data;
        // console.log('PatientDashboard: Fetched doctors:', doctorsData);

        if (Array.isArray(doctorsData)) {
          // Filter for approved doctors and add default values for missing fields (same as original logic)
          const approvedDoctors = doctorsData
            .filter((doctor: any) => doctor && doctor.status === 'approved')
            .map((doctor: any) => ({
              id: doctor.id,
              first_name: doctor.first_name,
              last_name: doctor.last_name,
              name: doctor.display_name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Dr. Unknown',
              specialization: doctor.specialization || doctor.occupation || 'General Medicine',
              rating: doctor.rating || 4.5,
              years_of_experience: doctor.years_of_experience || 5,
              experience: doctor.years_of_experience || 5,
              city: doctor.city,
              country: doctor.country,
              location: doctor.city || doctor.country || 'Malawi',
              email: doctor.email,
              status: doctor.status,
              profile_picture: doctor.profile_picture,
              profile_picture_url: doctor.profile_picture_url,
              // Add availability data
              is_online: doctor.is_online_for_instant_sessions || doctor.is_online || false,
              working_hours: doctor.working_hours,
              max_patients_per_day: doctor.max_patients_per_day
            }));
          setDoctors(approvedDoctors);
          setDoctorsError(null);
          // console.log('PatientDashboard: Successfully refreshed doctors:', approvedDoctors.length);
        } else {
          // console.log('PatientDashboard: Invalid doctors data structure:', response.data);
          setDoctors([]);
          setDoctorsError('Invalid data format received from server');
        }
      } else {
        // console.log('PatientDashboard: Invalid API response:', response);
        setDoctors([]);
        setDoctorsError('Failed to load doctors data');
      }
    } catch (error) {
      console.error('PatientDashboard: Doctors refresh - Error:', error);
      setDoctorsError('Failed to refresh doctors. Please try again.');
      setDoctors([]);
    } finally {
      setRefreshingDoctors(false);
    }
  };

  // Function to fetch available specializations
  const fetchSpecializations = async () => {
    if (loadingSpecializations) return;

    setLoadingSpecializations(true);
    try {
      const response = await apiService.get('/doctors/specializations');
      if (response.success && response.data) {
        // Extract only main specializations (not sub-specializations)
        const mainSpecializations: string[] = [];
        Object.keys(response.data).forEach(mainSpecialization => {
          mainSpecializations.push(mainSpecialization);
        });
        setAvailableSpecializations(mainSpecializations);
      }
    } catch (error: any) {
      console.error('PatientDashboard: Error fetching specializations:', error);
    } finally {
      setLoadingSpecializations(false);
    }
  };

  // Manual refresh function for appointments tab
  const refreshAppointmentsTab = async () => {
    if (!user?.id || refreshingAppointments) return;

    setRefreshingAppointments(true);
    try {
      // console.log('🔄 Manual refresh of appointments tab...');

      // Refresh appointments
      const appointmentsData = await appointmentService.getAppointments().catch(err => {
        console.error('Error refreshing appointments:', err);
        return [];
      });
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('PatientDashboard: Appointments refresh - Error:', error);
    } finally {
      setRefreshingAppointments(false);
    }
  };

  // Manual refresh function for subscriptions tab
  const refreshSubscriptionsTab = async () => {
    if (!user?.id || refreshingSubscriptions) return;

    setRefreshingSubscriptions(true);
    try {
      // console.log('🔄 Manual refresh of subscriptions tab...');

      // Refresh subscription
      await refreshSubscription().catch(err => console.error('Error refreshing subscription:', err));
    } catch (error) {
      console.error('PatientDashboard: Subscriptions refresh - Error:', error);
    } finally {
      setRefreshingSubscriptions(false);
    }
  };

  // Manual refresh function for profile tab
  const refreshProfileTab = async () => {
    if (!user?.id || refreshingProfile) return;

    setRefreshingProfile(true);
    try {
      // console.log('🔄 Manual refresh of profile tab...');

      // Refresh user data
      await refreshUserData().catch(err => console.error('Error refreshing user data:', err));
    } catch (error) {
      console.error('PatientDashboard: Profile refresh - Error:', error);
    } finally {
      setRefreshingProfile(false);
    }
  };

  // Check for active text sessions when component mounts
  useEffect(() => {
    if (user?.id) {
      fetchActiveTextSessions();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!appointments || appointments.length === 0) return;
    const now = new Date();
    appointments.forEach(appt => {
      if ((appt.status === 'pending' || appt.reschedulePending) && appt.date && appt.time) {
        // Parse date and time
        const [m1, d1, y1] = (appt.date || '').split('/');
        let year = y1, month = m1, day = d1;
        if (Number(y1) < 1000) { year = d1; month = m1; day = y1; }
        const [hour, minute] = (appt.time || '00:00').split(':');
        const apptDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
        if (apptDate < now) {
          // Expire the offer via Laravel API
          apiService.patch(`/appointments/${appt.id}`, { status: 'expired', reschedule_pending: false });
        }
      }
    });
  }, [appointments]);

  // Pulse animation every 10 seconds
  useEffect(() => {
    let isMounted = true;
    const pulse = () => {
      if (!isMounted) return;
      Animated.sequence([
        Animated.timing(chatbotPulse, { toValue: 1.12, duration: 350, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(chatbotPulse, { toValue: 1, duration: 350, useNativeDriver: true, easing: Easing.in(Easing.ease) })
      ]).start(() => {
        setTimeout(pulse, 10000);
      });
    };
    pulse();
    return () => { isMounted = false; };
  }, []);

  // Handle URL parameters for tab switching and session navigation
  useEffect(() => {
    if (params.tab) {
      setActiveTab(params.tab);
    }

    // If sessionId is provided, navigate to the chat after a short delay
    if (params.sessionId) {
      // Navigate to chat using appointment ID
      router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: params.sessionId } });
    }
  }, [params]);

  // Health check for API connectivity
  useEffect(() => {
    const checkApiHealth = async () => {
      setApiStatus('checking');
      try {
        const isConnected = await apiService.checkConnectivity();
        setApiStatus(isConnected ? 'connected' : 'disconnected');
        if (isConnected) {
          // console.log('PatientDashboard: API connectivity check successful');
          // Reset circuit breaker on successful connectivity
          apiService.resetCircuitBreaker();
        } else {
          console.warn('PatientDashboard: API connectivity check failed - backend may be unavailable');
        }
      } catch (error) {
        setApiStatus('disconnected');
        console.warn('PatientDashboard: API health check failed - backend may be unavailable');
      }
    };

    if (user) {
      checkApiHealth();

      // Set up periodic health checks every 30 seconds
      const healthCheckInterval = setInterval(checkApiHealth, 30000);

      return () => clearInterval(healthCheckInterval);
    }
  }, [user]);

  // Add polling for real-time status updates
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (user && activeTab === 'appointments') {
      // Poll for updates every 30 seconds
      interval = setInterval(async () => {
        try {
          const response = await apiService.get('/appointments');
          if (response.success && response.data) {
            const appointmentsData = (response.data as any).data || response.data;
            setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
          }
        } catch (error) {
          console.error('Error polling for appointment updates:', error);
        }
      }, 30000); // 30 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [user, activeTab]);

  const handleLogout = async () => {
    setShowConfirm(true);
  };

  const confirmLogout = async () => {
    setShowConfirm(false);
    try {
      console.log('Starting logout process...');
      await authService.signOut();
      console.log('Logout successful, navigating to home...');
      router.replace('/');
    } catch (error) {
      console.error('Logout error in confirmLogout:', error);
      // Even if logout fails, still navigate away since local cleanup should have happened
      showError('Notice', 'Logged out successfully');
      router.replace('/');
    }
  };

  const handlePurchaseSubscription = async (plan: SubscriptionPlan) => {
    try {
      setIsPurchasing(true);
      setSelectedPlanId(plan.id);
      console.log('Initiating payment for plan:', plan);
      // Initiate hosted checkout via backend
      const res = await paymentsService.initiatePlanPurchase(parseInt(plan.id));
      console.log('Payment API response:', res);
      if (res?.success && res.data?.checkout_url) {
        console.log('✅ Got checkout URL, opening modal...');
        setCheckoutUrl(res.data.checkout_url);
        setCheckoutTxRef(res.data.reference || '');
        setShowCheckoutModal(true);
        setIsPurchasing(false);
        return;
      }
      console.log('Payment failed - no checkout URL in response');
      showError('Payment Error', 'Failed to start payment. Please try again.');
    } catch (e: any) {
      console.error('Purchase initiate error:', e);
      showError('Payment Error', 'Could not start payment. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };



  // Polling logic
  useEffect(() => {
    if (!showCheckoutModal || !checkoutTxRef) return;

    console.log('🔄 Starting payment polling for tx_ref:', checkoutTxRef);

    // Initial check after 5 seconds
    const initialTimeout = setTimeout(pollPaymentStatus, 5000);

    // Then poll every 3 seconds
    paymentPollingRef.current = setInterval(pollPaymentStatus, 3000);

    return () => {
      clearTimeout(initialTimeout);
      if (paymentPollingRef.current) {
        clearInterval(paymentPollingRef.current);
        paymentPollingRef.current = null;
      }
    };
  }, [showCheckoutModal, checkoutTxRef, pollPaymentStatus]);

  const handlePaymentSuccess = async (transactionId?: string) => {
    // Deprecated: real activation now happens via PayChangu callback/webhook
    // Keep as no-op to avoid accidental simulated activations
    return;
  };

  const cancelPurchase = () => {
    setShowPurchaseConfirm(false);
    setPlanToPurchase(null);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return LocationService.formatCurrency(amount, currency);
  };

  // Memoize filtered and sorted doctors to prevent unnecessary recalculations
  const filteredAndSortedDoctors = useMemo(() => {
    let filteredDoctors = showFavoritesOnly ? favoriteDoctors : doctors;

    // Filter by online status if toggle is enabled
    if (showOnlyOnline) {
      filteredDoctors = filteredDoctors.filter(doctor => doctor.is_online);
    }

    // Filter by specialization if selected
    if (selectedSpecialization) {
      filteredDoctors = filteredDoctors.filter(doctor => {
        // Check both old single specialization and new multiple specializations
        const hasSpecialization =
          doctor.specialization === selectedSpecialization ||
          (doctor.specializations && Array.isArray(doctor.specializations) &&
            doctor.specializations.includes(selectedSpecialization));
        return hasSpecialization;
      });
    }

    // Filter by search query (name, specialization, or location)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredDoctors = filteredDoctors.filter(doctor => {
        const name = `${doctor.first_name || ''} ${doctor.last_name || ''}`.toLowerCase();
        const specialization = (doctor.specialization || '').toLowerCase();
        const specializations = Array.isArray(doctor.specializations)
          ? doctor.specializations.join(' ').toLowerCase()
          : '';
        const location = (doctor.city || doctor.country || '').toLowerCase();

        return name.includes(query) ||
          specialization.includes(query) ||
          specializations.includes(query) ||
          location.includes(query);
      });
    }

    // Sort doctors
    switch (sortBy) {
      case 'name':
        return filteredDoctors.sort((a, b) =>
          `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(`${b.first_name || ''} ${b.last_name || ''}`)
        );
      case 'rating':
        return filteredDoctors.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'experience':
        return filteredDoctors.sort((a, b) => (b.years_of_experience || 0) - (a.years_of_experience || 0));
      case 'specialization':
        return filteredDoctors.sort((a, b) => {
          const aSpec = Array.isArray(a.specializations) && a.specializations.length > 0
            ? a.specializations.join(', ')
            : (a.specialization || '');
          const bSpec = Array.isArray(b.specializations) && b.specializations.length > 0
            ? b.specializations.join(', ')
            : (b.specialization || '');
          return aSpec.localeCompare(bSpec);
        });
      case 'location':
        return filteredDoctors.sort((a, b) => (a.city || a.country || '').localeCompare(b.city || b.country || ''));
      default:
        return filteredDoctors;
    }
  }, [doctors, favoriteDoctors, showFavoritesOnly, showOnlyOnline, selectedSpecialization, searchQuery, sortBy]);

  // Reset animation when filters/search/sort changes (only if not already animated)
  useEffect(() => {
    if (!loadingDoctors && !hasAnimatedDoctors.current) {
      setVisibleDoctorCards(0);
    }
  }, [searchQuery, showOnlyOnline, selectedSpecialization, sortBy, showFavoritesOnly]);

  // Staggered animation effect for doctor cards (only on first load)
  // Start immediately when doctors arrive, don't wait for loadingDoctors to be false
  useEffect(() => {
    if (filteredAndSortedDoctors.length > 0 && visibleDoctorCards < filteredAndSortedDoctors.length && !hasAnimatedDoctors.current) {
      const nextIndex = visibleDoctorCards;
      const doctorId = filteredAndSortedDoctors[nextIndex]?.id;

      // For the first card, show immediately with no delay
      const delay = nextIndex === 0 ? 0 : 30;

      const timer = setTimeout(() => {
        if (doctorId) {
          // Initialize animation value if not exists
          if (!doctorCardAnimations[doctorId]) {
            doctorCardAnimations[doctorId] = new Animated.Value(0);
          }

          // Animate the card in
          Animated.timing(doctorCardAnimations[doctorId], {
            toValue: 1,
            duration: 150,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();
        }

        setVisibleDoctorCards(nextIndex + 1);

        // Mark as animated when all cards are shown
        if (nextIndex + 1 >= filteredAndSortedDoctors.length) {
          hasAnimatedDoctors.current = true;
        }
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [visibleDoctorCards, filteredAndSortedDoctors]);

  const getSortOptionLabel = (value: string) => {
    switch (value) {
      case 'name': return 'Name (A-Z)';
      case 'rating': return 'Rating (High to Low)';
      case 'experience': return 'Experience (High to Low)';
      case 'specialization': return 'Specialization (A-Z)';
      case 'location': return 'Location (A-Z)';
      default: return 'Sort by';
    }
  };

  // Memoize event handler to prevent unnecessary re-renders
  const handleViewDoctorDetails = useCallback((doctor: any) => {
    router.push({ pathname: '/(tabs)/doctor-details/[uid]', params: { uid: doctor.id } });
  }, [router]);

  const handleBookAppointment = (doctor: any) => {
    setDoctorToBook(doctor);
    setShowBookAppointmentConfirm(true);
  };

  const confirmBookAppointment = () => {
    if (!doctorToBook) return;

    setShowBookAppointmentConfirm(false);
    setDoctorToBook(null);
  };

  const cancelBookAppointment = () => {
    setShowBookAppointmentConfirm(false);
    setDoctorToBook(null);
  };

  const refreshSubscription = async () => {
    if (!user) {
      console.log('PatientDashboard: No user, skipping subscription refresh');
      return;
    }

    // Check circuit breaker status before making request
    const circuitStatus = apiService.getCircuitBreakerStatus();
    if (circuitStatus.isOpen) {
      console.log('PatientDashboard: Circuit breaker is open, skipping subscription refresh');
      return;
    }

    try {
      console.log('PatientDashboard: Refreshing subscription for user:', user.id);

      // Get subscription from Laravel API instead of Firestore
      const response = await apiService.get('/subscription');
      console.log('PatientDashboard: Refresh subscription response:', response);

      const subscription = response.success ? response.data as UserSubscription : null;
      console.log('PatientDashboard: Setting refreshed subscription:', subscription);
      setCurrentSubscription(subscription);
      console.log('PatientDashboard: Subscription refreshed successfully');
    } catch (error: any) {
      console.error('PatientDashboard: Failed to refresh subscription:', error);
      console.error('PatientDashboard: Refresh error response:', error.response?.data);
      console.error('PatientDashboard: Refresh error status:', error.response?.status);
      // Don't show error to user for background refresh
      // Only show error if it's a user-initiated action
    }
  };

  // Emergency handler - shows custom styled modal
  const handleEmergencyContact = () => {
    setShowEmergencyModal(true);
  };

  // Load ended sessions for the messages tab
  const loadEndedSessions = async () => {
    if (!user?.id) return;

    try {
      setLoadingEndedSessions(true);
      const sessions = await endedSessionStorageService.getEndedSessionsByPatient(user.id);
      // console.log('📱 Loaded ended sessions:', sessions);
      setEndedSessions(sessions || []);
    } catch (error) {
      console.error('Error loading ended sessions:', error);
      setEndedSessions([]);
    } finally {
      setLoadingEndedSessions(false);
    }
  };

  // Fetch active text sessions for the messages tab
  const fetchActiveTextSessions = async () => {
    if (!user?.id) return;

    setLoadingTextSessions(true);
    try {
      // Get active text sessions for this patient
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

  const handleDeleteEndedSession = async (appointmentId: number) => {
    try {
      await endedSessionStorageService.deleteEndedSession(appointmentId);
      setEndedSessions(prev => prev.filter(session => session.appointmentId !== appointmentId));
      setShowEndedSessionMenu(null);
      showSuccess('Session deleted successfully', 'The session has been permanently removed from your history.');
    } catch (error) {
      console.error('Error deleting ended session:', error);
      showError('Failed to delete session', 'Please try again or contact support if the problem persists.');
    }
  };

  const handleExportEndedSession = async (appointmentId: number) => {
    try {
      const exportData = await endedSessionStorageService.exportEndedSession(appointmentId);
      // For now, we'll just show a success message
      // In a real app, you might want to share the data or save it to a file
      // console.log('Export data:', exportData);
      setShowEndedSessionMenu(null);
      showSuccess('Session exported successfully', 'The session data has been exported and saved.');
    } catch (error) {
      console.error('Error exporting ended session:', error);
      showError('Failed to export session', 'Please try again or contact support if the problem persists.');
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const renderHomeContent = () => {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, paddingHorizontal: isWeb ? 40 : 20, paddingTop: 20, backgroundColor: '#F8F9FA' }}
          contentContainerStyle={{ paddingBottom: 100 }}
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
          {/* Active Session Banner */}
          {activeTextSessions.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                const session = activeTextSessions[0];
                const appointmentId = session.appointment_id || `text_session_${session.id}`;
                router.push(`/chat/${appointmentId}`);
              }}
              style={{
                backgroundColor: '#4CAF50',
                paddingVertical: 12,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 12,
                marginBottom: 20,
                shadowColor: '#4CAF50',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12
                }}>
                  <Icon name="comment" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                    Session Active
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
                    {activeTextSessions[0]?.doctor?.display_name || 'Doctor'} • {formatSessionTime(sessionElapsedTime)}
                  </Text>
                </View>
              </View>

              <View style={{
                backgroundColor: '#fff',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
              }}>
                <Text style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 12 }}>
                  Open Chat
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Welcome Section */}
          <ThemedView style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
            alignItems: 'center',
            flexDirection: 'column',
            gap: 0
          }}>
            {/* User Avatar */}
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              overflow: 'hidden',
              backgroundColor: '#E8F5E8',
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}>
              {user?.profile_picture_url ? (
                <Image source={{ uri: user.profile_picture_url }} style={{ width: 64, height: 64, borderRadius: 32 }} />
              ) : user?.profile_picture ? (
                <Image source={{ uri: user.profile_picture }} style={{ width: 64, height: 64, borderRadius: 32 }} />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#E8F5E8', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="user" size={28} color="#4CAF50" />
                </View>
              )}
            </View>
            <ThemedText
              style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: '#222',
                textAlign: 'center',
                marginBottom: 6,
                maxWidth: 240,
                lineHeight: 34,
                paddingHorizontal: 8,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Hi {(user?.display_name && user.display_name.split(' ')[0]) || (user?.email && user.email.split('@')[0]) || 'there'}
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 16,
                color: '#666',
                textAlign: 'center',
                maxWidth: 280,
                lineHeight: 22,
                paddingHorizontal: 8,
              }}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              How can we support your health today?
            </ThemedText>
          </ThemedView>


          {/* Remaining Sessions Section */}
          {currentSubscription && (
            <ThemedView style={styles.remainingSessionsSection}>
              <ThemedText style={styles.sectionTitle}>Your Remaining Sessions</ThemedText>
              <View style={styles.sessionsGrid}>
                <View style={styles.remainingSessionCard}>
                  <View style={styles.sessionIcon}>
                    <Icon name="message" size={24} color="#4CAF50" />
                  </View>
                  <View style={styles.sessionInfo}>
                    <ThemedText style={styles.sessionCount}>
                      {currentSubscription.textSessionsRemaining || 0}
                    </ThemedText>
                    <ThemedText style={styles.sessionLabel}>Text Sessions</ThemedText>
                  </View>
                  <View style={styles.sessionProgress}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.max(0, Math.min(100, ((currentSubscription.textSessionsRemaining || 0) / (currentSubscription.totalTextSessions || 1)) * 100))}%`,
                            backgroundColor: '#4CAF50'
                          }
                        ]}
                      />
                    </View>
                    <ThemedText style={styles.progressText}>
                      {currentSubscription.textSessionsRemaining || 0} / {currentSubscription.totalTextSessions || 0}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.remainingSessionCard}>
                  <View style={styles.sessionIcon}>
                    <Icon name="voice" size={24} color="#2196F3" />
                  </View>
                  <View style={styles.sessionInfo}>
                    <ThemedText style={styles.sessionCount}>
                      {currentSubscription.voiceCallsRemaining || 0}
                    </ThemedText>
                    <ThemedText style={styles.sessionLabel}>Voice Calls</ThemedText>
                  </View>
                  <View style={styles.sessionProgress}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.max(0, Math.min(100, ((currentSubscription.voiceCallsRemaining || 0) / (currentSubscription.totalVoiceCalls || 1)) * 100))}%`,
                            backgroundColor: '#2196F3'
                          }
                        ]}
                      />
                    </View>
                    <ThemedText style={styles.progressText}>
                      {currentSubscription.voiceCallsRemaining || 0} / {currentSubscription.totalVoiceCalls || 0}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.remainingSessionCard}>
                  <View style={styles.sessionIcon}>
                    <Icon name="video" size={20} color="#666" />
                  </View>
                  <View style={styles.sessionInfo}>
                    <ThemedText style={styles.sessionCount}>
                      {currentSubscription.videoCallsRemaining || 0}
                    </ThemedText>
                    <ThemedText style={styles.sessionLabel}>Video Calls</ThemedText>
                  </View>
                  <View style={styles.sessionProgress}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.max(0, Math.min(100, ((currentSubscription.videoCallsRemaining || 0) / (currentSubscription.totalVideoCalls || 1)) * 100))}%`,
                            backgroundColor: '#FF9800'
                          }
                        ]}
                      />
                    </View>
                    <ThemedText style={styles.progressText}>
                      {currentSubscription.videoCallsRemaining || 0} / {currentSubscription.totalVideoCalls || 0}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </ThemedView>
          )}

          {/* Quick Actions and My Appointments badge */}
          <View style={styles.quickActions}>
            <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('discover')}>
                <View style={styles.actionIcon}>
                  <Icon name="user" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.actionTitle}>Find Doctor</Text>
                <Text style={styles.actionSubtitle}>Book an appointment</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/my-appointments')}>
                <View style={styles.actionIcon}>
                  <Icon name="calendar" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.actionTitle}>My Appointments</Text>
                <Text style={styles.actionSubtitle}>View scheduled visits</Text>
                {/* Badge for recent activity */}
                {(() => {
                  // Show badge if there is a recent activity
                  const activities = getSafeAppointments().filter(appt =>
                    appt.status === 'pending' ||
                    appt.reschedulePending === true ||
                    (appt.status === 'cancelled' && appt.cancellationReason)
                  );
                  return activities.length > 0 && (
                    <View style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      backgroundColor: '#FF3B30',
                      borderRadius: 12,
                      minWidth: 24,
                      height: 24,
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingHorizontal: 6,
                      zIndex: 10
                    }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                        {activities.length}
                      </Text>
                    </View>
                  );
                })()}
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={handleEmergencyContact}>
                <View style={styles.actionIcon}>
                  <Icon name="voice" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.actionTitle}>Emergency Calls</Text>
                <Text style={styles.actionSubtitle}>Quick emergency access</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={() => setShowSubscriptions(true)}>
                <View style={styles.actionIcon}>
                  <Icon name="heart" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.actionTitle}>My Health Plan</Text>
                <Text style={styles.actionSubtitle}>Manage your plan</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </View>
    );
  };

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
          value={messageSearchQuery}
          onChangeText={setMessageSearchQuery}
        />
        {messageSearchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setMessageSearchQuery('')} style={{ marginLeft: 10 }}>
            <Icon name="times" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Unified Chat List - WhatsApp Style Inbox */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setShowEndedSessionMenu(null)}
        refreshControl={
          <RefreshControl
            refreshing={refreshingMessages}
            onRefresh={refreshMessagesTab}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        {(() => {
          // Get active text sessions and add to list
          const activeTextSessionItems = activeTextSessions.map(session => ({
            ...session,
            type: 'active_text',
            sortDate: new Date().getTime(), // Most recent
            isActive: true
          }));

          // Get active appointments
          const activeAppointments = getSafeAppointments()
            .filter(appt => {
              // Only show confirmed appointments in messages
              const status = appt.status;
              const isConfirmedOrInProgress =
                status === 'confirmed' || status === 1 ||
                status === 'in_progress' || status === 7; // Include in_progress appointments

              return isConfirmedOrInProgress && (
                !messageSearchQuery ||
                (appt.doctorName || appt.doctor_name || '')?.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
                (appt.reason || '')?.toLowerCase().includes(messageSearchQuery.toLowerCase())
              );
            })
            .map(appt => ({
              ...appt,
              type: 'active',
              sortDate: (() => {
                if (appt.updatedAt) return new Date(appt.updatedAt).getTime();
                if (appt.createdAt) return new Date(appt.createdAt).getTime();

                // Use appointment_date and appointment_time from API
                const dateStr = appt.appointment_date || appt.date;
                const timeStr = appt.appointment_time || appt.time;

                if (dateStr && timeStr && typeof dateStr === 'string' && typeof timeStr === 'string') {
                  try {
                    // Handle different date formats
                    if (dateStr.includes('/')) {
                      // Format: MM/DD/YYYY
                      const [month, day, year] = dateStr.split('/').map(Number);
                      const [hour, minute] = timeStr.split(':').map(Number);
                      return new Date(year, month - 1, day, hour, minute).getTime();
                    } else {
                      // Format: YYYY-MM-DD
                      return new Date(`${dateStr}T${timeStr}`).getTime();
                    }
                  } catch {
                    return 0;
                  }
                }
                return 0;
              })(),
              isActive: false
            }));

          // Get ended sessions (filtered by search if needed)
          const filteredEndedSessions = endedSessions
            .filter(session =>
              session && session.doctor_name && (
                !messageSearchQuery ||
                session.doctor_name.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
                (session.reason && session.reason.toLowerCase().includes(messageSearchQuery.toLowerCase()))
              )
            )
            .map(session => ({
              ...session,
              type: 'ended',
              sortDate: session.ended_at ? new Date(session.ended_at).getTime() : 0,
              isActive: false
            }));

          // Combine all items and sort by date (most recent first)
          const allItems = [...activeTextSessionItems, ...activeAppointments, ...filteredEndedSessions]
            .sort((a, b) => b.sortDate - a.sortDate);


          return allItems.map((item, index) => {
            const isLastItem = index === allItems.length - 1;

            if (item.type === 'active_text') {
              // Render active text session as card
              return (
                <TouchableOpacity
                  key={`active_text_${item.id || item.appointment_id}`}
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
                  onPress={() => {
                    const chatId = `text_session_${item.id || item.appointment_id}`;
                    router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: chatId } });
                  }}
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
                          {item.doctor?.first_name?.charAt(0) || 'D'}
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
                        Dr. {item.doctor?.first_name} {item.doctor?.last_name}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#4CAF50', marginBottom: 2 }} numberOfLines={1}>
                        Text Session
                      </Text>
                      <Text style={{ fontSize: 14, color: '#666' }} numberOfLines={1}>
                        {item.remaining_time_minutes} min remaining
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#999' }}>
                      Now
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            } else if (item.type === 'active') {
              // Render active appointment as card
              return (
                <TouchableOpacity
                  key={`active_${item.id}`}
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
                  onPress={() => {
                    router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: item.id } });
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                        {String(item.doctorName || item.doctor_name || 'Doctor').charAt(0) || 'D'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 4 }} numberOfLines={1}>
                        {String(item.doctorName || item.doctor_name || 'Doctor')}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#4CAF50', marginBottom: 2 }} numberOfLines={1}>
                        {String(item.reason) || 'Chat'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, color: '#666' }} numberOfLines={1}>
                          {item.consultationType === 'text' ? 'Text Chat' :
                            item.consultationType === 'voice' ? 'Voice Call' :
                              item.consultationType === 'video' ? 'Video Call' : 'Chat'}
                        </Text>
                        {getAppointmentSessionStatus(item) === 'pending' && (
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
                    <View style={{ alignItems: 'flex-end' }}>
                      {getAppointmentSessionStatus(item) === 'ready' && (
                        <View style={{ backgroundColor: '#4CAF50', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginBottom: 4 }}>
                          <Text style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>Ready</Text>
                        </View>
                      )}
                      {getAppointmentSessionStatus(item) === 'scheduled' && (
                        <View style={{ backgroundColor: '#999', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginBottom: 4 }}>
                          <Text style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>Pending</Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 12, color: '#999' }}>
                        {item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            } else {
              // Render ended session as card
              return (
                <View key={`ended_${item.appointmentId}`} style={{ position: 'relative' }}>
                  <TouchableOpacity
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
                    onPress={() => {
                      router.push({ pathname: '/ended-session/[appointmentId]', params: { appointmentId: item.appointmentId.toString() } });
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: '#E0E0E0',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 16
                      }}>
                        <Text style={{ color: '#666', fontSize: 18, fontWeight: 'bold' }}>
                          {stripDoctorPrefix(item.doctor_name || 'Doctor').charAt(0) || 'D'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 4 }} numberOfLines={1}>
                          {withDoctorPrefix(item.doctor_name || 'Unknown')}
                        </Text>
                        <Text style={{ fontSize: 14, color: '#4CAF50', marginBottom: 2 }} numberOfLines={1}>
                          {item.reason || 'General Checkup'}
                        </Text>
                        <Text style={{ fontSize: 14, color: '#666' }} numberOfLines={1}>
                          Session ended • {formatDuration(item.session_duration || 0)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                          {item.appointment_date ? new Date(item.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown date'}
                        </Text>
                        <TouchableOpacity
                          style={{
                            padding: 4,
                          }}
                          onPress={() => setShowEndedSessionMenu(showEndedSessionMenu === item.appointmentId ? null : item.appointmentId)}
                        >
                          <Icon name="more" size={16} color="#999" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Menu dropdown */}
                  {showEndedSessionMenu === item.appointmentId && (
                    <View style={{
                      position: 'absolute',
                      right: 20,
                      top: 60,
                      backgroundColor: '#fff',
                      borderRadius: 8,
                      paddingVertical: 4,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 4,
                      elevation: 5,
                      zIndex: 2,
                      minWidth: 120,
                    }}>
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                        }}
                        onPress={() => handleExportEndedSession(item.appointmentId)}
                      >
                        <Icon name="export" size={20} color="#666" />
                        <Text style={{ fontSize: 14, color: '#222' }}>Export</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                        }}
                        onPress={() => handleDeleteEndedSession(item.appointmentId)}
                      >
                        <Icon name="delete" size={20} color="#666" />
                        <Text style={{ fontSize: 14, color: '#FF3B30' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }
          });
        })()}

        {/* Loading State for Ended Sessions */}
        {(loadingEndedSessions || loadingTextSessions) && (
          <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 20 }}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Loading messages...</Text>
          </View>
        )}

        {/* Empty State */}
        {(() => {
          const activeAppointments = getSafeAppointments().filter(appt => {
            const status = appt.status;
            return status === 'confirmed' || status === 1; // Only confirmed appointments
          });
          const hasActiveAppointments = activeAppointments.length > 0;
          const hasEndedSessions = endedSessions.length > 0;

          // Show text sessions if they exist (no filtering)
          const hasActiveTextSessions = activeTextSessions.length > 0;
          const hasSearchResults = messageSearchQuery && (activeAppointments.length > 0 || endedSessions.length > 0 || hasActiveTextSessions);

          if (!hasActiveAppointments && !hasEndedSessions && !hasActiveTextSessions && !messageSearchQuery) {
            return (
              <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 40 }}>
                <DoctorProfilePicture
                  size={80}
                  style={{ marginBottom: 18 }}
                  name="Doctor"
                />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 6 }}>No messages yet</Text>
                <Text style={{ fontSize: 15, color: '#7CB18F', textAlign: 'center' }}>Book an appointment to start chatting with your doctor</Text>
              </View>
            );
          }

          if (messageSearchQuery && !hasSearchResults) {
            return (
              <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 40 }}>
                <DoctorProfilePicture
                  size={80}
                  style={{ marginBottom: 18 }}
                  name="Doctor"
                />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 6 }}>No messages found</Text>
                <Text style={{ fontSize: 15, color: '#7CB18F', textAlign: 'center' }}>Try searching with different keywords</Text>
              </View>
            );
          }

          return null;
        })()}
      </ScrollView>
    </View>
  );

  const renderProfileContent = () => (
    <ScrollView
      style={{ ...styles.content, backgroundColor: '#F8F9FA' }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshingProfile}
          onRefresh={refreshProfileTab}
          colors={['#4CAF50']}
          tintColor="#4CAF50"
        />
      }
    >
      {/* Profile Header */}
      <View style={{ alignItems: 'center', marginBottom: 18 }}>
        {user?.profile_picture_url ? (
          <Image source={{ uri: user.profile_picture_url }} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#F0F8FF', marginBottom: 10 }} />
        ) : user?.profile_picture ? (
          <Image source={{ uri: user.profile_picture }} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#F0F8FF', marginBottom: 10 }} />
        ) : (
          <Image source={profileImage} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#F0F8FF', marginBottom: 10 }} />
        )}
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#222', textAlign: 'center' }}>{user?.display_name || (user?.email && user.email.split('@')[0]) || 'Patient'}</Text>
      </View>

      {/* Account Section */}
      <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#222', marginTop: 18, marginBottom: 8, marginLeft: 18 }}>Account</Text>
      <View style={{ backgroundColor: 'transparent', marginBottom: 8, paddingHorizontal: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }}>
          <Icon name="email" size={20} color="#666" />
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1 }}>Email</Text>
          <Text style={{ color: '#4CAF50', fontSize: 15, textAlign: 'right', flex: 1.2 }}>{user?.email || 'Not provided'}</Text>
        </View>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }} onPress={() => { setShowSubscriptions(true); setActiveTab('home'); }}>
          <Icon name="heart" size={20} color="#666" />
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1 }}>My Health Plan</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Settings Section */}
      <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#222', marginTop: 18, marginBottom: 8, marginLeft: 18 }}>Settings</Text>
      <View style={{ backgroundColor: 'transparent', marginBottom: 8, paddingHorizontal: 8 }}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }} onPress={() => router.push('/patient-profile')}>
          <Icon name="user" size={20} color="#666" />
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1 }}>View Profile</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }} onPress={() => router.push('/edit-patient-profile')}>
          <Icon name="user" size={20} color="#666" />
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1 }}>Edit Profile</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }} onPress={() => router.push('/privacy-settings')}>
          <Icon name="eye" size={20} color="#666" />
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1 }}>Privacy Settings</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }} onPress={() => router.push('/notifications-settings')}>
          <Icon name="bell" size={20} color="#666" />
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1 }}>Notifications</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }} onPress={() => router.push('/help-support')}>
          <Icon name="questionCircle" size={20} color="#666" />
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1 }}>Help & Support</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }} onPress={() => router.push('/network-test')}>
          <Icon name="wifi" size={20} color="#666" />
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1 }}>Network Test</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6B6B', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }} onPress={() => router.push('/test-webview')}>
          <Icon name="globe" size={20} color="#fff" />
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#fff', flex: 1 }}>🧪 Test WebView Module</Text>
          <Icon name="chevronRight" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }} onPress={() => setShowCacheManagement(true)}>
          <Icon name="image" size={20} color="#666" />
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1 }}>Image Cache</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }, { marginTop: 20 }]} onPress={handleLogout}>
        <Icon name="signOut" size={20} color="#666" />
        <Text style={[{ fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1 }, { color: '#FF3B30' }]}>Logout</Text>
        <Icon name="chevronRight" size={20} color="#666" />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderDiscoverDoctorsContent = () => {
    // Check if profile is incomplete
    const missing = getMissingFields(userData);
    if (missing.length > 0) {
      return (
        <IncompleteProfileBlock
          userType="patient"
          missingFields={missing}
          context="discover"
          onComplete={() => router.push('/edit-patient-profile')}
        />
      );
    }

    return (
      <ScrollView
        ref={discoverScrollViewRef}
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshingDoctors}
            onRefresh={refreshDoctorsTab}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        <View style={styles.header}>
        </View>

        {/* Search and Filter Container */}
        <View style={styles.searchFilterContainer}>
          {/* Search Bar - Full Width */}
          <View ref={tourTabRefs.current['discover-search-bar']} style={styles.searchBar}>
            <Icon name="search" size={20} color="#4CAF50" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search doctors by name or specialization..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilterModal(true)}
            >
              <FontAwesome name="sliders" size={18} color="#4CAF50" />
              {(showOnlyOnline || selectedSpecialization || sortBy !== 'name') && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {[showOnlyOnline, selectedSpecialization, sortBy !== 'name'].filter(Boolean).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Active Filters Chips */}
          {(showOnlyOnline || selectedSpecialization || sortBy !== 'name') && (
            <View style={styles.activeFiltersContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activeFiltersContent}
              >
                {showOnlyOnline && (
                  <View style={styles.activeFilterChip}>
                    <Icon name="online" size={10} color="#4CAF50" style={{ marginRight: 6 }} />
                    <Text style={styles.activeFilterChipText}>Online Only</Text>
                    <TouchableOpacity
                      onPress={() => setShowOnlyOnline(false)}
                      style={styles.removeFilterButton}
                    >
                      <Icon name="times" size={12} color="#4CAF50" />
                    </TouchableOpacity>
                  </View>
                )}
                {selectedSpecialization && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>{selectedSpecialization}</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedSpecialization('')}
                      style={styles.removeFilterButton}
                    >
                      <Icon name="times" size={12} color="#4CAF50" />
                    </TouchableOpacity>
                  </View>
                )}
                {sortBy !== 'name' && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>Sort: {getSortOptionLabel(sortBy)}</Text>
                    <TouchableOpacity
                      onPress={() => setSortBy('name')}
                      style={styles.removeFilterButton}
                    >
                      <Icon name="times" size={12} color="#4CAF50" />
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.clearAllFiltersButton}
                  onPress={() => {
                    setShowOnlyOnline(false);
                    setSelectedSpecialization('');
                    setSortBy('name');
                  }}
                >
                  <Text style={styles.clearAllFiltersText}>Clear All</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Discover Banner Carousel (hide while searching) */}
        {searchQuery.trim().length === 0 && (
          <View style={{ marginHorizontal: 0, marginBottom: 32, paddingHorizontal: 0 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setCurrentBannerIndex((prev) => (prev + 1) % discoverBanners.length)}
            >
              <View style={{ position: 'relative' }}>
                <Image
                  source={discoverBanners[currentBannerIndex]}
                  onLoadStart={() => {
                    setIsDiscoverBannerLoading(true);
                    setShowDiscoverBannerLoader(false);
                    if (discoverBannerLoaderTimeoutRef.current) {
                      clearTimeout(discoverBannerLoaderTimeoutRef.current);
                    }
                    // Avoid spinner flashing on fast loads; only show if it’s actually slow.
                    discoverBannerLoaderTimeoutRef.current = setTimeout(() => {
                      setShowDiscoverBannerLoader(true);
                    }, 400);
                  }}
                  onLoadEnd={() => {
                    setIsDiscoverBannerLoading(false);
                    setShowDiscoverBannerLoader(false);
                    if (discoverBannerLoaderTimeoutRef.current) {
                      clearTimeout(discoverBannerLoaderTimeoutRef.current);
                      discoverBannerLoaderTimeoutRef.current = null;
                    }
                  }}
                  onError={() => {
                    setIsDiscoverBannerLoading(false);
                    setShowDiscoverBannerLoader(false);
                    if (discoverBannerLoaderTimeoutRef.current) {
                      clearTimeout(discoverBannerLoaderTimeoutRef.current);
                      discoverBannerLoaderTimeoutRef.current = null;
                    }
                    setCurrentBannerIndex((prev) => (prev + 1) % discoverBanners.length);
                  }}
                  fadeDuration={250}
                  style={{
                    width: '100%',
                    height: 180,
                    borderRadius: 16,
                    resizeMode: 'cover'
                  }}
                />
                {isDiscoverBannerLoading && showDiscoverBannerLoader && (
                  <View style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    borderRadius: 16,
                    backgroundColor: '#F3F4F6',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <ActivityIndicator color="#4CAF50" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            {/* Banner Indicator Dots */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 10,
              marginBottom: 6,
              gap: 8
            }}>
              {discoverBanners.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentBannerIndex(index)}
                >
                  <View style={{
                    width: currentBannerIndex === index ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: currentBannerIndex === index ? '#4CAF50' : '#D0D0D0',
                  }} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Doctors List */}
        <View ref={tourTabRefs.current['discover-doctors-list']} style={styles.doctorsListNew}>
          {loadingDoctors && doctors.length === 0 && filteredAndSortedDoctors.length === 0 ? (
            // Initial load - show 6 skeleton cards
            <DoctorCardSkeleton count={6} />
          ) : doctorsError ? (
            <View style={styles.errorContainer}>
              <Icon name="warning" size={20} color="#666" />
              <Text style={styles.errorText}>Unable to Load Doctors</Text>
              <Text style={styles.errorSubtext}>{doctorsError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setDoctorsError(null);
                  setLoadingDoctors(true);
                  apiService.get('/doctors/active')
                    .then((response: any) => {
                      if (response.success && response.data) {
                        const doctorsData = response.data.data || response.data;
                        if (Array.isArray(doctorsData)) {
                          const approvedDoctors = doctorsData
                            .filter((doctor: any) => doctor.status === 'approved')
                            .map((doctor: any) => ({
                              id: doctor.id,
                              first_name: doctor.first_name,
                              last_name: doctor.last_name,
                              name: doctor.display_name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Dr. Unknown',
                              specialization: doctor.specialization || doctor.occupation || 'General Medicine',
                              rating: doctor.rating || 4.5,
                              years_of_experience: doctor.years_of_experience || 5,
                              experience: doctor.years_of_experience || 5,
                              city: doctor.city,
                              country: doctor.country,
                              location: doctor.city && doctor.country ? `${doctor.city}, ${doctor.country}` : doctor.country || 'Unknown',
                              email: doctor.email,
                              status: doctor.status,
                              profile_picture: doctor.profile_picture,
                              profile_picture_url: doctor.profile_picture_url,
                              is_online: doctor.is_online_for_instant_sessions || false
                            }));
                          setDoctors(approvedDoctors);
                        } else {
                          setDoctors([]);
                        }
                      } else {
                        setDoctors([]);
                      }
                    })
                    .catch((error) => {
                      console.error('Error retrying doctors fetch:', error);
                      setDoctorsError('Failed to load doctors. Please try again later.');
                      setDoctors([]);
                    })
                    .finally(() => setLoadingDoctors(false));
                }}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : filteredAndSortedDoctors.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No doctors found</Text>
              <Text style={styles.noResultsSubtext}>
                {searchQuery ? 'Try adjusting your search criteria' : 'Check back later for available doctors'}
              </Text>
            </View>
          ) : (
            // Show hybrid of skeleton and real cards
            (() => {
              const totalToShow = loadingDoctors && !hasAnimatedDoctors.current
                ? Math.max(6, filteredAndSortedDoctors.length)
                : filteredAndSortedDoctors.length;

              return Array.from({ length: totalToShow }).map((_, index) => {
                const doctor = filteredAndSortedDoctors[index];
                const isVisible = index < visibleDoctorCards;

                // If already animated before, show all real cards immediately
                if (hasAnimatedDoctors.current && doctor) {
                  return (
                    <DoctorCard
                      key={doctor.id}
                      doctor={doctor}
                      onPress={handleViewDoctorDetails}
                      onFavoriteChange={() => setFavoritesRefreshTrigger(prev => prev + 1)}
                    />
                  );
                }

                // Show skeleton if card hasn't loaded yet or isn't visible
                if (!doctor || !isVisible) {
                  return (
                    <View key={`skeleton-${index}`}>
                      <DoctorCardSkeleton count={1} />
                    </View>
                  );
                }

                // First time animation for loaded card
                const animValue = doctorCardAnimations[doctor.id] || new Animated.Value(0);

                return (
                  <Animated.View
                    key={doctor.id}
                    style={{
                      opacity: animValue,
                      transform: [
                        {
                          translateY: animValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    <DoctorCard
                      doctor={doctor}
                      onPress={handleViewDoctorDetails}
                      onFavoriteChange={() => setFavoritesRefreshTrigger(prev => prev + 1)}
                    />
                  </Animated.View>
                );
              });
            })()
          )}
        </View>
      </ScrollView>
    );
  };

  // Helper to get status badge information
  const getStatusBadge = (status: string | number) => {
    // Handle both string and numeric status values
    const statusStr = String(status);
    const statusNum = Number(status);

    switch (statusStr) {
      case 'pending':
      case '0':
        return { color: '#FFA500', text: 'Pending', icon: 'clock' };
      case 'confirmed':
      case '1':
        return { color: '#4CAF50', text: 'Confirmed', icon: 'check' };
      case 'cancelled':
      case '2':
        return { color: '#F44336', text: 'Cancelled', icon: 'times' };
      case 'completed':
      case '3':
        return { color: '#2196F3', text: 'Completed', icon: 'check-square-o' };
      default:
        // Fallback for any other values
        return { color: '#666', text: 'Unknown', icon: 'question' };
    }
  };

  // Helper to parse date/time safely
  const parseDateTime = (dateStr?: string, timeStr?: string) => {
    try {
      if (!dateStr || !timeStr) return null;
      const d = new Date(`${dateStr}T${timeStr}`);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  // Helper to get status color
  const getStatusColor = (status: string | number) => {
    return getStatusBadge(status).color;
  };

  // Helper to get status text
  const getStatusText = (status: string | number) => {
    return getStatusBadge(status).text;
  };

  // Helper to get status icon
  const getStatusIcon = (status: string | number) => {
    return getStatusBadge(status).icon;
  };

  const renderAppointmentsContent = () => {
    const parseDateTime = (dateStr: string, timeStr: string) => {
      try {
        // Handle different date formats
        let date: Date;

        // If it's already in MM/DD/YYYY format, parse it properly
        if (dateStr && dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const month = parseInt(parts[0]) - 1; // Month is 0-indexed
            const day = parseInt(parts[1]);
            const year = parseInt(parts[2]);

            // Validate the date components
            if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year > 1900) {
              date = new Date(year, month, day);
            } else {
              return 'Invalid Date';
            }
          } else {
            return 'Invalid Date';
          }
        } else {
          // Try parsing as ISO string or other formats
          date = new Date(dateStr);
        }

        // Check if the date is valid
        if (isNaN(date.getTime())) {
          return null;
        }

        return date;
      } catch {
        return null;
      }
    };

    // Single unified list: sort recent-first and show all statuses
    const safeAppointments = getSafeAppointments();
    const recentAppointments = [...safeAppointments]
      .map((appt: any) => ({
        ...appt,
        // build comparable timestamp
        __ts: (() => {
          try {
            const d = parseDateTime(appt.appointment_date || appt.date, appt.appointment_time || appt.time);
            return d ? d.getTime() : 0;
          } catch {
            return 0;
          }
        })()
      }))
      .sort((a, b) => (b.__ts || 0) - (a.__ts || 0));

    return (
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshingAppointments}
            onRefresh={refreshAppointmentsTab}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.welcomeText}>My Appointments</Text>
          <Text style={styles.subtitle}>Track your healthcare appointments</Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Recent Appointments</Text>
          {recentAppointments.length === 0 ? (
            <Text style={styles.emptyText}>No appointments yet.</Text>
          ) : (
            recentAppointments.map(appt => (
              <TouchableOpacity key={String(appt.id)} style={styles.appointmentCard} onPress={() => setSelectedPatientAppointment(appt)}>
                <View style={styles.appointmentHeader}>
                  <DoctorProfilePicture
                    profilePictureUrl={(appt.doctor && appt.doctor.profile_picture_url) || appt.doctor_profile_picture_url}
                    profilePicture={(appt.doctor && appt.doctor.profile_picture) || appt.doctor_profile_picture}
                    size={50}
                    name={appt.doctorName || appt.doctor_name}
                  />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.doctorNameNew}>{withDoctorPrefix(appt.doctorName || appt.doctor_name || 'Doctor')}</Text>
                    <Text style={{ fontSize: 14, color: '#666', marginTop: 2, marginBottom: 4 }}>
                      {(() => {
                        const dStr = appt.appointment_date || appt.date;
                        const tStr = appt.appointment_time || appt.time;
                        return `${dStr || ''}${dStr && tStr ? ' • ' : ''}${tStr || ''}`.trim();
                      })()}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appt.status) }]}>
                        <FontAwesome name={getStatusIcon(appt.status) as any} size={12} color="#fff" />
                        <Text style={styles.statusBadgeText}>{getStatusText(appt.status)}</Text>
                      </View>
                      {appt.appointment_type || appt.type ? (
                        <View style={{ backgroundColor: '#E8F5E8', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 }}>
                          <Text style={{ color: '#2E7D32', fontWeight: '600' }}>{String(appt.appointment_type || appt.type)}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  const renderPatientAppointmentModal = () => {
    if (!selectedPatientAppointment) return null;
    const appt = selectedPatientAppointment;
    const dt = (() => {
      try {
        const dStr = appt.appointment_date || appt.date;
        const tStr = appt.appointment_time || appt.time;
        if (dStr && tStr) {
          const d = new Date(`${dStr}T${tStr}`);
          return isNaN(d.getTime()) ? null : d;
        }
        return null;
      } catch {
        return null;
      }
    })();
    return (
      <Modal visible={!!selectedPatientAppointment} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%', maxWidth: 420, position: 'relative' }}>
            <TouchableOpacity onPress={() => setSelectedPatientAppointment(null)} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' }}>
              <Text style={{ color: '#555', fontWeight: 'bold', fontSize: 16 }}>×</Text>
            </TouchableOpacity>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <DoctorProfilePicture
                profilePictureUrl={(appt.doctor && appt.doctor.profile_picture_url) || appt.doctor_profile_picture_url}
                profilePicture={(appt.doctor && appt.doctor.profile_picture) || appt.doctor_profile_picture}
                size={72}
                name={appt.doctorName || appt.doctor_name}
              />
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginTop: 10 }} numberOfLines={1}>{withDoctorPrefix(appt.doctorName || appt.doctor_name || 'Doctor')}</Text>
              {appt.doctor && appt.doctor.email ? (
                <Text style={{ fontSize: 14, color: '#666' }} numberOfLines={1}>{appt.doctor.email}</Text>
              ) : null}
            </View>
            <View style={{ backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <Text style={{ color: '#222', fontWeight: '600', marginBottom: 8 }}>Appointment Details</Text>
              <Text style={{ color: '#4CAF50', marginBottom: 4 }}>
                {dt ? `${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })} • ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `${appt.date} • ${appt.time}`}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appt.status) }]}>
                  <FontAwesome name={getStatusIcon(appt.status) as any} size={12} color="#fff" />
                  <Text style={styles.statusBadgeText}>{getStatusText(appt.status)}</Text>
                </View>
                {appt.appointment_type || appt.type ? (
                  <View style={{ backgroundColor: '#E8F5E8', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, marginLeft: 8 }}>
                    <Text style={{ color: '#2E7D32', fontWeight: '600' }}>{String(appt.appointment_type || appt.type)}</Text>
                  </View>
                ) : null}
              </View>
              {appt.reason && appt.reason.trim() !== '' ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: '#222', fontWeight: '600', marginBottom: 4 }}>Reason</Text>
                  <Text style={{ color: '#666' }}>{String(appt.reason)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Sidebar open/close handlers
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

  // Main content switcher
  let mainContent;
  switch (activeTab) {
    case 'messages':
      mainContent = renderMessagesContent();
      break;
    case 'profile':
      mainContent = renderProfileContent();
      break;
    case 'discover':
      mainContent = renderDiscoverDoctorsContent();
      break;
    case 'appointments':
      mainContent = renderAppointmentsContent();
      break;
    case 'blogs':
      mainContent = (
        <Blog
          hideBottomNav
          headerContent={
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 4,
                backgroundColor: '#FFFFFF',
                borderBottomWidth: 1,
                borderBottomColor: '#E0E0E0',
                zIndex: 10,
                position: 'relative',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                marginBottom: 8,
              }}
            >
              {/* Hamburger Menu Icon (always left) */}
              <TouchableOpacity style={styles.hamburgerButton} onPress={openSidebar}>
                <View style={styles.hamburgerIcon}>
                  <View style={styles.hamburgerLine1} />
                  <View style={styles.hamburgerLine2} />
                  <View style={styles.hamburgerLine3} />
                </View>
              </TouchableOpacity>

              {/* Centered content - Always Blogs for this branch */}
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 60,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: 'bold',
                    color: '#222',
                    textAlign: 'center',
                  }}
                >
                  Blogs
                </Text>
              </View>

              {/* Search button (for Blogs, Messages, Discover) */}
              {['blogs', 'messages', 'discover'].includes(activeTab) && (
                <TouchableOpacity
                  style={{ position: 'absolute', right: 12, top: 12 }}
                  onPress={() => {
                    if (activeTab === 'blogs') {
                      Alert.alert('Blog Search', 'Open blog search!');
                    } else if (activeTab === 'messages') {
                      Alert.alert('Messages Search', 'Open messages search!');
                    } else if (activeTab === 'discover') {
                      Alert.alert('Discover Search', 'Open discover search!');
                    }
                  }}
                >
                  <Icon name="search" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          }
        />
      );
      break;
    case 'home':
    default:
      mainContent = renderHomeContent();
      break;
  }

  // 1. Add renderSubscriptionsContent (from backup, slightly adapted for overlay)
  const renderSubscriptionsContent = () => {
    // Find the selected plan object
    const selectedPlan = subscriptionPlans.find(plan => plan.id === selectedPlanId) || null;

    // Use subscription data directly for active plan pricing instead of searching in plans array
    let activePlan = null;

    if (currentSubscription) {
      // Try to get plan data from subscription first
      activePlan = {
        id: currentSubscription.plan_id,
        name: currentSubscription.planName || 'Current Plan',
        price: currentSubscription.plan_price || 0,
        currency: currentSubscription.plan_currency || 'MWK',
        textSessions: currentSubscription.totalTextSessions || 0,
        voiceCalls: currentSubscription.totalVoiceCalls || 0,
        videoCalls: currentSubscription.totalVideoCalls || 0,
        features: [] // We'll populate this if needed
      };

      // If subscription data is missing price info, try to find it in plans array as fallback
      if (!currentSubscription.plan_price || currentSubscription.plan_price === 0) {
        const planFromArray = subscriptionPlans.find(plan => plan.id === currentSubscription.plan_id);
        if (planFromArray) {
          activePlan.price = planFromArray.price;
          activePlan.currency = planFromArray.currency;
          activePlan.features = planFromArray.features || [];
        }
      }
    }

    // Debug logging
    console.log('PatientDashboard: Active plan data:', {
      currentSubscription,
      activePlan,
      planPrice: currentSubscription?.plan_price,
      planCurrency: currentSubscription?.plan_currency
    });
    return (
      <View style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#F8F9FA',
        zIndex: 999,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}>
        <View style={{ flex: 1 }}>
          {/* Modern Header with gradient background */}
          <View style={{
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 16,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
            marginBottom: 20,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => setShowSubscriptions(false)}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  padding: 8,
                  backgroundColor: '#F8F9FA',
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Icon name="arrowLeft" size={20} color="#666" />
              </TouchableOpacity>
              <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#222',
                textAlign: 'center'
              }}>
                {currentSubscription ? 'Add Sessions' : 'Health Plans'}
              </Text>
            </View>
            <Text style={{
              fontSize: 16,
              color: '#666',
              textAlign: 'center',
              marginTop: 4,
            }}>
              {currentSubscription ? 'Choose a plan to add more sessions' : 'Select the perfect plan for your health needs'}
            </Text>

            {/* Clean Location Indicator */}
            {currentLocationInfo && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 12,
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: '#F8F9FA',
                borderRadius: 20,
                alignSelf: 'center',
              }}>
                <Icon
                  name={(currentLocationInfo as any).source === 'gps' ? "mapMarker" : "user"}
                  size={16}
                  color="#4CAF50"
                />
                <Text style={{
                  fontSize: 12,
                  color: '#666',
                  marginLeft: 6,
                  fontWeight: '500'
                }}>
                  {(currentLocationInfo as any).country} • {(currentLocationInfo as any).currency}
                </Text>
              </View>
            )}
          </View>
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 12 }}
            contentContainerStyle={{ paddingBottom: Math.max(100, insets.bottom + 24) }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshingSubscriptions}
                onRefresh={refreshSubscriptionsTab}
                colors={['#4CAF50']}
                tintColor="#4CAF50"
              />
            }
          >
            {/* Active Plan Card - Modern Design */}
            {activePlan && (
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                borderWidth: 2,
                borderColor: '#4CAF50',
                marginBottom: 24,
                padding: 24,
                shadowColor: '#4CAF50',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 6,
                position: 'relative',
              }}>
                {/* Active Badge */}
                <View style={{
                  position: 'absolute',
                  top: -8,
                  right: 20,
                  backgroundColor: '#4CAF50',
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 16,
                  shadowColor: '#4CAF50',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' }}>CURRENT PLAN</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#E8F5E8',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}>
                    <Icon name="check" size={24} color="#4CAF50" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 4 }}>
                      {activePlan.name}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#4CAF50', fontWeight: '600' }}>
                      Active Subscription
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 }}>
                  <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#222' }}>
                    {LocationService.getCurrencySymbol(activePlan.currency)}{activePlan.price.toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 18, color: '#666', marginBottom: 4, marginLeft: 4 }}>/month</Text>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#4CAF50',
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: 'center',
                    marginBottom: 20,
                    shadowColor: '#4CAF50',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                    opacity: isPurchasing ? 0.7 : 1,
                  }}
                  onPress={() => handlePurchaseSubscription(activePlan)}
                  activeOpacity={0.85}
                  disabled={isPurchasing}
                >
                  {isPurchasing ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                      <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#fff' }}>Processing...</Text>
                    </View>
                  ) : (
                    <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#fff' }}>Renew Plan</Text>
                  )}
                </TouchableOpacity>
                {/* Session Details - Modern Grid Layout */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 16 }}>Plan Benefits</Text>

                  <View style={{
                    backgroundColor: '#F8F9FA',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                  }}>
                    {/* Text Sessions */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#E8F5E8',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}>
                        <Icon name="message" size={16} color="#4CAF50" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, color: '#222', fontWeight: '600' }}>
                          {activePlan.textSessions} Text Sessions
                        </Text>
                        <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                          10 minutes each
                        </Text>
                      </View>
                    </View>

                    {/* Voice Calls */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#E8F5E8',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}>
                        <Icon name="voice" size={16} color="#4CAF50" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, color: '#222', fontWeight: '600' }}>
                          {activePlan.voiceCalls} Voice Calls
                        </Text>
                        <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                          Audio consultations
                        </Text>
                      </View>
                    </View>

                    {/* Video Calls */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#E8F5E8',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}>
                        <Icon name="video" size={16} color="#4CAF50" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, color: '#222', fontWeight: '600' }}>
                          {activePlan.videoCalls} Video Calls
                        </Text>
                        <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                          Face-to-face consultations
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Additional Features */}
                {activePlan.features && activePlan.features.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 12 }}>Additional Benefits</Text>
                    <View style={{
                      backgroundColor: '#F8F9FA',
                      borderRadius: 12,
                      padding: 16,
                    }}>
                      {activePlan.features.map((feature: string, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <View style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: '#4CAF50',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                          }}>
                            <Icon name="check" size={12} color="#FFFFFF" />
                          </View>
                          <Text style={{ fontSize: 14, color: '#222', flex: 1 }}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}





            {plansError ? (
              <View style={styles.errorContainer}>
                <Icon name="warning" size={20} color="#666" />
                <Text style={styles.errorText}>Unable to Load Plans</Text>
                <Text style={styles.errorSubtext}>{plansError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    setPlansError(null);
                    // Retry loading plans
                    const loadPlans = async () => {
                      try {
                        const response = await apiService.get('/plans');
                        if (response.success && (response as any).plans) {
                          const userCurrency = LocationService.getCurrencyForCountry(userCountry);
                          const filteredPlans = (response as any).plans.filter((plan: any) => plan.currency === userCurrency);

                          const transformedPlans = filteredPlans.map((plan: any) => ({
                            id: plan.id.toString(),
                            name: plan.name,
                            price: plan.price,
                            currency: plan.currency,
                            textSessions: plan.text_sessions || 0,
                            voiceCalls: plan.voice_calls || 0,
                            videoCalls: plan.video_calls || 0,
                            features: Array.isArray(plan.features) ? plan.features : [],
                            popular: plan.name.toLowerCase().includes('executive'),
                            bestValue: plan.name.toLowerCase().includes('premium')
                          }));
                          setSubscriptionPlans(transformedPlans);
                        } else {
                          setPlansError('Unable to load subscription plans. Please try again later.');
                          setSubscriptionPlans([]);
                        }
                      } catch (error) {
                        console.error('Error retrying plans fetch:', error);
                        setPlansError('Failed to load subscription plans. Please try again later.');
                        setSubscriptionPlans([]);
                      }
                    };
                    loadPlans();
                  }}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : subscriptionPlans.length === 0 ? (
              <View style={styles.noResultsContainer}>
                <Icon name="infoCircle" size={20} color="#666" />
                <Text style={styles.noResultsText}>No Plans Available</Text>
                <Text style={styles.noResultsSubtext}>Please check back later for available subscription plans</Text>
              </View>
            ) : (
              subscriptionPlans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const isActivePlan = currentSubscription && currentSubscription.plan_id === plan.id;

                return (
                  <View key={plan.id} style={{
                    backgroundColor: isActivePlan ? '#F8FFF8' : '#FFFFFF',
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: isActivePlan ? '#4CAF50' : isSelected ? '#4CAF50' : '#E6ECE3',
                    marginBottom: 20,
                    padding: 24,
                    shadowColor: isActivePlan ? '#4CAF50' : '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isActivePlan ? 0.15 : 0.08,
                    shadowRadius: isActivePlan ? 12 : 8,
                    elevation: isActivePlan ? 6 : 3,
                    position: 'relative',
                  }}>
                    {/* Active Plan Badge - Highest Priority */}
                    {isActivePlan && (
                      <View style={{
                        position: 'absolute',
                        top: -8,
                        right: 16,
                        backgroundColor: '#4CAF50',
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 12,
                        zIndex: 3,
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#fff' }}>ACTIVE</Text>
                      </View>
                    )}

                    {/* Popular Badge - Only show if not active */}
                    {plan.popular && !isActivePlan && (
                      <View style={{
                        position: 'absolute',
                        top: -8,
                        right: 16,
                        backgroundColor: '#FF6B35',
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 12,
                        zIndex: 1,
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#fff' }}>POPULAR</Text>
                      </View>
                    )}

                    {/* Best Value Badge - Only show if not active */}
                    {plan.bestValue && !isActivePlan && (
                      <View style={{
                        position: 'absolute',
                        top: -8,
                        right: 16,
                        backgroundColor: '#4CAF50',
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 12,
                        zIndex: 1,
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#fff' }}>BEST VALUE</Text>
                      </View>
                    )}
                    {/* Plan Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: isActivePlan ? '#E8F5E8' : '#F8F9FA',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 16,
                      }}>
                        <Icon
                          name={isActivePlan ? "check" : "heart"}
                          size={24}
                          color={isActivePlan ? "#4CAF50" : "#666"}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 20,
                          fontWeight: 'bold',
                          color: isActivePlan ? '#4CAF50' : '#222',
                          marginBottom: 4
                        }}>
                          {plan.name}
                        </Text>
                        <Text style={{
                          fontSize: 14,
                          color: isActivePlan ? '#4CAF50' : '#666',
                          fontWeight: '600'
                        }}>
                          {isActivePlan ? 'Your Current Plan' : 'Health Plan'}
                        </Text>
                      </View>
                    </View>

                    {/* Price Section */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'flex-end',
                      marginBottom: 20,
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      backgroundColor: '#F8F9FA',
                      borderRadius: 12,
                    }}>
                      <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#222' }}>
                        {LocationService.getCurrencySymbol(plan.currency)}{plan.price.toLocaleString()}
                      </Text>
                      <Text style={{ fontSize: 18, color: '#666', marginBottom: 4, marginLeft: 4 }}>/month</Text>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: isActivePlan ? '#E8F5E8' : isSelected ? '#4CAF50' : '#F5F8F3',
                        borderRadius: 16,
                        paddingVertical: 16,
                        alignItems: 'center',
                        marginBottom: 20,
                        borderWidth: isActivePlan ? 2 : isSelected ? 0 : 1,
                        borderColor: isActivePlan ? '#4CAF50' : isSelected ? 'transparent' : '#E0E0E0',
                        shadowColor: isSelected ? '#4CAF50' : 'transparent',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isSelected ? 0.3 : 0,
                        shadowRadius: 8,
                        elevation: isSelected ? 4 : 0,
                      }}
                      onPress={() => !isActivePlan && setSelectedPlanId(plan.id)}
                      activeOpacity={isActivePlan ? 1 : 0.85}
                      disabled={isActivePlan}
                    >
                      <Text style={{
                        fontWeight: 'bold',
                        fontSize: 18,
                        color: isActivePlan ? '#4CAF50' : isSelected ? '#FFFFFF' : '#222'
                      }}>
                        {isActivePlan ? `Current Plan` : currentSubscription ? `Add ${plan.name} Sessions` : `Select ${plan.name}`}
                      </Text>
                    </TouchableOpacity>
                    {/* Session Details - Modern Grid */}
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 16 }}>What's Included</Text>

                      <View style={{
                        backgroundColor: '#F8F9FA',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 12,
                      }}>
                        {/* Text Sessions */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                          <View style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: '#E8F5E8',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                          }}>
                            <Icon name="message" size={16} color="#4CAF50" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, color: '#222', fontWeight: '600' }}>
                              {plan.textSessions} Text Sessions
                            </Text>
                            <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                              10 minutes each
                            </Text>
                          </View>
                        </View>

                        {/* Voice Calls */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                          <View style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: '#E8F5E8',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                          }}>
                            <Icon name="voice" size={16} color="#4CAF50" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, color: '#222', fontWeight: '600' }}>
                              {plan.voiceCalls} Voice Calls
                            </Text>
                            <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                              Audio consultations
                            </Text>
                          </View>
                        </View>

                        {/* Video Calls */}
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: '#E8F5E8',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                          }}>
                            <Icon name="video" size={16} color="#4CAF50" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, color: '#222', fontWeight: '600' }}>
                              {plan.videoCalls} Video Calls
                            </Text>
                            <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                              Face-to-face consultations
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Additional Features */}
                    {plan.features && plan.features.length > 0 && (
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 12 }}>Additional Benefits</Text>
                        <View style={{
                          backgroundColor: '#F8F9FA',
                          borderRadius: 12,
                          padding: 16,
                        }}>
                          {plan.features.map((feature: string, idx: number) => (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                              <View style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: '#4CAF50',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12,
                              }}>
                                <Icon name="check" size={12} color="#FFFFFF" />
                              </View>
                              <Text style={{ fontSize: 14, color: '#222', flex: 1 }}>{feature}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
          {/* Modern Bottom Action Button */}
          <View style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#FFFFFF',
            paddingTop: 20,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 20,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: selectedPlanId && !isPurchasing ? '#4CAF50' : '#E0E0E0',
                borderRadius: 16,
                paddingVertical: 18,
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: selectedPlanId ? '#4CAF50' : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: selectedPlanId ? 0.3 : 0,
                shadowRadius: 8,
                elevation: selectedPlanId ? 4 : 0,
                opacity: isPurchasing ? 0.7 : 1,
              }}
              disabled={!selectedPlanId || isPurchasing}
              onPress={() => {
                if (selectedPlan) handlePurchaseSubscription(selectedPlan);
              }}
            >
              {isPurchasing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 12 }} />
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
                    Processing...
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="shopping-cart" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
                    {currentSubscription ? 'Add Sessions' : 'Purchase Plan'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // --- Profile Button for Sidebar ---
  // Place this at the top of your main render, above the main content
  // You can adjust the placement as needed for your layout
  // Handle user not loaded yet or logged out
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={{ marginTop: 16, color: '#666' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar backgroundColor={isDarkMode ? '#151718' : '#fff'} barStyle={isDarkMode ? "light-content" : "dark-content"} />
      {/* Hide header for DocBot tab */}
      {activeTab !== 'docbot' && (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 4,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E0E0E0',
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

          {/* Header content based on active tab */}
          {activeTab === 'home' ? (
            <Image
              source={require('../assets/images/DA logo green.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          ) : activeTab === 'discover' ? (
            <View style={{ height: 60, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Find Doctors</Text>
            </View>
          ) : activeTab === 'messages' ? (
            <View style={{ height: 60, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Messages</Text>
            </View>
          ) : activeTab === 'blogs' ? (
            <View style={{ height: 60, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Blogs</Text>
            </View>
          ) : (
            <Image
              source={require('../assets/images/DA logo green.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          )}

          {/* Right side button - Bookmark for Discover, Notification for others */}
          {activeTab === 'discover' ? (
            <TouchableOpacity
              ref={tourTabRefs.current['discover-bookmark-btn']}
              style={styles.notificationButton}
              onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name={showFavoritesOnly ? 'bookmark' : 'bookmarkO'}
                size={20}
                color={showFavoritesOnly ? '#4CAF50' : '#CCC'}
              />
            </TouchableOpacity>
          ) : (
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
          )}
        </View>
      )}
      <View style={styles.mainContent}>
        {(() => {
          switch (activeTab) {
            case 'messages':
              return renderMessagesContent();
            case 'profile':
              return renderProfileContent();
            case 'discover':
              return renderDiscoverDoctorsContent();
            case 'appointments':
              return renderAppointmentsContent();
            case 'blogs':
              return <Blog hideBottomNav />;
            case 'docbot':
              return <DocBotChat onBottomHiddenChange={handleDocBotBottomHiddenChange} />;
            case 'home':
            default:
              return renderHomeContent();
          }
        })()}
      </View>

      <Animated.View
        style={[
          activeTab === 'docbot' && {
            transform: [{
              translateY: bottomNavAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 60],
                extrapolate: 'clamp',
              })
            }],
            opacity: bottomNavAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            })
          }
        ]}
      >
        <BottomNavigation
          tabRefs={tourTabRefs.current}
          tabs={[
            {
              icon: "home",
              label: "Home",
              isActive: activeTab === 'home',
              onPress: () => setActiveTab('home')
            },
            {
              icon: "search",
              label: "Discover",
              isActive: activeTab === 'discover',
              onPress: () => setActiveTab('discover')
            },
            {
              icon: "message",
              label: "Messages",
              isActive: activeTab === 'messages',
              onPress: () => setActiveTab('messages')
            },
            {
              icon: "file",
              label: "Blogs",
              isActive: activeTab === 'blogs',
              onPress: () => setActiveTab('blogs')
            },
            {
              icon: "userMd",
              label: "AI Doc",
              isActive: activeTab === 'docbot',
              onPress: () => setActiveTab('docbot')
            }
          ]}
        />
      </Animated.View>

      {showSubscriptions && renderSubscriptionsContent()}

      {/* Alert Dialog */}
      <AlertDialog
        visible={alertState.visible}
        onClose={hideAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttonText={alertState.buttonText}
      />

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        visible={showConfirm}
        onConfirm={confirmLogout}
        onCancel={() => setShowConfirm(false)}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        type="logout"
        confirmText="Logout"
        cancelText="Cancel"
      />

      {/* Chatbot Modal */}
      <ChatbotModal
        visible={showChatbot}
        onClose={() => setShowChatbot(false)}
      />

      {/* Payment Checkout Modal */}
      <CheckoutWebViewModal
        visible={showCheckoutModal}
        checkoutUrl={checkoutUrl}
        onClose={() => {
          setShowCheckoutModal(false);
          // Stop polling when manually closed
          if (paymentPollingRef.current) {
            clearInterval(paymentPollingRef.current);
            paymentPollingRef.current = null;
          }
        }}
        onPaymentDetected={() => {
          console.log('✅ Payment detected via navigation! Forcing poll...');
          // Trigger immediate poll
          pollPaymentStatus();
        }}
      />

      {/* Cache Management Modal */}
      <CacheManagementModal
        visible={showCacheManagement}
        onClose={() => setShowCacheManagement(false)}
      />

      {/* Emergency Modal */}
      <EmergencyModal
        visible={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
      />





      {sidebarVisible && (
        <View style={styles.sidebarOverlay}>
          <TouchableOpacity style={styles.sidebarOverlayTouchable} activeOpacity={1} onPress={closeSidebar} />
          <Animated.View
            style={[
              styles.sidebar,
              {
                backgroundColor: '#111214',
                width: 300,
                padding: 0,
                borderTopRightRadius: 6,
                borderBottomRightRadius: 6,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 4, height: 0 },
                shadowOpacity: 0.25,
                shadowRadius: 18,
                elevation: 10,
              },
              Platform.OS === 'web' ? {
                transform: [{ translateX: webSidebarTransform }]
              } : {
                transform: [
                  {
                    translateX: sidebarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-300, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            <ScrollView
              style={styles.sidebarScrollView}
              contentContainerStyle={[styles.sidebarContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, flexGrow: 1, paddingHorizontal: 0 }]}
              showsVerticalScrollIndicator={false}
              bounces={true}
              alwaysBounceVertical={false}
              scrollEnabled={true}
            >
              <View style={{ flexGrow: 1, backgroundColor: '#111214' }}>
                {/* Profile Section */}
                <View style={{
                  marginBottom: 24,
                  marginTop: 10,
                  paddingHorizontal: 20
                }}>
                  <View style={{
                    backgroundColor: '#1C1E22',
                    borderRadius: 6,
                    paddingHorizontal: 16,
                    paddingVertical: 20,
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}>
                    {user?.profile_picture_url ? (
                      <Image source={{ uri: user.profile_picture_url }} style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 12, borderWidth: 2, borderColor: '#B4FF3C' }} />
                    ) : user?.profile_picture ? (
                      <Image source={{ uri: user.profile_picture }} style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 12, borderWidth: 2, borderColor: '#B4FF3C' }} />
                    ) : (
                      <Image source={profileImage} style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 12, borderWidth: 2, borderColor: '#B4FF3C' }} />
                    )}
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#F2F2F2', fontSize: 18, fontWeight: '600', marginBottom: 4, textAlign: 'center', letterSpacing: 0.5 }}>
                        {userData?.first_name && userData?.last_name ? `${userData.first_name} ${userData.last_name}` : userData?.display_name || user?.display_name || 'Patient'}
                      </Text>
                      <Text style={{ color: '#A3A5A8', fontSize: 12, textAlign: 'center' }}>
                        Active Since: {userData?.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>


                {/* Menu Items */}
                <View style={{ gap: 8, paddingHorizontal: 16 }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: showSubscriptions ? '#1D1F23' : '#1A1C1F',
                      borderWidth: 1,
                      borderColor: showSubscriptions ? '#B4FF3C' : '#2A2D32',
                      borderLeftWidth: showSubscriptions ? 3 : 1,
                      borderLeftColor: showSubscriptions ? '#B4FF3C' : '#2A2D32',
                    }}
                    onPress={() => {
                      closeSidebar();
                      setShowSubscriptions(true);
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: showSubscriptions ? 'rgba(180, 255, 60, 0.15)' : '#222528', justifyContent: 'center', alignItems: 'center' }}>
                      <Icon name="heartbeat" size={18} color={showSubscriptions ? '#B4FF3C' : '#A8AAAE'} />
                    </View>
                    <Text style={{
                      marginLeft: 14,
                      fontSize: 14,
                      color: showSubscriptions ? '#F2F2F2' : '#E8E8E8',
                      fontWeight: showSubscriptions ? '600' : '500',
                      letterSpacing: 0.3
                    }}>
                      MyHealthPlans
                    </Text>
                    {showSubscriptions && <View style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: 4, backgroundColor: '#B4FF3C' }} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: '#1A1C1F',
                      borderWidth: 1,
                      borderColor: '#2A2D32',
                    }}
                    onPress={() => {
                      closeSidebar();
                      router.push('/patient-profile');
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#222528', justifyContent: 'center', alignItems: 'center' }}>
                      <Icon name="user" size={18} color="#A8AAAE" />
                    </View>
                    <Text style={{
                      marginLeft: 14,
                      fontSize: 14,
                      color: '#E8E8E8',
                      fontWeight: '500',
                      letterSpacing: 0.3
                    }}>
                      View Profile
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: '#1A1C1F',
                      borderWidth: 1,
                      borderColor: '#2A2D32',
                    }}
                    onPress={() => {
                      closeSidebar();
                      router.push('/edit-patient-profile');
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#222528', justifyContent: 'center', alignItems: 'center' }}>
                      <Icon name="edit" size={18} color="#A8AAAE" />
                    </View>
                    <Text style={{
                      marginLeft: 14,
                      fontSize: 14,
                      color: '#E8E8E8',
                      fontWeight: '500',
                      letterSpacing: 0.3
                    }}>
                      Edit Profile
                    </Text>
                  </TouchableOpacity>



                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: '#1A1C1F',
                      borderWidth: 1,
                      borderColor: '#2A2D32',
                    }}
                    onPress={() => {
                      closeSidebar();
                      router.push('/patient-settings');
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#222528', justifyContent: 'center', alignItems: 'center' }}>
                      <Icon name="cog" size={18} color="#A8AAAE" />
                    </View>
                    <Text style={{
                      marginLeft: 14,
                      fontSize: 14,
                      color: '#E8E8E8',
                      fontWeight: '500',
                      letterSpacing: 0.3
                    }}>
                      Settings
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Bottom Actions */}
                <View style={{ marginTop: 'auto', paddingTop: 20, borderTopWidth: 1, borderTopColor: '#222528', paddingHorizontal: 12, marginBottom: 20 }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 18,
                      borderRadius: 6,
                    }}
                    onPress={() => setShowConfirm(true)}
                  >
                    <Icon name="signOut" size={20} color="#FF3B30" />
                    <Text style={{ color: '#FF3B30', fontSize: 15, fontWeight: '500', marginLeft: 16 }}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      )}

      {/* Specialization Filter Modal */}
      <SpecializationFilterModal
        visible={showSpecializationModal}
        onClose={() => setShowSpecializationModal(false)}
        selectedSpecialization={selectedSpecialization}
        onSpecializationChange={setSelectedSpecialization}
        availableSpecializations={availableSpecializations}
      />

      {/* New Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={{
          showOnlyOnline,
          selectedSpecialization,
          sortBy
        }}
        onApplyFilters={(filters) => {
          setShowOnlyOnline(filters.showOnlyOnline);
          setSelectedSpecialization(filters.selectedSpecialization);
          setSortBy(filters.sortBy);
        }}
        availableSpecializations={availableSpecializations}
      />

      {/* Onboarding Overlay */}
      <OnboardingOverlay
        visible={showOnboarding}
        userType="patient"
        missingFields={missingFields}
        onComplete={() => {
          setShowOnboarding(false);
          router.push('/edit-patient-profile');
        }}
        onDismiss={() => {
          setShowOnboarding(false);
          setOnboardingDismissed(true);
        }}
      />

      {/* App Tour */}
      <AppTour
        visible={showAppTour && !showOnboarding}
        userType="patient"
        onComplete={() => {
          setShowAppTour(false);
        }}
        onSkip={() => {
          setShowAppTour(false);
        }}
        elementRefs={tourTabRefs.current}
        onTabChange={(tab) => {
          setActiveTab(tab);
        }}
        scrollViewRef={activeTab === 'discover' ? discoverScrollViewRef : undefined}
      />
    </SafeAreaView>
  );
}

// Create theme-aware styles function
const createStyles = (colors: ReturnType<typeof useThemedColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  mainContent: {
    flex: 1,
    maxWidth: maxWidth,
    alignSelf: 'center',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 80, // Space for bottom navigation
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? 40 : 20,
    // paddingTop: 20, // Removed to eliminate extra gap
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  subscriptionBanner: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subscriptionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  subscriptionDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: isLargeScreen ? 22 : 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  // Reuse doctor card look
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requestCardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  appointmentDateTime: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 4,
  },
  quickActions: {
    marginBottom: 30,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: isWeb ? 24 : 20,
    alignItems: 'center',
    shadowColor: colors.shadow,
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
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: isLargeScreen ? 16 : 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: isLargeScreen ? 14 : 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  recentActivity: {
    marginBottom: 30,
  },
  activityCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  activityDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: colors.white,
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
  appointmentDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  appointmentTime: {
    fontSize: 16,
    color: '#666',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  appointmentStatus: {
    alignSelf: 'flex-start',
  },
  statusConfirmed: {
    backgroundColor: '#34C759',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusPending: {
    backgroundColor: '#FF9500',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageList: {
    marginBottom: 30,
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
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
  messageAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageSender: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileSection: {
    marginBottom: 30,
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
  healthPlanCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    alignItems: 'center',
  },
  healthPlanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  healthPlanButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 28,
    alignSelf: 'center',
    marginTop: 8,
  },
  healthPlanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  menuSection: {
    marginBottom: 30,
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
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
  menuText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
    flex: 1,
  },
  logoutItem: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 20,
  },
  logoutText: {
    color: '#FF3B30',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4CAF50',
  },
  tabIcon: {
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  placeholderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  doctorsList: {
    marginBottom: 20,
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  doctorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  viewButton: {
    backgroundColor: '#E0F2E9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  viewButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  bookButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorSpecialization: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  doctorDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  doctorExperience: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  experienceText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  doctorLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  // Subscription styles
  currentPlanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPlanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 12,
  },
  currentPlanPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
  },
  currentPlanFeatures: {
    marginTop: 8,
  },
  currentPlanFeature: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  plansContainer: {
    marginBottom: 30,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  popularPlanCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  planFeatures: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  purchaseButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  currentPlanButton: {
    backgroundColor: '#E0E0E0',
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messagesHeader: {
    marginBottom: 30,
  },
  messagesTitle: {
    fontSize: isLargeScreen ? 22 : 20,
    fontWeight: 'bold',
    color: '#000',
  },
  messagesSubtitle: {
    fontSize: isLargeScreen ? 18 : 16,
    color: '#666',
  },
  chatList: {
    flex: 1,
  },
  chatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appointmentAvatar: {
    backgroundColor: '#FF9500',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    color: '#666',
  },
  chatPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatLastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  chatBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chatBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  unreadIndicator: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChatState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChatIcon: {
    marginBottom: 16,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  emptyChatSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  chatOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  chatWindowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    marginLeft: 8,
  },

  refreshButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 6,
  },
  refreshButtonTextDisabled: {
    color: '#CCC',
  },
  searchSortContainer: {
    marginBottom: 20,
  },
  sortContainer: {
    position: 'relative',
    marginTop: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sortButtonText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  resultsContainer: {
    marginBottom: 20,
  },
  resultsText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  appointmentDoctor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterButton: {
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.2,
  },
  filterButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // New Search and Filter Styles
  searchFilterContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  searchBarContainer: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    height: 56,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  sideButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent',
    marginLeft: 12,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  filterSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  onlineFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    gap: 6,
  },
  onlineFilterActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  onlineFilterText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  onlineFilterTextActive: {
    color: '#FFFFFF',
  },
  sortDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sortDropdownText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  specializationFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    gap: 6,
  },
  specializationFilterActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  specializationFilterText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  specializationFilterTextActive: {
    color: '#FFFFFF',
  },
  sortOptionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sortOptionActive: {
    backgroundColor: '#F8F9FA',
  },
  sortOptionText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  sortOptionTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  doctorsListNew: {
    flexDirection: 'column',
    gap: 2,
    marginBottom: 40,
    marginTop: -18,
    paddingHorizontal: 0,
  },
  doctorCardNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: -8,
    marginHorizontal: -9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  doctorInfoNew: {
    flex: 1,
    marginRight: 16,
  },
  doctorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  availableStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
  },
  doctorNameNew: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  doctorDescNew: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
  },
  viewProfileButton: {
    backgroundColor: '#E0F2E9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  viewProfileButtonText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 15,
  },
  doctorImageNew: {
    width: 90,
    height: 90,
    borderRadius: 45,
    resizeMode: 'cover',
    backgroundColor: '#E0F2E9',
  },
  renewButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  renewButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    bottom: 0,
    width: 300,
    backgroundColor: '#fff',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
  sidebarMenu: {
    flex: 1,
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
  profileButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  fabProfileButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  // Modern Sidebar Styles
  modernProfileSection: {
    alignItems: 'center',
    paddingBottom: 24,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modernProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  modernProfileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  viewProfileLink: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  modernMenuSection: {
    flex: 1,
    alignItems: 'center',
  },
  modernMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 4,
    width: '90%',
  },
  modernMenuText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 16,
    fontWeight: '400',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 10,
  },
  sectionGroup: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
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
  rowLabel: {
    fontSize: 16,
    color: '#222',
    flex: 1,
  },
  rowValue: {
    fontSize: 16,
    color: '#444',
  },
  chevron: {
    marginLeft: 10,
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
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 4,
  },
  // Remaining Sessions Section Styles
  remainingSessionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sessionsGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  remainingSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sessionInfo: {
  },
  // Error state styles
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sessionCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  sessionLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sessionProgress: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  progressBar: {
    width: 80,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  bottomNavDark: {
    backgroundColor: '#1A1A1A',
    borderTopColor: '#404040',
  },
  tabLabelDark: {
    color: '#BBBBBB',
  },
  headerLogo: {
    width: 140,
    height: 60,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: '#F8F9FA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  onlineToggleActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.2,
  },
  toggleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  toggleDotActive: {
    backgroundColor: '#FFFFFF',
  },
  onlineToggleText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  onlineToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  doctorImageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  appointmentType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  appointmentReason: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pendingNote: {
    fontSize: 12,
    color: '#FFA500',
    fontStyle: 'italic',
    marginTop: 4,
  },
  onlineText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
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
  hamburgerLine: {
    height: 2,
    backgroundColor: '#666',
    borderRadius: 1,
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
  // Active Filter Chips Styles
  activeFiltersContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  activeFiltersContent: {
    paddingRight: 20,
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 6,
  },
  activeFilterChipText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  removeFilterButton: {
    marginLeft: 4,
    padding: 2,
  },
  clearAllFiltersButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  clearAllFiltersText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
});


