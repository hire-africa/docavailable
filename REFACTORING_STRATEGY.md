# Dark Theme Refactoring Strategy

## Problem: Large Files

Files like `patient-dashboard.tsx` (5956 lines, 164 colors) are too large to refactor in one edit.

## Solution: Hybrid Approach

### Phase 1: Add Theme Hook (✅ DONE)
- Added `useThemedColors` import to patient-dashboard
- Added `const colors = useThemedColors()` at component top

### Phase 2: Create Style Generator Function

Instead of refactoring the entire StyleSheet at once, create a memoized function:

```typescript
// Add this after all the state declarations, before the functions
const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  // ... rest of styles using colors.xxx
}), [colors]); // Recreate when colors change
```

### Phase 3: Gradual Migration

For massive files, migrate in sections:

1. **Critical UI elements first** (backgrounds, text colors)
2. **Interactive elements** (buttons, inputs)
3. **Decorative elements** (shadows, borders)

## Recommended Order

### High Priority (Do These First)
1. ✅ `signup.tsx` - DONE
2. 🔄 `patient-dashboard.tsx` - IN PROGRESS (hook added, styles pending)
3. ⏳ `doctor-dashboard.tsx` - 123 colors
4. ⏳ `chat/[appointmentId].tsx` - 43 colors

### Medium Priority
5. Login screens
6. Profile screens
7. Settings screens

### Lower Priority
8. Blog screens
9. Help/support screens
10. Remaining components

## Alternative: Automated Script

For files with 100+ colors, consider creating a find/replace script:

```javascript
// Example replacements:
'#FFFFFF' → colors.white
'#000000' → colors.black
'#F5F5F5' → colors.backgroundSecondary
'#666' → colors.textSecondary
'#4CAF50' → colors.primary
```

## Current Status

### ✅ Complete
- Theme infrastructure
- Color palette (40+ tokens)
- Hooks and context
- Example refactoring (signup.tsx)
- patient-dashboard.tsx hook added

### 🚧 In Progress
- patient-dashboard.tsx styles (need to wrap in useMemo)

### ⏳ Pending
- 156+ files remaining

## Next Steps

1. **Option A**: Continue with patient-dashboard manually
   - Wrap styles in `useMemo(() => StyleSheet.create({...}), [colors])`
   - Replace hardcoded colors section by section
   
2. **Option B**: Move to smaller files first
   - Refactor login.tsx, patient-signup.tsx, doctor-signup.tsx
   - Build momentum with quick wins
   
3. **Option C**: Create automation script
   - Write script to handle common patterns
   - Manually fix edge cases

## Recommendation

**Start with Option B** - Knock out 5-10 smaller files to build momentum, then tackle the dashboards with the patterns you've learned.

Files to do next (sorted by size):
- `login.tsx` - ~20-30 colors
- `patient-signup.tsx` - 36 colors  
- `doctor-signup.tsx` - 41 colors
- `forgot-password.tsx` - ~10 colors
- `patient-profile.tsx` - ~15 colors

Once you've done 5-10 files, the pattern becomes muscle memory and the big files feel less daunting.
