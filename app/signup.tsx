import { Link } from 'expo-router';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Signup() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sign Up</Text>
        <Text style={styles.subtitle}>Choose your account type</Text>
        
        <View style={styles.optionsContainer}>
          <Link href="/doctor-signup" asChild>
            <TouchableOpacity style={styles.optionButton}>
              <Text style={{ fontSize: 48, color: "#4CAF50" }}>🏥</Text>
              <Text style={styles.optionTitle}>Doctor</Text>
              <Text style={styles.optionSubtitle}>Join as a healthcare provider</Text>
            </TouchableOpacity>
          </Link>
          
          <Link href="/patient-signup" asChild>
            <TouchableOpacity style={styles.optionButton}>
              <Text style={{ fontSize: 48, color: "#4CAF50" }}>👤</Text>
              <Text style={styles.optionTitle}>Patient</Text>
              <Text style={styles.optionSubtitle}>Create a patient account</Text>
            </TouchableOpacity>
          </Link>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={styles.loginLink}>Log in</Text>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  optionsContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 20,
  },
  optionButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  optionIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  loginLink: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
}); 