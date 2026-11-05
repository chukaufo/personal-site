/* chukaufo.xyz: tuning dial + scope. The needle follows scroll, the signal locks on each section. */
(function () {
  const UFO = window.UFO;
  const deck = document.getElementById('deck');
  const dialWrap = document.getElementById('dial-wrap');
  const dial = document.getElementById('dial');
  const scopeWrap = document.getElementById('scope-wrap');
  const scope = document.getElementById('scope');
  if (!UFO || !UFO.signal || !deck || !dialWrap || !dial || !scopeWrap || !scope) return;
  const dctx = dial.getContext('2d');
  const sctx = scope.getContext('2d');
  const markersEl = document.getElementById('markers');
  const tip = document.getElementById('dial-tip');
  const deckFreq = document.getElementById('deck-time');
  const deckStation = document.getElementById('deck-station');
  const deckLamp = document.getElementById('deck-lamp');
  const small = window.matchMedia('(max-width: 600px)');

  // the music inside the signal: a generated song (intro, verse, breakdown, drop, outro)
  let seed = 20261028;
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  const PEAKS = [];
  for (let i = 0; i < 200; i++) {
    const t = i / 200;
    let env;
    if (t < 0.1) env = 0.2 + t * 4;
    else if (t < 0.42) env = 0.72;
    else if (t < 0.5) env = 0.38;
    else if (t < 0.88) env = 0.95;
    else env = Math.max(0.12, 0.95 - (t - 0.88) * 7);
    const kick = i % 8 === 0 ? 0.18 : 0;
    PEAKS.push(Math.max(0.06, Math.min(1, env * (0.5 + rnd() * 0.5) + kick)));
  }

  const css = getComputedStyle(document.documentElement);
  const tok = function (name, fb) { return css.getPropertyValue(name).trim() || fb; };
  const C_ACCENT = tok('--accent-bright', '#9b7ff7');
  const C_GREEN = tok('--green', '#4ef0a0');
  const C_NEEDLE = tok('--pink', '#ff3df0');
  const BAND = UFO.BAND, SPAN = BAND[1] - BAND[0];
  const H_LINE = (1420.4 - BAND[0]) / SPAN; // the hydrogen line, where SETI listens

  let dw = 0, dh = 0, sw = 0, sh = 0, hoverX = -1;
  let lock = 1, phase = 0, running = false, onScreen = true;

  // mini strip under the nav
  const mini = document.getElementById('mini-deck');
  const miniWrap = document.getElementById('mini-wave-wrap');
  const miniCanvas = document.getElementById('mini-wave');
  const miniBtn = document.getElementById('mini-label');
  const miniName = document.getElementById('mini-name');
  const miniFreq = document.getElementById('mini-freq');
  const miniList = document.getElementById('mini-list');
  const mctx = miniCanvas ? miniCanvas.getContext('2d') : null;
  let mw = 0, mh = 0, miniOn = false;

  function paintDial(c, w, h, p, hx, labels) {
    c.clearRect(0, 0, w, h);
    c.lineWidth = 1;
    const base = labels ? h - 16 : h;
    const steps = SPAN * 2; // a tick every 0.5 MHz
    const thin = w / steps < 5;
    for (let i = 0; i <= steps; i++) {
      const major = i % 10 === 0;
      const half = i % 2 === 0;
      if (thin && !half) continue;
      const x = Math.round((i / steps) * (w - 1)) + 0.5;
      const len = major ? base * 0.75 : half ? base * 0.42 : base * 0.24;
      c.strokeStyle = major ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
      c.beginPath(); c.moveTo(x, base); c.lineTo(x, base - len); c.stroke();
      if (labels && major) {
        const mhz = BAND[0] + i / 2;
        if (small.matches && mhz % 10) continue;
        c.fillStyle = 'rgba(207,202,230,0.6)';
        c.font = '10px "DM Mono", monospace';
        c.textAlign = i === 0 ? 'left' : i === steps ? 'right' : 'center';
        c.fillText(String(mhz), x, h - 3);
      }
    }
    const hl = Math.round(H_LINE * (w - 1)) + 0.5;
    c.strokeStyle = C_GREEN; c.globalAlpha = 0.75;
    c.beginPath(); c.moveTo(hl, base); c.lineTo(hl, 0); c.stroke();
    c.globalAlpha = 1;
    if (hx >= 0) { c.fillStyle = 'rgba(155,127,247,0.55)'; c.fillRect(Math.round(hx), 0, 1, base); }
    const nx = Math.min(w - 2, Math.max(0, p * w - 1));
    c.save(); c.shadowColor = C_NEEDLE; c.shadowBlur = 10; c.fillStyle = C_NEEDLE; c.fillRect(nx, 0, 2, base); c.restore();
  }

  function paintScope(dt) {
    if (!sw) return;
    const target = (UFO.signal() - 1) / 4; // 0 = static, 1 = locked
    lock = running ? lock + (target - lock) * Math.min(1, dt * 0.008) : target;
    if (running) phase += dt * 0.012 * (0.25 + lock);
    const c = sctx;
    c.clearRect(0, 0, sw, sh);
    c.lineWidth = 1; c.strokeStyle = 'rgba(155,127,247,0.09)';
    c.beginPath();
    for (let i = 1; i < 8; i++) { const x = Math.round((i * sw) / 8) + 0.5; c.moveTo(x, 0); c.lineTo(x, sh); }
    for (let j = 1; j < 4; j++) { const y = Math.round((j * sh) / 4) + 0.5; c.moveTo(0, y); c.lineTo(sw, y); }
    c.stroke();
    const step = small.matches ? 4 : 5;
    const n = Math.floor(sw / step);
    const bw = Math.max(1.5, step - 2);
    const mid = sh / 2;
    const start = Math.floor(UFO.progress() * PEAKS.length * 4 + phase);
    c.fillStyle = lock > 0.85 ? C_GREEN : C_ACCENT;
    c.globalAlpha = 0.3 + 0.7 * lock;
    for (let i = 0; i < n; i++) {
      const peak = PEAKS[(start + i) % PEAKS.length];
      const v = lock * peak + (1 - lock) * Math.random() * 0.5;
      const bh = Math.max(1, v * sh * 0.86);
      c.fillRect(i * step, mid - bh / 2, bw, bh);
    }
    c.globalAlpha = 1;
  }

  function currentLabel(p) {
    let name = 'Intro';
    document.querySelectorAll('[data-marker]').forEach(function (sec) {
      if (UFO.posOf(sec) <= p + 0.005) name = sec.dataset.marker;
    });
    return name;
  }

  let markerBtns = [];
  function placeMarkers() {
    if (!markersEl) return;
    markersEl.innerHTML = '';
    markerBtns = [];
    document.querySelectorAll('[data-marker]').forEach(function (sec) {
      const pos = UFO.posOf(sec);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'marker' + (pos > 0.85 ? ' end' : '');
      b.style.left = (pos * 100).toFixed(2) + '%';
      b.dataset.name = sec.dataset.marker;
      const label = document.createElement('span');
      label.className = 'm-label';
      label.textContent = sec.dataset.marker;
      b.appendChild(label);
      b.setAttribute('aria-label', 'Tune to ' + sec.dataset.marker);
      b.addEventListener('click', function () { sec.scrollIntoView({ behavior: UFO.reduced ? 'auto' : 'smooth' }); });
      markersEl.appendChild(b);
      markerBtns.push(b);
    });
    let prevRight = -Infinity;
    markerBtns.forEach(function (m) {
      m.classList.remove('m-tight');
      const r = m.getBoundingClientRect();
      if (r.left < prevRight + 6) m.classList.add('m-tight');
      else prevRight = r.right;
    });
  }

  function syncList() {
    if (!miniList) return;
    const act = document.querySelector('.nav-links a.active');
    const href = act ? act.getAttribute('href') : '';
    miniList.querySelectorAll('a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === href); });
  }

  function draw() {
    const p = UFO.progress();
    const name = currentLabel(p);
    const locked = UFO.signal() >= 4;
    if (dw) paintDial(dctx, dw, dh, p, hoverX, true);
    if (deckFreq) deckFreq.textContent = UFO.freq(p) + ' MHz';
    if (deckStation) deckStation.textContent = name;
    if (deckLamp) deckLamp.classList.toggle('on', locked);
    markerBtns.forEach(function (b) { b.classList.toggle('on', b.dataset.name === name); });
    if (mini) mini.classList.toggle('locked', locked);
    if (miniName) miniName.textContent = name;
    if (miniFreq) miniFreq.textContent = UFO.freq(p);
    if (miniOn && mctx && mw) paintDial(mctx, mw, mh, p, -1, false);
    syncList();
    if (!running) paintScope(16);
  }

  // scope animates only while visible
  let last = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(64, now - last);
    last = now;
    paintScope(dt);
    requestAnimationFrame(frame);
  }
  function setRunning(on) {
    on = on && !UFO.reduced && !document.hidden;
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); requestAnimationFrame(frame); }
  }

  function fit(cv, c, el) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = el.clientWidth, h = el.clientHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [w, h];
  }
  function resize() {
    [dw, dh] = fit(dial, dctx, dialWrap);
    [sw, sh] = fit(scope, sctx, scopeWrap);
    if (miniWrap && mctx) [mw, mh] = fit(miniCanvas, mctx, miniWrap);
    placeMarkers();
    draw();
  }

  function tuneTo(el, e) {
    const r = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    window.scrollTo({ top: frac * UFO.maxScroll(), behavior: UFO.reduced ? 'auto' : 'smooth' });
  }
  dialWrap.addEventListener('click', function (e) { if (!e.target.closest('.marker')) tuneTo(dialWrap, e); });
  dialWrap.addEventListener('mousemove', function (e) {
    const r = dialWrap.getBoundingClientRect();
    hoverX = e.clientX - r.left;
    if (tip) { tip.style.left = hoverX + 'px'; tip.textContent = UFO.freq(hoverX / r.width) + ' MHz'; }
    dialWrap.classList.add('hovering');
    draw();
  });
  dialWrap.addEventListener('mouseleave', function () { hoverX = -1; dialWrap.classList.remove('hovering'); draw(); });

  // station list: built from the nav links, opened from the strip
  function setOpen(open) {
    if (!miniList || !miniBtn) return;
    miniList.hidden = !open;
    miniBtn.setAttribute('aria-expanded', String(open));
  }
  if (miniList && miniBtn) {
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      const b = a.cloneNode(true);
      b.removeAttribute('class');
      miniList.appendChild(b);
    });
    miniBtn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(miniList.hidden); });
    miniList.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('click', function (e) { if (mini && !mini.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  if (mini && miniWrap) {
    miniWrap.addEventListener('click', function (e) { tuneTo(miniWrap, e); });
    const navH = parseInt(css.getPropertyValue('--nav-h'), 10) || 64;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          miniOn = !en.isIntersecting && en.boundingClientRect.top < window.innerHeight / 2;
          mini.classList.toggle('show', miniOn);
          if (!miniOn) setOpen(false);
          draw();
        });
      }, { rootMargin: '-' + navH + 'px 0px 0px 0px' }).observe(deck);
    }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { onScreen = en.isIntersecting; setRunning(onScreen); });
    }).observe(scopeWrap);
  }
  document.addEventListener('visibilitychange', function () { setRunning(onScreen); });

  let queued = false;
  window.addEventListener('scroll', function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; draw(); });
  }, { passive: true });
  window.addEventListener('resize', resize);
  window.addEventListener('load', resize);
  document.addEventListener('ufo:mix', function () { requestAnimationFrame(resize); });
  if ('ResizeObserver' in window) {
    new ResizeObserver(function () {
      resize();
      if (UFO.stampSections) UFO.stampSections();
    }).observe(document.body);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  resize();
  setRunning(true);
})();
