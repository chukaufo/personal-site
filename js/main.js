/* chukaufo.xyz: shared helpers, timecode, nav, reveals, tabs, stats */
(function () {
  const UFO = (window.UFO = window.UFO || {});
  UFO.TOTAL = 227; // the page "runs" 03:47
  UFO.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  UFO.fmt = function (sec, frames) {
    sec = Math.max(0, sec);
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    let out = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    if (frames) out += ':' + String(Math.floor((sec % 1) * 30)).padStart(2, '0');
    return out;
  };
  UFO.maxScroll = function () { return Math.max(1, document.documentElement.scrollHeight - window.innerHeight); };
  UFO.progress = function () { return Math.min(1, Math.max(0, window.scrollY / UFO.maxScroll())); };
  UFO.posOf = function (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    return Math.min(1, Math.max(0, top / UFO.maxScroll()));
  };

  // timecode + nav background
  const nav = document.getElementById('nav');
  const tc = document.getElementById('timecode');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if (tc) tc.textContent = UFO.fmt(UFO.progress() * UFO.TOTAL, true);
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 8);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // section timestamps
  UFO.stampSections = function () {
    document.querySelectorAll('section[id], header[id]').forEach(function (sec) {
      const t = sec.querySelector('[data-time]');
      if (t) t.textContent = UFO.fmt(UFO.posOf(sec) * UFO.TOTAL);
    });
  };
  window.addEventListener('load', UFO.stampSections);
  window.addEventListener('resize', UFO.stampSections);
  document.addEventListener('ufo:mix', UFO.stampSections);
  UFO.stampSections();

  // logo back to top
  const logo = document.querySelector('.nav-logo');
  if (logo) {
    logo.setAttribute('role', 'link');
    logo.setAttribute('tabindex', '0');
    logo.setAttribute('aria-label', 'Back to top');
    const toTop = function () { window.scrollTo({ top: 0, behavior: UFO.reduced ? 'auto' : 'smooth' }); };
    logo.addEventListener('click', toTop);
    logo.addEventListener('keydown', function (e) { if (e.key === 'Enter') toTop(); });
  }

  // active nav link + reveals
  const links = Array.from(document.querySelectorAll('.nav-links a'));
  const byId = {};
  links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('active'); });
        const a = byId[en.target.id];
        if (a) a.classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });

    const rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); rio.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { rio.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  // cover tilt
  const art = document.querySelector('.cover-art');
  if (art && !UFO.reduced && window.matchMedia('(hover: hover)').matches) {
    art.addEventListener('mousemove', function (e) {
      const r = art.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      art.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg');
      art.style.setProperty('--rx', (-y * 14).toFixed(2) + 'deg');
    });
    art.addEventListener('mouseleave', function () {
      art.style.setProperty('--ry', '0deg');
      art.style.setProperty('--rx', '0deg');
    });
  }

  // screenshot tabs
  document.querySelectorAll('.shots').forEach(function (box) {
    const tabs = box.querySelectorAll('.shot-tab');
    const shots = box.querySelectorAll('.shot');
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t, j) { t.setAttribute('aria-selected', String(i === j)); });
        shots.forEach(function (s, j) { s.classList.toggle('active', i === j); });
      });
    });
  });

  // stat count up
  const nums = document.querySelectorAll('[data-count]');
  if (nums.length && 'IntersectionObserver' in window && !UFO.reduced) {
    const cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        const el = en.target;
        const end = parseFloat(el.dataset.count);
        const dec = parseInt(el.dataset.dec || '0', 10);
        const suffix = el.dataset.suffix || '';
        const t0 = performance.now();
        const dur = 1400;
        (function step(now) {
          const k = Math.min(1, (now - t0) / dur);
          const v = end * (1 - Math.pow(1 - k, 3));
          el.textContent = v.toLocaleString('en-CA', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { cio.observe(n); });
  }
})();
