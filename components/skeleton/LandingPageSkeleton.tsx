import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { SkeletonBox } from './SkeletonBox';
import { SkeletonText } from './SkeletonText';

const { width, height } = Dimensions.get('window');

export const LandingPageSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Doctor Illustration Skeleton */}
      <View style={styles.illustrationContainer}>
        <SkeletonBox
          width={180}
          height={135}
          borderRadius={12}
          style={styles.doctorImage}
        />
      </View>

      {/* Main Heading Skeleton */}
      <View style={styles.headingContainer}>
        <SkeletonText
          lines={2}
          lineHeight={24}
          spacing={12}
          width={width * 0.8}
          lastLineWidth={width * 0.6}
          style={styles.mainHeading}
        />
      </View>

      {/* Subheading Skeleton */}
      <SkeletonText
        lines={2}
        lineHeight={16}
        spacing={8}
        width={width * 0.9}
        lastLineWidth={width * 0.7}
        style={styles.subheading}
      />

      {/* Buttons Container Skeleton */}
      <View style={styles.buttonContainer}>
        {/* Doctor Button Skeleton */}
        <SkeletonBox
          width={width * 0.8}
          height={50}
          borderRadius={25}
          style={styles.doctorButton}
        />

        {/* Patient Button Skeleton */}
        <SkeletonBox
          width={width * 0.8}
          height={50}
          borderRadius={25}
          style={styles.patientButton}
        />
      </View>

      {/* Footer Skeleton */}
      <View style={styles.footer}>
        <SkeletonBox width={150} height={14} borderRadius={2} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 180,
  },
  doctorImage: {
    marginTop: -110,
  },
  headingContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  mainHeading: {
    textAlign: 'center',
  },
  subheading: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 120,
    marginTop: 80,
  },
  doctorButton: {
    marginBottom: 16,
  },
  patientButton: {
    // Additional patient button styles if needed
  },
  footer: {
    alignItems: 'center',
  },
});
