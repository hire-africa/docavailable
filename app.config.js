require('dotenv').config();

module.exports = {
  expo: {
    name: "DocAvailable",
    slug: "docavailable",
    workflow: "managed",
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
      bundleIdentifier: "com.docavailable.minimal",
      scheme: "com.docavailable.app"
    },
    android: {
      package: "com.docavailable.app",
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
      "expo-router",
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
      "./plugins/withCallKeep",
      "./plugins/withMainActivityFlags", // ✅ Lock screen flags (showWhenLocked, turnScreenOn)
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: "com.googleusercontent.apps.449082896435-ge0pijdnl6j3e0c9jjclnl7tglmh45ml"
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "ba4644ef-6ee9-4580-aa2a-594d16da0061"
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
