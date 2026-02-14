(() => {
  const ensureMotionLayer = async () => {
    const runtimeScript = document.currentScript
      || document.querySelector('script[src*="assets/js/runtime-bootstrap.js"]')
      || document.querySelector('script[src$="runtime-bootstrap.js"]');
    const src = runtimeScript?.src;
    if (!src) return;

    const jsBase = new URL('.', src);
    const motionJsUrl = new URL('motion-runtime.js', jsBase).href;
    const motionCssUrl = new URL('../css/motion.css', jsBase).href;

    if (!document.querySelector('link[data-cc-motion-css="1"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = motionCssUrl;
      link.dataset.ccMotionCss = '1';
      document.head.appendChild(link);
    }

    if (!window.CC_MOTION_RUNTIME) {
      await new Promise((resolve) => {
        const existing = document.querySelector(`script[src="${motionJsUrl}"]`);
        if (existing) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = motionJsUrl;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
      });
    }

    if (window.CC_MOTION_RUNTIME?.init) {
      await window.CC_MOTION_RUNTIME.init();
    }
  };

  const start = async () => {
    await ensureMotionLayer();
    if (!window.CC_PAGE_ORCHESTRATOR || typeof window.CC_PAGE_ORCHESTRATOR.start !== 'function') return;
    window.CC_PAGE_ORCHESTRATOR.start().catch((error) => {
      console.error('[cc-runtime] start failed', error);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
