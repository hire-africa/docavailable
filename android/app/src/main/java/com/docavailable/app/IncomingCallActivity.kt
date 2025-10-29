package com.docavailable.app

import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * Full-screen activity for incoming calls
 * Shows over lock screen and wakes up the device
 * Works on all Android versions (8+) including Samsung, Xiaomi, and Android 12+
 */
class IncomingCallActivity : ReactActivity() {

    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Modern approach (Android 8.1+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        
        // Add ALL window flags for maximum compatibility (works on all versions)
        // This ensures screen wakes even on problematic devices (Samsung, Xiaomi, etc.)
        @Suppress("DEPRECATION")
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )
        
        // Force screen brightness to maximum for visibility
        val layoutParams = window.attributes
        layoutParams.screenBrightness = 1f // Full brightness
        window.attributes = layoutParams
        
        // Dismiss keyguard (lock screen)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as android.app.KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        }
        
        android.util.Log.d("IncomingCallActivity", "onCreate: Screen wake flags set")
    }

    override fun onResume() {
        super.onResume()
        
        // Acquire wake lock to physically wake the screen
        // This is critical for devices that ignore window flags (Samsung, Xiaomi, Android 12+)
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            
            // Create wake lock that forces screen on
            wakeLock = powerManager.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "docavailable:IncomingCallWakeLock"
            )
            
            // Acquire wake lock for 10 seconds (enough time for user to see the call)
            wakeLock?.acquire(10000)
            
            android.util.Log.d("IncomingCallActivity", "onResume: WakeLock acquired - screen should wake now!")
        } catch (e: Exception) {
            android.util.Log.e("IncomingCallActivity", "Failed to acquire wake lock", e)
        }
    }

    override fun onPause() {
        super.onPause()
        
        // Release wake lock when activity is paused
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    android.util.Log.d("IncomingCallActivity", "onPause: WakeLock released")
                }
            }
            wakeLock = null
        } catch (e: Exception) {
            android.util.Log.e("IncomingCallActivity", "Failed to release wake lock", e)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        
        // Ensure wake lock is released
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                }
            }
            wakeLock = null
        } catch (e: Exception) {
            android.util.Log.e("IncomingCallActivity", "Failed to release wake lock in onDestroy", e)
        }
    }

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    override fun getMainComponentName(): String = "main"

    /**
     * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
     * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
