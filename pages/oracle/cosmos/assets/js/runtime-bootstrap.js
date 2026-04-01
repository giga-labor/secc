(() => {
  const start = () => {
    if (window.CC_MOTION) {
      const root = document.querySelector('main') || document;
      if (typeof window.CC_MOTION.initHomeReveals === 'function') {
        window.CC_MOTION.initHomeReveals(root);
      }
      if (typeof window.CC_MOTION.initMagnetic === 'function') {
        window.CC_MOTION.initMagnetic(root);
      }
      if (typeof window.CC_MOTION.initLiftDrop === 'function') {
        window.CC_MOTION.initLiftDrop(root);
      }
      if (typeof window.CC_MOTION.initNavOverlay === 'function') {
        window.CC_MOTION.initNavOverlay();
      }
    }
    if (window.CC_MOTION && typeof window.CC_MOTION.initOracleCameo === 'function') {
      window.CC_MOTION.initOracleCameo();
      window.setTimeout(() => {
        window.CC_MOTION.initOracleCameo();
      }, 180);
    }
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
