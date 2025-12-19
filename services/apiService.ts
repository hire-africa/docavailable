import AsyncStorage from '@react-native-async-storage/async-storage';
import { environment } from '../config/environment';

const baseURL = `${environment.LARAVEL_API_URL}/api`;

class ApiService {
  get baseURL() {
    return baseURL;
  }
  private async getAuthHeaders() {
    const token = await AsyncStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  async get(endpoint: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('ApiService GET error:', error);
      throw error;
    }
  }

  async post(endpoint: string, data: any, options: { headers?: Record<string, string> } = {}) {
    try {
      const headers = await this.getAuthHeaders();
      
      // Merge custom headers with auth headers
      const finalHeaders = { ...headers, ...options.headers };
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(`${baseURL}${endpoint}`, {
          method: 'POST',
          headers: finalHeaders,
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check content type before parsing
        const contentType = response.headers.get('content-type') || '';
        const responseText = await response.text();

        // If response is HTML, throw a specific error
        if (contentType.includes('text/html') || responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          console.error('❌ [ApiService] Backend returned HTML instead of JSON:', {
            endpoint,
            status: response.status,
            preview: responseText.substring(0, 200)
          });
          throw new Error('Backend returned HTML error page instead of JSON');
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}, body: ${responseText.substring(0, 200)}`);
        }

        // Parse as JSON only if not HTML
        try {
          const responseData = JSON.parse(responseText);
          return responseData;
        } catch (parseError) {
          console.error('❌ [ApiService] Failed to parse response as JSON:', parseError);
          throw new Error('Invalid JSON response from server');
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout - backend took too long to respond');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('ApiService POST error:', error);
      throw error;
    }
  }

  async patch(endpoint: string, data: any) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('ApiService PATCH error:', error);
      throw error;
    }
  }

  async delete(endpoint: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('ApiService DELETE error:', error);
      throw error;
    }
  }

  async uploadFile(endpoint: string, formData: FormData) {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = {
        'Authorization': token ? `Bearer ${token}` : '',
        // Don't set Content-Type for FormData, let the browser set it with boundary
      };
      
      console.log('ApiService: Making file upload request to:', `${baseURL}${endpoint}`);
      
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      console.log('ApiService: Upload response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ApiService: Upload error response body:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const responseData = await response.json();
      console.log('ApiService: Upload response data:', responseData);
      return responseData;
    } catch (error) {
      console.error('ApiService uploadFile error:', error);
      throw error;
    }
  }

  // Circuit breaker methods (placeholder implementations)
  getCircuitBreakerStatus() {
    return { isOpen: false, failureCount: 0 };
  }

  resetCircuitBreaker() {
    console.log('ApiService: Circuit breaker reset');
  }

  async checkConnectivity() {
    try {
      const response = await fetch(`${baseURL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async isTokenExpiringSoon() {
    // Placeholder implementation
    return false;
  }

  getBaseURL(): string {
    return baseURL;
  }
}

export const apiService = new ApiService(); 