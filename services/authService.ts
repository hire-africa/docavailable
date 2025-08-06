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
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await this.api.post('/auth/refresh', {
                refresh_token: refreshToken,
              });

              const { token } = response.data.data;
              await AsyncStorage.setItem('auth_token', token);

              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            await this.logout();
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async register(formData: FormData): Promise<AuthResponse> {
    try {
      const response = await this.api.post('/auth/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { user, token } = response.data.data;
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));

      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    try {
      const response = await this.api.post('/auth/login', credentials);

      const { user, token } = response.data.data;
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async googleLogin(credentials: { id_token: string }): Promise<AuthResponse> {
    try {
      const response = await this.api.post('/auth/google', credentials);

      const { user, token } = response.data.data;
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));

      return response.data;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
    }
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
      return response.data;
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }
}

export default new AuthService(); 