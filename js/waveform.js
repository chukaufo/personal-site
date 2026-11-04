/* chukaufo.xyz: hero waveform, playhead follows scroll */
(function () {
  const UFO = window.UFO;
  const wrap = document.getElementById('wave-wrap');
  const canvas = document.getElementById('wave');
  const markersEl = document.getElementById('markers');
  const deckTime = document.getElementById('deck-time');
  const tip = document.getElementById('wave-tip');
  if (!UFO || !wrap || !canvas) return;
  const ctx = canvas.getContext('2d');

  // generated "song": intro, verse, breakdown, drop, outro
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
  const C_PLAYED = css.getPropertyValue('--accent-bright').trim() || '#9b7ff7';
  const C_REST = 'rgba(255,255,255,0.13)';
  const C_HOVER = 'rgba(155,127,247,0.42)';
  let w = 0, h = 0, hoverX = -1;

  // mini waveform under the nav, shown once the deck scrolls away
  const mini = document.getElementById('mini-deck');
  const miniWrap = document.getElementById('mini-wave-wrap');
  const miniCanvas = document.getElementById('mini-wave');
  const miniLabel = document.getElementById('mini-label');
  const mctx = miniCanvas ? miniCanvas.getContext('2d') : null;
  let mw = 0, mh = 0, miniOn = false;

  function paint(c, cw, ch, p, hx, pxPerBar) {
    c.clearRect(0, 0, cw, ch);
    const n = Math.max(40, Math.min(PEAKS.length, Math.floor(cw / pxPerBar)));
    const step = cw / n;
    const bw = Math.max(1.5, step - 2);
    const mid = ch / 2;
    for (let i = 0; i < n; i++) {
      const x = i * step;
      const peak = PEAKS[Math.floor((i * PEAKS.length) / n)];
      const bh = Math.max(2, peak * ch * 0.92);
      if ((x + bw / 2) / cw <= p) c.fillStyle = C_PLAYED;
      else if (hx >= 0 && x <= hx) c.fillStyle = C_HOVER;
      else c.fillStyle = C_REST;
      c.fillRect(x, mid - bh / 2, bw, bh);
    }
    c.fillStyle = '#ffffff';
    c.fillRect(Math.min(cw - 2, p * cw), 0, 2, ch);
  }

  function currentLabel(p) {
    let name = 'Intro';
    document.querySelectorAll('[data-marker]').forEach(function (sec) {
      if (UFO.posOf(sec) <= p + 0.005) name = sec.dataset.marker;
    });
    return name;
  }

  function draw() {
    const p = UFO.progress();
    if (w) {
      paint(ctx, w, h, p, hoverX, 5);
      if (deckTime) deckTime.textContent = UFO.fmt(p * UFO.TOTAL) + ' / ' + UFO.fmt(UFO.TOTAL);
    }
    if (miniOn && mctx && mw) {
      paint(mctx, mw, mh, p, -1, 4);
      if (miniLabel) miniLabel.textContent = currentLabel(p);
    }
  }

  function placeMarkers() {
    if (!markersEl) return;
    markersEl.innerHTML = '';
    document.querySelectorAll('[data-marker]').forEach(function (sec) {
      const pos = UFO.posOf(sec);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'marker' + (pos > 0.85 ? ' end' : '');
      b.style.left = (pos * 100).toFixed(2) + '%';
      const label = document.createElement('span');
      label.className = 'm-label';
      label.textContent = sec.dataset.marker;
      b.appendChild(label);
      b.setAttribute('aria-label', 'Jump to ' + sec.dataset.marker);
      b.addEventListener('click', function () { sec.scrollIntoView({ behavior: UFO.reduced ? 'auto' : 'smooth' }); });
      markersEl.appendChild(b);
    });
    hideOverlaps();
  }

  function hideOverlaps() {
    let prevRight = -Infinity;
    markersEl.querySelectorAll('.marker').forEach(function (m) {
      m.classList.remove('m-tight');
      const r = m.getBoundingClientRect();
      if (r.left < prevRight + 6) m.classList.add('m-tight');
      else prevRight = r.right;
    });
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = wrap.clientWidth; h = wrap.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (miniWrap && mctx) {
      mw = miniWrap.clientWidth; mh = miniWrap.clientHeight;
      miniCanvas.width = Math.round(mw * dpr); miniCanvas.height = Math.round(mh * dpr);
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    placeMarkers();
    draw();
  }

  wrap.addEventListener('click', function (e) {
    if (e.target.closest('.marker')) return;
    const r = wrap.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    window.scrollTo({ top: frac * UFO.maxScroll(), behavior: UFO.reduced ? 'auto' : 'smooth' });
  });
  wrap.addEventListener('mousemove', function (e) {
    const r = wrap.getBoundingClientRect();
    hoverX = e.clientX - r.left;
    if (tip) {
      tip.style.left = hoverX + 'px';
      tip.textContent = UFO.fmt((hoverX / r.width) * UFO.TOTAL);
    }
    wrap.classList.add('hovering');
    draw();
  });
  wrap.addEventListener('mouseleave', function () {
    hoverX = -1;
    wrap.classList.remove('hovering');
    draw();
  });

  if (mini && miniWrap) {
    miniWrap.addEventListener('click', function (e) {
      const r = miniWrap.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      window.scrollTo({ top: frac * UFO.maxScroll(), behavior: UFO.reduced ? 'auto' : 'smooth' });
    });
    const deck = wrap.closest('.deck') || wrap;
    const navH = parseInt(css.getPropertyValue('--nav-h'), 10) || 64;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          miniOn = !en.isIntersecting && en.boundingClientRect.top < window.innerHeight / 2;
          mini.classList.toggle('show', miniOn);
          draw();
        });
      }, { rootMargin: '-' + navH + 'px 0px 0px 0px' }).observe(deck);
    }
  }

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
      placeMarkers();
      draw();
      if (UFO.stampSections) UFO.stampSections();
    }).observe(document.body);
  }
  resize();
})();
