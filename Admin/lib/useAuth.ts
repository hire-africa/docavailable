import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    token: null,
  });
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('admin_token');
      
      if (token) {
        // Verify token is valid by making a test API call
        fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        .then(response => {
          if (response.ok) {
            setAuthState({
              isAuthenticated: true,
              isLoading: false,
              token,
            });
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('admin_token');
            setAuthState({
              isAuthenticated: false,
              isLoading: false,
              token: null,
            });
            router.push('/');
          }
        })
        .catch(() => {
          // Network error or other issue
          localStorage.removeItem('admin_token');
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            token: null,
          });
          router.push('/');
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          token: null,
        });
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  const logout = () => {
    localStorage.removeItem('admin_token');
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      token: null,
    });
    router.push('/');
  };

  return {
    ...authState,
    logout,
  };
}
