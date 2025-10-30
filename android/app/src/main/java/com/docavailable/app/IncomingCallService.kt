package com.docavailable.app

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat

class IncomingCallService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null

    companion object {
        private const val NOTIFICATION_ID = 9999
        private const val CHANNEL_ID = "incoming_call_service"

        fun start(context: Context, callerName: String, callType: String) {
            val bundle = Bundle().apply {
                putString("caller_name", callerName)
                putString("callerName", callerName)
                putString("call_type", callType)
                putString("callType", callType)
                putString("notification_id", "call_${System.currentTimeMillis()}")
                putString("notificationId", "call_${System.currentTimeMillis()}")
            }
            start(context, bundle)
        }

        fun start(context: Context, payload: Bundle) {
            val intent = Intent(context, IncomingCallService::class.java).apply {
                replaceExtras(payload)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.d("IncomingCallService", "Service created")
        acquireWakeLock()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val payload = intent?.extras?.let { Bundle(it) } ?: Bundle()

        val callerName = payload.getString("caller_name")
            ?: payload.getString("callerName")
            ?: "Unknown"
        val callType = payload.getString("call_type")
            ?: payload.getString("callType")
            ?: "audio"

        payload.putString("caller_name", callerName)
        payload.putString("callerName", callerName)
        payload.putString("call_type", callType)
        payload.putString("callType", callType)

        Log.d("IncomingCallService", "Service started with payload keys: ${payload.keySet()}")

        startForeground(NOTIFICATION_ID, createServiceNotification(payload))

        IncomingCallModule.sendIncomingCallEvent(payload)

        android.os.Handler(mainLooper).postDelayed({
            IncomingCallModule.sendIncomingCallEvent(payload)
            stopSelfAndRelease()
        }, 30000)

        return START_NOT_STICKY
    }

    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "docavailable:IncomingCallServiceWakeLock"
            )
            wakeLock?.acquire(30000)
            Log.d("IncomingCallService", "WakeLock acquired - screen should wake!")
        } catch (e: Exception) {
            Log.e("IncomingCallService", "Failed to acquire wake lock", e)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Incoming Call Service",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Handles incoming calls when app is in background"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createServiceNotification(payload: Bundle): Notification {
        val callerName = payload.getString("caller_name") ?: "Unknown"
        val callType = payload.getString("call_type") ?: "audio"

        val intent = Intent(this, IncomingCallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            replaceExtras(payload)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Incoming Call")
            .setContentText("$callerName is calling...")
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(pendingIntent, true)
            .setContentIntent(pendingIntent)
            .addAction(0, "Answer", pendingIntent)
            .setSubText(callType.uppercase())
            .build()
    }

    private fun stopSelfAndRelease() {
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    Log.d("IncomingCallService", "WakeLock released")
                }
            }
            wakeLock = null
        } catch (e: Exception) {
            Log.e("IncomingCallService", "Error releasing wake lock", e)
        }

        stopForeground(true)
        stopSelf()
        Log.d("IncomingCallService", "Service stopped")
    }

    override fun onDestroy() {
        super.onDestroy()
        stopSelfAndRelease()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
