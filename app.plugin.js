const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const withIncomingCallModule = (config) => {
  // Add Android Manifest modifications only
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // Add permissions if they don't exist
    const existingPermissions = androidManifest.manifest.permission || [];
    
    const requiredPermissions = [
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.WAKE_LOCK',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_PHONE_CALL',
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

    // Add dedicated IncomingCallActivity for WhatsApp-style calls
    const application = androidManifest.manifest.application[0];
    if (!application.activity) {
      application.activity = [];
    }

    // Check if IncomingCallActivity already exists
    const hasIncomingCallActivity = application.activity.some(activity => 
      activity.$['android:name'] === '.IncomingCallActivity'
    );

    if (!hasIncomingCallActivity) {
      application.activity.push({
        $: {
          'android:name': '.IncomingCallActivity',
          'android:exported': 'true',
          'android:launchMode': 'singleTop',
          'android:showWhenLocked': 'true',
          'android:turnScreenOn': 'true',
          'android:excludeFromRecents': 'true',
          'android:taskAffinity': '',
          'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
          'android:configChanges': 'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode',
          'android:screenOrientation': 'portrait'
        },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'com.docavailable.app.INCOMING_CALL' } }],
          category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }]
        }]
      });
      console.log('Added IncomingCallActivity to manifest');
    }

    // Add IncomingCallService to manifest
    if (!application.service) {
      application.service = [];
    }

    // Check if IncomingCallService already exists
    const hasIncomingCallService = application.service.some(service => 
      service.$['android:name'] === '.IncomingCallService'
    );

    if (!hasIncomingCallService) {
      application.service.push({
        $: {
          'android:name': '.IncomingCallService',
          'android:enabled': 'true',
          'android:exported': 'false',
          'android:foregroundServiceType': 'phoneCall'
        }
      });
    }
    
    return config;
  });

  return config;
};

module.exports = withIncomingCallModule;

