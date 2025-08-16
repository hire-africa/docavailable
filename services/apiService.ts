import AsyncStorage from '@react-native-async-storage/async-storage';

const baseURL = 'https://docavailable-5.onrender.com/api';

class ApiService {
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

  async post(endpoint: string, data: any) {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const responseData = await response.json();
      return responseData;
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
}

export const apiService = new ApiService(); 