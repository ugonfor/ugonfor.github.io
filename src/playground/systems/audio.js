/**
 * Audio manager using Web Audio API.
 * Handles BGM loops with crossfade, SFX one-shots, and mute toggle.
 */
export function createAudioManager() {
  let ctx = null;
  let masterGain = null;
  let bgmGain = null;
  let currentBgmSource = null;
  let currentBgmUrl = null;
  let muted = false;
  try { muted = localStorage.getItem('pg_audio_muted') === 'true'; } catch { /* ignore */ }
  const audioCache = new Map();  // url -> AudioBuffer

  async function loadAudio(url) {
    if (audioCache.has(url)) return audioCache.get(url);
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const arrayBuf = await resp.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      audioCache.set(url, audioBuf);
      return audioBuf;
    } catch (e) {
      console.warn('[Audio] Failed to load:', url, e.message);
      return null;
    }
  }

  return {
    init() {
      if (ctx) return;
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.value = muted ? 0 : 1;
      bgmGain = ctx.createGain();
      bgmGain.gain.value = 0.3;
      bgmGain.connect(masterGain);
    },

    isReady() { return !!ctx; },

    async playBgm(url, fadeInSec = 2) {
      if (!ctx || !url) return;
      if (url === currentBgmUrl) return;

      // Fade out current
      if (currentBgmSource) {
        bgmGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        const oldSource = currentBgmSource;
        currentBgmSource = null;
        setTimeout(() => {
          try { oldSource.stop(); } catch (e) { /* ignore */ }
        }, 1100);
        await new Promise(r => setTimeout(r, 1200));
      }

      const buf = await loadAudio(url);
      if (!buf) {
        currentBgmUrl = null;
        return;
      }

      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop = true;
      source.connect(bgmGain);
      source.start();

      // Fade in
      bgmGain.gain.setValueAtTime(0, ctx.currentTime);
      bgmGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + fadeInSec);

      currentBgmSource = source;
      currentBgmUrl = url;
    },

    async playSfx(url, volume = 0.5) {
      if (!ctx || muted) return;
      const buf = await loadAudio(url);
      if (!buf) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = volume;
      source.buffer = buf;
      source.connect(gain);
      gain.connect(masterGain);
      source.start();
    },

    setMuted(val) {
      muted = val;
      try { localStorage.setItem('pg_audio_muted', muted); } catch { /* ignore */ }
      if (masterGain) masterGain.gain.value = muted ? 0 : 1;
    },

    toggleMute() {
      this.setMuted(!muted);
      return muted;
    },

    isMuted() { return muted; },

    /** Call periodically to auto-switch BGM based on time/weather */
    updateForScene(weatherCurrent, hour) {
      if (!ctx) return;
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
