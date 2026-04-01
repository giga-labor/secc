(() => {
  const orchestrator = window.CC_PAGE_ORCHESTRATOR;
  if (!orchestrator) return;

  const forceHeaderVisible = () => {
    const ensure = window.CC_HEADER_ENSURE;
    const header = (typeof ensure === 'function')
      ? ensure()
      : document.getElementById('site-header');
    if (!header) return null;
    header.hidden = false;
    header.style.removeProperty('display');
    header.style.removeProperty('visibility');
    header.removeAttribute('aria-hidden');
    return header;
  };

  orchestrator.registerArchitect('algsheet', () => ({
    async collectData() {
      return {};
    },

    async run() {
      forceHeaderVisible();

      if (!window.__ccAlgsheetHeaderObserver && 'MutationObserver' in window) {
        const observer = new MutationObserver(() => {
          forceHeaderVisible();
        });
        observer.observe(document.documentElement, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['style', 'hidden', 'class', 'aria-hidden']
        });
        window.__ccAlgsheetHeaderObserver = observer;
      }

      window.addEventListener('pageshow', forceHeaderVisible, { passive: true });
      window.addEventListener('visibilitychange', forceHeaderVisible, { passive: true });
      window.addEventListener('resize', forceHeaderVisible, { passive: true });
      window.setTimeout(forceHeaderVisible, 80);
      window.setTimeout(forceHeaderVisible, 240);
    }
  }));
})();
