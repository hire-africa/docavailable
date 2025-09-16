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
    
    return {
      apiUrl: extra.apiUrl || 'https://docavailable-3vbdv.ondigitalocean.app',
      webrtc: {
        signalingUrl: extra.webrtc?.signalingUrl || 'ws://46.101.123.123:8080/audio-signaling',
        chatSignalingUrl: extra.webrtc?.chatSignalingUrl || 'ws://46.101.123.123:8081/chat-signaling',
        turnServerUrl: extra.webrtc?.turnServerUrl || '',
        turnUsername: extra.webrtc?.turnUsername || '',
        turnPassword: extra.webrtc?.turnPassword || '',
        stunServers: extra.webrtc?.stunServers || [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302'
        ],
        enableAudioCalls: extra.webrtc?.enableAudioCalls !== false,
        enableVideoCalls: extra.webrtc?.enableVideoCalls === true,
        enableCallRecording: extra.webrtc?.enableCallRecording === true,
      },
      features: {
        enableAudioCalls: extra.features?.enableAudioCalls !== false,
        enableVideoCalls: extra.features?.enableVideoCalls === true,
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
