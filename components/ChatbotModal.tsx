import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Clipboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { ChatbotService } from '../services/chatbotService';

interface Message {
  id?: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  feedback?: 'thumbs_up' | 'thumbs_down' | null;
}

interface ChatbotModalProps {
  visible: boolean;
  onClose: () => void;
}

const SYSTEM_PROMPT = `You are a helpful healthcare assistant for a medical app. Your role is to:

1. Answer basic health questions and provide general information
2. Help users understand common symptoms and conditions
3. Guide users to book appointments with real doctors for personal health issues
4. Provide health tips and wellness advice
5. NEVER give specific medical diagnoses or treatment recommendations
6. Always encourage users to consult with healthcare professionals for personal health concerns

Keep responses friendly, informative, and encouraging. If a user asks about specific symptoms or personal health issues, acknowledge their concern and suggest booking an appointment with a doctor.`;

const WELCOME_MESSAGES = [
  "Hello! I'm your health assistant. I can help you with general health questions and guide you to book appointments with our doctors for personal concerns.",
  "Hi there! I'm here to help with health information and connect you with our qualified doctors when you need personalized care.",
  "Welcome! I'm your AI health assistant. How can I help you today? I can answer general health questions or guide you to book an appointment with our doctors."
];

export default function ChatbotModal({ visible, onClose }: ChatbotModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Start a new chat
  const startNewChat = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)],
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    setInputText('');
  };

  useEffect(() => {
    if (visible) {
      // Start a new chat every time the modal opens
      startNewChat();
    }
  }, [visible]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await getChatbotResponse(inputText.trim());
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble responding right now. Please try again or book an appointment with one of our doctors for immediate assistance.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getChatbotResponse = async (userInput: string): Promise<string> => {
    try {
      const response = await ChatbotService.getResponse(userInput);
      return response.text;
    } catch (error) {
      console.error('Chatbot service error:', error);
      return "I'm sorry, I'm having trouble responding right now. Please try again or book an appointment with one of our doctors for immediate assistance.";
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Copy message to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setString(text);
      Alert.alert('Copied!', 'Message copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy message');
    }
  };

  // Handle feedback for bot messages
  const handleFeedback = (messageId: string, feedbackType: 'thumbs_up' | 'thumbs_down') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, feedback: feedbackType }
        : msg
    ));
    
    // You can add analytics or API call here to track feedback
    console.log(`Feedback for message ${messageId}: ${feedbackType}`);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color="#4CAF50" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>DocAvailable</Text>
            <Text style={styles.headerSubtitle}>AI powered available doctor</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={startNewChat} style={styles.newChatButton}>
              <FontAwesome name="plus" size={16} color="#4CAF50" />
            </TouchableOpacity>
            <View style={styles.headerIcon}>
              <FontAwesome name="user-md" size={20} color="#4CAF50" />
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message, index) => (
            <View
              key={message.id || `msg_${index}`}
              style={[
                styles.messageBubble,
                message.isUser ? styles.userMessage : styles.botMessage
              ]}
            >
              <Text style={[
                styles.messageText,
                message.isUser ? styles.userMessageText : styles.botMessageText
              ]}>
                {message.text}
              </Text>
              
              <View style={styles.messageFooter}>
                <Text style={[
                  styles.messageTime,
                  message.isUser ? styles.userMessageTime : styles.botMessageTime
                ]}>
                  {formatTime(message.timestamp)}
                </Text>
                
                {/* Interaction buttons for bot messages only */}
                {!message.isUser && (
                  <View style={styles.interactionButtons}>
                    <TouchableOpacity
                      style={styles.interactionButton}
                      onPress={() => copyToClipboard(message.text)}
                    >
                      <FontAwesome name="copy" size={12} color="#666" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.interactionButton,
                        message.feedback === 'thumbs_up' && styles.activeFeedbackButton
                      ]}
                      onPress={() => handleFeedback(message.id!, 'thumbs_up')}
                    >
                      <FontAwesome 
                        name="thumbs-up" 
                        size={12} 
                        color={message.feedback === 'thumbs_up' ? '#4CAF50' : '#666'} 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.interactionButton,
                        message.feedback === 'thumbs_down' && styles.activeFeedbackButton
                      ]}
                      onPress={() => handleFeedback(message.id!, 'thumbs_down')}
                    >
                      <FontAwesome 
                        name="thumbs-down" 
                        size={12} 
                        color={message.feedback === 'thumbs_down' ? '#FF4444' : '#666'} 
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))}
          
          {isLoading && (
            <View style={[styles.messageBubble, styles.botMessage]}>
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.typingText}>Assistant is typing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.textInput}>
            Ask me anything about health...
          </Text>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <FontAwesome 
              name="send" 
              size={16} 
              color={inputText.trim() && !isLoading ? "#fff" : "#ccc"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 50, // Account for status bar
  },
  closeButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newChatButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#E8F5E8',
  },
  headerIcon: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 18,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
    borderTopRightRadius: 4,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  botMessageText: {
    color: '#222',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: '#e0ffe0',
    alignSelf: 'flex-end',
  },
  botMessageTime: {
    color: '#999',
    alignSelf: 'flex-start',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  interactionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interactionButton: {
    padding: 4,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  activeFeedbackButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#222',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
}); 