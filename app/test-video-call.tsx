import { StyleSheet, View } from 'react-native';
import VideoCallTest from '../components/VideoCallTest';

export default function TestVideoCallPage() {
  return (
    <View style={styles.container}>
      <VideoCallTest />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
