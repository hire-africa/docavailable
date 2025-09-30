import { useCallback, useEffect, useState } from 'react';

export interface UseDataFetchingOptions {
  fetchFunction: () => Promise<any>;
  dependencies?: any[];
  enabled?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  immediate?: boolean;
}

export interface UseDataFetchingReturn {
  data: any;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDataFetching({
  fetchFunction,
  dependencies = [],
  enabled = true,
  onSuccess,
  onError,
  immediate = true
}: UseDataFetchingOptions): UseDataFetchingReturn {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFunction();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, enabled, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [fetchData, immediate, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}
