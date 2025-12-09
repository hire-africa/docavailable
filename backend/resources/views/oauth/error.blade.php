<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OAuth Error - DocAvailable</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
            width: 100%;
        }
        .error-icon {
            font-size: 48px;
            color: #f44336;
            margin-bottom: 20px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 24px;
        }
        p {
            color: #666;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .error-details {
            background: #ffebee;
            border: 1px solid #ffcdd2;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
        }
        .error-code {
            font-weight: bold;
            color: #d32f2f;
            margin-bottom: 5px;
        }
        .error-description {
            color: #666;
            font-size: 14px;
        }
        .retry-button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
        }
        .retry-button:hover {
            background: #5a6fd8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">❌</div>
        <h1>Authentication Error</h1>
        <p>There was a problem with the Google authentication process.</p>
        
        <div class="error-details">
            <div class="error-code">Error: {{ $error }}</div>
            <div class="error-description">{{ $error_description }}</div>
        </div>
        
        <p>Please try signing in again or contact support if the problem persists.</p>
        
        <button class="retry-button" onclick="window.close()">
            Close & Try Again
        </button>
    </div>
</body>
</html>
