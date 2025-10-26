import authService from '@/services/authService';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { createFieldRefs, scrollToFirstError } from '../utils/scrollToError';
import SignUpErrorHandler from '../utils/errorHandler';
import ValidationUtils from '../utils/validationUtils';

export default function AdminSignUp() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Create refs for scrolling to errors
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldRefs = createFieldRefs([
    'firstName', 'lastName', 'email', 'password', 'dateOfBirth', 'gender', 'country', 'city'
  ]);
  const [errors, setErrors] = useState({
    firstName: null,
    lastName: null,
    email: null,
    password: null,
    dateOfBirth: null,
    gender: null,
    country: null,
    city: null,
  });

  const validateForm = () => {
    const formData = {
      firstName,
      surname: lastName,
      email,
      password,
      dateOfBirth,
      gender,
      country,
      city,
      acceptPolicies: true // Admin signup doesn't have this field, so set to true
    };

    const rules = ValidationUtils.getSignUpRules('admin');
    const newErrors = ValidationUtils.validateFields(formData, rules);

    setErrors(newErrors);
    
    // Scroll to first error if validation fails
    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => {
        scrollToFirstError(scrollViewRef, newErrors, fieldRefs);
      }, 100);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('first_name', firstName);
      formData.append('surname', lastName);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('password_confirmation', password);
      formData.append('date_of_birth', dateOfBirth);
      formData.append('gender', gender);
      formData.append('country', country);
      formData.append('city', city);
      formData.append('user_type', 'admin');

      await authService.signUp(formData);
      
      Alert.alert(
        'Success!',
        'Your admin account has been created successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/')
          }
        ]
      );
    } catch (error: any) {
      SignUpErrorHandler.handleSignUpError(
        error,
        (validationErrors) => {
          // Handle validation errors by setting them in state
          setErrors(validationErrors);
          // Scroll to first error field
          setTimeout(() => {
            scrollToFirstError(scrollViewRef, validationErrors, fieldRefs);
          }, 100);
        },
        () => handleSignUp(), // Retry function
        () => router.replace('/login') // Login function
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollViewRef} style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <FontAwesome name="arrow-left" size={20} color="#4CAF50" />
            </TouchableOpacity>
            <Text style={styles.title}>Create Admin Account</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              ref={fieldRefs.firstName}
              style={[styles.input, errors.firstName && styles.inputError]}
              placeholder="First Name"
              placeholderTextColor="#666"
              value={firstName}
              onChangeText={setFirstName}
            />
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

            <TextInput
              ref={fieldRefs.lastName}
              style={[styles.input, errors.lastName && styles.inputError]}
              placeholder="Last Name"
              placeholderTextColor="#666"
              value={lastName}
              onChangeText={setLastName}
            />
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

            <TextInput
              ref={fieldRefs.email}
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Email"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <TextInput
              ref={fieldRefs.password}
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Password"
              placeholderTextColor="#666"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <TouchableOpacity 
            style={[styles.signUpButton, loading && styles.signUpButtonDisabled]} 
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={[styles.signUpButtonText, { marginLeft: 8 }]}>
                  Creating Account...
                </Text>
              </>
            ) : (
              <Text style={styles.signUpButtonText}>Create Admin Account</Text>
            )}
          </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  form: {
    flex: 1,
  },
  input: {
    height: 50,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  signUpButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 20,
  },
  signUpButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 4,
  },
}); 