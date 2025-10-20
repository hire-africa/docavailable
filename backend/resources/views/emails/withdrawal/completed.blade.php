<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Withdrawal Completed</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #4CAF50, #45a049); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
            border-radius: 10px 10px 0 0;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content { 
            padding: 30px 20px; 
            background: #f9f9f9; 
        }
        .amount { 
            font-size: 28px; 
            font-weight: bold; 
            color: #4CAF50; 
            text-align: center;
            margin: 20px 0;
        }
        .details { 
            background: white; 
            padding: 25px; 
            margin: 20px 0; 
            border-radius: 8px; 
            border-left: 4px solid #4CAF50;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .details h3 {
            margin-top: 0;
            color: #333;
            font-size: 18px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: bold;
            color: #666;
        }
        .detail-value {
            color: #333;
        }
        .footer { 
            text-align: center; 
            padding: 20px; 
            color: #666; 
            background: #f8f8f8;
            border-radius: 0 0 10px 10px;
        }
        .success-icon {
            font-size: 48px;
            color: #4CAF50;
            margin-bottom: 10px;
        }
        .cta-button {
            display: inline-block;
            background: #4CAF50;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .cta-button:hover {
            background: #45a049;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">✓</div>
            <h1>Withdrawal Request Completed</h1>
        </div>
        
        <div class="content">
            <p>Hello Dr. {{ $doctorName }},</p>
            
            <p>Great news! Your withdrawal request has been successfully completed and processed.</p>
            
            <div class="amount">${{ number_format($amount, 2) }}</div>
            
            <div class="details">
                <h3>Withdrawal Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Amount:</span>
                    <span class="detail-value">${{ number_format($amount, 2) }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment Method:</span>
                    <span class="detail-value">{{ ucfirst(str_replace('_', ' ', $paymentMethod)) }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Bank Name:</span>
                    <span class="detail-value">{{ $bankName }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Account Holder:</span>
                    <span class="detail-value">{{ $accountHolderName }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Completed At:</span>
                    <span class="detail-value">{{ \Carbon\Carbon::parse($completedAt)->format('F j, Y \a\t g:i A') }}</span>
                </div>
            </div>
            
            <p><strong>What happens next?</strong></p>
            <p>The funds have been processed and should appear in your account within 1-3 business days, depending on your bank's processing time.</p>
            
            <p>You can track your withdrawal history and view your current wallet balance in your doctor dashboard.</p>
            
            <div style="text-align: center;">
                <a href="{{ config('app.frontend_url', 'https://docavailable.com') }}/doctor-dashboard" class="cta-button">View Dashboard</a>
            </div>
            
            <p>If you have any questions or concerns about this withdrawal, please don't hesitate to contact our support team.</p>
        </div>
        
        <div class="footer">
            <p><strong>Thank you for using {{ $appName }}!</strong></p>
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>For support, contact us at support@docavailable.com</p>
        </div>
    </div>
</body>
</html>
