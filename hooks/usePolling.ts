import { useCallback, useEffect, useRef } from 'react';

export interface UsePollingOptions {
  pollingFunction: () => Promise<void>;
  interval: number;
  enabled?: boolean;
  dependencies?: any[];
  onError?: (error: any) => void;
}

export function usePolling({
  pollingFunction,
  interval,
  enabled = true,
  dependencies = [],
  onError
}: UsePollingOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  const startPolling = useCallback(() => {
    if (!enabled || isPollingRef.current) return;
    
    isPollingRef.current = true;
    intervalRef.current = setInterval(async () => {
      try {
        await pollingFunction();
      } catch (error) {
        onError?.(error);
      }
    }, interval);
  }, [pollingFunction, interval, enabled, onError]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling, ...dependencies]);

  return {
    startPolling,
    stopPolling,
    isPolling: isPollingRef.current
  };
}
