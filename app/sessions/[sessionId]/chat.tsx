import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { apiService } from '../../services/apiService';

export default function SessionChatRedirect() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  useEffect(() => {
    let cancelled = false;

    const redirect = async () => {
      const raw = sessionId;
      const id = raw ? String(raw) : '';
      if (!id) {
        return;
      }

      try {
        const textSessionResp = await apiService.get(`/text-sessions/${id}`);
        if (!cancelled && textSessionResp?.success) {
          router.replace(`/chat/text_session:${id}`);
          return;
        }
      } catch {
      }

      if (!cancelled) {
        router.replace(`/chat/call_session:${id}`);
      }
    };

    redirect();

    return () => {
      cancelled = true;
    };
  }, [router, sessionId]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#4CAF50" />
    </View>
  );
}
