/**
 * Audio manager using HTML5 Audio element.
 * Simpler and more reliable than Web Audio API for BGM looping.
 * No crackling, no gain scheduling issues.
 */
export function createAudioManager() {
  let bgmEl = null;
  let currentBgmUrl = null;
  let muted = false;
  try { muted = localStorage.getItem('pg_audio_muted') === 'true'; } catch { /* ignore */ }
  let bgmVolume = 0.25;
  let initialized = false;

  function ensureBgmElement() {
    if (bgmEl) return bgmEl;
    bgmEl = document.createElement('audio');
    bgmEl.loop = true;
    bgmEl.volume = muted ? 0 : bgmVolume;
    bgmEl.preload = 'auto';
    return bgmEl;
  }

  return {
    init() {
      if (initialized) return;
      initialized = true;
      ensureBgmElement();
    },

    isReady() { return initialized; },

    async playBgm(url) {
      if (!initialized || !url) return;
      if (url === currentBgmUrl && bgmEl && !bgmEl.paused) return;

      const el = ensureBgmElement();

      // Fade out current if playing
      if (!el.paused && currentBgmUrl) {
        // Quick fade out
        const startVol = el.volume;
        const steps = 10;
        for (let i = steps; i >= 0; i--) {
          el.volume = startVol * (i / steps);
          await new Promise(r => setTimeout(r, 80));
        }
        el.pause();
      }

      el.src = url;
      el.volume = 0;
      currentBgmUrl = url;

      try {
        await el.play();
        // Fade in
        const targetVol = muted ? 0 : bgmVolume;
        const steps = 15;
        for (let i = 1; i <= steps; i++) {
          el.volume = targetVol * (i / steps);
          await new Promise(r => setTimeout(r, 100));
        }
      } catch (e) {
        console.warn('[Audio] BGM play failed:', e.message);
      }
    },

    playSfx(_url) {
      // SFX placeholder — currently no-op until real SFX files are added
    },

    setMuted(val) {
      muted = val;
      try { localStorage.setItem('pg_audio_muted', String(muted)); } catch { /* ignore */ }
      if (bgmEl) bgmEl.volume = muted ? 0 : bgmVolume;
    },

    toggleMute() {
      this.setMuted(!muted);
      return muted;
    },

    isMuted() { return muted; },

    /** Call periodically to auto-switch BGM based on time/weather */
    updateForScene(weatherCurrent, hour) {
      if (!initialized) return;
      let targetBgm = '/assets/audio/bgm-day.mp3';
      if (weatherCurrent === 'rain' || weatherCurrent === 'storm') {
        targetBgm = '/assets/audio/bgm-rain.mp3';
      } else if (hour >= 20 || hour < 6) {
        targetBgm = '/assets/audio/bgm-night.mp3';
      }
      if (targetBgm !== currentBgmUrl) {
        this.playBgm(targetBgm);
      }
    },
  };
}
