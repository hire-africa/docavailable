import { SimpleIcons } from '../components/SimpleIcons';
import { router } from 'expo-router';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
import ChatWindow from '../components/ChatWindow';
import ConfirmDialog from '../components/ConfirmDialog';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { firestoreService } from '../services/firestoreService';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 1200 : width;
const isLargeScreen = width > 768;

interface TabProps {
  icon: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

interface BookingRequest {
  id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  consultationType: 'text' | 'voice' | 'video';
  reason: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
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
    <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]} numberOfLines={1}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function DoctorDashboard() {
  // console.log('DoctorDashboard mounted');
  const { user, userData, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [showConfirm, setShowConfirm] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [confirmedAppointments, setConfirmedAppointments] = useState<BookingRequest[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<BookingRequest | null>(null);
  const [earnings, setEarnings] = useState(0);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState('bank');
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingConfirmed, setLoadingConfirmed] = useState(false);

  // Show loading only if Firebase Auth is still loading
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

  // If no user is logged in, redirect to login
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      firestoreService.getAppointmentsForUser(user.uid, 'doctor').then(setAppointments);
    }
  }, [user]);

  // Fetch booking requests for this doctor
  useEffect(() => {
    if (user && activeTab === 'appointments') {
      fetchBookingRequests();
    }
  }, [user, activeTab]);

  // Fetch confirmed appointments for messages tab
  useEffect(() => {
    if (user && activeTab === 'messages') {
      fetchConfirmedAppointments();
    }
  }, [user, activeTab]);

  const fetchBookingRequests = async () => {
    if (!user || !db) return;

    setLoadingRequests(true);
    try {
      const q = query(
        collection(db, 'appointments'),
        where('doctorId', '==', user.uid),
        where('status', '==', 'pending')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BookingRequest[];
        
        setBookingRequests(requests);
        setLoadingRequests(false);
      }, (error) => {
        console.error('Error fetching booking requests:', error);
        setLoadingRequests(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up booking requests listener:', error);
      setLoadingRequests(false);
    }
  };

  const fetchConfirmedAppointments = async () => {
    if (!user || !db) return;

    setLoadingConfirmed(true);
    try {
      const q = query(
        collection(db, 'appointments'),
        where('doctorId', '==', user.uid),
        where('status', '==', 'confirmed')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const confirmed = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BookingRequest[];
        
        setConfirmedAppointments(confirmed);
        setLoadingConfirmed(false);
      }, (error) => {
        console.error('Error fetching confirmed appointments:', error);
        setLoadingConfirmed(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up confirmed appointments listener:', error);
      setLoadingConfirmed(false);
    }
  };

  const handleAcceptBooking = async (request: BookingRequest) => {
    if (!db) return;

    try {
      await updateDoc(doc(db, 'appointments', request.id), {
        status: 'confirmed',
        updatedAt: new Date().toISOString()
      });

      Alert.alert('Success', 'Booking request accepted successfully!');
    } catch (error) {
      console.error('Error accepting booking:', error);
      Alert.alert('Error', 'Failed to accept booking request. Please try again.');
    }
  };

  const handleRejectBooking = async (request: BookingRequest) => {
    if (!db) return;

    try {
      await updateDoc(doc(db, 'appointments', request.id), {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });

      Alert.alert('Success', 'Booking request rejected.');
    } catch (error) {
      console.error('Error rejecting booking:', error);
      Alert.alert('Error', 'Failed to reject booking request. Please try again.');
    }
  };

  const handleStartChat = (request: BookingRequest) => {
    const chatId = `chat_${request.patientId}_${request.doctorId}`;
    router.push(`/chat/${chatId}` as any);
  };

  const handleSelectPatient = (patient: BookingRequest) => {
    setSelectedPatient(patient);
    setSelectedAppointmentId(patient.id);
  };

  const handleStartChatWithPatient = (patient: BookingRequest) => {
    const chatId = `chat_${patient.patientId}_${patient.doctorId}`;
    router.push(`/chat/${chatId}` as any);
  };

  const handleTestChat = () => {
    // Test chat with a hardcoded patient ID for testing
    const testPatientId = 'test-patient-123';
    const chatId = `chat_${testPatientId}_${user?.uid}`;
    // console.log('DoctorDashboard: Testing chat with ID:', chatId);
    router.push(`/chat/${chatId}` as any);
  };

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

  const handleWithdrawal = () => {
    const amount = parseFloat(withdrawalAmount);
    if (amount > earnings) {
      Alert.alert('Error', 'Withdrawal amount cannot exceed available earnings.');
      return;
    }
    if (amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    
    // Simulate withdrawal process
    Alert.alert(
      'Withdrawal Request',
      `Withdrawal request for ${withdrawalAmount} MWK via ${withdrawalMethod} has been submitted. You will receive payment within 3-5 business days.`,
      [
        {
          text: 'OK',
          onPress: () => {
            setEarnings(earnings - amount);
            setWithdrawalAmount('');
            setShowWithdrawalModal(false);
          }
        }
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MW', {
      style: 'currency',
      currency: 'MWK'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
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

  const renderHomeContent = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome Dr. {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there'}!
        </Text>
        <Text style={styles.subtitle}>Manage your practice and patients</Text>
      </View>

      {/* Pending Requests Summary */}
      {bookingRequests.length > 0 && (
        <View style={styles.pendingRequestsCard}>
          <View style={styles.pendingRequestsHeader}>
            <SimpleIcons.FontAwesome.clock-o />
            <Text style={styles.pendingRequestsTitle}>
              {bookingRequests.length} Pending Booking Request{bookingRequests.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={styles.pendingRequestsSubtitle}>
            Review and respond to patient booking requests
          </Text>
          <TouchableOpacity 
            style={styles.viewRequestsButton}
            onPress={() => setActiveTab('appointments')}
          >
            <Text style={styles.viewRequestsButtonText}>View Requests</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('appointments')}>
            <View style={styles.actionIcon}>
              <SimpleIcons.FontAwesome.calendar />
            </View>
            <Text style={styles.actionTitle}>Appointments</Text>
            <Text style={styles.actionSubtitle}>Manage bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('messages')}>
            <View style={styles.actionIcon}>
              <SimpleIcons.FontAwesome.comments />
            </View>
            <Text style={styles.actionTitle}>Messages</Text>
            <Text style={styles.actionSubtitle}>Chat with patients</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleTestChat}>
            <View style={styles.actionIcon}>
              <SimpleIcons.FontAwesome.bug />
            </View>
            <Text style={styles.actionTitle}>Test Chat</Text>
            <Text style={styles.actionSubtitle}>Debug messaging</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/doctor-withdrawals')}>
            <View style={styles.actionIcon}>
              <SimpleIcons.FontAwesome.money />
            </View>
            <Text style={styles.actionTitle}>Earnings</Text>
            <Text style={styles.actionSubtitle}>Withdraw funds</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.recentActivity}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {bookingRequests.length > 0 ? (
          <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <SimpleIcons.FontAwesome.user-plus />
              <Text style={styles.activityTitle}>New Booking Request</Text>
              <Text style={styles.activityTime}>Just now</Text>
            </View>
            <Text style={styles.activityDescription}>
              {bookingRequests[0].patientName} requested a {getConsultationTypeLabel(bookingRequests[0].consultationType)} appointment
            </Text>
          </View>
        ) : (
          <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <SimpleIcons.FontAwesome.info-circle />
              <Text style={styles.activityTitle}>No Recent Activity</Text>
            </View>
            <Text style={styles.activityDescription}>
              You'll see patient booking requests and messages here
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderAppointmentsContent = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Booking Requests</Text>
        <Text style={styles.subtitle}>Review and manage patient appointments</Text>
      </View>

      {loadingRequests ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading booking requests...</Text>
        </View>
      ) : bookingRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <SimpleIcons.FontAwesome.calendar-o />
          <Text style={styles.emptyStateTitle}>No Pending Requests</Text>
          <Text style={styles.emptyStateSubtitle}>
            When patients book appointments, they'll appear here for your review
          </Text>
        </View>
      ) : (
        <View style={styles.bookingRequestsList}>
          {bookingRequests.map((request) => (
            <View key={request.id} style={styles.bookingRequestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.patientInfo}>
                  <SimpleIcons.FontAwesome.user />
                  <Text style={styles.patientName}>{request.patientName}</Text>
                </View>
                <View style={styles.requestStatus}>
                  <Text style={styles.statusPending}>Pending</Text>
                </View>
              </View>

              <View style={styles.requestDetails}>
                <View style={styles.detailRow}>
                  <SimpleIcons.FontAwesome.calendar />
                  <Text style={styles.detailText}>{formatDate(request.date)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <SimpleIcons.FontAwesome.clock-o />
                  <Text style={styles.detailText}>{request.time}</Text>
                </View>
                <View style={styles.detailRow}>
                  <FontAwesome name={getConsultationTypeIcon(request.consultationType) as any} size={14} color="#666" />
                  <Text style={styles.detailText}>{getConsultationTypeLabel(request.consultationType)}</Text>
                </View>
              </View>

              <View style={styles.reasonSection}>
                <Text style={styles.reasonLabel}>Reason for Visit:</Text>
                <Text style={styles.reasonText}>{request.reason}</Text>
              </View>

              <View style={styles.requestActions}>
                <TouchableOpacity 
                  style={styles.chatButton}
                  onPress={() => handleStartChat(request)}
                >
                  <SimpleIcons.FontAwesome.comments />
                  <Text style={styles.chatButtonText}>Chat</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.rejectButton}
                  onPress={() => handleRejectBooking(request)}
                >
                  <SimpleIcons.FontAwesome.times />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.acceptButton}
                  onPress={() => handleAcceptBooking(request)}
                >
                  <SimpleIcons.FontAwesome.check />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderMessagesContent = () => (
    <View style={styles.messagesContainer}>
      <View style={styles.messagesHeader}>
        <Text style={styles.messagesTitle}>Patient Messages</Text>
        <Text style={styles.messagesSubtitle}>Chat with your confirmed patients</Text>
      </View>

      {loadingConfirmed ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading patients...</Text>
        </View>
      ) : confirmedAppointments.length === 0 ? (
        <View style={styles.emptyState}>
          <SimpleIcons.FontAwesome.users />
          <Text style={styles.emptyStateTitle}>No Confirmed Patients</Text>
          <Text style={styles.emptyStateSubtitle}>
            Patients will appear here after you accept their booking requests
          </Text>
        </View>
      ) : (
        <View style={styles.patientsList}>
          {confirmedAppointments.map((patient) => (
            <TouchableOpacity
              key={patient.id}
              style={[
                styles.patientCard,
                selectedPatient?.id === patient.id && styles.selectedPatientCard
              ]}
              onPress={() => handleSelectPatient(patient)}
            >
              <View style={styles.patientCardHeader}>
                <View style={styles.patientAvatar}>
                  <SimpleIcons.FontAwesome.user />
                </View>
                <View style={styles.patientCardInfo}>
                  <Text style={styles.patientCardName}>{patient.patientName}</Text>
                  <Text style={styles.patientCardType}>
                    {getConsultationTypeLabel(patient.consultationType)}
                  </Text>
                </View>
                <View style={styles.patientCardStatus}>
                  <Text style={styles.statusConfirmed}>Confirmed</Text>
                </View>
              </View>

              <View style={styles.patientCardDetails}>
                <View style={styles.patientDetailRow}>
                  <SimpleIcons.FontAwesome.calendar />
                  <Text style={styles.patientDetailText}>{formatDate(patient.date)}</Text>
                </View>
                <View style={styles.patientDetailRow}>
                  <SimpleIcons.FontAwesome.clock-o />
                  <Text style={styles.patientDetailText}>{patient.time}</Text>
                </View>
              </View>

              <View style={styles.patientCardActions}>
                <TouchableOpacity 
                  style={styles.startChatButton}
                  onPress={() => handleStartChatWithPatient(patient)}
                >
                  <SimpleIcons.FontAwesome.comments />
                  <Text style={styles.startChatButtonText}>Start Chat</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selectedPatient && (
        <View style={styles.chatSection}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Chat with {selectedPatient.patientName}</Text>
            <TouchableOpacity 
              style={styles.closeChatButton}
              onPress={() => setSelectedPatient(null)}
            >
              <SimpleIcons.FontAwesome.times />
            </TouchableOpacity>
          </View>
          <ChatWindow chatId={selectedAppointmentId || ''} userId={user?.uid || ''} />
        </View>
      )}
    </View>
  );

  const renderProfileContent = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Profile</Text>
        <Text style={styles.subtitle}>Manage your account</Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <SimpleIcons.FontAwesome.user-md />
            <Text style={styles.profileName}>
              Dr. {user?.displayName || user?.email?.split('@')[0] || 'Doctor'}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/doctor-profile')}>
            <SimpleIcons.FontAwesome.eye />
            <Text style={styles.menuText}>View Profile</Text>
            <SimpleIcons.FontAwesome.chevron-right />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <SimpleIcons.FontAwesome.user />
            <Text style={styles.menuText}>Edit Profile</Text>
            <SimpleIcons.FontAwesome.chevron-right />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/doctor-withdrawals')}>
            <SimpleIcons.FontAwesome.money />
            <Text style={styles.menuText}>Withdraw Earnings</Text>
            <SimpleIcons.FontAwesome.chevron-right />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/privacy-settings')}>
            <SimpleIcons.FontAwesome.lock />
            <Text style={styles.menuText}>Privacy Settings</Text>
            <SimpleIcons.FontAwesome.chevron-right />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/privacy-settings')}>
            <SimpleIcons.FontAwesome.cog />
            <Text style={styles.menuText}>Settings</Text>
            <SimpleIcons.FontAwesome.chevron-right />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <SimpleIcons.FontAwesome.sign-out />
            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
            <SimpleIcons.FontAwesome.chevron-right />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeContent();
      case 'appointments':
        return renderAppointmentsContent();
      case 'messages':
        return renderMessagesContent();
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
            icon="calendar"
            label="Appointments"
            isActive={activeTab === 'appointments'}
            onPress={() => setActiveTab('appointments')}
          />
          <Tab
            icon="comments"
            label="Messages"
            isActive={activeTab === 'messages'}
            onPress={() => setActiveTab('messages')}
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
  appointmentTime: {
    fontSize: 14,
    color: '#666',
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
    paddingHorizontal: 4,
  },
  activeTab: {
    // Active state styling is handled by color changes
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  pendingRequestsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pendingRequestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingRequestsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
  },
  pendingRequestsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  viewRequestsButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  viewRequestsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
  patientInfo: {
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
  chatButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
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
    padding: 16,
  },
  messagesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  messagesSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  patientsList: {
    flex: 1,
  },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedPatientCard: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  patientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  patientCardType: {
    fontSize: 14,
    color: '#666',
  },
  patientCardStatus: {
    backgroundColor: '#34C759',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  patientCardDetails: {
    marginBottom: 8,
  },
  patientDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientDetailText: {
    fontSize: 14,
    color: '#666',
  },
  patientCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  startChatButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  startChatButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  chatSection: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 16,
  },
  closeChatButton: {
    padding: 8,
  },
}); 