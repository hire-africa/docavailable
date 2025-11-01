const { withGradleProperties, AndroidConfig } = require('@expo/config-plugins');

/**
 * Custom config plugin to forcefully disable New Architecture
 * This runs AFTER expo-build-properties and ensures newArchEnabled=false
 */
const withDisableNewArch = (config) => {
  return withGradleProperties(config, (config) => {
    // Remove any existing newArchEnabled property
    config.modResults = config.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'newArchEnabled')
    );
    
    // Add newArchEnabled=false
    config.modResults.push({
      type: 'property',
      key: 'newArchEnabled',
      value: false, // Boolean false, not string
    });

    console.log('[withDisableNewArch] Set newArchEnabled=false in gradle.properties');

    return config;
  });
};

module.exports = withDisableNewArch;
