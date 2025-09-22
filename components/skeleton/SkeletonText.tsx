import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox } from './SkeletonBox';

interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  spacing?: number;
  width?: number | string;
  lastLineWidth?: number | string;
  style?: any;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 1,
  lineHeight = 16,
  spacing = 8,
  width = '100%',
  lastLineWidth,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonBox
          key={index}
          width={index === lines - 1 && lastLineWidth ? lastLineWidth : width}
          height={lineHeight}
          style={[
            styles.line,
            index < lines - 1 && { marginBottom: spacing },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  line: {
    borderRadius: 2,
  },
});
