/* chukaufo.xyz: sound toggle + keyboard synth (A to K) */
(function () {
  const btn = document.getElementById('sound-toggle');
  const panel = document.getElementById('synth-hint');
  if (!btn) return;
  const label = btn.querySelector('.t-label');
  const KEYS = 'asdfghjk';
  const NOTES = [60, 63, 65, 67, 70, 72, 75, 77]; // C minor pentatonic
  const keyEls = panel ? Array.from(panel.querySelectorAll('[data-key]')) : [];
  const voices = {};
  let ac = null, out = null, on = false;
  const mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    out = ac.createGain(); out.gain.value = 0.18;
    const delay = ac.createDelay(1); delay.delayTime.value = 0.34;
    const fb = ac.createGain(); fb.gain.value = 0.42;
    const tone = ac.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2200;
    const wet = ac.createGain(); wet.gain.value = 0.4;
    out.connect(ac.destination);
    out.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay);
    tone.connect(wet); wet.connect(ac.destination);
    return true;
  }

  function noteOn(k) {
    if (!on || !ac || voices[k]) return;
    const i = KEYS.indexOf(k);
    if (i < 0) return;
    const t = ac.currentTime;
    const f = mtof(NOTES[i]);
    const amp = ac.createGain();
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(0.5, t + 0.02);
    amp.gain.setTargetAtTime(0.3, t + 0.02, 0.25);
    const filt = ac.createBiquadFilter();
    filt.type = 'lowpass'; filt.Q.value = 7;
    filt.frequency.setValueAtTime(300, t);
    filt.frequency.exponentialRampToValueAtTime(3600, t + 0.12);
    filt.frequency.setTargetAtTime(1100, t + 0.12, 0.4);
    const nodes = [];
    [-10, 0, 10].forEach(function (d) {
      const o = ac.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d;
      o.connect(filt); nodes.push(o);
    });
    const sub = ac.createOscillator();
    sub.type = 'sine'; sub.frequency.value = f / 2; sub.connect(filt); nodes.push(sub);
    const lfo = ac.createOscillator(); lfo.frequency.value = 5.2;
    const depth = ac.createGain(); depth.gain.value = 7;
    lfo.connect(depth);
    nodes.slice(0, 3).forEach(function (o) { depth.connect(o.detune); });
    nodes.push(lfo);
    filt.connect(amp); amp.connect(out);
    nodes.forEach(function (o) { o.start(t); });
    voices[k] = { amp: amp, nodes: nodes };
    if (keyEls[i]) keyEls[i].classList.add('hit');
  }

  function noteOff(k) {
    const v = voices[k];
    if (!v) return;
    const t = ac.currentTime;
    if (v.amp.gain.cancelAndHoldAtTime) v.amp.gain.cancelAndHoldAtTime(t);
    else v.amp.gain.cancelScheduledValues(t);
    v.amp.gain.setTargetAtTime(0, t, 0.2);
    v.nodes.forEach(function (o) { o.stop(t + 1.5); });
    delete voices[k];
    const i = KEYS.indexOf(k);
    if (keyEls[i]) keyEls[i].classList.remove('hit');
  }

  function allOff() { Object.keys(voices).forEach(noteOff); }

  function setOn(next) {
    if (next && !ac && !build()) return;
    on = next;
    if (on && ac.state === 'suspended') ac.resume();
    if (!on) allOff();
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    if (label) label.textContent = on ? 'Sound on' : 'Sound off';
    document.body.classList.toggle('sound-on', on);
    if (panel) panel.classList.toggle('show', on);
  }

  btn.addEventListener('click', function () { setOn(!on); });

  function typing(e) {
    const el = e.target;
    return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }
  document.addEventListener('keydown', function (e) {
    if (!on || e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
    const k = (e.key || '').toLowerCase();
    if (KEYS.indexOf(k) >= 0) { e.preventDefault(); noteOn(k); }
  });
  document.addEventListener('keyup', function (e) { noteOff((e.key || '').toLowerCase()); });
  window.addEventListener('blur', allOff);

  keyEls.forEach(function (el) {
    const k = el.dataset.key;
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); noteOn(k); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
      el.addEventListener(ev, function () { noteOff(k); });
    });
  });
})();
