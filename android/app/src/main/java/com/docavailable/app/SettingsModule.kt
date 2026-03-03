package com.docavailable.app

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SettingsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SettingsModule"
    }

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        try {
            val context = reactApplicationContext
            val canDraw = Settings.canDrawOverlays(context)
            promise.resolve(canDraw)
        } catch (e: Exception) {
            promise.reject("ERR_OVERLAY_CHECK", e)
        }
    }

    @ReactMethod
    fun openOverlaySettings(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + context.packageName)
            )
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_OPEN_OVERLAY_SETTINGS", e)
        }
    }
}
