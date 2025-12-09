import AsyncStorage from '@react-native-async-storage/async-storage';

const TOUR_COMPLETED_KEY = 'app_tour_completed';
const PATIENT_TOUR_COMPLETED_KEY = 'patient_tour_completed';
const DOCTOR_TOUR_COMPLETED_KEY = 'doctor_tour_completed';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // ref name for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // Optional action to perform (e.g., switch tabs)
}

export interface TourConfig {
  userType: 'patient' | 'doctor';
  steps: TourStep[];
}

// Patient tour steps
export const PATIENT_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to DocAvailable! 👋',
    description: 'Let\'s take a quick tour to help you get started. We\'ll show you the key features.',
    target: 'welcome',
    position: 'center',
  },
  {
    id: 'home-tab',
    title: 'Home Tab 🏠',
    description: 'Your home screen shows your upcoming appointments, recent activity, and quick access to important features.',
    target: 'home-tab',
    position: 'top',
  },
  {
    id: 'discover-tab',
    title: 'Discover Doctors 🔍',
    description: 'Browse and search for doctors by specialization, location, or name. You can view profiles and book appointments.',
    target: 'discover-tab',
    position: 'top',
  },
  {
    id: 'messages-tab',
    title: 'Messages 💬',
    description: 'Chat with your doctors, view your conversation history, and manage your active sessions.',
    target: 'messages-tab',
    position: 'top',
  },
  {
    id: 'blogs-tab',
    title: 'Health Blogs 📰',
    description: 'Read informative health articles and stay updated with the latest medical information.',
    target: 'blogs-tab',
    position: 'top',
  },
  {
    id: 'docbot-tab',
    title: 'AI Doc Assistant 🤖',
    description: 'Get instant health guidance from our AI assistant. AI Doc can answer questions and help you find the right doctor.',
    target: 'docbot-tab',
    position: 'top',
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🎉',
    description: 'You now know how to navigate DocAvailable. Start by discovering doctors or checking your appointments!',
    target: 'complete',
    position: 'center',
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
   * Reset tour completion (useful for testing or if user wants to see it again)
   */
  async resetTour(userType: 'patient' | 'doctor'): Promise<void> {
    try {
      const key = userType === 'patient' ? PATIENT_TOUR_COMPLETED_KEY : DOCTOR_TOUR_COMPLETED_KEY;
      await AsyncStorage.removeItem(key);
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

