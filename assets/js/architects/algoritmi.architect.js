(() => {
  const orchestrator = window.CC_PAGE_ORCHESTRATOR;
  if (!orchestrator) return;

  orchestrator.registerArchitect('algoritmi', (ctx) => ({
    async collectData(layout) {
      return { layoutVersion: layout?.version || '0' };
    },

    async run(layout) {
      if (window.CC_ALGORITHMS_RUNTIME && typeof window.CC_ALGORITHMS_RUNTIME.mount === 'function') {
        await window.CC_ALGORITHMS_RUNTIME.mount({
          areaSelector: '[data-algorithms-area]',
          counterSelector: '[data-algorithms-count]'
        });
      }

      const zones = Array.isArray(layout?.zones) ? layout.zones : [];
      zones.forEach((zone) => {
        if (zone?.type !== 'text_patch' || !zone.mount) return;
        const host = document.querySelector(zone.mount);
        if (!host) return;
        host.innerHTML = zone.html || host.innerHTML;
      });
    }
  }));
})();
