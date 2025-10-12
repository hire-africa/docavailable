<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OAuth Success - DocAvailable</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        .success-icon {
            font-size: 48px;
            color: #4CAF50;
            margin-bottom: 20px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 24px;
        }
        p {
            color: #666;
            margin-bottom: 30px;
            line-height: 1.5;
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .error {
            color: #f44336;
            background: #ffebee;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✅</div>
        <h1>Authentication Successful!</h1>
        <p>You have successfully authenticated with Google. Redirecting you back to the app...</p>
        <div class="loading"></div>
        
        <div id="error" class="error" style="display: none;">
            <strong>Error:</strong> <span id="error-message"></span>
        </div>
    </div>

    <script>
        // Get the authorization code from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state') || '';
        
        if (!code) {
            document.getElementById('error').style.display = 'block';
            document.getElementById('error-message').textContent = 'No authorization code received';
            return;
        }
        
        // Try to redirect back to the mobile app
        try {
            // For mobile apps, try to open the app with the code
            const appScheme = 'com.docavailable.app';
            const redirectUrl = `${appScheme}://oauth2redirect?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
            
            // Try to open the app
            window.location.href = redirectUrl;
            
            // Fallback: if the app doesn't open, show instructions
            setTimeout(() => {
                document.querySelector('p').innerHTML = `
                    <strong>Redirecting to mobile app...</strong><br>
                    If the app doesn't open automatically, please return to the DocAvailable app.
                `;
            }, 2000);
            
        } catch (error) {
            document.getElementById('error').style.display = 'block';
            document.getElementById('error-message').textContent = 'Failed to redirect to mobile app: ' + error.message;
        }
    </script>
</body>
</html>
