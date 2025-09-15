import React, { createContext, useContext, useEffect, useState } from 'react';
import authService from '../services/authService';
import { UserData } from '../services/laravelService';

interface AuthContextType {
  user: UserData | null;
  userData: UserData | null;
  loading: boolean;
  token: string | null;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Ensure all properties are defined to prevent destructuring errors
  return {
    user: context.user || null,
    userData: context.userData || null,
    loading: context.loading || false,
    token: context.token || null,
    refreshUserData: context.refreshUserData || (() => Promise.resolve())
  };
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// Helper function to convert ApiUser to UserData
const convertApiUserToUserData = (apiUser: any): UserData => {
  return {
    id: apiUser.id,
    email: apiUser.email,
    first_name: apiUser.first_name,
    last_name: apiUser.last_name,
    display_name: apiUser.display_name,
    user_type: apiUser.user_type,
    date_of_birth: apiUser.date_of_birth,
    gender: apiUser.gender,
    country: apiUser.country,
    city: apiUser.city,
    years_of_experience: apiUser.years_of_experience,
    occupation: apiUser.occupation,
    bio: apiUser.bio,
    health_history: apiUser.health_history,
    status: apiUser.status === 'suspended' ? 'rejected' : apiUser.status as 'pending' | 'approved' | 'rejected' | 'active',
    rating: apiUser.rating,
    total_ratings: apiUser.total_ratings,
    created_at: apiUser.created_at,
    updated_at: apiUser.updated_at,
    // Image fields
    profile_picture: apiUser.profile_picture,
    profile_picture_url: apiUser.profile_picture_url,
    national_id: apiUser.national_id,
    national_id_url: apiUser.national_id_url,
    medical_degree: apiUser.medical_degree,
    medical_degree_url: apiUser.medical_degree_url,
    medical_licence: apiUser.medical_licence,
    medical_licence_url: apiUser.medical_licence_url,
    // Doctor specific fields
    specialization: apiUser.specialization,
    sub_specialization: apiUser.sub_specialization,
  };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const fetchUserData = async (): Promise<UserData | null> => {
    try {
      // console.log('AuthContext: Fetching user data from Laravel backend...');
      
      // Get token from authService
      const token = await authService.getStoredToken();
      // console.log('AuthContext: Stored token found:', !!token);
      
      if (!token) {
        // console.log('AuthContext: No token found');
        return null;
      }
      
      // Get current user from API using authService
      // console.log('AuthContext: Making request to /api/user...');
      const apiResponse = await authService.getCurrentUserFromAPI();
      
      // console.log('AuthContext: API response:', apiResponse);
      
      // Handle the wrapped response structure
      if (apiResponse && apiResponse.success && apiResponse.data) {
        // console.log('AuthContext: Retrieved user data from Laravel:', apiResponse.data);
        const userData = convertApiUserToUserData(apiResponse.data);
        // console.log('AuthContext: Converted to UserData format:', userData);
        // console.log('AuthContext: User type:', userData.user_type);
        // console.log('AuthContext: User status:', userData.status);
        return userData;
      } else {
        // console.log('AuthContext: API response indicates failure:', apiResponse?.message);
        return null;
      }
      
    } catch (error: any) {
      console.error('AuthContext: Error fetching user data from Laravel:', error);
      return null;
    }
  };

  const refreshUserData = async () => {
    try {
      // console.log('AuthContext: Refreshing user data...');
      const data = await fetchUserData();
      // console.log('AuthContext: Fetched user data:', data);
      
      if (data) {
        // Force immediate update of both user and userData
        setUserData(data);
        setUser(data);
        
        // Get token from authService
        const storedToken = await authService.getStoredToken();
        setToken(storedToken);
        
        // console.log('AuthContext: User data refreshed successfully:', {
        //   user_type: data?.user_type,
        //   profile_picture_url: data?.profile_picture_url,
        //   profile_picture: data?.profile_picture,
        //   id: data?.id
        // });
        
        // Force a re-render by triggering state update
        setTimeout(() => {
          setUserData(prev => ({ ...prev, ...data }));
          setUser(prev => ({ ...prev, ...data }));
        }, 50);
      } else {
        // console.log('AuthContext: No user data received from API, but keeping existing data');
        // Don't clear existing data if API fails - keep what we have
        // Only clear if we explicitly get a null response
      }
    } catch (error) {
      console.error('AuthContext: Error refreshing user data:', error);
      // Don't clear state on error - keep existing data
      // console.log('AuthContext: Keeping existing user data despite refresh error');
    }
  };

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      // Add a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        setLoading(false);
        setUser(null);
        setUserData(null);
      }, 20000); // 20 second timeout
      
      try {
        // Test API connection first (optional - don't fail auth if health check fails)
        try {
          const healthResponse = await authService.healthCheck();
          if (healthResponse.success) {
            console.log('AuthContext: API health check successful');
          } else {
            console.warn('AuthContext: API health check failed, but continuing with auth initialization');
          }
        } catch (healthError: any) {
          console.warn('AuthContext: API health check failed, but continuing with auth initialization:', healthError.message);
          
          // Check if this is a deployment issue (HTML response instead of JSON)
          if (healthError.response?.data && typeof healthError.response.data === 'string' && healthError.response.data.includes('<br />')) {
            console.warn('AuthContext: Backend deployment issue detected - returning HTML instead of JSON');
            console.warn('AuthContext: This indicates the Laravel application is not properly deployed, but continuing with auth');
          }
        }
        
        // Initialize authService first
        const authState = await authService.initialize();
        console.log('AuthContext: AuthService initialized:', authState);
        
        if (authState.user) {
          console.log('AuthContext: User found, setting state:', authState.user.email, 'Type:', authState.user.user_type);
          setUser(authState.user);
          setUserData(authState.user);
          // Get token from authService
          const storedToken = await authService.getStoredToken();
          setToken(storedToken);
        } else {
          console.log('AuthContext: No authenticated user found');
          setUser(null);
          setUserData(null);
          setToken(null);
        }
      } catch (error) {
        console.error('AuthContext: Error initializing auth:', error);
        setUser(null);
        setUserData(null);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen to authService state changes
    const handleAuthStateChange = (authState: any) => {
      console.log('AuthContext: Auth state changed:', authState);
      if (authState.user) {
        console.log('AuthContext: Setting user data:', authState.user);
        setUser(authState.user);
        setUserData(authState.user);
        // Get token from authService (synchronous)
        authService.getStoredToken().then(storedToken => {
          setToken(storedToken);
        }).catch(error => {
          console.error('AuthContext: Error getting stored token:', error);
        });
      } else {
        console.log('AuthContext: Clearing user data');
        setUser(null);
        setUserData(null);
        setToken(null);
      }
    };

    // Subscribe to auth state changes
    authService.subscribe(handleAuthStateChange);
    
    // Don't try to get current user sync here - let the async initialization handle it
    // The getCurrentUserSync() method will now properly return the current user state

    return () => {
      // Unsubscribe when component unmounts
      authService.unsubscribe(handleAuthStateChange);
    };
  }, []);

  const value = {
    user: user || null,
    userData: userData || null,
    loading: loading || false,
    token: token || null,
    refreshUserData: refreshUserData || (() => Promise.resolve())
  };

  // console.log('AuthContext: Rendering with loading:', loading, 'user:', user ? user.email : 'null');

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 