import { useThemedColors } from '@/hooks/useThemedColors';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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