// ── audio.js ─────────────────────────────────────────────────────────────────
// Synthetic sound engine — no external files needed (Web Audio API)

const SFX = (() => {
  let ctx = null;
  let enabled = true;

  function init() {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { enabled = false; }
  }

  function resume() { if (ctx?.state === 'suspended') ctx.resume(); }

  function sweep(f0, f1, dur, type = 'sine', vol = 0.18) {
    if (!ctx) return;
    resume();
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(f0, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(f1, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur + 0.01);
  }

  function chord(freqs, dur) {
    freqs.forEach((f, i) => setTimeout(() => sweep(f, f * 1.005, dur, 'sine', 0.12), i * 70));
  }

  function epic() {
    [523, 659, 784, 1047, 1318].forEach((f, i) =>
      setTimeout(() => sweep(f, f * 1.5, 0.35, 'sine', 0.15), i * 110));
  }

  const SOUNDS = {
    click:     () => sweep(600, 700, 0.08, 'sine', 0.1),
    pull:      () => { sweep(200, 900, 0.5, 'sine'); sweep(300, 1200, 0.6, 'triangle', 0.08); },
    reveal2:   () => chord([523, 659], 0.5),
    reveal3:   () => chord([523, 659, 784], 0.6),
    reveal4:   () => chord([523, 659, 784, 1047], 0.7),
    reveal5:   () => epic(),
    coin:      () => sweep(880, 1320, 0.12, 'triangle', 0.15),
    heart:     () => sweep(523, 659, 0.2, 'sine', 0.12),
    marry:     () => { epic(); setTimeout(() => chord([1047, 1319, 1568], 0.8), 600); },
    error:     () => sweep(300, 200, 0.2, 'sawtooth', 0.1),
    collect:   () => chord([659, 784, 1047], 0.4),
    upgrade:   () => { sweep(440, 880, 0.3); setTimeout(() => sweep(880, 1760, 0.4), 300); },
  };

  return {
    init,
    play(type) {
      if (!enabled) return;
      if (!ctx) init();
      SOUNDS[type]?.();
    },
    toggle() { enabled = !enabled; return enabled; },
    isEnabled() { return enabled; },
  };
})();
