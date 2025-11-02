const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin to add lock screen flags to MainActivity
 * This ensures showWhenLocked and turnScreenOn persist after expo prebuild
 */
const withMainActivityFlags = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];
    
    if (!application.activity) {
      console.warn('No activities found in AndroidManifest.xml');
      return config;
    }

    // Find MainActivity
    const mainActivity = application.activity.find(
      (activity) => activity.$['android:name'] === '.MainActivity'
    );

    if (mainActivity) {
      // Add lock screen flags
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
      
      console.log('✅ Added lock screen flags to MainActivity');
    } else {
      console.warn('MainActivity not found in AndroidManifest.xml');
    }

    return config;
  });
};

module.exports = withMainActivityFlags;
