export default {
  expo: {
    name: "DocAvailable",
    slug: "Doc_available",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
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
    scheme: "docavailable",
    plugins: [
      "expo-router"
    ],
    extra: {
      // API Configuration
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "http://172.20.10.11:8000",
      laravelApiUrl: process.env.EXPO_PUBLIC_LARAVEL_API_URL || "http://172.20.10.11:8000",
      
      // App Configuration
      appName: process.env.EXPO_PUBLIC_APP_NAME || "DocAvailable",
      appVersion: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
      
      // Feature Flags - Set to false for minimal build
      useBackendChat: false,
      useBackendWallet: false,
      useBackendNotifications: false,
      useBackendAppointments: false,
      backendEnabled: false,
      
      // EAS Configuration
      eas: {
        projectId: "2eb40af4-b32e-462e-b070-a1b171e65485"
      }
    },
    // Disable TypeScript checking during build
    typescript: {
      ignoreBuildErrors: true
    }
  }
}; 