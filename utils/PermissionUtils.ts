import notifee from '@notifee/react-native';
import { Linking, Platform } from 'react-native';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';

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
     */
    async checkOverlayPermission(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;

        try {
            const permission = (PERMISSIONS.ANDROID as any).SYSTEM_ALERT_WINDOW || 'android.permission.SYSTEM_ALERT_WINDOW';
            const status = await check(permission);
            console.log('[PermissionUtils] Overlay status check result:', status);

            // On some Android versions/devices, status might be 'granted' or 'limited'
            return status === RESULTS.GRANTED ||
                (status as string) === 'granted' ||
                (status as string) === 'authorized' ||
                (status as string) === 'limited';
        } catch (error) {
            console.error('[PermissionUtils] Error checking overlay permission:', error);
            return false;
        }
    },

    async checkBatteryOptimizationExempt(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;

        try {
            // isBatteryOptimizationEnabled() returns true if optimization IS ON (bad for us)
            const isOptimized = await notifee.isBatteryOptimizationEnabled();
            console.log('[PermissionUtils] Battery isOptimized result:', isOptimized);

            return !isOptimized;
        } catch (error) {
            console.error('[PermissionUtils] Error checking battery optimization:', error);
            return false;
        }
    },

    /**
     * Check notification permissions with specific focus on lock screen
     */
    async checkNotificationPermission(): Promise<boolean> {
        try {
            const settings = await notifee.getNotificationSettings();

            // 1. Check general notification authorization
            if (settings.authorizationStatus < 1) { // 0 = NOT_DETERMINED or DENIED
                return false;
            }

            if (Platform.OS === 'android') {
                const android = (settings.android as any);
                const visibility = android?.visibility;
                const importance = android?.importance;

                // 2. Visibility SECRET (-1) hides notification content on lockscreen
                if (visibility === -1) {
                    return false;
                }

                // 3. Low importance ( < 3 ) might hide from lockscreen banner
                if (importance !== undefined && importance < 3) {
                    return false;
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

        return { overlay, battery, notifications };
    },

    /**
     * Open Android Overlay settings for this app
     */
    async openOverlaySettings(): Promise<void> {
        if (Platform.OS === 'android') {
            try {
                // Try to open specific overlay settings for the app
                const packageName = 'com.docavailable.app'; // Corrected from .minimal
                await Linking.sendIntent('android.settings.action.MANAGE_OVERLAY_PERMISSION', [
                    { key: 'package', value: packageName }
                ]);
            } catch (error) {
                console.error('[PermissionUtils] Error opening specific overlay settings, falling back:', error);
                await Linking.openSettings();
            }
        }
    },

    /**
     * Open Android Battery Optimization settings
     */
    async openBatterySettings(): Promise<void> {
        if (Platform.OS === 'android') {
            try {
                // Try to open basic battery optimization settings
                await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
            } catch (error) {
                console.error('[PermissionUtils] Error opening battery settings, falling back:', error);
                await Linking.openSettings();
            }
        }
    },

    /**
     * Open App Notification settings
     */
    async openNotificationSettings(): Promise<void> {
        try {
            await Linking.openSettings();
        } catch (error) {
            console.error('[PermissionUtils] Error opening notification settings:', error);
        }
    }
};
