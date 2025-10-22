import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface GoogleUserData {
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  profile_picture?: string;
  google_id: string;
  user_type: string;
}

interface MissingField {
  field: string;
  label: string;
  type: string;
}

interface GoogleSignupQuestionsProps {
  googleUser: GoogleUserData;
  missingFields: MissingField[];
  onComplete: (userData: any) => void;
}

export default function GoogleSignupQuestions() {
  const { googleUser, missingFields } = useLocalSearchParams<{
    googleUser: string;
    missingFields: string;
  }>();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const parsedGoogleUser: GoogleUserData = googleUser ? JSON.parse(googleUser) : {};
  const parsedMissingFields: MissingField[] = missingFields ? JSON.parse(missingFields) : [];

  const currentField = parsedMissingFields[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / parsedMissingFields.length) * 100;

  const handleAnswer = (value: any) => {
    if (currentField) {
      setAnswers(prev => ({
        ...prev,
        [currentField.field]: value
      }));
    }
  };

  const handleNext = () => {
    // Validate current answer before proceeding
    const currentValue = answers[currentField?.field] || '';
    
    // Special validation for different field types
    if (currentField?.type === 'multiselect') {
      if (!currentValue || currentValue.length === 0) {
        Alert.alert('Required Field', `Please select at least one ${currentField?.label.toLowerCase()}`);
        return;
      }
    } else if (currentField?.type === 'textarea') {
      // Textarea is optional, allow empty
    } else if (!currentValue) {
      Alert.alert('Required Field', `Please provide your ${currentField?.label.toLowerCase()}`);
      return;
    }
    
    if (currentQuestionIndex < parsedMissingFields.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Create the complete user data
      const completeUserData = {
        ...parsedGoogleUser,
        ...answers,
        password: `google_user_${parsedGoogleUser.google_id}`,
        password_confirmation: `google_user_${parsedGoogleUser.google_id}`,
        user_type: parsedGoogleUser.user_type,
        email_verified_at: new Date().toISOString(),
        // Handle specializations for doctors
        specializations: answers.specializations ? JSON.stringify(answers.specializations) : null,
      };

      // Call the backend to create the user
      const response = await fetch('https://docavailable-3vbdv.ondigitalocean.app/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(completeUserData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Welcome!',
          'Your account has been created successfully.',
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate to appropriate dashboard
                if (parsedGoogleUser.user_type === 'patient') {
                  router.replace('/patient-dashboard');
                } else if (parsedGoogleUser.user_type === 'doctor') {
                  router.replace('/doctor-dashboard');
                } else {
                  router.replace('/');
                }
              }
            }
          ]
        );
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = () => {
    if (!currentField) return null;

    const currentValue = answers[currentField.field] || '';

    switch (currentField.type) {
      case 'date':
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionLabel}>{currentField.label}</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {currentValue ? new Date(currentValue).toLocaleDateString() : 'Select Date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={currentValue ? new Date(currentValue) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    handleAnswer(selectedDate.toISOString().split('T')[0]);
                  }
                }}
                maximumDate={new Date()}
              />
            )}
          </View>
        );

      case 'select':
        if (currentField.field === 'gender') {
          return (
            <View style={styles.questionContainer}>
              <Text style={styles.questionLabel}>{currentField.label}</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={currentValue}
                  onValueChange={handleAnswer}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Gender" value="" />
                  <Picker.Item label="Male" value="male" />
                  <Picker.Item label="Female" value="female" />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>
            </View>
          );
        }
        break;

      case 'number':
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionLabel}>{currentField.label}</Text>
            <TextInput
              style={styles.textInput}
              value={currentValue.toString()}
              onChangeText={(text) => handleAnswer(parseInt(text) || 0)}
              keyboardType="numeric"
              placeholder={`Enter ${currentField.label.toLowerCase()}`}
            />
          </View>
        );

      case 'textarea':
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionLabel}>{currentField.label}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={currentValue}
              onChangeText={handleAnswer}
              multiline
              numberOfLines={4}
              placeholder={`Tell us about your ${currentField.label.toLowerCase()}`}
              textAlignVertical="top"
            />
          </View>
        );

      case 'multiselect':
        // Handle specializations for doctors
        if (currentField.field === 'specializations') {
          const specializations = [
            'General Medicine', 'Cardiology', 'Dermatology', 'Pediatrics', 'Gynecology',
            'Orthopedics', 'Neurology', 'Psychiatry', 'Ophthalmology', 'ENT',
            'Urology', 'Gastroenterology', 'Endocrinology', 'Rheumatology', 'Oncology'
          ];
          
          return (
            <View style={styles.questionContainer}>
              <Text style={styles.questionLabel}>{currentField.label}</Text>
              <Text style={styles.questionSubtext}>Select all that apply</Text>
              <View style={styles.multiselectContainer}>
                {specializations.map((spec) => {
                  const isSelected = currentValue.includes(spec);
                  return (
                    <TouchableOpacity
                      key={spec}
                      style={[
                        styles.multiselectOption,
                        isSelected && styles.multiselectOptionSelected
                      ]}
                      onPress={() => {
                        const newValue = isSelected 
                          ? currentValue.filter((item: string) => item !== spec)
                          : [...currentValue, spec];
                        handleAnswer(newValue);
                      }}
                    >
                      <Text style={[
                        styles.multiselectOptionText,
                        isSelected && styles.multiselectOptionTextSelected
                      ]}>
                        {spec}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        }
        break;

      default: // text
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionLabel}>{currentField.label}</Text>
            <TextInput
              style={styles.textInput}
              value={currentValue}
              onChangeText={handleAnswer}
              placeholder={`Enter your ${currentField.label.toLowerCase()}`}
            />
          </View>
        );
    }
  };

  if (parsedMissingFields.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No additional information required.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          {parsedGoogleUser.profile_picture && (
            <Image
              source={{ uri: parsedGoogleUser.profile_picture }}
              style={styles.profileImage}
            />
          )}
          <View style={styles.welcomeText}>
            <Text style={styles.welcomeTitle}>Welcome, {parsedGoogleUser.first_name}!</Text>
            <Text style={styles.welcomeSubtitle}>
              We need a few more details to complete your profile
            </Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1} of {parsedMissingFields.length}
          </Text>
        </View>
      </View>

      {/* Question Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderQuestion()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigation}>
        {currentQuestionIndex > 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
         <TouchableOpacity
           style={[
             styles.nextButton,
             (!currentValue && currentField?.type !== 'textarea' && currentField?.type !== 'multiselect') && styles.nextButtonDisabled
           ]}
           onPress={handleNext}
           disabled={loading || (!currentValue && currentField?.type !== 'textarea' && currentField?.type !== 'multiselect')}
         >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentQuestionIndex === parsedMissingFields.length - 1 ? 'Complete' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  questionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#495057',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  navigation: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  backButton: {
    flex: 1,
    padding: 15,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  nextButton: {
    flex: 2,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#007bff',
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 50,
  },
  questionSubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  multiselectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  multiselectOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#fff',
  },
  multiselectOptionSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  multiselectOptionText: {
    fontSize: 14,
    color: '#495057',
  },
  multiselectOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});
