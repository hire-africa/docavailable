import { FontAwesome } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React from 'react';
import { Dimensions, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const INPUT_WIDTH_MOBILE = width * 0.8;
const INPUT_WIDTH_WEB = 320;

export default function Signup() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Choose your account type to get started</Text>
        </View>
        
        <View style={styles.optionsContainer}>
          <Link href="/doctor-signup" asChild>
            <TouchableOpacity style={styles.optionButton}>
              <View style={styles.iconContainer}>
                <FontAwesome name="user-md" size={32} color="#4CAF50" />
              </View>
              <Text style={styles.optionTitle}>Doctor</Text>
              <Text style={styles.optionSubtitle}>Join as a healthcare provider</Text>
              <View style={styles.arrowContainer}>
                <FontAwesome name="chevron-right" size={16} color="#4CAF50" />
              </View>
            </TouchableOpacity>
          </Link>
          
          <Link href="/patient-signup" asChild>
            <TouchableOpacity style={styles.optionButton}>
              <View style={styles.iconContainer}>
                <FontAwesome name="user" size={32} color="#4CAF50" />
              </View>
              <Text style={styles.optionTitle}>Patient</Text>
              <Text style={styles.optionSubtitle}>Create a patient account</Text>
              <View style={styles.arrowContainer}>
                <FontAwesome name="chevron-right" size={16} color="#4CAF50" />
              </View>
            </TouchableOpacity>
          </Link>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/login" asChild>
            <TouchableOpacity style={styles.loginButton}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  optionButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: '#F0F0F0',
          borderColor: '#4CAF50',
        },
      },
    }),
  },
  iconContainer: {
    marginBottom: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  arrowContainer: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -8,
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: '#45A049',
        },
      },
    }),
  },
  loginLink: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
}); 