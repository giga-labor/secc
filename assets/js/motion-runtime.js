(() => {
  if (window.CC_MOTION_RUNTIME) return;

  const state = {
    initialized: false,
    paused: false,
    reduced: false,
    lenis: null,
    cleanups: []
  };

  const addCleanup = (fn) => {
    if (typeof fn !== 'function') return;
    state.cleanups.push(fn);
  };

  const runCleanups = () => {
    while (state.cleanups.length) {
      const fn = state.cleanups.pop();
      try {
        fn();
      } catch (_) {
        // no-op
      }
    }
  };

  const loadScript = (url, globalName, timeoutMs = 4000) => new Promise((resolve) => {
    if (globalName && window[globalName]) {
      resolve(window[globalName]);
      return;
    }
    const existing = document.querySelector(`script[data-cc-lib="${globalName || url}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(globalName ? window[globalName] : true), { once: true });
      existing.addEventListener('error', () => resolve(null), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.defer = true;
    script.dataset.ccLib = globalName || url;
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    script.onload = () => finish(globalName ? window[globalName] : true);
    script.onerror = () => finish(null);
    window.setTimeout(() => finish(globalName ? window[globalName] : null), timeoutMs);
    document.head.appendChild(script);
  });

  const ensureGsapStack = async () => {
    const gsapLib = await loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js', 'gsap');
    if (!gsapLib) return null;
    const scrollTrigger = await loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js', 'ScrollTrigger');
    if (scrollTrigger && gsapLib.registerPlugin) {
      gsapLib.registerPlugin(scrollTrigger);
    }
    return { gsap: gsapLib, ScrollTrigger: scrollTrigger || null };
  };

  const ensureLenis = async () => {
    const LenisCtor = await loadScript('https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/bundled/lenis.min.js', 'Lenis');
    return LenisCtor || null;
  };

  const initSplitText = () => {
    const nodes = Array.from(document.querySelectorAll('[data-split]'));
    if (!nodes.length) return;

    nodes.forEach((node) => {
      if (node.dataset.splitReady === '1') return;
      const mode = node.dataset.split || 'words';
      const source = (node.textContent || '').trim();
      if (!source) return;
      node.dataset.splitSource = source;
      node.textContent = '';
      const frag = document.createDocumentFragment();
      if (mode === 'lines') {
        source.split(/\s+/).forEach((token) => {
          const span = document.createElement('span');
          span.className = 'cc-split-token';
          span.textContent = token;
          frag.appendChild(span);
          frag.appendChild(document.createTextNode(' '));
        });
      } else {
        source.split('').forEach((token) => {
          const span = document.createElement('span');
          span.className = 'cc-split-token';
          span.textContent = token;
          frag.appendChild(span);
        });
      }
      node.appendChild(frag);
      node.dataset.splitReady = '1';
    });
  };

  const initRevealSystem = () => {
    const targets = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!targets.length) return;

    targets.forEach((node) => {
      node.classList.add('cc-reveal');
      const variant = node.dataset.reveal || 'fade-up';
      node.classList.add(`cc-reveal--${variant}`);
    });

    if (!('IntersectionObserver' in window)) {
      targets.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -10% 0px' });

    targets.forEach((node) => observer.observe(node));
    addCleanup(() => observer.disconnect());
  };

  const initHoverTilt = () => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (state.reduced) return;

    const targets = Array.from(document.querySelectorAll('[data-tilt], .card-3d, .cc-card--featured'));
    targets.forEach((el) => {
      if (el.dataset.tiltReady === '1') return;
      el.dataset.tiltReady = '1';
      let rafId = 0;
      const onMove = (event) => {
        if (state.paused) return;
        if (rafId) return;
        rafId = window.requestAnimationFrame(() => {
          rafId = 0;
          const rect = el.getBoundingClientRect();
          const px = (event.clientX - rect.left) / Math.max(rect.width, 1);
          const py = (event.clientY - rect.top) / Math.max(rect.height, 1);
          const rx = (py - 0.5) * -10;
          const ry = (px - 0.5) * 10;
          el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
        });
      };
      const onLeave = () => {
        el.style.transform = '';
      };
      el.addEventListener('mousemove', onMove, { passive: true });
      el.addEventListener('mouseleave', onLeave, { passive: true });
      addCleanup(() => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
      });
    });
  };

  const initMagnetic = () => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (state.reduced) return;
    const targets = Array.from(document.querySelectorAll('[data-magnetic], .cc-abovefold-cta a:first-child'));
    targets.forEach((el) => {
      if (el.dataset.magneticReady === '1') return;
      el.dataset.magneticReady = '1';
      const maxShift = 14;
      const onMove = (event) => {
        const rect = el.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        const nx = Math.max(-1, Math.min(1, x / (rect.width / 2)));
        const ny = Math.max(-1, Math.min(1, y / (rect.height / 2)));
        el.style.transform = `translate3d(${(nx * maxShift).toFixed(2)}px, ${(ny * maxShift).toFixed(2)}px, 0)`;
      };
      const onLeave = () => {
        el.style.transform = '';
      };
      el.addEventListener('mousemove', onMove, { passive: true });
      el.addEventListener('mouseleave', onLeave, { passive: true });
      addCleanup(() => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
      });
    });
  };

  const ensureTransitionLayer = () => {
    let layer = document.querySelector('[data-transition-layer="cc"]');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'cc-transition-layer';
      layer.dataset.transitionLayer = 'cc';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    return layer;
  };

  const initTransitions = (gsapLib) => {
    const layer = ensureTransitionLayer();
    const isInternalHref = (href) => {
      if (!href) return false;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
      try {
        const target = new URL(href, window.location.href);
        return target.origin === window.location.origin;
      } catch (_) {
        return false;
      }
    };
    const animateOut = (cb) => {
      state.paused = true;
      document.documentElement.classList.add('cc-transition-active');
      if (gsapLib) {
        gsapLib.fromTo(layer, { autoAlpha: 0 }, {
          autoAlpha: 1,
          duration: 0.28,
          ease: 'power2.out',
          onComplete: cb
        });
        return;
      }
      layer.classList.add('is-visible');
      window.setTimeout(cb, 280);
    };
    const clickHandler = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!isInternalHref(href)) return;
      const targetUrl = new URL(href, window.location.href);
      if (targetUrl.href === window.location.href) return;
      event.preventDefault();
      animateOut(() => {
        window.location.assign(targetUrl.href);
      });
    };
    document.addEventListener('click', clickHandler, true);
    addCleanup(() => document.removeEventListener('click', clickHandler, true));
  };

  const initCursor = () => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (state.reduced) return;
    const cursor = document.createElement('div');
    cursor.className = 'cc-cursor-dot';
    document.body.appendChild(cursor);
    const onMove = (event) => {
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    };
    document.addEventListener('mousemove', onMove, { passive: true });
    addCleanup(() => {
      document.removeEventListener('mousemove', onMove);
      cursor.remove();
    });
  };

  const refresh = () => {
    if (state.lenis && typeof state.lenis.resize === 'function') state.lenis.resize();
    if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') window.ScrollTrigger.refresh();
  };

  const pause = () => {
    state.paused = true;
    document.documentElement.classList.add('cc-motion-paused');
    if (state.lenis && typeof state.lenis.stop === 'function') state.lenis.stop();
  };

  const resume = () => {
    state.paused = false;
    document.documentElement.classList.remove('cc-motion-paused');
    if (state.lenis && typeof state.lenis.start === 'function') state.lenis.start();
  };

  const init = async () => {
    if (state.initialized) return;
    state.initialized = true;
    state.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.toggle('cc-reduced-motion', state.reduced);

    const [{ gsap, ScrollTrigger }, LenisCtor] = await Promise.all([
      ensureGsapStack().then((stack) => stack || { gsap: null, ScrollTrigger: null }),
      ensureLenis()
    ]);

    if (!state.reduced && LenisCtor) {
      state.lenis = new LenisCtor({
        smoothWheel: true,
        lerp: 0.08,
        syncTouch: false
      });
      const tick = (time) => {
        state.lenis.raf(time);
        if (ScrollTrigger && typeof ScrollTrigger.update === 'function') ScrollTrigger.update();
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
      addCleanup(() => {
        if (state.lenis && typeof state.lenis.destroy === 'function') {
          state.lenis.destroy();
          state.lenis = null;
        }
      });
    }

    initSplitText();
    initRevealSystem();
    initHoverTilt();
    initMagnetic();
    initCursor();
    initTransitions(gsap);

    window.addEventListener('resize', refresh, { passive: true });
    addCleanup(() => window.removeEventListener('resize', refresh));
    window.addEventListener('pagehide', runCleanups, { once: true });
  };

  window.CC_MOTION_RUNTIME = {
    init,
    refresh,
    pause,
    resume,
    registerCleanup: addCleanup,
    getState: () => ({ ...state })
  };
})();
