(() => {
  const orchestrator = window.CC_PAGE_ORCHESTRATOR;
  if (!orchestrator) return;

  function forceLatestDrawBridge() {
    const bridge = document.querySelector("[data-bridge-id='archive_bridge_frequency']");
    if (!bridge) return;
    bridge.innerHTML =
      '<p><strong>Ultimo concorso:</strong> <span data-latest-draw-contest>...</span> - <strong>Data:</strong> <span data-latest-draw-date>...</span></p>' +
      '<p><strong>Sestina estratta:</strong> <span data-latest-draw-numbers>...</span></p>';
  }

  orchestrator.registerArchitect('storico', () => ({
    async collectData(layout) {
      return { layoutVersion: layout?.version || '0' };
    },

    async run(layout) {
      if (window.CC_DRAWS_RUNTIME && typeof window.CC_DRAWS_RUNTIME.mount === 'function') {
        window.CC_DRAWS_RUNTIME.mount();
      }

      const zones = Array.isArray(layout?.zones) ? layout.zones : [];
      zones.forEach((zone) => {
        if (zone?.type !== 'text_patch' || !zone.mount) return;
        if (String(zone.mount).includes('archive_bridge_frequency')) return;
        const host = document.querySelector(zone.mount);
        if (!host) return;
        host.innerHTML = zone.html || host.innerHTML;
      });

      // Keep this bridge deterministic even with stale upstream layouts.
      forceLatestDrawBridge();
    }
  }));
})();
