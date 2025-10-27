const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const withNotifee = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // Get the main application element
    const mainApplication = AndroidConfig.Manifest.getMainActivityOrThrow(androidManifest);
    
    // Add permissions if they don't exist
    const existingPermissions = androidManifest.manifest.permission || [];
    
    const requiredPermissions = [
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.WAKE_LOCK',
    ];
    
    const manifestPermissions = existingPermissions.map(p => p.$['android:name']);
    
    requiredPermissions.forEach(permission => {
      if (!manifestPermissions.includes(permission)) {
        if (!androidManifest.manifest.permission) {
          androidManifest.manifest.permission = [];
        }
        androidManifest.manifest.permission.push({
          $: { 'android:name': permission },
        });
      }
    });
    
    return config;
  });
};

module.exports = withNotifee;

