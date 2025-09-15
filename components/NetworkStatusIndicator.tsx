import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { apiService } from '../app/services/apiService';

interface NetworkStatusIndicatorProps {
  showDetails?: boolean;
}

const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({ showDetails = false }) => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  const checkConnectivity = async () => {
    setStatus('checking');
    try {
      const isConnected = await apiService.checkConnectivity();
      setStatus(isConnected ? 'connected' : 'disconnected');
      setLastCheck(new Date());
    } catch (error) {
      setStatus('disconnected');
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    // Initial check
    checkConnectivity();

    // Periodic checks every 30 seconds
    const interval = setInterval(checkConnectivity, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Animate in when status changes
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [status]);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return '#4CAF50';
      case 'disconnected':
        return '#F44336';
      case 'checking':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return 'checkmark-circle';
      case 'disconnected':
        return 'close-circle';
      case 'checking':
        return 'sync';
      default:
        return 'help-circle';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'No Connection';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  if (status === 'connected' && !showDetails) {
    return null; // Don't show when connected unless details are requested
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]}>
        <Ionicons 
          name={getStatusIcon() as any} 
          size={16} 
          color="white" 
          style={status === 'checking' ? styles.spinning : undefined}
        />
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>
      
      {showDetails && lastCheck && (
        <Text style={styles.lastCheckText}>
          Last check: {lastCheck.toLocaleTimeString()}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 1000,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  lastCheckText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  spinning: {
    transform: [{ rotate: '360deg' }],
  },
});

export default NetworkStatusIndicator;
