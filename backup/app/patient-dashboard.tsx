import { SimpleIcons } from '../components/SimpleIcons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { firestoreService } from '../services/firestoreService';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 1200 : width;
const isLargeScreen = width > 768;

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
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic Life',
    price: 20000,
    currency: 'MWK',
    textSessions: 3,
    voiceCalls: 1,
    videoCalls: 0,
    features: [
      '3 Text Sessions (10 min each)',
      '1 Voice Call',
      'Basic Health Records',
      'Email Support'
    ]
  },
  {
    id: 'executive',
    name: 'Executive Life',
    price: 50000,
    currency: 'MWK',
    textSessions: 10,
    voiceCalls: 2,
    videoCalls: 1,
    features: [
      '10 Text Sessions (10 min each)',
      '2 Voice Calls',
      '1 Video Call',
      'Priority Health Records',
      'Priority Support',
      'Health Analytics'
    ],
    popular: true
  },
  {
    id: 'premium',
    name: 'Premium Life',
    price: 200000,
    currency: 'MWK',
    textSessions: 50,
    voiceCalls: 15,
    videoCalls: 5,
    features: [
      '50 Text Sessions (10 min each)',
      '15 Voice Calls',
      '5 Video Calls',
      'Advanced Health Records',
      '24/7 Priority Support',
      'Health Analytics & Reports',
      'Family Plan (up to 3 members)',
      'Prescription Management'
    ]
  }
];

