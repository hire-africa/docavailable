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
        // First try the new structure (privacy_preferences)
        let privacyPreferences = userData.privacy_preferences || {};
        let anonymousMode = privacyPreferences.privacy?.anonymousMode || false;
        
        // If not found, try the old structure (direct in userData)
        if (!anonymousMode) {
          anonymousMode = userData.anonymousMode || false;
        }
        
        // If still not found, try checking if it's in preferences
        if (!anonymousMode) {
          anonymousMode = userData.preferences?.anonymousMode || false;
        }
        
        // Debug logging
        console.log('🔍 [useAnonymousMode] Debug:', {
          userData: userData ? 'present' : 'null',
          privacyPreferences,
          anonymousMode,
          userDataKeys: userData ? Object.keys(userData) : [],
          hasPrivacyPreferences: !!userData?.privacy_preferences,
          hasPreferences: !!userData?.preferences,
          hasAnonymousMode: !!userData?.anonymousMode,
          fullUserData: userData
        });
        
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

    // Get gender-based profile picture
    const getGenderBasedProfilePicture = (user: any) => {
      const gender = user?.gender?.toLowerCase() || '';
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://your-domain.com';
      
      if (gender === 'male') {
        return `${baseUrl}/images/default-avatars/male.jpg`;
      } else if (gender === 'female') {
        return `${baseUrl}/images/default-avatars/female.jpg`;
      } else {
        // For other genders or unknown, default to male
        return `${baseUrl}/images/default-avatars/male.jpg`;
      }
    };

    return {
      displayName: 'Patient',
      profilePictureUrl: getGenderBasedProfilePicture(user),
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
