(() => {
  if (window.CC_MOTION) return;

  const state = {
    revealObserver: null,
    revealRoots: new WeakSet(),
    splitRoots: new WeakSet(),
    navBound: false,
    navBusy: false,
    overlay: null,
    magneticRoots: new WeakSet(),
    liftRoots: new WeakSet(),
    oracleBooted: false
  };

  const isReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const ensureOverlay = () => {
    if (state.overlay && document.body.contains(state.overlay)) return state.overlay;
    const overlay = document.createElement('div');
    overlay.className = 'cc-nav-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
    state.overlay = overlay;
    return overlay;
  };

  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const readSecondsVar = (name, fallbackSeconds) => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!raw) return fallbackSeconds;
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) return fallbackSeconds;
    if (raw.endsWith('ms')) return value / 1000;
    return value;
  };
  const readPxVar = (name, fallbackPx) => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : fallbackPx;
  };

  const splitElementIntoLines = (el) => {
    if (!(el instanceof HTMLElement)) return;
    if (el.dataset.splitDone === '1') return;
    const original = String(el.textContent || '').trim();
    if (!original) return;
    el.dataset.splitDone = '1';
    el.dataset.splitOriginal = original;
    el.setAttribute('aria-label', original);

    const words = original.split(/\s+/).filter(Boolean);
    el.textContent = '';
    const wordSpans = [];
    words.forEach((word, idx) => {
      const w = document.createElement('span');
      w.textContent = word;
      w.style.display = 'inline-block';
      w.style.whiteSpace = 'pre';
      w.dataset.splitWord = '1';
      w.setAttribute('aria-hidden', 'true');
      el.appendChild(w);
      if (idx < words.length - 1) el.appendChild(document.createTextNode(' '));
      wordSpans.push(w);
    });

    const lines = [];
    let current = [];
    let top = null;
    wordSpans.forEach((wordSpan) => {
      const t = wordSpan.offsetTop;
      if (top === null) top = t;
      if (Math.abs(t - top) > 2) {
        lines.push(current);
        current = [];
        top = t;
      }
      current.push(wordSpan.textContent || '');
    });
    if (current.length) lines.push(current);

    el.textContent = '';
    lines.forEach((lineWords, idx) => {
      const line = document.createElement('span');
      line.className = 'cc-split-line';
      line.style.setProperty('--line-delay', `${(idx * readSecondsVar('--stagger', 0.08)).toFixed(3)}s`);
      line.textContent = lineWords.join(' ');
      line.setAttribute('aria-hidden', 'true');
      el.appendChild(line);
    });
    el.dataset.splitReady = '1';
  };

  const initSplitLines = (root = document) => {
    if (!(root instanceof Element || root instanceof Document)) return;
    if (state.splitRoots.has(root)) return;
    state.splitRoots.add(root);
    const nodes = Array.from(root.querySelectorAll('[data-split="lines"]'));
    nodes.forEach((el) => splitElementIntoLines(el));
  };

  const setStaggerDelays = (el) => {
    if (el.dataset.reveal !== 'stagger-children') return;
    const staggerStep = readSecondsVar('--stagger', 0.08);
    const children = Array.from(el.children);
    children.forEach((child, idx) => {
      if (!(child instanceof HTMLElement)) return;
      child.style.setProperty('--item-delay', `${(idx * staggerStep).toFixed(3)}s`);
    });
  };

  const initReveals = (root = document) => {
    if (!(root instanceof Element || root instanceof Document)) return;
    if (state.revealRoots.has(root)) return;
    state.revealRoots.add(root);

    const nodes = Array.from(root.querySelectorAll('[data-reveal]'));
    if (!nodes.length) return;

    if (isReducedMotion() || !('IntersectionObserver' in window)) {
      nodes.forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        setStaggerDelays(el);
        el.classList.add('is-inview');
      });
      return;
    }

    if (!state.revealObserver) {
      state.revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) return;
          const el = entry.target;
          setStaggerDelays(el);
          el.classList.add('is-inview');
          state.revealObserver?.unobserve(el);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });
    }

    nodes.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      state.revealObserver.observe(el);
    });
  };

  const initNavOverlay = () => {
    if (state.navBound) return;
    state.navBound = true;
    ensureOverlay();

    document.addEventListener('click', async (event) => {
      if (event.defaultPrevented || state.navBusy) return;
      const anchor = event.target.closest('a[href^="#"]');
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const href = anchor.getAttribute('href') || '';
      if (!href || href === '#' || href.toLowerCase() === '#top') return;
      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      state.navBusy = true;
      const overlay = ensureOverlay();
      document.documentElement.classList.add('cc-nav-transitioning');
      const fastMs = Math.round(readSecondsVar('--dur-fast', 0.28) * 1000);
      overlay.classList.add('is-active');
      await wait(fastMs);

      target.scrollIntoView({ behavior: isReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      await wait(isReducedMotion() ? 90 : Math.max(240, fastMs));

      overlay.classList.remove('is-active');
      await wait(Math.round(fastMs * 0.55));
      document.documentElement.classList.remove('cc-nav-transitioning');
      state.navBusy = false;
    }, { passive: false });
  };

  const initAlgorithmCardsInteractions = (root = document) => {
    if (isReducedMotion()) return;
    if (!window.CARDS || typeof window.CARDS.enableDepth !== 'function') return;
    window.CARDS.enableDepth(root);
  };

  const initMagnetic = (root = document) => {
    if (isReducedMotion() || !isFinePointer()) return;
    if (!(root instanceof Element || root instanceof Document)) return;
    if (state.magneticRoots.has(root)) return;
    state.magneticRoots.add(root);
    const nodes = Array.from(root.querySelectorAll('[data-magnetic]'));
    const max = 14;
    nodes.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      if (el.dataset.magneticBound === '1') return;
      el.dataset.magneticBound = '1';
      const reset = () => {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
        el.classList.remove('is-magnetic');
      };
      el.addEventListener('pointermove', (event) => {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const dx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const dy = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        const mx = Math.max(-max, Math.min(max, dx * max));
        const my = Math.max(-max, Math.min(max, dy * max));
        el.style.setProperty('--mx', `${mx.toFixed(2)}px`);
        el.style.setProperty('--my', `${my.toFixed(2)}px`);
        el.classList.add('is-magnetic');
      }, { passive: true });
      el.addEventListener('pointerleave', reset, { passive: true });
      el.addEventListener('blur', reset, { passive: true });
    });
  };

  const initLiftDrop = (root = document) => {
    if (isReducedMotion()) return;
    if (!(root instanceof Element || root instanceof Document)) return;
    if (state.liftRoots.has(root)) return;
    state.liftRoots.add(root);
    const nodes = Array.from(root.querySelectorAll('[data-liftdrop], .card-3d.is-active'));
    nodes.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      if (el.dataset.liftBound === '1') return;
      el.dataset.liftBound = '1';
      el.addEventListener('click', () => {
        el.classList.remove('is-liftdrop');
        void el.offsetWidth;
        el.classList.add('is-liftdrop');
        window.setTimeout(() => el.classList.remove('is-liftdrop'), 360);
      });
    });
  };

  const initOracleCameo = () => {
    if (state.oracleBooted) return;
    const canvas = document.querySelector('[data-oracle-canvas]');
    if (!(canvas instanceof HTMLCanvasElement)) return;
    state.oracleBooted = true;
    const reduce = isReducedMotion();
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduce || coarse || !('IntersectionObserver' in window)) return;

    const start = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      window.addEventListener('resize', resize, { passive: true });

      let raf = 0;
      const render = (t) => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (!w || !h) {
          raf = requestAnimationFrame(render);
          return;
        }
        const cx = w * 0.5;
        const cy = h * 0.54;
        const r = Math.min(w, h) * 0.19;
        ctx.clearRect(0, 0, w, h);

        const glow = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 2.5);
        glow.addColorStop(0, 'rgba(255,190,126,0.38)');
        glow.addColorStop(1, 'rgba(255,190,126,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.translate(cx, cy);
        const rot = t * 0.00035;
        ctx.rotate(rot);
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath();
          ctx.strokeStyle = i === 1 ? 'rgba(255,188,126,0.72)' : 'rgba(160,212,255,0.45)';
          ctx.lineWidth = i === 1 ? 1.6 : 1.1;
          ctx.ellipse(0, 0, r * (1.26 + i * 0.06), r * (0.44 + i * 0.04), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        const sphere = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.34, r * 0.08, cx, cy, r);
        sphere.addColorStop(0, 'rgba(245,249,255,0.95)');
        sphere.addColorStop(0.52, 'rgba(154,189,245,0.74)');
        sphere.addColorStop(1, 'rgba(18,30,58,0.9)');
        ctx.beginPath();
        ctx.fillStyle = sphere;
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.24)';
        ctx.lineWidth = 1;
        ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
        ctx.stroke();

        canvas.classList.add('is-ready');
        raf = requestAnimationFrame(render);
      };
      raf = requestAnimationFrame(render);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        start();
      });
    }, { threshold: 0.25 });
    io.observe(canvas);
  };

  window.CC_MOTION = {
    initHomeReveals(root = document) {
      initSplitLines(root);
      initReveals(root);
    },
    initAlgorithmsReveals(root = document) {
      initSplitLines(root);
      initReveals(root);
    },
    initNavOverlay,
    initAlgorithmCardsInteractions,
    initMagnetic,
    initLiftDrop,
    initOracleCameo
  };
})();
