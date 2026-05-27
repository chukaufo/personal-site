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

const interactiveEls = 'a, button, .project-card, .article-row, .skill-item, .slide-btn';
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

/* ── Active Nav on Scroll ── */
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

/* ── Project Card Carousel ── */
function initCard(card) {
  const slides = card.querySelectorAll('.card-slide');
  const screenshotSlide = card.querySelector('[data-slide="screenshots"]');
  const screenshots = screenshotSlide ? screenshotSlide.querySelectorAll('.screenshot') : [];
  let currentScreenshot = 0;

  // Build dots
  const dotsContainer = screenshotSlide ? screenshotSlide.querySelector('.screenshot-dots') : null;
  if (dotsContainer && screenshots.length > 1) {
    screenshots.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', e => {
        e.stopPropagation();
        showScreenshot(i);
      });
      dotsContainer.appendChild(dot);
    });
  }

  function showScreenshot(index) {
    screenshots.forEach(s => s.classList.remove('active'));
    screenshots[index].classList.add('active');
    currentScreenshot = index;
    if (dotsContainer) {
      dotsContainer.querySelectorAll('.dot').forEach((d, i) => {
        d.classList.toggle('active', i === index);
      });
    }
  }

  function showSlide(name) {
    slides.forEach(s => s.classList.remove('active'));
    const target = card.querySelector(`[data-slide="${name}"]`);
    if (target) target.classList.add('active');
  }

  // Slide buttons
  card.querySelectorAll('.slide-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const dir = btn.dataset.dir;
      if (dir === 'next') {
        showSlide('screenshots');
      } else if (dir === 'prev') {
        showSlide('info');
        currentScreenshot = 0;
        showScreenshot(0);
      } else if (dir === 'screenshot-next') {
        const next = (currentScreenshot + 1) % screenshots.length;
        showScreenshot(next);
      } else if (dir === 'screenshot-prev') {
        const prev = (currentScreenshot - 1 + screenshots.length) % screenshots.length;
        showScreenshot(prev);
      }
    });
  });

  // Tap card = toggle between info and screenshots (if not tapping a button or link)
  card.addEventListener('click', e => {
    if (e.target.closest('.slide-btn') || e.target.closest('.proj-arrow')) return;
    const activeSlide = card.querySelector('.card-slide.active');
    if (activeSlide && activeSlide.dataset.slide === 'info') {
      showSlide('screenshots');
    } else {
      showSlide('info');
      currentScreenshot = 0;
      showScreenshot(0);
    }
  });

  // Touch swipe support for screenshots
  let touchStartX = 0;
  if (screenshotSlide) {
    screenshotSlide.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    screenshotSlide.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          const next = (currentScreenshot + 1) % screenshots.length;
          showScreenshot(next);
        } else {
          const prev = (currentScreenshot - 1 + screenshots.length) % screenshots.length;
          showScreenshot(prev);
        }
      }
    }, { passive: true });
  }
}

document.querySelectorAll('.project-card').forEach(initCard);

/* ── Article Row Clicks ── */
document.querySelectorAll('.article-row[data-href]').forEach(row => {
  row.addEventListener('click', () => {
    const url = row.dataset.href;
    if (url && url !== '#') window.open(url, '_blank');
  });
});

/* ── Skill Bars ── */
const skillsGrid = document.getElementById('skills-grid');

const skillObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.skill-item').forEach((item, i) => {
        const bar = item.querySelector('.skill-bar');
        const pct = item.dataset.pct || 0;
        setTimeout(() => { bar.style.width = pct + '%'; }, i * 80);
      });
      skillObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

if (skillsGrid) skillObserver.observe(skillsGrid);

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