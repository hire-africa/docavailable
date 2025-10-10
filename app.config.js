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
      },
      googleServicesFile: "./google-services.json",
      edgeToEdgeEnabled: true
    },
    web: {
      favicon: "./assets/images/favicon.png"
    },
    scheme: "docavailable",
    plugins: [
      "expo-router",
      "@react-native-firebase/app",
      "@react-native-firebase/messaging"
    ],
    extra: {
      eas: {
        projectId: "1296f2d3-ce36-44a9-a320-8c6f6a9ccf85"
      }
    },
  }
};
