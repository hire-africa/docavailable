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
    extra: {
      // API Configuration
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "http://172.20.10.11:8000",
      laravelApiUrl: process.env.EXPO_PUBLIC_LARAVEL_API_URL || "http://172.20.10.11:8000",
      
      // App Configuration
      appName: process.env.EXPO_PUBLIC_APP_NAME || "DocAvailable",
      appVersion: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
      
      // Feature Flags
      useBackendChat: process.env.EXPO_PUBLIC_USE_BACKEND_CHAT === 'true',
      useBackendWallet: process.env.EXPO_PUBLIC_USE_BACKEND_WALLET === 'true',
      useBackendNotifications: process.env.EXPO_PUBLIC_USE_BACKEND_NOTIFICATIONS === 'true',
      useBackendAppointments: process.env.EXPO_PUBLIC_USE_BACKEND_APPOINTMENTS === 'true',
      backendEnabled: process.env.EXPO_PUBLIC_BACKEND_ENABLED === 'true',
      
      // Paychangu Configuration
      paychanguApiKey: process.env.PAYCHANGU_API_KEY || "",
      paychanguSecretKey: process.env.PAYCHANGU_SECRET_KEY || "",
      paychanguMerchantId: process.env.PAYCHANGU_MERCHANT_ID || "",
      paychanguWebhookSecret: process.env.PAYCHANGU_WEBHOOK_SECRET || "",
      paychanguEnvironment: process.env.PAYCHANGU_ENVIRONMENT || 'sandbox',
      paychanguPublicKey: process.env.EXPO_PUBLIC_PAYCHANGU_PUBLIC_KEY || "",
      
      // Other API Keys
      paymentApiKey: process.env.PAYMENT_API_KEY || "",
      smsApiKey: process.env.SMS_API_KEY || "",
      emailApiKey: process.env.EMAIL_API_KEY || "",
      
      // EAS Configuration
      eas: {
        projectId: "2eb40af4-b32e-462e-b070-a1b171e65485"
      }
    },
    plugins: [
      "expo-router"
    ],
    experiments: {
      typedRoutes: true
    }
  },
  cli: {
    appVersionSource: "remote"
  }
}; 