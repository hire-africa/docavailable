import * as AuthSession from 'expo-auth-session';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { GOOGLE_API_ENDPOINTS, GOOGLE_OAUTH_CONFIG } from '../config/googleOAuth';
import authService from '../services/authService';

export default function OAuthCallback() {
    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                // Get the OAuth code from the URL parameters
                const url = new URL(window.location.href);
                const code = url.searchParams.get('code');
                const error = url.searchParams.get('error');

                if (error) {
                    Alert.alert('OAuth Error', `Authentication failed: ${error}`);
                    router.replace('/login');
                    return;
                }

                if (!code) {
                    Alert.alert('OAuth Error', 'No authorization code received');
                    router.replace('/login');
                    return;
                }

                console.log('Processing OAuth code:', code.substring(0, 20) + '...');

                // Exchange authorization code for tokens
                const tokenResponse = await AuthSession.exchangeCodeAsync(
                    {
                        clientId: GOOGLE_OAUTH_CONFIG.clientId,
                        clientSecret: GOOGLE_OAUTH_CONFIG.clientSecret,
                        code: code,
                        redirectUri: 'https://docavailable-3vbdv.ondigitalocean.app/oauth-redirect.html',
                        extraParams: {
                            access_type: 'offline',
                        },
                    },
                    GOOGLE_OAUTH_CONFIG.discovery
                );

                // Get user info from Google
                const userInfoResponse = await fetch(
                    `${GOOGLE_API_ENDPOINTS.userInfo}?access_token=${tokenResponse.accessToken}`
                );
                
                if (!userInfoResponse.ok) {
                    throw new Error('Failed to fetch user info from Google');
                }
                
                const userInfo = await userInfoResponse.json();

                // Create a JWT-like token for your backend
                const googleToken = {
                    sub: userInfo.id,
                    email: userInfo.email,
                    name: userInfo.name,
                    given_name: userInfo.given_name,
                    family_name: userInfo.family_name,
                    picture: userInfo.picture,
                };

                // Send to your backend
                const authState = await authService.signInWithGoogle(JSON.stringify(googleToken));
                
                if (authState.success && authState.data.user) {
                    const user = authState.data.user;
                    
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
                } else {
                    Alert.alert('Login Failed', 'Google authentication failed.');
                    await authService.signOut();
                    router.replace('/login');
                }
            } catch (error: any) {
                console.error('OAuth callback error:', error);
                Alert.alert('Authentication Error', 'Failed to process Google authentication. Please try again.');
                router.replace('/login');
            }
        };

        handleOAuthCallback();
    }, []);

    return null; // This component doesn't render anything
}
