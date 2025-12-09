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
}

export default function BottomNavigation({ tabs, style, animatedStyle }: BottomNavigationProps) {
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
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={index}
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
      ))}
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
