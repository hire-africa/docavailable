<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Appointment Cancelled</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f44336; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .appointment-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f44336; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Appointment Cancelled</h1>
        </div>
        
        <div class="content">
            <p>Dear {{ $patient->first_name }} {{ $patient->last_name }},</p>
            
            <p>Your appointment has been cancelled.</p>
            
            <div class="appointment-details">
                <h3>Cancelled Appointment Details:</h3>
                <p><strong>Doctor:</strong> Dr. {{ $doctor->first_name }} {{ $doctor->last_name }}</p>
                <p><strong>Date:</strong> {{ \Carbon\Carbon::parse($appointment->appointment_date)->format('l, F j, Y') }}</p>
                <p><strong>Time:</strong> {{ \Carbon\Carbon::parse($appointment->appointment_time)->format('g:i A') }}</p>
                <p><strong>Status:</strong> Cancelled</p>
            </div>
            
            <p>You can book a new appointment at any time through our platform.</p>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <p>Best regards,<br>
            The Doc Available Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html> 