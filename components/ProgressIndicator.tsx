import React from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export interface ProgressStep {
  id: number;
  title: string;
  completed: boolean;
  current: boolean;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep: number;
  totalSteps: number;
  showStepTitles?: boolean;
  compact?: boolean;
  style?: any;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  totalSteps,
  showStepTitles = false,
  compact = false,
  style
}) => {
  const progressPercentage = Math.min((currentStep / totalSteps) * 100, 100);
  const progressWidth = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: progressPercentage,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progressPercentage]);

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactProgressBar}>
          <Animated.View
            style={[
              styles.compactProgressFill,
              {
                width: progressWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.compactProgressText}>
          Step {currentStep} of {totalSteps}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressPercentage}>
          {Math.round(progressPercentage)}%
        </Text>
      </View>

      {/* Step Indicators */}
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <View key={step.id} style={styles.stepContainer}>
            <View
              style={[
                styles.stepCircle,
                step.completed && styles.stepCompleted,
                step.current && styles.stepCurrent,
              ]}
            >
              {step.completed ? (
                <FontAwesome name="check" size={12} color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    step.current && styles.stepNumberCurrent,
                  ]}
                >
                  {step.id}
                </Text>
              )}
            </View>
            
            {showStepTitles && (
              <Text
                style={[
                  styles.stepTitle,
                  step.completed && styles.stepTitleCompleted,
                  step.current && styles.stepTitleCurrent,
                ]}
                numberOfLines={2}
              >
                {step.title}
              </Text>
            )}
            
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  step.completed && styles.stepConnectorCompleted,
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {/* Current Step Info */}
      <View style={styles.currentStepInfo}>
        <Text style={styles.currentStepTitle}>
          {steps.find(s => s.current)?.title || `Step ${currentStep}`}
        </Text>
        <Text style={styles.currentStepDescription}>
          {currentStep} of {totalSteps} completed
        </Text>
      </View>
    </View>
  );
};

export const FileUploadProgress: React.FC<{
  progress: number;
  stage: string;
  message: string;
  onCancel?: () => void;
}> = ({ progress, stage, message, onCancel }) => {
  const progressWidth = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: progress * 100,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.uploadContainer}>
      <View style={styles.uploadHeader}>
        <Text style={styles.uploadStage}>{stage}</Text>
        {onCancel && (
          <FontAwesome
            name="times"
            size={16}
            color="#666"
            onPress={onCancel}
            style={styles.cancelButton}
          />
        )}
      </View>
      
      <View style={styles.uploadProgressBar}>
        <Animated.View
          style={[
            styles.uploadProgressFill,
            {
              width: progressWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      
      <Text style={styles.uploadMessage}>{message}</Text>
      <Text style={styles.uploadPercentage}>
        {Math.round(progress * 100)}%
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  
  compactProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginRight: 10,
  },
  
  compactProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  
  compactProgressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 10,
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    minWidth: 40,
    textAlign: 'right',
  },
  
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  stepCompleted: {
    backgroundColor: '#4CAF50',
  },
  
  stepCurrent: {
    backgroundColor: '#2196F3',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  
  stepNumberCurrent: {
    color: '#FFFFFF',
  },
  
  stepTitle: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  
  stepTitleCompleted: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  
  stepTitleCurrent: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  
  stepConnector: {
    position: 'absolute',
    top: 16,
    left: '50%',
    width: width / 4 - 32,
    height: 2,
    backgroundColor: '#E0E0E0',
    zIndex: -1,
  },
  
  stepConnectorCompleted: {
    backgroundColor: '#4CAF50',
  },
  
  currentStepInfo: {
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  
  currentStepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  
  currentStepDescription: {
    fontSize: 12,
    color: '#666',
  },
  
  // File Upload Progress Styles
  uploadContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15,
    marginVertical: 10,
  },
  
  uploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  uploadStage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  
  cancelButton: {
    padding: 5,
  },
  
  uploadProgressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 8,
  },
  
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  
  uploadMessage: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  
  uploadPercentage: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'right',
  },
});

export default ProgressIndicator;
