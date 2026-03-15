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
      const motion = window.CC_MOTION;
      let newsHost = null;

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
          newsHost = host;
          const all = Array.isArray(data.modules) ? data.modules : [];
          const orderedNews = await this.buildHomeNewsCards(all);
          const limited = zone.limit ? orderedNews.slice(0, zone.limit) : orderedNews;
          await mountCardList(ctx, host, limited, {
            forceActive: false,
            sourceBlock: 'home_news',
            chunked: true,
            chunkSize: 8,
            initialLimit: 8,
            deferRestMs: 0,
            renderRestInIdle: false,
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

      if (motion) {
        const main = document.querySelector('main') || document;
        motion.initHomeReveals(main);
        motion.initNavOverlay();
        motion.initMagnetic(main);
        motion.initLiftDrop(main);
        motion.initOracleCameo();
        if (newsHost) {
          this.forceNewsDepthRebind(newsHost);
          motion.initAlgorithmCardsInteractions(newsHost);
          window.setTimeout(() => {
            this.forceNewsDepthRebind(newsHost);
            motion.initAlgorithmCardsInteractions(newsHost);
          }, 700);
          window.setTimeout(() => {
            this.forceNewsDepthRebind(newsHost);
            motion.initAlgorithmCardsInteractions(newsHost);
          }, 2800);
        }
      }
    },

    forceNewsDepthRebind(newsHost) {
      if (!newsHost || !window.CARDS || typeof window.CARDS.enableDepth !== 'function') return;
      const cards = newsHost.querySelectorAll('.card-3d');
      cards.forEach((card) => {
        try {
          delete card.dataset.depthBound;
        } catch (_) {
          card.dataset.depthBound = '';
        }
        card.classList.remove('is-hovered', 'is-grabbed', 'is-selected');
      });
      window.CARDS.enableDepth(newsHost);
    },

    async buildHomeNewsCards(allCards) {
      const cards = Array.isArray(allCards) ? allCards : [];
      const maxCards = 8;
      const storicoCard = cards.find((card) => String(card?.id || '').toLowerCase() === 'storico-estrazioni')
        || cards.find((card) => String(card?.type || '').toLowerCase() === 'storico');
      const proposteInfoCard = cards.find((card) => String(card?.id || '').toLowerCase() === 'sestine-proposte-info');

      const core = cards.filter((card) => card && card !== storicoCard && card !== proposteInfoCard && card.view === true && card.isActive !== false);
      const algorithmCards = core.filter((card) => this.isAlgorithmCard(card));

      const ordered = [];
      const seen = new Set();
      const pushUnique = (card) => {
        if (ordered.length >= maxCards) return;
        if (!card) return;
        const key = String(card.id || card.page || card.title || '').toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        ordered.push(card);
      };

      pushUnique(storicoCard);
      pushUnique(proposteInfoCard);

      const cardsApi = window.CARDS;
      const latestArchiveSeq = (cardsApi && typeof cardsApi.getLatestArchiveSeq === 'function')
        ? await cardsApi.getLatestArchiveSeq()
        : NaN;

      const latestHitRows = await Promise.all(algorithmCards.map(async (card) => {
        const latestContestHits = await this.getLatestContestHits(card, latestArchiveSeq, cardsApi);
        return { card, latestContestHits };
      }));
      const withRecentStrongHits = latestHitRows
        .filter((row) => Number.isFinite(row.latestContestHits) && row.latestContestHits >= 2)
        .sort((a, b) => {
          const hitDelta = b.latestContestHits - a.latestContestHits;
          if (hitDelta !== 0) return hitDelta;
          return String(b.card?.lastUpdated || '').localeCompare(String(a.card?.lastUpdated || ''));
        })
        .map((row) => row.card);
      withRecentStrongHits.forEach(pushUnique);

      const rankingRows = await Promise.all(algorithmCards.map(async (card) => {
        let ranking = Number.isFinite(card?.rankingValue) ? Number(card.rankingValue) : Number.NaN;
        if (!Number.isFinite(ranking) && cardsApi && typeof cardsApi.computeRankingForAlgorithm === 'function') {
          ranking = await cardsApi.computeRankingForAlgorithm(card);
        }
        return {
          card,
          ranking,
          family: this.resolveAlgorithmFamily(card)
        };
      }));
      const byFamilyTop = ['statistico', 'neurale', 'ibrido']
        .map((family) => rankingRows
          .filter((row) => row.family === family && Number.isFinite(row.ranking))
          .sort((a, b) => b.ranking - a.ranking)[0])
        .filter(Boolean)
        .map((row) => row.card);
      byFamilyTop.forEach(pushUnique);

      const randomPool = core.filter((card) => {
        const key = String(card.id || card.page || card.title || '').toLowerCase();
        return Boolean(key) && !seen.has(key);
      });
      this.shuffleInPlace(randomPool);
      while (ordered.length < maxCards && randomPool.length) {
        const card = randomPool.shift();
        if (!card) break;
        pushUnique({
          ...card,
          hasNews: true,
          statusTag: card.statusTag || 'Random',
          subtitle: String(card.subtitle || card.narrativeSummary || 'Scelta casuale del momento').trim()
        });
      }

      return ordered.slice(0, maxCards);
    },

    shuffleInPlace(items) {
      const arr = Array.isArray(items) ? items : [];
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    },

    isNewsFeedEligibleCard(card) {
      if (!card || card.view !== true) return false;
      return this.hasNewsBadge(card) || card.isActive === false || this.hasHitsBadge(card);
    },

    hasNewsBadge(card) {
      return Boolean(card?.hasNews || card?.featured || (Array.isArray(card?.news) && card.news.length > 0));
    },

    hasHitsBadge(card) {
      return Boolean(card?.hits?.enabled === true) && this.getHitCount(card) > 0;
    },

    getHitCount(card) {
      const raw = Number.parseInt(String(card?.hits?.count ?? ''), 10);
      return Number.isFinite(raw) && raw > 0 ? raw : 0;
    },

    isAlgorithmCard(card) {
      const page = String(card?.page || '').toLowerCase();
      return page.includes('/algoritmi/algs/');
    },

    resolveAlgorithmFamily(card) {
      const raw = [
        String(card?.macroGroup || ''),
        String(card?.group || ''),
        String(card?.category || ''),
        String(card?.type || ''),
        String(card?.title || '')
      ].join(' ').toLowerCase();
      if (/(neural|neurale|rete neurale|nn|ai\b)/.test(raw)) return 'neurale';
      if (/(hybrid|ibrid|misto)/.test(raw)) return 'ibrido';
      if (/(stat|frequenz|probabil|classico|classic|analisi|storic)/.test(raw)) return 'statistico';
      return '';
    },

    async getLatestContestHits(card, latestSeq, cardsApi) {
      if (!cardsApi || typeof cardsApi.resolveHistoricalUrl !== 'function' || typeof cardsApi.readCsvRows !== 'function') {
        return NaN;
      }
      try {
        const historicalUrl = cardsApi.resolveHistoricalUrl(card);
        const rows = await cardsApi.readCsvRows(historicalUrl);
        if (!Array.isArray(rows) || !rows.length) return NaN;

        let target = rows[rows.length - 1];
        if (Number.isFinite(latestSeq)) {
          const matched = rows.find((row) => Number.parseInt(String(row['NR. SEQUENZIALE'] || '').trim(), 10) === latestSeq);
          if (matched) target = matched;
          else return NaN;
        }

        let hits = 0;
        for (let i = 1; i <= 6; i += 1) {
          const value = String(target[`N${i}`] || '').trim();
          if (value.startsWith('[') && value.endsWith(']')) hits += 1;
        }
        return hits;
      } catch (_) {
        return NaN;
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
      const contestLabel = Number.isFinite(sharedSeq) ? `Concorso ${sharedSeq}` : 'Concorso --';

      const tableRows = rowsWithProposal.map((row) => {
        const title = escapeHtml(row.card.title || row.card.id || 'Algoritmo');
        const href = escapeHtml(ctx.resolveWithBase(row.card.page || '#') || '#');
        const rank = Number.isFinite(row.ranking) ? rankingFmt.format(row.ranking) : '--';
        const ballsHtml = row.proposal.map((value) => {
          const tone = getBallTone(parseInt(value, 10));
          return `<span class="cc-proposal-ball${tone ? ' ' + tone : ''}">${escapeHtml(value)}</span>`;
        }).join('');
        return `
          <a href="${href}" class="cc-proposal-row" title="${title}">
            <span class="cc-proposal-alg cc-alg-link">${title}</span>
            <span class="cc-proposal-balls">${ballsHtml}</span>
            <span class="cc-proposal-rank">${escapeHtml(rank)}</span>
          </a>
        `;
      }).join('');

      host.innerHTML = `
        <div class="cc-proposals-table-wrap">
          <div class="cc-proposals-contest">${escapeHtml(contestLabel)}</div>
          <div class="cc-proposals-table-head">
            <span class="cc-proposals-col cc-proposals-col--alg">Algoritmo</span>
            <span class="cc-proposals-col cc-proposals-col--balls">6 numeri proposti</span>
            <span class="cc-proposals-col cc-proposals-col--rank">Ranking</span>
          </div>
          <div class="cc-proposals-table-body">${tableRows}</div>
        </div>
      `;
    }
  }));

  function getBallTone(n) {
    if (!Number.isFinite(n)) return '';
    if (n <= 15) return 'cc-ball-tone--azure';
    if (n <= 30) return 'cc-ball-tone--coral';
    if (n <= 45) return 'cc-ball-tone--gold';
    if (n <= 60) return 'cc-ball-tone--emerald';
    if (n <= 75) return 'cc-ball-tone--violet';
    return 'cc-ball-tone--rose';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
