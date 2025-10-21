import { FontAwesome } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService, Notification as ServiceNotification } from '../services/notificationService';
import { Activity, generateUserActivities } from '../utils/activityUtils';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 1200 : width;
const isLargeScreen = width > 768;

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'appointment' | 'message' | 'system' | 'payment' | 'reminder';
  isRead: boolean;
  timestamp: Date;
  actionUrl?: string;
}

export default function Notifications() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false 
        }} 
      />
      <NotificationsContent />
    </>
  );
}

function NotificationsContent() {
  const { user, userData } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  // Mark all notifications as read when page opens
  useEffect(() => {
    if (notifications.length > 0) {
      markAllAsRead();
    }
  }, [notifications.length]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      if (!user || !userData) {
        setNotifications([]);
        return;
      }

      // Load notifications from service filtered by user type
      const userType = userData.role === 'doctor' ? 'doctor' : 'patient';
      console.log('🔔 Loading notifications for user type:', userType, 'user ID:', userData.id);
      let serviceNotifications = await NotificationService.getNotificationsForUser(userType, userData.id?.toString());
      console.log('🔔 Service notifications received:', serviceNotifications.length, serviceNotifications);
      
      // Always generate automated notifications from activities
      const generatedActivities = generateUserActivities(
        userType,
        userData,
        [], // appointments - would be loaded from API
        [], // messages - would be loaded from API
        null // subscription - would be loaded from API
      );

      setActivities(generatedActivities);

      // Convert activities to notifications
      const activityNotifications: ServiceNotification[] = generatedActivities.map((activity, index) => {
        const notificationType = mapActivityTypeToNotificationType(activity.type);
        console.log('🔔 Mapping activity type:', activity.type, 'to notification type:', notificationType);
        return {
          id: `activity_${activity.id}`,
          title: activity.title,
          message: activity.description,
          type: notificationType as any,
          isRead: index > 2, // Mark older activities as read
          timestamp: activity.timestamp,
          actionUrl: getActionUrlForActivity(activity.type)
        };
      });

      // Add some system notifications
      const systemNotifications: ServiceNotification[] = [
        {
          id: 'system_1',
          title: 'Welcome to DocAvailable!',
          message: 'Thank you for joining DocAvailable. Start by exploring our features and booking your first appointment.',
          type: 'system',
          isRead: true,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
        }
      ];

      // Combine automated notifications with service notifications
      const automatedNotifications = [...activityNotifications, ...systemNotifications];
      console.log('🔔 Automated notifications generated:', automatedNotifications.length, automatedNotifications);
      
      // Merge with existing notifications, avoiding duplicates
      const allNotifications = [...serviceNotifications];
      automatedNotifications.forEach(autoNotif => {
        const exists = allNotifications.find(n => n.id === autoNotif.id);
        if (!exists) {
          allNotifications.push(autoNotif);
        }
      });

      // Sort by timestamp (newest first)
      allNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      console.log('🔔 Final combined notifications:', allNotifications.length, allNotifications);

      // Save combined notifications
      await NotificationService.saveNotifications(allNotifications);
      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const mapActivityTypeToNotificationType = (activityType: string): 'appointment' | 'message' | 'system' | 'payment' | 'reminder' | 'wallet' => {
    switch (activityType) {
      case 'appointment':
        return 'appointment';
      case 'message':
        return 'message';
      case 'wallet':
        return 'wallet';
      case 'welcome':
        return 'system';
      default:
        return 'system';
    }
  };

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const deleteNotification = (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setNotifications(prev => 
              prev.filter(notification => notification.id !== notificationId)
            );
          }
        }
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    console.log('🔔 Getting icon for notification type:', type);
    switch (type) {
      case 'appointment':
        return 'calendar';
      case 'message':
        return 'comments';
      case 'payment':
        return 'dollar';
      case 'wallet':
        return 'dollar';
      case 'reminder':
        return 'clock-o';
      case 'system':
        return 'info-circle';
      case 'general':
        return 'bell';
      case 'alert':
        return 'exclamation-triangle';
      case 'info':
        return 'info-circle';
      case 'success':
        return 'check-circle';
      case 'health':
        return 'heart';
      case 'security':
        return 'shield';
      case 'appointment_booked':
        return 'calendar-check-o';
      case 'appointment_cancelled':
        return 'calendar-times-o';
      case 'new_message':
        return 'envelope';
      case 'payment_received':
        return 'money';
      case 'wallet_transaction':
        return 'wallet';
      default:
        console.log('🔔 Using default bell icon for type:', type);
        return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'appointment':
        return '#4CAF50';
      case 'message':
        return '#2196F3';
      case 'payment':
        return '#FF9800';
      case 'wallet':
        return '#FF9800';
      case 'reminder':
        return '#9C27B0';
      case 'system':
        return '#607D8B';
      case 'general':
        return '#666';
      case 'alert':
        return '#F44336';
      case 'info':
        return '#2196F3';
      case 'success':
        return '#4CAF50';
      case 'health':
        return '#E91E63';
      case 'security':
        return '#FF5722';
      case 'appointment_booked':
        return '#4CAF50';
      case 'appointment_cancelled':
        return '#F44336';
      case 'new_message':
        return '#2196F3';
      case 'payment_received':
        return '#4CAF50';
      case 'wallet_transaction':
        return '#FF9800';
      default:
        return '#666';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  // Filter notifications based on active filter
  const filteredNotifications = activeFilter === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity 
          style={styles.headerRightButton}
          onPress={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <FontAwesome 
            name="check" 
            size={18} 
            color={unreadCount > 0 ? "#4CAF50" : "#999"} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'all' && styles.activeFilterTab
            ]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[
              styles.filterTabText,
              activeFilter === 'all' && styles.activeFilterTabText
            ]}>
              All ({notifications.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'unread' && styles.activeFilterTab
            ]}
            onPress={() => setActiveFilter('unread')}
          >
            <Text style={[
              styles.filterTabText,
              activeFilter === 'unread' && styles.activeFilterTabText
            ]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4CAF50']}
              tintColor="#4CAF50"
            />
          }
        >

          {/* Notifications List */}
          {filteredNotifications.length > 0 ? (
            <View style={styles.notificationsList}>
              {filteredNotifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.isRead && styles.unreadNotification
                  ]}
                  onPress={() => {
                    markAsRead(notification.id);
                    if (notification.actionUrl) {
                      router.push(notification.actionUrl as any);
                    }
                  }}
                >
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <View style={[
                        styles.notificationIcon,
                        { backgroundColor: getNotificationColor(notification.type) + '20' }
                      ]}>
        <FontAwesome 
          name={getNotificationIcon(notification.type) as any} 
          size={16} 
          color={getNotificationColor(notification.type)} 
        />
                      </View>
                      <View style={styles.notificationText}>
                        <Text style={[
                          styles.notificationTitle,
                          !notification.isRead && styles.unreadTitle
                        ]}>
                          {notification.title}
                        </Text>
                        <Text style={styles.notificationMessage}>
                          {notification.message}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {formatTimestamp(notification.timestamp)}
                        </Text>
                      </View>
                      {!notification.isRead && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteNotification(notification.id)}
                  >
                    <FontAwesome name="trash" size={14} color="#999" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <FontAwesome name="bell-slash" size={48} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>
                {activeFilter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeFilter === 'unread' 
                  ? 'You\'re all caught up! No unread notifications.' 
                  : 'You\'re all caught up! New notifications will appear here.'
                }
              </Text>
        <View style={styles.testButtonsContainer}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={loadNotifications}
          >
            <FontAwesome name="refresh" size={16} color="#4CAF50" />
            <Text style={styles.testButtonText}>Test Load Notifications</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, {backgroundColor: '#E3F2FD'}]}
            onPress={() => {
              const testNotification: ServiceNotification = {
                id: 'test_' + Date.now(),
                title: 'Test Admin Notification',
                message: 'This is a test notification from admin',
                type: 'system' as any,
                timestamp: new Date(),
                isRead: false,
                actionUrl: undefined,
                recipientType: 'all' as any,
                recipientId: undefined,
                sentBy: 'Test'
              };
              setNotifications(prev => [testNotification, ...prev]);
            }}
          >
            <FontAwesome name="plus" size={16} color="#2196F3" />
            <Text style={[styles.testButtonText, {color: '#2196F3'}]}>Add Test Notification</Text>
          </TouchableOpacity>
        </View>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
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
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? 40 : 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  headerRightButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  unreadText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationsList: {
    gap: 12,
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    backgroundColor: '#F8FFF8',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: isWeb ? 40 : 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#4CAF50',
  },
  filterTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeFilterTabText: {
    color: '#fff',
  },
  testButtonsContainer: {
    gap: 12,
    marginTop: 16,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  testButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
});
