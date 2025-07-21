import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
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
}

export default function DocBotChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm DocBot, your AI doctor. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const generateBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Simple response logic - in a real app, this would connect to an AI service
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! How are you feeling today? I'm here to help with any health questions you might have.";
    } else if (lowerMessage.includes('headache') || lowerMessage.includes('head pain')) {
      return "I'm sorry to hear you're experiencing a headache. Common causes include stress, dehydration, lack of sleep, or eye strain. Try resting in a quiet, dark room, staying hydrated, and taking over-the-counter pain relievers if needed. If your headache is severe or persistent, please consult a healthcare provider.";
    } else if (lowerMessage.includes('fever') || lowerMessage.includes('temperature')) {
      return "A fever is often a sign that your body is fighting an infection. Rest, stay hydrated, and monitor your temperature. If your fever is above 103°F (39.4°C) or lasts more than 3 days, please seek medical attention. Remember, I can provide general information, but for specific medical advice, always consult a healthcare professional.";
    } else if (lowerMessage.includes('cold') || lowerMessage.includes('flu')) {
      return "For cold and flu symptoms, rest, stay hydrated, and consider over-the-counter medications for symptom relief. Most colds resolve within 7-10 days. If symptoms are severe or persist, please consult a healthcare provider. Remember to practice good hygiene to prevent spreading illness.";
    } else if (lowerMessage.includes('appointment') || lowerMessage.includes('book')) {
      return "I can help guide you to book an appointment! You can use the 'Discover' tab to find available doctors, or if you have a specific doctor in mind, you can book directly through their profile. Would you like me to explain the booking process?";
    } else if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent')) {
      return "If you're experiencing a medical emergency, please call emergency services immediately (998 or 997). This could include chest pain, difficulty breathing, severe bleeding, or loss of consciousness. Don't wait - seek immediate medical attention.";
    } else if (lowerMessage.includes('thank')) {
      return "You're welcome! I'm here to help. Is there anything else you'd like to know about your health?";
    } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
      return "Take care! Remember, I'm here whenever you need health information or guidance. Stay healthy!";
    } else {
      return "Thank you for your question. While I can provide general health information, I cannot diagnose specific conditions or provide medical advice. For personalized medical care, please consult with a healthcare provider. You can book an appointment through our app or visit a local clinic.";
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
    setInputText('');
    setIsTyping(true);

    // Simulate bot thinking time
    setTimeout(() => {
      const botResponse = generateBotResponse(userMessage.text);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* Redesigned Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.botAvatarContainer}>
              <View style={styles.botAvatar}>
                <FontAwesome name="user-md" size={20} color="#4CAF50" />
              </View>
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.botName}>DocBot</Text>
              <Text style={styles.botSubtitle}>AI Health Assistant</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {isTyping ? 'Typing...' : 'Online'}
              </Text>
            </View>
            <TouchableOpacity style={styles.infoButton}>
              <FontAwesome name="info-circle" size={18} color="#4CAF50" />
            </TouchableOpacity>
          </View>
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
          contentContainerStyle={styles.messagesContent}
        >
          {/* Welcome Message */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Start a conversation with DocBot</Text>
            <Text style={styles.welcomeSubtext}>Ask about symptoms, medications, or help booking a real doctor</Text>
          </View>

          {messages.map((message, index) => (
            <View
              key={message.id || `msg_${index}`}
              style={[
                styles.messageContainer,
                message.isUser ? styles.userMessage : styles.botMessage,
              ]}
            >
              {!message.isUser && (
                <View style={styles.botMessageAvatar}>
                  <FontAwesome name="user-md" size={16} color="#4CAF50" />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  message.isUser ? styles.userBubble : styles.botBubble,
                ]}
              >
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
          ))}
          
          {isTyping && (
            <View style={styles.messageContainer}>
              <View style={styles.botMessageAvatar}>
                <FontAwesome name="user-md" size={16} color="#4CAF50" />
              </View>
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Enhanced Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask DocBot about your health..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C2C2C',
  },
  header: {
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  botAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#404040',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  headerText: {
    flex: 1,
  },
  botName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  botSubtitle: {
    fontSize: 13,
    color: '#BBBBBB',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#BBBBBB',
    fontWeight: '500',
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#404040',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#2C2C2C',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#2C2C2C',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#2C2C2C',
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 20,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#404040',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
  },
  userBubble: {
    backgroundColor: '#4CAF50',
    borderBottomRightRadius: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  botBubble: {
    backgroundColor: '#404040',
    borderBottomLeftRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#505050',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.8)',
    alignSelf: 'flex-end',
  },
  botTime: {
    color: '#BBBBBB',
    alignSelf: 'flex-start',
  },
  typingBubble: {
    backgroundColor: '#404040',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
    borderBottomLeftRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#505050',
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
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#404040',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#404040',
    borderRadius: 28,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#505050',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
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
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#505050',
    shadowOpacity: 0,
    elevation: 0,
  },
  inputHint: {
    fontSize: 11,
    color: '#BBBBBB',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
}); 