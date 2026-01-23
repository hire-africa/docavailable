const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin for react-native-webrtc
 * Ensures all required permissions and settings for WebRTC are properly configured
 * for both audio/video calls and media features like voice notes
 */
const withWebRTC = (config) => {
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

        // Add uses-permission array if it doesn't exist
        if (!manifest['uses-permission']) {
            manifest['uses-permission'] = [];
        }

        // WebRTC required permissions
        const webRTCPermissions = [
            'android.permission.INTERNET',
            'android.permission.ACCESS_NETWORK_STATE',
            'android.permission.ACCESS_WIFI_STATE',
            'android.permission.RECORD_AUDIO',
            'android.permission.CAMERA',
            'android.permission.MODIFY_AUDIO_SETTINGS',
            'android.permission.BLUETOOTH',
            'android.permission.BLUETOOTH_CONNECT',
            'android.permission.WAKE_LOCK',
            'android.permission.VIBRATE',
            'android.permission.FOREGROUND_SERVICE',
            'android.permission.FOREGROUND_SERVICE_MICROPHONE',
            'android.permission.FOREGROUND_SERVICE_CAMERA',
            'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
        ];

        webRTCPermissions.forEach((permission) => {
            if (!manifest['uses-permission'].find((p) => p.$['android:name'] === permission)) {
                manifest['uses-permission'].push({
                    $: { 'android:name': permission },
                });
            }
        });

        // Add uses-feature for camera and microphone
        if (!manifest['uses-feature']) {
            manifest['uses-feature'] = [];
        }

        const webRTCFeatures = [
            { name: 'android.hardware.camera', required: 'false' },
            { name: 'android.hardware.camera.autofocus', required: 'false' },
            { name: 'android.hardware.microphone', required: 'true' },
        ];

        webRTCFeatures.forEach((feature) => {
            if (!manifest['uses-feature'].find((f) => f.$['android:name'] === feature.name)) {
                manifest['uses-feature'].push({
                    $: {
                        'android:name': feature.name,
                        'android:required': feature.required
                    },
                });
            }
        });

        // Ensure hardware acceleration for WebRTC
        const application = manifest.application[0];
        if (!application.$['android:hardwareAccelerated']) {
            application.$['android:hardwareAccelerated'] = 'true';
        }

        console.log('✅ [withWebRTC] WebRTC permissions and features configured');

        return config;
    });
};

module.exports = withWebRTC;
