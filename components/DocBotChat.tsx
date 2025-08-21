import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
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
import { DeepSeekService, StreamingResponse } from '../services/deepseekService';

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

export default function DocBotChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHistory, setFilteredHistory] = useState<ChatSession[]>([]);
  const [thinkingState, setThinkingState] = useState(0); // 0: thinking, 1: analyzing, 2: preparing
  const [thinkingTipState, setThinkingTipState] = useState(0); // 0-3: different tips
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Local greeting responses to avoid API calls for simple greetings
  const getLocalGreetingResponse = (message: string): { text: string; type: Message['type'] } | null => {
    const lowerMessage = message.toLowerCase().trim();
    
    // Common greetings
    if (['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'morning', 'afternoon', 'evening'].some(greeting => 
      lowerMessage.includes(greeting)
    )) {
      const responses = [
        "Hello! 👋 How can I help you with your health today?",
        "Hi there! 😊 What health questions do you have?",
        "Hey! 👋 I'm here to help with any health concerns you might have.",
        "Hello! 😊 How are you feeling today? I'm here to help."
      ];
      return {
        text: responses[Math.floor(Math.random() * responses.length)],
        type: 'general' as Message['type']
      };
    }
    
    // How are you responses
    if (['how are you', 'how are you doing', 'how do you do', 'how you doing', 'how\'s it going', 'how is it going'].some(phrase => 
      lowerMessage.includes(phrase)
    )) {
      return {
        text: "I'm doing great, thank you! 😊 I'm here and ready to help with any health questions you have. How can I assist you today?",
        type: 'general' as Message['type']
      };
    }
    
    // Thanks responses
    if (['thank you', 'thanks', 'thank you so much', 'thanks a lot', 'thx', 'ty'].some(phrase => 
      lowerMessage.includes(phrase)
    )) {
      return {
        text: "You're very welcome! 😊 I'm here whenever you need health advice or have questions. Don't hesitate to ask!",
        type: 'general' as Message['type']
      };
    }
    
    // Goodbye responses
    if (['bye', 'goodbye', 'see you', 'take care', 'see you later', 'talk to you later', 'later'].some(phrase => 
      lowerMessage.includes(phrase)
    )) {
      return {
        text: "Take care! 👋 Remember, I'm here whenever you need health advice. Stay healthy!",
        type: 'general' as Message['type']
      };
    }
    
    // What's up responses
    if (['what\'s up', 'whats up', 'sup', 'what up'].some(phrase => 
      lowerMessage.includes(phrase)
    )) {
      return {
        text: "Not much, just here to help with your health! 😊 What can I assist you with today?",
        type: 'general' as Message['type']
      };
    }
    
    return null; // Not a greeting, will use API
  };
  
  // Enhanced animations
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Animation for typing indicator
  const typingAnim = useRef(new Animated.Value(0)).current;
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardPulseAnim = useRef(new Animated.Value(1)).current;

  // Generate chat title based on conversation content
  const generateChatTitle = (messages: Message[]): string => {
    if (messages.length === 0) return 'New Chat';
    
    // Get the first user message
    const firstUserMessage = messages.find(msg => msg.isUser)?.text.toLowerCase() || '';
    const botResponse = messages.find(msg => !msg.isUser)?.text.toLowerCase() || '';
    
    // Check for specific health topics
    if (firstUserMessage.includes('headache') || firstUserMessage.includes('head pain') || firstUserMessage.includes('migraine')) {
      return 'Headache & Pain';
    } else if (firstUserMessage.includes('fever') || firstUserMessage.includes('temperature') || firstUserMessage.includes('hot')) {
      return 'Fever & Temperature';
    } else if (firstUserMessage.includes('cold') || firstUserMessage.includes('flu') || firstUserMessage.includes('cough')) {
      return 'Cold & Flu';
    } else if (firstUserMessage.includes('appointment') || firstUserMessage.includes('book') || firstUserMessage.includes('schedule')) {
      return 'Appointment Booking';
    } else if (firstUserMessage.includes('emergency') || firstUserMessage.includes('urgent') || firstUserMessage.includes('severe')) {
      return 'Emergency Care';
    } else if (firstUserMessage.includes('pricing') || firstUserMessage.includes('cost') || firstUserMessage.includes('price') || firstUserMessage.includes('fee')) {
      return 'Pricing & Plans';
    } else if (firstUserMessage.includes('stomach') || firstUserMessage.includes('nausea') || firstUserMessage.includes('vomit')) {
      return 'Stomach Issues';
    } else if (firstUserMessage.includes('chest') || firstUserMessage.includes('heart') || firstUserMessage.includes('breathing')) {
      return 'Chest & Breathing';
    } else if (firstUserMessage.includes('skin') || firstUserMessage.includes('rash') || firstUserMessage.includes('itch')) {
      return 'Skin Problems';
    } else if (firstUserMessage.includes('sleep') || firstUserMessage.includes('insomnia') || firstUserMessage.includes('tired')) {
      return 'Sleep Issues';
    } else if (firstUserMessage.includes('diet') || firstUserMessage.includes('nutrition') || firstUserMessage.includes('food')) {
      return 'Diet & Nutrition';
    } else if (firstUserMessage.includes('exercise') || firstUserMessage.includes('workout') || firstUserMessage.includes('fitness')) {
      return 'Exercise & Fitness';
    } else if (firstUserMessage.includes('mental') || firstUserMessage.includes('anxiety') || firstUserMessage.includes('depression')) {
      return 'Mental Health';
    } else if (firstUserMessage.includes('pregnancy') || firstUserMessage.includes('baby') || firstUserMessage.includes('prenatal')) {
      return 'Pregnancy Care';
    } else if (firstUserMessage.includes('child') || firstUserMessage.includes('kid') || firstUserMessage.includes('baby')) {
      return 'Child Health';
    } else if (firstUserMessage.includes('elderly') || firstUserMessage.includes('senior') || firstUserMessage.includes('aging')) {
      return 'Senior Health';
    } else if (firstUserMessage.includes('medication') || firstUserMessage.includes('medicine') || firstUserMessage.includes('drug')) {
      return 'Medication Advice';
    } else if (firstUserMessage.includes('vaccine') || firstUserMessage.includes('immunization') || firstUserMessage.includes('shot')) {
      return 'Vaccination';
    } else if (firstUserMessage.includes('hello') || firstUserMessage.includes('hi') || firstUserMessage.includes('hey')) {
      return 'General Health Chat';
    } else if (firstUserMessage.includes('thank')) {
      return 'Health Consultation';
    } else if (firstUserMessage.includes('bye') || firstUserMessage.includes('goodbye')) {
      return 'Health Chat';
    }
    
    // If no specific topic found, try to extract a meaningful title from the first message
    const words = firstUserMessage.split(' ').filter(word => word.length > 3);
    if (words.length > 0) {
      const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1);
      return `${firstWord} Consultation`;
    }
    
    return 'Health Consultation';
  };

  // Save current chat to history
  const saveCurrentChat = () => {
    if (messages.length > 0) {
      const chatTitle = generateChatTitle(messages);
      
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
  
  // Start new chat with conversation memory reset
  const startNewChat = () => {
    // Clear conversation memory
    DeepSeekService.clearConversation();
    
    // Save current chat if it has messages
    if (messages.length > 0) {
      saveCurrentChat();
    }
    
    // Clear current messages
    setMessages([]);
    setInputText('');
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
    
    // Start welcome animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Filter chat history based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredHistory(chatHistory);
    } else {
      const filtered = chatHistory.filter(chat => {
        const searchLower = searchQuery.toLowerCase();
        return (
          chat.title.toLowerCase().includes(searchLower) ||
          chat.messages.some(msg => 
            msg.text.toLowerCase().includes(searchLower)
          )
        );
      });
      setFilteredHistory(filtered);
    }
  }, [searchQuery, chatHistory]);

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

  // Animate typing indicator
  useEffect(() => {
    if (isTyping) {
      Animated.timing(typingAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Start progress animation
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 8000, // 8 seconds for full progress
        useNativeDriver: false,
      }).start();
      
      // Start card pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(cardPulseAnim, {
            toValue: 1.02,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(cardPulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Animate dots in sequence
      const animateDots = () => {
        Animated.sequence([
          Animated.timing(dot1Anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(dot1Anim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dot2Anim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dot3Anim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          if (isTyping) {
            animateDots();
          }
        });
      };
      
      animateDots();
      
      // Cycle through thinking states
      const thinkingInterval = setInterval(() => {
        setThinkingState(prev => (prev + 1) % 3);
      }, 2000); // Change state every 2 seconds
      
      // Cycle through thinking tips
      const tipInterval = setInterval(() => {
        setThinkingTipState(prev => (prev + 1) % 4);
      }, 3000); // Change tip every 3 seconds
      
      return () => {
        clearInterval(thinkingInterval);
        clearInterval(tipInterval);
        dot1Anim.stopAnimation();
        dot2Anim.stopAnimation();
        dot3Anim.stopAnimation();
      };
    } else {
      Animated.timing(typingAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setThinkingState(0);
      setThinkingTipState(0);
      dot1Anim.setValue(0);
      dot2Anim.setValue(0);
      dot3Anim.setValue(0);
      progressAnim.setValue(0);
      cardPulseAnim.setValue(1);
    }
  }, [isTyping]);

  const generateBotResponse = async (userMessage: string): Promise<{ text: string; type: Message['type'] }> => {
    console.log('🤖 Calling DeepSeek service with streaming...');
    
    return new Promise((resolve) => {
      let finalText = '';
      let messageType: Message['type'] = 'general';
      let isFirstChunk = true;
      
      // Create a temporary bot message for streaming
      const tempBotMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '',
        isUser: false,
        timestamp: new Date(),
        type: 'general'
      };
      
      setMessages(prev => [...prev, tempBotMessage]);
      
      DeepSeekService.getStreamingResponse(
        userMessage,
        (chunk: StreamingResponse) => {
          // Hide typing indicator on first chunk
          if (isFirstChunk) {
            setIsTyping(false);
            isFirstChunk = false;
          }
          
          // Update the temporary message with streaming text
          setMessages(prev => prev.map(msg => 
            msg.id === tempBotMessage.id 
              ? { ...msg, text: chunk.text }
              : msg
          ));
          
          finalText = chunk.text;
          
          // Determine message type from final chunk
          if (chunk.isComplete && chunk.urgency) {
            if (chunk.urgency === 'high') {
              messageType = 'emergency';
            } else if (chunk.shouldBookAppointment) {
              messageType = 'booking';
            } else if (userMessage.toLowerCase().includes('pain') || userMessage.toLowerCase().includes('symptom')) {
              messageType = 'symptom';
            } else if (userMessage.toLowerCase().includes('advice') || userMessage.toLowerCase().includes('tip')) {
              messageType = 'advice';
            }
            
            // Update the message with final type
            setMessages(prev => prev.map(msg => 
              msg.id === tempBotMessage.id 
                ? { ...msg, type: messageType }
                : msg
            ));
          }
          
          // Resolve when streaming is complete
          if (chunk.isComplete) {
            resolve({
              text: finalText,
              type: messageType
            });
          }
        }
      ).catch((error) => {
        console.error('❌ Error generating bot response:', error);
        console.error('Error details:', error.message);
        
        // Hide typing indicator on error
        setIsTyping(false);
        
        // Remove temporary message and add error message
        setMessages(prev => prev.filter(msg => msg.id !== tempBotMessage.id));
        
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error. Please try again later.',
          isUser: false,
          timestamp: new Date(),
          type: 'general'
        };
        
        setMessages(prev => [...prev, errorMessage]);
        resolve({
          text: 'Sorry, I encountered an error. Please try again later.',
          type: 'general'
        });
      });
    });
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    // Dismiss keyboard when sending message
    Keyboard.dismiss();

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
    
    // Check for local greeting response first
    const localResponse = getLocalGreetingResponse(userMessage.text);
    
    if (localResponse) {
      // Use local response for greetings - instant response
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: localResponse.text,
        isUser: false,
        timestamp: new Date(),
        type: localResponse.type
      };
      
      // Small delay to make it feel more natural
      setTimeout(() => {
        setMessages(prev => [...prev, botMessage]);
      }, 300 + Math.random() * 200); // Random delay between 300-500ms
      return;
    }
    
    // For non-greetings, use API with typing indicator
    setIsTyping(true);

    // Generate bot response with streaming
    try {
      await generateBotResponse(userMessage.text);
    } catch (error) {
      console.error('Error in sendMessage:', error);
    } finally {
      // Note: setIsTyping(false) is now handled in generateBotResponse when streaming starts
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
      {/* Invisible Header with DocBot Branding */}
      <View style={styles.invisibleHeader}>
          <TouchableOpacity 
          style={styles.headerButton}
            onPress={() => {
              setShowHistory(!showHistory);
            }}
          >
          <FontAwesome name="history" size={20} color="#666" />
          </TouchableOpacity>
          
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>DocBot</Text>
          <FontAwesome name="check-circle" size={16} color="#1DA1F2" style={styles.verifiedBadge} />
          </View>
          
                    <TouchableOpacity 
            style={styles.headerButton}
            onPress={startNewChat}
          >
          <FontAwesome name="plus" size={20} color="#666" />
          </TouchableOpacity>
      </View>

      {/* Messages Container - Full Screen */}
      <KeyboardAvoidingView 
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
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
          
          {/* Enhanced Welcome Message with Animations */}
          {messages.length === 0 && (
            <Animated.View 
              style={{
                alignItems: 'center',
                paddingVertical: 0,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8F9FA']}
                style={styles.welcomeCard}
              >
                <TouchableOpacity
                  onPress={startNewChat}
                >
                  <Animated.View 
                    style={[
                      styles.welcomeIconContainer,
                      { transform: [{ scale: pulseAnim }] }
                    ]}
                  >
                    <Image 
                      source={require('../assets/images/DA.png')} 
                      style={styles.welcomeAvatar}
                      resizeMode="stretch"
                    />
                  </Animated.View>
                </TouchableOpacity>
                <Text style={styles.welcomeTitle}>
                  Hi, I'm DocBot! 👋
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  How can I help you today? I'm here to assist with your health questions and provide medical guidance.
                </Text>
                
                {/* Quick Action Buttons */}
                <View style={styles.quickActionsContainer}>
                  <TouchableOpacity 
                    style={styles.quickActionButton}
                    onPress={() => {
                      Keyboard.dismiss();
                      setInputText("I have a headache");
                      sendMessage();
                    }}
                  >
                    <FontAwesome name="stethoscope" size={16} color="#4CAF50" />
                    <Text style={styles.quickActionText}>Headache</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.quickActionButton}
                    onPress={() => {
                      Keyboard.dismiss();
                      setInputText("I have a fever");
                      sendMessage();
                    }}
                  >
                    <FontAwesome name="thermometer-half" size={16} color="#FF6B6B" />
                    <Text style={styles.quickActionText}>Fever</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.quickActionButton}
                    onPress={() => {
                      Keyboard.dismiss();
                      setInputText("I need to book an appointment");
                      sendMessage();
                    }}
                  >
                    <FontAwesome name="calendar" size={16} color="#45B7D1" />
                    <Text style={styles.quickActionText}>Book Appointment</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.quickActionButton}
                    onPress={() => {
                      Keyboard.dismiss();
                      setInputText("What are your pricing plans?");
                      sendMessage();
                    }}
                  >
                    <FontAwesome name="credit-card" size={16} color="#4ECDC4" />
                    <Text style={styles.quickActionText}>Pricing</Text>
                  </TouchableOpacity>
              </View>
              </LinearGradient>
            </Animated.View>
          )}

          {messages.map((message, index) => (
            <Animated.View
              key={message.id || `msg_${index}`}
              style={[
                styles.messageContainer,
                message.isUser ? styles.userMessage : styles.botMessage,
                {
                  opacity: fadeAnim,
                  transform: [{ 
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })
                  }]
                }
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
                  
                  {/* DeepSeek-style Action Buttons for Bot Messages */}
                  {!message.isUser && (
                    <View style={styles.messageActions}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => {
                          // TODO: Implement copy functionality
                          console.log('Copy pressed');
                        }}
                      >
                        <FontAwesome name="copy" size={14} color="#666" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => {
                          // TODO: Implement reanswer functionality
                          console.log('Reanswer pressed');
                        }}
                      >
                        <FontAwesome name="refresh" size={14} color="#666" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => {
                          // TODO: Implement thumbs up functionality
                          console.log('Thumbs up pressed');
                        }}
                      >
                        <FontAwesome name="thumbs-up" size={14} color="#666" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => {
                          // TODO: Implement thumbs down functionality
                          console.log('Thumbs down pressed');
                        }}
                      >
                        <FontAwesome name="thumbs-down" size={14} color="#666" />
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  <Text style={[
                    styles.messageTime,
                    message.isUser ? styles.userTime : styles.botTime
                  ]}>
                    {formatTime(message.timestamp)}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
          
          {isTyping && (
            <Animated.View 
              style={[
                styles.messageContainer,
                {
                  opacity: typingAnim,
                  transform: [
                    { scale: typingAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1]
                    })},
                    { scale: cardPulseAnim }
                  ]
                }
              ]}
            >
              <View style={styles.typingCard}>
                <View style={styles.typingHeader}>
                  <View style={styles.typingAvatar}>
                    <FontAwesome name="user-md" size={20} color="#4CAF50" />
                  </View>
                  <View style={styles.typingInfo}>
                    <Text style={styles.typingName}>DocBot</Text>
                    <Text style={styles.typingStatus}>
                      {thinkingState === 0 && "🤔 Thinking..."}
                      {thinkingState === 1 && "🔍 Analyzing your question..."}
                      {thinkingState === 2 && "📝 Preparing response..."}
                    </Text>
                  </View>
                </View>
                <View style={styles.typingDots}>
                  <Animated.View style={[
                    styles.dot, 
                    { 
                      opacity: dot1Anim,
                      transform: [{ scale: dot1Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1.2]
                      })}]
                    }
                  ]} />
                  <Animated.View style={[
                    styles.dot, 
                    { 
                      opacity: dot2Anim,
                      transform: [{ scale: dot2Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1.2]
                      })}]
                    }
                  ]} />
                  <Animated.View style={[
                    styles.dot, 
                    { 
                      opacity: dot3Anim,
                      transform: [{ scale: dot3Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1.2]
                      })}]
                    }
                  ]} />
                </View>
                <View style={styles.progressContainer}>
                  <Animated.View 
                    style={[
                      styles.progressBar,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%']
                        })
                      }
                    ]} 
                  />
                </View>
                <View style={styles.typingTips}>
                  <Text style={styles.typingTipText}>
                    {thinkingTipState === 0 && "💡 Tip: While I'm thinking, you can browse our doctors in the Discover tab"}
                    {thinkingTipState === 1 && "💡 Tip: You can also check your appointment history in the Dashboard"}
                    {thinkingTipState === 2 && "💡 Tip: Need urgent care? Our doctors are available 24/7"}
                    {thinkingTipState === 3 && "💡 Tip: You can ask me about symptoms, medications, or general health advice"}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Enhanced Input Area with Gradient */}
        <LinearGradient
          colors={['#FFFFFF', '#F8F9FA']}
          style={styles.inputContainer}
        >
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
              <LinearGradient
                colors={inputText.trim() ? ['#4CAF50', '#45B7D1'] : ['#E0E0E0', '#E0E0E0']}
                style={styles.sendButtonGradient}
            >
              <FontAwesome 
                name="send" 
                size={18} 
                color={inputText.trim() ? "#FFFFFF" : "#CCC"} 
              />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
      
      {/* Modern Full-Screen Chat History */}
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
              <View style={styles.historyHeaderTop}>
                <TouchableOpacity 
                  onPress={() => setShowHistory(false)}
                  style={styles.backButton}
                >
                  <FontAwesome name="arrow-left" size={20} color="#666" />
                </TouchableOpacity>
              <Text style={styles.historyTitle}>Chat History</Text>
                {chatHistory.length > 0 && (
                  <TouchableOpacity 
                    onPress={clearAllChatHistory}
                    style={styles.clearButton}
                  >
                    <FontAwesome name="trash" size={18} color="#FF4444" />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <FontAwesome name="search" size={16} color="#999" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search conversations..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
              </View>
            </View>
            
            <ScrollView style={styles.historyList}>
              {filteredHistory.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <View style={styles.emptyHistoryIcon}>
                    <FontAwesome name="search" size={48} color="#CCC" />
                  </View>
                  <Text style={styles.emptyHistoryText}>
                    {searchQuery.trim() ? 'No conversations found' : 'No chat history yet'}
                  </Text>
                  <Text style={styles.emptyHistorySubtext}>
                    {searchQuery.trim() ? 'Try a different search term' : 'Your conversations will appear here'}
                  </Text>
                </View>
              ) : (
                filteredHistory.map((chat) => (
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

  // Invisible Header Styles
  invisibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  verifiedBadge: {
    marginLeft: 6,
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
    paddingTop: 20,
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
  typingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typingAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingInfo: {
    marginLeft: 12,
  },
  typingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  typingStatus: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typingTips: {
    alignItems: 'center',
  },
  typingTipText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
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
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  historyHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historyHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
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
  emptyHistoryIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    borderBottomColor: '#F8F9FA',
    backgroundColor: '#FFFFFF',
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
  
  // Enhanced Styles
  welcomeCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20,
  },
  welcomeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 120,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },

  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
}); 