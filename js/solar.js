/* chukaufo.xyz: interactive solar system. Eight planets, eight sections.
   Tap a planet to zoom in and read about its section. Drag to turn, pinch or +/- to zoom. */
(function () {
  const UFO = window.UFO || {};
  const system = document.getElementById('sun');
  const stage = document.getElementById('orbits');
  if (!system || !stage) return;
  const orbiters = Array.from(stage.querySelectorAll('.orbiter'));
  if (!orbiters.length) return;
  const sunEl = stage.querySelector('.sun');
  const beltCanvas = document.getElementById('belt');
  const bctx = beltCanvas ? beltCanvas.getContext('2d') : null;
  const beltF = beltCanvas ? beltCanvas.cloneNode(false) : null;
  if (beltF) { beltF.removeAttribute('id'); beltF.classList.add('belt-front'); stage.appendChild(beltF); }
  const fctx = beltF ? beltF.getContext('2d') : null;
  const card = document.getElementById('orbit-card');
  const ocPlanet = document.getElementById('oc-planet');
  const ocFreq = document.getElementById('oc-freq');
  const ocTitle = document.getElementById('oc-title');
  const ocAbout = document.getElementById('oc-about');
  const ocGo = document.getElementById('oc-go');
  const ocClose = document.getElementById('oc-close');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const sheetMQ = window.matchMedia('(max-width: 600px)');
  const SIZES = { mercury: 11, venus: 17, earth: 18, mars: 14, jupiter: 40, saturn: 80, uranus: 22, neptune: 23 };
  const COLORS = { mercury: '#b3aebb', venus: '#f0c98a', earth: '#4f9ee8', mars: '#e0582e', jupiter: '#d9a877', saturn: '#e3cf9c', uranus: '#9be3e6', neptune: '#5b7ff0' };
  const BELT_SLOT = 4; // the belt sits between Mars and Jupiter

  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function orbitClass(p, cls, on) { p.orbit.classList.toggle(cls, on); p.orbitF.classList.toggle(cls, on); }

  const planets = orbiters.map(function (el, i) {
    const key = el.dataset.planet || '';
    const col = COLORS[key] || '#9b7ff7';
    const orbit = document.createElement('div');
    orbit.className = 'orbit';
    orbit.style.setProperty('--oc', rgba(col, 0.24));
    orbit.style.setProperty('--oc-hi', rgba(col, 0.5));
    orbit.style.setProperty('--oc-full', rgba(col, 0.9));
    stage.insertBefore(orbit, stage.firstChild);
    const orbitF = orbit.cloneNode(false);
    orbitF.classList.add('orbit-front');
    stage.appendChild(orbitF);
    const name = key.charAt(0).toUpperCase() + key.slice(1);
    const section = el.dataset.section || '';
    // label: the planet's name always, its section and frequency on hover or when picked
    const freq = document.createElement('i');
    freq.className = 'pl-freq';
    const label = el.querySelector('.pl-label');
    if (label) {
      label.textContent = '';
      const b = document.createElement('b');
      b.textContent = name;
      const sec = document.createElement('span');
      sec.className = 'pl-sec';
      sec.textContent = section;
      label.appendChild(b); label.appendChild(sec); label.appendChild(freq);
    }
    el.setAttribute('draggable', 'false');
    return {
      el: el, key: key, slot: i < BELT_SLOT ? i : i + 1,
      target: document.querySelector(el.getAttribute('href')),
      orbit: orbit, orbitF: orbitF, freq: freq, pl: el.querySelector('.pl'), base: SIZES[key] || 16,
      name: name, section: section, about: el.dataset.about || '',
      a: 0, speed: 0, theta: i * 2.39996 + 0.6, x: 0, y: 0
    };
  });

  // view: rotation, tilt, zoom, camera and focal point all ease toward their targets
  let W = 0, H = 0, narrow = false, k = 1, step = 1, beltA = 0, sunBase = 60, inited = false;
  let baseTilt = 0.42, tilt = 0.42, tiltT = 0.42, userTilted = false, rot = 0, rotT = 0;
  let minTilt = 0, tiltEff = 0.42;
  let zoom = 1, zoomT = 1, userZoom = 1, camX = 0, camY = 0;
  let fx = 0, fy = 0, fxT = 0, fyT = 0;
  let focus = null, beltSel = false, beltHover = false, hoverPause = false;
  let speed = reduced ? 0 : 1, running = false, onScreen = true, last = 0, rocks = [];

  function makeRocks(n) {
    rocks = [];
    for (let i = 0; i < n; i++) {
      rocks.push({
        phi: Math.random() * Math.PI * 2,
        rj: Math.random() + Math.random() - 1,
        size: 0.6 + Math.pow(Math.random(), 2) * 2.2,
        squash: 0.5 + Math.random() * 0.4,
        rot: Math.random() * Math.PI,
        alpha: 0.35 + Math.random() * 0.55,
        speed: 0.00006 * (0.85 + Math.random() * 0.3)
      });
    }
  }

  function setFocal() {
    fxT = W / 2; fyT = H / 2;
    if (card && !card.hidden && focus) {
      const s = stage.getBoundingClientRect(), c = card.getBoundingClientRect();
      if (sheetMQ.matches) {
        const top = c.top - s.top;
        if (top < H) fyT = Math.max(70, top / 2);
      } else {
        const right = c.right - s.left;
        if (right > 0 && right < W) fxT = right + (W - right) / 2;
      }
    }
  }

  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    if (!W || !H) return;
    narrow = W < 700;
    const aMax = W / 2 - (narrow ? 12 : 40);
    const t = Math.min(narrow ? 0.55 : 0.42, (H / 2 - 34) / aMax);
    baseTilt = t;
    if (!userTilted) tilt = tiltT = t;
    k = Math.max(0.62, Math.min(1, W / 1100));
    sunBase = narrow ? 40 : Math.max(54, aMax * 0.12);
    const start = Math.max(sunBase / 2 + (narrow ? 14 : 22), (sunBase / 2 + (narrow ? 10 : 18)) / t);
    step = (aMax - start) / 8;
    beltA = start + step * BELT_SLOT;
    planets.forEach(function (p) {
      p.a = start + step * p.slot;
      p.speed = Math.max(0.00005, 0.00042 * Math.pow(start / p.a, 1.25)); // radians per ms
      if (p.target && UFO.freq && UFO.posOf) p.freq.textContent = UFO.freq(UFO.posOf(p.target)) + ' MHz';
    });
    if (beltCanvas && bctx) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      beltCanvas.width = Math.round(W * dpr); beltCanvas.height = Math.round(H * dpr);
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (fctx) { beltF.width = beltCanvas.width; beltF.height = beltCanvas.height; fctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
      const n = narrow ? 120 : 280;
      if (rocks.length !== n) makeRocks(n);
    }
    setFocal();
    if (!inited) { fx = fxT; fy = fyT; inited = true; }
    if (focus && ocFreq) ocFreq.textContent = focus.freq.textContent;
    render();
  }

  function render() {
    if (!W) return;
    const zs = Math.pow(zoom, 0.7);
    const sunSize = sunBase * Math.pow(zoom, 0.5); // the sun grows slower than the rings
    // never flatter than Mercury's ring can hold the sun: it always sits inside the closest orbit
    minTilt = Math.min(0.9, (sunSize / 2 + 10) / Math.max(1, planets[0].a * zoom));
    tiltEff = Math.max(tilt, minTilt);
    const sx = fx - camX * zoom, sy = fy - camY * tiltEff * zoom;
    if (sunEl) {
      sunEl.style.left = sx.toFixed(1) + 'px';
      sunEl.style.top = sy.toFixed(1) + 'px';
      sunEl.style.setProperty('--sun', sunSize.toFixed(1) + 'px');
    }
    const sunR = sunSize / 2;
    planets.forEach(function (p) {
      const ang = p.theta + rot;
      const c = Math.cos(ang), s = Math.sin(ang);
      p.x = sx + p.a * c * zoom;
      p.y = sy + p.a * s * tiltEff * zoom;
      const sc = 0.82 + 0.18 * ((s + 1) / 2); // a little bigger on the near side
      p.pl.style.setProperty('--s', (p.base * k * zs).toFixed(1) + 'px');
      p.el.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0) translate(-50%,-50%) scale(' + sc.toFixed(3) + ')';
      p.el.style.zIndex = s > 0 ? 4 : 1; // far side passes behind the sun
      p.el.classList.toggle('behind', s < 0 && Math.abs(p.x - sx) < sunR + 8 && Math.abs(p.y - sy) < sunR + 8);
      const ow = p.a * 2 * zoom;
      [p.orbit, p.orbitF].forEach(function (o) {
        o.style.left = sx.toFixed(1) + 'px';
        o.style.top = sy.toFixed(1) + 'px';
        o.style.width = ow.toFixed(1) + 'px';
        o.style.height = (ow * tiltEff).toFixed(1) + 'px';
      });
    });
    drawBelt(sx, sy);
  }

  function drawBelt(sx, sy) {
    if (!bctx || !W) return;
    bctx.clearRect(0, 0, W, H);
    if (fctx) fctx.clearRect(0, 0, W, H);
    const band = step * 0.32;
    const hi = beltSel || beltHover;
    const rs = Math.sqrt(zoom);
    bctx.fillStyle = hi ? '#c9b8ff' : '#cbc3d8';
    if (fctx) fctx.fillStyle = bctx.fillStyle;
    for (let i = 0; i < rocks.length; i++) {
      const r = rocks[i];
      const rad = beltA + r.rj * band;
      const ang = r.phi + rot;
      const s = Math.sin(ang), c = Math.cos(ang);
      const x = sx + rad * c * zoom, y = sy + rad * s * tiltEff * zoom;
      if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
      const g = s > 0 && fctx ? fctx : bctx;
      g.globalAlpha = r.alpha * (s > 0 ? 1 : 0.65) * (hi ? 1 : 0.85);
      g.beginPath();
      g.ellipse(x, y, r.size * rs, r.size * r.squash * rs, r.rot + ang, 0, Math.PI * 2);
      g.fill();
    }
    bctx.globalAlpha = 1;
    if (fctx) fctx.globalAlpha = 1;
  }

  function tick(dt, still) {
    const sp = still || hoverPause ? 0 : speed;
    if (sp) {
      for (let i = 0; i < planets.length; i++) planets[i].theta += planets[i].speed * dt * sp;
      for (let j = 0; j < rocks.length; j++) rocks[j].phi += rocks[j].speed * dt * sp;
    }
    const e = reduced ? 1 : 1 - Math.exp(-dt / 220);
    zoom += (zoomT - zoom) * e;
    tilt += (tiltT - tilt) * e;
    rot += (rotT - rot) * e;
    fx += (fxT - fx) * e; fy += (fyT - fy) * e;
    let tx = 0, ty = 0;
    if (focus) {
      const ang = focus.theta + rot;
      tx = focus.a * Math.cos(ang); ty = focus.a * Math.sin(ang);
    }
    camX += (tx - camX) * e; camY += (ty - camY) * e;
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(64, now - last);
    last = now;
    tick(dt, false);
    render();
    requestAnimationFrame(frame);
  }
  function setRunning(on) {
    on = on && !document.hidden && (speed > 0 || !reduced);
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); requestAnimationFrame(frame); }
  }
  // when the loop isn't running (reduced motion, paused), apply a change right away
  function poke() { if (!running) { tick(1000, true); render(); } }

  // ---------- panel ----------
  let ocOrb = null;
  if (card) {
    ocOrb = document.createElement('span');
    ocOrb.setAttribute('aria-hidden', 'true');
    const meta = ocPlanet ? ocPlanet.parentNode : null;
    card.insertBefore(ocOrb, meta || card.firstChild);
    const nav = document.createElement('div');
    nav.className = 'oc-nav';
    const prev = document.createElement('button');
    prev.type = 'button'; prev.className = 'oc-step'; prev.textContent = '‹'; prev.setAttribute('aria-label', 'Previous planet');
    const next = document.createElement('button');
    next.type = 'button'; next.className = 'oc-step'; next.textContent = '›'; next.setAttribute('aria-label', 'Next planet');
    nav.appendChild(prev);
    if (ocGo) nav.appendChild(ocGo);
    nav.appendChild(next);
    card.appendChild(nav);
    prev.addEventListener('click', function () { stepTo(-1); });
    next.addEventListener('click', function () { stepTo(1); });
  }

  function fillCard(item) {
    if (!card) return;
    if (!item) { card.hidden = true; return; }
    if (item === 'belt') {
      ocOrb.className = 'oc-orb oc-belt';
      ocPlanet.textContent = 'Asteroid belt';
      ocFreq.textContent = 'No signal';
      ocTitle.textContent = 'The asteroid belt';
      ocAbout.textContent = 'Where the rocky planets end and the giants begin. No section out here, just rocks.';
      if (ocGo) ocGo.hidden = true;
    } else {
      ocOrb.className = 'oc-orb nl-dot nd-' + item.key;
      ocPlanet.textContent = item.name;
      ocFreq.textContent = item.freq.textContent || '';
      ocTitle.textContent = item.section;
      ocAbout.textContent = item.about;
      if (ocGo) { ocGo.hidden = false; ocGo.setAttribute('href', item.el.getAttribute('href')); }
    }
    card.hidden = false;
  }

  function setZoom(z) {
    zoomT = clamp(z, 0.7, 3.5);
    if (!focus) userZoom = zoomT;
    stage.classList.toggle('zoomed', zoomT > 1.2);
    poke();
  }

  function select(item, fly) {
    const was = !!focus;
    focus = fly && item && item !== 'belt' ? item : null;
    beltSel = item === 'belt';
    planets.forEach(function (p) {
      const on = p === item;
      orbitClass(p, 'sel', on);
      p.el.classList.toggle('sel', on);
    });
    if (focus) { if (!was) userZoom = zoomT; zoomT = narrow ? 2.2 : 2.4; }
    else zoomT = userZoom;
    stage.classList.toggle('zoomed', zoomT > 1.2);
    fillCard(item);
    system.classList.toggle('panel-open', !!item);
    setFocal();
    poke();
  }

  function stepTo(dir) {
    let i;
    if (beltSel) i = dir > 0 ? BELT_SLOT : BELT_SLOT - 1;
    else if (focus) i = (planets.indexOf(focus) + dir + planets.length) % planets.length;
    else i = 0;
    select(planets[i], true);
  }

  if (ocClose) ocClose.addEventListener('click', function () { select(null); });
  if (ocGo) ocGo.addEventListener('click', function () { select(null); });
  document.addEventListener('keydown', function (e) {
    if (!card || card.hidden) return;
    if (e.key === 'Escape') select(null);
    else if (e.key === 'ArrowRight') stepTo(1);
    else if (e.key === 'ArrowLeft') stepTo(-1);
  });

  // ---------- controls: zoom and speed ----------
  const controls = document.createElement('div');
  controls.className = 'sys-controls';
  controls.innerHTML =
    '<div class="sys-group" role="group" aria-label="Zoom">' +
      '<button type="button" data-z="out" aria-label="Zoom out">−</button>' +
      '<button type="button" data-z="in" aria-label="Zoom in">+</button>' +
      '<button type="button" data-z="rotate" aria-pressed="false" aria-label="Rotate mode"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button type="button" data-z="reset" aria-label="Reset view">Reset</button>' +
    '</div>' +
    '<div class="sys-group" role="group" aria-label="Orbit speed">' +
      '<button type="button" data-speed="0" aria-label="Pause">II</button>' +
      '<button type="button" data-speed="1" aria-label="Normal speed">1×</button>' +
      '<button type="button" data-speed="5" aria-label="Five times speed">5×</button>' +
      '<button type="button" data-speed="20" aria-label="Twenty times speed">20×</button>' +
    '</div>';
  system.appendChild(controls);
  const speedBtns = Array.from(controls.querySelectorAll('[data-speed]'));
  function markSpeed() { speedBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === speed)); }); }
  markSpeed();
  speedBtns.forEach(function (b) {
    b.addEventListener('click', function () { speed = Number(b.dataset.speed); markSpeed(); setRunning(onScreen); });
  });
  controls.querySelectorAll('[data-z]').forEach(function (b) {
    b.addEventListener('click', function () {
      const z = b.dataset.z;
      if (z === 'rotate') {
        rotateMode = !rotateMode;
        b.setAttribute('aria-pressed', String(rotateMode));
        stage.classList.toggle('rotate-mode', rotateMode);
        return;
      }
      if (z === 'in') setZoom(zoomT * 1.35);
      else if (z === 'out') setZoom(zoomT / 1.35);
      else {
        userTilted = false; tiltT = baseTilt;
        rotT = Math.round(rot / (Math.PI * 2)) * Math.PI * 2;
        userZoom = 1;
        select(null);
        setZoom(1);
      }
    });
  });

  // ---------- pointer: tap, drag to turn, pinch to zoom ----------
  function nearest(e) {
    const r = stage.getBoundingClientRect();
    const wx = (e.clientX - r.left - fx) / zoom + camX;
    const wy = (e.clientY - r.top - fy) / (zoom * tiltEff) + camY;
    const reff = Math.sqrt(wx * wx + wy * wy);
    let best = null, bestD = Math.min(step * 0.5, 18 / zoom);
    planets.forEach(function (p) {
      const d = Math.abs(reff - p.a);
      if (d < bestD) { bestD = d; best = p; }
    });
    const db = Math.abs(reff - beltA);
    if (db < step * 0.3 && (!best || db < bestD)) best = 'belt';
    return best;
  }

  let rotateMode = false; // on touch: one finger turns and tilts instead of scrolling
  const pts = new Map();
  let downX = 0, downY = 0, rot0 = 0, tilt0 = 0, dragging = false, justDragged = false, pinch0 = 1, zoom0 = 1;
  function pair() { const v = Array.from(pts.values()); return Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) || 1; }

  stage.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { downX = e.clientX; downY = e.clientY; rot0 = rot; tilt0 = tilt; dragging = false; justDragged = false; }
    else if (pts.size === 2) { pinch0 = pair(); zoom0 = zoomT; dragging = true; justDragged = true; }
  });
  stage.addEventListener('pointermove', function (e) {
    if (!pts.has(e.pointerId)) { if (fine) hoverAt(e); return; }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2) { setZoom(zoom0 * pair() / pinch0); return; }
    const dx = e.clientX - downX, dy = e.clientY - downY;
    if (!dragging) {
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      // on touch, a mostly vertical move is the page scrolling: leave it to the browser
      if (e.pointerType !== 'mouse' && !rotateMode && Math.abs(dy) > Math.abs(dx)) { pts.delete(e.pointerId); return; }
      dragging = true; justDragged = true;
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      stage.classList.add('dragging');
    }
    rot = rotT = rot0 - dx * 0.006;
    if (e.pointerType === 'mouse' || rotateMode) { userTilted = true; tilt = tiltT = clamp(tilt0 + dy * 0.0025, Math.max(0.12, minTilt), 0.9); }
    poke();
  });
  function up(e) {
    pts.delete(e.pointerId);
    if (pts.size === 1) { const p = pts.values().next().value; downX = p.x; downY = p.y; rot0 = rot; tilt0 = tilt; }
    if (!pts.size) {
      dragging = false;
      stage.classList.remove('dragging');
      setTimeout(function () { justDragged = false; }, 0);
    }
  }
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);

  stage.addEventListener('click', function (e) {
    if (justDragged) { e.preventDefault(); return; }
    const o = e.target.closest('.orbiter');
    if (o) {
      e.preventDefault();
      select(planets.find(function (p) { return p.el === o; }) || null, true);
      return;
    }
    select(nearest(e));
  });

  // trackpad pinch (ctrl + wheel) zooms; a plain scroll still scrolls the page
  stage.addEventListener('wheel', function (e) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom(zoomT * Math.exp(-e.deltaY * 0.01));
  }, { passive: false });

  function hoverAt(e) {
    if (e.target.closest && e.target.closest('.orbiter')) return;
    const h = nearest(e);
    planets.forEach(function (p) { orbitClass(p, 'hover', p === h); });
    beltHover = h === 'belt';
    stage.classList.toggle('over-orbit', !!h);
    poke();
  }
  stage.addEventListener('mouseleave', function () {
    planets.forEach(function (p) { orbitClass(p, 'hover', false); });
    beltHover = false;
    stage.classList.remove('over-orbit');
    poke();
  });
  if (fine) {
    orbiters.forEach(function (el) {
      el.addEventListener('pointerenter', function () { hoverPause = true; });
      el.addEventListener('pointerleave', function () { hoverPause = false; });
    });
  }

  // ---------- page sections ----------
  function lockOn(target) {
    planets.forEach(function (p) {
      const on = !!target && p.target === target;
      p.el.classList.toggle('on', on);
      orbitClass(p, 'on', on);
    });
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (en.target === system) {
          lockOn(null);
          document.querySelectorAll('.nav-links a.active').forEach(function (a) { a.classList.remove('active'); });
        } else lockOn(en.target);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    planets.forEach(function (p) { if (p.target) io.observe(p.target); });
    io.observe(system);
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { onScreen = en.isIntersecting; setRunning(onScreen); });
    }).observe(stage);
  }

  // each section's label gets its planet in front of it
  planets.forEach(function (p) {
    if (!p.target) return;
    const meta = p.target.querySelector('.sh-meta, .eyebrow');
    if (!meta || meta.querySelector('.sec-planet')) return;
    const dot = document.createElement('i');
    dot.className = 'sec-planet nl-dot nd-' + p.key;
    dot.setAttribute('aria-hidden', 'true');
    meta.insertBefore(dot, meta.firstChild);
  });

  document.addEventListener('visibilitychange', function () { setRunning(onScreen); });
  window.addEventListener('resize', layout);
  window.addEventListener('load', layout);
  document.addEventListener('ufo:mix', function () { requestAnimationFrame(layout); });
  if (sheetMQ.addEventListener) sheetMQ.addEventListener('change', function () { setFocal(); poke(); });
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(document.body);
  layout();
  setRunning(true);
})();
