import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Types
export interface User {
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
  // Image fields
  profile_picture?: string;
  profile_picture_url?: string;
  national_id?: string;
  national_id_url?: string;
  medical_degree?: string;
  medical_degree_url?: string;
  medical_licence?: string;
  medical_licence_url?: string;
  // Doctor specific fields
  specialization?: string;
  sub_specialization?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    token_type: string;
    expires_in: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

class ApiService {
  private api: AxiosInstance;
  private refreshApi: AxiosInstance; // Separate instance for token refresh
  private baseURL: string;
  private isRefreshing = false; // Prevent multiple simultaneous refresh attempts
  private circuitBreaker = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: 0,
    threshold: 10, // Increased threshold to be less aggressive
    timeout: 10000 // Reduced timeout to 10 seconds for faster recovery
  };

  constructor() {
    // Get base URL without /api suffix
    const rawBaseURL = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_LARAVEL_API_URL || 'http://172.20.10.11:8000';
    
    // Remove trailing /api if it exists to avoid double /api/api/
    this.baseURL = rawBaseURL.endsWith('/api') ? rawBaseURL.slice(0, -4) : rawBaseURL;
    
    console.log('ApiService: Initialized with base URL:', this.baseURL);
    
    // Main API instance
    this.api = axios.create({
      baseURL: `${this.baseURL}/api`, // Always append /api to the clean base URL
      timeout: 15000, // Reduced to 15 seconds for better UX
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Separate instance for token refresh (no interceptors to avoid loops)
    this.refreshApi = axios.create({
      baseURL: `${this.baseURL}/api`,
      timeout: 10000, // Shorter timeout for refresh
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await this.getAuthToken();
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

        // Only attempt refresh once per request and only if we have a token
        if (error.response?.status === 401 && !originalRequest._retry && !this.isRefreshing) {
          const currentToken = await this.getAuthToken();
          
          // If no token exists, don't try to refresh - just clear auth and reject
          if (!currentToken) {
            console.log('ApiService: No token available, clearing auth data');
            await this.removeAuthToken();
            await this.removeUserData();
            return Promise.reject(error);
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            console.log('ApiService: Attempting automatic token refresh...');
            const refreshed = await this.refreshToken();
            
            if (refreshed) {
              const newToken = await this.getAuthToken();
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                this.isRefreshing = false;
                console.log('ApiService: Token refreshed, retrying original request');
                return this.api(originalRequest);
              }
            }
            
            // Refresh failed or no new token, clear auth
            this.isRefreshing = false;
            console.log('ApiService: Token refresh failed, clearing auth data');
            await this.removeAuthToken();
            await this.removeUserData();
            return Promise.reject(error);
          } catch (refreshError) {
            // Token refresh failed, clear auth and don't retry
            this.isRefreshing = false;
            console.error('ApiService: Token refresh error:', refreshError);
            await this.removeAuthToken();
            await this.removeUserData();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management
  async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async setAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('auth_token', token);
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
  }

  async removeAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Error removing auth token:', error);
    }
  }

  private async setUserData(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
    } catch (error) {
      console.error('Error setting user data:', error);
    }
  }

  private async getUserData(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  private async removeUserData(): Promise<void> {
    try {
      await AsyncStorage.removeItem('user_data');
    } catch (error) {
      console.error('Error removing user data:', error);
    }
  }

  // Authentication methods
  async register(formData: FormData): Promise<AuthResponse> {
    try {
      console.log('ApiService: Making registration request to:', `${this.baseURL}/api/register`);
      
      const response: AxiosResponse<AuthResponse> = await this.api.post('/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('ApiService: Registration response:', {
        success: response.data.success,
        message: response.data.message,
        status: response.status
      });
      
      if (response.data.success) {
        await this.setAuthToken(response.data.data.token);
        await this.setUserData(response.data.data.user);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('ApiService: Registration error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL
        }
      });
      throw this.handleError(error);
    }
  }

  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await this.api.post('/login', credentials);
      
      if (response.data.success) {
        await this.setAuthToken(response.data.data.token);
        await this.setUserData(response.data.data.user);
      }
      
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async googleLogin(credentials: { id_token: string }): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await this.api.post('/google-login', credentials);
      
      if (response.data.success) {
        await this.setAuthToken(response.data.data.token);
        await this.setUserData(response.data.data.user);
      }
      
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.removeAuthToken();
      await this.removeUserData();
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      console.log('ApiService: Attempting token refresh...');
      
      // Get the current token to include in refresh request
      const currentToken = await this.getAuthToken();
      if (!currentToken) {
        console.log('ApiService: No token to refresh');
        return false;
      }

      // Check if token is actually expired or about to expire
      try {
        const payload = JSON.parse(atob(currentToken.split('.')[1]));
        const expiryTime = payload.exp * 1000;
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;
        
        // If token is still valid for more than 1 minute, don't refresh
        if (timeUntilExpiry > 60 * 1000) {
          console.log('ApiService: Token still valid, no refresh needed');
          return true;
        }
      } catch (decodeError) {
        console.log('ApiService: Could not decode token, attempting refresh anyway');
      }

      // Use the separate refresh API instance to avoid interceptor loops
      const response: AxiosResponse<AuthResponse> = await this.refreshApi.post('/refresh', {}, {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        },
        timeout: 10000 // 10 second timeout for refresh
      });
      
