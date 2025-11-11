import { FontAwesome } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React from 'react';
import { Dimensions, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemedColors } from '@/hooks/useThemedColors';

const { width } = Dimensions.get('window');
const INPUT_WIDTH_MOBILE = width * 0.8;
const INPUT_WIDTH_WEB = 320;

export default function Signup() {
  const colors = useThemedColors();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    optionsContainer: {
      width: '100%',
      maxWidth: 400,
      gap: 16,
    },
    optionButton: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
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
            backgroundColor: colors.backgroundTertiary,
            borderColor: colors.primary,
          },
        },
      }),
    },
    iconContainer: {
      marginBottom: 16,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    optionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    optionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
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
      color: colors.textSecondary,
      marginBottom: 16,
    },
    loginButton: {
      backgroundColor: colors.buttonPrimary,
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 25,
      alignItems: 'center',
      ...Platform.select({
        web: {
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          ':hover': {
            backgroundColor: colors.primaryDark,
          },
        },
      }),
    },
    loginLink: {
      fontSize: 16,
      color: colors.buttonText,
      fontWeight: 'bold',
    },
  });

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
                <FontAwesome name="user-md" size={32} color={colors.primary} />
              </View>
              <Text style={styles.optionTitle}>Doctor</Text>
              <Text style={styles.optionSubtitle}>Join as a healthcare provider</Text>
              <View style={styles.arrowContainer}>
                <FontAwesome name="chevron-right" size={16} color={colors.primary} />
              </View>
            </TouchableOpacity>
          </Link>

          <Link href="/patient-signup" asChild>
            <TouchableOpacity style={styles.optionButton}>
              <View style={styles.iconContainer}>
                <FontAwesome name="user" size={32} color={colors.primary} />
              </View>
              <Text style={styles.optionTitle}>Patient</Text>
              <Text style={styles.optionSubtitle}>Create a patient account</Text>
              <View style={styles.arrowContainer}>
                <FontAwesome name="chevron-right" size={16} color={colors.primary} />
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