interface TabProps {
  icon: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const Tab: React.FC<TabProps> = ({ icon, label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.tab, isActive && styles.activeTab]}
    onPress={onPress}
  >
    <FontAwesome
      name={icon as any}
      size={24}
      color={isActive ? '#4CAF50' : '#666'}
    />
    <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function PatientDashboard() {
  const { user, userData, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [showConfirm, setShowConfirm] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      firestoreService.getAppointmentsForUser(user.uid, 'patient').then(appointments => {
        // console.log('PatientDashboard: Fetched appointments:', appointments);
        setAppointments(appointments);
      }).catch(error => {
        console.error('PatientDashboard: Error fetching appointments:', error);
        setAppointments([]);
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Simulate loading user's current subscription
      // In a real app, this would come from the database
      setCurrentSubscription(null); // No subscription by default
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'discover') {
      setLoadingDoctors(true);
      // Fetch real doctors from Firebase
      firestoreService.getDoctors()
        .then(docs => {
          // Filter for approved doctors and add default values for missing fields
          const approvedDoctors = docs
            .filter((doctor: any) => doctor.status === 'approved')
            .map((doctor: any) => ({
              id: doctor.uid,
              name: doctor.displayName || doctor.email?.split('@')[0] || 'Dr. Unknown',
              specialization: doctor.specialization || 'General Medicine',
              rating: doctor.rating || 4.5,
              experience: doctor.yearsOfExperience || 5,
              location: doctor.location || 'Malawi',
              email: doctor.email,
              status: doctor.status
            }));
          setDoctors(approvedDoctors);
        })
        .catch((error) => {
          console.error('Error fetching doctors:', error);
          setDoctors([]);
        })
        .finally(() => setLoadingDoctors(false));
    }
  }, [activeTab]);

  if (!user) return null;

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      setShowConfirm(true);
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              try {
                await authService.signOut();
                router.replace('/');
              } catch (error) {
                Alert.alert('Error', 'Failed to logout. Please try again.');
              }
            },
          },
        ]
      );
    }
  };

  const confirmLogout = async () => {
    setShowConfirm(false);
    try {
      await authService.signOut();
      router.replace('/');
    } catch (error) {
      alert('Failed to logout. Please try again.');
    }
  };

  const handlePurchaseSubscription = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    Alert.alert(
      'Purchase Subscription',
      `Are you sure you want to purchase ${plan.name} for ${plan.currency} ${plan.price.toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: () => {
            // Simulate purchase process
            Alert.alert(
              'Processing Payment',
              'Please wait while we process your payment...',
              [],
              { cancelable: false }
            );
            
            setTimeout(() => {
              setCurrentSubscription(plan);
              setSelectedPlan(null);
              Alert.alert(
                'Success!',
                `Your ${plan.name} subscription has been activated successfully!`,
                [{ text: 'OK' }]
              );
            }, 2000);
          }
        }
      ]
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  const getFilteredAndSortedDoctors = () => {
    let filteredDoctors = doctors;

    // Filter by search query
    if (searchQuery.trim()) {
      filteredDoctors = doctors.filter(doctor =>
        doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort doctors
    switch (sortBy) {
      case 'name':
        return filteredDoctors.sort((a, b) => a.name.localeCompare(b.name));
      case 'rating':
        return filteredDoctors.sort((a, b) => b.rating - a.rating);
      case 'experience':
        return filteredDoctors.sort((a, b) => b.experience - a.experience);
      case 'specialization':
        return filteredDoctors.sort((a, b) => a.specialization.localeCompare(b.specialization));
      case 'location':
        return filteredDoctors.sort((a, b) => a.location.localeCompare(b.location));
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
    Alert.alert(
      'Book Appointment',
      `Would you like to book an appointment with ${doctor.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book Now',
          onPress: () => {
            // Navigate to doctor details page for booking
            router.push({ pathname: '/(tabs)/doctor-details/[uid]', params: { uid: doctor.id } });
          }
        }
      ]
    );
  };

  const renderHomeContent = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there'}!
        </Text>
        <Text style={styles.subtitle}>How can we help you today?</Text>
      </View>

      {currentSubscription && (
        <View style={styles.subscriptionBanner}>
          <SimpleIcons.FontAwesome.star />
          <View style={styles.subscriptionInfo}>
            <Text style={styles.subscriptionTitle}>{currentSubscription.name} Active</Text>
            <Text style={styles.subscriptionDetails}>
              {currentSubscription.textSessions} texts • {currentSubscription.voiceCalls} calls • {currentSubscription.videoCalls} videos
            </Text>
          </View>
        </View>
      )}

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.cardsGrid}>
          <TouchableOpacity style={styles.patientCard} onPress={() => setActiveTab('discover')}>
            <View style={styles.actionIcon}>
              <SimpleIcons.FontAwesome.user-md />
            </View>
            <Text style={styles.actionTitle}>Find Doctor</Text>
            <Text style={styles.actionSubtitle}>Book an appointment</Text>
          </TouchableOpacity>

          <View style={styles.patientCard}>
            <View style={styles.actionIcon}>
              <SimpleIcons.FontAwesome.calendar />
            </View>
            <Text style={styles.actionTitle}>My Appointments</Text>
            <Text style={styles.actionSubtitle}>View scheduled visits</Text>
          </View>

          <View style={styles.patientCard}>
            <View style={styles.actionIcon}>
              <SimpleIcons.FontAwesome.file-text-o />
            </View>
            <Text style={styles.actionTitle}>Medical Records</Text>
            <Text style={styles.actionSubtitle}>Access your history</Text>
          </View>

          <TouchableOpacity style={styles.patientCard} onPress={() => setActiveTab('subscriptions')}>
            <View style={styles.actionIcon}>
              <SimpleIcons.FontAwesome.star />
            </View>
            <Text style={styles.actionTitle}>Subscriptions</Text>
            <Text style={styles.actionSubtitle}>Manage your plan</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.recentActivity}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <SimpleIcons.FontAwesome.calendar-check-o />
            <Text style={styles.activityTitle}>Appointment Confirmed</Text>
            <Text style={styles.activityTime}>2 hours ago</Text>
          </View>
          <Text style={styles.activityDescription}>
            Your appointment with Dr. Smith has been confirmed for tomorrow at 2:00 PM
          </Text>
        </View>

        <View style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <SimpleIcons.FontAwesome.file-text-o />
            <Text style={styles.activityTitle}>Test Results Ready</Text>
            <Text style={styles.activityTime}>1 day ago</Text>
          </View>
          <Text style={styles.activityDescription}>
            Your blood test results are now available in your medical records
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderSubscriptionsContent = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Subscription Plans</Text>
        <Text style={styles.subtitle}>Choose the plan that fits your healthcare needs</Text>
      </View>

      {currentSubscription && (
        <View style={styles.currentPlanCard}>
          <View style={styles.currentPlanHeader}>
            <SimpleIcons.FontAwesome.star />
            <Text style={styles.currentPlanTitle}>Current Plan: {currentSubscription.name}</Text>
          </View>
          <Text style={styles.currentPlanPrice}>
            {formatCurrency(currentSubscription.price, currentSubscription.currency)}
          </Text>
          <View style={styles.currentPlanFeatures}>
            <Text style={styles.currentPlanFeature}>
              • {currentSubscription.textSessions} Text Sessions
            </Text>
            <Text style={styles.currentPlanFeature}>
              • {currentSubscription.voiceCalls} Voice Calls
            </Text>
            <Text style={styles.currentPlanFeature}>
              • {currentSubscription.videoCalls} Video Calls
            </Text>
          </View>
        </View>
      )}

      <View style={styles.plansContainer}>
        <Text style={styles.sectionTitle}>Available Plans</Text>
        {subscriptionPlans.map((plan) => (
          <View key={plan.id} style={[styles.planCard, plan.popular && styles.popularPlanCard]}>
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>Most Popular</Text>
              </View>
            )}
            
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>
                {formatCurrency(plan.price, plan.currency)}
              </Text>
            </View>

            <View style={styles.planFeatures}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <SimpleIcons.FontAwesome.check />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.purchaseButton,
                currentSubscription?.id === plan.id && styles.currentPlanButton
              ]}
              onPress={() => handlePurchaseSubscription(plan)}
              disabled={currentSubscription?.id === plan.id}
            >
              <Text style={styles.purchaseButtonText}>
                {currentSubscription?.id === plan.id ? 'Current Plan' : 'Purchase Plan'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderMessagesContent = () => (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <View style={styles.messagesHeader}>
        <Text style={styles.messagesTitle}>Messages</Text>
        <Text style={styles.messagesSubtitle}>Chat with healthcare professionals</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SimpleIcons.FontAwesome.search />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages, doctors, or appointments..."
          placeholderTextColor="#999"
          value={messageSearchQuery}
          onChangeText={setMessageSearchQuery}
        />
        {messageSearchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setMessageSearchQuery('')} style={styles.clearButton}>
            <SimpleIcons.FontAwesome.times />
          </TouchableOpacity>
        )}
      </View>

      {/* Chat List */}
      <ScrollView style={styles.chatList} showsVerticalScrollIndicator={false}>
        {/* Practice Doctor Chat */}
        {(!messageSearchQuery || 
          'Dr. Sarah Johnson'.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
          'Available for consultation'.toLowerCase().includes(messageSearchQuery.toLowerCase())) && (
          <TouchableOpacity 
            style={styles.chatCard}
            onPress={() => router.push({ pathname: '/chat/[chatId]', params: { chatId: 'practice-doctor' } })}
          >
            <View style={styles.chatAvatar}>
              <SimpleIcons.FontAwesome.user-md />
            </View>
            <View style={styles.chatContent}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>Dr. Sarah Johnson</Text>
                <Text style={styles.chatTime}>Now</Text>
              </View>
              <View style={styles.chatPreview}>
                <Text style={styles.chatLastMessage}>Available for consultation</Text>
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>New</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Appointment Chats */}
        {appointments
          .filter(appt => 
            !messageSearchQuery || 
            appt.doctorName?.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
            appt.date?.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
            appt.time?.toLowerCase().includes(messageSearchQuery.toLowerCase())
          )
          .map((appt) => (
          <TouchableOpacity
            key={appt.id}
            style={styles.chatCard}
            onPress={() => {
              // Use the same chat ID format as doctor dashboard: chat_patientId_doctorId
              const chatId = `chat_${user?.uid}_${appt.doctorId}`;
              router.push({ pathname: '/chat/[chatId]', params: { chatId } });
            }}
          >
            <View style={[styles.chatAvatar, styles.appointmentAvatar]}>
              <SimpleIcons.FontAwesome.calendar />
            </View>
            <View style={styles.chatContent}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>{appt.doctorName}</Text>
                <Text style={styles.chatTime}>{appt.date}</Text>
              </View>
              <View style={styles.chatPreview}>
                <Text style={styles.chatLastMessage}>Appointment scheduled for {appt.time}</Text>
                <View style={styles.unreadIndicator}>
                  <Text style={styles.unreadCount}>1</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Empty State */}
        {appointments.length === 0 && !messageSearchQuery && (
          <View style={styles.emptyChatState}>
            <View style={styles.emptyChatIcon}>
              <SimpleIcons.FontAwesome.comments />
            </View>
            <Text style={styles.emptyChatTitle}>No appointment chats yet</Text>
            <Text style={styles.emptyChatSubtitle}>
              Book an appointment to start chatting with your doctor
            </Text>
          </View>
        )}

        {/* No Search Results */}
        {messageSearchQuery && 
         appointments.filter(appt => 
           appt.doctorName?.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
           appt.date?.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
           appt.time?.toLowerCase().includes(messageSearchQuery.toLowerCase())
         ).length === 0 && 
         !'Dr. Sarah Johnson'.toLowerCase().includes(messageSearchQuery.toLowerCase()) && (
          <View style={styles.emptyChatState}>
            <View style={styles.emptyChatIcon}>
              <SimpleIcons.FontAwesome.search />
            </View>
            <Text style={styles.emptyChatTitle}>No messages found</Text>
            <Text style={styles.emptyChatSubtitle}>
              Try searching with different keywords
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderProfileContent = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Profile</Text>
        <Text style={styles.subtitle}>Manage your account settings</Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <SimpleIcons.FontAwesome.user />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.displayName || user?.email?.split('@')[0] || 'Patient'}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileType}>Patient</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/patient-profile')}>
            <SimpleIcons.FontAwesome.eye />
            <Text style={styles.menuText}>View Profile</Text>
            <SimpleIcons.FontAwesome.chevron-right />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-patient-profile')}>
            <SimpleIcons.FontAwesome.user />
            <Text style={styles.menuText}>Edit Profile</Text>
            <SimpleIcons.FontAwesome.chevron-right />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/privacy-settings')}>
            <SimpleIcons.FontAwesome.lock />
            <Text style={styles.menuText}>Privacy Settings</Text>
            <SimpleIcons.FontAwesome.chevron-right />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications-settings')}>
            <SimpleIcons.FontAwesome.bell />
            <Text style={styles.menuText}>Notifications</Text>
            <SimpleIcons.FontAwesome.chevron-right />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <SimpleIcons.FontAwesome.file-text-o />
            <Text style={styles.menuText}>Medical Records</Text>
            <SimpleIcons.FontAwesome.chevron-right />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <SimpleIcons.FontAwesome.credit-card />
            <Text style={styles.menuText}>Billing & Payments</Text>
            <SimpleIcons.FontAwesome.chevron-right />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <SimpleIcons.FontAwesome.question-circle />
            <Text style={styles.menuText}>Help & Support</Text>
            <SimpleIcons.FontAwesome.chevron-right />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <SimpleIcons.FontAwesome.sign-out />
          <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
          <SimpleIcons.FontAwesome.chevron-right />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderDiscoverDoctorsContent = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Find Doctors</Text>
        <Text style={styles.subtitle}>Connect with healthcare professionals</Text>
      </View>

      {/* Search and Sort Section */}
      <View style={styles.searchSortContainer}>
        <View style={styles.searchContainer}>
          <SimpleIcons.FontAwesome.search />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors, specializations, or locations..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <SimpleIcons.FontAwesome.times />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortOptions(!showSortOptions)}
          >
            <SimpleIcons.FontAwesome.sort />
            <Text style={styles.sortButtonText}>{getSortOptionLabel(sortBy)}</Text>
            <FontAwesome 
              name={showSortOptions ? "chevron-up" : "chevron-down"} 
              size={12} 
              color="#666" 
            />
          </TouchableOpacity>

          {showSortOptions && (
            <View style={styles.sortDropdown}>
              {[
                { value: 'name', label: 'Name (A-Z)' },
                { value: 'rating', label: 'Rating (High to Low)' },
                { value: 'experience', label: 'Experience (High to Low)' },
                { value: 'specialization', label: 'Specialization (A-Z)' },
                { value: 'location', label: 'Location (A-Z)' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortOption,
                    sortBy === option.value && styles.sortOptionActive
                  ]}
                  onPress={() => {
                    setSortBy(option.value);
                    setShowSortOptions(false);
                  }}
                >
                  <Text style={[
                    styles.sortOptionText,
                    sortBy === option.value && styles.sortOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                  {sortBy === option.value && (
                    <SimpleIcons.FontAwesome.check />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {getFilteredAndSortedDoctors().length} doctor{getFilteredAndSortedDoctors().length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {loadingDoctors ? (
        <View style={styles.loadingContainer}>
          <SimpleIcons.FontAwesome.spinner />
          <Text style={styles.loadingText}>Loading doctors...</Text>
        </View>
      ) : getFilteredAndSortedDoctors().length === 0 ? (
        <View style={styles.noResultsContainer}>
          <SimpleIcons.FontAwesome.search />
          <Text style={styles.noResultsText}>
            {searchQuery.trim() ? 'No doctors found' : 'No approved doctors available'}
          </Text>
          <Text style={styles.noResultsSubtext}>
            {searchQuery.trim() 
              ? 'Try adjusting your search terms or filters'
              : 'Please check back later or contact support'
            }
          </Text>
        </View>
      ) : (
        <View style={styles.doctorsList}>
          {getFilteredAndSortedDoctors().map((doctor) => (
            <TouchableOpacity 
              key={doctor.id} 
              style={styles.doctorCard}
              onPress={() => handleViewDoctorDetails(doctor)}
            >
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <Text style={styles.doctorSpecialization}>{doctor.specialization}</Text>
                <View style={styles.doctorDetails}>
                  <View style={styles.doctorRating}>
                    <SimpleIcons.FontAwesome.star />
                    <Text style={styles.ratingText}>{doctor.rating}</Text>
                  </View>
                  <View style={styles.doctorExperience}>
                    <SimpleIcons.FontAwesome.clock-o />
                    <Text style={styles.experienceText}>{doctor.experience} years</Text>
                  </View>
                  <View style={styles.doctorLocation}>
                    <SimpleIcons.FontAwesome.map-marker />
                    <Text style={styles.locationText}>{doctor.location}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation(); // Prevent triggering the card press
                  handleBookAppointment(doctor);
                }}
              >
                <Text style={styles.actionButtonText}>Book</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeContent();
      case 'messages':
        return renderMessagesContent();
      case 'subscriptions':
        return renderSubscriptionsContent();
      case 'discover':
        return renderDiscoverDoctorsContent();
      case 'profile':
        return renderProfileContent();
      default:
        return renderHomeContent();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        {renderContent()}
        <View style={styles.bottomNav}>
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
            icon="comments"
            label="Messages"
            isActive={activeTab === 'messages'}
            onPress={() => setActiveTab('messages')}
          />
          <Tab
            icon="star"
            label="Subscriptions"
            isActive={activeTab === 'subscriptions'}
            onPress={() => setActiveTab('subscriptions')}
          />
          <Tab
            icon="user"
            label="Profile"
            isActive={activeTab === 'profile'}
            onPress={() => setActiveTab('profile')}
          />
        </View>
      </View>
      {Platform.OS === 'web' && (
        <ConfirmDialog
          visible={showConfirm}
          onConfirm={confirmLogout}
          onCancel={() => setShowConfirm(false)}
          message="Are you sure you want to logout?"
        />
      )}
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
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? 40 : 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: isLargeScreen ? 32 : 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: isWeb ? 'center' : 'left',
  },
  subtitle: {
    fontSize: isLargeScreen ? 18 : 16,
    color: '#666',
    textAlign: isWeb ? 'center' : 'left',
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
    padding: isWeb ? 24 : 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: '48%',
    marginRight: '2%',
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
    fontSize: 18,
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
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
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
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  profileType: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
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
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 20,
  },
  placeholderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  doctorsList: {
    marginBottom: 30,
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
  doctorInfo: {
    flex: 1,
  },
  doctorSpecialization: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  doctorRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  // Subscription styles
  currentPlanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
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
    marginLeft: 8,
  },
  currentPlanPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
  },
  currentPlanFeatures: {
    marginBottom: 8,
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
    padding: 24,
    marginBottom: 20,
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
    borderColor: '#4CAF50',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  planFeatures: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  purchaseButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanButton: {
    backgroundColor: '#E0E0E0',
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Search and Sort styles
  searchSortContainer: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  clearButton: {
    padding: 4,
  },
  sortContainer: {
    position: 'relative',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    color: '#000',
    marginLeft: 8,
    marginRight: 8,
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
    color: '#000',
  },
  sortOptionTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  resultsContainer: {
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  doctorDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
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
  refreshButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 6,
  },
  refreshButtonTextDisabled: {
    color: '#CCC',
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
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatWindowInfo: {
    flex: 1,
  },
  chatWindowAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatWindowDetails: {
    flex: 1,
  },
  chatWindowName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 4,
  },
  onlineText: {
    fontSize: 12,
    color: '#666',
  },
  appointmentText: {
    fontSize: 12,
    color: '#666',
  },
  moreButton: {
    padding: 4,
  },
}); 
