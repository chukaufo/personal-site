/* chukaufo.xyz: solo a channel, remix the page */
(function () {
  const channels = Array.from(document.querySelectorAll('.channel[data-solo]'));
  if (!channels.length) return;
  const panels = Array.from(document.querySelectorAll('.solo-panel'));
  const sections = Array.from(document.querySelectorAll('[data-stems]'));
  const MIXES = ['all', 'client', 'musician'];

  function setMix(mix) {
    if (MIXES.indexOf(mix) < 0) mix = 'all';
    document.body.dataset.mix = mix;
    channels.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.solo === mix)); });
    panels.forEach(function (p) { p.hidden = p.dataset.panel !== mix; });
    sections.forEach(function (s) {
      const stems = s.dataset.stems.split(' ');
      const audible = mix === 'all' || stems.indexOf('all') >= 0 || stems.indexOf(mix) >= 0;
      s.classList.toggle('is-muted', !audible);
    });
    document.dispatchEvent(new CustomEvent('ufo:mix', { detail: mix }));
  }

  channels.forEach(function (c) {
    c.addEventListener('click', function () {
      const m = c.dataset.solo;
      // clicking the soloed channel again goes back to the full mix
      setMix(m !== 'all' && document.body.dataset.mix === m ? 'all' : m);
    });
  });

  // chukaufo.xyz/?for=client opens already soloed
  const q = new URLSearchParams(window.location.search).get('for');
  setMix(q || 'all');
})();
