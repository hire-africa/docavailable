import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  doctorName: string;
  sessionType: 'instant' | 'appointment';
  submitting?: boolean;
}

export default function RatingModal({
  visible,
  onClose,
  onSubmit,
  doctorName,
  sessionType,
  submitting = false,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    if (submitting) {
      return; // Prevent multiple submissions
    }

    onSubmit(rating, comment);
    setRating(0);
    setComment('');
    onClose();
  };

  const handleCancel = () => {
    setRating(0);
    setComment('');
    onClose();
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          style={styles.starButton}
        >
          <FontAwesome
            name={i <= rating ? 'star' : 'star-o'}
            size={32}
            color={i <= rating ? '#FFD700' : '#DDD'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconContainer}>
            <FontAwesome name="star" size={32} color="#FFD700" />
          </View>
          
          <Text style={styles.title}>Rate Your Experience</Text>
          
          <Text style={styles.subtitle}>
            How was your {sessionType === 'instant' ? 'instant chat' : 'appointment'} with Dr. {doctorName}?
          </Text>

          <View style={styles.starsContainer}>
            {renderStars()}
          </View>

          {rating > 0 && (
            <View style={styles.ratingText}>
              <Text style={styles.ratingLabel}>
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </Text>
            </View>
          )}

          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>Additional Comments (Optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience..."
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Skip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.submitButton, (rating === 0 || submitting) && styles.submitButtonDisabled]} 
              onPress={handleSubmit}
              disabled={rating === 0 || submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Rating'}
              </Text>
            </TouchableOpacity>
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
    padding: 20,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
  },
  ratingText: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFD700',
    textAlign: 'center',
  },
  commentContainer: {
    width: '100%',
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#DDD',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
}); 