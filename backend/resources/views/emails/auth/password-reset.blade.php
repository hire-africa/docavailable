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
        .reset-button {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            transition: background-color 0.3s;
        }
        .reset-button:hover {
            background-color: #45a049;
        }
        .reset-link {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #4CAF50;
            margin: 20px 0;
            word-break: break-all;
            font-family: monospace;
            font-size: 14px;
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
            
            <p>We received a request to reset your password for your DocAvailable account. If you made this request, click the button below to reset your password:</p>

            <div style="text-align: center;">
                <a href="{{ $resetUrl }}" class="reset-button">Reset My Password</a>
            </div>

            <div class="user-info">
                <strong>Account Details:</strong><br>
                Email: {{ $user->email }}<br>
                User Type: {{ ucfirst($user->user_type) }}<br>
                Requested: {{ now()->format('F j, Y \a\t g:i A') }}
            </div>

            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <div class="reset-link">{{ $resetUrl }}</div>

            <div class="security-note">
                <strong>🔒 Security Note:</strong><br>
                • This link will expire in 60 minutes<br>
                • This link can only be used once<br>
                • If you didn't request this reset, please ignore this email<br>
                • Your password will remain unchanged until you create a new one
            </div>

            <p>If you're having trouble with the link above, you can also reset your password by:</p>
            <ul>
                <li>Opening the DocAvailable app</li>
                <li>Going to the login screen</li>
                <li>Clicking "Forgot Password?"</li>
                <li>Entering your email address again</li>
            </ul>
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
