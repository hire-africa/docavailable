import AsyncStorage from '@react-native-async-storage/async-storage';

const TOUR_COMPLETED_KEY = 'app_tour_completed';
const PATIENT_TOUR_COMPLETED_KEY = 'patient_tour_completed';
const DOCTOR_TOUR_COMPLETED_KEY = 'doctor_tour_completed';
const DOCTOR_PROFILE_TOUR_COMPLETED_KEY = 'doctor_profile_tour_completed';
const CHAT_TOUR_COMPLETED_KEY = 'chat_tour_completed';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // ref name for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // Optional action to perform (e.g., switch tabs)
  imagePath?: any; // Optional image to display in the tour step
}

export interface TourConfig {
  userType: 'patient' | 'doctor';
  steps: TourStep[];
}

// Patient tour steps
export const PATIENT_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to DocAvailable',
    description: 'Your health journey starts here. Let\'s show you around your new personal healthcare hub.',
    target: 'welcome',
    position: 'center',
    imagePath: require('../assets/images/ai-doc.png'),
  },
  {
    id: 'home-tab',
    title: 'Your Health Dashboard',
    description: 'Everything you need in one place. Track appointments, view activity, and get quick access to care.',
    target: 'home-tab',
    position: 'top',
  },
  {
    id: 'discover-tab',
    title: 'Find Your Specialist',
    description: 'Browse top-rated doctors, view detailed profiles, and connect with the right expert for your needs.',
    target: 'discover-tab',
    position: 'top',
  },
  {
    id: 'messages-tab',
    title: 'Secure Messaging',
    description: 'Direct, private communication with your doctors. Keep all your health conversations organized.',
    target: 'messages-tab',
    position: 'top',
  },
  {
    id: 'blogs-tab',
    title: 'Health Insights',
    description: 'Stay informed with the latest medical news and wellness tips curated just for you.',
    target: 'blogs-tab',
    position: 'top',
  },
  {
    id: 'docbot-tab',
    title: 'Meet AI Doc',
    description: 'Your 24/7 health assistant. Ask questions, get symptom guidance, and find care instantly.',
    target: 'docbot-tab',
    position: 'top',
  },
  {
    id: 'complete',
    title: 'Ready to Explore?',
    description: 'You\'re all set! Tap on the arrow button to go back and start your first consulatation.',
    target: 'complete',
    position: 'center',
    imagePath: require('../assets/images/ai-doc2.png'),
  },
];

// Doctor Profile Tour Steps
export const DOCTOR_PROFILE_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Doctor Profiles! 👋',
    description: 'Let me show you how to connect with your healthcare provider and get the care you need.',
    target: 'welcome',
    position: 'center',
    imagePath: require('../assets/images/ai-doc3.png'),
  },
  {
    id: 'profile-intro',
    title: 'Doctor Profile',
    description: 'Here is where you can see detailed information about the doctor, their experience, and qualifications.',
    target: 'profile-info',
    position: 'top', // Changed from 'bottom' to keep tooltip visible
  },
  {
    id: 'talk-now',
    title: 'Instant Consultation',
    description: 'Need help right now? Tap "Talk Now" to start an immediate session if the doctor is online.',
    target: 'talk-now-btn',
    position: 'top',
  },
  {
    id: 'book-appt',
    title: 'Schedule a Visit',
    description: 'Prefer to plan ahead? Use "Book Appointment" to schedule a consultation for a later time.',
    target: 'book-appt-btn',
    position: 'top',
  },
  {
    id: 'reviews',
    title: 'Patient Reviews',
    description: 'See what other patients are saying. Read verified reviews to make an informed choice.',
    target: 'reviews-section',
    position: 'bottom', // Changed to bottom to keep tooltip on screen
  },
  {
    id: 'profile-complete',
    title: 'Start Your Journey!',
    description: 'You now know how to connect with doctors. Go ahead and start your first consultation!',
    target: 'complete',
    position: 'center',
  },
];

// Chat Tour Steps
export const CHAT_TOUR_STEPS: TourStep[] = [
  {
    id: 'chat-security',
    title: 'Secure & Private',
    description: 'Your privacy is our priority. All messages in this chat are end-to-end encrypted and cannot be shared.',
    target: 'security-msg',
    position: 'bottom',
  },
  {
    id: 'session-info',
    title: 'Session Control',
    description: 'The session timer starts only after the doctor replies. You are in control and can end the session anytime.',
    target: 'session-header',
    position: 'bottom',
  },
  {
    id: 'call-buttons',
    title: 'Text Session',
    description: 'Call buttons are disabled because this is a text-only session. You can upgrade to a call if needed.',
    target: 'call-buttons',
    position: 'bottom',
  },
  {
    id: 'chat-input',
    title: 'Start Chatting!',
    description: 'Type your message here to start the conversation. You can also send images and voice notes.',
    target: 'chat-input',
    position: 'top',
  },
];

