import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  right?: React.ReactNode;
}

const AppHeader: React.FC<AppHeaderProps> = ({ title, showBackButton, onBackPress, right }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0) },
      ]}
    >
      {showBackButton ? (
        <TouchableOpacity style={styles.left} onPress={onBackPress}>
          <FontAwesome name="arrow-left" size={24} color="#4CAF50" />
        </TouchableOpacity>
      ) : (
        <View style={styles.left} />
      )}
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {title || ''}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    zIndex: 10,
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  right: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});

export default AppHeader; 