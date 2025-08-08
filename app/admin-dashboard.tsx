import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/hooks/useAlert';
import { adminService, PendingDoctor } from '@/services/adminService';
import authService from '@/services/authService';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    BackHandler,
    Dimensions,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import AlertDialog from '../components/AlertDialog';
import ConfirmDialog from '../components/ConfirmDialog';

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
  const { alertState, showAlert, hideAlert, showSuccess, showError } = useAlert();
  const [activeTab, setActiveTab] = useState('home');
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [doctorsCount, setDoctorsCount] = useState(0);
  const [patientsCount, setPatientsCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');

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

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      // console.log('AdminDashboard: User loaded, fetching stats and pending doctors');
      const fetchStats = async () => {
        try {
          const statsResponse = await adminService.getDashboardStats();
          // console.log('AdminDashboard: Stats response:', statsResponse);
          if (statsResponse.success && statsResponse.data) {
            const stats = statsResponse.data;
            // console.log('AdminDashboard: Stats data:', stats);
            setTotalUsersCount(stats.total_users || 0);
            setDoctorsCount(stats.total_doctors || 0);
            setPatientsCount(stats.total_patients || 0);
          } else {
            // console.log('AdminDashboard: Invalid stats response');
          }
        } catch (error) {
          console.error('Error fetching dashboard stats:', error);
          setTotalUsersCount(0);
          setDoctorsCount(0);
          setPatientsCount(0);
        }
      };
      
      fetchStats();
      
      // Also load pending doctors if we're on the verification tab
      if (activeTab === 'verification') {
        fetchPendingDoctors();
      }
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'verification') {
      // console.log('AdminDashboard: Loading pending doctors for verification tab');
      fetchPendingDoctors();
    }
  }, [activeTab]);

  // Also load pending doctors when component mounts if verification tab is active
  useEffect(() => {
    if (user && activeTab === 'verification') {
      // console.log('AdminDashboard: Initial load of pending doctors');
      fetchPendingDoctors();
    }
  }, [user]);

  const fetchPendingDoctors = async () => {
      // console.log('AdminDashboard: fetchPendingDoctors called');
      setLoadingDoctors(true);
    try {
      // console.log('AdminDashboard: Calling adminService.getPendingDoctors');
      const response = await adminService.getPendingDoctors(1, searchQuery);
      // console.log('AdminDashboard: Response received:', {
      //   success: response.success,
      //   hasData: !!response.data,
      //   dataLength: response.data?.data?.length,
      //   total: response.data?.total
      // });
      
      if (response.success && response.data) {
        // console.log('AdminDashboard: Setting pending doctors:', response.data.data.length);
        setPendingDoctors(response.data.data);
        setPendingCount(response.data.total);
      } else {
        // console.log('AdminDashboard: No valid response data');
        setPendingDoctors([]);
        setPendingCount(0);
      }
    } catch (error) {
      console.error('AdminDashboard: Error fetching pending doctors:', error);
      setPendingDoctors([]);
      setPendingCount(0);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Fetch doctors when search query changes
  useEffect(() => {
    if (activeTab === 'verification') {
      const timeoutId = setTimeout(() => {
        fetchPendingDoctors();
      }, 500); // Debounce search

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, activeTab]);

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

  const handleApprove = async (doctor: PendingDoctor) => {
    try {
      await adminService.approveDoctor(doctor.id);
      setPendingDoctors(pendingDoctors.filter(d => d.id !== doctor.id));
      showSuccess('Success', 'Doctor approved successfully.');
    } catch (error) {
      showError('Error', 'Failed to approve doctor.');
    }
  };

  const handleReject = async (doctor: PendingDoctor) => {
    try {
      await adminService.rejectDoctor(doctor.id);
      setPendingDoctors(pendingDoctors.filter(d => d.id !== doctor.id));
      showSuccess('Success', 'Doctor rejected.');
    } catch (error) {
      showError('Error', 'Failed to reject doctor.');
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
            <FontAwesome name="bell" size={20} color="#4CAF50" />
            <Text style={styles.notificationTitle}>Recent Notifications</Text>
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={clearNotifications} style={styles.clearButton}>
            <FontAwesome name="times" size={16} color="#666" />
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
              <FontAwesome name="chevron-right" size={16} color="#666" />
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

  const renderVerificationQueue = () => {
    // console.log('AdminDashboard: renderVerificationQueue called, pendingDoctors:', pendingDoctors.length);
    
    // Filter doctors based on search query
    const filteredDoctors = pendingDoctors.filter(doctor => {
      const searchLower = searchQuery.toLowerCase();
      return (
        (doctor.display_name || '').toLowerCase().includes(searchLower) ||
        doctor.email.toLowerCase().includes(searchLower) ||
        (doctor.specialization || '').toLowerCase().includes(searchLower)
      );
    });
    
    // console.log('AdminDashboard: Filtered doctors:', filteredDoctors.length);

    // Sort doctors based on selected sort option
    const sortedDoctors = [...filteredDoctors].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.display_name || a.email).localeCompare(b.display_name || b.email);
        case 'email':
          return a.email.localeCompare(b.email);
        case 'specialization':
          return (a.specialization || '').localeCompare(b.specialization || '');
        case 'date':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        default:
          return 0;
      }
    });

    return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Doctor Verification Queue</Text>
        <Text style={styles.subtitle}>Review and verify new doctors</Text>
      </View>

        {/* Search and Sort Controls */}
        <View style={styles.searchSortContainer}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <FontAwesome name="search" size={16} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, or specialization..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <FontAwesome name="times" size={16} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* Sort Options */}
          <View style={styles.sortContainer}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortOptions}>
              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'name' && styles.activeSortOption]}
                onPress={() => setSortBy('name')}
              >
                <Text style={[styles.sortOptionText, sortBy === 'name' && styles.activeSortOptionText]}>
                  Name
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'email' && styles.activeSortOption]}
                onPress={() => setSortBy('email')}
              >
                <Text style={[styles.sortOptionText, sortBy === 'email' && styles.activeSortOptionText]}>
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'specialization' && styles.activeSortOption]}
                onPress={() => setSortBy('specialization')}
              >
                <Text style={[styles.sortOptionText, sortBy === 'specialization' && styles.activeSortOptionText]}>
                  Specialization
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'date' && styles.activeSortOption]}
                onPress={() => setSortBy('date')}
              >
                <Text style={[styles.sortOptionText, sortBy === 'date' && styles.activeSortOptionText]}>
                  Date
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Results Count */}
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsText}>
              {filteredDoctors.length} of {pendingDoctors.length} doctors
            </Text>
          </View>
        </View>

      {loadingDoctors ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
        ) : sortedDoctors.length === 0 ? (
        <View style={styles.emptyState}>
            <FontAwesome 
              name={searchQuery.length > 0 ? "search" : "check-circle"} 
              size={48} 
              color={searchQuery.length > 0 ? "#666" : "#34C759"} 
            />
            <Text style={styles.emptyStateTitle}>
              {searchQuery.length > 0 ? 'No Results Found' : 'No Pending Verifications'}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {searchQuery.length > 0 
                ? 'Try adjusting your search terms' 
                : 'All doctor applications have been reviewed'
              }
            </Text>
        </View>
      ) : (
        <View style={styles.doctorList}>
            {sortedDoctors.map((doctor, idx) => (
            <View key={doctor.id + '-' + idx} style={styles.doctorCard}>
              <View style={styles.doctorInfo}>
                {doctor.profile_picture_url ? (
                  <Image 
                    source={{ uri: doctor.profile_picture_url }} 
                    style={styles.doctorAvatar}
                    resizeMode="cover"
                  />
                ) : (
                  <FontAwesome name="user-md" size={24} color="#4CAF50" />
                )}
                <View style={styles.doctorDetails}>
                  <Text style={styles.doctorName}>{doctor.display_name || doctor.email}</Text>
                  <Text style={styles.doctorEmail}>{doctor.email}</Text>
                  <Text style={styles.doctorSpecialization}>
                    {doctor.specialization || 'Not specified'}
                  </Text>
                </View>
              </View>
              <View style={styles.actionButtons}>
              <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => router.push({ pathname: '/doctor-approval/[uid]', params: { uid: doctor.id.toString() } })}
                >
                  <FontAwesome name="eye" size={16} color="#007AFF" />
                  <Text style={styles.viewButtonText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApprove(doctor)}
                >
                  <FontAwesome name="check-circle" size={20} color="#4CAF50" />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReject(doctor)}
                >
                  <FontAwesome name="times-circle" size={20} color="#FF3B30" />
                  <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
  };

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
            <FontAwesome name="user" size={60} color="#4CAF50" />
            <Text style={styles.profileName}>{user?.display_name || user?.email?.split('@')[0] || 'Admin'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-profile')}>
            <FontAwesome name="eye" size={20} color="#4CAF50" />
            <Text style={styles.menuText}>View Profile</Text>
            <FontAwesome name="chevron-right" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/privacy-settings')}>
            <FontAwesome name="lock" size={20} color="#4CAF50" />
            <Text style={styles.menuText}>Privacy Settings</Text>
            <FontAwesome name="chevron-right" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <FontAwesome name="sign-out" size={20} color="#FF3B30" />
            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
            <FontAwesome name="chevron-right" size={16} color="#666" />
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
  doctorList: {
    marginBottom: 20,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  doctorDetails: {
    flex: 1,
    marginLeft: 12,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  doctorEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  doctorSpecialization: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginLeft: 8,
  },
  searchSortContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '400',
  },
  sortContainer: {
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  sortOptions: {
    flexDirection: 'row',
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F3F4',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  activeSortOption: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  sortOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeSortOptionText: {
    color: '#FFFFFF',
  },
  resultsInfo: {
    alignItems: 'flex-end',
  },
  resultsText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
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
    marginLeft: 8,
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
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F7',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginLeft: 8,
  },
  doctorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
}); 