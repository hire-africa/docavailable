import AsyncStorage from '@react-native-async-storage/async-storage';

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
  private baseURL = 'http://172.20.10.11:8000/api'; // Update with your backend URL
  private currentUser: UserData | null = null;
  private currentToken: string | null = null;
  private listeners: ((state: AuthState) => void)[] = [];

  // Initialize auth state
  async initialize(): Promise<AuthState> {
    try {
      console.log('AuthService: Starting initialization...');
      
      const token = await this.getStoredToken();
      console.log('AuthService: Stored token found:', !!token);
      
      if (token) {
        console.log('AuthService: Token found, getting current user...');
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
          await this.clearStoredToken();
        }
      }
      
      return {
        user: null,
        token: null,
        loading: false,
        error: null
      };
    } catch (error: any) {
      console.error('AuthService: Error during initialization:', error);
      await this.clearStoredToken();
      
      return {
        user: null,
        token: null,
        loading: false,
        error: null
      };
    }
  }

  async signIn(email: string, password: string): Promise<AuthState> {
    try {
      console.log('AuthService: Attempting sign in...');
      
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      
      // Handle the nested data structure from Laravel
      const responseData = data.data || data;
      const token = responseData.token;
      const user = responseData.user;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Store auth data
      await this.storeToken(token);
      this.currentUser = user;
      this.currentToken = token;
      
      const authState = {
        user: user,
        token: token,
        loading: false,
        error: null
      };

      this.notifyListeners(authState);
      return authState;
    } catch (error: any) {
      console.error('Sign in error:', error);
      const authState = {
        user: null,
        token: null,
        loading: false,
        error: error.message
      };
      this.notifyListeners(authState);
      throw error;
    }
  }

  async signInWithGoogle(idToken: string): Promise<AuthState> {
    try {
      console.log('AuthService: Attempting Google sign in...');
      
      const response = await fetch(`${this.baseURL}/google-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_token: idToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Google login failed');
      }

      const data = await response.json();
      
      // Handle the nested data structure from Laravel
      const responseData = data.data || data;
      const token = responseData.token;
      const user = responseData.user;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Store auth data
      await this.storeToken(token);
      this.currentUser = user;
      this.currentToken = token;
      
      const authState = {
        user: user,
        token: token,
        loading: false,
        error: null
      };

      this.notifyListeners(authState);
      return authState;
    } catch (error: any) {
      console.error('Google sign in error:', error);
      const authState = {
        user: null,
        token: null,
        loading: false,
        error: error.message
      };
      this.notifyListeners(authState);
      throw error;
    }
  }

  async signUp(formData: FormData): Promise<AuthState> {
    try {
      console.log('AuthService: Attempting sign up...');
      
      const response = await fetch(`${this.baseURL}/auth/register`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      
      // Handle the nested data structure from Laravel
      const responseData = data.data || data;
      const token = responseData.token;
      const user = responseData.user;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Store auth data
      await this.storeToken(token);
      this.currentUser = user;
      this.currentToken = token;
      
      const authState = {
        user: data.user,
        token: data.token,
        loading: false,
        error: null
      };

      this.notifyListeners(authState);
      return authState;
    } catch (error: any) {
      console.error('Sign up error:', error);
      const authState = {
        user: null,
        token: null,
        loading: false,
        error: error.message
      };
      this.notifyListeners(authState);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      console.log('AuthService: Signing out...');
      
      if (this.currentToken) {
        // Call logout endpoint
        await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.currentToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local data regardless of server response
      await this.clearStoredToken();
      this.currentUser = null;
      this.currentToken = null;
      
      const authState = {
        user: null,
        token: null,
        loading: false,
        error: null
      };
      
      this.notifyListeners(authState);
    }
  }

  getCurrentUser(): UserData | null {
    return this.currentUser;
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }

  async updateUser(userId: number, data: Partial<UserData>): Promise<UserData> {
    try {
      const response = await fetch(`${this.baseURL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.currentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Update failed');
      }

      const updatedUser = await response.json();
      this.currentUser = updatedUser;
      
      const authState = {
        user: updatedUser,
        token: this.currentToken,
        loading: false,
        error: null
      };
      
      this.notifyListeners(authState);
      return updatedUser;
    } catch (error: any) {
      console.error('Update user error:', error);
      throw error;
    }
  }

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

  subscribe(callback: (state: AuthState) => void): void {
    this.listeners.push(callback);
  }

  unsubscribe(callback: (state: AuthState) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private async getCurrentUserWithToken(token: string): Promise<UserData | null> {
    try {
      const response = await fetch(`${this.baseURL}/auth/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const userData = await response.json();
      return userData;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  private async storeToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('auth_token', token);
    } catch (error) {
      console.error('Store token error:', error);
    }
  }

  private async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Get stored token error:', error);
      return null;
    }
  }

  private async clearStoredToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Clear stored token error:', error);
    }
  }

  private notifyListeners(state: AuthState) {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  getCurrentUser(): UserData | null {
    return this.currentUser;
  }

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

  async checkAndRefreshToken(): Promise<boolean> {
    // Simplified token refresh logic
    if (!this.currentToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.currentToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.currentToken = data.token;
        await this.storeToken(data.token);
        return true;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }

    return false;
  }

  async getDoctorAvailability(doctorId: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/doctors/${doctorId}/availability`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.currentToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Failed to get availability' };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      console.error('Get doctor availability error:', error);
      return { success: false, message: error.message || 'Network error' };
    }
  }

  async updateDoctorAvailability(doctorId: string, availability: any): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/doctors/${doctorId}/availability`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.currentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(availability),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Failed to update availability' };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      console.error('Update doctor availability error:', error);
      return { success: false, message: error.message || 'Network error' };
    }
  }

  async sendPasswordResetLink(email: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send reset link');
      }
    } catch (error: any) {
      console.error('Send password reset link error:', error);
      throw error;
    }
  }

  async resetPassword(token: string, email: string, password: string, passwordConfirmation: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService(); 