import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface Message {
  id?: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'symptom' | 'advice' | 'booking' | 'emergency' | 'general';
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}

interface AIDocHistoryProps {
  onClose: () => void;
  onLoadChat: (chatSession: ChatSession) => void;
}

export default function AIDocHistory({ onClose, onLoadChat }: AIDocHistoryProps) {
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  // Load chat history from AsyncStorage
  const loadChatHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem('docava_chat_history');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        // Convert timestamp strings back to Date objects
        const historyWithDates = parsedHistory.map((chat: any) => ({
          ...chat,
          timestamp: new Date(chat.timestamp),
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setChatHistory(historyWithDates);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // Delete specific chat from history
  const deleteChat = (chatId: string) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
            setChatHistory(updatedHistory);
            try {
              await AsyncStorage.setItem('docava_chat_history', JSON.stringify(updatedHistory));
            } catch (error) {
              console.error('Error saving chat history:', error);
            }
          }
        }
      ]
    );
  };

  // Clear all chat history
  const clearAllHistory = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete all your AI Doc conversations? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setChatHistory([]);
            try {
              await AsyncStorage.setItem('docava_chat_history', JSON.stringify([]));
            } catch (error) {
              console.error('Error clearing chat history:', error);
            }
          }
        }
      ]
    );
  };

  // Load chat from history
  const loadChat = (chatSession: ChatSession) => {
    onLoadChat(chatSession);
    onClose();
  };

  // Refresh data
  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadChatHistory();
    setIsRefreshing(false);
  };

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageIcon = (type?: Message['type']) => {
    switch (type) {
      case 'symptom':
        return 'stethoscope';
      case 'advice':
        return 'lightbulb-o';
      case 'booking':
        return 'calendar';
      case 'emergency':
        return 'exclamation-triangle';
      default:
        return 'user-md';
    }
  };

  const getMessageColor = (type?: Message['type']) => {
    switch (type) {
      case 'symptom':
        return '#FF6B6B';
      case 'advice':
        return '#4ECDC4';
      case 'booking':
        return '#45B7D1';
      case 'emergency':
        return '#FF8A80';
      default:
        return '#4CAF50';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onClose}
          >
            <FontAwesome name="arrow-left" size={20} color="#4CAF50" />
          </TouchableOpacity>
          
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>AI Doc History</Text>
            <Text style={styles.headerSubtitle}>
              {chatHistory.length} conversation{chatHistory.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          {chatHistory.length > 0 && (
            <TouchableOpacity 
              style={styles.clearAllButton}
              onPress={clearAllHistory}
            >
              <FontAwesome name="trash" size={18} color="#FF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        {chatHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <FontAwesome name="history" size={48} color="#E0E0E0" />
            </View>
            <Text style={styles.emptyTitle}>No Conversations Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your AI Doc conversations will appear here once you start chatting
            </Text>
            <TouchableOpacity 
              style={styles.startChatButton}
              onPress={onClose}
            >
              <FontAwesome name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.startChatText}>Start New Chat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.historyList}>
            {chatHistory.map((chat) => (
              <View key={chat.id} style={styles.chatCard}>
                <TouchableOpacity
                  style={styles.chatContent}
                  onPress={() => loadChat(chat)}
                  onLongPress={() => setSelectedChat(selectedChat === chat.id ? null : chat.id)}
                >
                  <View style={styles.chatHeader}>
                    <View style={styles.chatTitleContainer}>
                      <Text style={styles.chatTitle} numberOfLines={1}>
                        {chat.title}
                      </Text>
                      <View style={styles.chatMeta}>
                        <Text style={styles.chatDate}>{formatDate(chat.timestamp)}</Text>
                        <Text style={styles.chatTime}>{formatTime(chat.timestamp)}</Text>
                      </View>
                    </View>
                    <FontAwesome name="chevron-right" size={16} color="#CCC" />
                  </View>
                  
                  <View style={styles.chatPreview}>
                    <Text style={styles.chatPreviewText} numberOfLines={2}>
                      {chat.messages.find(msg => msg.isUser)?.text || 'Health consultation'}
                    </Text>
                  </View>
                  
                  <View style={styles.chatStats}>
                    <View style={styles.messageCount}>
                      <FontAwesome name="comments" size={12} color="#4CAF50" />
                      <Text style={styles.messageCountText}>
                        {chat.messages.length} message{chat.messages.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    
                    {chat.messages.some(msg => !msg.isUser && msg.type) && (
                      <View style={styles.messageTypes}>
                        {Array.from(new Set(chat.messages
                          .filter(msg => !msg.isUser && msg.type)
                          .map(msg => msg.type)
                        )).map((type, index) => (
                          <View key={index} style={[styles.messageTypeTag, { backgroundColor: getMessageColor(type as Message['type']) + '20' }]}>
                            <FontAwesome 
                              name={getMessageIcon(type as Message['type'])} 
                              size={10} 
                              color={getMessageColor(type as Message['type'])} 
                            />
                            <Text style={[styles.messageTypeText, { color: getMessageColor(type as Message['type']) }]}>
                              {type?.charAt(0).toUpperCase() + type?.slice(1)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                
                {selectedChat === chat.id && (
                  <View style={styles.chatActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => loadChat(chat)}
                    >
                      <FontAwesome name="play" size={14} color="#4CAF50" />
                      <Text style={styles.actionText}>Continue</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => deleteChat(chat.id)}
                    >
                      <FontAwesome name="trash" size={14} color="#FF4444" />
                      <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    width: width,
    height: height,
    zIndex: 9999,
    elevation: 9999,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  clearAllButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startChatText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  historyList: {
    padding: 20,
  },
  chatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  chatContent: {
    padding: 20,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chatTitleContainer: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatDate: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  chatPreview: {
    marginBottom: 12,
  },
  chatPreviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  chatStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageCountText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  messageTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  messageTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 6,
    marginBottom: 2,
  },
  messageTypeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  chatActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F0F8F0',
  },
  deleteButton: {
    backgroundColor: '#FFF0F0',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 6,
  },
  deleteText: {
    color: '#FF4444',
  },
});
