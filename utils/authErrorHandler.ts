import { Alert } from 'react-native';

export interface AuthError {
  title: string;
  message: string;
  suggestion?: string;
  actionable?: boolean;
  retryable?: boolean;
}

export interface ErrorAction {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export class AuthErrorHandler {
  private static readonly ERROR_TYPES = {
    VALIDATION_ERROR: 'validation_error',
    EMAIL_NOT_FOUND: 'email_not_found',
    INVALID_PASSWORD: 'invalid_password',
    ACCOUNT_SUSPENDED: 'account_suspended',
    ACCOUNT_PENDING: 'account_pending',
    DATABASE_ERROR: 'database_error',
    AUTHENTICATION_ERROR: 'authentication_error',
    CONNECTION_ERROR: 'connection_error',
    TOKEN_ERROR: 'token_error',
    UNEXPECTED_ERROR: 'unexpected_error',
    NETWORK_ERROR: 'network_error',
    TIMEOUT_ERROR: 'timeout_error',
    SERVER_ERROR: 'server_error',
    SERVICE_UNAVAILABLE: 'service_unavailable'
  };

  /**
   * Format error into standardized structure
   */
  static formatError(error: any): AuthError {
    // Handle backend error response
    if (error.response?.data) {
      return this.handleBackendError(error.response.data);
    }

    // Handle network/connection errors
    if (error.message) {
      return this.handleMessageError(error.message);
    }

    // Fallback for unknown errors
    return {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred. Please try again.',
      suggestion: 'If this problem persists, please contact support.',
      retryable: true
    };
  }

  /**
   * Handle backend error responses
   */
  private static handleBackendError(errorData: any): AuthError {
    const errorType = errorData.error_type || 'unknown';
    const message = errorData.message || 'An error occurred';
    const suggestion = errorData.suggestion;

    switch (errorType) {
      case this.ERROR_TYPES.VALIDATION_ERROR:
        return {
          title: 'Validation Error',
          message: message,
          suggestion: suggestion || 'Please check your input and try again.',
          actionable: true,
          retryable: true
        };

      case this.ERROR_TYPES.EMAIL_NOT_FOUND:
        return {
          title: 'Email Not Found',
          message: 'No account found with this email address.',
          suggestion: 'Check your email or create a new account.',
          actionable: true,
          retryable: false
        };

      case this.ERROR_TYPES.INVALID_PASSWORD:
        return {
          title: 'Invalid Password',
          message: 'The password you entered is incorrect.',
          suggestion: 'Check your password or reset it if you forgot.',
          actionable: true,
          retryable: true
        };

      case this.ERROR_TYPES.ACCOUNT_SUSPENDED:
        return {
          title: 'Account Suspended',
          message: 'Your account has been suspended.',
          suggestion: 'Please contact support for assistance.',
          actionable: true,
          retryable: false
        };

      case this.ERROR_TYPES.ACCOUNT_PENDING:
        return {
          title: 'Account Pending',
          message: 'Your account is awaiting approval.',
          suggestion: 'You will be notified when your account is approved.',
          actionable: false,
          retryable: false
        };

      case this.ERROR_TYPES.DATABASE_ERROR:
        return {
          title: 'Database Error',
          message: 'A database error occurred.',
          suggestion: 'Please try again in a few moments.',
          actionable: false,
          retryable: true
        };

      case this.ERROR_TYPES.TOKEN_ERROR:
        return {
          title: 'Authentication Error',
          message: 'Your session has expired.',
          suggestion: 'Please log in again.',
          actionable: true,
          retryable: false
        };

      default:
        return {
          title: 'Error',
          message: message,
          suggestion: suggestion || 'Please try again.',
          retryable: true
        };
    }
  }

