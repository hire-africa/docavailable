package com.docavailable.app

import android.content.Intent
import android.util.Log
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService

class DocAvailableMessagingService : ReactNativeFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    super.onMessageReceived(remoteMessage)

    val data = remoteMessage.data
    if (data.isNullOrEmpty()) {
      Log.d(TAG, "Remote message missing data payload")
      return
    }

    val isIncomingCall = data["type"] == "incoming_call" || data["isIncomingCall"] == "true"
    if (!isIncomingCall) {
      Log.d(TAG, "Message is not an incoming call: $data")
      return
    }

    val sessionId = data["appointment_id"] ?: data["appointmentId"] ?: ""
    val doctorId = data["doctor_id"] ?: data["doctorId"] ?: ""
    val doctorName = data["doctor_name"] ?: data["doctorName"] ?: data["caller"] ?: "Unknown"
    val callType = data["call_type"] ?: data["callType"] ?: "audio"

    Log.d(TAG, "Incoming call FCM received: session=$sessionId, doctor=$doctorName")

    val intent = Intent(applicationContext, IncomingCallActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      putExtra("sessionId", sessionId)
      putExtra("doctorId", doctorId)
      putExtra("callerName", doctorName)
      putExtra("callType", callType)
      putExtra("isIncomingCall", true)
      putExtra("answeredFromNative", false)
    }

    try {
      startActivity(intent)
      Log.d(TAG, "Launched IncomingCallActivity from FCM service")
    } catch (error: Exception) {
      Log.e(TAG, "Failed to launch IncomingCallActivity", error)
    }
  }

  companion object {
    private const val TAG = "DocAvailableMessaging"
  }
}
