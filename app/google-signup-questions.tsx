import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface GoogleUserData {
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  google_id: string;
  user_type: string;
  date_of_birth?: string;
  gender?: string;
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

  console.log('Google user data:', parsedGoogleUser);
  console.log('Missing fields:', parsedMissingFields);
  console.log('Missing fields details:', parsedMissingFields.map(field => ({ field: field.field, type: field.type, label: field.label })));

  const currentField = parsedMissingFields[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / parsedMissingFields.length) * 100;

  const handleAnswer = (value: any) => {
    if (currentField) {
      console.log('🔐 Google Signup: Setting answer for field:', currentField.field, 'value:', value);
      setAnswers(prev => {
        const newAnswers = {
          ...prev,
          [currentField.field]: value
        };
        console.log('🔐 Google Signup: Updated answers:', newAnswers);
        return newAnswers;
      });
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
    } else if (currentField?.type === 'documents') {
      // Validate grouped documents
      const requiredFields = currentField.required_fields || {};
      const missingRequired = Object.entries(requiredFields)
        .filter(([key, fieldInfo]: [string, any]) => fieldInfo.required && !answers[fieldInfo.field])
        .map(([key, fieldInfo]: [string, any]) => fieldInfo.label);

      if (missingRequired.length > 0) {
        Alert.alert('Required Documents', `Please upload the following required documents: ${missingRequired.join(', ')}`);
        return;
      }
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

  const pickImage = async () => {
    try {
      console.log('🔐 Google Signup: Starting image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('🔐 Google Signup: Image selected:', result.assets[0].uri);
        handleAnswer(result.assets[0].uri);
      } else {
        console.log('🔐 Google Signup: Image picker cancelled');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1.0, // Maximum quality for documents
      });

      if (!result.canceled && result.assets[0]) {
        handleAnswer(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const pickDocumentForField = async (fieldName: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1.0, // Maximum quality for documents
      });

      if (!result.canceled && result.assets[0]) {
        console.log('🔐 Google Signup: Setting answer for field:', fieldName, 'value:', result.assets[0].uri);
        setAnswers(prev => {
          const newAnswers = {
            ...prev,
            [fieldName]: result.assets[0].uri
          };
          console.log('🔐 Google Signup: Updated answers:', newAnswers);
          return newAnswers;
        });
      }
    } catch (error) {
      console.error('Error picking document for field:', fieldName, error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Handle profile picture - upload manually selected via separate endpoint, send Google URL directly
      let profilePictureUrl = null;
      const profilePictureToUpload = answers.profile_picture || parsedGoogleUser.profile_picture;

      if (profilePictureToUpload) {
        if (answers.profile_picture) {
          // Manually selected image - upload via separate endpoint like edit profile
          try {
            console.log('🔐 Google Signup: Uploading manually selected profile picture via separate endpoint...');
            console.log('🔐 Google Signup: Profile picture URI:', profilePictureToUpload);

            // Convert to base64 like edit profile does
            const response = await fetch(profilePictureToUpload);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve(base64String);
              };
              reader.readAsDataURL(blob);
            });

            // Upload via separate endpoint like edit profile
            const formData = new FormData();
            formData.append('profile_picture', base64);

            const uploadResponse = await fetch('https://docavailable1-izk3m.ondigitalocean.app/api/upload/profile-picture-public', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({
                profile_picture: base64
              })
            });

            const uploadData = await uploadResponse.json();
            if (uploadData.success && uploadData.data?.profile_picture_url) {
              profilePictureUrl = uploadData.data.profile_picture_url;
              console.log('🔐 Google Signup: Profile picture uploaded successfully:', profilePictureUrl);
            } else {
              console.warn('🔐 Google Signup: Profile picture upload failed:', uploadData.message);
            }
          } catch (uploadError) {
            console.warn('🔐 Google Signup: Profile picture upload failed:', uploadError);
            // Continue without profile picture if upload fails
          }
        } else {
          // Google profile picture - send URL directly (backend will handle downloading)
          console.log('🔐 Google Signup: Using Google profile picture URL directly:', profilePictureToUpload);
          profilePictureUrl = profilePictureToUpload;
        }
      }

      // Convert documents to base64 like normal signup does
      let nationalIdBase64 = null;
      let medicalDegreeBase64 = null;
      let medicalLicenceBase64 = null;

      if (answers.national_id) {
        try {
          console.log('🔐 Google Signup: Converting National ID to base64...');
          const response = await fetch(answers.national_id);
          const blob = await response.blob();
          nationalIdBase64 = await Promise.race([
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve(base64String);
              };
              reader.readAsDataURL(blob);
            }),
            new Promise<string>((_, reject) =>
              setTimeout(() => reject(new Error('National ID conversion timeout')), 10000)
            )
          ]);
          console.log('🔐 Google Signup: National ID converted to base64');
        } catch (conversionError) {
          console.warn('🔐 Google Signup: National ID conversion failed:', conversionError);
        }
      }

      if (answers.medical_degree) {
        try {
          console.log('🔐 Google Signup: Converting Medical Degree to base64...');
          const response = await fetch(answers.medical_degree);
          const blob = await response.blob();
          medicalDegreeBase64 = await Promise.race([
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve(base64String);
              };
              reader.readAsDataURL(blob);
            }),
            new Promise<string>((_, reject) =>
              setTimeout(() => reject(new Error('Medical Degree conversion timeout')), 10000)
            )
          ]);
          console.log('🔐 Google Signup: Medical Degree converted to base64');
        } catch (conversionError) {
          console.warn('🔐 Google Signup: Medical Degree conversion failed:', conversionError);
        }
      }

      if (answers.medical_licence) {
        try {
          console.log('🔐 Google Signup: Converting Medical Licence to base64...');
          const response = await fetch(answers.medical_licence);
          const blob = await response.blob();
          medicalLicenceBase64 = await Promise.race([
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve(base64String);
              };
              reader.readAsDataURL(blob);
            }),
            new Promise<string>((_, reject) =>
              setTimeout(() => reject(new Error('Medical Licence conversion timeout')), 10000)
            )
          ]);
          console.log('🔐 Google Signup: Medical Licence converted to base64');
        } catch (conversionError) {
          console.warn('🔐 Google Signup: Medical Licence conversion failed:', conversionError);
        }
      }

      // Create the complete user data with base64 images like normal signup
      const completeUserData = {
        ...parsedGoogleUser,
        ...answers,
        profile_picture: profilePictureUrl, // Send uploaded URL or Google URL directly
        national_id: nationalIdBase64, // Use correct field name
        medical_degree: medicalDegreeBase64, // Use correct field name
        medical_licence: medicalLicenceBase64, // Use correct field name
        password: `google_user_${parsedGoogleUser.google_id}`,
        password_confirmation: `google_user_${parsedGoogleUser.google_id}`,
        user_type: parsedGoogleUser.user_type,
        email_verified_at: new Date().toISOString(),
        // Handle specializations for doctors
        specializations: answers.specializations ? JSON.stringify(answers.specializations) : null,
      };

      console.log('🔐 Google Signup: Complete user data for registration:', {
        ...completeUserData,
        profile_picture: profilePictureUrl ? (profilePictureUrl.startsWith('data:') ? 'base64 data' : 'URL') : 'none',
        national_id: nationalIdBase64 ? 'base64 data' : 'none',
        medical_degree: medicalDegreeBase64 ? 'base64 data' : 'none',
        medical_licence: medicalLicenceBase64 ? 'base64 data' : 'none',
        hasProfilePicture: !!profilePictureUrl,
        hasNationalId: !!nationalIdBase64,
        hasMedicalDegree: !!medicalDegreeBase64,
        hasMedicalLicence: !!medicalLicenceBase64
      });

      // Call the backend to create the user
      const response = await fetch('https://docavailable1-izk3m.ondigitalocean.app/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(completeUserData)
      });

      const data = await response.json();
      console.log('Registration response:', data);

      if (data.success) {
        console.log('Registration successful, navigating to dashboard for user type:', parsedGoogleUser.user_type);
        console.log('Registration response data:', data);

        // Registration already returns a token, so we can store it directly
        if (data.data && data.data.token) {
          console.log('Token received from registration, storing authentication data');
          await AsyncStorage.setItem('auth_token', data.data.token);
          await AsyncStorage.setItem('user_data', JSON.stringify(data.data.user));

          console.log('Authentication data stored, navigating to dashboard');
          // Navigate to appropriate dashboard
          if (parsedGoogleUser.user_type === 'patient') {
            router.replace('/patient-dashboard');
          } else if (parsedGoogleUser.user_type === 'doctor') {
            router.replace('/doctor-dashboard');
          } else {
            router.replace('/');
          }
        } else {
          console.error('No token received from registration');
          throw new Error('Registration successful but no authentication token received');
        }
      } else {
        console.error('Registration failed:', data);
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

    console.log('Rendering question for field:', currentField.field, 'type:', currentField.type, 'value:', currentValue);

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
        } else if (currentField.field === 'country') {
          const countries = [
            'Afghanistan', 'Albania', 'Algeria', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
            'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
            'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia',
            'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia',
            'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti',
            'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea',
            'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany',
            'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras',
            'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica',
            'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon',
            'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia',
            'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova',
            'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal',
            'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
            'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
            'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
            'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'São Tomé and Príncipe', 'Saudi Arabia',
            'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
            'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname',
            'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo',
            'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine',
            'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
            'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe', 'Other'
          ];

          return (
            <View style={styles.questionContainer}>
              <Text style={styles.questionLabel}>{currentField.label}</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={currentValue}
                  onValueChange={handleAnswer}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Country" value="" />
                  {countries.map((country) => (
                    <Picker.Item key={country} label={country} value={country} />
                  ))}
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
              placeholder="Enter number of years"
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

      case 'image':
        if (currentField.field === 'profile_picture') {
          return (
            <View style={styles.questionContainer}>
              <Text style={styles.questionLabel}>{currentField.label}</Text>
              <Text style={styles.questionSubtext}>Select a profile picture for your account</Text>
              <View style={styles.imagePickerContainer}>
                {currentValue ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: currentValue }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.changeImageButton}
                      onPress={() => pickImage()}
                    >
                      <Text style={styles.changeImageButtonText}>Change Photo</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.imagePickerButton} onPress={() => pickImage()}>
                    <Text style={styles.imagePickerButtonText}>Select Profile Picture</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }
        break;

      case 'document':
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionLabel}>{currentField.label}</Text>
            <Text style={styles.questionSubtext}>Upload a clear photo of your document</Text>
            <View style={styles.documentPickerContainer}>
              {currentValue ? (
                <View style={styles.documentPreviewContainer}>
                  <Image source={{ uri: currentValue }} style={styles.documentPreview} />
                  <TouchableOpacity
                    style={styles.changeDocumentButton}
                    onPress={() => pickDocument()}
                  >
                    <Text style={styles.changeDocumentButtonText}>Change Document</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.documentPickerButton} onPress={() => pickDocument()}>
                  <Text style={styles.documentPickerButtonText}>Upload Document</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );

      case 'documents':
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionLabel}>{currentField.label}</Text>
            <Text style={styles.questionSubtext}>Upload clear photos of your verification documents</Text>
            <View style={styles.documentsGroupContainer}>
              {currentField.required_fields && Object.entries(currentField.required_fields).map(([key, fieldInfo]: [string, any]) => {
                const fieldValue = answers[fieldInfo.field] || '';
                const isRequired = fieldInfo.required;

                return (
                  <View key={key} style={styles.documentFieldContainer}>
                    <View style={styles.documentFieldHeader}>
                      <Text style={styles.documentFieldLabel}>{fieldInfo.label}</Text>
                      {isRequired && <Text style={styles.requiredIndicator}>*</Text>}
                    </View>
                    <View style={styles.documentPickerContainer}>
                      {fieldValue ? (
                        <View style={styles.documentPreviewContainer}>
                          <Image source={{ uri: fieldValue }} style={styles.documentPreview} />
                          <TouchableOpacity
                            style={styles.changeDocumentButton}
                            onPress={() => pickDocumentForField(fieldInfo.field)}
                          >
                            <Text style={styles.changeDocumentButtonText}>Change Document</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.documentPickerButton}
                          onPress={() => pickDocumentForField(fieldInfo.field)}
                        >
                          <Text style={styles.documentPickerButtonText}>
                            {isRequired ? 'Upload Document' : 'Upload Document (Optional)'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );

      default: // text
        // Special handling for country field even if backend returns 'text'
        if (currentField.field === 'country') {
          const countries = [
            'Afghanistan', 'Albania', 'Algeria', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
            'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
            'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia',
            'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia',
            'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti',
            'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea',
            'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany',
            'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras',
            'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica',
            'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon',
            'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia',
            'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova',
            'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal',
            'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
            'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
            'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
            'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'São Tomé and Príncipe', 'Saudi Arabia',
            'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
            'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname',
            'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo',
            'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine',
            'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
            'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe', 'Other'
          ];

          return (
            <View style={styles.questionContainer}>
              <Text style={styles.questionLabel}>{currentField.label}</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={currentValue}
                  onValueChange={handleAnswer}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Country" value="" />
                  {countries.map((country) => (
                    <Picker.Item key={country} label={country} value={country} />
                  ))}
                </Picker>
              </View>
            </View>
          );
        }

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
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image
            source={require('../assets/images/DA logo green.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View style={styles.profileSection}>
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
            (!answers[currentField?.field] && currentField?.type !== 'textarea' && currentField?.type !== 'multiselect' && currentField?.type !== 'documents') && styles.nextButtonDisabled
          ]}
          onPress={handleNext}
          disabled={loading || (!answers[currentField?.field] && currentField?.type !== 'textarea' && currentField?.type !== 'multiselect' && currentField?.type !== 'documents')}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    height: 40,
    width: 120,
  },
  welcomeSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
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
    backgroundColor: '#4CAF50',
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
  questionSubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 15,
    fontStyle: 'italic',
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
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  multiselectOptionText: {
    fontSize: 14,
    color: '#495057',
  },
  multiselectOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  imagePickerContainer: {
    marginTop: 10,
  },
  imagePickerButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
  changeImageButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  changeImageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  documentPickerContainer: {
    marginTop: 10,
  },
  documentPickerButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentPickerButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  documentPreviewContainer: {
    alignItems: 'center',
  },
  documentPreview: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  changeDocumentButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  changeDocumentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  documentsGroupContainer: {
    marginTop: 10,
  },
  documentFieldContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  documentFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  documentFieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  requiredIndicator: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});
