import { apiService } from '../app/services/apiService';
import { laravelService } from './laravelService';

export interface UserData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  user_type: 'patient' | 'doctor' | 'admin';
  date_of_birth?: string;
  gender?: string;
  country?: string;
  city?: string;
  years_of_experience?: number;
  specialization?: string;
  sub_specialization?: string;
  bio?: string;
  health_history?: string;
  status: 'pending' | 'approved' | 'rejected' | 'active';
  rating?: number;
  total_ratings?: number;
  created_at: string;
  updated_at: string;
  // Image fields
  profile_picture?: string;
  profile_picture_url?: string;
  national_id?: string;
  national_id_url?: string;
  medical_degree?: string;
  medical_degree_url?: string;
  medical_licence?: string;
  medical_licence_url?: string;
}

export interface AuthState {
  user: UserData | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

class AuthService {
  private currentUser: UserData | null = null;
  private currentToken: string | null = null;
  private listeners: ((state: AuthState) => void)[] = [];

  // Initialize auth state
  async initialize(): Promise<AuthState> {
    try {
      console.log('AuthService: Starting initialization...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<AuthState>((_, reject) => {
        setTimeout(() => reject(new Error('Initialization timeout')), 10000); // Reduced to 10 seconds
      });
      
      const initPromise = this.performInitialization();
      
      return await Promise.race([initPromise, timeoutPromise]);
    } catch (error: any) {
      console.error('AuthService: Error during initialization:', error);
      
      // Clear any stored data on timeout or error
      await this.clearStoredToken();
      
      return {
        user: null,
        token: null,
        loading: false,
        error: null // Don't show error to user, just return null state
      };
    }
  }

  private async performInitialization(): Promise<AuthState> {
    // Check if we have a stored token
    console.log('AuthService: Checking for stored token...');
    const token = await this.getStoredToken();
    console.log('AuthService: Stored token found:', !!token);
    
    if (token) {
      console.log('AuthService: Token found, getting current user...');
      // Try to get current user with token
      const userData = await this.getCurrentUserWithToken(token);
      console.log('AuthService: User data retrieved:', !!userData);
      
      if (userData) {
        console.log('AuthService: Valid user found, setting state...');
        this.currentUser = userData;
        this.currentToken = token;
        
        return {
          user: userData,
          token,
          loading: false,
          error: null
        };
      } else {
        console.log('AuthService: Invalid token, clearing...');
        // Token is invalid, clear it
        await this.clearStoredToken();
      }
    }
    
    console.log('AuthService: No valid token, returning null state...');
    // No valid token
    return {
      user: null,
      token: null,
      loading: false,
      error: null
    };
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthState> {
    try {
      // Sign in with Laravel backend
      const response = await apiService.login({ email, password });
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        
        // Store token
        await this.storeToken(token);
        
        const state: AuthState = {
          user,
          token,
          loading: false,
          error: null
        };

        this.currentUser = user;
        this.currentToken = token;
        this.notifyListeners(state);
        return state;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('AuthService: Login error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      const state: AuthState = {
        user: null,
        token: null,
        loading: false,
        error: error.message
      };
      this.notifyListeners(state);
      throw error;
    }
  }

  // Sign in with Google
  async signInWithGoogle(idToken: string): Promise<AuthState> {
    try {
      console.log('AuthService: Starting Google sign-in...');
      
      // Sign in with Laravel backend using Google token
      const response = await apiService.googleLogin({ id_token: idToken });
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        
        // Store token
        await this.storeToken(token);
        
        const state: AuthState = {
          user,
          token,
          loading: false,
          error: null
        };

        this.currentUser = user;
        this.currentToken = token;
        this.notifyListeners(state);
        return state;
      } else {
        throw new Error(response.message || 'Google login failed');
      }
    } catch (error: any) {
      console.error('AuthService: Google login error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      const state: AuthState = {
        user: null,
        token: null,
        loading: false,
        error: error.message
      };
      this.notifyListeners(state);
      throw error;
    }
  }

  // Sign up with email and password
  async signUp(formData: FormData): Promise<AuthState> {
    try {
        console.log('AuthService: Starting registration with form data');

        const response = await apiService.register(formData);

        if (response.success && response.data) {
            const { user, token } = response.data;

            // For doctors, don't store token as they need approval
            if (formData.get('user_type') === 'doctor') {
                const state: AuthState = {
                    user,
                    token: null,
                    loading: false,
                    error: null
                };
                this.notifyListeners(state);
                return state;
            }

            // For patients, store token and log in
            await this.storeToken(token);
            
            const state: AuthState = {
                user,
                token,
                loading: false,
                error: null
            };

            this.currentUser = user;
            this.currentToken = token;
            this.notifyListeners(state);
            return state;
        } else {
            throw new Error(response.message || 'Registration failed');
        }
    } catch (error: any) {
        console.error('AuthService: Registration error:', error);
        const state: AuthState = {
            user: null,
            token: null,
            loading: false,
            error: error.message
        };
        this.notifyListeners(state);
        throw error;
    }
}

