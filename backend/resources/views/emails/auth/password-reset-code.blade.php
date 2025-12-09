<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - DocAvailable</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #4CAF50;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            color: #333;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .code-container {
            background-color: #f8f9fa;
            border: 2px solid #4CAF50;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .code {
            font-size: 36px;
            font-weight: bold;
            color: #4CAF50;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
        }
        .code-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
        .instructions {
            background-color: #e8f5e9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .instructions h3 {
            color: #4CAF50;
            margin-top: 0;
        }
        .instructions ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .instructions li {
            margin-bottom: 8px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
        }
        .security-note {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .user-info {
            background-color: #e8f5e9;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .timer {
            background-color: #ffebee;
            border: 1px solid #f44336;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            color: #c62828;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏥 DocAvailable</div>
            <h1 class="title">Reset Your Password</h1>
        </div>

        <div class="content">
            <p>Hello <strong>{{ $user->first_name ?? 'User' }}</strong>,</p>
            
            <p>We received a request to reset your password for your DocAvailable account. Use the verification code below to reset your password:</p>

            <div class="code-container">
                <div class="code-label">Your verification code is:</div>
                <div class="code">{{ $code }}</div>
                <div class="code-label">Enter this code in the app to continue</div>
            </div>

            <div class="instructions">
                <h3>📱 How to reset your password:</h3>
                <ol>
                    <li>Open the DocAvailable app</li>
                    <li>Go to the login screen</li>
                    <li>Click "Forgot Password?"</li>
                    <li>Enter your email address</li>
                    <li>Enter the verification code above</li>
                    <li>Create your new password</li>
                </ol>
            </div>

            <div class="user-info">
                <strong>Account Details:</strong><br>
                Email: {{ $user->email }}<br>
                User Type: {{ ucfirst($user->user_type) }}<br>
                Requested: {{ now()->format('F j, Y \a\t g:i A') }}
            </div>

            <div class="timer">
                <strong>⏰ Code Expires in 10 Minutes</strong><br>
                If you don't use this code within 10 minutes, you'll need to request a new one.
            </div>

            <div class="security-note">
                <strong>🔒 Security Note:</strong><br>
                • This code can only be used once<br>
                • Never share this code with anyone<br>
                • If you didn't request this reset, please ignore this email<br>
                • Your password will remain unchanged until you create a new one
            </div>

            <p>If you're having trouble with the code above, you can request a new one by going through the forgot password process again in the app.</p>
        </div>

        <div class="footer">
            <p><strong>DocAvailable Team</strong></p>
            <p>This email was sent to {{ $user->email }}</p>
            <p>If you have any questions, please contact our support team.</p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
                © {{ date('Y') }} DocAvailable. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
