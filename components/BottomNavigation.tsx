import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';

interface TabItem {
  icon: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
  badge?: number;
}

interface BottomNavigationProps {
  tabs: TabItem[];
  style?: any;
  animatedStyle?: any;
  tabRefs?: Record<string, React.RefObject<View>>; // Optional refs for tour highlighting
}

export default function BottomNavigation({ tabs, style, animatedStyle, tabRefs }: BottomNavigationProps) {
  const insets = useSafeAreaInsets();

  return (
    <View 
      style={[
        styles.bottomNav,
        { paddingBottom: Math.max(insets.bottom, 12) },
        style,
        animatedStyle
      ]}
    >
      {tabs.map((tab, index) => {
        // Map tab index to ref key
        // For patient: home=0, discover=1, messages=2, blogs=3, docbot=4
        // For doctor: home=0, appointments=1, messages=2, working-hours=3
        let refKey = `tab-${index}`;
        if (index === 0) {
          refKey = 'home-tab';
        } else if (tabs.length === 4) {
          // Doctor tabs
          if (index === 1) refKey = 'appointments-tab';
          else if (index === 2) refKey = 'messages-tab';
          else if (index === 3) refKey = 'working-hours-tab';
        } else if (tabs.length === 5) {
          // Patient tabs
          if (index === 1) refKey = 'discover-tab';
          else if (index === 2) refKey = 'messages-tab';
          else if (index === 3) refKey = 'blogs-tab';
          else if (index === 4) refKey = 'docbot-tab';
        }
        const tabRef = tabRefs?.[refKey];
        
        return (
        <TouchableOpacity
          key={index}
          ref={tabRef}
          style={styles.tab}
          onPress={tab.onPress}
        >
          <View style={styles.tabContent}>
            <Icon 
              name={tab.icon} 
              size={20} 
              color={tab.isActive ? '#4CAF50' : '#666'} 
            />
            <Text style={[
              styles.tabLabel,
              tab.isActive && styles.activeTabLabel
            ]}>
              {tab.label}
            </Text>
            {tab.badge && tab.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{tab.badge}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    marginBottom: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabContent: {
    alignItems: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    zIndex: 10,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
