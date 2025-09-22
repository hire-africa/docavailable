// Move all import statements to the top
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    AppState,
    BackHandler,
    Dimensions,
    Easing,
    Image,
    Linking,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon, { IconName } from '../components/Icon';

import AlertDialog from '../components/AlertDialog';
import CacheManagementModal from '../components/CacheManagementModal';
import ChatbotModal from '../components/ChatbotModal';
import ConfirmDialog from '../components/ConfirmDialog';
import DocBotChat from '../components/DocBotChat';
import DoctorProfilePicture from '../components/DoctorProfilePicture';
import { stripDoctorPrefix, withDoctorPrefix } from '../utils/name';

import { apiService } from './services/apiService';
import { APPOINTMENT_STATUS, appointmentService } from '../services/appointmentService';
import { EndedSessionMetadata, endedSessionStorageService } from '../services/endedSessionStorageService';


import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/hooks/useAlert';
import authService from '@/services/authService';
import { LocationInfo, LocationService } from '@/services/locationService';
import SpecializationFilterModal from '../components/SpecializationFilterModal';
import { Colors } from '../constants/Colors';
import { imageCacheService } from '../services/imageCacheService';
import { paymentsService } from '../services/paymentsService';
import Blog from './blog';
const profileImage = require('../assets/images/profile.jpg');

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
  const params = useLocalSearchParams<{ tab?: string; sessionId?: string }>();
  const [activeTab, setActiveTab] = useState('home');
  const [showConfirm, setShowConfirm] = useState(false);
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
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [pendingLogout, setPendingLogout] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [showCacheManagement, setShowCacheManagement] = useState(false);
  const [isDocBotBottomHidden, setIsDocBotBottomHidden] = useState(false);
  const bottomNavAnim = useRef(new Animated.Value(0)).current;
  const [pressedPill, setPressedPill] = useState<string | null>(null);

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
  const [activeTextSession, setActiveTextSession] = useState<any>(null);

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

  // Auto-refresh timer for time remaining display - updates every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update time remaining display
      setActiveTextSession((prev: any) => prev ? { ...prev } : null);
      
      // Also refresh appointments to get updated remaining time
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

  // Helper function to ensure appointments is always an array
  const getSafeAppointments = () => {
    return appointments || [];
  };

  // Check if appointment is ready for session
  const isAppointmentReadyForSession = (appointment: any) => {
    if (!appointment.date || !appointment.time) return false;
    
    const now = new Date();
                const [month, day, year] = (appointment.date || '').split('/').map(Number);
            const [hour, minute] = (appointment.time || '00:00').split(':').map(Number);
    const appointmentDate = new Date(year, month - 1, day, hour, minute);
    
    // Session is ready if appointment time has passed and status is confirmed
    return appointment.status === 'confirmed' && now >= appointmentDate;
  };

  // Get appointment session status
  const getAppointmentSessionStatus = (appointment: any) => {
    if (appointment.status !== 'confirmed') return 'pending';
    if (isAppointmentReadyForSession(appointment)) return 'ready';
    return 'scheduled';
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
          // // console.log('PatientDashboard: Fetched appointments:', appointmentsData);
          // // console.log('PatientDashboard: Appointment statuses:', appointmentsData.map(apt => ({ id: apt.id, status: apt.status, type: apt.appointment_type })));
          setAppointments(appointmentsData);
        })
        .catch(error => {
          console.error('PatientDashboard: Error fetching appointments:', error);
          setAppointments([]);
        });
    }
  }, [user]);

  useEffect(() => {
    if (user && user.id) { // Add user.id check to ensure user is fully loaded
      console.log('PatientDashboard: Loading subscription for user:', user.id);
      
      // Load user's current subscription from Laravel API
      apiService.get('/subscription')
        .then((response: any) => {
          console.log('PatientDashboard: Subscription API response:', response);
          
          if (response.success && response.data) {
            console.log('PatientDashboard: Setting subscription data:', response.data);
            setCurrentSubscription(response.data);
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
  // Initialize location-based subscription plans
  useEffect(() => {
    const initializeLocationTracking = async () => {
      if (!userData) {
        // Default to Malawi pricing if no user data
        const locationInfo = LocationService.getLocationInfo('Malawi');
        setCurrentLocationInfo(locationInfo);
        
        // Load plans from Laravel API instead of hardcoded plans
        try {
          const response = await apiService.get('/plans');
          if (response.success && (response as any).plans) {
            // Transform Laravel plan data to match SubscriptionPlan interface
            const transformedPlans = (response as any).plans.map((plan: any) => ({
              id: plan.id.toString(), // Convert to string to match interface
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
          // Handle invalid API response
          // console.log('PatientDashboard: Invalid plans API response');
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

      // Use registration location for pricing
      const locationInfo = LocationService.getLocationInfo(registrationCountry);
      setCurrentLocationInfo(locationInfo);
      
      // Load plans from Laravel API instead of hardcoded plans
      try {
        const response = await apiService.get('/plans');
        if (response.success && (response as any).plans) {
          // Transform Laravel plan data to match SubscriptionPlan interface
          const transformedPlans = (response as any).plans.map((plan: any) => ({
            id: plan.id.toString(), // Convert to string to match interface
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
          // Handle invalid API response
          // console.log('PatientDashboard: Invalid plans API response');
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
      setLoadingDoctors(true);
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
                    is_online: doctor.is_online || false,
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
              // Preload/cached profile pictures to avoid reloading on other pages
              try {
                const urlsToPreload = approvedDoctors
                  .map((d: any) => getImageUrlForCache(d.profile_picture_url || d.profile_picture))
                  .filter((u: any): u is string => typeof u === 'string' && u.length > 0);
                if (urlsToPreload.length > 0) {
                  imageCacheService.preloadImages(urlsToPreload).catch(() => {});
                }
              } catch {}
            } else {
              setDoctors([]);
            }
          } else {
            setDoctors([]);
          }
        })
        .catch((error) => {
          console.error('Error fetching doctors:', error);
          setDoctorsError('Failed to load doctors. Please check your connection and try again.');
          setDoctors([]);
        })
        .finally(() => setLoadingDoctors(false));

      // Fetch available specializations
      fetchSpecializations();
    }
  }, [activeTab]);

  // Load ended sessions when messages tab is active
  useEffect(() => {
    if (activeTab === 'messages' && user?.id) {
      loadEndedSessions();
    }
  }, [activeTab, user?.id]);

  // Auto-refresh mechanism for messages tab
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout | null = null;
    
    if (activeTab === 'messages' && user?.id) {
      // Initial load
      loadEndedSessions();
      
      // Set up periodic refresh every 30 seconds when messages tab is active
      refreshInterval = setInterval(() => {
        // console.log('🔄 Auto-refreshing messages tab...');
        loadEndedSessions();
        
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
      await loadEndedSessions().catch(err => console.error('Error refreshing ended sessions:', err));
      
      // Also refresh appointments
      const appointmentsData = await appointmentService.getAppointments().catch(err => {
        console.error('Error refreshing appointments:', err);
        return [];
      });
      // console.log('PatientDashboard: Manual refresh - Fetched appointments:', appointmentsData);
      setAppointments(appointmentsData);
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
              is_online: doctor.is_online || false,
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
      const { refreshUserData } = useAuth();
      await refreshUserData().catch(err => console.error('Error refreshing user data:', err));
    } catch (error) {
      console.error('PatientDashboard: Profile refresh - Error:', error);
    } finally {
      setRefreshingProfile(false);
    }
  };

  // Check for active text session and handle session parameter
  useEffect(() => {
    const checkActiveTextSession = async () => {
      try {
        // Check if there's a session parameter
        if (params.sessionId) {
          // console.log('PatientDashboard: Session ID from params:', params.sessionId);
          
          // Try to get appointment details from API
          try {
            const response = await apiService.get(`/appointments/${params.sessionId}`);
            if (response.success && response.data) {
              // Transform appointment data to match expected format
              const appointment = response.data;
              setActiveTextSession({
                id: appointment.id,
                appointment_id: appointment.id,
                doctor: appointment.doctor,
                patient: appointment.patient,
                status: appointment.status,
                remaining_time_minutes: (appointment as any).remaining_time_minutes ?? 0, // Use actual remaining time
                started_at: (appointment as any).created_at,
                last_activity_at: (appointment as any).updated_at
              });
              // console.log('PatientDashboard: Active appointment loaded:', appointment);
            }
          } catch (error) {
            console.error('Error loading appointment:', error);
            // Don't show error to user, just continue without session
          }
        } else {
          // First check for active text sessions (direct sessions)
          try {
            const textSessionResponse = await apiService.get('/text-sessions/active-sessions');
            if (textSessionResponse.success && textSessionResponse.data && (textSessionResponse.data as any).length > 0) {
              console.log('📱 Found active text session');
              const activeTextSession = (textSessionResponse.data as any)[0];
              setActiveTextSession({
                id: activeTextSession.id,
                appointment_id: activeTextSession.id, // Use session ID as appointment ID for compatibility
                doctor: activeTextSession.doctor,
                patient: activeTextSession.patient,
                status: activeTextSession.status,
                remaining_time_minutes: activeTextSession.remaining_time_minutes ?? 0, // Use actual remaining time
                started_at: activeTextSession.started_at,
                last_activity_at: activeTextSession.last_activity_at
              });
              // console.log('PatientDashboard: Active text session found:', activeTextSession);
              return; // Don't check appointments if we have an active text session
            }
          } catch (error) {
            console.error('Error checking active text sessions:', error);
            // Continue to check appointments if text session check fails
          }

          // Check for active appointments (confirmed appointments can be used for chat)
          try {
            const response = await apiService.get('/appointments');
            if (response.success && response.data) {
              // Handle paginated response - appointments are in response.data.data
              const appointments = (response.data as any).data || response.data;
              if (Array.isArray(appointments)) {
                // Find the most recent confirmed appointment
                const activeAppointment = appointments
                  .filter((appt: any) => appt.status === 'confirmed' || appt.status === 1)
                  .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                
                if (activeAppointment) {
                  setActiveTextSession({
                    id: activeAppointment.id,
                    appointment_id: activeAppointment.id,
                    doctor: activeAppointment.doctor,
                    patient: activeAppointment.patient,
                    status: activeAppointment.status,
                    remaining_time_minutes: (activeAppointment as any).remaining_time_minutes ?? 0,
                    started_at: (activeAppointment as any).created_at,
                    last_activity_at: (activeAppointment as any).updated_at
                  });
                  // console.log('PatientDashboard: Active appointment found:', activeAppointment);
                }
              }
            }
          } catch (error) {
            console.error('Error checking active appointments:', error);
            // Don't show error to user, just continue without session
          }
        }
      } catch (error) {
        console.error('Error in appointment check:', error);
        // Don't show error to user, just continue without session
      }
    };

    if (user) {
      checkActiveTextSession();
    }
  }, [user, params.sessionId]);

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

  if (!user) return null;

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

  const handlePurchaseSubscription = async (plan: SubscriptionPlan) => {
    try {
      setIsPurchasing(true);
      setSelectedPlanId(plan.id);
      console.log('Initiating payment for plan:', plan);
      // Initiate hosted checkout via backend
      const res = await paymentsService.initiatePlanPurchase(parseInt(plan.id));
      console.log('Payment API response:', res);
      if (res?.success && res.data?.checkout_url) {
        console.log('Navigating to checkout with URL:', res.data.checkout_url);
        console.log('Router object:', router);
        console.log('Navigation params:', {
          path: '/checkout',
          params: { url: res.data.checkout_url, tx_ref: res.data.reference }
        });
        
        try {
            // Navigate to checkout screen
            console.log('🔄 Attempting router.navigate to checkout...');
            console.log('🔄 URL being passed:', res.data.checkout_url);
            console.log('🔄 Reference being passed:', res.data.reference);
            
            router.push('/payments/checkout?url=' + encodeURIComponent(res.data.checkout_url) + '&tx_ref=' + encodeURIComponent(res.data.reference || ''));
            console.log('✅ Navigation command sent successfully');
          
          
          
        } catch (error) {
          console.error('❌ Navigation failed:', error);
          showError('Navigation Error', 'Failed to open payment page. Please try again.');
        }
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

  const getFilteredAndSortedDoctors = () => {
    let filteredDoctors = doctors;

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
  };

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

  const handleViewDoctorDetails = (doctor: any) => {
    router.push({ pathname: '/(tabs)/doctor-details/[uid]', params: { uid: doctor.id } });
  };

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

  // Emergency handler copied from help-support.tsx
  const handleEmergencyContact = () => {
    Alert.alert(
      'Emergency Contact',
      'For medical emergencies, please contact emergency services immediately:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Emergency Services',
          onPress: () => Linking.openURL('tel:998'),
          style: 'destructive',
        },
        {
          text: 'Ambulance',
          onPress: () => Linking.openURL('tel:997'),
          style: 'destructive',
        },
      ]
    );
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
            <View style={styles.cardsGrid}>
              <TouchableOpacity style={styles.patientCard} onPress={() => setActiveTab('discover')}>
                <Icon name="user" size={20} color="#4CAF50" />
                <ThemedText style={styles.actionTitle}>Find Doctor</ThemedText>
                <ThemedText style={styles.actionSubtitle}>Book an appointment</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.patientCard} onPress={() => router.push('/my-appointments')}>
                <Icon name="calendar" size={20} color="#4CAF50" />
                <ThemedText style={styles.actionTitle}>My Appointments</ThemedText>
                <ThemedText style={styles.actionSubtitle}>View scheduled visits</ThemedText>
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

              <TouchableOpacity style={styles.patientCard} onPress={handleEmergencyContact}>
                <Icon name="voice" size={20} color="#4CAF50" />
                <ThemedText style={styles.actionTitle}>Emergency Calls</ThemedText>
                <ThemedText style={styles.actionSubtitle}>Quick emergency access</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.patientCard} onPress={() => setShowSubscriptions(true)}>
                <Icon name="heart" size={20} color="#4CAF50" />
                <ThemedText style={styles.actionTitle}>My Health Plan</ThemedText>
                <ThemedText style={styles.actionSubtitle}>Manage your plan</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
          }}>
            <ThemedText style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#222',
              marginBottom: 16,
              textAlign: 'center'
            }}>Recent Activity</ThemedText>
            {(() => {
              const safeAppointments = getSafeAppointments();
              if (!safeAppointments || safeAppointments.length === 0) {
                return (
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
                    <ThemedText style={{
                      fontSize: 16,
                      color: '#666',
                      textAlign: 'center'
                    }}>No recent activity.</ThemedText>
                  </View>
                );
              }
              // Sort all appointments by most recent (cancelledAt, updatedAt, or createdAt)
              const sorted = [...safeAppointments].sort((a, b) => {
                const getDate = (appt: any) => new Date(appt.cancelledAt || appt.updatedAt || appt.createdAt || 0).getTime();
                return getDate(b) - getDate(a);
              });
              const appt = sorted[0];
              return (
                <View style={{
                  backgroundColor: '#F8F9FA',
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#E8F5E8',
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
                      backgroundColor: '#E8F5E8',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}>
                    {appt.status === APPOINTMENT_STATUS.PENDING && (
                        <Icon name="user" size={20} color="#4CAF50" />
                    )}
                    {appt.status === APPOINTMENT_STATUS.RESCHEDULE_PROPOSED && (
                        <Icon name="refresh" size={20} color="#FF9800" />
                    )}
                    {appt.status === APPOINTMENT_STATUS.CANCELLED && (
                        <Icon name="times" size={20} color="#F44336" />
                    )}
                                          {appt.status === APPOINTMENT_STATUS.CONFIRMED && (
                        <Icon name="check" size={20} color="#4CAF50" />
                      )}
                    {appt.status === APPOINTMENT_STATUS.COMPLETED && (
                        <Icon name="check" size={20} color="#4CAF50" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: '#222',
                        marginBottom: 2,
                      }}>
                      {appt.status === APPOINTMENT_STATUS.PENDING && `Offer sent to Dr. ${appt.doctorName || 'Unknown'}`}
                      {appt.status === APPOINTMENT_STATUS.RESCHEDULE_PROPOSED && `Reschedule offer from Dr. ${appt.doctorName || 'Unknown'}`}
                      {appt.status === APPOINTMENT_STATUS.CANCELLED && 'Appointment cancelled'}
                      {appt.status === APPOINTMENT_STATUS.CONFIRMED && `Appointment confirmed with Dr. ${appt.doctorName || 'Unknown'}`}
                      {appt.status === APPOINTMENT_STATUS.COMPLETED && `Appointment completed with Dr. ${appt.doctorName || 'Unknown'}`}
                    </ThemedText>
                      <ThemedText style={{
                        fontSize: 14,
                        color: '#666',
                      }}>
                      {appt.cancelledAt
                        ? new Date(appt.cancelledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : appt.updatedAt
                        ? new Date(appt.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : appt.createdAt
                        ? new Date(appt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </ThemedText>
                  </View>
                  </View>
                  {appt.cancellationReason && (
                    <Text style={{
                      fontSize: 14,
                      color: '#666',
                      fontStyle: 'italic',
                      paddingLeft: 52,
                    }}>
                      Reason: {appt.cancellationReason}
                  </Text>
                  )}
                </View>
              );
            })()}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderMessagesContent = () => (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingBottom: 20, 
        paddingHorizontal: 20, 
        paddingTop: 8,
        backgroundColor: '#F8F9FA' 
      }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#222' }}>Messages</Text>
        </View>
        <TouchableOpacity 
          onPress={refreshMessagesTab}
          disabled={refreshingMessages}
          style={{ 
            padding: 14, 
            borderRadius: 16, 
            backgroundColor: refreshingMessages ? '#E0E0E0' : '#4CAF50',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <Icon 
            name={refreshingMessages ? 'spinner' : 'refresh'} 
            size={22} 
            color={refreshingMessages ? '#999' : '#FFFFFF'} 
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#FFFFFF', 
        borderRadius: 20, 
        marginHorizontal: 20, 
        marginBottom: 24, 
        paddingHorizontal: 18, 
        height: 52,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#E8F5E8',
      }}>
        <Icon name="search" size={22} color="#4CAF50" />
        <TextInput
          style={{ flex: 1, fontSize: 17, color: '#666', backgroundColor: 'transparent', marginLeft: 14 }}
          placeholder="Search conversations..."
          placeholderTextColor="#999"
          value={messageSearchQuery}
          onChangeText={setMessageSearchQuery}
        />
        {messageSearchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setMessageSearchQuery('')} style={{ marginLeft: 10 }}>
            <Icon name="times" size={22} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Active Text Session */}
      {activeTextSession && (
        <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ 
            fontWeight: 'bold', 
            fontSize: 18, 
            color: '#4CAF50', 
            marginBottom: 16, 
            marginLeft: 4 
          }}>Active Session</Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 5,
              borderWidth: 2,
              borderColor: '#4CAF50'
            }}
            onPress={() => {
              // Navigate to chat using text session ID with proper prefix
              const chatId = `text_session_${activeTextSession.appointment_id}`;
              router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: chatId } });
            }}
          >
            {activeTextSession.doctor?.profile_picture_url ? (
              <Image source={{ uri: activeTextSession.doctor.profile_picture_url }} style={{ width: 60, height: 60, borderRadius: 30, marginRight: 16 }} />
            ) : activeTextSession.doctor?.profile_picture ? (
              <Image source={{ uri: activeTextSession.doctor.profile_picture }} style={{ width: 60, height: 60, borderRadius: 30, marginRight: 16 }} />
            ) : (
              <View style={{ 
                width: 60, 
                height: 60, 
                borderRadius: 30, 
                backgroundColor: '#E8F5E8', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginRight: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}>
                <Icon name="user" size={26} color="#4CAF50" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 6 }}>
                Dr. {activeTextSession.doctor?.first_name} {activeTextSession.doctor?.last_name}
              </Text>
              <Text style={{ fontSize: 15, color: '#4CAF50', fontWeight: '600' }}>
                Text Session • {activeTextSession.remaining_time_minutes} min remaining
              </Text>
            </View>
            <View style={{ 
              width: 44, 
              height: 44, 
              borderRadius: 22, 
              backgroundColor: '#E8F5E8', 
              alignItems: 'center', 
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <Icon name="chevronRight" size={22} color="#4CAF50" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Recent Label */}
      <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#222', marginLeft: 24, marginBottom: 10 }}>Recent</Text>

      {/* Combined Chat List - Active Appointments and Ended Sessions */}
      <ScrollView 
        style={{ flex: 1 }} 
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
          // Get active appointments
          const activeAppointments = getSafeAppointments()
            .filter(appt => 
              (['pending', 'confirmed'].includes(appt.status || '')) && (
                !messageSearchQuery || 
                (appt.doctorName || '')?.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
                (appt.reason || '')?.toLowerCase().includes(messageSearchQuery.toLowerCase())
              )
            )
            .map(appt => ({
              ...appt,
              type: 'active',
              sortDate: (() => {
                if (appt.updatedAt) return new Date(appt.updatedAt).getTime();
                if (appt.createdAt) return new Date(appt.createdAt).getTime();
                if (appt.date && appt.time && typeof appt.date === 'string' && typeof appt.time === 'string') {
                  try {
                    const [month, day, year] = (appt.date || '').split('/').map(Number);
                    const [hour, minute] = (appt.time || '').split(':').map(Number);
                    return new Date(year, month - 1, day, hour, minute).getTime();
                  } catch {
                    return 0;
                  }
                }
                return 0;
              })()
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
              sortDate: session.ended_at ? new Date(session.ended_at).getTime() : 0
            }));

          // Combine and sort by date (most recent first)
          const combinedList = [...activeAppointments, ...filteredEndedSessions]
            .sort((a, b) => b.sortDate - a.sortDate);

          return combinedList.map((item) => {
            if (item.type === 'active') {
              // Render active appointment
              return (
                <TouchableOpacity
                  key={`active_${item.id}`}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, marginBottom: 2 }}
                  onPress={() => {
                    router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: item.id } });
                  }}
                >
                  <DoctorProfilePicture
                    profilePictureUrl={item.doctor?.profile_picture_url}
                    size={56}
                    style={{ marginRight: 18 }}
                    name={item.doctorName}
                  />
                  <View style={{ flex: 1, borderBottomWidth: 0, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#222', marginBottom: 2 }} numberOfLines={1}>
                      {String(item.reason) || 'Chat'}
                    </Text>
                    <Text style={{ fontSize: 16, color: '#4CAF50' }} numberOfLines={1}>
                      {String(item.doctorName)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Text style={{ fontSize: 14, color: '#666', marginRight: 8 }}>
                        {item.consultationType === 'text' ? 'Text Chat' : 
                         item.consultationType === 'voice' ? 'Voice Call' : 
                         item.consultationType === 'video' ? 'Video Call' : 'Chat'}
                      </Text>
                      {getAppointmentSessionStatus(item) === 'ready' && (
                        <View style={{ backgroundColor: '#4CAF50', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ fontSize: 12, color: 'white', fontWeight: '600' }}>Ready</Text>
                        </View>
                      )}
                      {getAppointmentSessionStatus(item) === 'scheduled' && (
                        <View style={{ backgroundColor: '#FF9800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ fontSize: 12, color: 'white', fontWeight: '600' }}>Scheduled</Text>
                        </View>
                      )}
                      {getAppointmentSessionStatus(item) === 'pending' && (
                        <View style={{ backgroundColor: '#999', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ fontSize: 12, color: 'white', fontWeight: '600' }}>Pending</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            } else {
              // Render ended session
              return (
                <View key={`ended_${item.appointmentId}`} style={{ position: 'relative' }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, marginBottom: 2 }}
                    onPress={() => {
                      router.push({ pathname: '/ended-session/[appointmentId]', params: { appointmentId: item.appointmentId.toString() } });
                    }}
                  >
                    <DoctorProfilePicture
                      profilePictureUrl={item.doctor_profile_picture_url || item.doctor_profile_picture}
                      size={56}
                      style={{ marginRight: 18 }}
                      name={stripDoctorPrefix(item.doctor_name || 'Doctor')}
                    />
                    <View style={{ flex: 1, borderBottomWidth: 0, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#222', marginBottom: 2 }} numberOfLines={1}>
                        {item.reason || 'General Checkup'}
                      </Text>
                      <Text style={{ fontSize: 16, color: '#222' }} numberOfLines={1}>
                        {withDoctorPrefix(item.doctor_name || 'Unknown')}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Text style={{ fontSize: 14, color: '#4CAF50', marginRight: 8 }}>
                          {item.appointment_date ? new Date(item.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown date'} • {formatDuration(item.session_duration || 0)}
                        </Text>
                        <View style={{ backgroundColor: '#4CAF50', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ fontSize: 12, color: 'white', fontWeight: '600' }}>Ended</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  {/* 3-dot menu button */}
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 20,
                      top: 12,
                      padding: 8,
                      zIndex: 1,
                    }}
                    onPress={() => setShowEndedSessionMenu(showEndedSessionMenu === item.appointmentId ? null : item.appointmentId)}
                  >
                    <Icon name="more" size={20} color="#666" />
                  </TouchableOpacity>
                  
                  {/* Menu dropdown */}
                  {showEndedSessionMenu === item.appointmentId && (
                    <View style={{
                      position: 'absolute',
                      right: 20,
                      top: 40,
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
        {loadingEndedSessions && (
          <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 20 }}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Loading ended sessions...</Text>
          </View>
        )}

        {/* Empty State */}
        {(() => {
          const activeAppointments = getSafeAppointments().filter(appt => ['pending', 'confirmed'].includes(appt.status || ''));
          const hasActiveAppointments = activeAppointments.length > 0;
          const hasEndedSessions = endedSessions.length > 0;
          const hasSearchResults = messageSearchQuery && (activeAppointments.length > 0 || endedSessions.length > 0);

          if (!hasActiveAppointments && !hasEndedSessions && !messageSearchQuery) {
            return (
              <View style={{ alignItems: 'center', marginTop: 60 }}>
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
              <View style={{ alignItems: 'center', marginTop: 60 }}>
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
      style={{...styles.content, backgroundColor: '#F8F9FA'}} 
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
      <View style={{alignItems: 'center', marginBottom: 18}}>
        {user?.profile_picture_url ? (
          <Image source={{ uri: user.profile_picture_url }} style={{width: 96, height: 96, borderRadius: 48, backgroundColor: '#F0F8FF', marginBottom: 10}} />
        ) : user?.profile_picture ? (
          <Image source={{ uri: user.profile_picture }} style={{width: 96, height: 96, borderRadius: 48, backgroundColor: '#F0F8FF', marginBottom: 10}} />
        ) : (
          <Image source={profileImage} style={{width: 96, height: 96, borderRadius: 48, backgroundColor: '#F0F8FF', marginBottom: 10}} />
        )}
        <Text style={{fontSize: 22, fontWeight: 'bold', color: '#222', textAlign: 'center'}}>{user?.display_name || (user?.email && user.email.split('@')[0]) || 'Patient'}</Text>
      </View>

      {/* Account Section */}
      <Text style={{fontSize: 17, fontWeight: 'bold', color: '#222', marginTop: 18, marginBottom: 8, marginLeft: 18}}>Account</Text>
      <View style={{backgroundColor: 'transparent', marginBottom: 8, paddingHorizontal: 8}}>
        <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}}>
          <Icon name="email" size={20} color="#666" />
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>Email</Text>
          <Text style={{color: '#4CAF50', fontSize: 15, textAlign: 'right', flex: 1.2}}>{user?.email || 'Not provided'}</Text>
          </View>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => { setShowSubscriptions(true); setActiveTab('home'); }}>
          <Icon name="heart" size={20} color="#666" />
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>My Health Plan</Text>
          <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
        </View>

      {/* Settings Section */}
      <Text style={{fontSize: 17, fontWeight: 'bold', color: '#222', marginTop: 18, marginBottom: 8, marginLeft: 18}}>Settings</Text>
      <View style={{backgroundColor: 'transparent', marginBottom: 8, paddingHorizontal: 8}}>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => router.push('/patient-profile')}>
          <Icon name="user" size={20} color="#666" />
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>View Profile</Text>
          <Icon name="chevronRight" size={20} color="#666" />
          </TouchableOpacity>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => router.push('/edit-patient-profile')}>
          <Icon name="user" size={20} color="#666" />
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>Edit Profile</Text>
          <Icon name="chevronRight" size={20} color="#666" />
          </TouchableOpacity>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => router.push('/privacy-settings')}>
          <Icon name="eye" size={20} color="#666" />
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>Privacy Settings</Text>
          <Icon name="chevronRight" size={20} color="#666" />
          </TouchableOpacity>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => router.push('/notifications-settings')}>
          <Icon name="bell" size={20} color="#666" />
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>Notifications</Text>
          <Icon name="chevronRight" size={20} color="#666" />
          </TouchableOpacity>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => router.push('/help-support')}>
          <Icon name="questionCircle" size={20} color="#666" />
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>Help & Support</Text>
          <Icon name="chevronRight" size={20} color="#666" />
          </TouchableOpacity>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => router.push('/network-test')}>
          <Icon name="wifi" size={20} color="#666" />
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>Network Test</Text>
          <Icon name="chevronRight" size={20} color="#666" />
          </TouchableOpacity>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6B6B', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => router.push('/test-webview')}>
          <Icon name="globe" size={20} color="#fff" />
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#fff', flex: 1}}>🧪 Test WebView Module</Text>
          <Icon name="chevronRight" size={20} color="#fff" />
          </TouchableOpacity>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}} onPress={() => setShowCacheManagement(true)}>
          <Icon name="image" size={20} color="#666" />
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}}>Image Cache</Text>
          <Icon name="chevronRight" size={20} color="#666" />
          </TouchableOpacity>
        </View>

      {/* Logout */}
      <TouchableOpacity style={[{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}, {marginTop: 20}]} onPress={handleLogout}>
        <Icon name="signOut" size={20} color="#666" />
        <Text style={[{fontWeight: 'bold', fontSize: 16, color: '#222', flex: 1}, {color: '#FF3B30'}]}>Logout</Text>
        <Icon name="chevronRight" size={20} color="#666" />
        </TouchableOpacity>
    </ScrollView>
  );

  const renderDiscoverDoctorsContent = () => (
    <ScrollView 
      style={styles.content} 
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
        <Text style={styles.welcomeText}>Find Doctors</Text>
      </View>
      
      {/* Search Bar */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#FFFFFF', 
        borderRadius: 20, 
        marginHorizontal: 20, 
        marginBottom: 24, 
        paddingHorizontal: 18, 
        height: 52,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#E8F5E8',
      }}>
        <Icon name="search" size={22} color="#4CAF50" />
        <TextInput
          style={{ flex: 1, fontSize: 17, color: '#666', backgroundColor: 'transparent', marginLeft: 14 }}
          placeholder="Search doctors by name or specialization..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginLeft: 10 }}>
            <Icon name="times" size={22} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Pills */}
      <View style={styles.filterPillsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScrollContent}
        >
          <Pressable 
            style={({ pressed }) => [
              styles.filterPill, 
              showOnlyOnline && styles.filterPillActive,
              pressed && styles.filterPillPressed
            ]}
            onPress={() => setShowOnlyOnline(!showOnlyOnline)}
            onPressIn={() => setPressedPill('online')}
            onPressOut={() => setPressedPill(null)}
          >
            <Text style={[styles.filterPillText, showOnlyOnline && styles.filterPillTextActive]}>
              Online Only
            </Text>
          </Pressable>
          <Pressable 
            style={({ pressed }) => [
              styles.filterPill, 
              sortBy === 'name' && styles.filterPillActive,
              pressed && styles.filterPillPressed
            ]}
            onPress={() => setSortBy('name')}
            onPressIn={() => setPressedPill('name')}
            onPressOut={() => setPressedPill(null)}
          >
            <Text style={[styles.filterPillText, sortBy === 'name' && styles.filterPillTextActive]}>
              Name
            </Text>
          </Pressable>
          <Pressable 
            style={({ pressed }) => [
              styles.filterPill, 
              sortBy === 'rating' && styles.filterPillActive,
              pressed && styles.filterPillPressed
            ]}
            onPress={() => setSortBy('rating')}
            onPressIn={() => setPressedPill('rating')}
            onPressOut={() => setPressedPill(null)}
          >
            <Text style={[styles.filterPillText, sortBy === 'rating' && styles.filterPillTextActive]}>
              Rating
            </Text>
          </Pressable>
          <Pressable 
            style={({ pressed }) => [
              styles.filterPill, 
              sortBy === 'experience' && styles.filterPillActive,
              pressed && styles.filterPillPressed
            ]}
            onPress={() => setSortBy('experience')}
            onPressIn={() => setPressedPill('experience')}
            onPressOut={() => setPressedPill(null)}
          >
            <Text style={[styles.filterPillText, sortBy === 'experience' && styles.filterPillTextActive]}>
              Experience
            </Text>
          </Pressable>
          <Pressable 
            style={({ pressed }) => [
              styles.filterPill, 
              selectedSpecialization && styles.filterPillActive,
              pressed && styles.filterPillPressed
            ]}
            onPress={() => setShowSpecializationModal(true)}
            onPressIn={() => setPressedPill('specialization')}
            onPressOut={() => setPressedPill(null)}
          >
            <Text style={[styles.filterPillText, selectedSpecialization && styles.filterPillTextActive]}>
              {selectedSpecialization || 'Specialization'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Doctors List */}
      <View style={styles.doctorsListNew}>
        {loadingDoctors ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
            <Text style={styles.loadingText}>Loading doctors...</Text>
          </View>
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
        ) : getFilteredAndSortedDoctors().length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>No doctors found</Text>
            <Text style={styles.noResultsSubtext}>
              {searchQuery ? 'Try adjusting your search criteria' : 'Check back later for available doctors'}
            </Text>
          </View>
        ) : (
          getFilteredAndSortedDoctors().map((doctor) => (
            <View key={doctor.id} style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 4,
              borderWidth: 1,
              borderColor: '#F0F0F0',
              alignSelf: 'stretch',
            }}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#4CAF50',
                    backgroundColor: '#E8F5E8',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    marginRight: 8,
                  }}>{doctor.country || 'Available'}</Text>
                  {doctor.is_online && (
                    <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#4CAF50',
                      marginLeft: 4,
                    }} />
                  )}
                </View>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: '#222',
                  marginBottom: 6,
                }}>
                  {`Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Dr. Unknown'}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#666',
                  marginBottom: 8,
                  lineHeight: 20,
                }}>
                  {(() => {
                    let specializationText = '';
                    if (doctor.specializations && Array.isArray(doctor.specializations) && doctor.specializations.length > 0) {
                      specializationText = doctor.specializations.join(', ');
                    } else {
                      specializationText = doctor.specialization || 'General Medicine';
                    }
                    return `${specializationText} with ${doctor.years_of_experience || 0}+ years of experience`;
                  })()}
                </Text>
                
                {doctor.languages_spoken && doctor.languages_spoken.length > 0 && (
                  <Text style={{
                    fontSize: 12,
                    color: '#888',
                    marginBottom: 12,
                    fontStyle: 'italic',
                  }}>
                    Languages: {doctor.languages_spoken.join(', ')}
                  </Text>
                )}
                <TouchableOpacity 
                  style={{
                    backgroundColor: '#4CAF50',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignSelf: 'flex-start',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                  onPress={() => handleViewDoctorDetails(doctor)}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 'bold',
                  }}>View Profile</Text>
                </TouchableOpacity>
              </View>
              <View style={{ position: 'relative' }}>
                <DoctorProfilePicture
                  profilePictureUrl={doctor.profile_picture_url}
                  profilePicture={doctor.profile_picture}
                  size={90}
                  style={{
                    borderRadius: 45,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                  name={stripDoctorPrefix(((doctor as any).name || `${(doctor as any).first_name || ''} ${(doctor as any).last_name || ''}`.trim() || 'Doctor'))}
                />
                {/* Green dot for online doctors */}
                {doctor.is_online && (
                  <View style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: '#4CAF50',
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }} />
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  // Helper to get status badge information
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return { color: '#FFA500', text: 'Pending', icon: 'clock' };
      case 'confirmed':
        return { color: '#4CAF50', text: 'Confirmed', icon: 'check' };
      case 'cancelled':
        return { color: '#F44336', text: 'Cancelled', icon: 'times' };
      case 'completed':
        return { color: '#2196F3', text: 'Completed', icon: 'check-square-o' };
      default:
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
  const getStatusColor = (status: string) => {
    return getStatusBadge(status).color;
  };

  // Helper to get status text
  const getStatusText = (status: string) => {
    return getStatusBadge(status).text;
  };

  // Helper to get status icon
  const getStatusIcon = (status: string) => {
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
          return 'Invalid Date';
        }
        
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      } catch {
        return 'Invalid Date';
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
              {appt.reason ? (
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
                padding: 12,
                backgroundColor: '#F8F9FA',
                zIndex: 10,
                position: 'relative',
                minHeight: 52,
              }}
            >
              {/* Profile Icon (always left) */}
              <TouchableOpacity style={styles.profileButton} onPress={openSidebar}>
                <Icon name="user" size={20} color="#666" />
              </TouchableOpacity>

              {/* Centered DocAvailable text (for Blogs, Messages, Discover) */}
              {['blogs', 'messages', 'discover'].includes(activeTab) && (
                <Text
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: 'bold',
                    color: '#222',
                    top: 12,
                  }}
                >
                  DocAvailable
                </Text>
              )}

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
    const activePlan = currentSubscription ? subscriptionPlans.find(plan => plan.id === currentSubscription.plan_id) : null;
  return (
      <View style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#FAFCF7',
        zIndex: 999,
        paddingTop: 40,
      }}>
        {/* Back button and title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => setShowSubscriptions(false)} style={{ position: 'absolute', left: 16, top: 0, padding: 4 }}>
            <Icon name="arrowLeft" size={20} color="#666" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', textAlign: 'center' }}>
            {currentSubscription ? 'Add Sessions' : 'Subscription'}
          </Text>
        </View>
        <ScrollView 
          style={{ flex: 1, paddingHorizontal: 12 }} 
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
          {/* Active Plan Card */}
          {activePlan && (
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              borderWidth: 2,
              borderColor: '#4CAF50',
              marginBottom: 24,
              padding: 20,
              shadowColor: '#000',
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 2,
            }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 4 }}>{activePlan.name} (Active)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 18 }}>
                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#222' }}>mk{activePlan.price}</Text>
                <Text style={{ fontSize: 18, color: '#222', marginBottom: 2 }}>/month</Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: '#4CAF50',
                  borderRadius: 24,
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginBottom: 18,
                  opacity: isPurchasing ? 0.7 : 1,
                }}
                onPress={() => handlePurchaseSubscription(activePlan)}
                activeOpacity={0.85}
                disabled={isPurchasing}
              >
                {isPurchasing ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#fff' }}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#fff' }}>Renew</Text>
                )}
              </TouchableOpacity>
              {/* Session Details */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 }}>Your plan includes:</Text>
                
                {/* Text Sessions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Icon name="message" size={20} color="#666" />
                  <Text style={{ fontSize: 15, color: '#222', flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontWeight: '600' }}>{activePlan.textSessions}</Text> Text Sessions
                  </Text>
                </View>
                
                {/* Voice Calls */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Icon name="voice" size={20} color="#666" />
                  <Text style={{ fontSize: 15, color: '#222', flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontWeight: '600' }}>{activePlan.voiceCalls}</Text> Voice Calls
                  </Text>
                </View>
                
                {/* Video Calls */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Icon name="video" size={20} color="#666" />
                  <Text style={{ fontSize: 15, color: '#222', flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontWeight: '600' }}>{activePlan.videoCalls}</Text> Video Calls
                  </Text>
                </View>
              </View>
              
              {/* Additional Features */}
              {activePlan.features && activePlan.features.length > 0 && (
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 }}>Additional benefits:</Text>
                  {activePlan.features.map((feature: string, idx: number) => (
                                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Icon name="check" size={20} color="#666" />
                        <Text style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>{feature}</Text>
                      </View>
                  ))}
                </View>
              )}
            </View>
          )}
          {/* Location Indicator */}
          {currentLocationInfo && (
            <View style={{
              backgroundColor: '#F0F8FF',
              borderRadius: 12,
              padding: 12,
              marginBottom: 18,
              borderLeftWidth: 4,
              borderLeftColor: (currentLocationInfo as any).source === 'gps' ? '#4CAF50' : '#FF9800'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                {(currentLocationInfo as any).source === 'gps' ? 
                  <Icon name="mapMarker" size={20} color="#666" /> : 
                  <Icon name="user" size={20} color="#666" />
                }
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: 'bold', 
                  color: '#333', 
                  marginLeft: 8 
                }}>
                  {LocationService.getLocationSourceDescription((currentLocationInfo as any).source)}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: '#666', marginLeft: 24 }}>
                {(currentLocationInfo as any).country} • {(currentLocationInfo as any).currency}
              </Text>
              <TouchableOpacity 
                style={{
                  backgroundColor: '#4CAF50',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  alignSelf: 'flex-start',
                  marginTop: 8
                }}
                onPress={requestLocationPermission}
              >
                <Text style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }}>
                  Location Info
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#222', marginTop: 10, marginBottom: 18 }}>
            {currentSubscription ? 'Add More Sessions' : 'Choose a plan'}
          </Text>
          
          {currentSubscription && (
            <View style={styles.currentPlanCard}>
              <View style={styles.currentPlanHeader}>
                <Icon name="check" size={24} color="#4CAF50" />
                <Text style={styles.currentPlanTitle}>Current Plan: {currentSubscription.planName}</Text>
              </View>
              <Text style={styles.currentPlanPrice}>
                {LocationService.getCurrencySymbol(currentSubscription.plan_currency)}{currentSubscription.plan_price.toLocaleString()}/month
              </Text>
              <View style={styles.currentPlanFeatures}>
                <Text style={styles.currentPlanFeature}>
                  Text Sessions: {currentSubscription.textSessionsRemaining} remaining
                </Text>
                <Text style={styles.currentPlanFeature}>
                  Voice Calls: {currentSubscription.voiceCallsRemaining} remaining
                </Text>
                <Text style={styles.currentPlanFeature}>
                  Video Calls: {currentSubscription.videoCallsRemaining} remaining
                </Text>
                {currentSubscription.expiresAt && (
                  <Text style={styles.currentPlanFeature}>
                    Expires: {new Date(currentSubscription.expiresAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          )}
          
          {currentSubscription && (
            <Text style={{ fontSize: 16, color: '#666', marginBottom: 18, textAlign: 'center', paddingHorizontal: 20 }}>
              Select a plan below to add more sessions to your existing subscription.
            </Text>
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
                backgroundColor: isActivePlan ? '#F8FFF8' : '#fff',
                borderRadius: 16,
                borderWidth: 2,
                borderColor: isActivePlan ? '#4CAF50' : isSelected ? '#4CAF50' : '#E6ECE3',
                marginBottom: 18,
                padding: 20,
                shadowColor: '#000',
                shadowOpacity: isActivePlan ? 0.08 : 0.03,
                shadowRadius: isActivePlan ? 6 : 4,
                elevation: isActivePlan ? 3 : 1,
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
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  color: isActivePlan ? '#4CAF50' : '#222', 
                  marginBottom: 4 
                }}>
                  {plan.name}
                  {isActivePlan && ' ✓'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 18 }}>
                  <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#222' }}>{LocationService.getCurrencySymbol(plan.currency)}{plan.price.toLocaleString()}</Text>
                  <Text style={{ fontSize: 18, color: '#222', marginBottom: 2 }}>/month</Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: isActivePlan ? '#E8F5E8' : isSelected ? '#EAF4EC' : '#F5F8F3',
                    borderRadius: 24,
                    paddingVertical: 12,
                    alignItems: 'center',
                    marginBottom: 18,
                    borderWidth: isActivePlan ? 1 : 0,
                    borderColor: isActivePlan ? '#4CAF50' : 'transparent',
                  }}
                  onPress={() => !isActivePlan && setSelectedPlanId(plan.id)}
                  activeOpacity={isActivePlan ? 1 : 0.85}
                  disabled={isActivePlan}
                >
                  <Text style={{ 
                    fontWeight: 'bold', 
                    fontSize: 17, 
                    color: isActivePlan ? '#4CAF50' : '#222' 
                  }}>
                    {isActivePlan ? `Current Plan` : currentSubscription ? `Add ${plan.name} Sessions` : `Select ${plan.name}`}
                  </Text>
                </TouchableOpacity>
                {/* Session Details */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 }}>What's included:</Text>
                  
                  {/* Text Sessions */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Icon name="message" size={20} color="#4CAF50" />
                    <Text style={{ fontSize: 15, color: '#222', flex: 1, marginLeft: 8 }}>
                      <Text style={{ fontWeight: '600' }}>{plan.textSessions}</Text> Text Sessions
                    </Text>
                  </View>
                  
                  {/* Voice Calls */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Icon name="voice" size={20} color="#4CAF50" />
                    <Text style={{ fontSize: 15, color: '#222', flex: 1, marginLeft: 8 }}>
                      <Text style={{ fontWeight: '600' }}>{plan.voiceCalls}</Text> Voice Calls
                    </Text>
                  </View>
                  
                  {/* Video Calls */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Icon name="video" size={20} color="#4CAF50" />
                    <Text style={{ fontSize: 15, color: '#222', flex: 1, marginLeft: 8 }}>
                      <Text style={{ fontWeight: '600' }}>{plan.videoCalls}</Text> Video Calls
                    </Text>
                  </View>
                </View>
                
                {/* Additional Features */}
                {plan.features && plan.features.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 }}>Additional benefits:</Text>
                    {plan.features.map((feature: string, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Icon name="check" size={20} color="#4CAF50" />
                        <Text style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
        {/* Continue Button */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity
            style={{
              backgroundColor: selectedPlanId && !isPurchasing ? '#4CAF50' : '#B7EFC5',
              borderRadius: 32,
              paddingVertical: 16,
              width: '90%',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 6,
              elevation: 2,
              opacity: isPurchasing ? 0.7 : 1,
            }}
            disabled={!selectedPlanId || isPurchasing}
            onPress={() => {
              if (selectedPlan) handlePurchaseSubscription(selectedPlan);
            }}
          >
            {isPurchasing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="white" style={{ marginRight: 10 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}>
                  Processing...
                </Text>
              </View>
            ) : (
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}>
                {currentSubscription ? 'Add Sessions' : 'Buy Now'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --- Profile Button for Sidebar ---
  // Place this at the top of your main render, above the main content
  // You can adjust the placement as needed for your layout
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Hide header for DocBot tab */}
      {activeTab !== 'docbot' && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#F8F9FA', zIndex: 10 }}>
          <TouchableOpacity style={styles.profileButton} onPress={openSidebar}>
            <Icon name="user" size={20} color="#666" />
          </TouchableOpacity>
          
          {/* DocAvailable Logo */}
          <Image 
            source={require('../assets/images/DA logo green.png')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
          
          {/* Spacer to balance the layout */}
          <View style={{ width: 44 }} />
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
          styles.bottomNav,
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
        <Tab
          icon="home"
          label="Home"
          isActive={activeTab === 'home'}
          onPress={() => setActiveTab('home')}
        />
        <Tab
          icon="search"
          label="Discover"
          isActive={activeTab === 'discover'}
          onPress={() => setActiveTab('discover')}
        />
        <Tab
          icon="message"
          label="Messages"
          isActive={activeTab === 'messages'}
          onPress={() => setActiveTab('messages')}
        />
        <Tab
          icon="file"
          label="Blogs"
          isActive={activeTab === 'blogs'}
          onPress={() => setActiveTab('blogs')}
        />
        <Tab
          icon="userMd"
          label="Doc AI"
          isActive={activeTab === 'docbot'}
          onPress={() => setActiveTab('docbot')}
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

      {/* Cache Management Modal */}
      <CacheManagementModal
        visible={showCacheManagement}
        onClose={() => setShowCacheManagement(false)}
      />





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
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              {user?.profile_picture_url ? (
                <Image source={{ uri: user.profile_picture_url }} style={styles.profileImage} />
              ) : user?.profile_picture ? (
                <Image source={{ uri: user.profile_picture }} style={styles.profileImage} />
              ) : (
                <Image source={profileImage} style={styles.profileImage} />
              )}
              <Text style={styles.profileName}>{userData?.first_name && userData?.last_name ? `${userData.first_name} ${userData.last_name}` : userData?.display_name || user?.display_name || 'Patient'}</Text>
            </View>
            
            {/* Settings Section */}
            <Text style={styles.sectionHeader}>Settings</Text>
            <View style={styles.sectionGroup}>
              <TouchableOpacity style={styles.sidebarMenuItem} onPress={() => { closeSidebar(); setShowSubscriptions(true); }}>
                <View style={styles.iconBox}><Icon name="heart" size={20} color="#4CAF50" /></View>
                <Text style={styles.sidebarMenuItemText}>My Health Plan</Text>
                <View style={{ marginLeft: 'auto' }}>
                  <Icon name="chevronRight" size={20} color="#4CAF50" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarMenuItem} onPress={() => { closeSidebar(); router.push('/patient-profile'); }}>
                <View style={styles.iconBox}><Icon name="user" size={20} color="#4CAF50" /></View>
                <Text style={styles.sidebarMenuItemText}>View Profile</Text>
                <View style={{ marginLeft: 'auto' }}>
                  <Icon name="chevronRight" size={20} color="#4CAF50" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarMenuItem} onPress={() => { closeSidebar(); router.push('/edit-patient-profile'); }}>
                <View style={styles.iconBox}><Icon name="user" size={20} color="#4CAF50" /></View>
                <Text style={styles.sidebarMenuItemText}>Edit Profile</Text>
                <View style={{ marginLeft: 'auto' }}>
                  <Icon name="chevronRight" size={20} color="#4CAF50" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarMenuItem} onPress={() => { closeSidebar(); router.push('/privacy-settings'); }}>
                <View style={styles.iconBox}><Icon name="eye" size={20} color="#4CAF50" /></View>
                <Text style={styles.sidebarMenuItemText}>Privacy Settings</Text>
                <View style={{ marginLeft: 'auto' }}>
                  <Icon name="chevronRight" size={20} color="#4CAF50" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarMenuItem} onPress={() => { closeSidebar(); router.push('/notifications-settings'); }}>
                <View style={styles.iconBox}><Icon name="bell" size={20} color="#4CAF50" /></View>
                <Text style={styles.sidebarMenuItemText}>Notifications</Text>
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
            </View>
              
            
            {/* Logout */}
            <TouchableOpacity style={[styles.sidebarMenuItem, { marginTop: 20 }]} onPress={() => { closeSidebar(); handleLogout(); }}>
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

      {/* Specialization Filter Modal */}
      <SpecializationFilterModal
        visible={showSpecializationModal}
        onClose={() => setShowSpecializationModal(false)}
        selectedSpecialization={selectedSpecialization}
        onSpecializationChange={setSelectedSpecialization}
        availableSpecializations={availableSpecializations}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mainContent: {
    flex: 1,
    maxWidth: maxWidth,
    alignSelf: 'center',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
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
    color: '#111',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  subscriptionBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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
  subscriptionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  subscriptionDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: isLargeScreen ? 22 : 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  // Reuse doctor card look
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
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
    color: '#666',
    marginTop: 2,
    marginBottom: 4,
  },
  quickActions: {
    marginBottom: 30,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isWeb ? 32 : 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    width: '48%',
    marginRight: '2%',
    minHeight: 140,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: isLargeScreen ? 16 : 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: isLargeScreen ? 14 : 12,
    color: '#666',
    lineHeight: 18,
  },
  recentActivity: {
    marginBottom: 30,
  },
  activityCard: {
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
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
    marginBottom: 8,
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
  appointmentType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
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
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    // Active state styling
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
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

  clearButton: {
    padding: 4,
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
  sortDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sortOptionActive: {
    backgroundColor: '#F8F9FA',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  sortOptionTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
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
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  filterPillsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  filterPillsScrollContent: {
    paddingRight: 20,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#E8F5E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  filterPillText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  doctorsListNew: {
    flexDirection: 'column',
    gap: 18,
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  doctorCardNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 4,
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
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  viewProfileButtonText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
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
  sidebarMenu: {
    flex: 1,
  },
  sidebarMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  sidebarMenuItemText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
    fontWeight: '500',
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
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 10,
  },
  sectionGroup: {
    marginBottom: 20,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E0F2E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
});


