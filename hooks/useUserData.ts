import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface UseUserDataOptions {
  onUserChange?: (user: any) => void;
  onUserDataChange?: (userData: any) => void;
  requireAuth?: boolean;
  redirectOnUnauth?: string;
}

export interface UseUserDataReturn {
  user: any;
  userData: any;
  loading: boolean;
  refreshUserData: () => Promise<void>;
  isAuthenticated: boolean;
}

export function useUserData({
  onUserChange,
  onUserDataChange,
  requireAuth = true,
  redirectOnUnauth = '/'
}: UseUserDataOptions = {}): UseUserDataReturn {
  const { user, userData, loading, refreshUserData } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Handle user changes
  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
      onUserChange?.(user);
    } else {
      setIsAuthenticated(false);
      if (requireAuth) {
        // Handle redirect logic here if needed
        // router.replace(redirectOnUnauth);
      }
    }
  }, [user, onUserChange, requireAuth, redirectOnUnauth]);

  // Handle userData changes
  useEffect(() => {
    if (userData) {
      onUserDataChange?.(userData);
    }
  }, [userData, onUserDataChange]);

  const handleRefreshUserData = useCallback(async () => {
    try {
      await refreshUserData();
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, [refreshUserData]);

  return {
    user,
    userData,
    loading,
    refreshUserData: handleRefreshUserData,
    isAuthenticated
  };
}
