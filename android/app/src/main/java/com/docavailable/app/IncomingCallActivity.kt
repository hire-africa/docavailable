package com.docavailable.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import android.view.View
import android.widget.TextView
import android.widget.Button
import android.widget.ImageView
import android.media.RingtoneManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Handler
import android.os.Looper

class IncomingCallActivity : Activity() {
    private var mediaPlayer: MediaPlayer? = null
    private var handler: Handler? = null
    private var timeoutRunnable: Runnable? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Show over lock screen and wake screen
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )
        
        // Simple layout programmatically to avoid resource issues
        createCallLayout()
        
        // Start ringing
        startRinging()
        
        // Auto-dismiss after 30 seconds
        setupTimeout()
    }
    
    private fun createCallLayout() {
        // Create layout programmatically to avoid XML resource issues
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setBackgroundColor(0xFF2196F3.toInt()) // Blue background
            setPadding(40, 40, 40, 40)
        }
        
        // Caller name
        val callerName = intent.getStringExtra("callerName") ?: "Unknown"
        val nameView = TextView(this).apply {
            text = "Incoming Call"
            textSize = 24f
            setTextColor(0xFFFFFFFF.toInt())
            gravity = android.view.Gravity.CENTER
            setPadding(0, 0, 0, 20)
        }
        
        val callerView = TextView(this).apply {
            text = callerName
            textSize = 18f
            setTextColor(0xFFFFFFFF.toInt())
            gravity = android.view.Gravity.CENTER
            setPadding(0, 0, 0, 40)
        }
        
        // Answer button
        val answerButton = Button(this).apply {
            text = "Answer"
            setBackgroundColor(0xFF4CAF50.toInt()) // Green
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 18f
            setPadding(20, 20, 20, 20)
            setOnClickListener {
                answerCall()
            }
        }
        
        // Decline button
        val declineButton = Button(this).apply {
            text = "Decline"
            setBackgroundColor(0xFFF44336.toInt()) // Red
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 18f
            setPadding(20, 20, 20, 20)
            setOnClickListener {
                declineCall()
            }
        }
        
        // Add views to layout
        layout.addView(nameView)
        layout.addView(callerView)
        layout.addView(answerButton)
        layout.addView(declineButton)
        
        setContentView(layout)
    }
    
    private fun startRinging() {
        try {
            val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            mediaPlayer = MediaPlayer().apply {
                setDataSource(this@IncomingCallActivity, ringtoneUri)
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    private fun stopRinging() {
        mediaPlayer?.apply {
            if (isPlaying) {
                stop()
            }
            release()
        }
        mediaPlayer = null
    }
    
    private fun setupTimeout() {
        handler = Handler(Looper.getMainLooper())
        timeoutRunnable = Runnable {
            finish()
        }
        handler?.postDelayed(timeoutRunnable!!, 30000) // 30 seconds
    }
    
    private fun answerCall() {
        stopRinging()
        handler?.removeCallbacks(timeoutRunnable!!)
        
        // Get call data from intent
        val sessionId = intent.getStringExtra("sessionId") ?: ""
        val doctorId = intent.getStringExtra("doctorId") ?: ""
        val doctorName = intent.getStringExtra("callerName") ?: ""
        val callType = intent.getStringExtra("callType") ?: "audio"
        
        // Launch MainActivity with call data
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("sessionId", sessionId)
            putExtra("doctorId", doctorId)
            putExtra("doctorName", doctorName)
            putExtra("callType", callType)
            putExtra("isIncomingCall", true)
            putExtra("answeredFromNative", true)
        }
        startActivity(intent)
        
        finish()
    }
    
    private fun declineCall() {
        stopRinging()
        handler?.removeCallbacks(timeoutRunnable!!)
        finish()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopRinging()
        handler?.removeCallbacks(timeoutRunnable!!)
    }
}
