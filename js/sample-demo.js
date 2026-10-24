/* chukaufo.xyz: Sample Organizer demo on a fake library */
(function () {
  const root = document.getElementById('so-demo');
  if (!root) return;
  const list = document.getElementById('so-list');
  const scanBtn = document.getElementById('so-scan');
  const cleanBtn = document.getElementById('so-clean');
  const restoreBtn = document.getElementById('so-restore');
  const reclaimEl = document.getElementById('so-reclaim');
  const reclaimLabel = document.getElementById('so-reclaim-label');
  const statusEl = document.getElementById('so-status');
  const fast = !!(window.UFO && window.UFO.reduced);

  // h = content hash. Same h means byte-identical, whatever the name.
  const FILES = [
    { kit: 'Midnight Kit', name: 'kick_hard.wav', size: 412, h: 'a' },
    { kit: 'Trap Essentials Vol 2', name: 'KICK 04.wav', size: 412, h: 'a' },
    { kit: 'Midnight Kit', name: 'snare_crack.wav', size: 268, h: 'b' },
    { kit: 'Free Kit (Final)', name: 'snare (1).wav', size: 268, h: 'b' },
    { kit: 'Trap Essentials Vol 2', name: 'Snare Crack.wav', size: 268, h: 'b' },
    { kit: 'Midnight Kit', name: 'open_hat.wav', size: 190, h: 'c' },
    { kit: 'Space Drums', name: 'hat_open_01.wav', size: 190, h: 'c' },
    { kit: 'Space Drums', name: '808_glide_C.wav', size: 1240, h: 'd' },
    { kit: 'Free Kit (Final)', name: '808 (glide).wav', size: 1240, h: 'd' },
    { kit: 'Space Drums', name: 'perc_ufo.wav', size: 156, h: 'e' },
    { kit: 'Midnight Kit', name: 'clap_wide.wav', size: 224, h: 'f' },
    { kit: 'Space Drums', name: 'clap_wide_v2.wav', size: 226, h: 'g' }
  ];
  let busy = false;

  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, fast ? 0 : ms); }); };
  const fmtSize = function (kb) { return kb >= 1000 ? (kb / 1000).toFixed(2) + ' MB' : kb + ' KB'; };
  const setReclaim = function (kb) { reclaimEl.textContent = (kb / 1000).toFixed(2) + ' MB'; };

  function row(f) {
    const li = document.createElement('li');
    li.className = 'so-row';
    li.innerHTML = '<span class="so-file"><span class="so-kit"></span><span class="so-name"></span></span><span class="so-size"></span><span class="so-state"></span>';
    li.querySelector('.so-kit').textContent = f.kit + ' / ';
    li.querySelector('.so-name').textContent = f.name;
    li.querySelector('.so-size').textContent = fmtSize(f.size);
    f.el = li;
    setState(f, f.state || 'idle');
    return li;
  }
  function setState(f, s) {
    f.state = s;
    if (!f.el) return;
    f.el.dataset.state = s;
    f.el.querySelector('.so-state').textContent = s;
  }
  function header(text) {
    const li = document.createElement('li');
    li.className = 'so-group';
    li.textContent = text;
    return li;
  }
  function renderFlat() {
    list.innerHTML = '';
    FILES.forEach(function (f) { f.state = 'idle'; list.appendChild(row(f)); });
  }

  function animateReclaim(to) {
    if (fast) return setReclaim(to);
    const t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / 900);
      setReclaim(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  async function scan() {
    if (busy) return;
    busy = true;
    scanBtn.disabled = true; cleanBtn.disabled = true; restoreBtn.hidden = true;
    reclaimLabel.textContent = 'Reclaimable';
    setReclaim(0);
    renderFlat();
    for (let i = 0; i < FILES.length; i++) {
      setState(FILES[i], 'hashing');
      statusEl.textContent = `Hashing ${i + 1} of ${FILES.length}. Comparing bytes, not names.`;
      await sleep(110);
      setState(FILES[i], 'hashed');
    }

    const byHash = {};
    FILES.forEach(function (f) { (byHash[f.h] = byHash[f.h] || []).push(f); });
    const groups = Object.values(byHash);
    const dups = groups.filter(function (g) { return g.length > 1; });
    const uniques = groups.filter(function (g) { return g.length === 1; }).map(function (g) { return g[0]; });

    list.innerHTML = '';
    let freed = 0, copies = 0;
    dups.forEach(function (g, gi) {
      list.appendChild(header(`Group ${gi + 1} · ${g.length} identical files`));
      g.forEach(function (f, i) {
        f.state = i === 0 ? 'keep' : 'copy';
        if (i > 0) { freed += f.size; copies++; }
        list.appendChild(row(f));
      });
    });
    list.appendChild(header('Unique · nothing to remove'));
    uniques.forEach(function (f) { f.state = 'unique'; list.appendChild(row(f)); });

    animateReclaim(freed);
    statusEl.textContent = `${dups.length} groups, ${copies} copies. clap_wide and clap_wide_v2 sound alike but aren't identical, so both stay.`;
    scanBtn.textContent = 'Scan again';
    scanBtn.disabled = false; cleanBtn.disabled = false;
    busy = false;
  }

  async function clean() {
    if (busy) return;
    busy = true;
    cleanBtn.disabled = true; scanBtn.disabled = true;
    const copies = FILES.filter(function (f) { return f.state === 'copy'; });
    for (const f of copies) { setState(f, 'quarantined'); await sleep(140); }
    reclaimLabel.textContent = 'Freed';
    statusEl.textContent = `${copies.length} copies moved to quarantine. One copy of every sample kept. Nothing is deleted until you say so.`;
    restoreBtn.hidden = false; scanBtn.disabled = false;
    busy = false;
  }

  function restore() {
    if (busy) return;
    FILES.forEach(function (f) { if (f.state === 'quarantined') setState(f, 'copy'); });
    reclaimLabel.textContent = 'Reclaimable';
    restoreBtn.hidden = true; cleanBtn.disabled = false;
    statusEl.textContent = 'Everything put back where it was.';
  }

  scanBtn.addEventListener('click', scan);
  cleanBtn.addEventListener('click', clean);
  restoreBtn.addEventListener('click', restore);
  renderFlat();
})();
