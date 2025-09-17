import 'dotenv/config';

export default {
  expo: {
    name: "DocAvailable",
    slug: "Doc_available",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#4CAF50"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.docavailable.minimal"
    },
    android: {
      package: "com.docavailable.app",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      favicon: "./assets/images/favicon.png"
    },
    scheme: "com.docavailable.app", // Enable for mobile OAuth redirects
    plugins: [
      "expo-router",
      [
        "expo-av",
        {
          "microphonePermission": "Allow DocAvailable to access your microphone for audio calls with healthcare providers.",
          "cameraPermission": "Allow DocAvailable to access your camera for video consultations with healthcare providers."
        }
      ]
    ],
    extra: {
      // API Configuration
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "https://docavailable-3vbdv.ondigitalocean.app",
      laravelApiUrl: process.env.EXPO_PUBLIC_LARAVEL_API_URL || "https://docavailable-3vbdv.ondigitalocean.app",
      
      // App Configuration
      appName: process.env.EXPO_PUBLIC_APP_NAME || "DocAvailable",
      appVersion: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
      
      // Google OAuth Configuration
      EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv.apps.googleusercontent.com",
      EXPO_PUBLIC_GOOGLE_CLIENT_SECRET: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || "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",
      
      // WebRTC Configuration
      EXPO_PUBLIC_WEBRTC_SIGNALING_URL: process.env.EXPO_PUBLIC_WEBRTC_SIGNALING_URL,
      EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL: process.env.EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL,
      EXPO_PUBLIC_WEBRTC_STUN_SERVERS: process.env.EXPO_PUBLIC_WEBRTC_STUN_SERVERS,
      EXPO_PUBLIC_ENABLE_AUDIO_CALLS: process.env.EXPO_PUBLIC_ENABLE_AUDIO_CALLS,
      EXPO_PUBLIC_ENABLE_VIDEO_CALLS: process.env.EXPO_PUBLIC_ENABLE_VIDEO_CALLS,
      
      // Feature Flags - Set to false for minimal build
      useBackendChat: false,
      useBackendWallet: false,
      useBackendNotifications: false,
      useBackendAppointments: false,
      backendEnabled: false,
      
      // EAS Configuration
      eas: {
        projectId: "55ebf2c0-d2b4-42ff-9b39-e65328778c63"
      }
    },
    // Disable TypeScript checking during build
    typescript: {
      ignoreBuildErrors: true
    }
  }
}; 