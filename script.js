/* ── Custom Cursor ── */
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;
  cursor.style.transform = `translate(${mx - 6}px, ${my - 6}px)`;
});

function animateRing() {
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;
  ring.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`;
  requestAnimationFrame(animateRing);
}
animateRing();

const interactiveEls = 'a, button, .past-row, .ufo-does li';
document.querySelectorAll(interactiveEls).forEach(el => {
  el.addEventListener('mouseenter', () => {
    ring.style.opacity = '0.9';
    ring.style.transform += ' scale(1.5)';
  });
  el.addEventListener('mouseleave', () => {
    ring.style.opacity = '0.5';
  });
});

/* ── Smooth Scroll ── */
document.querySelectorAll('[data-target], [data-scroll]').forEach(el => {
  el.addEventListener('click', () => {
    const id = el.dataset.target || el.dataset.scroll;
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ── Active Nav on Scroll ──
   Picks whichever section has crossed a line ~30% down the screen,
   so tall sections (Uforiya) highlight just like short ones. */
const navLinks = [...document.querySelectorAll('.nav-links a[data-target]')];
const navSections = navLinks
  .map(link => document.getElementById(link.dataset.target))
  .filter(Boolean);

function updateActiveNav() {
  const line = window.innerHeight * 0.3;
  let current = navSections[0];

  navSections.forEach(section => {
    if (section.getBoundingClientRect().top <= line) current = section;
  });

  // At the very bottom, highlight the last section (Contact is too short to reach the line)
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  if (atBottom) current = navSections[navSections.length - 1];

  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.target === current.id);
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });
window.addEventListener('resize', updateActiveNav);
updateActiveNav();

/* ── Hero Entrance ── */
window.addEventListener('load', () => {
  const heroEls = document.querySelectorAll('.hero-tag, .hero-name, .hero-sub, .hero-ctas');
  heroEls.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.6s ease ${i * 0.12}s, transform 0.6s ease ${i * 0.12}s`;
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  });
});
