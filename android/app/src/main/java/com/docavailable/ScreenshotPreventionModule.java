package com.docavailable;

import android.app.Activity;
import android.view.WindowManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class ScreenshotPreventionModule extends ReactContextBaseJavaModule {
    
    public ScreenshotPreventionModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "ScreenshotPreventionModule";
    }

    @ReactMethod
    public void setSecureFlag(boolean enabled, Promise promise) {
        try {
            Activity currentActivity = getCurrentActivity();
            if (currentActivity != null) {
                if (enabled) {
                    // Enable FLAG_SECURE to prevent screenshots - will show black screen
                    currentActivity.getWindow().setFlags(
                        WindowManager.LayoutParams.FLAG_SECURE,
                        WindowManager.LayoutParams.FLAG_SECURE
                    );
                    // Also prevent screen recording and other capture methods
                    currentActivity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    // Additional security flags
                    currentActivity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
                    System.out.println("🔒 [ScreenshotPrevention] Android FLAG_SECURE enabled - screenshots will show black screen");
                } else {
                    // Disable FLAG_SECURE to allow screenshots
                    currentActivity.getWindow().clearFlags(
                        WindowManager.LayoutParams.FLAG_SECURE
                    );
                    System.out.println("🔓 [ScreenshotPrevention] Android FLAG_SECURE disabled - screenshots allowed");
                }
                promise.resolve(true);
            } else {
                System.out.println("❌ [ScreenshotPrevention] No current activity found");
                promise.reject("NO_ACTIVITY", "No current activity found");
            }
        } catch (Exception e) {
            System.out.println("❌ [ScreenshotPrevention] Failed to set secure flag: " + e.getMessage());
            promise.reject("ERROR", "Failed to set secure flag: " + e.getMessage());
        }
    }

    @ReactMethod
    public void isSecureFlagEnabled(Promise promise) {
        try {
            Activity currentActivity = getCurrentActivity();
            if (currentActivity != null) {
                boolean isEnabled = (currentActivity.getWindow().getAttributes().flags 
                    & WindowManager.LayoutParams.FLAG_SECURE) != 0;
                promise.resolve(isEnabled);
            } else {
                promise.reject("NO_ACTIVITY", "No current activity found");
            }
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to check secure flag: " + e.getMessage());
        }
    }
}
