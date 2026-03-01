import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { Platform, Vibration } from 'react-native';

class RingtoneService {
  private sound: Audio.Sound | null = null;
  private playing = false;
  private loadingPromise: Promise<void> | null = null;
  private vibrationInterval: ReturnType<typeof setInterval> | null = null;

  private async ensureAudioMode() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      staysActiveInBackground: true,
      playThroughEarpieceAndroid: false, // Use loud speaker (not earpiece)
    });
  }

  async start() {
    if (this.playing) {
      console.log('🔔 System ringtone already playing');
      return;
    }

    // ⚠️ CRITICAL: Set audio mode BEFORE creating any sounds
    await this.ensureAudioMode();

    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }

    console.log('🔔 Starting system ringtone and vibration...');
    this.loadingPromise = (async () => {
      try {
        await this.ensureAudioMode();

        // Use proper ringtone playback - improved approach
        if (Platform.OS === 'android') {
          // On Android, use notification sound which plays system ringtone
          // This is the most reliable way to play ringtone on Android
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Incoming Call',
                body: 'DocAvailable call',
                sound: 'ringtone', // Uses system ringtone from res/raw
                priority: Notifications.AndroidNotificationPriority.MAX,
                vibrate: [0, 1000, 500, 1000],
                // @ts-ignore - channelId is supported on Android
                channelId: 'incoming_calls_v3',
              },
              trigger: null, // Show immediately
            });
            console.log('🔔 Android notification ringtone scheduled');

            // Also try to play a looping sound for continuous ringing
            // Use a simple beep pattern
            try {
              const { sound } = await Audio.Sound.createAsync(
                { uri: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OSfTQ8OUKjk8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBtpvfDkn00PDlCo5PC2YxwGOJHX8sx5LAUkd8fw3ZBAC' },
                {
                  shouldPlay: true,
                  isLooping: true,
                  volume: 0.8, // Slightly lower volume
                  progressUpdateIntervalMillis: 1000,
                }
              );
              this.sound = sound;
              console.log('🔔 Android audio ringtone also playing');
            } catch (audioError) {
              console.warn('⚠️ Audio ringtone failed, using notification only:', audioError);
            }
          } catch (notifError) {
            console.error('❌ Failed to schedule notification ringtone:', notifError);
            throw notifError;
          }
        } else {
          // On iOS, use system sound
          try {
            // Use a simple system sound that's available
            const { sound } = await Audio.Sound.createAsync(
              { uri: 'system://ringtone' },
              {
                shouldPlay: true,
                isLooping: true,
                volume: 1.0,
                progressUpdateIntervalMillis: 1000,
              }
            );
            this.sound = sound;
            console.log('🔔 Using iOS system ringtone');
          } catch (systemError) {
            // Fallback: Try a different approach
            console.warn('⚠️ System ringtone failed, trying alternative:', systemError);
            // Just use vibration as fallback
            console.log('🔔 Falling back to vibration only');
          }
        }

        // Add continuous vibration pattern for incoming calls
        this.startVibrationPattern();

        this.playing = true;
        console.log('🔔 System ringtone and vibration started successfully');
      } catch (e) {
        console.error('🔔 Failed to start system ringtone:', e);
        // Fallback to vibration only
        this.startVibrationPattern();
        this.playing = true;
      } finally {
        this.loadingPromise = null;
      }
    })();
    await this.loadingPromise;
  }

  private startVibrationPattern() {
    // Start immediate vibration
    Vibration.vibrate([0, 1000, 500, 1000]);

    // Continue vibration pattern every 2 seconds
    this.vibrationInterval = setInterval(() => {
      if (this.playing) {
        Vibration.vibrate([0, 1000, 500, 1000]);
      }
    }, 2000);
  }

  async stop() {
    console.log('🔕 Stopping system ringtone and vibration...');
    try {
      // Stop vibration pattern
      if (this.vibrationInterval) {
        clearInterval(this.vibrationInterval);
        this.vibrationInterval = null;
      }

      // Stop vibration immediately
      Vibration.cancel();

      // Stop sound if playing
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        console.log('🔕 System ringtone stopped successfully');
      }

      // Cancel any pending notifications (Android)
      if (Platform.OS === 'android') {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.dismissAllNotificationsAsync(); // Kill looping sounds
      }

    } catch (e) {
      console.error('🔕 Error stopping system ringtone:', e);
    }

    this.sound = null;
    this.playing = false;
    this.loadingPromise = null;
    console.log('🔕 System ringtone and vibration stopped');
  }

  isPlaying(): boolean {
    return this.playing;
  }
}

export default new RingtoneService();