      if (response.data.success && response.data.data) {
        console.log('ApiService: Token refresh successful');
        await this.setAuthToken(response.data.data.token);
        await this.setUserData(response.data.data.user);
        return true;
      }
      
      console.log('ApiService: Token refresh failed - invalid response');
      return false;
    } catch (error: any) {
      console.error('ApiService: Token refresh failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // If refresh fails with 401, clear the token
      if (error.response?.status === 401) {
        console.log('ApiService: Refresh failed with 401, clearing token');
        await this.removeAuthToken();
        await this.removeUserData();
      }
      
      return false;
    }
  }

  // Check if token is about to expire
  async isTokenExpiringSoon(): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      if (!token) return true;

      // Decode JWT token to check expiry (without verification for client-side check)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;
      
      // Return true if token expires in less than 5 minutes
      return timeUntilExpiry < 5 * 60 * 1000;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true; // Assume expired if we can't check
    }
  }

  // Proactive token refresh method
  async checkAndRefreshToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      console.log('ApiService: Token refresh already in progress');
      return false;
    }

    try {
      const isExpiring = await this.isTokenExpiringSoon();
      if (isExpiring) {
        console.log('ApiService: Token expiring soon, refreshing proactively');
        return await this.refreshToken();
      }
      return true; // Token is still valid
    } catch (error) {
      console.error('ApiService: Error in proactive token refresh:', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      console.log('ApiService: Making GET request to /user...');
      
      const response: AxiosResponse<ApiResponse<User>> = await this.api.get('/user');
      
      console.log('ApiService: /user response received:', {
        success: response.data.success,
        hasData: !!response.data.data,
        status: response.status
      });
      
      if (response.data.success && response.data.data) {
        console.log('ApiService: Setting user data...');
        await this.setUserData(response.data.data);
        return response.data.data;
      }
      
      console.log('ApiService: No valid user data in response');
      return null;
    } catch (error: any) {
      console.error('ApiService: Get current user error:', error);
      
      // If it's an authentication error (401), clear the token
      if (error.response?.status === 401) {
        console.log('ApiService: Authentication failed, clearing token...');
        await this.removeAuthToken();
        await this.removeUserData();
      }
      
      return null;
    }
  }

  async updateProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response: AxiosResponse<ApiResponse<User>> = await this.api.patch('/profile', profileData);
      
      if (response.data.success && response.data.data) {
        await this.setUserData(response.data.data);
      }
      
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async changePassword(passwordData: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.api.post('/change-password', passwordData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }

  // Get cached user data
  async getCachedUser(): Promise<User | null> {
    return await this.getUserData();
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.api.get('/health');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Simple connectivity check
  async checkConnectivity(): Promise<boolean> {
    try {
      console.log('ApiService: Checking connectivity to:', this.baseURL);
      const response = await axios.get(`${this.baseURL}/api/health`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
        }
      });
      console.log('ApiService: Connectivity check successful');
      
      // Reset circuit breaker on successful connectivity check
      this.circuitBreaker.failureCount = 0;
      this.circuitBreaker.isOpen = false;
      
      return true;
    } catch (error: any) {
      console.error('ApiService: Connectivity check failed:', {
        message: error.message,
        code: error.code,
        status: error.response?.status
      });
      return false;
    }
  }

  // Reset circuit breaker manually
  resetCircuitBreaker(): void {
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailureTime = 0;
    console.log('ApiService: Circuit breaker reset manually');
  }

  // Get circuit breaker status
  getCircuitBreakerStatus(): { isOpen: boolean; failureCount: number; lastFailureTime: number } {
    return {
      isOpen: this.circuitBreaker.isOpen,
      failureCount: this.circuitBreaker.failureCount,
      lastFailureTime: this.circuitBreaker.lastFailureTime
    };
  }

  // Error handling
  private handleError(error: any): Error {
    const err = error as any;
    // Enhanced error handling with specific error types
    if (err.response?.data?.errors) {
      // Format validation errors into a readable message
      const errorMessages = Object.entries(err.response.data.errors)
        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
        .join('\n');
      return new Error(`Validation failed:\n${errorMessages}`);
    }
    
    if (err.response?.data?.message) {
      return new Error(err.response.data.message);
    }
    
    // Handle specific HTTP status codes
    if (err.response?.status) {
      switch (err.response.status) {
        case 401:
          return new Error('Invalid email or password. Please check your credentials and try again.');
        case 403:
          return new Error('Access denied. Your account may be suspended or you may not have permission to access this resource.');
        case 404:
          return new Error('The requested resource was not found. Please check the URL and try again.');
        case 422:
          return new Error('Invalid data provided. Please check your input and try again.');
        case 429:
          return new Error('Too many requests. Please wait a moment and try again.');
        case 500:
          return new Error('Server error. Please try again later or contact support if the problem persists.');
        case 502:
        case 503:
        case 504:
          return new Error('Service temporarily unavailable. Please try again later.');
        default:
          return new Error(`Request failed with status ${error.response.status}. Please try again.`);
      }
    }
    
    // Handle network errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return new Error('Request timed out. Please check your internet connection and try again.');
    }
    
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return new Error('Network error. Please check your internet connection and try again.');
    }
    
    if (error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo ENOTFOUND')) {
      return new Error('Cannot connect to server. Please check your internet connection and try again.');
    }
    
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      return new Error('Server is not responding. Please try again later or contact support.');
    }
    
    // Handle circuit breaker errors
    if (error.message?.includes('Service temporarily unavailable')) {
      return error;
    }
    
    // Default error message
    return new Error((error as any).message || 'An unexpected error occurred. Please try again.');
  }

  private async retryRequest<T>(requestFn: () => Promise<T>, maxRetries: number = 2): Promise<T> {
    // Check circuit breaker
    if (this.circuitBreaker.isOpen) {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;
      if (timeSinceLastFailure < this.circuitBreaker.timeout) {
        console.log('ApiService: Circuit breaker is open, skipping request');
        throw new Error('Service temporarily unavailable. Please try again later.');
      } else {
        console.log('ApiService: Circuit breaker timeout reached, trying request');
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failureCount = 0;
      }
    }

    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await requestFn();
        
        // Reset circuit breaker on success
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.isOpen = false;
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Increment failure count
        this.circuitBreaker.failureCount++;
        this.circuitBreaker.lastFailureTime = Date.now();
        
        // Open circuit breaker if threshold reached
        if (this.circuitBreaker.failureCount >= this.circuitBreaker.threshold) {
          this.circuitBreaker.isOpen = true;
          console.log('ApiService: Circuit breaker opened due to repeated failures');
        }
        
        // Enhanced error logging
        console.error('❌ [ApiService] Request failed:', {
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
          url: error.config?.url
        });
        
        // Don't retry on authentication errors (401) or client errors (4xx)
        if (error.response?.status === 401) {
          console.log('❌ [ApiService] Authentication error, not retrying');
          throw error;
        }
        
        if (error.response?.status >= 400 && error.response?.status < 500) {
          console.log('❌ [ApiService] Client error, not retrying');
          throw error;
        }
        
        // Don't retry on timeout errors after first attempt
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          console.log('ApiService: Timeout error, not retrying');
          throw error;
        }
        
        // Don't retry on network errors after first attempt
        if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
          console.log('ApiService: Network error, not retrying');
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`ApiService: Retrying request (attempt ${attempt + 1}/${maxRetries + 1})`);
      }
    }
    
    throw lastError;
  }

  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.get(url, { params });
      return response.data;
    });
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    console.log('📤 [ApiService] POST request:', { url, data });
    
    return this.retryRequest(async () => {
      try {
        const response: AxiosResponse<ApiResponse<T>> = await this.api.post(url, data);
        console.log('✅ [ApiService] POST response:', { 
          url, 
          status: response.status, 
          success: response.data?.success,
          message: response.data?.message 
        });
        return response.data;
      } catch (error) {
        console.error('❌ [ApiService] POST error:', { 
          url, 
          error: (error as any)?.message,
          status: (error as any)?.response?.status,
          data: (error as any)?.response?.data 
        });
        throw error;
      }
    });
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.put(url, data);
      return response.data;
    });
  }

  async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.patch(url, data);
      return response.data;
    });
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.delete(url);
      return response.data;
    });
  }

  // File upload method
  async uploadFile<T>(url: string, formData: FormData): Promise<ApiResponse<T>> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService; 