(() => {
  const orchestrator = window.CC_PAGE_ORCHESTRATOR;
  if (!orchestrator) return;

  orchestrator.registerArchitect('patch', (ctx) => ({
    async collectData(layout) {
      const out = {};
      const sources = layout?.data_sources || {};
      if (sources.modules_manifest) {
        out.modules = await ctx.repo.loadCardsByManifest(sources.modules_manifest);
      }
      return out;
    },

    async run(layout, data) {
      const zones = Array.isArray(layout?.zones) ? layout.zones : [];
      for (const zone of zones) {
        const host = zone?.mount ? document.querySelector(zone.mount) : null;
        if (!host) continue;
        if (zone.type === 'text_patch') {
          host.innerHTML = zone.html || host.innerHTML;
          continue;
        }
        if (zone.type === 'cards_from_manifest') {
          const list = Array.isArray(data?.modules) ? data.modules : [];
          const filtered = zone.filterNews
            ? list.filter((c) => Boolean(c?.hasNews || c?.featured || (Array.isArray(c?.news) && c.news.length > 0)))
            : list;
          const limited = zone.limit ? filtered.slice(0, zone.limit) : filtered;
          if (window.CC_ARCHITECT_BASE?.mountCardList) {
            await window.CC_ARCHITECT_BASE.mountCardList(ctx, host, limited, { forceActive: true, sourceBlock: zone.sourceBlock || 'zone_cards' });
          }
        }
      }
    }
  }));
})();
