/**
 * Complete color palette for light and dark themes
 * All colors are theme-aware and should be accessed via useThemedColors hook
 */

const tintColorLight = '#4CAF50';
const tintColorDark = '#66BB6A';

export const Colors = {
  light: {
    // Base colors
    text: '#11181C',
    textSecondary: '#666666',
    textTertiary: '#9E9E9E',
    background: '#FFFFFF',
    backgroundSecondary: '#F8F9FA',
    backgroundTertiary: '#F5F5F5',
    
    // Brand colors
    primary: '#4CAF50',
    primaryLight: '#81C784',
    primaryDark: '#388E3C',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3',
    
    // UI elements
    border: '#E0E0E0',
    borderLight: '#F0F0F0',
    divider: '#E0E0E0',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Cards and surfaces
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    surface: '#F8F9FA',
    
    // Interactive elements
    buttonPrimary: '#4CAF50',
    buttonSecondary: '#F8F9FA',
    buttonDisabled: '#E0E0E0',
    buttonText: '#FFFFFF',
    buttonTextSecondary: '#333333',
    
    // Input fields
    input: '#FFFFFF',
    inputBorder: '#E0E0E0',
    inputPlaceholder: '#9E9E9E',
    inputFocused: '#4CAF50',
    
    // Status colors
    online: '#4CAF50',
    offline: '#9E9E9E',
    busy: '#FF9800',
    
    // Chat specific
    chatBubbleSent: '#4CAF50',
    chatBubbleReceived: '#F5F5F5',
    chatTextSent: '#FFFFFF',
    chatTextReceived: '#11181C',
    
    // Tab bar
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    tabBar: '#FFFFFF',
    
    // Special
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    
    // Legacy aliases for backward compatibility (will be removed)
    gray: '#9E9E9E',
    lightGray: '#F5F5F5',
    lightBackground: '#F8F9FA',
  },
  dark: {
    // Base colors - Purple-ish dark theme
    text: '#E8E6F0',
    textSecondary: '#B8B5C8',
    textTertiary: '#8A8799',
    background: '#1A1625',
    backgroundSecondary: '#251E35',
    backgroundTertiary: '#2F2640',
    
    // Brand colors
    primary: '#66BB6A',
    primaryLight: '#81C784',
    primaryDark: '#4CAF50',
    success: '#66BB6A',
    error: '#EF5350',
    warning: '#FFA726',
    info: '#42A5F5',
    
    // UI elements
    border: '#3D3450',
    borderLight: '#2F2640',
    divider: '#3D3450',
    shadow: '#000000',
    overlay: 'rgba(26, 22, 37, 0.85)',
    
    // Cards and surfaces
    card: '#251E35',
    cardElevated: '#2F2640',
    surface: '#251E35',
    
    // Interactive elements
    buttonPrimary: '#66BB6A',
    buttonSecondary: '#2F2640',
    buttonDisabled: '#3D3450',
    buttonText: '#1A1625',
    buttonTextSecondary: '#E8E6F0',
    
    // Input fields
    input: '#2F2640',
    inputBorder: '#3D3450',
    inputPlaceholder: '#8A8799',
    inputFocused: '#66BB6A',
    
    // Status colors
    online: '#66BB6A',
    offline: '#808080',
    busy: '#FFA726',
    
    // Chat specific
    chatBubbleSent: '#66BB6A',
    chatBubbleReceived: '#2F2640',
    chatTextSent: '#1A1625',
    chatTextReceived: '#E8E6F0',
    
    // Tab bar
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    tabBar: '#251E35',
    
    // Special
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    
    // Legacy aliases for backward compatibility (will be removed)
    gray: '#8A8799',
    lightGray: '#2F2640',
    lightBackground: '#251E35',
  },
};
