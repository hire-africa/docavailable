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
                        redirectUri: 'https://docavailable1-izk3m.ondigitalocean.app/oauth-redirect.html',
                        extraParams: {
                            access_type: 'offline',
                        },
                    },
                    GOOGLE_OAUTH_CONFIG.discovery
                );

                console.log('🔐 OAuth Callback: Token response:', {
                    hasAccessToken: !!tokenResponse.accessToken,
                    hasIdToken: !!tokenResponse.idToken,
                    scopes: tokenResponse.scopes
                });

                // Get user info from Google People API for additional data
                const peopleApiResponse = await fetch(
                    `https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,birthdays,genders,photos&access_token=${tokenResponse.accessToken}`
                );

                console.log('🔐 OAuth Callback: People API response status:', peopleApiResponse.status);

                if (!peopleApiResponse.ok) {
                    const errorText = await peopleApiResponse.text();
                    console.error('🔐 OAuth Callback: People API error:', errorText);
                    console.log('🔐 OAuth Callback: Falling back to basic userinfo API');

                    // Fallback to basic userinfo API
                    const userInfoResponse = await fetch(
                        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenResponse.accessToken}`
                    );

                    if (!userInfoResponse.ok) {
                        throw new Error('Failed to fetch user info from both People API and userinfo API');
                    }

                    const userInfo = await userInfoResponse.json();
                    console.log('🔐 OAuth Callback: Fallback userinfo data:', userInfo);

                    // Create a JWT-like token for your backend with basic info only
                    const googleToken = {
                        sub: userInfo.id,
                        email: userInfo.email,
                        name: userInfo.name,
                        given_name: userInfo.given_name,
                        family_name: userInfo.family_name,
                        birthday: null, // Not available from basic API
                        gender: null,  // Not available from basic API
                        picture: userInfo.picture || null,
                    };

                    console.log('🔐 OAuth Callback: Fallback Google token:', googleToken);

                    // Send to your backend
                    const authState = await authService.signInWithGoogle(JSON.stringify(googleToken));

                    if (authState.success && authState.data.user) {
                        const user = authState.data.user;

                        if (user.user_type === 'admin') {
                            router.replace('/admin-dashboard');
                        } else if (user.user_type === 'doctor') {
                            router.replace('/doctor-dashboard');
                        } else {
                            router.replace('/patient-dashboard');
                        }
                    } else {
                        throw new Error('Authentication failed');
                    }
                    return;
                }

                const peopleData = await peopleApiResponse.json();
                console.log('🔐 OAuth Callback: People API data:', peopleData);

                // Extract data from People API response
                const names = peopleData.names?.[0] || {};
                const emailAddresses = peopleData.emailAddresses?.[0] || {};
                const birthdays = peopleData.birthdays?.[0] || {};
                const genders = peopleData.genders?.[0] || {};
                const photos = peopleData.photos?.[0] || {};

                console.log('🔐 OAuth Callback: Extracted data:', {
                    names: names,
                    emailAddresses: emailAddresses,
                    birthdays: birthdays,
                    genders: genders,
                    photos: photos
                });

                // Create a JWT-like token for your backend
                const googleToken = {
                    sub: names.metadata?.source?.id || emailAddresses.metadata?.source?.id,
                    email: emailAddresses.value,
                    name: names.displayName,
                    given_name: names.givenName,
                    family_name: names.familyName,
                    birthday: birthdays.date ? `${birthdays.date.year}-${String(birthdays.date.month).padStart(2, '0')}-${String(birthdays.date.day).padStart(2, '0')}` : null,
                    gender: genders.value?.toLowerCase() || null,
                    picture: photos.url || null,
                };

                console.log('🔐 OAuth Callback: Final Google token:', googleToken);

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
