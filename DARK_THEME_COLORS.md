# Dark Theme Color Palette - Purple-ish

## 🎨 Color Scheme Overview

The dark theme uses a **deep purple-ish** color scheme that's easy on the eyes and provides excellent contrast.

### Base Colors

| Color Name | Hex Code | Usage | Visual |
|------------|----------|-------|--------|
| **background** | `#1A1625` | Main app background | Deep purple-black |
| **backgroundSecondary** | `#251E35` | Cards, sections | Slightly lighter purple |
| **backgroundTertiary** | `#2F2640` | Elevated elements | Medium purple |
| **text** | `#E8E6F0` | Primary text | Light lavender-white |
| **textSecondary** | `#B8B5C8` | Secondary text | Muted lavender |
| **textTertiary** | `#8A8799` | Tertiary text | Dim lavender-gray |

### UI Elements

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **border** | `#3D3450` | Borders, dividers |
| **borderLight** | `#2F2640` | Subtle borders |
| **card** | `#251E35` | Card backgrounds |
| **cardElevated** | `#2F2640` | Elevated cards |
| **overlay** | `rgba(26, 22, 37, 0.85)` | Modal overlays |

### Interactive Elements

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **buttonPrimary** | `#66BB6A` | Primary action buttons |
| **buttonSecondary** | `#2F2640` | Secondary buttons |
| **buttonDisabled** | `#3D3450` | Disabled state |
| **input** | `#2F2640` | Input backgrounds |
| **inputBorder** | `#3D3450` | Input borders |
| **inputPlaceholder** | `#8A8799` | Placeholder text |

### Brand & Status Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **primary** | `#66BB6A` | Brand green (unchanged) |
| **success** | `#66BB6A` | Success states |
| **error** | `#EF5350` | Error states |
| **warning** | `#FFA726` | Warning states |
| **info** | `#42A5F5` | Info states |

### Chat Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **chatBubbleSent** | `#66BB6A` | Sent message bubbles |
| **chatBubbleReceived** | `#2F2640` | Received message bubbles |
| **chatTextSent** | `#1A1625` | Sent message text |
| **chatTextReceived** | `#E8E6F0` | Received message text |

## 🌈 Color Hierarchy

```
Darkest → Lightest (Backgrounds)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#1A1625 (background)
   ↓
#251E35 (backgroundSecondary, card)
   ↓
#2F2640 (backgroundTertiary, cardElevated)
   ↓
#3D3450 (border, buttonDisabled)
```

```
Darkest → Lightest (Text)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#8A8799 (textTertiary, inputPlaceholder)
   ↓
#B8B5C8 (textSecondary)
   ↓
#E8E6F0 (text)
   ↓
#FFFFFF (white - for emphasis)
```

## 💡 Design Philosophy

1. **Purple-ish Base**: Deep purple tones (#1A1625) instead of pure black/gray
2. **Subtle Gradation**: 3-level depth system for visual hierarchy
3. **Lavender Text**: Soft lavender tones for text instead of pure white
4. **Green Accent**: Kept the brand green (#66BB6A) for consistency
5. **High Contrast**: Ensures WCAG AA compliance for accessibility

## 🎯 Usage Examples

### Card on Background
```typescript
<View style={{ backgroundColor: colors.background }}>
  <View style={{ 
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1
  }}>
    <Text style={{ color: colors.text }}>Title</Text>
    <Text style={{ color: colors.textSecondary }}>Subtitle</Text>
  </View>
</View>
```

### Button Styles
```typescript
// Primary button
<TouchableOpacity style={{ 
  backgroundColor: colors.buttonPrimary 
}}>
  <Text style={{ color: colors.buttonText }}>Action</Text>
</TouchableOpacity>

// Secondary button
<TouchableOpacity style={{ 
  backgroundColor: colors.buttonSecondary,
  borderColor: colors.border,
  borderWidth: 1
}}>
  <Text style={{ color: colors.buttonTextSecondary }}>Cancel</Text>
</TouchableOpacity>
```

### Input Fields
```typescript
<TextInput
  style={{
    backgroundColor: colors.input,
    borderColor: colors.inputBorder,
    color: colors.text
  }}
  placeholderTextColor={colors.inputPlaceholder}
  placeholder="Enter text..."
/>
```

## 🔄 Light vs Dark Comparison

| Element | Light Theme | Dark Theme |
|---------|-------------|------------|
| Background | `#FFFFFF` (White) | `#1A1625` (Deep Purple) |
| Card | `#FFFFFF` (White) | `#251E35` (Purple) |
| Text | `#11181C` (Dark Gray) | `#E8E6F0` (Lavender) |
| Border | `#E0E0E0` (Light Gray) | `#3D3450` (Purple-Gray) |
| Primary | `#4CAF50` (Green) | `#66BB6A` (Light Green) |

## ✨ Visual Mood

- **Professional yet Friendly**: Purple conveys creativity and sophistication
- **Easy on Eyes**: Reduced blue light compared to pure black/white
- **Modern**: Trendy purple-dark aesthetic popular in modern apps
- **Calming**: Purple tones are less harsh than pure grays
