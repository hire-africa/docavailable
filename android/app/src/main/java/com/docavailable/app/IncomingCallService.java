package com.docavailable.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class IncomingCallService extends Service {
    private static final String TAG = "IncomingCallService";
    private static final int NOTIFICATION_ID = 9999;
    private static final String CHANNEL_ID = "incoming_call_service";

    @Nullable
    private PowerManager.WakeLock wakeLock;

    public static void start(Context context, String callerName, String callType) {
        Bundle bundle = new Bundle();
        bundle.putString("caller_name", callerName);
        bundle.putString("callerName", callerName);
        bundle.putString("call_type", callType);
        bundle.putString("callType", callType);

        String notificationId = "call_" + System.currentTimeMillis();
        bundle.putString("notification_id", notificationId);
        bundle.putString("notificationId", notificationId);

        start(context, bundle);
    }

    public static void start(Context context, Bundle payload) {
        Intent intent = new Intent(context, IncomingCallService.class);
        intent.replaceExtras(payload);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service created");
        acquireWakeLock();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        Bundle payload = intent != null && intent.getExtras() != null
            ? new Bundle(intent.getExtras())
            : new Bundle();

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

        Log.d(TAG, "Service started with payload keys: " + payload.keySet());

        startForeground(NOTIFICATION_ID, createServiceNotification(payload));

        IncomingCallModule.sendIncomingCallEvent(payload);

        Handler handler = new Handler(Looper.getMainLooper());
        handler.postDelayed(() -> {
            IncomingCallModule.sendIncomingCallEvent(payload);
            stopSelfAndRelease();
        }, 30000);

        return START_NOT_STICKY;
    }

    private void acquireWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK
                        | PowerManager.ACQUIRE_CAUSES_WAKEUP
                        | PowerManager.ON_AFTER_RELEASE,
                    "docavailable:IncomingCallServiceWakeLock"
                );
                wakeLock.acquire(30000);
                Log.d(TAG, "WakeLock acquired - screen should wake!");
            }
        } catch (Exception error) {
            Log.e(TAG, "Failed to acquire wake lock", error);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Incoming Call Service",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Handles incoming calls when app is in background");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createServiceNotification(Bundle payload) {
        String callerName = payload.getString("caller_name", "Unknown");
        String callType = payload.getString("call_type", "audio");

        Intent intent = new Intent(this, IncomingCallActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.replaceExtras(payload);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Incoming Call")
            .setContentText(callerName + " is calling...")
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(pendingIntent, true)
            .setContentIntent(pendingIntent)
            .addAction(0, "Answer", pendingIntent)
            .setSubText(callType.toUpperCase())
            .build();
    }

    private void stopSelfAndRelease() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                Log.d(TAG, "WakeLock released");
            }
        } catch (Exception error) {
            Log.e(TAG, "Error releasing wake lock", error);
        } finally {
            wakeLock = null;
        }

        stopForeground(true);
        stopSelf();
        Log.d(TAG, "Service stopped");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopSelfAndRelease();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
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
