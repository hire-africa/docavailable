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
      playThroughEarpieceAndroid: false,
    });
  }

  async start() {
    if (this.playing) return;
    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }
    this.loadingPromise = (async () => {
      try {
        await this.ensureAudioMode();
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/facetime-call.mp3'),
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        this.sound = sound;
        this.playing = true;
      } catch (e) {
        this.sound = null;
        this.playing = false;
      } finally {
        this.loadingPromise = null;
      }
    })();
    await this.loadingPromise;
  }

  async stop() {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      }
    } catch {}
    this.sound = null;
    this.playing = false;
  }
}

export default new RingtoneService();
