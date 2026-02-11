import { Alert } from 'react-native';
import authService from '../services/authService';
import AuthErrorHandler from './authErrorHandler';

export interface GoogleUserData {
  sub: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  birthday?: string;
  gender?: string;
}

export interface OAuthResult {
  success: boolean;
  user?: any;
  token?: string;
  error?: string;
  requiresAdditionalInfo?: boolean;
  missingFields?: any[];
}

export class OAuthUtils {
  /**
   * Simplified OAuth callback handler
   */
  static async handleOAuthCallback(code: string): Promise<OAuthResult> {
    try {
      console.log('🔐 OAuth: Processing authorization code...');

      // Let backend handle all Google API calls and user creation/login
      const response = await fetch('https://docavailable1-izk3m.ondigitalocean.app/api/auth/google-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();
      console.log('🔐 OAuth: Backend response:', data);

      if (data.success) {
        if (data.data.user && data.data.token) {
          // User exists and is logged in
          return {
            success: true,
            user: data.data.user,
            token: data.data.token
          };
        } else if (data.data.requiresAdditionalInfo) {
          // New user needs to complete registration
          return {
            success: true,
            requiresAdditionalInfo: true,
            user: data.data.user,
            missingFields: data.data.missingFields
          };
        }
      }

      throw new Error(data.message || 'OAuth authentication failed');

    } catch (error: any) {
      console.error('🔐 OAuth: Error processing callback:', error);

      return {
        success: false,
        error: AuthErrorHandler.getErrorMessage(error)
      };
    }
  }

  /**
   * Handle OAuth error from URL parameters
   */
  static handleOAuthError(error: string, errorDescription?: string): OAuthResult {
    console.error('🔐 OAuth: Error from provider:', { error, errorDescription });

    let message = 'Authentication failed';

    switch (error) {
      case 'access_denied':
        message = 'Access was denied. Please try again.';
        break;
      case 'invalid_request':
        message = 'Invalid request. Please try again.';
        break;
      case 'server_error':
        message = 'Server error occurred. Please try again later.';
        break;
      default:
        message = errorDescription || 'Authentication failed. Please try again.';
    }

    return {
      success: false,
      error: message
    };
  }

  /**
   * Validate OAuth state parameter (CSRF protection)
   */
  static validateState(receivedState: string, expectedState: string): boolean {
    return receivedState === expectedState;
  }

  /**
   * Generate secure state parameter for OAuth
   */
  static generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Extract user type from OAuth flow
   */
  static extractUserType(searchParams: URLSearchParams): 'patient' | 'doctor' | null {
    const state = searchParams.get('state');
    if (state) {
      try {
        const stateData = JSON.parse(atob(state));
        return stateData.userType || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Show OAuth error to user
   */
  static showOAuthError(error: string, onRetry?: () => void) {
    if (onRetry) {
      AuthErrorHandler.showErrorWithRetry(
        { message: error },
        onRetry
      );
    } else {
      AuthErrorHandler.showError({ message: error });
    }
  }

  /**
   * Check if error should be shown to user (filter out user cancellations)
   */
  static shouldShowError(error: string): boolean {
    const silentErrors = [
      'cancelled',
      'user_cancelled',
      'access_denied',
      'SIGN_IN_CANCELLED',
      'No user data received from Google'
    ];

    return !silentErrors.some(silentError =>
      error.toLowerCase().includes(silentError.toLowerCase())
    );
  }

  /**
   * Process OAuth success result
   */
  static async processOAuthSuccess(result: OAuthResult): Promise<void> {
    if (result.user && result.token) {
      // Store authentication data
      await authService.initialize();

      console.log('🔐 OAuth: Authentication successful for user:', result.user.email);
    }
  }

  /**
   * Navigate user based on OAuth result
   */
  static navigateAfterOAuth(result: OAuthResult, router: any): void {
    if (!result.success) {
      if (this.shouldShowError(result.error || '')) {
        this.showOAuthError(result.error || 'Authentication failed');
      }
      return;
    }

    if (result.requiresAdditionalInfo) {
      // Navigate to additional info collection
      const params = new URLSearchParams({
        googleUser: JSON.stringify(result.user),
        missingFields: JSON.stringify(result.missingFields)
      });

      router.replace(`/google-signup-questions?${params.toString()}`);
      return;
    }

    if (result.user) {
      // Navigate to appropriate dashboard
      const user = result.user;

      if (user.user_type === 'admin') {
        router.replace('/admin-dashboard');
      } else if (user.user_type === 'doctor') {
        if (user.status === 'pending') {
          Alert.alert('Account Pending', 'Your account is awaiting admin approval.');
          return;
        }
        if (user.status === 'suspended') {
          Alert.alert('Account Suspended', 'Your account has been suspended. Please contact support.');
          return;
        }
        router.replace('/doctor-dashboard');
      } else if (user.user_type === 'patient') {
        router.replace('/patient-dashboard');
      } else {
        router.replace('/');
      }
    }
  }
}

export default OAuthUtils;
