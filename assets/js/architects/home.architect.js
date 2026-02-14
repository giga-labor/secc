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
        if (host.closest('[data-runtime-skip="1"]')) continue;

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
          await mountCardList(ctx, host, limited, {
            forceActive: false,
            sourceBlock: 'home_news',
            chunked: true,
            chunkSize: 6,
            initialLimit: 1,
            deferRestMs: 2500,
            renderRestInIdle: true,
            deferDepth: true
          });
          continue;
        }

        if (zone.type === 'proposals_list') {
          await this.renderProposals(host, data.modules || []);
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
    },

    async renderProposals(host, modules) {
      host.innerHTML = '';
      const cardsApi = window.CARDS;
      const list = Array.isArray(modules) ? modules : [];
      const activeAlgorithms = list.filter((card) => {
        if (!card || card.isActive === false) return false;
        const page = String(card.page || '').toLowerCase();
        return page.includes('/algoritmi/algs/');
      });

      if (!activeAlgorithms.length) {
        host.innerHTML = `<div class="mx-auto w-full max-w-[30rem] rounded-xl border border-dashed border-white/15 bg-midnight/30 px-3 py-3 text-xs text-ash text-center">Nessun algoritmo attivo disponibile.</div>`;
        return;
      }

      const latestArchiveSeq = (cardsApi && typeof cardsApi.getLatestArchiveSeq === 'function')
        ? await cardsApi.getLatestArchiveSeq()
        : null;

      const rows = await Promise.all(activeAlgorithms.map(async (card) => {
        let ranking = Number.NaN;
        if (Number.isFinite(card?.rankingValue)) {
          ranking = Number(card.rankingValue);
        } else if (cardsApi && typeof cardsApi.computeRankingForAlgorithm === 'function') {
          ranking = await cardsApi.computeRankingForAlgorithm(card);
        }

        let proposal = [];
        let isUpdated = false;
        let nextSeq = null;
        if (cardsApi
          && typeof cardsApi.resolveMetricsUrl === 'function'
          && typeof cardsApi.readCsvRows === 'function'
          && typeof cardsApi.extractProposalInfo === 'function'
          && typeof cardsApi.normalizeProposalNumbers === 'function') {
          const metricsUrl = cardsApi.resolveMetricsUrl(card);
          const metricsRows = await cardsApi.readCsvRows(metricsUrl);
          const info = cardsApi.extractProposalInfo(metricsRows || []);
          proposal = cardsApi.normalizeProposalNumbers(info?.proposal);
          nextSeq = Number.isFinite(info?.nextSeq) ? info.nextSeq : null;
          isUpdated = Number.isFinite(latestArchiveSeq) && Number.isFinite(nextSeq) && nextSeq > latestArchiveSeq;
        }

        return {
          card,
          ranking,
          proposal,
          nextSeq,
          isUpdated
        };
      }));

      const rowsWithProposal = rows.filter((row) => row.proposal.length === 6);

      rowsWithProposal.sort((a, b) => {
        const ra = Number.isFinite(a.ranking) ? a.ranking : Number.NEGATIVE_INFINITY;
        const rb = Number.isFinite(b.ranking) ? b.ranking : Number.NEGATIVE_INFINITY;
        return rb - ra;
      });

      if (!rowsWithProposal.length) {
        host.innerHTML = `<div class="mx-auto w-full max-w-[30rem] rounded-xl border border-dashed border-white/15 bg-midnight/30 px-3 py-3 text-xs text-ash text-center">Nessuna proposta a 6 numeri disponibile.</div>`;
        return;
      }

      const rankingFmt = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const validSeqs = rowsWithProposal
        .map((row) => row.nextSeq)
        .filter((seq) => Number.isFinite(seq))
        .map((seq) => Number(seq));
      const sharedSeq = validSeqs.length
        ? validSeqs.sort((a, b) => a - b)[validSeqs.length - 1]
        : null;
      const contestLabel = Number.isFinite(sharedSeq) ? `Concorso ${sharedSeq}` : 'Concorso N/D';

      const tableRows = rowsWithProposal.map((row) => {
        const title = escapeHtml(row.card.title || row.card.id || 'Algoritmo');
        const href = escapeHtml(ctx.resolveWithBase(row.card.page || '#') || '#');
        const rank = Number.isFinite(row.ranking) ? rankingFmt.format(row.ranking) : 'N/D';
        const ballsHtml = row.proposal.map((value) => `<span class="cc-proposal-ball">${escapeHtml(value)}</span>`).join('');
        return `
          <a href="${href}" class="cc-proposal-row" title="${title}">
            <span class="cc-proposal-alg">${title}</span>
            <span class="cc-proposal-rank">${escapeHtml(rank)}</span>
            <span class="cc-proposal-balls">${ballsHtml}</span>
          </a>
        `;
      }).join('');

      host.innerHTML = `
        <div class="cc-proposals-table-wrap">
          <div class="cc-proposals-contest">${escapeHtml(contestLabel)}</div>
          <div class="cc-proposals-table-head">
            <span class="cc-proposals-col cc-proposals-col--alg">Algoritmo</span>
            <span class="cc-proposals-col cc-proposals-col--rank">Ranking</span>
            <span class="cc-proposals-col cc-proposals-col--balls">6 numeri proposti</span>
          </div>
          <div class="cc-proposals-table-body">${tableRows}</div>
        </div>
      `;
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
