import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from './services/apiService';

interface SessionHistory {
  session_id: number;
  doctor_name: string;
  started_at: string;
  ended_at: string;
  message_count: number;
  retention_days: number;
  accessible_until: string;
  has_access: boolean;
}

interface RetentionInfo {
  retention_days: number;
  accessible_until: string;
}

export default function TextSessionHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [retentionInfo, setRetentionInfo] = useState<RetentionInfo | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    loadHistory();
    loadRetentionInfo();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/text-sessions/patient/history');
      
      if (response.success) {
        setHistory(response.data);
      } else {
        Alert.alert('Error', response.message || 'Failed to load session history');
      }
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'Failed to load session history');
    } finally {
      setLoading(false);
    }
  };

  const loadRetentionInfo = async () => {
    try {
      const response = await apiService.get('/text-sessions/retention');
      
      if (response.success) {
        setRetentionInfo(response.data);
      }
    } catch (error) {
      console.error('Error loading retention info:', error);
    }
  };

  const loadSessionMessages = async (sessionId: number) => {
    try {
      setLoadingMessages(true);
      const response = await apiService.get(`/text-sessions/${sessionId}/patient/messages`);
      
      if (response.success) {
        setSessionMessages(response.data.messages);
        setSelectedSession(sessionId);
      } else {
        Alert.alert('Error', response.message || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const exportSession = async (sessionId: number) => {
    try {
      const response = await apiService.get(`/text-sessions/${sessionId}/export`);
      
      if (response.success) {
        const exportData = response.data;
        
        // Create a formatted text for sharing
        const sessionText = `Text Session with ${exportData.messages[0]?.sender_name || 'Doctor'}
        
Date: ${new Date(exportData.messages[0]?.timestamp).toLocaleDateString()}
Messages: ${exportData.message_count}

${exportData.messages.map((msg: any) => 
  `${msg.sender_id === user?.id ? 'You' : 'Doctor'}: ${msg.content}`
).join('\n\n')}

Exported on: ${new Date(exportData.exported_at).toLocaleString()}
Accessible until: ${new Date(exportData.retention_until).toLocaleString()}`;

        await Share.share({
          message: sessionText,
          title: `Text Session - ${new Date(exportData.messages[0]?.timestamp).toLocaleDateString()}`
        });
      } else {
        Alert.alert('Error', response.message || 'Failed to export session');
      }
    } catch (error) {
      console.error('Error exporting session:', error);
      Alert.alert('Error', 'Failed to export session');
    }
  };

  const createTemporaryAccess = async (sessionId: number) => {
    try {
      const response = await apiService.post(`/text-sessions/${sessionId}/temporary-access`, {
        hours: 24
      });
      
      if (response.success) {
        const { access_url } = response.data;
        
        Alert.alert(
          'Temporary Access Created',
          'A temporary access link has been created. Would you like to open it?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Link', 
              onPress: () => Linking.openURL(access_url)
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to create temporary access');
      }
    } catch (error) {
      console.error('Error creating temporary access:', error);
      Alert.alert('Error', 'Failed to create temporary access');
    }
  };

  const updateRetentionPeriod = async (days: number) => {
    try {
      const response = await apiService.post('/text-sessions/retention', { days });
      
      if (response.success) {
        setRetentionInfo(response.data);
        Alert.alert('Success', 'Retention period updated successfully');
        loadHistory(); // Reload history with new retention info
      } else {
        Alert.alert('Error', response.message || 'Failed to update retention period');
      }
    } catch (error) {
      console.error('Error updating retention:', error);
      Alert.alert('Error', 'Failed to update retention period');
    }
  };

  const renderSessionItem = ({ item }: { item: SessionHistory }) => (
    <View style={styles.sessionItem}>
      <View style={styles.sessionHeader}>
        <Text style={styles.doctorName}>{item.doctor_name}</Text>
        <Text style={styles.sessionDate}>
          {new Date(item.started_at).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.sessionDetails}>
        <Text style={styles.messageCount}>
          {item.message_count} messages
        </Text>
        <Text style={styles.retentionInfo}>
          Accessible for {item.retention_days} days
        </Text>
        <Text style={styles.expiryInfo}>
          Expires: {new Date(item.accessible_until).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.sessionActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => loadSessionMessages(item.session_id)}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={Colors.primary} />
          <Text style={styles.actionText}>View Messages</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => exportSession(item.session_id)}
        >
          <Ionicons name="download-outline" size={20} color={Colors.primary} />
          <Text style={styles.actionText}>Export</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => createTemporaryAccess(item.session_id)}
        >
          <Ionicons name="link-outline" size={20} color={Colors.primary} />
          <Text style={styles.actionText}>Share Link</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMessage = ({ item }: { item: any }) => (
    <View style={[
      styles.messageItem,
      item.sender === user?.id ? styles.myMessage : styles.otherMessage
    ]}>
      <Text style={styles.messageText}>{item.text}</Text>
      <Text style={styles.messageTime}>
        {new Date(item.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading session history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Text Session History</Text>
        {retentionInfo && (
          <View style={styles.retentionContainer}>
            <Text style={styles.retentionText}>
              Current retention: {retentionInfo.retention_days} days
            </Text>
            <TouchableOpacity
              style={styles.retentionButton}
              onPress={() => {
                Alert.prompt(
                  'Update Retention Period',
                  'Enter number of days (1-30):',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Update', 
                      onPress: (text) => {
                        const days = parseInt(text || '7');
                        if (days >= 1 && days <= 30) {
                          updateRetentionPeriod(days);
                        } else {
                          Alert.alert('Error', 'Please enter a number between 1 and 30');
                        }
                      }
                    }
                  ],
                  'plain-text',
                  retentionInfo.retention_days.toString()
                );
              }}
            >
              <Text style={styles.retentionButtonText}>Change</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {selectedSession ? (
        <View style={styles.messagesContainer}>
          <View style={styles.messagesHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setSelectedSession(null);
                setSessionMessages([]);
              }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.primary} />
              <Text style={styles.backButtonText}>Back to History</Text>
            </TouchableOpacity>
          </View>
          
          {loadingMessages ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : (
            <FlatList
              data={sessionMessages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.session_id.toString()}
          style={styles.historyList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={Colors.gray} />
              <Text style={styles.emptyText}>No session history found</Text>
              <Text style={styles.emptySubtext}>
                Your completed text sessions will appear here
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 10,
  },
  retentionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retentionText: {
    fontSize: 14,
    color: Colors.gray,
  },
  retentionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retentionButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.gray,
  },
  historyList: {
    flex: 1,
  },
  sessionItem: {
    backgroundColor: Colors.white,
    margin: 10,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  sessionDate: {
    fontSize: 14,
    color: Colors.gray,
  },
  sessionDetails: {
    marginBottom: 15,
  },
  messageCount: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 5,
  },
  retentionInfo: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 5,
  },
  expiryInfo: {
    fontSize: 12,
    color: Colors.warning,
  },
  sessionActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.lightBackground,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesHeader: {
    padding: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  messagesList: {
    flex: 1,
    padding: 10,
  },
  messageItem: {
    marginVertical: 5,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: Colors.lightGray,
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 5,
  },
  messageTime: {
    fontSize: 10,
    color: Colors.gray,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray,
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
  },
}); 