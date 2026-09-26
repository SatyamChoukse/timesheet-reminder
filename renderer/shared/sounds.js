// Synthesised sounds (Web Audio) – no audio files needed. A custom bark file
// (data: URL) replaces the synthesised bark/meow when the user picked one.
window.DogSounds = (() => {
  let ctx = null;
  const ac = () => {
    ctx = ctx || new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  function envelope(gain, t0, peak, attack, release) {
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + release);
  }

  function woof(t0, pitch = 1, loud = 1) {
    const c = ac();
    // Voiced part: falling sawtooth through a resonant low-pass
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(430 * pitch, t0);
    osc.frequency.exponentialRampToValueAtTime(150 * pitch, t0 + 0.18);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 7;
    lp.frequency.setValueAtTime(1900, t0);
    lp.frequency.exponentialRampToValueAtTime(450, t0 + 0.2);
    const g = c.createGain();
    envelope(g, t0, 0.55 * loud, 0.012, 0.2);
    osc.connect(lp).connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + 0.26);

    // Breathy noise burst
    const len = Math.floor(c.sampleRate * 0.18);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const noise = c.createBufferSource();
    noise.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 950;
    bp.Q.value = 1.1;
    const ng = c.createGain();
    envelope(ng, t0, 0.35 * loud, 0.005, 0.14);
    noise.connect(bp).connect(ng).connect(c.destination);
    noise.start(t0);
  }

  function meow(t0, pitch = 1, dur = 0.5, loud = 1) {
    const c = ac();
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480 * pitch, t0);
    osc.frequency.linearRampToValueAtTime(820 * pitch, t0 + dur * 0.35);
    osc.frequency.exponentialRampToValueAtTime(400 * pitch, t0 + dur);
    // Formant sweep "mee-ow"
    const formant = c.createBiquadFilter();
    formant.type = 'bandpass';
    formant.Q.value = 4;
    formant.frequency.setValueAtTime(900, t0);
    formant.frequency.linearRampToValueAtTime(1900, t0 + dur * 0.4);
    formant.frequency.linearRampToValueAtTime(1000, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.6 * loud, t0 + 0.05);
    g.gain.setValueAtTime(0.6 * loud, t0 + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(formant).connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function tone(freq, t0, dur, type = 'triangle', peak = 0.25) {
    const c = ac();
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    const g = c.createGain();
    envelope(g, t0, peak, 0.01, dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function playFile(url, times = 1) {
    let played = 0;
    const once = () => {
      const audio = new Audio(url);
      audio.addEventListener('ended', () => { if (++played < times) once(); });
      audio.play().catch((err) => console.warn('custom sound failed', err));
    };
    once();
  }

  return {
    // level 0–3: more (and louder) barks the grumpier the dog is.
    bark({ level = 0, voice = 'dog', custom = null } = {}) {
      if (custom) return playFile(custom, level >= 2 ? 2 : 1);
      const t = ac().currentTime + 0.02;
      const loud = 1 + level * 0.15;
      if (voice === 'cat') {
        const count = 1 + Math.ceil(level / 2);
        for (let i = 0; i < count; i++) meow(t + i * 0.55, 1 + level * 0.06, 0.5 - level * 0.05, loud);
        return undefined;
      }
      const count = 2 + level;
      for (let i = 0; i < count; i++) woof(t + i * (0.3 - level * 0.03), 1 + i * 0.05 + level * 0.04, loud);
      return undefined;
    },
    happy() {
      const t = ac().currentTime + 0.02;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.09, 0.28));
      tone(1318.5, t + 0.38, 0.5, 'sine', 0.15);
    },
    arrive() {
      const t = ac().currentTime + 0.02;
      tone(660, t, 0.12, 'sine', 0.18);
      tone(990, t + 0.1, 0.18, 'sine', 0.18);
    },
    boop() {
      const c = ac();
      const t = c.currentTime + 0.01;
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(900, t + 0.12);
      const g = c.createGain();
      envelope(g, t, 0.22, 0.01, 0.14);
      osc.connect(g).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    },
  };
})();
