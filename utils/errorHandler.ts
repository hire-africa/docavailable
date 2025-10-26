import { Alert } from 'react-native';

export interface ErrorDetails {
  message: string;
  type: 'validation' | 'network' | 'server' | 'timeout' | 'auth' | 'unknown';
  field?: string;
  statusCode?: number;
}

export interface ValidationErrors {
  [key: string]: string[];
}

export class SignUpErrorHandler {
  /**
   * Parse and categorize different types of errors from API responses
   */
  static parseError(error: any): ErrorDetails {
    // Network/Connection errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        message: 'Registration timed out. Your account may have been created successfully. Please try logging in.',
        type: 'timeout'
      };
    }

    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return {
        message: 'Network connection failed. Please check your internet connection and try again.',
        type: 'network'
      };
    }

    // HTTP Status Code based errors
    if (error.response?.status) {
      const status = error.response.status;
      
      switch (status) {
        case 400:
          return {
            message: 'Invalid request. Please check your information and try again.',
            type: 'server',
            statusCode: status
          };
        
        case 401:
          return {
            message: 'Authentication failed. Please try again.',
            type: 'auth',
            statusCode: status
          };
        
        case 403:
          return {
            message: 'Access denied. You may not have permission to create an account.',
            type: 'auth',
            statusCode: status
          };
        
        case 422:
          // Validation errors - handled separately
          return {
            message: 'Please check your input and try again.',
            type: 'validation',
            statusCode: status
          };
        
        case 429:
          return {
            message: 'Too many requests. Please wait a moment and try again.',
            type: 'server',
            statusCode: status
          };
        
        case 500:
          return {
            message: 'Server error occurred. Please try again later.',
            type: 'server',
            statusCode: status
          };
        
        case 503:
          return {
            message: 'Service temporarily unavailable. Please try again later.',
            type: 'server',
            statusCode: status
          };
        
        default:
          return {
            message: error.response.data?.message || 'An unexpected error occurred. Please try again.',
            type: 'server',
            statusCode: status
          };
      }
    }

    // Firebase Auth errors (if using Firebase)
    if (error.code?.startsWith('auth/')) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          return {
            message: 'An account with this email already exists.',
            type: 'auth',
            field: 'email'
          };
        
        case 'auth/weak-password':
          return {
            message: 'Password is too weak. Please choose a stronger password.',
            type: 'validation',
            field: 'password'
          };
        
        case 'auth/invalid-email':
          return {
            message: 'Please enter a valid email address.',
            type: 'validation',
            field: 'email'
          };
        
        case 'auth/operation-not-allowed':
          return {
            message: 'Account creation is currently disabled. Please contact support.',
            type: 'auth'
          };
        
        case 'auth/too-many-requests':
          return {
            message: 'Too many failed attempts. Please try again later.',
            type: 'auth'
          };
        
        default:
          return {
            message: error.message || 'Authentication failed. Please try again.',
            type: 'auth'
          };
      }
    }

    // Laravel validation errors
    if (error.response?.data?.errors) {
      return {
        message: 'Please check your input and try again.',
        type: 'validation'
      };
    }

    // Generic error message parsing
    if (error.message) {
      if (error.message.includes('email already exists')) {
        return {
          message: 'An account with this email already exists.',
          type: 'auth',
          field: 'email'
        };
      }
      
      if (error.message.includes('password')) {
        return {
          message: 'Password is too weak. Please choose a stronger password.',
          type: 'validation',
          field: 'password'
        };
      }
      
      if (error.message.includes('email')) {
        return {
          message: 'Please enter a valid email address.',
          type: 'validation',
          field: 'email'
        };
      }
      
      if (error.message.includes('Validation failed')) {
        return {
          message: 'Please check your input and try again.',
          type: 'validation'
        };
      }
    }

    // Default fallback
    return {
      message: error.message || 'An unexpected error occurred. Please try again.',
      type: 'unknown'
    };
  }

  /**
   * Extract validation errors from API response
   */
  static extractValidationErrors(error: any): ValidationErrors {
    const validationErrors: ValidationErrors = {};

    // Laravel validation errors (422 response)
    if (error.response?.status === 422 && error.response.data?.errors) {
      return error.response.data.errors;
    }

    // Generic validation error parsing
    if (error.message && error.message.includes('Validation failed:')) {
      const errorText = error.message.replace('Validation failed:\n', '');
      const errorLines = errorText.split('\n');
      
      errorLines.forEach(line => {
        const [field, message] = line.split(': ');
        if (field && message) {
          validationErrors[field] = [message];
        }
      });
    }

    return validationErrors;
  }

  /**
   * Show appropriate error alert based on error type
   */
  static showErrorAlert(errorDetails: ErrorDetails, onRetry?: () => void, onLogin?: () => void) {
    const { message, type } = errorDetails;

    switch (type) {
      case 'timeout':
        Alert.alert(
          'Timeout',
          message,
          [
            {
              text: 'Try Login',
              onPress: onLogin
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
        break;

      case 'network':
        Alert.alert(
          'Connection Error',
          message,
          [
            {
              text: 'Retry',
              onPress: onRetry
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
        break;

      case 'validation':
        Alert.alert(
          'Validation Error',
          message
        );
        break;

      case 'auth':
        Alert.alert(
          'Authentication Error',
          message
        );
        break;

      case 'server':
        Alert.alert(
          'Server Error',
          message,
          onRetry ? [
            {
              text: 'Retry',
              onPress: onRetry
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ] : undefined
        );
        break;

      default:
        Alert.alert(
          'Error',
          message,
          onRetry ? [
            {
              text: 'Retry',
              onPress: onRetry
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ] : undefined
        );
    }
  }

  /**
   * Handle signup error with comprehensive error processing
   */
  static handleSignUpError(
    error: any, 
    setErrors?: (errors: ValidationErrors) => void,
    onRetry?: () => void,
    onLogin?: () => void
  ): void {
    console.error('SignUp Error Handler:', error);

    const errorDetails = this.parseError(error);
    const validationErrors = this.extractValidationErrors(error);

    // Set validation errors if callback provided and validation errors exist
    if (setErrors && Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return; // Don't show alert for validation errors, they're displayed inline
    }

    // Show appropriate error alert
    this.showErrorAlert(errorDetails, onRetry, onLogin);
  }

  /**
   * Get user-friendly error message for a specific field
   */
  static getFieldErrorMessage(field: string, validationErrors: ValidationErrors): string | null {
    if (validationErrors[field] && validationErrors[field].length > 0) {
      return validationErrors[field][0];
    }
    return null;
  }

  /**
   * Check if there are any validation errors
   */
  static hasValidationErrors(validationErrors: ValidationErrors): boolean {
    return Object.keys(validationErrors).length > 0;
  }
}

export default SignUpErrorHandler;


