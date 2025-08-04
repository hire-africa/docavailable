import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useProfilePicture = () => {
  const { user, refreshUserData } = useAuth();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  useEffect(() => {
    // Update profile picture URL when user data changes
    const url = user?.profile_picture_url || user?.profile_picture || null;
    setProfilePictureUrl(url);
  }, [user?.profile_picture_url, user?.profile_picture]);

  const refreshProfilePicture = async () => {
    try {
      await refreshUserData();
    } catch (error) {
      console.error('Error refreshing profile picture:', error);
    }
  };

  return {
    profilePictureUrl,
    refreshProfilePicture,
    hasProfilePicture: !!profilePictureUrl
  };
}; 