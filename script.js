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

const interactiveEls = 'a, button, .project-card, .article-row, .skill-item';
document.querySelectorAll(interactiveEls).forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.style.transform += ' scale(2)';
    ring.style.opacity = '0.9';
    ring.style.transform += ' scale(1.5)';
  });
  el.addEventListener('mouseleave', () => {
    ring.style.opacity = '0.5';
  });
});

/* ── Smooth Scroll via nav links and buttons ── */
document.querySelectorAll('[data-target], [data-scroll]').forEach(el => {
  el.addEventListener('click', () => {
    const id = el.dataset.target || el.dataset.scroll;
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ── Active nav highlighting on scroll ── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a[data-target]');

const navObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.target === entry.target.id);
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => navObserver.observe(s));

/* ── Project & Article card clicks ── */
document.querySelectorAll('.project-card[data-href]').forEach(card => {
  card.addEventListener('click', () => {
    const url = card.dataset.href;
    if (url && url !== '#') window.open(url, '_blank');
  });
});

document.querySelectorAll('.article-row[data-href]').forEach(row => {
  row.addEventListener('click', () => {
    const url = row.dataset.href;
    if (url && url !== '#') window.open(url, '_blank');
  });
});

/* ── Skill bars animate on scroll into view ── */
const skillsGrid = document.getElementById('skills-grid');

const skillObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.skill-item').forEach((item, i) => {
        const bar = item.querySelector('.skill-bar');
        const pct = item.dataset.pct || 0;
        setTimeout(() => {
          bar.style.width = pct + '%';
        }, i * 80);
      });
      skillObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

if (skillsGrid) skillObserver.observe(skillsGrid);

/* ── Hero entrance animation ── */
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
