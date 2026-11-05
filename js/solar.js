/* chukaufo.xyz: solar system hero. Eight planets, eight sections, an asteroid belt, clickable orbits. */
(function () {
  const UFO = window.UFO || {};
  const stage = document.getElementById('orbits');
  if (!stage) return;
  const orbiters = Array.from(stage.querySelectorAll('.orbiter'));
  if (!orbiters.length) return;
  const beltCanvas = document.getElementById('belt');
  const bctx = beltCanvas ? beltCanvas.getContext('2d') : null;
  const sunSection = document.getElementById('sun');
  const card = document.getElementById('orbit-card');
  const ocPlanet = document.getElementById('oc-planet');
  const ocFreq = document.getElementById('oc-freq');
  const ocTitle = document.getElementById('oc-title');
  const ocAbout = document.getElementById('oc-about');
  const ocGo = document.getElementById('oc-go');
  const ocClose = document.getElementById('oc-close');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover)').matches;
  // drawn size in px at full width (Saturn's is the ring box; the planet is about a third)
  const SIZES = { mercury: 11, venus: 17, earth: 18, mars: 14, jupiter: 40, saturn: 80, uranus: 22, neptune: 23 };
  const BELT_SLOT = 4; // the belt takes the slot between Mars and Jupiter

  const planets = orbiters.map(function (el, i) {
    const target = document.querySelector(el.getAttribute('href'));
    const orbit = document.createElement('div');
    orbit.className = 'orbit';
    stage.insertBefore(orbit, stage.firstChild);
    const freq = document.createElement('i');
    freq.className = 'pl-freq';
    const label = el.querySelector('.pl-label');
    if (label) label.appendChild(freq);
    const name = el.dataset.planet || '';
    return {
      el: el, slot: i < BELT_SLOT ? i : i + 1, target: target, orbit: orbit, freq: freq,
      pl: el.querySelector('.pl'), base: SIZES[name] || 16,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      section: el.dataset.section || '', about: el.dataset.about || '',
      a: 0, b: 0, speed: 0, theta: i * 2.39996 + 0.6
    };
  });

  let W = 0, H = 0, cx = 0, cy = 0, tilt = 0.42, step = 1, beltA = 0;
  let running = false, paused = false, last = 0, onScreen = true;
  let rocks = [], beltSel = false, beltHover = false;

  function makeRocks(n) {
    rocks = [];
    for (let i = 0; i < n; i++) {
      rocks.push({
        phi: Math.random() * Math.PI * 2,
        rj: Math.random() + Math.random() - 1, // bunches toward the middle of the band
        size: 0.6 + Math.pow(Math.random(), 2) * 2.2,
        squash: 0.5 + Math.random() * 0.4,
        rot: Math.random() * Math.PI,
        alpha: 0.35 + Math.random() * 0.55,
        speed: 0.00006 * (0.85 + Math.random() * 0.3)
      });
    }
  }

  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    if (!W || !H) return;
    cx = W / 2; cy = H / 2;
    const narrow = W < 700;
    const aMax = W / 2 - (narrow ? 18 : 40);
    tilt = Math.min(narrow ? 0.95 : 0.42, (H / 2 - 34) / aMax);
    const k = Math.max(0.62, Math.min(1, W / 1100));
    const sun = Math.max(54, aMax * 0.12);
    stage.style.setProperty('--sun', sun.toFixed(1) + 'px');
    // the first orbit has to clear the sun top and bottom, not just side to side
    const start = Math.max(sun / 2 + 22, (sun / 2 + 18) / tilt);
    step = (aMax - start) / 8;
    beltA = start + step * BELT_SLOT;
    planets.forEach(function (p) {
      p.a = start + step * p.slot;
      p.b = p.a * tilt;
      p.pl.style.setProperty('--s', (p.base * k).toFixed(1) + 'px');
      p.orbit.style.width = (p.a * 2).toFixed(1) + 'px';
      p.orbit.style.height = (p.b * 2).toFixed(1) + 'px';
      p.speed = Math.max(0.00005, 0.00042 * Math.pow(start / p.a, 1.25)); // radians per ms
      if (p.target && UFO.freq && UFO.posOf) p.freq.textContent = UFO.freq(UFO.posOf(p.target)) + ' MHz';
    });
    if (beltCanvas && bctx) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      beltCanvas.width = Math.round(W * dpr); beltCanvas.height = Math.round(H * dpr);
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = narrow ? 120 : 280;
      if (rocks.length !== n) makeRocks(n);
    }
    place();
    drawBelt();
  }

  function place() {
    planets.forEach(function (p) {
      const s = Math.sin(p.theta), c = Math.cos(p.theta);
      const x = cx + p.a * c, y = cy + p.b * s;
      const sc = 0.82 + 0.18 * ((s + 1) / 2); // a little bigger on the near side
      p.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) translate(-50%,-50%) scale(' + sc.toFixed(3) + ')';
      p.el.style.zIndex = s > 0 ? 4 : 1; // far side passes behind the sun
    });
  }

  function drawBelt() {
    if (!bctx || !W) return;
    bctx.clearRect(0, 0, W, H);
    const band = step * 0.32;
    const hi = beltSel || beltHover;
    bctx.fillStyle = hi ? '#c9b8ff' : '#cbc3d8';
    for (let i = 0; i < rocks.length; i++) {
      const r = rocks[i];
      const rad = beltA + r.rj * band;
      const s = Math.sin(r.phi), c = Math.cos(r.phi);
      bctx.globalAlpha = r.alpha * (s > 0 ? 1 : 0.65) * (hi ? 1 : 0.85);
      bctx.beginPath();
      bctx.ellipse(cx + rad * c, cy + rad * tilt * s, r.size, r.size * r.squash, r.rot + r.phi, 0, Math.PI * 2);
      bctx.fill();
    }
    bctx.globalAlpha = 1;
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(64, now - last);
    last = now;
    if (!paused) {
      planets.forEach(function (p) { p.theta += p.speed * dt; });
      for (let i = 0; i < rocks.length; i++) rocks[i].phi += rocks[i].speed * dt;
    }
    place();
    drawBelt();
    requestAnimationFrame(frame);
  }
  function setRunning(on) {
    on = on && !reduced && !document.hidden;
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); requestAnimationFrame(frame); }
  }

  // hovering or focusing a planet holds the whole system still
  orbiters.forEach(function (el) {
    el.addEventListener('pointerenter', function () { paused = true; });
    el.addEventListener('pointerleave', function () { paused = false; });
    el.addEventListener('focus', function () { paused = true; });
    el.addEventListener('blur', function () { paused = false; });
  });

  // orbits: which ring (or the belt) is nearest the pointer
  function nearest(e) {
    const r = stage.getBoundingClientRect();
    const dx = e.clientX - r.left - cx, dy = e.clientY - r.top - cy;
    const reff = Math.sqrt(dx * dx + Math.pow(dy / tilt, 2));
    let best = null, bestD = step * 0.5;
    planets.forEach(function (p) {
      const d = Math.abs(reff - p.a);
      if (d < bestD) { bestD = d; best = p; }
    });
    if (Math.abs(reff - beltA) < bestD) best = 'belt';
    return best;
  }

  function select(item) {
    planets.forEach(function (p) {
      p.orbit.classList.toggle('sel', p === item);
      p.el.classList.toggle('sel', p === item);
    });
    beltSel = item === 'belt';
    if (!running) drawBelt();
    if (!card) return;
    if (!item) { card.hidden = true; return; }
    if (item === 'belt') {
      ocPlanet.textContent = 'Asteroid belt';
      ocFreq.textContent = 'No signal';
      ocTitle.textContent = 'The asteroid belt';
      ocAbout.textContent = 'Where the rocky planets end and the giants begin. No section out here, just rocks.';
      ocGo.hidden = true;
    } else {
      ocPlanet.textContent = item.name;
      ocFreq.textContent = item.freq.textContent;
      ocTitle.textContent = item.section;
      ocAbout.textContent = item.about;
      ocGo.hidden = false;
      ocGo.setAttribute('href', item.el.getAttribute('href'));
    }
    card.hidden = false;
  }

  stage.addEventListener('click', function (e) {
    if (e.target.closest('.orbiter')) return;
    select(nearest(e));
  });
  if (fine) {
    stage.addEventListener('mousemove', function (e) {
      if (e.target.closest('.orbiter')) return;
      const h = nearest(e);
      planets.forEach(function (p) { p.orbit.classList.toggle('hover', p === h); });
      beltHover = h === 'belt';
      stage.style.cursor = h ? 'pointer' : '';
      if (!running) drawBelt();
    });
    stage.addEventListener('mouseleave', function () {
      planets.forEach(function (p) { p.orbit.classList.remove('hover'); });
      beltHover = false;
      stage.style.cursor = '';
      if (!running) drawBelt();
    });
  }
  if (ocClose) ocClose.addEventListener('click', function () { select(null); });
  if (ocGo) ocGo.addEventListener('click', function () { select(null); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') select(null); });

  function lockOn(target) {
    planets.forEach(function (p) {
      const on = !!target && p.target === target;
      p.el.classList.toggle('on', on);
      p.orbit.classList.toggle('on', on);
    });
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (en.target === sunSection) {
          // back at the sun: nothing is locked
          lockOn(null);
          document.querySelectorAll('.nav-links a.active').forEach(function (a) { a.classList.remove('active'); });
        } else {
          lockOn(en.target);
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    planets.forEach(function (p) { if (p.target) io.observe(p.target); });
    if (sunSection) io.observe(sunSection);
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { onScreen = en.isIntersecting; setRunning(onScreen); });
    }).observe(stage);
  }
  document.addEventListener('visibilitychange', function () { setRunning(onScreen); });
  window.addEventListener('resize', layout);
  window.addEventListener('load', layout);
  document.addEventListener('ufo:mix', function () { requestAnimationFrame(layout); });
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(document.body);
  layout();
  setRunning(true);
})();
