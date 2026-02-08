require('dotenv').config();

module.exports = {
  expo: {
    name: "DocAvailable",
    slug: "Doc_available",
    version: "1.1.3",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    runtimeVersion: "1.1.3",
    updates: {
      url: "https://u.expo.dev/972b5d32-2589-4960-a52d-2dcc6fe53eeb"
    },

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
      bundleIdentifier: "com.docavailable.minimal",
      scheme: "com.docavailable.app"
    },
    android: {
      package: "com.docavailable.app",
      usesCleartextTraffic: true,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      googleServicesFile: "./google-services.json",
      edgeToEdgeEnabled: true,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "docavailable.org"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        },
        {
          action: "VIEW",
          data: [
            {
              scheme: "com.docavailable.app",
              host: "*"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      favicon: "./assets/images/favicon.png"
    },
    scheme: "com.docavailable.app",
    plugins: [
      "expo-updates",
      "expo-router",
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
      "./plugins/withWebRTC", // ✅ WebRTC permissions and hardware features
      "./plugins/withCallKeep",
      "./plugins/withMainActivityFlags" // ✅ Lock screen flags (showWhenLocked, turnScreenOn)
    ],
    extra: {
      eas: {
        projectId: "2166156d-3cb3-4f6e-9cd1-f40471339866"
      },
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      // WebRTC Configuration
      EXPO_PUBLIC_WEBRTC_SIGNALING_URL: process.env.EXPO_PUBLIC_WEBRTC_SIGNALING_URL,
      EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL: process.env.EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL,
      EXPO_PUBLIC_WEBRTC_STUN_SERVERS: process.env.EXPO_PUBLIC_WEBRTC_STUN_SERVERS,
      EXPO_PUBLIC_ENABLE_AUDIO_CALLS: process.env.EXPO_PUBLIC_ENABLE_AUDIO_CALLS,
      EXPO_PUBLIC_ENABLE_VIDEO_CALLS: process.env.EXPO_PUBLIC_ENABLE_VIDEO_CALLS,
      EXPO_PUBLIC_ENABLE_CALL_RECORDING: process.env.EXPO_PUBLIC_ENABLE_CALL_RECORDING,
      // API Configuration
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    },
  }
};
