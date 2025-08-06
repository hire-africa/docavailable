<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Appointment Booking</title>
</head>
<body>
    <h2>New Appointment Booking</h2>
    
    <p>Hello Dr. {{ $doctor->first_name }} {{ $doctor->last_name }},</p>
    
    <p>You have received a new appointment booking:</p>
    
    <div style="background-color: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px;">
        <h3>Appointment Details:</h3>
        <p><strong>Patient:</strong> {{ $patient->first_name }} {{ $patient->last_name }}</p>
        <p><strong>Date:</strong> {{ $appointment->appointment_date }}</p>
        <p><strong>Time:</strong> {{ $appointment->appointment_time }}</p>
        <p><strong>Status:</strong> {{ $appointment->status == 0 ? 'Pending' : 'Confirmed' }}</p>
    </div>
    
    <p>Please review and confirm this appointment at your earliest convenience.</p>
    
    <p>Best regards,<br>
    Doc Available Team</p>
</body>
</html> 