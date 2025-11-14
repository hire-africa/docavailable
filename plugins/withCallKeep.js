const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/**
 * Expo config plugin for react-native-callkeep
 * Adds required permissions and foreground service declaration
 */
const withCallKeep = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    // Ensure manifest has required structure
    if (!manifest.application) {
      manifest.application = [{}];
    }
    if (!manifest.application[0].$) {
      manifest.application[0].$ = {};
    }

    // Add permissions
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
      'android.permission.READ_PHONE_STATE',
      'android.permission.FOREGROUND_SERVICE_PHONE_CALL',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.MANAGE_OWN_CALLS'
    ];

    permissions.forEach((permission) => {
      if (!manifest['uses-permission'].find((p) => p.$['android:name'] === permission)) {
        manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    // Add foreground service type to application
    const application = manifest.application[0];
    if (!application.service) {
      application.service = [];
    }

    // Add CallKeep ConnectionService
    const connectionService = {
      $: {
        'android:name': 'io.wazo.callkeep.VoiceConnectionService',
        'android:label': 'DocAvailable',
        'android:permission': 'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
        'android:foregroundServiceType': 'phoneCall',
        'android:exported': 'true'
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.telecom.ConnectionService' } }],
        },
      ],
    };

    // Check if service already exists, if not add it
    const serviceExists = application.service.find(
      (s) => s.$?.['android:name'] === 'io.wazo.callkeep.VoiceConnectionService'
    );

    if (!serviceExists) {
      application.service.push(connectionService);
    }

    return config;
  });
};

module.exports = withCallKeep;
