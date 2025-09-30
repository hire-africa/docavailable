import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../app/services/apiService';

export interface UseHealthCheckOptions {
  enabled?: boolean;
  interval?: number;
  onStatusChange?: (status: 'connected' | 'disconnected' | 'checking') => void;
  onError?: (error: any) => void;
}

export interface UseHealthCheckReturn {
  status: 'connected' | 'disconnected' | 'checking';
  checkHealth: () => Promise<void>;
}

export function useHealthCheck({
  enabled = true,
  interval = 30000, // 30 seconds
  onStatusChange,
  onError
}: UseHealthCheckOptions = {}): UseHealthCheckReturn {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  const checkHealth = useCallback(async () => {
    if (!enabled) return;
    
    setStatus('checking');
    onStatusChange?.('checking');
    
    try {
      const isConnected = await apiService.checkConnectivity();
      const newStatus = isConnected ? 'connected' : 'disconnected';
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      
      if (isConnected) {
        apiService.resetCircuitBreaker();
      }
    } catch (error) {
      setStatus('disconnected');
      onStatusChange?.('disconnected');
      onError?.(error);
    }
  }, [enabled, onStatusChange, onError]);

  useEffect(() => {
    if (!enabled) return;

    // Initial check
    checkHealth();
    
    // Set up periodic checks
    const healthCheckInterval = setInterval(checkHealth, interval);
    
    return () => {
      clearInterval(healthCheckInterval);
    };
  }, [enabled, checkHealth, interval]);

  return {
    status,
    checkHealth
  };
}
