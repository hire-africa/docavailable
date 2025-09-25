import Constants from 'expo-constants';

export interface WebRTCConfig {
  signalingUrl: string;
  chatSignalingUrl: string;
  turnServerUrl: string;
  turnUsername: string;
  turnPassword: string;
  stunServers: string[];
  enableAudioCalls: boolean;
  enableVideoCalls: boolean;
  enableCallRecording: boolean;
}

export interface AppConfig {
  apiUrl: string;
  webrtc: WebRTCConfig;
  features: {
    enableAudioCalls: boolean;
    enableVideoCalls: boolean;
    enableChat: boolean;
  };
}

class ConfigService {
  private config: AppConfig | null = null;

  private loadConfig(): AppConfig {
    const extra = Constants.expoConfig?.extra || {};
    
    // For EAS builds, environment variables are available directly
    // For development, they come from .env file and are in extra
    const getEnvVar = (key: string, fallback?: string) => {
      // First try process.env (works in EAS builds)
      if (process.env[key]) {
        return process.env[key];
      }
      // Then try Constants.expoConfig.extra (works in development)
      if (extra[key]) {
        return extra[key];
      }
      // Finally try nested structure in extra
      if (extra.webrtc?.[key]) {
        return extra.webrtc[key];
      }
      if (extra.features?.[key]) {
        return extra.features[key];
      }
      return fallback;
    };
    
    return {
      apiUrl: getEnvVar('EXPO_PUBLIC_API_BASE_URL') || extra.apiUrl || 'https://docavailable-3vbdv.ondigitalocean.app',
      webrtc: {
        signalingUrl: getEnvVar('EXPO_PUBLIC_WEBRTC_SIGNALING_URL') || extra.webrtc?.signalingUrl || 'ws://46.101.123.123:8082/audio-signaling',
        chatSignalingUrl: getEnvVar('EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL') || extra.webrtc?.chatSignalingUrl || 'ws://46.101.123.123:8082/chat-signaling',
        turnServerUrl: extra.webrtc?.turnServerUrl || '',
        turnUsername: extra.webrtc?.turnUsername || '',
        turnPassword: extra.webrtc?.turnPassword || '',
        stunServers: getEnvVar('EXPO_PUBLIC_WEBRTC_STUN_SERVERS')?.split(',') || extra.webrtc?.stunServers || [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302'
        ],
        enableAudioCalls: getEnvVar('EXPO_PUBLIC_ENABLE_AUDIO_CALLS') !== 'false' && extra.webrtc?.enableAudioCalls !== false,
        enableVideoCalls: getEnvVar('EXPO_PUBLIC_ENABLE_VIDEO_CALLS') === 'true' || extra.webrtc?.enableVideoCalls === true,
        enableCallRecording: getEnvVar('EXPO_PUBLIC_ENABLE_CALL_RECORDING') === 'true' || extra.webrtc?.enableCallRecording === true,
      },
      features: {
        enableAudioCalls: getEnvVar('EXPO_PUBLIC_ENABLE_AUDIO_CALLS') !== 'false' && extra.features?.enableAudioCalls !== false,
        enableVideoCalls: getEnvVar('EXPO_PUBLIC_ENABLE_VIDEO_CALLS') === 'true' || extra.features?.enableVideoCalls === true,
        enableChat: extra.features?.enableChat !== false,
      }
    };
  }

  getConfig(): AppConfig {
    if (!this.config) {
      this.config = this.loadConfig();
    }
    return this.config;
  }

  getWebRTCConfig(): WebRTCConfig {
    return this.getConfig().webrtc;
  }

  getApiUrl(): string {
    return this.getConfig().apiUrl;
  }

  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.getConfig().features[feature];
  }
}

export default new ConfigService();
