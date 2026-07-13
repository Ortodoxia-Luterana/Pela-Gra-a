/* Tower Defense - audio sintetizado via Web Audio API (sem arquivos externos) */
(function (global) {
  'use strict';

  const MUTE_KEY = 'guardioes_muted_v1';

  class AudioManager {
    constructor() {
      this.ctx = null;
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
      this.masterGain = null;
      this.unlocked = false;
      this._unlockHandler = () => this.unlock();
      window.addEventListener('pointerdown', this._unlockHandler, { once: true });
      window.addEventListener('keydown', this._unlockHandler, { once: true });
    }

    unlock() {
      if (this.unlocked) return;
      this.unlocked = true;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.55;
      this.masterGain.connect(this.ctx.destination);
    }

    setMuted(muted) {
      this.muted = muted;
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
      if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 0.55;
    }

    toggleMuted() { this.setMuted(!this.muted); return this.muted; }

    now() { return this.ctx ? this.ctx.currentTime : 0; }

    tone(freq, duration, opts) {
      if (!this.ctx) return;
      opts = opts || {};
      const type = opts.type || 'sine';
      const gain = opts.gain != null ? opts.gain : 0.5;
      const glideTo = opts.glideTo;
      const start = this.now() + (opts.delay || 0);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), start + duration);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.02, duration * 0.3));
      g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    }

    noise(duration, opts) {
      if (!this.ctx) return;
      opts = opts || {};
      const start = this.now() + (opts.delay || 0);
      const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = opts.filterType || 'lowpass';
      filter.frequency.value = opts.filterFreq || 1200;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(opts.gain != null ? opts.gain : 0.4, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      src.start(start);
    }

    // ---- efeitos do jogo ----
    uiClick() { this.tone(520, 0.06, { type: 'square', gain: 0.18 }); }
    buy() { this.tone(440, 0.08, { type: 'triangle', gain: 0.3 }); this.tone(660, 0.1, { type: 'triangle', gain: 0.25, delay: 0.06 }); }
    place() { this.noise(0.09, { filterFreq: 900, gain: 0.35 }); }
    invalid() { this.tone(140, 0.18, { type: 'sawtooth', gain: 0.25, glideTo: 90 }); }
    fuse() {
      [523, 659, 784].forEach((f, i) => this.tone(f, 0.16, { type: 'triangle', gain: 0.32, delay: i * 0.08 }));
    }
    fire(defenseId) {
      const map = {
        spearman: [360, 'square'], archer: [900, 'triangle'], 'burning-oil': [420, 'sine'],
        barbarian: [220, 'sawtooth'], slinger: [520, 'square'], shieldbearer: [300, 'square'],
        zealot: [460, 'sawtooth'], priest: [780, 'sine'], 'fire-archer': [650, 'sine']
      };
      const [freq, type] = map[defenseId] || [600, 'triangle'];
      this.tone(freq, 0.05, { type, gain: 0.12 });
    }
    hit() { this.noise(0.04, { filterFreq: 2000, gain: 0.12 }); }
    kill(isBoss) {
      if (isBoss) { [220, 165, 110].forEach((f, i) => this.tone(f, 0.3, { type: 'sawtooth', gain: 0.3, delay: i * 0.12 })); return; }
      this.tone(880, 0.09, { type: 'triangle', gain: 0.22, glideTo: 1200 });
    }
    baseHit() { this.tone(160, 0.3, { type: 'sawtooth', gain: 0.32, glideTo: 60 }); }
    waveStart() { [330, 440, 550].forEach((f, i) => this.tone(f, 0.14, { type: 'triangle', gain: 0.3, delay: i * 0.09 })); }
    victory() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', gain: 0.34, delay: i * 0.14 })); }
    defeat() { [392, 330, 261, 220].forEach((f, i) => this.tone(f, 0.3, { type: 'sawtooth', gain: 0.28, delay: i * 0.16 })); }
  }

  global.GuardioesAudio = new AudioManager();
})(window);
