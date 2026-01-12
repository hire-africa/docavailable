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
import { Notification as ApiNotification, notificationApiService } from '../services/notificationApiService';
import { RealTimeEventService } from '../services/realTimeEventService';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 1200 : width;
const isLargeScreen = width > 768;

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  timestamp: Date;
  data?: Record<string, any>;
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  // Subscribe to real-time events
  useEffect(() => {
    const unsubscribe = RealTimeEventService.subscribe((event) => {
      console.log('📡 [Notifications] Received real-time event:', event);

      // Reload notifications when new events arrive
      loadNotifications();
    });

    return unsubscribe;
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

      console.log('🔔 Loading notifications from backend API...');
      const response = await notificationApiService.getNotifications(1, 50, false);
      console.log('🔔 API response:', response);

      if (response.success && response.data) {
        // Transform API notifications to our interface format
        const apiNotifications: Notification[] = response.data.notifications.map((n: ApiNotification) => {
          // Extract type from notification data or use default
          const notificationType = n.data?.type || n.type || 'system';

          return {
            id: n.id.toString(),
            title: n.title || n.data?.title || 'Notification',
            message: n.body || n.data?.body || n.data?.message || '',
            type: notificationType,
            isRead: !!n.read_at,
            timestamp: new Date(n.created_at),
            data: n.data
          };
        });

        // Filter out chat message notifications
        const filteredNotifications = apiNotifications.filter(n =>
          !['message', 'new_message', 'chat_message'].includes(n.type)
        );

        console.log('🔔 Transformed notifications:', apiNotifications.length, 'Filtered:', filteredNotifications.length);
        setNotifications(filteredNotifications);
      } else {
        console.log('🔔 No notifications found or API error');
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Don't show alert for auth errors - just show empty list
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };


  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };


  const markAllAsRead = async () => {
    try {
      await notificationApiService.markAllAsRead();
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
          onPress: async () => {
            try {
              // Call API to delete from backend
              await notificationApiService.deleteNotification(parseInt(notificationId));
              // Update local state
              setNotifications(prev =>
                prev.filter(notification => notification.id !== notificationId)
              );
            } catch (error) {
              console.error('Error deleting notification:', error);
              // Still remove from local state even if API fails
              setNotifications(prev =>
                prev.filter(notification => notification.id !== notificationId)
              );
            }
          }
        }
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    // Map notification types to appropriate FontAwesome icons
    switch (type) {
      // Appointment notifications
      case 'appointment':
      case 'appointment_created':
      case 'appointment_confirmed':
        return 'calendar-check-o';
      case 'appointment_cancelled':
        return 'calendar-times-o';
      case 'appointment_reminder':
      case 'reminder':
        return 'clock-o';
      case 'appointment_reschedule':
      case 'reschedule_proposed':
      case 'reschedule_accepted':
      case 'reschedule_rejected':
        return 'calendar';
      case 'appointment_expired':
        return 'calendar-minus-o';

      // Wallet/Payment notifications
      case 'wallet':
      case 'payment':
      case 'payment_received':
        return 'dollar';
      case 'withdrawal_requested':
      case 'withdrawal_processed':
        return 'bank';
      case 'withdrawal_failed':
        return 'exclamation-circle';
      case 'bonus_received':
        return 'gift';

      // Subscription notifications
      case 'subscription':
      case 'subscription_purchased':
      case 'subscription_activated':
        return 'star';
      case 'subscription_expired':
      case 'subscription_expiring':
        return 'star-half-o';
      case 'subscription_renewed':
        return 'refresh';

      // Text session notifications
      case 'text_session':
      case 'text_session_started':
      case 'session_started':
        return 'comments';
      case 'text_session_ended':
      case 'session_ended':
        return 'comment-o';
      case 'session_warning':
      case 'session_reminder':
        return 'hourglass-half';

      // Message notifications
      case 'message':
      case 'new_message':
      case 'chat_message':
        return 'envelope';

      // Call notifications
      case 'call':
      case 'incoming_call':
        return 'phone';
      case 'call_failed':
      case 'missed_call':
        return 'phone-square';
      case 'video_call':
        return 'video-camera';

      // Welcome/System notifications
      case 'welcome':
        return 'hand-peace-o';
      case 'system':
      case 'custom':
        return 'info-circle';
      case 'security':
        return 'shield';
      case 'alert':
        return 'exclamation-triangle';
      case 'success':
        return 'check-circle';

      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    // Vibrant color palette for different notification types
    switch (type) {
      // Appointment notifications - Green shades
      case 'appointment':
      case 'appointment_created':
      case 'appointment_confirmed':
        return '#10B981'; // Emerald green
      case 'appointment_cancelled':
        return '#EF4444'; // Red
      case 'appointment_reminder':
      case 'reminder':
        return '#8B5CF6'; // Purple
      case 'appointment_reschedule':
      case 'reschedule_proposed':
      case 'reschedule_accepted':
        return '#F59E0B'; // Amber
      case 'reschedule_rejected':
      case 'appointment_expired':
        return '#EF4444'; // Red

      // Wallet/Payment notifications - Gold/Orange shades
      case 'wallet':
      case 'payment':
      case 'payment_received':
        return '#F59E0B'; // Amber gold
      case 'withdrawal_requested':
      case 'withdrawal_processed':
        return '#3B82F6'; // Blue
      case 'withdrawal_failed':
        return '#EF4444'; // Red
      case 'bonus_received':
        return '#10B981'; // Green

      // Subscription notifications - Premium purple/gold
      case 'subscription':
      case 'subscription_purchased':
      case 'subscription_activated':
        return '#8B5CF6'; // Purple (premium feel)
      case 'subscription_expired':
      case 'subscription_expiring':
        return '#F59E0B'; // Amber warning
      case 'subscription_renewed':
        return '#10B981'; // Green success

      // Text session notifications - Blue shades
      case 'text_session':
      case 'text_session_started':
      case 'session_started':
        return '#3B82F6'; // Blue
      case 'text_session_ended':
      case 'session_ended':
        return '#6B7280'; // Gray
      case 'session_warning':
      case 'session_reminder':
        return '#F59E0B'; // Amber warning

      // Message notifications - Blue shades
      case 'message':
      case 'new_message':
      case 'chat_message':
        return '#06B6D4'; // Cyan

      // Call notifications - Teal shades
      case 'call':
      case 'incoming_call':
        return '#14B8A6'; // Teal
      case 'call_failed':
      case 'missed_call':
        return '#EF4444'; // Red
      case 'video_call':
        return '#8B5CF6'; // Purple

      // Welcome notification - Special teal
      case 'welcome':
        return '#14B8A6'; // Teal (brand color)

      // System notifications
      case 'system':
      case 'custom':
        return '#6B7280'; // Gray
      case 'security':
        return '#EC4899'; // Pink
      case 'alert':
        return '#EF4444'; // Red
      case 'success':
        return '#10B981'; // Green

      default:
        return '#6B7280'; // Gray
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
                <View
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.isRead && styles.unreadNotification
                  ]}
                >
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <View style={[
                        styles.notificationIcon,
                        { backgroundColor: getNotificationColor(notification.type) + '20' }
                      ]}>
                        <FontAwesome
                          name={getNotificationIcon(notification.type) as any}
                          size={22}
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
                </View>
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
});
