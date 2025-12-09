import React from 'react';
import { StyleSheet } from 'react-native';
import { SkeletonBox } from './SkeletonBox';

interface SkeletonCircleProps {
  size?: number;
  style?: any;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 40,
  style,
}) => {
  return (
    <SkeletonBox
      width={size}
      height={size}
      borderRadius={size / 2}
      style={[styles.circle, style]}
    />
  );
};

const styles = StyleSheet.create({
  circle: {
    // Additional circle-specific styles can be added here
  },
});
