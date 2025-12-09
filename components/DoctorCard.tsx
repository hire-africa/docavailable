import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DoctorProfilePicture from './DoctorProfilePicture';
import Icon from './Icon';
import { stripDoctorPrefix } from '../utils/name';
import favoriteDoctorsService from '../services/favoriteDoctorsService';

interface DoctorCardProps {
  doctor: any;
  onPress: (doctor: any) => void;
  onFavoriteChange?: (isFavorite: boolean) => void;
}

const DoctorCard: React.FC<DoctorCardProps> = React.memo(({ doctor, onPress, onFavoriteChange }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    checkFavoriteStatus();
  }, [doctor.id]);

  const checkFavoriteStatus = async () => {
    const favorite = await favoriteDoctorsService.isFavorite(doctor.id);
    setIsFavorite(favorite);
  };

  const handleFavoritePress = async (e: any) => {
    e.stopPropagation();
    try {
      if (isFavorite) {
        await favoriteDoctorsService.removeFavorite(doctor.id);
        setIsFavorite(false);
      } else {
        await favoriteDoctorsService.addFavorite(doctor);
        setIsFavorite(true);
      }
      onFavoriteChange?.(isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };
  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => onPress(doctor)}
      activeOpacity={0.7}
    >
      {/* Profile Picture - Left Side */}
      <View style={styles.profileContainer}>
        <DoctorProfilePicture
          profilePictureUrl={doctor.profile_picture_url}
          profilePicture={doctor.profile_picture}
          size={70}
          style={styles.profilePicture}
          name={stripDoctorPrefix(((doctor as any).name || `${(doctor as any).first_name || ''} ${(doctor as any).last_name || ''}`.trim() || 'Doctor'))}
        />
        {/* Green dot for online doctors */}
        {doctor.is_online && (
          <View style={styles.onlineIndicator} />
        )}
      </View>
      
      {/* Content - Right Side */}
      <View style={styles.content}>
        <View style={styles.locationBadgeContainer}>
          <Text style={styles.locationBadge}>
            {doctor.country || 'Location not set'}
          </Text>
        </View>
        <Text style={styles.doctorName}>
          {`Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Dr. Unknown'}
        </Text>
        <Text style={styles.doctorInfo}>
          {(() => {
            let specializationText = '';
            if (doctor.specializations && Array.isArray(doctor.specializations) && doctor.specializations.length > 0) {
              specializationText = doctor.specializations.join(', ');
            } else {
              specializationText = doctor.specialization || 'General Medicine';
            }
            return `${specializationText} • ${doctor.years_of_experience || 0}+ years`;
          })()}
        </Text>
        
        {doctor.languages_spoken && doctor.languages_spoken.length > 0 && (
          <Text style={styles.languages}>
            Languages: {doctor.languages_spoken.join(', ')}
          </Text>
        )}
      </View>
      
      {/* Bookmark and Chevron Icons - Right Side */}
      <View style={styles.rightActions}>
        <TouchableOpacity 
          style={styles.bookmarkButton}
          onPress={handleFavoritePress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon 
            name={isFavorite ? 'bookmark' : 'bookmarkO'} 
            size={20} 
            color={isFavorite ? '#4CAF50' : '#CCC'} 
          />
        </TouchableOpacity>
        <Icon name="right" size={20} color="#4CAF50" style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  // Only re-render if doctor data actually changed
  return (
    prevProps.doctor.id === nextProps.doctor.id &&
    prevProps.doctor.is_online === nextProps.doctor.is_online &&
    prevProps.doctor.profile_picture_url === nextProps.doctor.profile_picture_url &&
    prevProps.onPress === nextProps.onPress
  );
});

DoctorCard.displayName = 'DoctorCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignSelf: 'stretch',
  },
  profileContainer: {
    position: 'relative',
    marginRight: 14,
  },
  profilePicture: {
    borderRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
  },
  locationBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  doctorInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  languages: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookmarkButton: {
    padding: 4,
  },
  chevron: {
    marginLeft: 8,
  },
});

export default DoctorCard;
