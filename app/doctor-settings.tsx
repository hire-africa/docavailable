import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import OnlineStatusToggle from '../components/OnlineStatusToggle';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';

export default function DoctorSettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user || user.role !== 'doctor') {
    return (
      <View style={styles.errorContainer}>
        <Text style={{ fontSize: 24, color: "#FF6B6B" }}>🔒</Text>
        <Text style={styles.errorText}>Access denied</Text>
        <Text style={styles.errorSubtext}>This page is for doctors only</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Doctor Settings</Text>
        <Text style={styles.subtitle}>Manage your availability and preferences</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instant Sessions</Text>
        <Text style={styles.sectionDescription}>
          Control your availability for instant text sessions with patients
        </Text>
        
        <OnlineStatusToggle style={styles.toggleContainer} />
        
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={{ fontSize: 24, color: "#4CAF50" }}>ℹ️</Text>
            <Text style={styles.infoTitle}>How it works</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={{ fontSize: 20, color: "#4CAF50" }}>✅</Text>
            <Text style={styles.infoText}>When online, patients can start instant sessions with you</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={{ fontSize: 20, color: "#4CAF50" }}>⏰</Text>
            <Text style={styles.infoText}>Sessions are 10 minutes long per patient subscription</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={{ fontSize: 20, color: "#4CAF50" }}>⚡</Text>
            <Text style={styles.infoText}>You have 2 minutes to respond to messages</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={{ fontSize: 20, color: "#4CAF50" }}>💬</Text>
            <Text style={styles.infoText}>Sessions appear in your normal chat list</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Settings</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Text style={{ fontSize: 24, color: "#4CAF50" }}>👤</Text>
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Edit Profile</Text>
            <Text style={styles.settingDescription}>Update your personal information</Text>
          </View>
          <Text style={{ fontSize: 24, color: "#666" }}>▶️</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Text style={{ fontSize: 24, color: "#4CAF50" }}>🏥</Text>
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Specialization</Text>
            <Text style={styles.settingDescription}>Manage your medical specialties</Text>
          </View>
          <Text style={{ fontSize: 24, color: "#666" }}>▶️</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Text style={{ fontSize: 24, color: "#4CAF50" }}>📅</Text>
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Working Hours</Text>
            <Text style={styles.settingDescription}>Set your appointment availability</Text>
          </View>
          <Text style={{ fontSize: 24, color: "#666" }}>▶️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Text style={{ fontSize: 24, color: "#4CAF50" }}>🔔</Text>
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Notifications</Text>
            <Text style={styles.settingDescription}>Manage push notifications</Text>
          </View>
          <Text style={{ fontSize: 24, color: "#666" }}>▶️</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Text style={{ fontSize: 24, color: "#4CAF50" }}>🛡️</Text>
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Privacy & Security</Text>
            <Text style={styles.settingDescription}>Manage your privacy settings</Text>
          </View>
          <Text style={{ fontSize: 24, color: "#666" }}>▶️</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.settingItem, styles.dangerItem]}
          onPress={() => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => {
                  // Handle sign out
                }},
              ]
            );
          }}
        >
          <View style={styles.settingIcon}>
            <Text style={{ fontSize: 24, color: Colors.danger }}>🚪</Text>
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: Colors.danger }]}>Sign Out</Text>
            <Text style={styles.settingDescription}>Sign out of your account</Text>
          </View>
          <Text style={{ fontSize: 24, color: "#666" }}>▶️</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 8,
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 16,
  },
  toggleContainer: {
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
    flex: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  dangerItem: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.gray,
  },
}); 