import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Vibration, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

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
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false, // Use media volume for ringtone
    });
  }

  async start() {
    if (this.playing) {
      console.log('🔔 System ringtone already playing');
      return;
    }
    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }
    
    console.log('🔔 Starting system ringtone and vibration...');
    this.loadingPromise = (async () => {
      try {
        await this.ensureAudioMode();
        
        // Use system default ringtone instead of custom sound
        if (Platform.OS === 'android') {
          // On Android, use system ringtone via notification sound
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Incoming Call',
              body: 'DocAvailable call',
              sound: 'default', // This uses system ringtone
              priority: Notifications.AndroidNotificationPriority.MAX,
              vibrate: [0, 250, 250, 250],
            },
            trigger: null, // Show immediately
          });
        } else {
          // On iOS, use system sound
          const { sound } = await Audio.Sound.createAsync(
            { uri: 'system://ringtone' }, // Use system ringtone
            { 
              shouldPlay: true, 
              isLooping: true, 
              volume: 1.0,
              progressUpdateIntervalMillis: 1000,
            }
          );
          this.sound = sound;
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
