import notifee, { AndroidImportance, NotificationSettings } from '@notifee/react-native';
import { Linking, NativeModules, Platform } from 'react-native';

export interface PermissionStatus {
    overlay: boolean;
    battery: boolean;
    notifications: boolean;
}

/**
 * Utility for checking and requesting advanced Android permissions
 */
export const PermissionUtils = {
    /**
     * Check if the app has permission to display over other apps (Overlay)
     * Uses NativeModules/Settings to call the real Android API:
     * Settings.canDrawOverlays(context) — the only reliable method.
     * react-native-permissions cannot check SYSTEM_ALERT_WINDOW correctly.
     */
    async checkOverlayPermission(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;

        try {
            // notifee exposes this check on newer versions
            if (typeof notifee.canRequestPermission === 'function') {
                // Not the right method — fall through to NativeModules
            }

            // Primary method: use Android Settings via NativeModules
            // This calls Settings.canDrawOverlays(context) under the hood
            const { SettingsModule } = NativeModules;
            if (SettingsModule?.canDrawOverlays) {
                const result = await SettingsModule.canDrawOverlays();
                console.log('[PermissionUtils] Overlay canDrawOverlays:', result);
                return !!result;
            }

            // Fallback: notifee power manager check won't tell us overlay, but
            // some RN bridges expose checkSelfPermission
            const { PermissionsAndroid } = require('react-native');
            // SYSTEM_ALERT_WINDOW requires canDrawOverlays(), not checkSelfPermission()
            // so we use a direct intent check as last resort
            console.warn('[PermissionUtils] No native overlay check available, defaulting to false');
            return false;
        } catch (error) {
            console.error('[PermissionUtils] Error checking overlay permission:', error);
            return false;
        }
    },

    /**
     * Check battery optimization exemption.
     * notifee.isBatteryOptimizationEnabled() is correct and reliable.
     */
    async checkBatteryOptimizationExempt(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;

        try {
            const isOptimized = await notifee.isBatteryOptimizationEnabled();
            console.log('[PermissionUtils] Battery isOptimized:', isOptimized);
            return !isOptimized;
        } catch (error) {
            console.error('[PermissionUtils] Error checking battery optimization:', error);
            return false;
        }
    },

    /**
     * Check notification permissions.
     *
     * FIX: visibility and importance live on CHANNELS, not on the top-level
     * settings.android object. Checking them there always returns undefined,
     * causing false negatives. We now check:
     *   1. Top-level authorization (is the app allowed to post at all?)
     *   2. The specific notifee channel used for calls (if it exists)
     */
    async checkNotificationPermission(): Promise<boolean> {
        try {
            const settings: NotificationSettings = await notifee.getNotificationSettings();

            // authorizationStatus: 0 = DENIED, 1 = AUTHORIZED, 2 = PROVISIONAL
            if (settings.authorizationStatus < 1) {
                console.log('[PermissionUtils] Notifications denied at app level');
                return false;
            }

            if (Platform.OS === 'android') {
                // Check the call channel specifically — this is where importance/visibility matters
                // Replace 'incoming_calls' with your actual channel ID if different
                const CALL_CHANNEL_ID = 'incoming_calls_v3';
                try {
                    const channel = await notifee.getChannel(CALL_CHANNEL_ID);
                    if (channel) {
                        // Channel blocked entirely
                        if (channel.blocked) {
                            console.log('[PermissionUtils] Call channel is blocked');
                            return false;
                        }
                        // Importance too low to show on lock screen (need HIGH = 4 or FULL_SCREEN = 5)
                        if (
                            channel.importance !== undefined &&
                            channel.importance < AndroidImportance.HIGH
                        ) {
                            console.log('[PermissionUtils] Call channel importance too low:', channel.importance);
                            return false;
                        }
                        // Visibility SECRET hides from lock screen
                        if ((channel as any).visibility === -1) {
                            console.log('[PermissionUtils] Call channel visibility is SECRET');
                            return false;
                        }
                    } else {
                        // Channel doesn't exist yet — treat as not configured = not granted
                        console.warn('[PermissionUtils] Call channel not found:', CALL_CHANNEL_ID);
                        // Don't fail hard here — channel may be created at runtime
                    }
                } catch (channelError) {
                    console.warn('[PermissionUtils] Could not read call channel:', channelError);
                }
            }

            return true;
        } catch (error) {
            console.error('[PermissionUtils] Error checking notification permission:', error);
            return false;
        }
    },

    /**
     * Get overall permissions status
     */
    async getStatus(): Promise<PermissionStatus> {
        const [overlay, battery, notifications] = await Promise.all([
            this.checkOverlayPermission(),
            this.checkBatteryOptimizationExempt(),
            this.checkNotificationPermission(),
        ]);

        console.log('[PermissionUtils] Status:', { overlay, battery, notifications });
        return { overlay, battery, notifications };
    },

    /**
     * Open Android Overlay settings for this app
     */
    async openOverlaySettings(): Promise<void> {
        if (Platform.OS !== 'android') return;
        try {
            const packageName = 'com.docavailable.app';
            await Linking.sendIntent(
                'android.settings.action.MANAGE_OVERLAY_PERMISSION',
                [{ key: 'package', value: packageName }]
            );
        } catch (error) {
            console.error('[PermissionUtils] Overlay settings fallback:', error);
            await Linking.openSettings();
        }
    },

    /**
     * Open Android Battery Optimization settings.
     * Try the direct exemption intent first (takes user straight to the toggle),
     * fall back to the general list.
     */
    async openBatterySettings(): Promise<void> {
        if (Platform.OS !== 'android') return;
        try {
            const packageName = 'com.docavailable.app';
            // REQUEST_IGNORE_BATTERY_OPTIMIZATIONS opens a direct yes/no dialog
            await Linking.sendIntent(
                'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
                [{ key: 'package', value: packageName }]
            );
        } catch {
            try {
                await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
            } catch (error) {
                console.error('[PermissionUtils] Battery settings fallback:', error);
                await Linking.openSettings();
            }
        }
    },

    /**
     * Open App Notification settings
     */
    async openNotificationSettings(): Promise<void> {
        try {
            if (Platform.OS === 'android') {
                // Opens the app's notification settings page directly
                await notifee.openNotificationSettings();
            } else {
                await Linking.openSettings();
            }
        } catch (error) {
            console.error('[PermissionUtils] Error opening notification settings:', error);
            await Linking.openSettings();
        }
    },
};