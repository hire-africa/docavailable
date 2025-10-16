import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';
import { environment } from '../config/environment';

interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      display_name: string;
      user_type: 'patient' | 'doctor' | 'admin';
      date_of_birth?: string;
      gender?: 'male' | 'female' | 'other';
      country?: string;
      city?: string;
      years_of_experience?: number;
      occupation?: string;
      bio?: string;
      health_history?: string;
      status: 'active' | 'pending' | 'suspended';
      rating: number;
      total_ratings: number;
      created_at: string;
      updated_at: string;
      profile_picture?: string;
      profile_picture_url?: string;
      national_id?: string;
      national_id_url?: string;
      medical_degree?: string;
      medical_degree_url?: string;
      medical_licence?: string;
      medical_licence_url?: string;
      specialization?: string;
      sub_specialization?: string;
    };
    token: string;
    token_type: string;
    expires_in: number;
  };
}

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

class AuthService {
  private api: AxiosInstance;
  private baseURL: string;
  private subscribers: Array<(authState: any) => void> = [];
  private currentUser: any = null; // Add this to store current user state

  constructor() {
    // Get base URL without /api suffix
    // Use the environment configuration for the base URL
    const rawBaseURL = environment.LARAVEL_API_URL;
    
    // Remove trailing /api if it exists to avoid double /api/api/
    this.baseURL = rawBaseURL.endsWith('/api') ? rawBaseURL.slice(0, -4) : rawBaseURL;
    
    console.log('AuthService: Initialized with base URL:', this.baseURL);
    
    // Check if we're in a web environment and using localhost
    if (typeof window !== 'undefined' && this.baseURL.includes('docavailable-5.onrender.com')) {
      console.log('AuthService: Using live backend URL');
    }
    
    this.api = axios.create({
      baseURL: `${this.baseURL}/api`,
      timeout: 30000, // Increased timeout to 30 seconds for file uploads
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Only clear auth data for authentication-related endpoints
          const authEndpoints = ['/auth/', '/login', '/logout', '/user', '/me'];
          const isAuthEndpoint = authEndpoints.some(endpoint => 
            originalRequest.url?.includes(endpoint)
          );
          
          if (isAuthEndpoint) {
            try {
              // Clear stored token and user data
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user_data');
              this.currentUser = null;
              
              // Notify subscribers of logout
              this.notifySubscribers({ user: null, token: null });
            } catch (refreshError) {
              console.error('Token refresh error:', refreshError);
            }
          } else {
            // For non-auth endpoints, just log the error but don't clear user data
            console.warn('Non-auth endpoint returned 401, not clearing user data:', originalRequest.url);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Subscribe to auth state changes
  subscribe(callback: (authState: any) => void): void {
    this.subscribers.push(callback);
  }

  // Unsubscribe from auth state changes
  unsubscribe(callback: (authState: any) => void): void {
    const index = this.subscribers.indexOf(callback);
    if (index > -1) {
      this.subscribers.splice(index, 1);
    }
  }

  // Notify all subscribers of auth state changes
  private notifySubscribers(authState: any): void {
    // Update current user state
    this.currentUser = authState.user;
    
    this.subscribers.forEach(callback => {
      try {
        callback(authState);
      } catch (error) {
        console.error('Error in auth subscriber callback:', error);
      }
    });
  }

  // Initialize auth service and return current state
  async initialize(): Promise<{ user: any; token: string | null }> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      const user = userData ? JSON.parse(userData) : null;
      
      // Update current user state
      this.currentUser = user;
      
      // Notify subscribers of initial state
      this.notifySubscribers({ user, token });
      
      return { user, token };
    } catch (error) {
      console.error('AuthService initialization error:', error);
      this.currentUser = null;
      return { user: null, token: null };
    }
  }



  // Get stored token
  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Get stored token error:', error);
      return null;
    }
  }

  // Clear stored token
  async clearStoredToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      
      // Clear current user state
      this.currentUser = null;
      