// Doctor tour steps
export const DOCTOR_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to DocAvailable! 👋',
    description: 'Let\'s take a quick tour to help you get started with your doctor dashboard.',
    target: 'welcome',
    position: 'center',
    imagePath: require('../assets/images/ai-doc.png'),
  },
  {
    id: 'home-tab',
    title: 'Home Dashboard 🏠',
    description: 'Your home screen shows your upcoming appointments, booking requests, and quick stats.',
    target: 'home-tab',
    position: 'top',
  },
  {
    id: 'appointments-tab',
    title: 'Manage Appointments 📅',
    description: 'Review and respond to booking requests, manage your confirmed appointments, and handle reschedules.',
    target: 'appointments-tab',
    position: 'top',
  },
  {
    id: 'messages-tab',
    title: 'Patient Messages 💬',
    description: 'Communicate with your patients through secure messaging. View active sessions and chat history.',
    target: 'messages-tab',
    position: 'top',
  },
  {
    id: 'working-hours-tab',
    title: 'Working Hours ⏰',
    description: 'Set your availability schedule so patients can book appointments during your preferred times.',
    target: 'working-hours-tab',
    position: 'top',
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🎉',
    description: 'You\'re ready to start receiving appointments! Make sure to set your working hours so patients can book with you.',
    target: 'complete',
    position: 'center',
  },
];

class AppTourService {
  /**
   * Check if the user has completed the tour for their user type
   */
  async hasCompletedTour(userType: 'patient' | 'doctor'): Promise<boolean> {
    try {
      const key = userType === 'patient' ? PATIENT_TOUR_COMPLETED_KEY : DOCTOR_TOUR_COMPLETED_KEY;
      const completed = await AsyncStorage.getItem(key);
      return completed === 'true';
    } catch (error) {
      console.error('Error checking tour completion:', error);
      return false;
    }
  }

  /**
   * Mark the tour as completed for the user type
   */
  async markTourCompleted(userType: 'patient' | 'doctor'): Promise<void> {
    try {
      const key = userType === 'patient' ? PATIENT_TOUR_COMPLETED_KEY : DOCTOR_TOUR_COMPLETED_KEY;
      await AsyncStorage.setItem(key, 'true');
      // Also mark general tour as completed
      await AsyncStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    } catch (error) {
      console.error('Error marking tour as completed:', error);
    }
  }

  /**
   * Check if the user has completed the doctor profile tour
   */
  async hasCompletedDoctorProfileTour(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(DOCTOR_PROFILE_TOUR_COMPLETED_KEY);
      return completed === 'true';
    } catch (error) {
      console.error('Error checking doctor profile tour completion:', error);
      return false;
    }
  }

  /**
   * Mark the doctor profile tour as completed
   */
  async markDoctorProfileTourCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(DOCTOR_PROFILE_TOUR_COMPLETED_KEY, 'true');
    } catch (error) {
      console.error('Error marking doctor profile tour as completed:', error);
    }
  }

  /**
   * Check if the user has completed the chat tour
   */
  async hasCompletedChatTour(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(CHAT_TOUR_COMPLETED_KEY);
      return completed === 'true';
    } catch (error) {
      console.error('Error checking chat tour completion:', error);
      return false;
    }
  }

  /**
   * Mark the chat tour as completed
   */
  async markChatTourCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(CHAT_TOUR_COMPLETED_KEY, 'true');
    } catch (error) {
      console.error('Error marking chat tour as completed:', error);
    }
  }

  /**
   * Reset tour completion (useful for testing or if user wants to see it again)
   */
  async resetTour(userType: 'patient' | 'doctor'): Promise<void> {
    try {
      const key = userType === 'patient' ? PATIENT_TOUR_COMPLETED_KEY : DOCTOR_TOUR_COMPLETED_KEY;
      await AsyncStorage.removeItem(key);
      await AsyncStorage.removeItem(DOCTOR_PROFILE_TOUR_COMPLETED_KEY);
      await AsyncStorage.removeItem(CHAT_TOUR_COMPLETED_KEY);
    } catch (error) {
      console.error('Error resetting tour:', error);
    }
  }

  /**
   * Get tour steps for a user type
   */
  getTourSteps(userType: 'patient' | 'doctor'): TourStep[] {
    return userType === 'patient' ? PATIENT_TOUR_STEPS : DOCTOR_TOUR_STEPS;
  }
}

export default new AppTourService();

