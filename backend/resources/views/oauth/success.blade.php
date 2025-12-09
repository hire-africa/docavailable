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
        
        // For WebView integration, we'll use postMessage to communicate with the parent
        try {
            // Store the OAuth data in localStorage for the app to pick up
            const oauthData = {
                code: code,
                state: state,
                timestamp: Date.now()
            };
            
            // Try to store in localStorage (for web)
            if (typeof(Storage) !== "undefined") {
                localStorage.setItem('oauth_callback', JSON.stringify(oauthData));
            }
            
            // Try to communicate with the parent WebView
            if (window.ReactNativeWebView) {
                // We're in a React Native WebView
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'oauth_callback',
                    code: code,
                    state: state
                }));
            } else if (window.parent && window.parent !== window) {
                // We're in an iframe or similar
                window.parent.postMessage({
                    type: 'oauth_callback',
                    code: code,
                    state: state
                }, '*');
            }
            
            // Update the UI to show success
            document.querySelector('p').innerHTML = `
                <strong>Authentication Complete!</strong><br>
                You have successfully authenticated with Google.<br>
                <small>Returning to the app...</small>
            `;
            
            // Hide the loading spinner
            document.querySelector('.loading').style.display = 'none';
            
        } catch (error) {
            document.getElementById('error').style.display = 'block';
            document.getElementById('error-message').textContent = 'Authentication successful. Please return to the app.';
        }
    </script>
</body>
</html>
