import { SafeAreaView, StyleSheet } from 'react-native';
import { useThemedColors } from '@/hooks/useThemedColors';
import LoginPage from '../components/LoginPage';

export default function Login() {
  const colors = useThemedColors();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });
  
  return (
    <SafeAreaView style={styles.container}>
      <LoginPage />
    </SafeAreaView>
  );
}