  /**
   * Handle message-based errors
   */
  private static handleMessageError(message: string): AuthError {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('network error') || lowerMessage.includes('cannot connect')) {
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the server.',
        suggestion: 'Check your internet connection and try again.',
        retryable: true
      };
    }

    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return {
        title: 'Timeout Error',
        message: 'The request timed out.',
        suggestion: 'Check your internet connection and try again.',
        retryable: true
      };
    }

    if (lowerMessage.includes('server error') || lowerMessage.includes('500')) {
      return {
        title: 'Server Error',
        message: 'A server error occurred.',
        suggestion: 'Please try again later or contact support if the problem persists.',
        retryable: true
      };
    }

    if (lowerMessage.includes('service unavailable') || lowerMessage.includes('503')) {
      return {
        title: 'Service Unavailable',
        message: 'The service is temporarily unavailable.',
        suggestion: 'Please try again in a few minutes.',
        retryable: true
      };
    }

    if (lowerMessage.includes('invalid email') || lowerMessage.includes('invalid password')) {
      return {
        title: 'Invalid Credentials',
        message: 'Please check your email and password.',
        suggestion: 'Make sure your email is in the correct format and your password is correct.',
        actionable: true,
        retryable: true
      };
    }

    // Default message error
    return {
      title: 'Error',
      message: message,
      suggestion: 'Please try again.',
      retryable: true
    };
  }

  /**
   * Show error alert with standardized formatting
   */
  static showError(
    error: any,
    actions?: ErrorAction[]
  ): void {
    const formattedError = this.formatError(error);
    
    let alertMessage = formattedError.message;
    if (formattedError.suggestion) {
      alertMessage += `\n\n💡 ${formattedError.suggestion}`;
    }

    const alertActions = actions || [{ text: 'OK', onPress: () => {} }];

    Alert.alert(
      formattedError.title,
      alertMessage,
      alertActions.map(action => ({
        text: action.text,
        onPress: action.onPress,
        style: action.style || 'default'
      }))
    );
  }

  /**
   * Show error with retry option
   */
  static showErrorWithRetry(
    error: any,
    onRetry: () => void,
    onCancel?: () => void
  ): void {
    const formattedError = this.formatError(error);
    
    if (!formattedError.retryable) {
      this.showError(error, [{ text: 'OK', onPress: onCancel || (() => {}) }]);
      return;
    }

    const actions: ErrorAction[] = [
      {
        text: 'Cancel',
        onPress: onCancel || (() => {}),
        style: 'cancel'
      },
      {
        text: 'Retry',
        onPress: onRetry,
        style: 'default'
      }
    ];

    this.showError(error, actions);
  }

  /**
   * Show error with custom actions
   */
  static showErrorWithActions(
    error: any,
    actions: ErrorAction[]
  ): void {
    this.showError(error, actions);
  }

  /**
   * Get error message without showing alert
   */
  static getErrorMessage(error: any): string {
    const formattedError = this.formatError(error);
    return formattedError.message;
  }

  /**
   * Get error title without showing alert
   */
  static getErrorTitle(error: any): string {
    const formattedError = this.formatError(error);
    return formattedError.title;
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: any): boolean {
    const formattedError = this.formatError(error);
    return formattedError.retryable || false;
  }

  /**
   * Check if error is actionable (user can do something about it)
   */
  static isActionable(error: any): boolean {
    const formattedError = this.formatError(error);
    return formattedError.actionable || false;
  }

  /**
   * Create error for user existence check
   */
  static createUserExistsError(): AuthError {
    return {
      title: 'Account Already Exists',
      message: 'An account with this email already exists.',
      suggestion: 'Try logging in instead or use a different email address.',
      actionable: true,
      retryable: false
    };
  }

  /**
   * Create error for file upload issues
   */
  static createFileUploadError(details?: string): AuthError {
    return {
      title: 'File Upload Error',
      message: details || 'Failed to upload file.',
      suggestion: 'Please try again with a smaller file or check your internet connection.',
      retryable: true
    };
  }

  /**
   * Create error for progress restoration
   */
  static createProgressRestoreError(): AuthError {
    return {
      title: 'Progress Restore Error',
      message: 'Unable to restore your previous progress.',
      suggestion: 'You can continue with a fresh start.',
      actionable: true,
      retryable: false
    };
  }
}

export default AuthErrorHandler;
