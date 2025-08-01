const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Allow .cjs files and disable stricter package.json exports resolution
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

// Add specific resolver configurations for React Native components
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Ensure React Native components are properly resolved
config.resolver.nodeModulesPaths = [
  require('path').resolve(__dirname, 'node_modules'),
];

// SIMPLE AND SAFE: Use only aliases to avoid infinite recursion
config.resolver.alias = {
  ...config.resolver.alias,
  // Fix expo-router head module
  './head': path.resolve(__dirname, 'node_modules/expo-router/build/head/ExpoHead.js'),
};

// Add resolver fallbacks for common module resolution issues
config.resolver.fallback = {
  ...config.resolver.fallback,
  'fs': false,
};

// Add vector-icons to resolver platforms
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Ensure vector-icons are properly resolved
config.resolver.nodeModulesPaths = [
  require('path').resolve(__dirname, 'node_modules'),
];

// Configure transformer to handle the head module properly
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    keep_fnames: true,
  },
};

module.exports = config;