import {
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { getOnboardingMessage } from '../utils/profileUtils';
import { Icon } from './Icon';

const { width, height } = Dimensions.get('window');

interface OnboardingOverlayProps {
  visible: boolean;
  userType: 'patient' | 'doctor' | 'admin';
  missingFields: string[];
  onComplete: () => void;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export default function OnboardingOverlay({ 
  visible, 
  userType, 
  missingFields, 
  onComplete, 
  onDismiss,
  showDismiss = true 
}: OnboardingOverlayProps) {
  if (!visible) return null;

  const message = getOnboardingMessage(userType);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon 
                name={userType === 'doctor' ? 'user-md' : userType === 'admin' ? 'cog' : 'user'} 
                size={32} 
                color="#4CAF50" 
              />
            </View>
            <Text style={styles.title}>Complete Your Profile</Text>
          </View>
          
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.missingSection}>
            <Text style={styles.missingTitle}>Missing Information:</Text>
            {missingFields.map((field, index) => (
              <Text key={index} style={styles.missingField}>• {field}</Text>
            ))}
          </View>
          
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
              <Text style={styles.completeButtonText}>Complete Profile</Text>
            </TouchableOpacity>
            {showDismiss && onDismiss && (
              <TouchableOpacity style={styles.laterButton} onPress={onDismiss}>
                <Text style={styles.laterButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: height * 0.8,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
      },
      default: {
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      }
    })
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  missingSection: {
    marginBottom: 24,
  },
  missingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  missingField: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    paddingLeft: 8,
  },
  buttons: {
    gap: 12,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  laterButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  laterButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});
