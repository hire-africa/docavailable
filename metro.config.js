const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Simple configuration - remove complex resolver settings
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

// Basic resolver configuration
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add fallbacks for common module resolution issues
config.resolver.fallback = {
  ...config.resolver.fallback,
  'fs': false,
};

module.exports = config;