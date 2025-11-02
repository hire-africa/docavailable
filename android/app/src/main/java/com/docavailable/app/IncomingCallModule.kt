package com.docavailable.app

import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class IncomingCallModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "IncomingCallModule"
    }
    
    @ReactMethod
    fun showIncomingCall(callData: ReadableMap) {
        try {
            val context = reactApplicationContext
            
            val intent = Intent(context, IncomingCallActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("sessionId", callData.getString("sessionId") ?: "")
                putExtra("doctorId", callData.getString("doctorId") ?: "")
                putExtra("callerName", callData.getString("callerName") ?: "")
                putExtra("callType", callData.getString("callType") ?: "audio")
            }
            
            context.startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
