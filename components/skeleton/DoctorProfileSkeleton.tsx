import React from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { SkeletonBox, SkeletonCircle, SkeletonText } from './';

const { width } = Dimensions.get('window');

export const DoctorProfileSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={150} height={20} style={styles.headerTitle} />
        <SkeletonBox width={24} height={24} borderRadius={12} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Image */}
        <View style={styles.profileImageContainer}>
          <SkeletonCircle size={120} />
          <View style={styles.onlineStatus}>
            <SkeletonBox width={16} height={16} borderRadius={8} />
          </View>
        </View>

        {/* Doctor Info */}
        <View style={styles.doctorInfo}>
          <SkeletonText
            lines={2}
            lineHeight={24}
            spacing={8}
            width={width * 0.7}
            lastLineWidth={width * 0.5}
            style={styles.doctorName}
          />
          <SkeletonBox width={120} height={16} style={styles.specialization} />
          <SkeletonBox width={100} height={14} style={styles.experience} />
        </View>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <View style={styles.ratingContainer}>
            <SkeletonBox width={60} height={20} style={styles.rating} />
            <SkeletonBox width={80} height={14} style={styles.ratingCount} />
          </View>
          <SkeletonBox width={100} height={16} style={styles.responseTime} />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <SkeletonBox width={80} height={20} style={styles.sectionTitle} />
          <SkeletonText
            lines={4}
            lineHeight={16}
            spacing={6}
            width="100%"
            lastLineWidth="70%"
            style={styles.aboutText}
          />
        </View>

        {/* Specializations */}
        <View style={styles.section}>
          <SkeletonBox width={120} height={20} style={styles.sectionTitle} />
          <View style={styles.specializationsContainer}>
            {Array.from({ length: 3 }, (_, index) => (
              <SkeletonBox
                key={index}
                width={80}
                height={32}
                borderRadius={16}
                style={styles.specializationTag}
              />
            ))}
          </View>
        </View>

        {/* Education */}
        <View style={styles.section}>
          <SkeletonBox width={100} height={20} style={styles.sectionTitle} />
          <View style={styles.educationList}>
            {Array.from({ length: 2 }, (_, index) => (
              <View key={index} style={styles.educationItem}>
                <SkeletonBox width={40} height={40} borderRadius={20} />
                <View style={styles.educationInfo}>
                  <SkeletonText
                    lines={2}
                    lineHeight={16}
                    spacing={4}
                    width={width * 0.6}
                    lastLineWidth={width * 0.4}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Experience */}
        <View style={styles.section}>
          <SkeletonBox width={100} height={20} style={styles.sectionTitle} />
          <View style={styles.experienceList}>
            {Array.from({ length: 2 }, (_, index) => (
              <View key={index} style={styles.experienceItem}>
                <SkeletonBox width={40} height={40} borderRadius={20} />
                <View style={styles.experienceInfo}>
                  <SkeletonText
                    lines={2}
                    lineHeight={16}
                    spacing={4}
                    width={width * 0.6}
                    lastLineWidth={width * 0.4}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <SkeletonBox width={80} height={20} style={styles.sectionTitle} />
          <View style={styles.reviewsList}>
            {Array.from({ length: 3 }, (_, index) => (
              <View key={index} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <SkeletonCircle size={32} />
                  <View style={styles.reviewInfo}>
                    <SkeletonBox width={100} height={16} style={styles.reviewerName} />
                    <SkeletonBox width={60} height={14} style={styles.reviewDate} />
                  </View>
                  <SkeletonBox width={60} height={16} style={styles.reviewRating} />
                </View>
                <SkeletonText
                  lines={2}
                  lineHeight={14}
                  spacing={4}
                  width="100%"
                  lastLineWidth="80%"
                  style={styles.reviewText}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <SkeletonBox width={width * 0.45} height={50} borderRadius={25} style={styles.actionButton} />
          <SkeletonBox width={width * 0.45} height={50} borderRadius={25} style={styles.actionButton} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E9EE',
  },
  headerTitle: {
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  profileImageContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    position: 'relative',
  },
  onlineStatus: {
    position: 'absolute',
    bottom: 20,
    right: width / 2 - 60,
  },
  doctorInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  doctorName: {
    textAlign: 'center',
    marginBottom: 8,
  },
  specialization: {
    marginBottom: 4,
    borderRadius: 2,
  },
  experience: {
    borderRadius: 2,
  },
  ratingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rating: {
    borderRadius: 2,
  },
  ratingCount: {
    borderRadius: 2,
  },
  responseTime: {
    borderRadius: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    borderRadius: 4,
  },
  aboutText: {
    lineHeight: 20,
  },
  specializationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specializationTag: {
    // Additional specialization tag styles
  },
  educationList: {
    gap: 16,
  },
  educationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  educationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  experienceList: {
    gap: 16,
  },
  experienceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  experienceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reviewsList: {
    gap: 16,
  },
  reviewItem: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reviewerName: {
    marginBottom: 4,
    borderRadius: 2,
  },
  reviewDate: {
    borderRadius: 2,
  },
  reviewRating: {
    borderRadius: 2,
  },
  reviewText: {
    // Additional review text styles
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },
  actionButton: {
    // Additional action button styles
  },
});
