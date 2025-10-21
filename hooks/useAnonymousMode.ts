import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AnonymousModeSettings {
  isAnonymousModeEnabled: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAnonymousMode = (): AnonymousModeSettings => {
  const { userData } = useAuth();
  const [isAnonymousModeEnabled, setIsAnonymousModeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnonymousMode = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!userData) {
          setIsAnonymousModeEnabled(false);
          return;
        }

        // Check if user has anonymous mode enabled in their privacy preferences
        const privacyPreferences = userData.privacy_preferences || {};
        const anonymousMode = privacyPreferences.privacy?.anonymousMode || false;
        
        setIsAnonymousModeEnabled(anonymousMode);
      } catch (err) {
        console.error('Error loading anonymous mode:', err);
        setError('Failed to load anonymous mode settings');
        setIsAnonymousModeEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnonymousMode();
  }, [userData]);

  return {
    isAnonymousModeEnabled,
    isLoading,
    error,
  };
};

/**
 * Hook to get anonymized display data for a user
 */
export const useAnonymizedDisplay = (user: any, isAnonymousModeEnabled: boolean) => {
  const getAnonymizedData = () => {
    if (!isAnonymousModeEnabled || !user) {
      return {
        displayName: user?.display_name || `${user?.first_name} ${user?.last_name}` || 'User',
        profilePictureUrl: user?.profile_picture_url || user?.profile_picture || null,
        isAnonymous: false,
      };
    }

    // Generate consistent anonymous identifier
    const generateAnonymousId = (userId: string) => {
      // Simple hash function for consistent anonymous ID
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        const char = userId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      const shortHash = Math.abs(hash).toString(16).substring(0, 8).toUpperCase();
      return `Patient-${shortHash}`;
    };

    return {
      displayName: generateAnonymousId(user.id.toString()),
      profilePictureUrl: null,
      isAnonymous: true,
    };
  };

  return getAnonymizedData();
};

/**
 * Hook to check if a user should be displayed anonymously
 */
export const useShouldAnonymize = (otherUserId: string, currentUserId: string) => {
  const { userData } = useAuth();
  const [shouldAnonymize, setShouldAnonymize] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAnonymization = async () => {
      try {
        setIsLoading(true);

        // If checking against current user, use local data
        if (otherUserId === currentUserId) {
          const privacyPreferences = userData?.privacy_preferences || {};
          const anonymousMode = privacyPreferences.privacy?.anonymousMode || false;
          setShouldAnonymize(anonymousMode);
          return;
        }

        // For other users, we would need to fetch their privacy settings
        // For now, we'll assume we can't anonymize other users
        // This would require a new API endpoint to check other users' privacy settings
        setShouldAnonymize(false);
      } catch (err) {
        console.error('Error checking anonymization:', err);
        setShouldAnonymize(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAnonymization();
  }, [otherUserId, currentUserId, userData]);

  return { shouldAnonymize, isLoading };
};
