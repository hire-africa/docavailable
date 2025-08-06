<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Appointment Booked Successfully</title>
</head>
<body>
    <h2>Appointment Booked Successfully</h2>
    
    <p>Hello {{ $patient->first_name }} {{ $patient->last_name }},</p>
    
    <p>Your appointment has been booked successfully:</p>
    
    <div style="background-color: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px;">
        <h3>Appointment Details:</h3>
        <p><strong>Doctor:</strong> Dr. {{ $doctor->first_name }} {{ $doctor->last_name }}</p>
        <p><strong>Date:</strong> {{ $appointment->appointment_date }}</p>
        <p><strong>Time:</strong> {{ $appointment->appointment_time }}</p>
        <p><strong>Status:</strong> {{ $appointment->status == 0 ? 'Pending' : 'Confirmed' }}</p>
    </div>
    
    <p>You will receive a confirmation once the doctor reviews your appointment.</p>
    
    <p>Best regards,<br>
    Doc Available Team</p>
</body>
</html> 