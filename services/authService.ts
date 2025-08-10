import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';

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
    const rawBaseURL = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_LARAVEL_API_URL || 'https://docavailable-1.onrender.com';
    
    // Remove trailing /api if it exists to avoid double /api/api/
    this.baseURL = rawBaseURL.endsWith('/api') ? rawBaseURL.slice(0, -4) : rawBaseURL;
    
    console.log('AuthService: Initialized with base URL:', this.baseURL);
    
    // Check if we're in a web environment and using localhost
    if (typeof window !== 'undefined' && this.baseURL.includes('docavailable-1.onrender.com')) {
      console.log('AuthService: Using live backend URL');
    }
    
    this.api = axios.create({
      baseURL: `${this.baseURL}/api`,
      timeout: 15000,
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
      console.log('AuthService: FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${typeof value === 'string' ? value : '[File/Blob]'}`);
      }
      
      const response = await this.api.post('/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

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
      const response = await this.api.post('/login', credentials);

      const { user, token } = response.data.data;
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));

      // Update current user state
      this.currentUser = user;

      // Notify subscribers of new auth state
      this.notifySubscribers({ user, token });

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Alias for login method to maintain compatibility
  async signIn(email: string, password: string): Promise<AuthResponse> {
    return this.login({ email, password });
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
      const response = await this.api.get(`/doctor/${doctorId}/availability`);
      return response.data;
    } catch (error) {
      console.error('Get doctor availability error:', error);
      throw error;
    }
  }

  async updateDoctorAvailability(doctorId: string, availabilityData: any): Promise<any> {
    try {
      const response = await this.api.put(`/doctor/${doctorId}/availability`, availabilityData);
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
}

export default new AuthService(); 