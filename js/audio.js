/**
 * Web Audio Engine
 * Handles BGM playback, dynamic procedural music, audio file decoding (MP3/WAV),
 * sound effects (Hits, Miss, UI Clicks), and volume/mute controls.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.bgmGainNode = null;
    this.sfxGainNode = null;
    this.masterGainNode = null;

    this.bgmVolume = 0.8;
    this.sfxVolume = 0.8;
    this.isMuted = false;

    this.currentSource = null;
    this.isPlayingBGM = false;
    this.proceduralTrackTimer = null;
    this.trackStartTime = 0;
    this.audioBufferCache = new Map();

    this.loadSettings();
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGainNode = this.ctx.createGain();
      this.bgmGainNode = this.ctx.createGain();
      this.sfxGainNode = this.ctx.createGain();

      this.bgmGainNode.connect(this.masterGainNode);
      this.sfxGainNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.ctx.destination);

      this.updateGains();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('MATH_RHYTHM_SETTINGS');
      if (saved) {
        const data = JSON.parse(saved);
        this.bgmVolume = typeof data.bgmVolume === 'number' ? data.bgmVolume : 0.8;
        this.sfxVolume = typeof data.sfxVolume === 'number' ? data.sfxVolume : 0.8;
        this.isMuted = !!data.isMuted;
      }
    } catch (e) {
      console.warn('Failed to load sound settings:', e);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('MATH_RHYTHM_SETTINGS', JSON.stringify({
        bgmVolume: this.bgmVolume,
        sfxVolume: this.sfxVolume,
        isMuted: this.isMuted
      }));
    } catch (e) {
      console.warn('Failed to save sound settings:', e);
    }
  }

  setBGMVolume(val) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    this.updateGains();
    this.saveSettings();
  }

  setSFXVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    this.updateGains();
    this.saveSettings();
  }

  setMute(muted) {
    this.isMuted = !!muted;
    this.updateGains();
    this.saveSettings();
  }

  updateGains() {
    if (!this.masterGainNode) return;
    const now = this.ctx.currentTime;
    if (this.isMuted) {
      this.masterGainNode.gain.setValueAtTime(0, now);
    } else {
      this.masterGainNode.gain.setValueAtTime(1.0, now);
      this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, now);
      this.sfxGainNode.gain.setValueAtTime(this.sfxVolume, now);
    }
  }

  // --- Sound Effects Generation ---

  playUIClick() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Helper to create a snappy percussive click/clap noise transient
  playPercussiveSnap(time, duration = 0.04, freq = 3500) {
    if (!this.ctx) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, time);
      filter.Q.setValueAtTime(3.0, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.55, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGainNode);

      noise.start(time);
      noise.stop(time + duration);
    } catch (e) {
      // Fallback
    }
  }

  playHitPerfect() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.init();
    const now = this.ctx.currentTime;

    // 1. Tactile percussive snap (The "Click/Clap" transient)
    this.playPercussiveSnap(now, 0.035, 4200);

    // 2. Punchy body thump
    const bodyOsc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(700, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(180, now + 0.05);
    bodyGain.gain.setValueAtTime(0.6, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.sfxGainNode);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.08);

    // 3. Harmonious crystal chime (C6 & E6)
    [1046.5, 1318.5].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, now + 0.12);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGainNode);

      osc.start(now);
      osc.stop(now + 0.2);
    });
  }

  playHitGreat() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.init();
    const now = this.ctx.currentTime;

    // 1. Percussive snap
    this.playPercussiveSnap(now, 0.03, 3000);

    // 2. Warm punchy body
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playHitMiss() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  playComboMilestone(combo) {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.init();
    const now = this.ctx.currentTime;

    // Sparkle celebratory arpeggio: C6 -> E6 -> G6 -> C7
    const notes = [1046.5, 1318.5, 1567.98, 2093.0];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + (idx * 0.04);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGainNode);

      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  }

  // --- Decoding Audio Data ---

  async decodeAudio(arrayBuffer) {
    this.init();
    return await this.ctx.decodeAudioData(arrayBuffer);
  }

  async loadAudioFile(url) {
    if (this.audioBufferCache.has(url)) {
      return this.audioBufferCache.get(url);
    }
    this.init();
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.audioBufferCache.set(url, decodedBuffer);
      return decodedBuffer;
    } catch (e) {
      console.error('Failed to load audio file:', url, e);
      return null;
    }
  }

  // --- BGM Playback ---

  stopBGM() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {}
      this.currentSource = null;
    }

    if (this.proceduralTrackTimer) {
      clearInterval(this.proceduralTrackTimer);
      this.proceduralTrackTimer = null;
    }

    this.isPlayingBGM = false;
  }

  playAudioBuffer(buffer, offset = 0, onEnded = null) {
    this.init();
    this.stopBGM();

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.bgmGainNode);

    source.onended = () => {
      this.isPlayingBGM = false;
      if (onEnded) onEnded();
    };

    this.currentSource = source;
    this.trackStartTime = this.ctx.currentTime - offset;
    source.start(0, offset);
    this.isPlayingBGM = true;
  }

  /**
   * High quality procedural EDM/Chiptune rhythm track synthesizer
   * Plays built-in catchy beats with kick, snare, hi-hat, bass, and synth chords!
   */
  startProceduralRhythm(bpm = 128, durationSeconds = 60, onEnded = null) {
    this.init();
    this.stopBGM();

    const beatInterval = 60 / bpm; // seconds per beat
    let currentBeat = 0;
    const totalBeats = Math.ceil(durationSeconds / beatInterval);
    const startTime = this.ctx.currentTime;
    this.trackStartTime = startTime;
    this.isPlayingBGM = true;

    // Bassline notes
    const bassScale = [110, 110, 130.81, 146.83, 164.81, 130.81, 98, 110];
    const melodyScale = [440, 523.25, 587.33, 659.25, 783.99, 880];

    const scheduleBeats = () => {
      if (!this.isPlayingBGM) return;
      const aheadTime = 0.5; // schedule ahead by 500ms

      while (this.trackStartTime + (currentBeat * beatInterval) < this.ctx.currentTime + aheadTime) {
        if (currentBeat >= totalBeats) {
          this.stopBGM();
          if (onEnded) onEnded();
          return;
        }

        const beatTime = this.trackStartTime + (currentBeat * beatInterval);

        // 1. Kick Drum (every 1st and 3rd beat or four-on-the-floor)
        if (currentBeat % 2 === 0 || bpm >= 120) {
          this.synthesizeDrum('kick', beatTime);
        }

        // 2. Snare / Clap (every 2nd and 4th beat in 4/4)
        if (currentBeat % 4 === 2) {
          this.synthesizeDrum('snare', beatTime);
        }

        // 3. Hi-Hat (eighth notes)
        this.synthesizeDrum('hihat', beatTime);
        this.synthesizeDrum('hihat', beatTime + (beatInterval / 2));

        // 4. Bass synth
        const bassFreq = bassScale[currentBeat % bassScale.length];
        this.synthesizeBass(bassFreq, beatTime, beatInterval * 0.8);

        // 5. Arpeggio / melody
        if (currentBeat % 2 === 1) {
          const melFreq = melodyScale[(currentBeat * 2) % melodyScale.length];
          this.synthesizeMelody(melFreq, beatTime, beatInterval * 0.4);
        }

        currentBeat++;
      }
    };

    scheduleBeats();
    this.proceduralTrackTimer = setInterval(scheduleBeats, 100);
  }

  synthesizeDrum(type, time) {
    if (this.isMuted || this.bgmVolume <= 0) return;
    const now = Math.max(this.ctx.currentTime, time);

    if (type === 'kick') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

      gain.gain.setValueAtTime(0.6 * this.bgmVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.bgmGainNode);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'snare') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);

      gain.gain.setValueAtTime(0.35 * this.bgmVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.bgmGainNode);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'hihat') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(8000, now);

      gain.gain.setValueAtTime(0.12 * this.bgmVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.bgmGainNode);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  }

  synthesizeBass(freq, time, duration) {
    if (this.isMuted || this.bgmVolume <= 0) return;
    const now = Math.max(this.ctx.currentTime, time);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.25 * this.bgmVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.bgmGainNode);
    osc.start(now);
    osc.stop(now + duration);
  }

  synthesizeMelody(freq, time, duration) {
    if (this.isMuted || this.bgmVolume <= 0) return;
    const now = Math.max(this.ctx.currentTime, time);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.2 * this.bgmVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.bgmGainNode);
    osc.start(now);
    osc.stop(now + duration);
  }

  getCurrentAudioTime() {
    if (!this.ctx) return 0;
    return Math.max(0, this.ctx.currentTime - this.trackStartTime);
  }
}

window.soundEngine = new SoundEngine();
