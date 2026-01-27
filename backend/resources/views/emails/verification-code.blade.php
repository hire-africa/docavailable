<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - Doc Available</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .content {
            padding: 40px 30px;
        }

        .verification-code {
            background-color: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }

        .code {
            font-size: 32px;
            font-weight: bold;
            color: #4CAF50;
            letter-spacing: 4px;
            font-family: 'Courier New', monospace;
        }

        .instructions {
            background-color: #e8f5e8;
            border-left: 4px solid #4CAF50;
            padding: 20px;
            margin: 30px 0;
            border-radius: 0 8px 8px 0;
        }

        .instructions h3 {
            margin: 0 0 10px 0;
            color: #2e7d32;
            font-size: 18px;
        }

        .instructions ul {
            margin: 0;
            padding-left: 20px;
        }

        .instructions li {
            margin-bottom: 8px;
        }

        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }

        .footer p {
            margin: 0;
            color: #6c757d;
            font-size: 14px;
        }

        .expiry-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }

        .expiry-notice strong {
            color: #856404;
        }

        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }

            .content,
            .footer {
                padding: 20px;
            }

            .code {
                font-size: 24px;
                letter-spacing: 2px;
            }
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="content">
            <h2 style="color: #2c3e50; margin-top: 0;">Verify Your Email Address</h2>

            <p>Hello,</p>

            <p>Thank you for choosing <strong>Doc Available</strong>. To complete your registration or sign-in process,
                please use the following verification code:</p>

            <div class="verification-code">
                <span class="code">{{ $code }}</span>
            </div>

            <div class="expiry-notice">
                <p>This code is valid for <strong>10 minutes</strong>. For security reasons, do not share this code with
                    anyone.</p>
            </div>

            <div class="instructions">
                <h3>Next Steps:</h3>
                <ul>
                    <li>Enter this code in the app to verify your email.</li>
                    <li>If you didn't request this code, you can safely ignore this email.</li>
                </ul>
            </div>

            <p style="margin-bottom: 0;">Best regards,</p>
            <p style="margin-top: 5px; color: #4CAF50; font-weight: bold;">The Doc Available Team</p>
        </div>

        <div class="footer">
            <p>© {{ date('Y') }} Doc Available. All rights reserved.</p>
            <p>Need help? Contact us at docavailable01@gmail.com</p>
        </div>
    </div>
</body>

</html>