import { router } from 'expo-router';

export interface NavigationOptions {
  userType?: string;
  replace?: boolean;
}

/**
 * Navigate to login page with optional userType parameter
 */
export const navigateToLogin = (options: NavigationOptions = {}) => {
  const { userType, replace = false } = options;
  const loginUrl = userType ? `/login?userType=${userType}` : '/login';
  
  if (replace) {
    router.replace(loginUrl);
  } else {
    router.push(loginUrl);
  }
};

/**
 * Navigate to forgot password page with optional userType parameter
 */
export const navigateToForgotPassword = (options: NavigationOptions = {}) => {
  const { userType, replace = false } = options;
  const forgotPasswordUrl = userType ? `/forgot-password?userType=${userType}` : '/forgot-password';
  
  if (replace) {
    router.replace(forgotPasswordUrl);
  } else {
    router.push(forgotPasswordUrl);
  }
};

/**
 * Navigate to signup page with optional userType parameter
 */
export const navigateToSignup = (options: NavigationOptions = {}) => {
  const { userType, replace = false } = options;
  const signupUrl = userType ? `/${userType}-signup` : '/signup';
  
  // Always use replace for signup to prevent navigation stack issues
  router.replace(signupUrl);
};

/**
 * Navigate back to the previous screen
 */
export const navigateBack = () => {
  router.back();
};

/**
 * Navigate back to login with userType preserved (for cases where we need to go back to login specifically)
 */
export const navigateBackToLogin = (userType?: string) => {
  if (userType) {
    navigateToLogin({ userType, replace: true });
  } else {
    router.back();
  }
};

/**
 * Navigate to landing page
 */
export const navigateToLanding = (replace = false) => {
  if (replace) {
    router.replace('/');
  } else {
    router.push('/');
  }
};

/**
 * Navigate to dashboard based on user type
 */
export const navigateToDashboard = (userType: string, replace = false) => {
  let dashboardUrl = '/';
  
  switch (userType) {
    case 'doctor':
      dashboardUrl = '/doctor-dashboard';
      break;
    case 'patient':
      dashboardUrl = '/patient-dashboard';
      break;
    case 'admin':
      dashboardUrl = '/admin-dashboard';
      break;
    default:
      dashboardUrl = '/';
  }
  
  if (replace) {
    router.replace(dashboardUrl);
  } else {
    router.push(dashboardUrl);
  }
};
