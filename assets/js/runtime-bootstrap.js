(() => {
  const start = () => {
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
