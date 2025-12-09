import { SimpleIcons } from '../components/SimpleIcons';
import { router } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
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
import ConfirmDialog from '../components/ConfirmDialog';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { DoctorProfile, firestoreService } from '../services/firestoreService';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 1200 : width;
const isLargeScreen = width > 768;

interface Notification {
  id: string;
  type: 'general' | 'specific';
  title: string;
  message: string;
  timestamp: Date;
  doctorId?: string;
  doctorName?: string;
}

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

export default function AdminDashboard() {
  const { user, userData, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [pendingDoctors, setPendingDoctors] = useState<DoctorProfile[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [doctorsCount, setDoctorsCount] = useState(0);
  const [patientsCount, setPatientsCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      const fetchStats = async () => {
        try {
          const [totalUsers, doctors, patients, pendingDoctors] = await Promise.all([
            firestoreService.getTotalUsersCount(),
            firestoreService.getDoctorsCount(),
            firestoreService.getPatientsCount(),
            firestoreService.getPendingDoctors()
          ]);
          
          setTotalUsersCount(totalUsers);
          setDoctorsCount(doctors);
          setPatientsCount(patients);
          setPendingDoctors(pendingDoctors);
          setPendingCount(pendingDoctors.length);
        } catch (error) {
          console.error('Error fetching dashboard stats:', error);
          setTotalUsersCount(0);
          setDoctorsCount(0);
          setPatientsCount(0);
          setPendingDoctors([]);
          setPendingCount(0);
        }
      };
      
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'verification') {
      setLoadingDoctors(true);
      firestoreService.getPendingDoctors()
        .then(doctors => {
          setPendingDoctors(doctors);
          setPendingCount(doctors.length);
        })
        .catch(() => {
          setPendingDoctors([]);
          setPendingCount(0);
        })
        .finally(() => setLoadingDoctors(false));
    }
  }, [activeTab]);

  // Real-time notifications listener
  useEffect(() => {
    if (!user || !db) return;

    const unsubscribe = onSnapshot(
      query(
        collection(db!, 'users'),
        where('userType', '==', 'doctor'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        const newPendingDoctors = snapshot.docs.map(doc => doc.data() as DoctorProfile);
        setPendingDoctors(newPendingDoctors);
        setPendingCount(newPendingDoctors.length);

        // Check for new notifications
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newDoctor = change.doc.data() as DoctorProfile;
            const timestamp = Date.now();
            const newNotification: Notification = {
              id: `${change.doc.id}-${timestamp}`,
              type: 'specific',
              title: 'New Doctor Verification Request',
              message: `${newDoctor.displayName || newDoctor.email} is waiting for verification`,
              timestamp: new Date(),
              doctorId: newDoctor.uid,
              doctorName: newDoctor.displayName || newDoctor.email
            };
            
            setNotifications(prev => {
              // Check if notification with this ID already exists
              const notificationExists = prev.some(n => n.id === newNotification.id);
              if (notificationExists) {
                return prev; // Don't add duplicate
              }
              
              const updatedNotifications = [newNotification, ...prev.slice(0, 9)]; // Keep last 10 notifications
              setNotificationCount(updatedNotifications.length);
              return updatedNotifications;
            });
          }
        });
      },
      (error) => {
        console.error('Error listening to pending doctors:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      setShowConfirm(true);
    } else {
      // Use Alert for native
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

  const handleApprove = async (doctor: DoctorProfile) => {
    try {
      await firestoreService.updateUser(doctor.uid, { status: 'approved' });
      setPendingDoctors(pendingDoctors.filter(d => d.uid !== doctor.uid));
      Alert.alert('Success', 'Doctor approved successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to approve doctor.');
    }
  };

  const handleReject = async (doctor: DoctorProfile) => {
    try {
      await firestoreService.updateUser(doctor.uid, { status: 'rejected' });
      setPendingDoctors(pendingDoctors.filter(d => d.uid !== doctor.uid));
      Alert.alert('Success', 'Doctor rejected.');
    } catch (error) {
      Alert.alert('Error', 'Failed to reject doctor.');
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setNotificationCount(0);
  };

  const NotificationBanner = () => {
    if (notifications.length === 0) return null;

    return (
      <View style={styles.notificationBanner}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationTitleContainer}>
            <SimpleIcons.FontAwesome.bell />
            <Text style={styles.notificationTitle}>Recent Notifications</Text>
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={clearNotifications} style={styles.clearButton}>
            <SimpleIcons.FontAwesome.times />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
          {notifications.map((notification, idx) => (
            <TouchableOpacity
              key={notification.id + '-' + idx}
              style={styles.notificationItem}
              onPress={() => {
                if (notification.doctorId) {
                  router.push({ pathname: '/(tabs)/doctor-details/[uid]', params: { uid: notification.doctorId } });
                }
                setNotifications(prev => {
                  const updatedNotifications = prev.filter(n => n.id !== notification.id);
                  setNotificationCount(updatedNotifications.length);
                  return updatedNotifications;
                });
              }}
            >
              <View style={styles.notificationContent}>
                <Text style={styles.notificationMessageTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <Text style={styles.notificationTime}>
                  {notification.timestamp.toLocaleTimeString()}
                </Text>
              </View>
              <SimpleIcons.FontAwesome.chevron-right />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderDashboardSummary = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome Admin!</Text>
        <Text style={styles.subtitle}>Dashboard Summary</Text>
      </View>
      {/* Add summary stats here */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>System Overview</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardLeft]}>
            <Text style={styles.statNumber}>{totalUsersCount}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{doctorsCount}</Text>
            <Text style={styles.statLabel}>Doctors</Text>
          </View>
          <View style={[styles.statCard, styles.statCardLeft]}>
            <Text style={styles.statNumber}>{patientsCount}</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending Verifications</Text>
          </View>
        </View>
        <NotificationBanner />
      </View>
    </ScrollView>
  );

  const renderVerificationQueue = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Doctor Verification Queue</Text>
        <Text style={styles.subtitle}>Review and verify new doctors</Text>
      </View>
      {loadingDoctors ? (
        <View style={styles.placeholderBox}><Text>Loading...</Text></View>
      ) : pendingDoctors.length === 0 ? (
        <View style={styles.placeholderBox}><Text>No pending doctors.</Text></View>
      ) : (
        <View style={styles.cardsGrid}>
          {pendingDoctors.map((doctor, idx) => (
            <View key={doctor.uid + '-' + idx} style={styles.doctorCard}>
            <Text style={styles.doctorName} onPress={() => router.push({ pathname: '/(tabs)/doctor-details/[uid]', params: { uid: doctor.uid } })}>{doctor.displayName || doctor.email}</Text>
            <Text>Email: {doctor.email}</Text>
            <Text>Specialization: {doctor.specialization || 'N/A'}</Text>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <TouchableOpacity style={[styles.actionButton, styles.detailsButton]} onPress={() => router.push({ pathname: '/(tabs)/doctor-details/[uid]', params: { uid: doctor.uid } })}>
                <Text style={styles.actionButtonText}>More Details</Text>
              </TouchableOpacity>
            </View>
          </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderReportsAlerts = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Reports & Alerts</Text>
        <Text style={styles.subtitle}>View system reports and alerts</Text>
      </View>
      {/* Add reports and alerts here */}
      <View style={styles.placeholderBox}>
        <Text>Reports and alerts will appear here.</Text>
      </View>
    </ScrollView>
  );

  const renderPayments = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Payment Oversight</Text>
        <Text style={styles.subtitle}>Monitor and manage payments</Text>
      </View>
      {/* Add payment oversight here */}
      <View style={styles.placeholderBox}>
        <Text>Payment information will appear here.</Text>
      </View>
    </ScrollView>
  );

  const renderProfile = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Profile</Text>
        <Text style={styles.subtitle}>Manage your admin account</Text>
      </View>
      <View style={styles.profileSection}>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <SimpleIcons.FontAwesome.user />
            <Text style={styles.profileName}>{user?.displayName || user?.email?.split('@')[0] || 'Admin'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-profile')}>
            <SimpleIcons.FontAwesome.eye />
            <Text style={styles.menuText}>View Profile</Text>
            <SimpleIcons.FontAwesome.chevron-right />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/privacy-settings')}>
            <SimpleIcons.FontAwesome.lock />
            <Text style={styles.menuText}>Privacy Settings</Text>
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
        return renderDashboardSummary();
      case 'verification':
        return renderVerificationQueue();
      case 'reports':
        return renderReportsAlerts();
      case 'payments':
        return renderPayments();
      case 'profile':
        return renderProfile();
      default:
        return renderDashboardSummary();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        {renderContent()}
        <View style={styles.bottomNav}>
          <Tab
            icon="home"
            label="Summary"
            isActive={activeTab === 'home'}
            onPress={() => setActiveTab('home')}
          />
          <Tab
            icon="user-md"
            label="Verification"
            isActive={activeTab === 'verification'}
            onPress={() => setActiveTab('verification')}
          />
          <Tab
            icon="bar-chart"
            label="Reports"
            isActive={activeTab === 'reports'}
            onPress={() => setActiveTab('reports')}
          />
          <Tab
            icon="credit-card"
            label="Payments"
            isActive={activeTab === 'payments'}
            onPress={() => setActiveTab('payments')}
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
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  sectionTitle: {
    fontSize: isLargeScreen ? 22 : 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
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
    marginBottom: 15,
    width: isLargeScreen ? '23%' : '48%',
    minWidth: 140,
  },
  statCardLeft: {
    marginRight: isLargeScreen ? 0 : '4%',
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
  placeholderBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isWeb ? 40 : 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileSection: {
    marginTop: 20,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileHeader: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  menuSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  logoutText: {
    color: '#FF3B30',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  activeTab: {},
  tabLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activeTabLabel: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  doctorCard: {
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
    marginRight: '2%', // for spacing, last item in row will wrap
  },
  doctorName: {
    fontSize: isLargeScreen ? 18 : 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    marginRight: 10,
  },
  detailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 24,
    minWidth: undefined,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: isLargeScreen ? 14 : 12,
    fontWeight: 'bold',
  },
  notificationBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 300,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  notificationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    flex: 1,
    marginLeft: 8,
  },
  notificationBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  notificationBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  clearButton: {
    padding: 4,
  },
  notificationList: {
    maxHeight: 200,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationMessageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 10,
    color: '#999',
  },
}); 