/* ============================================================
   AUDIO — synthesized sound, no asset files (works offline).
   - SFX: stamp / approve / deny / click / coin / alert
   - Ambient noir drone as background "music"
   - Mute toggle persisted to localStorage
   Web Audio is created lazily on the first user gesture so mobile
   browsers allow it to play.
   ============================================================ */
(function () {
  let ctx = null;
  let master = null, sfxBus = null, musicBus = null;
  let musicNodes = null;
  let muted = localStorage.getItem("gate7_muted") === "1";
  let started = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.0; musicBus.connect(master);
    return ctx;
  }

  // call on a user gesture to unlock audio on mobile
  function init() {
    ensure();
    if (ctx && ctx.state === "suspended") ctx.resume();
    started = true;
  }

  function now() { return ctx.currentTime; }

  // short filtered-noise burst (the "thud" of a rubber stamp)
  function stampThud(t0, vol) {
    const len = 0.18;
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = "lowpass"; bp.frequency.value = 700;
    const g = ctx.createGain(); g.gain.setValueAtTime((vol || 0.5), t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + len);
    src.connect(bp).connect(g).connect(sfxBus);
    src.start(t0); src.stop(t0 + len);
    // low body thump
    tone(t0, 90, 0.16, "sine", 0.5, 60);
  }

  function tone(t0, freq, dur, type, vol, freqEnd) {
    const o = ctx.createOscillator(); o.type = type || "sine"; o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(sfxBus);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function sfx(name) {
    if (!ensure() || muted) return;
    if (ctx.state === "suspended") ctx.resume();
    const t = now();
    switch (name) {
      case "approve":
        stampThud(t, 0.55);
        tone(t + 0.05, 523, 0.18, "sine", 0.18);   // C5
        tone(t + 0.11, 784, 0.22, "sine", 0.16);   // G5 — hopeful
        break;
      case "deny":
        stampThud(t, 0.6);
        tone(t + 0.04, 196, 0.28, "sawtooth", 0.12, 110); // low descending buzz
        break;
      case "stamp":
        stampThud(t, 0.5);
        break;
      case "click":
        tone(t, 880, 0.04, "square", 0.06);
        break;
      case "coin":
        tone(t, 1318, 0.08, "sine", 0.12);
        tone(t + 0.07, 1760, 0.12, "sine", 0.10);
        break;
      case "alert":
        tone(t, 440, 0.18, "square", 0.10);
        tone(t + 0.2, 415, 0.3, "square", 0.10);   // dissonant
        break;
      case "page":
        stampThud(t, 0.2);
        break;
      default: break;
    }
  }

  // ---------- character "voice" blip (typewriter gibberish) ----------
  function voice(p) {
    if (!ensure() || muted) return;
    if (ctx.state === "suspended") ctx.resume();
    const t = now();
    const base = (p && p.f) || 220;
    const f = base * (0.9 + Math.random() * 0.22);
    const o = ctx.createOscillator(); o.type = (p && p.type) || "square"; o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(sfxBus);
    o.start(t); o.stop(t + 0.06);
  }

  // ---------- ambient noir drone ----------
  function startMusic() {
    if (!ensure() || musicNodes) return;
    if (ctx.state === "suspended") ctx.resume();
    const t = now();
    const nodes = [];
    // two detuned low oscillators -> a cold, uneasy drone
    [55, 55.4, 82.5].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = i === 2 ? "triangle" : "sawtooth";
      o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i === 2 ? 0.04 : 0.07;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 240;
      o.connect(g).connect(lp).connect(musicBus);
      o.start(t); nodes.push(o);
    });
    // slow swell LFO on the music bus
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain).connect(musicBus.gain);
    lfo.start(t); nodes.push(lfo);
    musicNodes = nodes;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(0.0001, t);
    musicBus.gain.linearRampToValueAtTime(0.6, t + 3); // fade in
  }

  function stopMusic() {
    if (!ctx || !musicNodes) return;
    const t = now();
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(0.0001, t + 1.5);
    const nodes = musicNodes; musicNodes = null;
    setTimeout(() => nodes.forEach((n) => { try { n.stop(); } catch (e) {} }), 1700);
  }

  function setMuted(m) {
    muted = m;
    localStorage.setItem("gate7_muted", m ? "1" : "0");
    if (master) master.gain.value = m ? 0 : 0.9;
  }
  function toggle() { setMuted(!muted); return muted; }
  function isMuted() { return muted; }

  window.AUDIO = { init, sfx, voice, startMusic, stopMusic, toggle, setMuted, isMuted };
})();
