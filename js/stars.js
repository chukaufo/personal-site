/* chukaufo.xyz: starfield background */
(function () {
  const c = document.getElementById('stars');
  if (!c) return;
  const ctx = c.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, stars = [];

  // signals arriving: a faint ring now and then on a random star; synth notes send brighter ones
  const pulses = [];
  let nextPulse = 0;
  function spawn(time, strong) {
    if (reduce || !stars.length || pulses.length > 6) return;
    pulses.push({ s: stars[Math.floor(Math.random() * stars.length)], t0: time, strong: !!strong });
  }
  window.UFO = window.UFO || {};
  window.UFO.pulse = function () { spawn(performance.now(), true); };
  const KEYS = 'asdfghjk';
  document.addEventListener('keydown', function (e) {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (KEYS.indexOf((e.key || '').toLowerCase()) >= 0 && document.querySelector('.sound-on')) window.UFO.pulse();
  });
  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('.keys button')) window.UFO.pulse();
  });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    c.style.width = w + 'px'; c.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((w * h) / 9000);
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({ x: Math.random() * w, y: Math.random() * h, z: Math.random() * 0.8 + 0.2, t: Math.random() * Math.PI * 2 });
    }
    if (reduce) draw(0);
  }

  function draw(time) {
    ctx.clearRect(0, 0, w, h);
    const sy = window.scrollY;
    for (const s of stars) {
      let y = (s.y - sy * s.z * 0.15) % h;
      if (y < 0) y += h;
      const tw = reduce ? 1 : 0.6 + 0.4 * Math.sin(time * 0.001 * s.z + s.t);
      ctx.globalAlpha = s.z * 0.8 * tw;
      ctx.fillStyle = s.z > 0.85 ? '#b9a6ff' : '#ffffff';
      const r = s.z * 1.2;
      ctx.fillRect(s.x, y, r, r);
    }
    if (!reduce) {
      if (time > nextPulse) {
        if (nextPulse) spawn(time, false);
        nextPulse = time + (w < 600 ? 5200 : 2600) + Math.random() * 2600;
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        const k = (time - p.t0) / (p.strong ? 1300 : 1800);
        if (k >= 1) { pulses.splice(i, 1); continue; }
        if (k < 0) continue;
        let py = (p.s.y - sy * p.s.z * 0.15) % h;
        if (py < 0) py += h;
        ctx.globalAlpha = (1 - k) * (p.strong ? 0.8 : 0.45);
        ctx.strokeStyle = p.strong ? '#4ef0a0' : '#9b7ff7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.s.x, py, 2 + k * (p.strong ? 46 : 30), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  if (reduce) window.addEventListener('scroll', function () { draw(0); }, { passive: true });
  else requestAnimationFrame(draw);
})();
