import { router } from 'expo-router';
import {
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Icon } from './Icon';

const { width } = Dimensions.get('window');

interface IncompleteProfileBlockProps {
  userType: 'patient' | 'doctor' | 'admin';
  missingFields: string[];
  context: 'discover' | 'subscription' | 'appointments' | 'general';
  onComplete?: () => void;
}

export default function IncompleteProfileBlock({ 
  userType, 
  missingFields, 
  context,
  onComplete 
}: IncompleteProfileBlockProps) {
  
  const getContextMessage = () => {
    switch (context) {
      case 'discover':
        return userType === 'doctor' 
          ? "Complete your profile to become visible to patients in the discover page."
          : "Add your location and other details to discover and book appointments with doctors.";
      case 'subscription':
        return "Complete your profile to access subscription plans and pricing.";
      case 'appointments':
        return "Complete your profile to book appointments with doctors.";
      default:
        return "Complete your profile to access all features.";
    }
  };

  const getIconName = () => {
    switch (context) {
      case 'discover':
        return 'search';
      case 'subscription':
        return 'credit-card';
      case 'appointments':
        return 'calendar';
      default:
        return 'exclamation-triangle';
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    } else {
      // Redirect to appropriate edit profile page based on user type
      const editProfilePath = userType === 'doctor' ? '/edit-doctor-profile' : '/edit-patient-profile';
      router.push(editProfilePath);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name={getIconName()} size={48} color="#FF9800" />
        </View>
        
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.message}>{getContextMessage()}</Text>
        
        <View style={styles.missingSection}>
          <Text style={styles.missingTitle}>Missing:</Text>
          <Text style={styles.missingFields}>{missingFields.join(', ')}</Text>
        </View>
        
        <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
          <Text style={styles.completeButtonText}>Complete Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }
    })
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  missingSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  missingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  missingFields: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 160,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
