package com.docavailable.app

import android.os.Bundle
import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class IncomingCallMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        if (data.isNullOrEmpty()) {
            Log.d("IncomingCallMessaging", "Message received with no data payload")
            return
        }

        val rawType = data["type"] ?: data["event"]
        if (rawType?.equals("incoming_call", ignoreCase = true) != true) {
            Log.d("IncomingCallMessaging", "Ignoring message of type=$rawType")
            return
        }

        val callerName = data["doctor_name"]
            ?: data["doctorName"]
            ?: data["caller_name"]
            ?: data["callerName"]
            ?: "Unknown"

        val callType = data["call_type"]
            ?: data["callType"]
            ?: "audio"

        val appointmentId = data["appointment_id"] ?: data["appointmentId"]
        val notificationId = data["notification_id"]
            ?: data["notificationId"]
            ?: data["id"]
            ?: "call_${System.currentTimeMillis()}"

        val payload = Bundle().apply {
            putString("type", "incoming_call")
            putString("caller_name", callerName)
            putString("callerName", callerName)
            putString("call_type", callType)
            putString("callType", callType)
            putString("notification_id", notificationId)
            putString("notificationId", notificationId)
            appointmentId?.let {
                putString("appointment_id", it)
                putString("appointmentId", it)
            }
            data["doctor_profile_picture"]?.let {
                putString("doctor_profile_picture", it)
                putString("doctorProfilePicture", it)
            }
        }

        Log.d(
            "IncomingCallMessaging",
            "incoming_call push received; starting service with keys=${payload.keySet()}"
        )

        try {
            IncomingCallService.start(applicationContext, payload)
        } catch (error: Exception) {
            Log.e("IncomingCallMessaging", "Failed to start IncomingCallService", error)
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d("IncomingCallMessaging", "FCM token refreshed: $token")
        // Token sync handled elsewhere; this log is for diagnostics only.
    }
}
