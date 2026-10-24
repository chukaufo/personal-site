/* chukaufo.xyz: starfield background */
(function () {
  const c = document.getElementById('stars');
  if (!c) return;
  const ctx = c.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, stars = [];

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
    ctx.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  if (reduce) window.addEventListener('scroll', function () { draw(0); }, { passive: true });
  else requestAnimationFrame(draw);
})();
