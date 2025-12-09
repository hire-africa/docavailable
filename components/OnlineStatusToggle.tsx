import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { environment } from '../config/environment';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import onDutyNotificationService from '../services/onDutyNotificationService';

interface OnlineStatusToggleProps {
  style?: any;
  showLabel?: boolean;
  compact?: boolean;
}

export default function OnlineStatusToggle({
  style,
  showLabel = true,
  compact = false
}: OnlineStatusToggleProps) {
  const { user, token } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchOnlineStatus = async () => {
    if (!user || user.role !== 'doctor') return;

    setLoading(true);
    try {
      // You can fetch the current status from user data or make an API call
      setIsOnline(user.is_online_for_instant_sessions || false);
    } catch (error) {
      console.error('Error fetching online status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!user || user.role !== 'doctor') return;

    setUpdating(true);
    try {
      const response = await fetch(`${environment.LARAVEL_API_URL}/api/text-sessions/toggle-online`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        const nowOnline = data.data.is_online;
        setIsOnline(nowOnline);

        // Show/hide on-duty notification
        if (nowOnline) {
          onDutyNotificationService.showOnDutyNotification(user.first_name || user.display_name);
        } else {
          onDutyNotificationService.hideOnDutyNotification();
        }

        Alert.alert(
          'Status Updated',
          `You are now ${nowOnline ? 'online' : 'offline'} for instant sessions.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error toggling online status:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchOnlineStatus();
  }, [user]);

  if (!user || user.role !== 'doctor') {
    return null;
  }

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#4CAF50" />
      </View>
    );
  }

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactContainer,
          { backgroundColor: isOnline ? Colors.success : Colors.gray },
          style,
        ]}
        onPress={toggleOnlineStatus}
        disabled={updating}
      >
        {updating ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons
            name={isOnline ? 'radio-button-on' : 'radio-button-off'}
            size={16}
            color="white"
          />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={toggleOnlineStatus}
      disabled={updating}
    >
      <View style={styles.content}>
        <View style={styles.statusSection}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.success : Colors.gray }]} />
          {updating ? (
            <ActivityIndicator size="small" color="#4CAF50" style={styles.loading} />
          ) : (
            <Ionicons
              name={isOnline ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={isOnline ? Colors.success : Colors.gray}
            />
          )}
        </View>

        {showLabel && (
          <View style={styles.labelSection}>
            <Text style={[styles.statusText, { color: isOnline ? Colors.success : Colors.gray }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text style={styles.descriptionText}>
              {isOnline ? 'Available for instant sessions' : 'Not available for instant sessions'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  loading: {
    marginLeft: 8,
  },
  labelSection: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  descriptionText: {
    fontSize: 12,
    color: Colors.gray,
  },
}); 