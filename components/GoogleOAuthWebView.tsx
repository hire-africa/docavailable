import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { GOOGLE_OAUTH_CONFIG, GOOGLE_API_ENDPOINTS, GOOGLE_AUTH_ERRORS } from '@/config/googleOAuth';
import authService from '@/services/authService';
import { router } from 'expo-router';

interface GoogleOAuthWebViewProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function GoogleOAuthWebView({ onClose, onSuccess }: GoogleOAuthWebViewProps) {
    const [loading, setLoading] = useState(false);

    // Build OAuth URL for WebView
    const oauthUrl = `${GOOGLE_OAUTH_CONFIG.discovery.authorizationEndpoint}?` +
        `client_id=${encodeURIComponent(GOOGLE_OAUTH_CONFIG.clientId)}&` +
        `redirect_uri=${encodeURIComponent('https://docavailable-3vbdv.ondigitalocean.app/oauth-success.html')}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(GOOGLE_OAUTH_CONFIG.scopes.join(' '))}&` +
        `access_type=offline&` +
        `prompt=select_account`;

    const handleWebViewNavigationStateChange = (navState: any) => {
        const { url } = navState;
        console.log('WebView navigation to:', url);

        // Check if we're on the success page
        if (url.includes('/oauth-success.html')) {
            // Extract the authorization code from URL
            const urlParams = new URLSearchParams(url.split('?')[1]);
            const code = urlParams.get('code');
            const error = urlParams.get('error');

            if (error) {
                console.error('OAuth error:', error);
                Alert.alert(
                    'OAuth Error',
                    `Error: ${error}\nDescription: ${urlParams.get('error_description') || 'Unknown error'}`,
                    [{ text: 'OK', onPress: onClose }]
                );
                return;
            }

            if (code) {
                console.log('OAuth code received:', code.substring(0, 20) + '...');
                processOAuthCode(code);
            }
        }
    };

    const processOAuthCode = async (code: string) => {
        try {
            setLoading(true);
            console.log('Processing OAuth code...');

            // Exchange code for tokens
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: GOOGLE_OAUTH_CONFIG.clientId,
                    client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
                    code: code,
                    grant_type: 'authorization_code',
                    redirect_uri: 'https://docavailable-3vbdv.ondigitalocean.app/oauth-success.html',
                }),
            });

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json();
                throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
            }

            const tokenData = await tokenResponse.json();
            console.log('Token exchange successful');

            // Get user info
            const userInfoResponse = await fetch(
                `${GOOGLE_API_ENDPOINTS.userInfo}?access_token=${tokenData.access_token}`
            );

            if (!userInfoResponse.ok) {
                throw new Error(GOOGLE_AUTH_ERRORS.USER_INFO_FAILED);
            }

            const userInfo = await userInfoResponse.json();
            console.log('User info retrieved:', userInfo.email);

            // Create Google token for backend
            const googleToken = {
                sub: userInfo.id,
                email: userInfo.email,
                name: userInfo.name,
                given_name: userInfo.given_name,
                family_name: userInfo.family_name,
                picture: userInfo.picture,
            };

            // Sign in with Google
            const authState = await authService.signInWithGoogle(JSON.stringify(googleToken));

            if (authState.success && authState.data.user) {
                const user = authState.data.user;
                console.log('Google sign-in successful for user:', user.email);

                // Navigate based on user type
                if (user.user_type === 'admin') {
                    router.replace('/admin-dashboard');
                } else if (user.user_type === 'doctor') {
                    if (user.status === 'pending') {
                        Alert.alert('Account Pending', 'Your account is awaiting admin approval.');
                        await authService.signOut();
                        return;
                    }
                    if (user.status === 'suspended') {
                        Alert.alert('Account Suspended', 'Your account has been suspended. Please contact support.');
                        await authService.signOut();
                        return;
                    }
                    router.replace('/doctor-dashboard');
                } else if (user.user_type === 'patient') {
                    router.replace('/patient-dashboard');
                } else {
                    router.replace('/');
                }
                
                onSuccess();
            } else {
                throw new Error('Google authentication failed');
            }

        } catch (error: any) {
            console.error('OAuth code processing error:', error);
            Alert.alert(
                'Authentication Error',
                `Failed to process Google authentication: ${error.message}`,
                [{ text: 'OK', onPress: onClose }]
            );
        } finally {
            setLoading(false);
        }
    };

    const handleWebViewError = (error: any) => {
        console.error('WebView error:', error);
        Alert.alert(
            'WebView Error',
            'Failed to load OAuth page. Please check your internet connection and try again.',
            [{ text: 'OK', onPress: onClose }]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                >
                    <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Google Sign-In</Text>
            </View>
            
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Processing authentication...</Text>
                </View>
            )}
            
            <WebView
                source={{ uri: oauthUrl }}
                onNavigationStateChange={handleWebViewNavigationStateChange}
                onError={handleWebViewError}
                style={styles.webView}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4CAF50" />
                        <Text style={styles.loadingText}>Loading Google Sign-In...</Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#f8f9fa',
    },
    closeButton: {
        marginRight: 15,
        padding: 5,
    },
    closeButtonText: {
        fontSize: 18,
        color: '#666',
        fontWeight: 'bold',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    webView: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        zIndex: 1000,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
});
