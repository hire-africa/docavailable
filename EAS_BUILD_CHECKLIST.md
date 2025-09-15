# EAS Build Checklist for DocAvailable

## Pre-Build Checks

### ✅ Configuration Files
- [x] `app.config.js` - Properly configured with all required fields
- [x] `eas.json` - Development build configuration present
- [x] `package.json` - All dependencies compatible with Expo SDK 53
- [x] All required assets present in `assets/images/`

### ✅ Code Quality Issues

#### Console Logging (CRITICAL)
- [ ] **Excessive console.log statements** - Found 200+ console statements across files
- [ ] **Files with high console usage:**
  - `app/doctor-dashboard.tsx` - 50+ statements
  - `app/patient-dashboard.tsx` - 40+ statements
  - `contexts/AuthContext.tsx` - 30+ statements
  - Various component files with debug logging

#### Environment Variables
- [x] All `process.env` usage uses `EXPO_PUBLIC_` prefix correctly
- [x] Environment variables properly configured in `app.config.js`

#### Import Paths
- [x] All relative imports use correct paths
- [x] No absolute imports that could cause issues

### ✅ Asset Management
- [x] All `require()` statements reference existing files
- [x] Image assets present in `assets/images/`
- [x] No missing asset references

## Build Optimization Recommendations

### 1. Console Logging Cleanup
```bash
# Run the console cleanup script
node scripts/cleanup-console-logs.js
```

**Action Items:**
- Comment out excessive `console.log` statements
- Keep only essential `console.error` statements
- Consider implementing `__DEV__` checks for development-only logging

### 2. Performance Optimizations
- [ ] Remove unused imports
- [ ] Optimize large component files (doctor-dashboard.tsx is 2787 lines)
- [ ] Consider code splitting for large components

### 3. Environment Configuration
- [ ] Ensure all environment variables have fallback values
- [ ] Test with different environment configurations

## EAS Build Commands

### Development Build
```bash
eas build --platform android --profile development
```

### Preview Build
```bash
eas build --platform android --profile preview
```

### Production Build
```bash
eas build --platform android --profile production
```

## Common Build Issues & Solutions

### 1. Console Statement Overload
**Issue:** Too many console statements can impact build performance
**Solution:** Comment out or remove excessive logging

### 2. Memory Issues
**Issue:** Large files can cause memory problems during build
**Solution:** Split large components into smaller files

### 3. Asset Loading
**Issue:** Missing or incorrectly referenced assets
**Solution:** Verify all `require()` statements reference existing files

### 4. Environment Variables
**Issue:** Undefined environment variables
**Solution:** Ensure all `process.env` variables have fallback values

## Pre-Build Testing

### 1. Local Testing
```bash
# Test the app locally first
expo start
```

### 2. Linting
```bash
# Run linting to catch potential issues
npm run lint
```

### 3. Type Checking
```bash
# Check TypeScript compilation
npx tsc --noEmit
```

## Build Success Criteria

- [ ] No console statement overload
- [ ] All assets properly referenced
- [ ] Environment variables properly configured
- [ ] No TypeScript compilation errors
- [ ] No linting errors
- [ ] All imports resolve correctly

## Post-Build Verification

- [ ] App launches without crashes
- [ ] All screens render correctly
- [ ] Navigation works properly
- [ ] API calls function correctly
- [ ] No runtime errors in logs

## Emergency Fixes

If build fails, try these steps in order:

1. **Clean and rebuild:**
   ```bash
   expo install --fix
   eas build --clear-cache
   ```

2. **Remove problematic console statements:**
   ```bash
   # Use the cleanup script
   node scripts/cleanup-console-logs.js
   ```

3. **Check for missing dependencies:**
   ```bash
   npm install
   expo install
   ```

4. **Verify environment configuration:**
   - Check all environment variables
   - Ensure API endpoints are accessible

## Notes

- The current codebase has extensive console logging that should be cleaned up before production builds
- Large component files (especially doctor-dashboard.tsx) should be considered for refactoring
- All assets are properly referenced and present
- Environment configuration appears correct
- No critical blocking issues identified beyond console logging cleanup 