      this.notifySubscribers({ user: null, token: null });
    } catch (error) {
      console.error('Clear stored token error:', error);
    }
  }

  async register(formData: FormData): Promise<AuthResponse> {
    try {
      console.log('AuthService: Making registration request to:', `${this.baseURL}/api/register`);
      
      // Convert FormData to JSON object (profile pictures are already converted to base64)
      const jsonData: any = {};
      for (let [key, value] of (formData as any).entries()) {
        jsonData[key] = value;
      }
      
      console.log('AuthService: JSON data being sent:', jsonData);
      
      const response = await this.api.post('/register', jsonData);

      console.log('AuthService: Registration response:', {
        success: response.data.success,
        message: response.data.message,
        status: response.status
      });

      const { user, token } = response.data.data;
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));

      // Update current user state
      this.currentUser = user;

      // Notify subscribers of new auth state
      this.notifySubscribers({ user, token });

      return response.data;
    } catch (error: any) {
      console.error('AuthService: Registration error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL
        }
      });
      throw error;
    }
  }

  // Alias for register method to maintain compatibility
  async signUp(formData: FormData): Promise<AuthResponse> {
    return this.register(formData);
  }

  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    try {
      console.log('AuthService: Attempting login with credentials:', { email: credentials.email, password: '***' });
      
      const response = await this.api.post('/login', credentials);
      
      console.log('AuthService: Login response received:', {
        status: response.status,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : 'no data',
        success: response.data?.success,
        hasUserData: !!response.data?.data?.user
      });

      // Check if response has the expected structure
      if (!response.data) {
        throw new Error('No response data received from server');
      }

      if (!response.data.success) {
        throw new Error(response.data.message || 'Login failed');
      }

      if (!response.data.data || !response.data.data.user) {
        console.error('AuthService: Unexpected response structure:', response.data);
        throw new Error('Invalid response structure from server');
      }

      const { user, token } = response.data.data;
      
      console.log('AuthService: Login successful for user:', user.email);
      
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));

      // Update current user state
      this.currentUser = user;

      // Notify subscribers of new auth state
      this.notifySubscribers({ user, token });

      return response.data;
    } catch (error) {
      console.error('AuthService: Login error:', error);
      console.error('AuthService: Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  // Alias for login method to maintain compatibility
  async signIn(email: string, password: string): Promise<AuthResponse> {
    return this.login({ email, password });
  }

  // Request password reset link
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('AuthService: Requesting password reset for:', email);
      
      const response = await this.api.post('/forgot-password', { email });
      
      console.log('AuthService: Password reset request response:', {
        success: response.data?.success,
        message: response.data?.message,
        status: response.status
      });

      if (response.data?.success) {
        return {
          success: true,
          message: response.data.message || 'Password reset link sent successfully'
        };
      } else {
        throw new Error(response.data?.message || 'Failed to send password reset link');
      }
    } catch (error: any) {
      console.error('AuthService: Password reset request error:', error);
      
      let errorMessage = 'Failed to send password reset link. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  // Reset password with token
  async resetPassword(token: string, email: string, password: string, passwordConfirmation: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('AuthService: Resetting password for:', email);
      
      const response = await this.api.post('/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation
      });
      
      console.log('AuthService: Password reset response:', {
        success: response.data?.success,
        message: response.data?.message,
        status: response.status
      });

      if (response.data?.success) {
        return {
          success: true,
          message: response.data.message || 'Password reset successfully'
        };
      } else {
        throw new Error(response.data?.message || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('AuthService: Password reset error:', error);
      
      let errorMessage = 'Failed to reset password. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  // Verify reset code
  async verifyResetCode(email: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('AuthService: Verifying reset code for:', email);
      
      const response = await this.api.post('/verify-reset-code', {
        email,
        code
      });
      
      console.log('AuthService: Code verification response:', {
        success: response.data?.success,
        message: response.data?.message,
        status: response.status
      });

      if (response.data?.success) {
        return {
          success: true,
          message: response.data.message || 'Code verified successfully'
        };
      } else {
        throw new Error(response.data?.message || 'Failed to verify code');
      }
    } catch (error: any) {
      console.error('AuthService: Code verification error:', error);
      
      let errorMessage = 'Failed to verify code. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  // Reset password with code
  async resetPasswordWithCode(email: string, code: string, password: string, passwordConfirmation: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('AuthService: Resetting password with code for:', email);
      
      const response = await this.api.post('/reset-password-with-code', {
        email,
        code,
        password,
        password_confirmation: passwordConfirmation
      });
      
      console.log('AuthService: Password reset with code response:', {
        success: response.data?.success,
        message: response.data?.message,
        status: response.status
      });

      if (response.data?.success) {
        return {
          success: true,
          message: response.data.message || 'Password reset successfully'
        };
      } else {
        throw new Error(response.data?.message || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('AuthService: Password reset with code error:', error);
      
      let errorMessage = 'Failed to reset password. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  async googleLogin(credentials: { id_token: string }): Promise<AuthResponse> {
    try {
      const response = await this.api.post('/google-login', credentials);

      const { user, token } = response.data.data;
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));

      // Update current user state
      this.currentUser = user;

      // Notify subscribers of new auth state
      this.notifySubscribers({ user, token });

      return response.data;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }

  // Alias for googleLogin method to maintain compatibility
  async signInWithGoogle(googleToken: string): Promise<AuthResponse> {
    return this.googleLogin({ id_token: googleToken });
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      
      // Clear current user state
      this.currentUser = null;
      
      // Notify subscribers of logout
      this.notifySubscribers({ user: null, token: null });
    }
  }

  // Alias for logout method to maintain compatibility
  async signOut(): Promise<void> {
    return this.logout();
  }

  async getCurrentUser(): Promise<any> {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Get current user from API
  async getCurrentUserFromAPI(): Promise<any> {
    try {
      const response = await this.api.get('/user');
      return response.data;
    } catch (error) {
      console.error('Get current user from API error:', error);
      return null;
    }
  }

  // Synchronous version for immediate access
  getCurrentUserSync(): any {
    try {
      // Return the current user state that's stored in memory
      return this.currentUser;
    } catch (error) {
      console.error('Get current user sync error:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      return !!token;
    } catch (error) {
      console.error('Check authentication error:', error);
      return false;
    }
  }

  async healthCheck(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/health');
      // The backend returns { status: 'ok', timestamp: '...', message: '...' }
      // Convert it to the expected ApiResponse format
      return {
        success: response.data.status === 'ok',
        message: response.data.message || 'Health check completed',
        data: response.data
      };
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  // Doctor availability methods
  async getDoctorAvailability(doctorId: string): Promise<any> {
    try {
      const response = await this.api.get(`/doctors/${doctorId}/availability`);
      return response.data;
    } catch (error) {
      console.error('Get doctor availability error:', error);
      throw error;
    }
  }

  async updateDoctorAvailability(doctorId: string, availabilityData: any): Promise<any> {
    try {
      const response = await this.api.put(`/doctors/${doctorId}/availability`, availabilityData);
      return response.data;
    } catch (error) {
      console.error('Update doctor availability error:', error);
      throw error;
    }
  }

  // User management methods
  async getUserById(userId: string): Promise<any> {
    try {
      const response = await this.api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get user by ID error:', error);
      throw error;
    }
  }

  async updateUser(userId: string, userData: any): Promise<any> {
    try {
      const response = await this.api.put(`/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  // Email verification methods
  async sendVerificationCode(email: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('AuthService: Sending verification code to:', email);
      
      const response = await this.api.post('/auth/send-verification-code', { email });
      
      console.log('AuthService: Verification code response:', {
        success: response.data?.success,
        message: response.data?.message,
        status: response.status
      });

      return {
        success: response.data?.success || true,
        message: response.data?.message || 'Verification code sent successfully'
      };
    } catch (error: any) {
      console.error('AuthService: Send verification code error:', error);
      
      let errorMessage = 'Failed to send verification code. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  async verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('AuthService: Verifying email with code for:', email);
      console.log('AuthService: Code details:', {
        code: code,
        codeLength: code.length,
        codeType: typeof code,
        codeCharacters: code.split('').map(c => `'${c}'`).join(', '),
        codeTrimmed: code.trim(),
        codeTrimmedLength: code.trim().length
      });
      
      // Add a small delay to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Ensure code is properly trimmed and formatted
      const trimmedCode = code.trim();
      const requestData = { email, code: trimmedCode };
      console.log('AuthService: Sending verification request:', requestData);
      
      const response = await this.api.post('/auth/verify-email', requestData);
      
      console.log('AuthService: Email verification response:', {
        success: response.data?.success,
        message: response.data?.message,
        status: response.status,
        data: response.data
      });

      return {
        success: response.data?.success || true,
        message: response.data?.message || 'Email verified successfully'
      };
    } catch (error: any) {
      console.error('AuthService: Email verification error:', error);
      console.error('AuthService: Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });
      
      let errorMessage = 'Failed to verify email. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }
}

export default new AuthService(); 