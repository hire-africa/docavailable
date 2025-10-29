# Video Call Sound Fix - Troubleshooting Guide

## Issues Fixed

### 1. **Invalid Volume Setting**
- **Problem**: Volume was set to `3.0` which is out of valid range (0.0-1.0)
- **Fix**: Changed to `1.0` (maximum volume)
- **Location**: `playSound` function in `VideoCallModal.tsx`

### 2. **File Name Case Sensitivity**
- **Problem**: File was named `facetime-connect.MP3` (uppercase) but code required `facetime-connect.mp3` (lowercase)
- **Fix**: Renamed file to lowercase `.mp3` extension
- **Location**: `assets/sounds/facetime-connect.mp3`

### 3. **Audio Mode Configuration**
- **Problem**: Audio mode might conflict with WebRTC during active call
- **Fix**: Updated audio mode settings:
  - Changed `shouldDuckAndroid: false` to `true` (allows mixing with WebRTC)
  - Added `interruptionModeIOS: 1` and `interruptionModeAndroid: 1`
- **Location**: Sound preload section in `VideoCallModal.tsx`

### 4. **Enhanced Logging**
- Added comprehensive console logging to track:
  - Sound loading status
  - When sounds are triggered
  - Playback success/failure
  - Connection state changes

## How to Test

1. **Clear app cache and rebuild**:
   ```bash
   npx expo start --clear
   ```

2. **Make a video call and watch console logs**:
   - Look for: `[VideoCallModal] Setting audio mode...`
   - Look for: `[VideoCallModal] Sounds loaded successfully`
   - Look for: `[VideoCallModal] Call connected! Setting up connect sound...`
   - Look for: `[VideoCallModal] Playing sound...`
   - Look for: `[VideoCallModal] Sound played successfully`

3. **Check for errors**:
   - If you see `playSound failed:` - there's an issue with sound playback
   - If you see `Sound preload failed:` - there's an issue loading the files

## Expected Behavior

### Connect Sound
- Plays **2 seconds** after call connects
- Only plays **once per call**
- Should hear: `facetime-connect.mp3`

### Hangup Sound
- Plays **immediately** when call ends
- Only plays **once per call**
- Should hear: `facetime-hang-up.mp3`

## Console Log Flow (Normal Operation)

```
[VideoCallModal] Setting audio mode...
[VideoCallModal] Loading sound files...
[VideoCallModal] Loading connect sound...
[VideoCallModal] Loading hangup sound...
[VideoCallModal] Sounds loaded successfully
[VideoCallModal] Call connected! Setting up connect sound...
[VideoCallModal] Scheduling connect sound (2s delay)...
[VideoCallModal] Connect sound timeout fired. soundsLoaded: true
[VideoCallModal] Attempting to play connect sound...
[VideoCallModal] Playing sound...
[VideoCallModal] Sound played successfully
```

## Troubleshooting

### If sounds still don't play:

1. **Check device volume**: Ensure device is not muted
2. **Check audio permissions**: Verify app has microphone/audio permissions
3. **Check file existence**: Verify files exist in `assets/sounds/`
4. **Check WebRTC audio session**: WebRTC might be blocking audio playback
5. **Try on different device**: Some devices have stricter audio policies

### Alternative Fix (if above doesn't work):

The issue might be that WebRTC's audio session is preventing other sounds from playing. In that case, we may need to:
1. Temporarily release WebRTC audio session
2. Play the sound
3. Re-establish WebRTC audio session

This would require more invasive changes to the audio handling.

## Files Modified

1. `components/VideoCallModal.tsx`
   - Fixed volume setting (line 122)
   - Enhanced audio mode configuration (lines 178-186)
   - Added comprehensive logging throughout
   
2. `assets/sounds/facetime-connect.mp3`
   - Renamed from `.MP3` to `.mp3`
