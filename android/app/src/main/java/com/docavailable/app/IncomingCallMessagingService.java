package com.docavailable.app;

import android.os.Bundle;
import android.util.Log;

import androidx.annotation.Nullable;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class IncomingCallMessagingService extends FirebaseMessagingService {
    private static final String TAG = "IncomingCallMessaging";

    @Override
    public void onMessageReceived(@Nullable RemoteMessage remoteMessage) {
        if (remoteMessage == null) {
            return;
        }

        Map<String, String> data = remoteMessage.getData();
        if (data == null || data.isEmpty()) {
            Log.d(TAG, "Message received with no data payload");
            return;
        }

        String rawType = getFirstNonNull(data, "type", "event");
        if (rawType == null || !"incoming_call".equalsIgnoreCase(rawType)) {
            Log.d(TAG, "Ignoring message of type=" + rawType);
            return;
        }

        String callerName = getFirstNonNull(data, "doctor_name", "doctorName", "caller_name", "callerName");
        if (callerName == null) {
            callerName = "Unknown";
        }

        String callType = getFirstNonNull(data, "call_type", "callType");
        if (callType == null) {
            callType = "audio";
        }

        String appointmentId = getFirstNonNull(data, "appointment_id", "appointmentId");
        String notificationId = getFirstNonNull(data, "notification_id", "notificationId", "id");
        if (notificationId == null) {
            notificationId = "call_" + System.currentTimeMillis();
        }

        Bundle payload = new Bundle();
        payload.putString("type", "incoming_call");
        payload.putString("caller_name", callerName);
        payload.putString("callerName", callerName);
        payload.putString("call_type", callType);
        payload.putString("callType", callType);
        payload.putString("notification_id", notificationId);
        payload.putString("notificationId", notificationId);

        if (appointmentId != null) {
            payload.putString("appointment_id", appointmentId);
            payload.putString("appointmentId", appointmentId);
        }

        String doctorProfilePicture = data.get("doctor_profile_picture");
        if (doctorProfilePicture != null) {
            payload.putString("doctor_profile_picture", doctorProfilePicture);
            payload.putString("doctorProfilePicture", doctorProfilePicture);
        }

        Log.d(TAG, "incoming_call push received; starting service with keys=" + payload.keySet());

        try {
            IncomingCallService.start(getApplicationContext(), payload);
        } catch (Exception error) {
            Log.e(TAG, "Failed to start IncomingCallService", error);
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "FCM token refreshed: " + token);
    }

    @Nullable
    private String getFirstNonNull(Map<String, String> map, String... keys) {
        for (String key : keys) {
            String value = map.get(key);
            if (value != null) {
                return value;
            }
        }
        return null;
    }
}
