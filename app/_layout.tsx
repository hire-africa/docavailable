import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../services/cryptoPolyfill';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const router = useRouter();
  // router.push(`/JitsiVoiceCall?roomName=${encodeURIComponent(roomName)}`); // Removed: roomName is not defined here

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 300,
            animationTypeForReplace: 'push',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            presentation: 'card',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="login" />
          <Stack.Screen name="patient-signup" />
          <Stack.Screen name="doctor-signup" />
          <Stack.Screen name="admin-signup" />
          <Stack.Screen name="patient-dashboard" />
          <Stack.Screen name="doctor-dashboard" />
          <Stack.Screen name="admin-dashboard" />
          <Stack.Screen name="pending-approval" />
          <Stack.Screen name="patient-profile" />
          <Stack.Screen name="doctor-profile" />
          <Stack.Screen name="admin-profile" />
          <Stack.Screen name="edit-patient-profile" />
          <Stack.Screen name="edit-doctor-profile" />
          <Stack.Screen name="edit-admin-profile" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="blog" />
          <Stack.Screen name="blog-article" />
          <Stack.Screen name="blog-article-2" />
          <Stack.Screen name="blog-article-3" />
          <Stack.Screen name="blog-article-4" />
          <Stack.Screen name="blog-article-5" />
          <Stack.Screen name="blog-article-6" />
          <Stack.Screen name="my-appointments" />
          <Stack.Screen name="instant-sessions" />
          <Stack.Screen name="doctor-settings" />
          <Stack.Screen name="help-support" />
          <Stack.Screen name="notifications-settings" />
          <Stack.Screen name="privacy-settings" />
          <Stack.Screen name="doctor-withdrawals" />
          <Stack.Screen name="JitsiVoiceCall" />
          <Stack.Screen name="network-test" />
          <Stack.Screen name="backend-test" />
          <Stack.Screen name="integration-test" />
          <Stack.Screen name="chat/[chatId]" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="dark" backgroundColor="#F8F9FA" />
      </ThemeProvider>
    </AuthProvider>
  );
}
