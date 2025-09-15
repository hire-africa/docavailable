import { Platform } from 'react-native';
import { apiService } from '../app/services/apiService';

export interface NetworkDiagnosticResult {
  timestamp: string;
  platform: string;
  baseUrl: string;
  connectivityCheck: {
    success: boolean;
    duration: number;
    error?: string;
  };
  apiEndpoints: {
    health: {
      success: boolean;
      duration: number;
      status?: number;
      error?: string;
    };
    ping?: {
      success: boolean;
      duration: number;
      error?: string;
    };
  };
  recommendations: string[];
}

export class NetworkDiagnostics {
  private static async measureRequest<T>(
    requestFn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await requestFn();
    const duration = Date.now() - startTime;
    return { result, duration };
  }

  static async runDiagnostics(): Promise<NetworkDiagnosticResult> {
    const startTime = Date.now();
    const recommendations: string[] = [];
    
    // Basic connectivity check
    let connectivityResult;
    try {
      const { result, duration } = await this.measureRequest(() => 
        apiService.checkConnectivity()
      );
      connectivityResult = { success: result, duration, error: undefined };
    } catch (error: any) {
      connectivityResult = { 
        success: false, 
        duration: 0, 
        error: error.message 
      };
    }

    // Health endpoint check
    let healthResult;
    try {
      const { result, duration } = await this.measureRequest(() => 
        apiService.healthCheck()
      );
      healthResult = { 
        success: result.success, 
        duration, 
        status: 200, 
        error: undefined 
      };
    } catch (error: any) {
      healthResult = { 
        success: false, 
        duration: 0, 
        status: error.response?.status, 
        error: error.message 
      };
    }

    // Generate recommendations
    if (!connectivityResult.success) {
      recommendations.push('Check your internet connection');
      recommendations.push('Verify the backend URL is correct');
      recommendations.push('Try switching between WiFi and mobile data');
    }

    if (connectivityResult.duration > 10000) {
      recommendations.push('Network response is slow - consider using a faster connection');
    }

    if (healthResult.duration > 5000) {
      recommendations.push('Backend health check is slow - server may be under load');
    }

    if (!healthResult.success && healthResult.status === 500) {
      recommendations.push('Backend server error - contact support');
    }

    if (!healthResult.success && healthResult.status === 404) {
      recommendations.push('Health endpoint not found - check backend configuration');
    }

    return {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      baseUrl: (apiService as any).baseURL || 'unknown',
      connectivityCheck: connectivityResult,
      apiEndpoints: {
        health: healthResult,
      },
      recommendations,
    };
  }

  static async testEndpoint(endpoint: string): Promise<{
    success: boolean;
    duration: number;
    status?: number;
    error?: string;
  }> {
    try {
      const { result, duration } = await this.measureRequest(() => 
        apiService.get(endpoint)
      );
      return { 
        success: result.success, 
        duration, 
        status: 200, 
        error: undefined 
      };
    } catch (error: any) {
      return { 
        success: false, 
        duration: 0, 
        status: error.response?.status, 
        error: error.message 
      };
    }
  }

  static getNetworkInfo(): {
    platform: string;
    baseUrl: string;
    userAgent: string;
  } {
    return {
      platform: Platform.OS,
      baseUrl: (apiService as any).baseURL || 'unknown',
      userAgent: `DocAvailable/${Platform.OS}`,
    };
  }
}

export default NetworkDiagnostics;
