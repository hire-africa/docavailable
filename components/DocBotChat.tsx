import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

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

export default function DocBotChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation value for history panel
  const slideAnim = useRef(new Animated.Value(-width)).current;

  // Generate chat title based on first user message
  const generateChatTitle = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('headache') || lowerMessage.includes('head pain')) {
      return 'Headache Consultation';
    } else if (lowerMessage.includes('fever') || lowerMessage.includes('temperature')) {
      return 'Fever & Temperature';
    } else if (lowerMessage.includes('cold') || lowerMessage.includes('flu')) {
      return 'Cold & Flu Symptoms';
    } else if (lowerMessage.includes('appointment') || lowerMessage.includes('book')) {
      return 'Appointment Booking';
    } else if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent')) {
      return 'Emergency Guidance';
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'General Health Chat';
    } else if (lowerMessage.includes('thank')) {
      return 'Health Consultation';
    } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
      return 'Health Chat';
    } else {
      return 'Health Consultation';
    }
  };

  // Save current chat to history
  const saveCurrentChat = () => {
    if (messages.length > 0) {
      const firstUserMessage = messages.find(msg => msg.isUser)?.text || 'Health Consultation';
      const chatTitle = generateChatTitle(firstUserMessage);
      
      const newChatSession: ChatSession = {
        id: Date.now().toString(),
        title: chatTitle,
        messages: [...messages],
        timestamp: new Date(),
      };
      
      const updatedHistory = [newChatSession, ...chatHistory];
      setChatHistory(updatedHistory);
      saveChatHistoryToStorage(updatedHistory);
    }
  };

  // Load chat from history
  const loadChatFromHistory = (chatSession: ChatSession) => {
    setMessages(chatSession.messages);
    setShowHistory(false);
  };

  // Delete chat from history
  const deleteChatFromHistory = (chatId: string) => {
    const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
    setChatHistory(updatedHistory);
    saveChatHistoryToStorage(updatedHistory);
  };

  // Clear all chat history
  const clearAllChatHistory = () => {
    setChatHistory([]);
    saveChatHistoryToStorage([]);
  };

  // Load chat history from AsyncStorage
  const loadChatHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem('docbot_chat_history');
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

  // Save chat history to AsyncStorage
  const saveChatHistoryToStorage = async (history: ChatSession[]) => {
    try {
      await AsyncStorage.setItem('docbot_chat_history', JSON.stringify(history));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  // Animate history panel
  const animateHistoryPanel = (show: boolean) => {
    Animated.timing(slideAnim, {
      toValue: show ? 0 : -width,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Animate history panel when showHistory changes
  useEffect(() => {
    animateHistoryPanel(showHistory);
  }, [showHistory]);

  const generateBotResponse = (userMessage: string): { text: string; type: Message['type'] } => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return {
        text: "Hello! How are you feeling today? I'm here to help with any health questions or concerns you might have.",
        type: 'general'
      };
    } else if (lowerMessage.includes('headache') || lowerMessage.includes('head pain')) {
      return {
        text: "I understand you're experiencing a headache. Common causes include stress, dehydration, lack of sleep, or eye strain. Try resting in a quiet, dark room, staying hydrated, and taking over-the-counter pain relievers if needed. If your headache is severe or persistent, please consult a healthcare provider.",
        type: 'symptom'
      };
    } else if (lowerMessage.includes('fever') || lowerMessage.includes('temperature')) {
      return {
        text: "A fever is often a sign that your body is fighting an infection. Rest, stay hydrated, and monitor your temperature. If your fever is above 103°F (39.4°C) or lasts more than 3 days, please seek medical attention.",
        type: 'symptom'
      };
    } else if (lowerMessage.includes('cold') || lowerMessage.includes('flu')) {
      return {
        text: "For cold and flu symptoms, rest, stay hydrated, and consider over-the-counter medications for symptom relief. Most colds resolve within 7-10 days. If symptoms are severe or persist, please consult a healthcare provider.",
        type: 'symptom'
      };
    } else if (lowerMessage.includes('appointment') || lowerMessage.includes('book')) {
      return {
        text: "I can help you book an appointment! You can use the 'Discover' tab to find available doctors, or if you have a specific doctor in mind, you can book directly through their profile. Would you like me to explain the booking process?",
        type: 'booking'
      };
    } else if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent')) {
      return {
        text: "If you're experiencing a medical emergency, please call emergency services immediately (998 or 997). This could include chest pain, difficulty breathing, severe bleeding, or loss of consciousness. Don't wait - seek immediate medical attention.",
        type: 'emergency'
      };
    } else if (lowerMessage.includes('thank')) {
      return {
        text: "You're welcome! I'm here to help. Is there anything else you'd like to know about your health?",
        type: 'general'
      };
    } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
      return {
        text: "Take care! Remember, I'm here whenever you need health information or guidance. Stay healthy!",
        type: 'general'
      };
    } else {
      return {
        text: "Thank you for your question. While I can provide general health information, I cannot diagnose specific conditions or provide medical advice. For personalized medical care, please consult with a healthcare provider. You can book an appointment through our app or visit a local clinic.",
        type: 'advice'
      };
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Save chat to history if this is the first message
    if (messages.length === 0) {
      setTimeout(() => {
        saveCurrentChat();
      }, 1000); // Save after bot responds
    }
    setInputText('');
    setIsTyping(true);

    // Simulate bot thinking time
    setTimeout(() => {
      const botResponse = generateBotResponse(userMessage.text);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse.text,
        isUser: false,
        timestamp: new Date(),
        type: botResponse.type
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
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
      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* History Menu Button - Left Side */}
          <TouchableOpacity 
            style={{
              position: 'absolute',
              left: 20,
              padding: 8,
            }}
            onPress={() => {
              setShowHistory(!showHistory);
            }}
          >
            <FontAwesome name="ellipsis-v" size={24} color="#4CAF50" />
          </TouchableOpacity>
          
          <View style={styles.botAvatarContainer}>
            <Image 
              source={require('../assets/images/DA.png')} 
              style={styles.botAvatar}
              resizeMode="cover"
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.botName}>DocBot Free</Text>
            <Text style={styles.botSubtitle}>AI Health Assistant</Text>
          </View>
          
          {/* New Chat Button - Right Side */}
          <TouchableOpacity 
            style={{
              position: 'absolute',
              right: 20,
              padding: 8,
            }}
            onPress={() => {
              // Save current chat before clearing
              if (messages.length > 0) {
                saveCurrentChat();
              }
              // Clear all messages to start a new chat
              setMessages([]);
              setInputText('');
            }}
          >
            <FontAwesome name="plus-circle" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages Container */}
      <KeyboardAvoidingView 
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            ...styles.messagesContent,
            flexGrow: messages.length === 0 ? 1 : undefined,
            justifyContent: messages.length === 0 ? 'center' : undefined,
          }}
        >
          
          {/* Welcome Message Placeholder - Only show when no messages exist */}
          {messages.length === 0 && (
            <View style={{
              alignItems: 'center',
              paddingVertical: 60,
              paddingHorizontal: 20,
            }}>
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: 24,
                alignItems: 'center',
                maxWidth: 280,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
              }}>
                <View style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: '#4CAF50',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16,
                }}>
                  <FontAwesome name="stethoscope" size={28} color="#fff" />
                </View>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '600',
                  color: '#333',
                  textAlign: 'center',
                  marginBottom: 8,
                }}>
                  Hi, I'm DocBot! 👋
                </Text>
                <Text style={{
                  fontSize: 16,
                  color: '#666',
                  textAlign: 'center',
                  lineHeight: 22,
                }}>
                  How can I help you today? I'm here to assist with your health questions and provide medical guidance.
                </Text>
              </View>
            </View>
          )}

          {messages.map((message, index) => (
            <View
              key={message.id || `msg_${index}`}
              style={[
                styles.messageContainer,
                message.isUser ? styles.userMessage : styles.botMessage,
              ]}
            >
              <View
                style={[
                  styles.messageCard,
                  message.isUser ? styles.userCard : styles.botCard,
                ]}
              >
                <View style={styles.messageContent}>
                  <Text
                    style={[
                      styles.messageText,
                      message.isUser ? styles.userText : styles.botText,
                    ]}
                  >
                    {message.text}
                  </Text>
                  <Text style={[
                    styles.messageTime,
                    message.isUser ? styles.userTime : styles.botTime
                  ]}>
                    {formatTime(message.timestamp)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          
          {isTyping && (
            <View style={styles.messageContainer}>
              <View style={styles.typingCard}>
                <View style={styles.typingDots}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Modern Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask DocBot about your health..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <FontAwesome 
                name="send" 
                size={18} 
                color={inputText.trim() ? "#FFFFFF" : "#CCC"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      {/* Chat History Side Panel */}
      {showHistory && (
        <Animated.View 
          style={[
            styles.historyOverlay,
            { opacity: slideAnim.interpolate({
              inputRange: [-width, 0],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            })}
          ]}
        >
          <TouchableOpacity 
            style={styles.historyBackdrop}
            onPress={() => setShowHistory(false)}
          />
          <Animated.View 
            style={[
              styles.historyPanel,
              {
                transform: [{
                  translateX: slideAnim
                }]
              }
            ]}
          >
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Chat History</Text>
              <View style={styles.historyHeaderButtons}>
                {chatHistory.length > 0 && (
                  <TouchableOpacity 
                    onPress={clearAllChatHistory}
                    style={styles.clearButton}
                  >
                    <FontAwesome name="trash" size={16} color="#FF4444" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  onPress={() => setShowHistory(false)}
                  style={styles.closeButton}
                >
                  <FontAwesome name="times" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView style={styles.historyList}>
              {chatHistory.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <FontAwesome name="history" size={48} color="#CCC" />
                  <Text style={styles.emptyHistoryText}>No chat history yet</Text>
                  <Text style={styles.emptyHistorySubtext}>Your conversations will appear here</Text>
                </View>
              ) : (
                chatHistory.map((chat) => (
                  <TouchableOpacity
                    key={chat.id}
                    style={styles.historyItem}
                    onPress={() => loadChatFromHistory(chat)}
                  >
                    <View style={styles.historyItemContent}>
                      <Text style={styles.historyItemTitle} numberOfLines={1}>
                        {chat.title}
                      </Text>
                      <Text style={styles.historyItemTime}>
                        {chat.timestamp.toLocaleDateString()} • {chat.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={styles.historyItemPreview} numberOfLines={2}>
                        {chat.messages.find(msg => msg.isUser)?.text || 'Health consultation'}
                      </Text>
                    </View>
                    <FontAwesome name="chevron-right" size={16} color="#CCC" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  botAvatarContainer: {
    marginRight: 12,
  },
  botAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerText: {
    alignItems: 'center',
  },
  botName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  botSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#F8F9FA',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  botMessage: {
    justifyContent: 'flex-start',
  },
  botMessageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  messageCard: {
    maxWidth: width * 0.8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  botCard: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageTypeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  messageContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  userText: {
    color: '#222',
  },
  botText: {
    color: '#222',
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  userTime: {
    color: '#999',
    alignSelf: 'flex-end',
  },
  botTime: {
    color: '#999',
    alignSelf: 'flex-start',
  },
  typingCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginHorizontal: 2,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0,
    elevation: 0,
  },
  // Chat History Styles
  historyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  historyBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  historyPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  historyHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    padding: 8,
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
  },
  historyList: {
    flex: 1,
  },
  emptyHistory: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historyItemContent: {
    flex: 1,
    marginRight: 12,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  historyItemTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  historyItemPreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
}); 