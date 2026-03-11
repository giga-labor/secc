(() => {
  const start = () => {
    const perf = window.CC_PERF;
    perf?.markModuleStart?.('runtime-bootstrap');
    perf?.enhanceLoadingPlaceholders?.(document);

    if (window.CC_MOTION) {
      perf?.markModuleStart?.('motion-init');
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
      perf?.markModuleEnd?.('motion-init');
    }
    if (window.CC_MOTION && typeof window.CC_MOTION.initOracleCameo === 'function') {
      window.CC_MOTION.initOracleCameo();
      window.setTimeout(() => {
        window.CC_MOTION.initOracleCameo();
      }, 180);
    }
    if (!window.CC_PAGE_ORCHESTRATOR || typeof window.CC_PAGE_ORCHESTRATOR.start !== 'function') {
      perf?.markModuleEnd?.('runtime-bootstrap');
      return;
    }
    window.CC_PAGE_ORCHESTRATOR.start().then(() => {
      perf?.enhanceLoadingPlaceholders?.(document);
      perf?.markModuleEnd?.('runtime-bootstrap');
      perf?.printSnapshot?.('post-orchestrator');
    }).catch((error) => {
      perf?.markModuleEnd?.('runtime-bootstrap');
      console.error('[cc-runtime] start failed', error);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
