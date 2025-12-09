module.exports = {
  expo: {
    name: "DocAvailable",
    slug: "Doc_available",
    workflow: "managed",
    platforms: ["ios", "android"],
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
    scheme: "docavailable",
    plugins: [
      "expo-router"
    ]
  }
};
