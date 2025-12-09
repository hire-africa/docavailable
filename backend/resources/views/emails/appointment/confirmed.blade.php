<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Appointment Confirmed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .appointment-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2196F3; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Appointment Confirmed</h1>
        </div>
        
        <div class="content">
            <p>Dear {{ $patient->first_name }} {{ $patient->last_name }},</p>
            
            <p>Great news! Your appointment has been confirmed by your doctor.</p>
            
            <div class="appointment-details">
                <h3>Confirmed Appointment Details:</h3>
                <p><strong>Doctor:</strong> Dr. {{ $doctor->first_name }} {{ $doctor->last_name }}</p>
                <p><strong>Date:</strong> {{ \Carbon\Carbon::parse($appointment->appointment_date)->format('l, F j, Y') }}</p>
                <p><strong>Time:</strong> {{ \Carbon\Carbon::parse($appointment->appointment_time)->format('g:i A') }}</p>
                <p><strong>Status:</strong> Confirmed</p>
            </div>
            
            <p>Important reminders:</p>
            <ul>
                <li>Please arrive 10 minutes before your scheduled time</li>
                <li>Bring any relevant medical records or test results</li>
                <li>You can cancel or reschedule up to 24 hours before the appointment</li>
                <li>If you need to cancel, please do so as early as possible</li>
            </ul>
            
            <p>We look forward to seeing you!</p>
            
            <p>Best regards,<br>
            The Doc Available Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html> 