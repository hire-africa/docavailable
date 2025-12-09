import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

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
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="light" backgroundColor="#F8F9FA" />
      </ThemeProvider>
    </AuthProvider>
  );
}
