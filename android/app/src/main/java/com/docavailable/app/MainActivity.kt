package com.docavailable.app
import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle
import android.content.Intent

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.ReactInstanceManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    
    super.onCreate(null)

    // Handle native incoming call intent
    handleIncomingCallIntent(intent)

    // Deliver any pending native call once the React context is ready
    reactNativeHost.reactInstanceManager.addReactInstanceEventListener(object : ReactInstanceEventListener {
      override fun onReactContextInitialized(context: ReactContext) {
        deliverPendingNativeCall()
      }
    })
  }
  
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    // Handle incoming call when app is already running
    handleIncomingCallIntent(intent)
  }
  
  private fun handleIncomingCallIntent(intent: Intent?) {
    if (intent?.getBooleanExtra("isIncomingCall", false) == true) {
      val data = Arguments.createMap().apply {
        putString("sessionId", intent.getStringExtra("sessionId") ?: "")
        putString("doctorId", intent.getStringExtra("doctorId") ?: "")
        putString("doctorName", intent.getStringExtra("doctorName") ?: "")
        putString("callType", intent.getStringExtra("callType") ?: "audio")
        putBoolean("isIncomingCall", true)
        putBoolean("answeredFromNative", true)
      }

      emitNativeIncomingCall(data)
    }
  }

  private fun emitNativeIncomingCall(data: WritableMap) {
    val reactInstanceManager: ReactInstanceManager = reactNativeHost.reactInstanceManager
    val reactContext = reactInstanceManager.currentReactContext

    if (reactContext != null) {
      try {
        val jsModule = reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        jsModule.emit("nativeIncomingCall", data)
      } catch (e: Exception) {
        e.printStackTrace()
        pendingNativeCallData = data
      }
    } else {
      pendingNativeCallData = data
    }
  }

  private fun deliverPendingNativeCall() {
    val data = pendingNativeCallData ?: return
    // Attempt to emit. If still not ready, keep it queued.
    emitNativeIncomingCall(data)
    if (pendingNativeCallData === data) {
      pendingNativeCallData = null
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }

  companion object {
    @JvmStatic
    private var pendingNativeCallData: WritableMap? = null
  }
}
