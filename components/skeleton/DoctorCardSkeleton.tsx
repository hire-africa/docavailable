import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox } from './SkeletonBox';
import { SkeletonCircle } from './SkeletonCircle';

interface DoctorCardSkeletonProps {
  count?: number;
}

export const DoctorCardSkeleton: React.FC<DoctorCardSkeletonProps> = ({ count = 5 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.card}>
          {/* Profile Picture - Left Side */}
          <View style={styles.profileContainer}>
            <SkeletonCircle size={70} />
          </View>
          
          {/* Content - Right Side */}
          <View style={styles.content}>
            {/* Location Badge */}
            <SkeletonBox 
              width={80} 
              height={18} 
              borderRadius={10}
              style={styles.locationBadge}
            />
            
            {/* Doctor Name */}
            <SkeletonBox 
              width="70%" 
              height={20} 
              borderRadius={4}
              style={styles.doctorName}
            />
            
            {/* Doctor Info */}
            <SkeletonBox 
              width="85%" 
              height={16} 
              borderRadius={4}
              style={styles.doctorInfo}
            />
            
            {/* Languages (optional) */}
            <SkeletonBox 
              width="60%" 
              height={14} 
              borderRadius={4}
              style={styles.languages}
            />
          </View>
          
          {/* Chevron placeholder */}
          <View style={styles.chevronPlaceholder} />
        </View>
      ))}
    </>
  );
};

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
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  locationBadge: {
    marginBottom: 6,
  },
  doctorName: {
    marginBottom: 4,
  },
  doctorInfo: {
    marginBottom: 6,
  },
  languages: {
    // Last item, no margin needed
  },
  chevronPlaceholder: {
    width: 20,
    marginLeft: 8,
  },
});
