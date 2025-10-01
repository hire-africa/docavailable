import { useCallback, useEffect } from 'react';

export interface UseTabBasedFetchingOptions {
  activeTab: string;
  user: any;
  fetchFunctions: {
    [key: string]: () => Promise<void>;
  };
  dependencies?: any[];
}

export function useTabBasedFetching({
  activeTab,
  user,
  fetchFunctions,
  dependencies = []
}: UseTabBasedFetchingOptions) {
  const executeFetchForTab = useCallback(async () => {
    if (!user || !activeTab) return;
    
    const fetchFunction = fetchFunctions[activeTab];
    if (fetchFunction) {
      try {
        await fetchFunction();
      } catch (error) {
        console.error(`Error fetching data for tab ${activeTab}:`, error);
      }
    }
  }, [activeTab, user, fetchFunctions]);

  // Fetch data when tab changes
  useEffect(() => {
    executeFetchForTab();
  }, [executeFetchForTab, ...dependencies]);

  // Fetch data when user changes
  useEffect(() => {
    if (user) {
      executeFetchForTab();
    }
  }, [user, executeFetchForTab]);

  return {
    executeFetchForTab
  };
}

