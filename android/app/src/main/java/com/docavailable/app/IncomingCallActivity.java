package com.docavailable.app;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.view.WindowManager;
import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

public class IncomingCallActivity extends ReactActivity {
    private static final String TAG = "IncomingCallActivity";

    @Nullable
    private PowerManager.WakeLock wakeLock;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }

        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        );

        WindowManager.LayoutParams layoutParams = getWindow().getAttributes();
        layoutParams.screenBrightness = 1f;
        getWindow().setAttributes(layoutParams);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        }

        Log.d(TAG, "onCreate: Screen wake flags set");

        emitIncomingCallIntent(getIntent());
    }

    @Override
    protected void onResume() {
        super.onResume();

        emitIncomingCallIntent(getIntent());

        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "docavailable:IncomingCallWakeLock"
                );
                wakeLock.acquire(10000);
                Log.d(TAG, "onResume: WakeLock acquired - screen should wake now!");
            }
        } catch (Exception error) {
            Log.e(TAG, "Failed to acquire wake lock", error);
        }
    }

    @Override
    protected void onNewIntent(@Nullable Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        emitIncomingCallIntent(intent);
    }

    private void emitIncomingCallIntent(@Nullable Intent sourceIntent) {
        if (sourceIntent == null) {
            return;
        }

        Bundle extras = sourceIntent.getExtras();
        if (extras == null || extras.isEmpty()) {
            return;
        }

        Bundle payload = new Bundle(extras);
        String callerName = getFirstNonNullString(payload, "caller_name", "callerName");
        if (callerName == null) {
            callerName = "Unknown";
        }

        String callType = getFirstNonNullString(payload, "call_type", "callType");
        if (callType == null) {
            callType = "audio";
        }

        payload.putString("caller_name", callerName);
        payload.putString("callerName", callerName);
        payload.putString("call_type", callType);
        payload.putString("callType", callType);

        Log.d(TAG, "Emitting incomingCallShow with payload keys: " + payload.keySet());
        IncomingCallModule.sendIncomingCallEvent(payload);
    }

    @Override
    protected void onPause() {
        super.onPause();
        releaseWakeLock();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        releaseWakeLock();
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                Log.d(TAG, "WakeLock released");
            }
        } catch (Exception error) {
            Log.e(TAG, "Failed to release wake lock", error);
        } finally {
            wakeLock = null;
        }
    }

    @Override
    protected String getMainComponentName() {
        return "main";
    }

    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new DefaultReactActivityDelegate(
            this,
            getMainComponentName(),
            DefaultNewArchitectureEntryPoint.getFabricEnabled()
        );
    }

    @Nullable
    private String getFirstNonNullString(Bundle bundle, String... keys) {
        for (String key : keys) {
            String value = bundle.getString(key);
            if (value != null) {
                return value;
            }
        }
        return null;
    }
}
