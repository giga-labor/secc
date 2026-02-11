(() => {
  const orchestrator = window.CC_PAGE_ORCHESTRATOR;
  if (!orchestrator) return;

  orchestrator.registerArchitect('analisi', () => ({
    async collectData(layout) {
      return { layoutVersion: layout?.version || '0' };
    },

    async run(layout) {
      if (window.CC_ANALISI_RUNTIME && typeof window.CC_ANALISI_RUNTIME.mount === 'function') {
        window.CC_ANALISI_RUNTIME.mount();
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
