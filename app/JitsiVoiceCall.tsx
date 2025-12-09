import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function JitsiVoiceCall() {
  const { roomName } = useLocalSearchParams();

  if (!roomName) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffbe6' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222' }}>No room specified</Text>
      </View>
    );
  }

  return (
    <WebView
      source={{ uri: `https://meet.jit.si/${roomName}` }}
      style={{ flex: 1 }}
      startInLoadingState
      javaScriptEnabled={true}
      domStorageEnabled={true}
      thirdPartyCookiesEnabled={true}
      mixedContentMode="compatibility"
      allowsInlineMediaPlayback={true}
      mediaPlaybackRequiresUserAction={false}
      renderLoading={() => (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffbe6' }}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#4CAF50' }}>Joining room: {roomName}</Text>
        </View>
      )}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.log('WebView error:', nativeEvent);
      }}
      onLoadStart={() => {
        console.log('WebView load started');
      }}
      onLoadEnd={() => {
        console.log('WebView load ended');
      }}
    />
  );
} 