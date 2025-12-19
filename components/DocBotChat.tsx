import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Clipboard,
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
import { BackendChatbotService, BackendStreamingResponse } from '../services/backendChatbotService';
import { PromptLimitService, PromptLimitStatus } from '../services/promptLimitService';
import AIDocHistory from './DocAvaHistory';
import MarkdownText from './MarkdownText';

const { width, height } = Dimensions.get('window');

interface Message {
  id?: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'symptom' | 'advice' | 'booking' | 'emergency' | 'general';
  isComplete?: boolean;
  feedback?: 'thumbs_up' | 'thumbs_down' | null;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}

interface AIDocChatProps {
  onBottomHiddenChange?: (hidden: boolean) => void;
}

export default function AIDocChat({ onBottomHiddenChange }: AIDocChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showHistoryPage, setShowHistoryPage] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [isBottomHidden, setIsBottomHidden] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [promptLimitStatus, setPromptLimitStatus] = useState<PromptLimitStatus>({
    remaining: 5,
    total: 5,
    resetTime: '',
    isLimitReached: false
  });
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation value for history panel
  const slideAnim = useRef(new Animated.Value(-width)).current;
  // Animation value for bottom nav
  const bottomSlideAnim = useRef(new Animated.Value(0)).current;
  // Animation value for floating button pop-up
  const buttonScaleAnim = useRef(new Animated.Value(0)).current;
  // Animation value for history page slide
  const historySlideAnim = useRef(new Animated.Value(-width)).current;
  // Animation values for enhanced typing indicator
  const typingAnim1 = useRef(new Animated.Value(0)).current;
  const typingAnim2 = useRef(new Animated.Value(0)).current;
  const typingAnim3 = useRef(new Animated.Value(0)).current;
  const typingPulseAnim = useRef(new Animated.Value(1)).current;
  const typingFadeAnim = useRef(new Animated.Value(0)).current;

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
      
      if (currentChatId) {
        // Update existing chat in history
        const updatedHistory = chatHistory.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: [...messages], timestamp: new Date() }
            : chat
        );
        setChatHistory(updatedHistory);
        saveChatHistoryToStorage(updatedHistory);
      } else {
        // Create new chat session
        const newChatSession: ChatSession = {
          id: Date.now().toString(),
          title: chatTitle,
          messages: [...messages],
          timestamp: new Date(),
        };
        
        const updatedHistory = [newChatSession, ...chatHistory];
        setChatHistory(updatedHistory);
        saveChatHistoryToStorage(updatedHistory);
        setCurrentChatId(newChatSession.id);
      }
    }
  };

  // Save current chat session to AsyncStorage
  const saveCurrentChatSession = async () => {
    try {
      if (messages.length > 0) {
        const currentChat = {
          messages: messages,
          inputText: inputText,
          chatId: currentChatId,
          timestamp: new Date()
        };
        await AsyncStorage.setItem('docava_current_chat', JSON.stringify(currentChat));
      }
    } catch (error) {
      console.error('Error saving current chat session:', error);
    }
  };

  // Load current chat session from AsyncStorage
  const loadCurrentChat = async () => {
    try {
      const savedCurrentChat = await AsyncStorage.getItem('docava_current_chat');
      if (savedCurrentChat) {
        const parsedChat = JSON.parse(savedCurrentChat);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsedChat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
        setInputText(parsedChat.inputText || '');
        setCurrentChatId(parsedChat.chatId || null);
      }
    } catch (error) {
      console.error('Error loading current chat session:', error);
    }
  };

  // Load chat from history
  const loadChatFromHistory = (chatSession: ChatSession) => {
    setMessages(chatSession.messages);
    setCurrentChatId(chatSession.id);
    setShowHistory(false);
  };

  // Load chat from history page
  const loadChatFromHistoryPage = (chatSession: ChatSession) => {
    setMessages(chatSession.messages);
    setCurrentChatId(chatSession.id);
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

  // Enhanced typing animation
  const startTypingAnimation = () => {
    // Reset all animations
    typingAnim1.setValue(0);
    typingAnim2.setValue(0);
    typingAnim3.setValue(0);
    typingPulseAnim.setValue(1);
    typingFadeAnim.setValue(0);

    // Fade in animation
    Animated.timing(typingFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(typingPulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(typingPulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    // Smooth sequential left-to-right dot animation
    const dotAnimation = Animated.loop(
      Animated.sequence([
        // First dot - scale up and fade in
        Animated.timing(typingAnim1, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // First dot - scale down and fade out
        Animated.timing(typingAnim1, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        // Second dot - scale up and fade in
        Animated.timing(typingAnim2, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Second dot - scale down and fade out
        Animated.timing(typingAnim2, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        // Third dot - scale up and fade in
        Animated.timing(typingAnim3, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Third dot - scale down and fade out
        Animated.timing(typingAnim3, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        // Small pause before next cycle
        Animated.delay(150),
      ])
    );

    // Start animations
    pulseAnimation.start();
    dotAnimation.start();
  };

  const stopTypingAnimation = () => {
    // Fade out animation
    Animated.timing(typingFadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Toggle bottom panel visibility
  const toggleBottomPanel = () => {
    // Don't animate when keyboard is visible
    if (isKeyboardVisible) {
      return;
    }
    
    const newState = !isBottomHidden;
    setIsBottomHidden(newState);
    animateBottomNav(newState);
    onBottomHiddenChange?.(newState);
  };

  // Load prompt limit status
  const loadPromptLimitStatus = async () => {
    try {
      const status = await PromptLimitService.getPromptLimitStatus();
      setPromptLimitStatus(status);
    } catch (error) {
      console.error('Error loading prompt limit status:', error);
    }
  };

  // Load chat history and current chat on component mount
  useEffect(() => {
    loadChatHistory();
    loadCurrentChat();
    loadPromptLimitStatus();
  }, []);

  // Save current chat when messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveCurrentChatSession();
      // If we have a current chat ID, update the existing chat in history
      if (currentChatId) {
        const updatedHistory = chatHistory.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: [...messages], timestamp: new Date() }
            : chat
        );
        setChatHistory(updatedHistory);
        saveChatHistoryToStorage(updatedHistory);
      }
    }
  }, [messages]);

  // Save current chat when input text changes
  useEffect(() => {
    if (inputText.length > 0) {
      saveCurrentChatSession();
    }
  }, [inputText]);

  // Save current chat when component unmounts
  useEffect(() => {
    return () => {
      // Save current chat when component unmounts
      if (messages.length > 0) {
        saveCurrentChatSession();
      }
    };
  }, [messages]);

  // Keyboard visibility detection
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      console.log('Keyboard shown, height:', event.endCoordinates.height);
      setIsKeyboardVisible(true);
      animateButtonPopUp(false); // Hide button with animation
      
      // Reset bottom panel to hidden state when keyboard shows
      if (!isBottomHidden) {
        setIsBottomHidden(true);
        animateBottomNav(true);
        onBottomHiddenChange?.(true);
      }
      
      // Reset the animation value to ensure no transform when keyboard is visible
      bottomSlideAnim.setValue(0);
      
      // Scroll to bottom when keyboard shows
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, Platform.OS === 'ios' ? 300 : 100);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      console.log('Keyboard hidden');
      setIsKeyboardVisible(false);
      animateButtonPopUp(true); // Show button with animation
      
      // Restore the animation value when keyboard hides
      bottomSlideAnim.setValue(isBottomHidden ? 1 : 0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [isBottomHidden, onBottomHiddenChange]);

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
    // Prevent multiple simultaneous calls
    if (isGeneratingResponse) {
      console.log('⚠️ Already generating response, skipping duplicate call');
      return { text: '', type: 'general' };
    }
    
    setIsGeneratingResponse(true);
    console.log('🤖 Calling OpenAI service with streaming:', userMessage);
    
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
      
      BackendChatbotService.getStreamingResponse(
        userMessage,
        (chunk: BackendStreamingResponse) => {
          // Hide typing indicator on first chunk
          if (isFirstChunk) {
            setIsTyping(false);
            stopTypingAnimation();
            isFirstChunk = false;
          }
          
          // Accumulate text for final response
          if (chunk.text) {
            finalText += chunk.text;
          }
          
          // Update the temporary message with accumulated text
          setMessages(prev => prev.map(msg => 
            msg.id === tempBotMessage.id 
              ? { ...msg, text: finalText }
              : msg
          ));
          
          // Determine message type from final chunk
          if (chunk.isComplete) {
            // Determine message type based on content analysis
            const lowerMessage = userMessage.toLowerCase();
            const lowerResponse = finalText.toLowerCase();
            
            if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent') || 
                lowerResponse.includes('emergency') || lowerResponse.includes('urgent') ||
                lowerResponse.includes('call 911') || lowerResponse.includes('immediately')) {
              messageType = 'emergency';
            } else if (lowerResponse.includes('book') || lowerResponse.includes('appointment') || 
                       lowerResponse.includes('schedule') || lowerResponse.includes('consultation')) {
              messageType = 'booking';
            } else if (lowerMessage.includes('pain') || lowerMessage.includes('symptom') ||
                       lowerMessage.includes('hurt') || lowerMessage.includes('ache')) {
              messageType = 'symptom';
            } else if (lowerMessage.includes('advice') || lowerMessage.includes('tip') ||
                       lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
              messageType = 'advice';
            }
            
            // Update the final message with correct type and mark as complete
            setMessages(prev => prev.map(msg => 
              msg.id === tempBotMessage.id 
                ? { ...msg, type: messageType, isComplete: true }
                : msg
            ));
            
            console.log('📝 Streaming complete:', finalText);
            console.log('🏷️  Message type:', messageType);
            
            resolve({
              text: finalText,
              type: messageType
            });
          }
        }
      ).catch((error) => {
        console.error('❌ Error generating streaming bot response:', error);
        console.error('Error details:', error.message);
        
        // Remove the temporary message and add error message
        setMessages(prev => prev.filter(msg => msg.id !== tempBotMessage.id));
        
        resolve({
          text: 'Sorry, I encountered an error. Please try again later.',
          type: 'general'
        });
      }).finally(() => {
        setIsGeneratingResponse(false);
      });
    });
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isGeneratingResponse) return;

    // Check prompt limit before sending
    const canMakePrompt = await PromptLimitService.canMakePrompt();
    if (!canMakePrompt) {
      Alert.alert(
        'Daily Limit Reached',
        `You've used all ${promptLimitStatus.total} daily prompts. Your limit will reset tomorrow.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Record prompt usage
    const newStatus = await PromptLimitService.recordPromptUsage();
    setPromptLimitStatus(newStatus);
    
    // Save chat to history if this is the first message
    if (messages.length === 0) {
      setTimeout(() => {
        saveCurrentChat();
      }, 1000); // Save after bot responds
    }
    setInputText('');
    setIsTyping(true);
    startTypingAnimation();

    // Dismiss keyboard when sending message
    Keyboard.dismiss();

    // Generate bot response with streaming
    setTimeout(async () => {
      await generateBotResponse(userMessage.text);
      // Note: generateBotResponse now handles message creation internally
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
    <>
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'position' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? -50 : 20}
      enabled={true}
    >
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
              <Text style={styles.botName}>AI Doc</Text>
              <FontAwesome name="check-circle" size={16} color="#4CAF50" style={styles.verifiedBadge} />
            </View>
            <View style={styles.promptCounterContainer}>
              <Text style={styles.promptCounterText}>
                {promptLimitStatus.remaining}/{promptLimitStatus.total} prompts left
              </Text>
              {promptLimitStatus.isLimitReached && (
                <Text style={styles.promptResetText}>
                  Resets in {PromptLimitService.getTimeUntilReset()}
                </Text>
              )}
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
              setCurrentChatId(null);
              // Clear current chat from storage
              AsyncStorage.removeItem('docava_current_chat');
            }}
          >
            <FontAwesome name="plus" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages Container */}
      <View style={[styles.messagesContainer, { backgroundColor: '#F8F9FA' }]}>
        <Animated.View 
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            transform: isKeyboardVisible ? [] : [{
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
            style={[styles.messagesList, { backgroundColor: '#F8F9FA' }]}
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
                    Hi, I&apos;m AI Doc! 👋
                  </Text>
                  <Text style={{
                    fontSize: 16,
                    color: '#666',
                    textAlign: 'center',
                    lineHeight: 22,
                  }}>
                    How can I help you today? I&apos;m here to assist with your health questions and provide medical guidance.
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
                    {message.isUser ? (
                      <Text
                        style={[
                          styles.messageText,
                          styles.userText,
                        ]}
                      >
                        {message.text}
                      </Text>
                    ) : (
                      <MarkdownText
                        style={[
                          styles.messageText,
                          styles.botText,
                        ]}
                      >
                        {message.text}
                      </MarkdownText>
                    )}
                    
                    {/* Show time and interaction buttons only after message is complete */}
                    {message.isComplete && (
                      <View style={styles.messageFooter}>
                        <Text style={[
                          styles.messageTime,
                          message.isUser ? styles.userTime : styles.botTime
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
                              <FontAwesome name="copy" size={14} color="#666" />
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
                                size={14} 
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
                                size={14} 
                                color={message.feedback === 'thumbs_down' ? '#FF4444' : '#666'} 
                              />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
            
            {isTyping && (
              <Animated.View 
                style={[
                  styles.messageContainer,
                  {
                    opacity: typingFadeAnim,
                    transform: [{ scale: typingPulseAnim }]
                  }
                ]}
              >
                <View style={styles.typingCard}>
                  <View style={styles.typingContainer}>
                    <View style={styles.typingDots}>
                      <Animated.View 
                        style={[
                          styles.dot, 
                          styles.dot1,
                          {
                            transform: [{
                              scale: typingAnim1.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, 1.2],
                                extrapolate: 'clamp',
                              })
                            }],
                            opacity: typingAnim1.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.3, 1],
                              extrapolate: 'clamp',
                            })
                          }
                        ]} 
                      />
                      <Animated.View 
                        style={[
                          styles.dot, 
                          styles.dot2,
                          {
                            transform: [{
                              scale: typingAnim2.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, 1.2],
                                extrapolate: 'clamp',
                              })
                            }],
                            opacity: typingAnim2.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.3, 1],
                              extrapolate: 'clamp',
                            })
                          }
                        ]} 
                      />
                      <Animated.View 
                        style={[
                          styles.dot, 
                          styles.dot3,
                          {
                            transform: [{
                              scale: typingAnim3.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, 1.2],
                                extrapolate: 'clamp',
                              })
                            }],
                            opacity: typingAnim3.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.3, 1],
                              extrapolate: 'clamp',
                            })
                          }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
              </Animated.View>
            )}
          </ScrollView>

          {/* Toggle Bottom Panel Button - Floating with Pop-up Animation */}
          {!isKeyboardVisible && (
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
          )}

          {/* Input Field - Inside animated view for bottom tab animation */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.textInput,
                promptLimitStatus.isLimitReached && styles.textInputDisabled
              ]}
              placeholder={promptLimitStatus.isLimitReached ? "Daily limit reached" : "Ask AI Doc"}
              placeholderTextColor={promptLimitStatus.isLimitReached ? "#FF6B6B" : "#999"}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              blurOnSubmit={false}
              editable={!promptLimitStatus.isLimitReached}
            />
            <TouchableOpacity
              style={[
                styles.sendButton, 
                (!inputText.trim() || promptLimitStatus.isLimitReached) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || promptLimitStatus.isLimitReached}
            >
              <FontAwesome 
                name="send" 
                size={18} 
                color={(inputText.trim() && !promptLimitStatus.isLimitReached) ? "#FFFFFF" : "#CCC"} 
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
      
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
      
    </KeyboardAvoidingView>

    {/* AI Doc History Page - Full Screen with Slide Animation - Outside main container */}
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
        <AIDocHistory
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
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
  promptCounterContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  promptCounterText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  promptResetText: {
    fontSize: 10,
    color: '#FF6B6B',
    marginTop: 2,
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
    bottom: 120,
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
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
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
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  interactionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  interactionButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  activeFeedbackButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  typingCard: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 8,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    marginHorizontal: 3,
  },
  dot1: {
    // Dynamic styling handled by animation
  },
  dot2: {
    // Dynamic styling handled by animation
  },
  dot3: {
    // Dynamic styling handled by animation
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
    marginHorizontal: 16,
    marginVertical: 16,
    marginBottom: Platform.OS === 'android' ? 40 : 36,
    position: 'relative',
    zIndex: 1000,
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#222',
    maxHeight: 120,
    minHeight: 60,
  },
  textInputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#999',
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