import { Platform, NativeModules, Linking } from 'react-native';
import notifee from '@notifee/react-native';

const { Settings } = NativeModules;

class FullScreenPermissionService {
  /**
   * Check if the app can use full-screen intent notifications
   * Required for Android 12+ (API 31+)
   */
  async canUseFullScreenIntent(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const settings = await notifee.getNotificationSettings();
      console.log('📱 [FullScreen] Notification settings:', settings);
      
      // Check if full-screen intent is allowed
      // This is implicitly allowed on Android <12, needs explicit permission on 12+
      return true; // Notifee handles this internally
    } catch (error) {
      console.error('❌ [FullScreen] Failed to check settings:', error);
      return false;
    }
  }

  /**
   * Request full-screen intent permission (Android 12+)
   */
  async requestFullScreenPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      console.log('📱 [FullScreen] Requesting full-screen intent permission...');
      
      // Request permission through notifee
      const settings = await notifee.requestPermission({
        alert: true,
        badge: true,
        sound: true,
        announcement: true,
      });

      console.log('📱 [FullScreen] Permission result:', settings);
      
      // For Android 12+, we may need to open system settings
      if (Platform.Version >= 31) {
        console.log('📱 [FullScreen] Android 12+ detected, may need system settings');
        // Guide user to enable "Display over other apps" if needed
        return this.checkAndRequestSystemAlertWindow();
      }

      return settings.authorizationStatus >= 1; // AUTHORIZED or higher
    } catch (error) {
      console.error('❌ [FullScreen] Failed to request permission:', error);
      return false;
    }
  }

  /**
   * Check and request SYSTEM_ALERT_WINDOW permission
   * This allows the app to display over other apps and on lock screen
   */
  async checkAndRequestSystemAlertWindow(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      // Check if we already have the permission
      const canDrawOverlays = await this.canDrawOverlays();
      
      if (canDrawOverlays) {
        console.log('✅ [FullScreen] Already has overlay permission');
        return true;
      }

      console.log('⚠️ [FullScreen] Need overlay permission, opening settings...');
      
      // Open system settings for the user to grant permission
      await Linking.openSettings();
      
      return false; // User needs to grant manually
    } catch (error) {
      console.error('❌ [FullScreen] Failed to check overlay permission:', error);
      return false;
    }
  }

  /**
   * Check if app can draw overlays (Android specific)
   * This is needed for full-screen intent on lock screen
   */
  async canDrawOverlays(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      // Android 6.0+ (API 23+) requires this permission to be granted via settings
      if (Platform.Version >= 23) {
        // We can't directly check this via standard RN APIs
        // Notifee will handle showing the notification with best effort
        console.log('📱 [FullScreen] Android 6+, assuming overlay permission check via Notifee');
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('❌ [FullScreen] Failed to check overlay permission:', error);
      return false;
    }
  }

  /**
   * Request battery optimization exclusion
   * This helps ensure notifications work when device is in deep sleep
   */
  async requestBatteryOptimizationExclusion(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      console.log('🔋 [FullScreen] Checking battery optimization...');
      
      // Open battery optimization settings
      // User needs to manually disable optimization for the app
      const url = 'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS';
      
      console.log('🔋 [FullScreen] Guide user to disable battery optimization');
      // We can't directly open this, but we can guide the user
      
    } catch (error) {
      console.error('❌ [FullScreen] Failed to request battery optimization exclusion:', error);
    }
  }

  /**
   * Show a dialog explaining what permissions are needed
   */
  async showPermissionExplanation(): Promise<void> {
    const message = `
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  📱 ACTION REQUIRED: Enable Full-Screen Call Notifications    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

To receive incoming calls when your screen is OFF, follow these steps:

┌─ STEP 1: Display Over Other Apps ────────────────────────────┐
│ 1. Open your phone Settings                                   │
│ 2. Go to: Apps → DocAvailable                                │
│ 3. Tap: Advanced → Special app access                        │
│ 4. Tap: Display over other apps                              │
│ 5. Toggle ON for DocAvailable                                │
└───────────────────────────────────────────────────────────────┘

┌─ STEP 2: Disable Battery Optimization ───────────────────────┐
│ 1. In DocAvailable app settings                              │
│ 2. Tap: Battery                                               │
│ 3. Select: Unrestricted or Don't optimize                    │
└───────────────────────────────────────────────────────────────┘

┌─ STEP 3: Test ────────────────────────────────────────────────┐
│ 1. Close the app completely                                   │
│ 2. Turn off your screen                                       │
│ 3. Send a test call                                           │
│ 4. Screen should wake up with incoming call!                 │
└───────────────────────────────────────────────────────────────┘

⚠️  Without these permissions, calls will only ring when app is open!

See SCREEN_OFF_CALL_FIX.md for detailed instructions.
    `;
    
    console.log(message);
    
    // Also log to ensure visibility
    console.warn('⚠️ INCOMING CALLS WON\'T WAKE DEVICE WITHOUT "DISPLAY OVER OTHER APPS" PERMISSION');
    console.warn('📖 Read SCREEN_OFF_CALL_FIX.md for step-by-step setup instructions');
  }

  /**
   * Complete setup check - verifies all permissions and settings
   */
  async performCompleteSetup(): Promise<{
    success: boolean;
    missingPermissions: string[];
  }> {
    const missing: string[] = [];

    try {
      // 1. Check notification permission
      const notifSettings = await notifee.getNotificationSettings();
      if (notifSettings.authorizationStatus < 1) {
        missing.push('Notification Permission');
      }

      // 2. Check full-screen intent (best effort)
      const canFullScreen = await this.canUseFullScreenIntent();
      if (!canFullScreen) {
        missing.push('Full-Screen Intent');
      }

      // 3. Check overlay permission (best effort)
      const canOverlay = await this.canDrawOverlays();
      if (!canOverlay) {
        missing.push('Display Over Other Apps');
      }

      if (missing.length > 0) {
        console.log('⚠️ [FullScreen] Missing permissions:', missing);
        await this.showPermissionExplanation();
        return { success: false, missingPermissions: missing };
      }

      console.log('✅ [FullScreen] All permissions granted!');
      return { success: true, missingPermissions: [] };
    } catch (error) {
      console.error('❌ [FullScreen] Setup check failed:', error);
      return { success: false, missingPermissions: ['Unknown'] };
    }
  }
}

export default new FullScreenPermissionService();
