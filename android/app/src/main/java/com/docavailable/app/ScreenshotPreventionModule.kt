package com.docavailable.app

import android.app.Activity
import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

class ScreenshotPreventionModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "ScreenshotPreventionModule"
    }

    @ReactMethod
    fun setSecureFlag(enabled: Boolean, promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                try {
                    val activity: Activity? = currentActivity
                    if (activity == null) {
                        promise.reject("ERROR", "Activity is null - cannot set secure flag")
                        return@runOnUiThread
                    }

                    val window = activity.window
                    if (window == null) {
                        promise.reject("ERROR", "Window is null - cannot set secure flag")
                        return@runOnUiThread
                    }

                    if (enabled) {
                        // Enable FLAG_SECURE to prevent screenshots and screen recording
                        window.setFlags(
                            WindowManager.LayoutParams.FLAG_SECURE,
                            WindowManager.LayoutParams.FLAG_SECURE
                        )
                        android.util.Log.d("ScreenshotPrevention", "✅ FLAG_SECURE enabled - screenshots will show black screen")
                        promise.resolve("Screenshot prevention enabled")
                    } else {
                        // Disable FLAG_SECURE to allow screenshots
                        window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                        android.util.Log.d("ScreenshotPrevention", "🔓 FLAG_SECURE disabled - screenshots allowed")
                        promise.resolve("Screenshot prevention disabled")
                    }
                } catch (e: Exception) {
                    android.util.Log.e("ScreenshotPrevention", "❌ Error setting secure flag: ${e.message}", e)
                    promise.reject("ERROR", "Failed to set secure flag: ${e.message}", e)
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("ScreenshotPrevention", "❌ Error in setSecureFlag: ${e.message}", e)
            promise.reject("ERROR", "Failed to execute setSecureFlag: ${e.message}", e)
        }
    }

    @ReactMethod
    fun isSecureFlagEnabled(promise: Promise) {
        try {
            val activity: Activity? = currentActivity
            if (activity == null) {
                promise.reject("ERROR", "Activity is null")
                return
            }

            val window = activity.window
            if (window == null) {
                promise.reject("ERROR", "Window is null")
                return
            }

            val flags = window.attributes.flags
            val isSecure = (flags and WindowManager.LayoutParams.FLAG_SECURE) != 0
            promise.resolve(isSecure)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to check secure flag: ${e.message}", e)
        }
    }
}

