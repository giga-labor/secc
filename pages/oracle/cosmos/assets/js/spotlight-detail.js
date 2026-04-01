document.addEventListener('DOMContentLoaded', () => {
  if (window.CARDS && typeof window.CARDS.enableDepth === 'function') {
    window.CARDS.enableDepth(document);
  }
  bindSpotlightHeroFallbackDepth();
  const layouts = document.querySelectorAll('[data-spotlight-layout]');
  layouts.forEach((layout) => initSpotlightLayout(layout));
});

function initSpotlightLayout(layout) {
  const card = layout.querySelector('[data-spotlight-card]');
  if (!card) return;

  const activate = () => {
    layout.classList.add('is-selected');
  };

  card.addEventListener('click', activate);
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  });
}

function bindSpotlightHeroFallbackDepth() {
  const heroes = document.querySelectorAll('[data-spotlight-hero-card]');
  heroes.forEach((card) => {
    // Always bind a dedicated spotlight glow handler: this guarantees mouse-light effects
    // even when global depth binding is absent or overridden by page-specific styles.
    if (card.dataset.heroDepthBound === '1') return;
    card.dataset.heroDepthBound = '1';
    let rect = null;
    let raf = 0;
    let pending = null;

    const reset = () => {
      card.style.setProperty('--card-rotate-x', '0deg');
      card.style.setProperty('--card-rotate-y', '0deg');
      card.style.setProperty('--card-glow-x', '50%');
      card.style.setProperty('--card-glow-y', '12%');
      card.style.setProperty('--spotlight-glow-x', '50%');
      card.style.setProperty('--spotlight-glow-y', '18%');
      card.style.setProperty('--card-lift', '0px');
      card.style.setProperty('--card-z', '0px');
      card.style.setProperty('--edge-left-a', '0.18');
      card.style.setProperty('--edge-right-a', '0.18');
      card.style.setProperty('--edge-top-a', '0.24');
      card.style.setProperty('--edge-bottom-a', '0.24');
      card.style.setProperty('--edge-spread', '7%');
      card.style.setProperty('--edge-spread-top', '7%');
      card.style.setProperty('--edge-spread-bottom', '8%');
    };

    const onMove = (event) => {
      if (event.pointerType === 'touch') return;
      if (!rect) rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pending = { x: event.clientX, y: event.clientY };
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        if (!pending || !rect) return;
        const x = Math.min(Math.max((pending.x - rect.left) / rect.width, 0), 1);
        const y = Math.min(Math.max((pending.y - rect.top) / rect.height, 0), 1);
        const dx = x * 2 - 1;
        const dy = y * 2 - 1;

        card.style.setProperty('--card-glow-x', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--card-glow-y', `${(y * 100).toFixed(1)}%`);
        card.style.setProperty('--spotlight-glow-x', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--spotlight-glow-y', `${(y * 100).toFixed(1)}%`);
        card.style.setProperty('--card-rotate-x', `${(-6 * dy).toFixed(2)}deg`);
        card.style.setProperty('--card-rotate-y', `${(8 * dx).toFixed(2)}deg`);
        card.style.setProperty('--edge-left-a', (0.14 + Math.max(0, -dx) * 0.26).toFixed(3));
        card.style.setProperty('--edge-right-a', (0.14 + Math.max(0, dx) * 0.26).toFixed(3));
        card.style.setProperty('--edge-top-a', (0.16 + Math.max(0, -dy) * 0.24).toFixed(3));
        card.style.setProperty('--edge-bottom-a', (0.16 + Math.max(0, dy) * 0.24).toFixed(3));
        card.classList.add('is-hovered');
      });
    };

    const onEnter = () => {
      rect = card.getBoundingClientRect();
      card.classList.add('is-hovered');
      card.style.setProperty('--card-lift', '-8px');
      card.style.setProperty('--card-z', '10px');
    };

    const onLeave = () => {
      card.classList.remove('is-hovered');
      rect = null;
      pending = null;
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
      reset();
    };

    card.addEventListener('pointerenter', onEnter, { passive: true });
    card.addEventListener('pointermove', onMove, { passive: true });
    card.addEventListener('pointerleave', onLeave, { passive: true });
    card.addEventListener('pointercancel', onLeave, { passive: true });

    reset();
  });
}
