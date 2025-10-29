const { withAndroidManifest, withMainApplication, AndroidConfig } = require('@expo/config-plugins');

const withIncomingCallModule = (config) => {
  // Add Android Manifest modifications
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

    // Add IncomingCallActivity to manifest
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
          'android:theme': '@style/Theme.App.SplashScreen',
          'android:configChanges': 'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode'
        },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'com.docavailable.app.INCOMING_CALL' } }],
          category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }]
        }]
      });
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

  // Add MainApplication modifications to register native module
  config = withMainApplication(config, (config) => {
    const { modResults } = config;
    
    // Add import for IncomingCallPackage
    if (!modResults.contents.includes('import com.docavailable.app.IncomingCallPackage')) {
      modResults.contents = modResults.contents.replace(
        /import expo\.modules\.ReactNativeHostWrapper/,
        `import expo.modules.ReactNativeHostWrapper
import com.docavailable.app.IncomingCallPackage`
      );
    }
    
    // Add package to getPackages method
    if (!modResults.contents.includes('packages.add(IncomingCallPackage())')) {
      modResults.contents = modResults.contents.replace(
        /packages\.add\(MyReactNativePackage\(\)\)/,
        `packages.add(MyReactNativePackage())
            packages.add(IncomingCallPackage()) // Add native module for incoming calls`
      );
      
      // If the above replacement didn't work, try a different pattern
      if (!modResults.contents.includes('packages.add(IncomingCallPackage())')) {
        modResults.contents = modResults.contents.replace(
          /return packages/,
          `packages.add(IncomingCallPackage()) // Add native module for incoming calls
            return packages`
        );
      }
    }
    
    return config;
  });

  return config;
};

module.exports = withIncomingCallModule;

