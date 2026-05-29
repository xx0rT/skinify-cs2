// Sound utility for playing audio effects
class SoundManager {
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private enabled = true;
  private userInteracted = false;

  constructor() {
    this.preloadSounds();
    this.setupUserInteractionListener();
  }

  private setupUserInteractionListener() {
    // Enable audio after first user interaction
    const enableAudio = () => {
      this.userInteracted = true;
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
      console.log('🔊 Audio enabled after user interaction');
    };

    document.addEventListener('click', enableAudio);
    document.addEventListener('touchstart', enableAudio);
  }

  private preloadSounds() {
    const soundFiles = {
      orderSuccess: './ordersuccess.mp3',
      addToCart: './addtocart.mp3',
      messageSent: './messagesent.mp3',
      messageReceived: './messagerecived.mp3'
    };

    Object.entries(soundFiles).forEach(([key, path]) => {
      try {
        const audio = new Audio(path);
        audio.preload = 'metadata';
        audio.volume = 0.3; // Set moderate volume
        audio.crossOrigin = 'anonymous';
        this.sounds[key] = audio;
        
        // Log when each sound loads
        audio.addEventListener('canplaythrough', () => {
          console.log(`🔊 ✅ Sound "${key}" loaded successfully from ${path}`);
        });
        
        audio.addEventListener('error', (e) => {
          console.error(`🔇 ❌ Failed to load sound "${key}" from ${path}:`, e);
          console.error('🔧 Make sure the audio file exists in the public folder');
        });
      } catch (error) {
        console.error(`🔇 ❌ Exception while preloading sound "${key}":`, error);
      }
    });
  }

  public playSound(soundName: keyof typeof this.sounds) {
    if (!this.enabled || !this.userInteracted) {
      if (!this.userInteracted) {
        console.warn(`🔇 Sound "${soundName}" blocked - need user interaction first. Click anywhere on the page to enable audio.`);
      } else {
        console.log(`🔇 Sound "${soundName}" disabled by user settings`);
      }
      return;
    }

    try {
      const sound = this.sounds[soundName];
      if (sound) {
        // Reset to beginning and play
        sound.currentTime = 0;
        sound.volume = 0.3; // Ensure volume is set
        const playPromise = sound.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log(`🔊 ✅ Sound "${soundName}" played successfully`);
          }).catch(error => {
            console.warn(`🔇 ❌ Sound "${soundName}" auto-play prevented:`, error.name, error.message);
          });
        }
      } else {
        console.error(`🔇 ❌ Sound "${soundName}" not found in preloaded sounds. Available:`, Object.keys(this.sounds));
      }
    } catch (error) {
      console.error(`🔇 ❌ Critical error playing sound "${soundName}":`, error);
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public setVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach(sound => {
      sound.volume = clampedVolume;
    });
  }
}

// Create singleton instance
export const soundManager = new SoundManager();

// Convenience functions
export const playOrderSuccess = () => soundManager.playSound('orderSuccess');
export const playAddToCart = () => soundManager.playSound('addToCart');
export const playMessageSent = () => soundManager.playSound('messageSent');
export const playMessageReceived = () => soundManager.playSound('messageReceived');

// React hook for sound management
export const useSoundManager = () => {
  return {
    playOrderSuccess,
    playAddToCart,
    playMessageSent,
    playMessageReceived,
    setEnabled: (enabled: boolean) => soundManager.setEnabled(enabled),
    setVolume: (volume: number) => soundManager.setVolume(volume)
  };
};