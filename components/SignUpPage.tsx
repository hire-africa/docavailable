import { router } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SignUpPage() {
  return (
    <View style={styles.container}>
      {/* Doctor Illustration Section */}
      <View style={styles.illustrationContainer}>
        <Image
          source={require('../assets/images/doctor-illustration2.png')}
          style={styles.doctorImage}
        />
      </View>

      {/* Main Heading */}
      <View style={styles.headingContainer}>
        <Text style={styles.mainHeading}>
          Welcome to Doc Available
        </Text>
      </View>

      {/* Subheading */}
      <Text style={styles.subheading}>
        Connect with healthcare professionals anytime, anywhere. Choose your path and get started.
      </Text>

      {/* Buttons Container */}
      <View style={styles.buttonContainer}>
        {/* I&apos;m a Patient Button */}
        <TouchableOpacity style={styles.signUpButton} onPress={() => router.push('/patient-signup')}>
          <Text style={styles.signUpButtonText}>i&apos;m a patient</Text>
        </TouchableOpacity>

        {/* I&apos;m a Doctor Button */}
        <TouchableOpacity style={styles.logInButton} onPress={() => router.push('/doctor-signup')}>
          <Text style={styles.logInButtonText}>i&apos;m a doctor</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>DocAvailable</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 0,
    marginTop: -50,
  },
  doctorImage: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
  },
  headingContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: -30,
  },
  mainHeading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'System', // Sans-serif equivalent
    textAlign: 'center',
    lineHeight: 34,
  },
  subheading: {
    fontSize: 16,
    color: '#666666', // Lighter black
    fontFamily: 'System', // Sans-serif equivalent
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 60,
    marginTop: 105,
  },
  signUpButton: {
    backgroundColor: '#4CAF50', // Light green color
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 25,
    marginBottom: 16,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
        width: 320,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        width: width * 0.8,
      },
    }),
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  logInButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E0E0E0', // Light gray border
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
        width: 320,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        width: width * 0.8,
      },
    }),
  },
  logInButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999999', // Light gray
    fontFamily: 'System',
  },
}); 