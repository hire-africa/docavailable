import * as AuthSession from 'expo-auth-session';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { GOOGLE_OAUTH_CONFIG } from '../config/googleOAuth';
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

                // Get user info from Google People API for additional data
                const peopleApiResponse = await fetch(
                    `https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,birthdays,genders&access_token=${tokenResponse.accessToken}`
                );
                
                if (!peopleApiResponse.ok) {
                    throw new Error('Failed to fetch user info from Google People API');
                }
                
                const peopleData = await peopleApiResponse.json();
                
                // Extract data from People API response
                const names = peopleData.names?.[0] || {};
                const emailAddresses = peopleData.emailAddresses?.[0] || {};
                const birthdays = peopleData.birthdays?.[0] || {};
                const genders = peopleData.genders?.[0] || {};

                // Create a JWT-like token for your backend
                const googleToken = {
                    sub: names.metadata?.source?.id || emailAddresses.metadata?.source?.id,
                    email: emailAddresses.value,
                    name: names.displayName,
                    given_name: names.givenName,
                    family_name: names.familyName,
                    birthday: birthdays.date ? `${birthdays.date.year}-${String(birthdays.date.month).padStart(2, '0')}-${String(birthdays.date.day).padStart(2, '0')}` : null,
                    gender: genders.value?.toLowerCase() || null,
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
