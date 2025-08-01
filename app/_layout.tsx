import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="doctor-signup" options={{ headerShown: false }} />
        <Stack.Screen name="patient-signup" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="doctor-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="patient-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="doctor-profile" options={{ headerShown: false }} />
        <Stack.Screen name="patient-profile" options={{ headerShown: false }} />
        <Stack.Screen name="edit-doctor-profile" options={{ headerShown: false }} />
        <Stack.Screen name="edit-patient-profile" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-settings" options={{ headerShown: false }} />
        <Stack.Screen name="notifications-settings" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)/doctor-details/[uid]" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)/doctor-details/BookAppointmentFlow" options={{ headerShown: false }} />
        <Stack.Screen name="doctor-approval/[uid]" options={{ headerShown: false }} />
        <Stack.Screen name="appointment-details/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="my-appointments" options={{ headerShown: false }} />
        <Stack.Screen name="instant-sessions" options={{ headerShown: false }} />
        <Stack.Screen name="text-session-history" options={{ headerShown: false }} />
        <Stack.Screen name="blog" options={{ headerShown: false }} />
        <Stack.Screen name="blog-article" options={{ headerShown: false }} />
        <Stack.Screen name="blog-article-2" options={{ headerShown: false }} />
        <Stack.Screen name="blog-article-3" options={{ headerShown: false }} />
        <Stack.Screen name="blog-article-4" options={{ headerShown: false }} />
        <Stack.Screen name="blog-article-5" options={{ headerShown: false }} />
        <Stack.Screen name="blog-article-6" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[appointmentId]" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
} 