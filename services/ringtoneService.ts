import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

class RingtoneService {
  private sound: Audio.Sound | null = null;
  private playing = false;
  private loadingPromise: Promise<void> | null = null;

  private async ensureAudioMode() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: true, // Use call volume (earpiece/speaker)
    });
  }

  async start() {
    if (this.playing) {
      console.log('🔔 Ringtone already playing');
      return;
    }
    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }
    
    console.log('🔔 Starting ringtone...');
    this.loadingPromise = (async () => {
      try {
        await this.ensureAudioMode();
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/facetime-call.mp3'),
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        this.sound = sound;
        this.playing = true;
        console.log('🔔 Ringtone started successfully');
      } catch (e) {
        console.error('🔔 Failed to start ringtone:', e);
        this.sound = null;
        this.playing = false;
      } finally {
        this.loadingPromise = null;
      }
    })();
    await this.loadingPromise;
  }

  async stop() {
    console.log('🔕 Stopping ringtone...');
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        console.log('🔕 Ringtone stopped successfully');
      } else {
        console.log('🔕 No ringtone sound to stop');
      }
    } catch (e) {
      console.error('🔕 Error stopping ringtone:', e);
    }
    this.sound = null;
    this.playing = false;
    this.loadingPromise = null;
  }
}

export default new RingtoneService();