  // Sign out
  async signOut(): Promise<void> {
    try {
      // Call logout endpoint if we have a token
      if (this.currentToken) {
        try {
          await apiService.logout();
        } catch (error) {
          console.warn('Logout API call failed:', error);
        }
      }
      
      // Clear stored data
      await this.clearStoredToken();
      this.currentUser = null;
      this.currentToken = null;
      
      const state: AuthState = {
        user: null,
        token: null,
        loading: false,
        error: null
      };
      
      this.notifyListeners(state);
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Get current user data
  getCurrentUser(): UserData | null {
    return this.currentUser;
  }

  // Get current token
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  // Update user data
  async updateUser(userId: number, data: Partial<UserData>): Promise<UserData> {
    try {
      const response = await laravelService.updateUser(userId, data);
      
      if (response.success && response.data) {
        this.currentUser = response.data;
        
        // Notify listeners of the update
        const state: AuthState = {
          user: this.currentUser,
          token: this.currentToken,
          loading: false,
          error: null
        };
        this.notifyListeners(state);
        
        return response.data;
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error: any) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  // Listen to auth state changes
  onAuthStateChanged(callback: (state: AuthState) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Subscribe to auth state changes
  subscribe(callback: (state: AuthState) => void): void {
    this.listeners.push(callback);
  }

  // Unsubscribe from auth state changes
  unsubscribe(callback: (state: AuthState) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Private methods
  private async getCurrentUserWithToken(token: string): Promise<UserData | null> {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('User fetch timeout')), 8000); // 8 second timeout
      });
      
      const userPromise = apiService.getCurrentUser();
      
      const user = await Promise.race([userPromise, timeoutPromise]);
      
      if (user) {
        console.log('AuthService: Valid user retrieved from API');
        return user as UserData;
      }
      
      console.log('AuthService: No valid user returned from API');
      return null;
    } catch (error: any) {
      console.error('AuthService: Error getting current user with token:', error);
      
      // If it's a timeout or network error, don't clear the token
      // Only clear token on authentication errors
      if (error.message?.includes('timeout') || error.code === 'NETWORK_ERROR') {
        console.log('AuthService: Network timeout, keeping token for retry');
        return null;
      }
      
      // For authentication errors, clear the token
      if (error.response?.status === 401) {
        console.log('AuthService: Authentication failed, clearing token');
        await this.clearStoredToken();
      }
      
      return null;
    }
  }

  private async storeToken(token: string): Promise<void> {
    try {
      await apiService.setAuthToken(token);
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  }

  private async getStoredToken(): Promise<string | null> {
    try {
      return await apiService.getAuthToken();
    } catch (error) {
      console.error('Failed to get stored token:', error);
      return null;
    }
  }

  private async clearStoredToken(): Promise<void> {
    try {
      await apiService.removeAuthToken();
    } catch (error) {
      console.error('Failed to clear stored token:', error);
    }
  }

  private notifyListeners(state: AuthState) {
    this.listeners.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  // Get current user
  getCurrentUser(): UserData | null {
    return this.currentUser;
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.currentToken && !!this.currentUser;
  }

  isDoctor(): boolean {
    return this.currentUser?.user_type === 'doctor';
  }

  isPatient(): boolean {
    return this.currentUser?.user_type === 'patient';
  }

  isAdmin(): boolean {
    return this.currentUser?.user_type === 'admin';
  }

  isApproved(): boolean {
    return this.currentUser?.status === 'approved';
  }

  getUserId(): number | null {
    return this.currentUser?.id || null;
  }

  // Proactive token refresh
  async checkAndRefreshToken(): Promise<boolean> {
    try {
      const isExpiring = await apiService.isTokenExpiringSoon();
      if (isExpiring) {
        console.log('AuthService: Token expiring soon, refreshing proactively');
        const refreshed = await apiService.refreshToken();
        if (refreshed) {
          // Update current token
          this.currentToken = await apiService.getAuthToken();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('AuthService: Error checking/refreshing token:', error);
      return false;
    }
  }

  // Doctor Availability Methods
  async getDoctorAvailability(doctorId: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      console.log('AuthService: Getting doctor availability for ID:', doctorId);
      
      // Check circuit breaker status
      const circuitStatus = apiService.getCircuitBreakerStatus();
      console.log('AuthService: Circuit breaker status:', circuitStatus);
      
      if (circuitStatus.isOpen) {
        console.log('AuthService: Circuit breaker is open, resetting...');
        apiService.resetCircuitBreaker();
      }
      
      const response = await apiService.get(`/doctors/${doctorId}/availability`);
      console.log('AuthService: API response received:', response);
      
      return response;
    } catch (error: any) {
      console.error('AuthService: Error getting doctor availability:', error);
      console.error('AuthService: Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return { success: false, message: error.message || 'Failed to get availability' };
    }
  }

  async updateDoctorAvailability(doctorId: string, availability: any): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      console.log('AuthService: Updating doctor availability for ID:', doctorId);
      console.log('AuthService: Availability data:', availability);
      
      // Check circuit breaker status
      const circuitStatus = apiService.getCircuitBreakerStatus();
      console.log('AuthService: Circuit breaker status:', circuitStatus);
      
      if (circuitStatus.isOpen) {
        console.log('AuthService: Circuit breaker is open, resetting...');
        apiService.resetCircuitBreaker();
      }
      
      const response = await apiService.put(`/doctors/${doctorId}/availability`, availability);
      console.log('AuthService: Update response received:', response);
      
      return response;
    } catch (error: any) {
      console.error('AuthService: Error updating doctor availability:', error);
      console.error('AuthService: Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return { success: false, message: error.message || 'Failed to update availability' };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService; 