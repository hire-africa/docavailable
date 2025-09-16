import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { OpenAIService } from '../services/openaiService';
import DocAvaHistory from './DocAvaHistory';

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

interface DocAvaChatProps {
  onBottomHiddenChange?: (hidden: boolean) => void;
}

export default function DocAvaChat({ onBottomHiddenChange }: DocAvaChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showHistoryPage, setShowHistoryPage] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [isBottomHidden, setIsBottomHidden] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation value for history panel
  const slideAnim = useRef(new Animated.Value(-width)).current;
  // Animation value for bottom nav
  const bottomSlideAnim = useRef(new Animated.Value(0)).current;
  // Animation value for floating button pop-up
  const buttonScaleAnim = useRef(new Animated.Value(0)).current;
  // Animation value for history page slide
  const historySlideAnim = useRef(new Animated.Value(-width)).current;

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

  // Load chat from history page
  const loadChatFromHistoryPage = (chatSession: ChatSession) => {
    setMessages(chatSession.messages);
    setShowHistoryPage(false);
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

  // Save chat history to AsyncStorage
  const saveChatHistoryToStorage = async (history: ChatSession[]) => {
    try {
      await AsyncStorage.setItem('docava_chat_history', JSON.stringify(history));
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

  // Animate bottom nav
  const animateBottomNav = (hide: boolean) => {
    Animated.timing(bottomSlideAnim, {
      toValue: hide ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  // Animate floating button pop-up
  const animateButtonPopUp = (show: boolean) => {
    Animated.spring(buttonScaleAnim, {
      toValue: show ? 1 : 0,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  // Animate history page slide
  const animateHistoryPage = (show: boolean) => {
    Animated.timing(historySlideAnim, {
      toValue: show ? 0 : -width,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Toggle bottom panel visibility
  const toggleBottomPanel = () => {
    const newState = !isBottomHidden;
    setIsBottomHidden(newState);
    animateBottomNav(newState);
    onBottomHiddenChange?.(newState);
  };

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Keyboard visibility detection
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
      animateButtonPopUp(false); // Hide button with animation
      
      // For Android, scroll to bottom when keyboard shows
      if (Platform.OS === 'android') {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      animateButtonPopUp(true); // Show button with animation
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Auto slide down when component mounts
  useEffect(() => {
    // Small delay to ensure smooth transition
    const timer = setTimeout(() => {
      setIsBottomHidden(true);
      animateBottomNav(true);
      onBottomHiddenChange?.(true);
      // Show floating button with animation
      animateButtonPopUp(true);
    }, 500);

    return () => clearTimeout(timer);
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

  // Animate history page when showHistoryPage changes
  useEffect(() => {
    animateHistoryPage(showHistoryPage);
  }, [showHistoryPage]);

  const generateBotResponse = async (userMessage: string): Promise<{ text: string; type: Message['type'] }> => {
    console.log('🤖 Calling OpenAI service with:', userMessage);
    
    try {
      console.log('📡 Making OpenAI API call...');
      const response = await OpenAIService.getResponse(userMessage);
      console.log('✅ OpenAI response received:', response);
      
      // Determine message type based on urgency and content
      let messageType: Message['type'] = 'general';
      if (response.urgency === 'high') {
        messageType = 'emergency';
      } else if (response.shouldBookAppointment) {
        messageType = 'booking';
      } else if (userMessage.toLowerCase().includes('pain') || userMessage.toLowerCase().includes('symptom')) {
        messageType = 'symptom';
      } else if (userMessage.toLowerCase().includes('advice') || userMessage.toLowerCase().includes('tip')) {
        messageType = 'advice';
      }
      
      console.log('📝 Final response:', response.text);
      console.log('🏷️  Message type:', messageType);
      
      return {
        text: response.text,
        type: messageType
      };
    } catch (error) {
      console.error('❌ Error generating bot response:', error);
      console.error('Error details:', error.message);
      
      // Fallback to basic response
      return {
        text: 'Sorry, I encountered an error. Please try again later.',
        type: 'general'
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
    setTimeout(async () => {
      const botResponse = await generateBotResponse(userMessage.text);
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
    <>
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* History Page Button - Left Side */}
          <TouchableOpacity 
            style={styles.headerLeftButton}
            onPress={() => setShowHistoryPage(true)}
          >
            <FontAwesome name="ellipsis-v" size={24} color="#4CAF50" />
          </TouchableOpacity>
          
          <View style={styles.headerText}>
            <View style={styles.botNameContainer}>
              <Text style={styles.botName}>DocAva</Text>
              <FontAwesome name="check-circle" size={16} color="#4CAF50" style={styles.verifiedBadge} />
            </View>
          </View>
          
          {/* New Chat Button - Right Side */}
          <TouchableOpacity 
            style={styles.headerRightButton}
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
            <FontAwesome name="plus" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages Container - KeyboardAvoidingView as outer container */}
        <KeyboardAvoidingView 
          style={[styles.messagesContainer, { backgroundColor: '#FFFFFF' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          enabled={true}
        >
        <Animated.View 
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            transform: [{
              translateY: bottomSlideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 60],
                extrapolate: 'clamp',
              })
            }]
          }}
        >
          <ScrollView
            ref={scrollViewRef}
            style={[styles.messagesList, { backgroundColor: '#FFFFFF' }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              ...styles.messagesContent,
              flexGrow: 1,
              justifyContent: messages.length === 0 ? 'center' : 'flex-start',
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
                    Hi, I'm DocAva! 👋
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

          {/* Toggle Bottom Panel Button - Floating with Pop-up Animation */}
          <Animated.View 
            style={[
              styles.floatingToggleContainer,
              {
                transform: [{ scale: buttonScaleAnim }],
                opacity: buttonScaleAnim,
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.floatingToggleButton}
              onPress={toggleBottomPanel}
            >
              <FontAwesome 
                name={isBottomHidden ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#4CAF50" 
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Modern Input Area */}
          {Platform.OS === 'android' ? (
            <KeyboardAvoidingView 
              behavior="height"
              keyboardVerticalOffset={0}
              style={[styles.inputContainer, { backgroundColor: '#FFFFFF' }]}
            >
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ask DocAva about your health..."
                  placeholderTextColor="#999"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                  returnKeyType="send"
                  onSubmitEditing={sendMessage}
                  blurOnSubmit={false}
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
            </KeyboardAvoidingView>
          ) : (
            <View style={[styles.inputContainer, { backgroundColor: '#FFFFFF' }]}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ask DocAva about your health..."
                  placeholderTextColor="#999"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                  returnKeyType="send"
                  onSubmitEditing={sendMessage}
                  blurOnSubmit={false}
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
          )}
        </Animated.View>
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

    {/* DocAva History Page - Full Screen with Slide Animation - Outside main container */}
    {showHistoryPage && (
      <Animated.View 
        style={[
          styles.historyPageContainer,
          {
            transform: [{
              translateX: historySlideAnim
            }]
          }
        ]}
      >
        <DocAvaHistory
          onClose={() => setShowHistoryPage(false)}
          onLoadChat={loadChatFromHistoryPage}
        />
      </Animated.View>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerText: {
    alignItems: 'center',
  },
  botNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  botName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginRight: 6,
  },
  verifiedBadge: {
    marginLeft: 2,
  },
  headerLeftButton: {
    position: 'absolute',
    left: 20,
    padding: 8,
  },
  headerRightButton: {
    position: 'absolute',
    right: 20,
    padding: 8,
  },
  historyPageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    zIndex: 9999,
    backgroundColor: '#F8F9FA',
    elevation: 9999,
  },
  toggleButtonContainer: {
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  toggleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  floatingToggleContainer: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    zIndex: 10,
  },
  floatingToggleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    minHeight: 0,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
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
    paddingBottom: Platform.OS === 'android' ? 20 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1,
    position: 'relative',
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