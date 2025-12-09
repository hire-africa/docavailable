// TEMPORARY TEST FILE - Add this button to any screen to test dark mode

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemedColors } from '@/hooks/useThemedColors';

export function TestDarkModeButton() {
  const { theme, toggleTheme, isAnonymousMode } = useTheme();
  const colors = useThemedColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.info, { color: colors.text }]}>
        Current Theme: {theme}
      </Text>
      <Text style={[styles.info, { color: colors.textSecondary }]}>
        Anonymous Mode: {isAnonymousMode ? 'ON' : 'OFF'}
      </Text>
      
      <TouchableOpacity 
        onPress={toggleTheme}
        disabled={isAnonymousMode}
        style={[
          styles.button, 
          { 
            backgroundColor: colors.primary,
            opacity: isAnonymousMode ? 0.5 : 1
          }
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.white }]}>
          {isAnonymousMode 
            ? 'Theme Locked (Anonymous Mode)'
            : `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`
          }
        </Text>
      </TouchableOpacity>
      
      <View style={[styles.preview, { backgroundColor: colors.background }]}>
        <Text style={[styles.previewText, { color: colors.text }]}>
          Background Color
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.previewText, { color: colors.text }]}>
            Card Color
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    margin: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  info: {
    fontSize: 14,
    marginBottom: 8,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  preview: {
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
  },
  previewText: {
    fontSize: 14,
    marginBottom: 8,
  },
  card: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
});

// HOW TO USE:
// 1. Import this component in any screen:
//    import { TestDarkModeButton } from '@/TEST_DARK_MODE';
//
// 2. Add it to your render:
//    <TestDarkModeButton />
//
// 3. It will show current theme state and allow manual switching
