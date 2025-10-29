package com.docavailable.app

import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.util.Log

/**
 * Native module to launch IncomingCallActivity directly
 * This bypasses Notifee's fullScreenAction which may not work reliably
 */
class IncomingCallModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "IncomingCallModule"
    }

    @ReactMethod
    fun launchIncomingCallActivity() {
        launchIncomingCallActivity("Unknown", "audio")
    }
    
    @ReactMethod
    fun launchIncomingCallActivity(callerName: String, callType: String) {
        try {
            val context = reactApplicationContext
            
            Log.d("IncomingCallModule", "Starting IncomingCallService for: $callerName")
            
            // Start foreground service (works even when app is killed)
            IncomingCallService.start(context, callerName, callType)
            
            Log.d("IncomingCallModule", "IncomingCallService started successfully")
        } catch (e: Exception) {
            Log.e("IncomingCallModule", "Failed to start IncomingCallService", e)
        }
    }
}
