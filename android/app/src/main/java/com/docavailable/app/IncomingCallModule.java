package com.docavailable.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class IncomingCallModule extends ReactContextBaseJavaModule {
    private static final String TAG = "IncomingCallModule";

    @Nullable
    private static ReactApplicationContext reactContextRef;
    @Nullable
    private static Bundle pendingPayload;

    public IncomingCallModule(ReactApplicationContext reactContext) {
        super(reactContext);
        attachReactContext(reactContext);
    }

    @Override
    public void initialize() {
        super.initialize();
        attachReactContext(getReactApplicationContext());
    }

    @Override
    public void invalidate() {
        detachReactContext(getReactApplicationContext());
        super.invalidate();
    }

    @Override
    public String getName() {
        return "IncomingCallModule";
    }

    @ReactMethod
    public void addListener(String eventName) {
        Log.d(TAG, "addListener called for " + eventName);
    }

    @ReactMethod
    public void removeListeners(int count) {
        Log.d(TAG, "removeListeners called with count=" + count);
    }

    @ReactMethod
    public void getPendingIncomingCall(Promise promise) {
        synchronized (IncomingCallModule.class) {
            if (pendingPayload != null) {
                promise.resolve(Arguments.fromBundle(new Bundle(pendingPayload)));
            } else {
                promise.resolve(null);
            }
        }
    }

    @ReactMethod
    public void launchIncomingCall(ReadableMap callData) {
        Bundle callBundle = Arguments.toBundle(callData);
        if (callBundle == null) {
            callBundle = new Bundle();
        }

        String callerName = extractString(callData, "callerName", "doctorName", "doctor_name");
        if (callerName == null) {
            callerName = "Unknown";
        }

        String callType = extractString(callData, "callType", "call_type");
        if (callType == null) {
            callType = "audio";
        }

        String appointmentId = extractString(callData, "appointmentId", "appointment_id");
        String notificationId = extractString(callData, "notificationId", "notification_id", "id");
        if (notificationId == null) {
            notificationId = "call_" + System.currentTimeMillis();
        }

        callBundle.putString("caller_name", callerName);
        callBundle.putString("callerName", callerName);
        callBundle.putString("call_type", callType);
        callBundle.putString("callType", callType);
        callBundle.putString("notification_id", notificationId);
        callBundle.putString("notificationId", notificationId);

        if (appointmentId != null) {
            callBundle.putString("appointment_id", appointmentId);
            callBundle.putString("appointmentId", appointmentId);
        }

        startIncomingCall(callBundle);
    }

    @ReactMethod
    public void launchIncomingCallActivity() {
        launchIncomingCallActivity("Unknown", "audio");
    }

    @ReactMethod
    public void launchIncomingCallActivity(String callerName, String callType) {
        Bundle bundle = new Bundle();
        bundle.putString("caller_name", callerName);
        bundle.putString("callerName", callerName);
        bundle.putString("call_type", callType);
        bundle.putString("callType", callType);

        String notificationId = "call_" + System.currentTimeMillis();
        bundle.putString("notification_id", notificationId);
        bundle.putString("notificationId", notificationId);

        startIncomingCall(bundle);
    }

    public static void sendIncomingCallEvent(Bundle payload) {
        Log.d(TAG, "Received payload for JS emission: " + payload.keySet());
        storePayload(payload);
    }

    private static void attachReactContext(ReactApplicationContext context) {
        synchronized (IncomingCallModule.class) {
            reactContextRef = context;
            emitIfPossible();
        }
    }

    private static void detachReactContext(ReactApplicationContext context) {
        synchronized (IncomingCallModule.class) {
            if (reactContextRef == context) {
                reactContextRef = null;
            }
        }
    }

    private static void storePayload(Bundle payload) {
        synchronized (IncomingCallModule.class) {
            pendingPayload = new Bundle(payload);
            emitIfPossible();
        }
    }

    private static void emitIfPossible() {
        final ReactApplicationContext context;
        final Bundle payload;

        synchronized (IncomingCallModule.class) {
            context = reactContextRef;
            payload = pendingPayload != null ? new Bundle(pendingPayload) : null;
            if (context == null || payload == null) {
                return;
            }
        }

        if (!context.hasActiveCatalystInstance()) {
            Log.d(TAG, "React context not ready, keeping pending payload");
            return;
        }

        pendingPayload = null;

        final Bundle payloadCopy = new Bundle(payload);
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("incomingCallShow", Arguments.fromBundle(payloadCopy));
                Log.d(TAG, "Emitted incomingCallShow event to JS");
            } catch (Exception sendError) {
                Log.e(TAG, "Failed emitting incomingCallShow, storing payload", sendError);
                synchronized (IncomingCallModule.class) {
                    pendingPayload = new Bundle(payloadCopy);
                }
            }
        });
    }

    private void startIncomingCall(Bundle bundle) {
        try {
            Log.d(TAG, "Starting IncomingCallService with payload keys: " + bundle.keySet());
            IncomingCallService.start(getReactApplicationContext(), bundle);
            Log.d(TAG, "IncomingCallService started successfully");
        } catch (Exception error) {
            Log.e(TAG, "Failed to start IncomingCallService", error);
        }
    }

    @Nullable
    private String extractString(ReadableMap map, String... keys) {
        if (map == null) {
            return null;
        }

        for (String key : keys) {
            if (map.hasKey(key) && !map.isNull(key)) {
                return map.getString(key);
            }
        }
        return null;
    }
}
