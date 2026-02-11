(() => {
  const orchestrator = window.CC_PAGE_ORCHESTRATOR;
  if (!orchestrator) return;

  orchestrator.registerArchitect('home', (ctx) => ({
    async collectData(layout) {
      const sources = layout?.data_sources || {};
      const modules = await ctx.repo.loadCardsByManifest(sources.modules_manifest || 'data/modules-manifest.json');
      return {
        modules,
        kpi_items: Array.isArray(layout?.kpi_items) ? layout.kpi_items : []
      };
    },

    async run(layout, data, state) {
      const { mountCardList } = window.CC_ARCHITECT_BASE || {};
      const zones = Array.isArray(layout?.zones) ? layout.zones : [];

      for (const zone of zones) {
        if (!zone?.mount) continue;
        const host = document.querySelector(zone.mount);
        if (!host) continue;

        if (zone.type === 'kpi_cards') {
          this.renderKpi(host, data.kpi_items || []);
          continue;
        }

        if (zone.type === 'news_cards') {
          const all = Array.isArray(data.modules) ? data.modules : [];
          const filtered = all
            .filter((card) => Boolean(card?.hasNews || card?.featured || (Array.isArray(card?.news) && card.news.length > 0)))
            .sort((a, b) => String(b.lastUpdated || '').localeCompare(String(a.lastUpdated || '')));
          const limited = zone.limit ? filtered.slice(0, zone.limit) : filtered;
          await mountCardList(ctx, host, limited, { forceActive: true, sourceBlock: 'home_news' });
          continue;
        }
      }

      if (state.mode === 'patch') {
        // patch mode currently rerenders only configured zones.
      }
    },

    renderKpi(host, items) {
      host.innerHTML = '';
      const builder = ctx.components;
      items.forEach((cfg) => {
        const href = ctx.resolveWithBase(cfg.href || '#');
        const className = `cc-card cc-card-kpi cc-kpi-card cc-kpi-card--${cfg.tone || 'study'} cc-card3d card-3d is-active`;
        const payload = {
          tag: 'a',
          className,
          href,
          attrs: { 'aria-label': `${cfg.title}: ${cfg.value}` },
          dataset: {
            cardId: String(cfg.id || cfg.title || 'kpi').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            cardType: 'kpi',
            destinationType: 'data_section',
            sourceBlock: 'dashboard_kpi'
          },
          slots: {
            body: `
              <div class="cc-kpi-body">
                <p class="cc-kpi-title">${escapeHtml(cfg.title)}</p>
                <p class="cc-kpi-value">${escapeHtml(cfg.value)}</p>
                <p class="cc-kpi-meta">${escapeHtml(cfg.meta)}</p>
              </div>
            `
          }
        };
        const node = (builder && builder.build) ? builder.build('card', payload) : null;
        if (node) host.appendChild(node);
      });

      if (window.CARDS && typeof window.CARDS.enableDepth === 'function') {
        window.CARDS.enableDepth(host);
      }
    }
  }));

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
