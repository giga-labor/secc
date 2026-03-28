(() => {
  const orchestrator = window.CC_PAGE_ORCHESTRATOR;
  if (!orchestrator) return;

  orchestrator.registerArchitect('home', (ctx) => ({
    async collectData(layout) {
      const sources = layout?.data_sources || {};
      const modules = await ctx.repo.loadCardsByManifest(sources.modules_manifest || 'data/modules-manifest.json');
      const communityFeed = await this.loadCommunityFeed(sources.community_feed || 'data/community-feed.json');
      const drawsRows = await this.loadDrawsRows(sources.draws_csv || 'archives/draws/draws.csv');
      const iargosStatus = await this.loadIargosStatus(sources.iargos_public_status || 'data/iargos-public-status.json');
      return {
        modules,
        community_feed: communityFeed,
        draws_rows: drawsRows,
        iargos_status: iargosStatus,
        kpi_items: Array.isArray(layout?.kpi_items) ? layout.kpi_items : []
      };
    },

    async run(layout, data, state) {
      const { mountCardList } = window.CC_ARCHITECT_BASE || {};
      const zones = Array.isArray(layout?.zones) ? layout.zones : [];
      const motion = window.CC_MOTION;
      const interactiveHosts = [];

      for (const zone of zones) {
        if (!zone?.mount) continue;
        const host = document.querySelector(zone.mount);
        if (!host) continue;
        const allowStaticHost = zone.type === 'hero_status';
        if (!allowStaticHost && host.closest('[data-runtime-skip="1"]')) continue;

        if (zone.type === 'kpi_cards') {
          this.renderKpi(host, data.kpi_items || []);
          continue;
        }

        if (zone.type === 'hero_status') {
          this.renderHeroStatus(host, data);
          continue;
        }

        if (zone.type === 'news_cards') {
          interactiveHosts.push(host);
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

        if (zone.type === 'active_algorithms') {
          await this.renderActiveAlgorithms(host, data.modules || [], { limit: zone.limit });
          interactiveHosts.push(host);
          continue;
        }

        if (zone.type === 'trend_numbers') {
          this.renderTrendNumbers(host, data.draws_rows || []);
          continue;
        }

        if (zone.type === 'community_activity') {
          this.renderCommunityActivity(host, data.community_feed || null);
          continue;
        }
      }

      if (state.mode === 'patch') {
        // patch mode currently rerenders only configured zones.
      }

      // Patch community stat counters after all zones are rendered
      {
        const allModules = Array.isArray(data?.modules) ? data.modules : [];
        const activeCount = allModules.filter((card) => {
          if (!card || card.isActive === false) return false;
          return String(card.page || '').toLowerCase().includes('/algoritmi/algs/');
        }).length;
        const drawCount = Array.isArray(data?.draws_rows) ? data.draws_rows.length : 0;
        document.querySelectorAll('[data-community-alg-count]').forEach((el) => {
          el.textContent = String(activeCount);
        });
        document.querySelectorAll('[data-community-draw-count]').forEach((el) => {
          el.textContent = drawCount.toLocaleString('it-IT');
        });
      }

      if (motion) {
        const main = document.querySelector('main') || document;
        motion.initHomeReveals(main);
        motion.initNavOverlay();
        motion.initMagnetic(main);
        motion.initLiftDrop(main);
        motion.initAlgorithmCardsInteractions(main);
        motion.initOracleCameo();
        interactiveHosts.forEach((host) => {
          this.forceNewsDepthRebind(host);
          motion.initAlgorithmCardsInteractions(host);
        });
        window.setTimeout(() => {
          interactiveHosts.forEach((host) => {
            this.forceNewsDepthRebind(host);
            motion.initAlgorithmCardsInteractions(host);
          });
        }, 700);
        window.setTimeout(() => {
          interactiveHosts.forEach((host) => {
            this.forceNewsDepthRebind(host);
            motion.initAlgorithmCardsInteractions(host);
          });
        }, 2800);
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

    async loadCommunityFeed(path) {
      if (!ctx.repo || typeof ctx.repo.fetchJson !== 'function') return null;
      try {
        const payload = await ctx.repo.fetchJson(path, { cache: 'no-store' });
        if (!payload || typeof payload !== 'object') return null;
        return payload;
      } catch (_) {
        return null;
      }
    },

    async loadIargosStatus(path) {
      if (!ctx.repo || typeof ctx.repo.fetchJson !== 'function') return null;
      try {
        const payload = await ctx.repo.fetchJson(path, { cache: 'no-store' });
        if (!payload || typeof payload !== 'object') return null;
        return payload;
      } catch (_) {
        return null;
      }
    },

    async loadDrawsRows(path) {
      const source = String(path || '').trim();
      if (!source) return [];
      try {
        const url = ctx.resolveWithBase(source);
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return [];
        const raw = await res.text();
        return this.parseDrawsCsv(raw);
      } catch (_) {
        return [];
      }
    },

    parseDrawsCsv(raw) {
      const text = String(raw || '');
      if (!text.trim()) return [];
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));
      if (lines.length < 2) return [];
      const delimiter = this.detectDelimiter(lines[0]);
      const header = lines[0].split(delimiter).map((cell) => String(cell || '').trim());
      const rows = lines.slice(1).map((line) => {
        const cells = line.split(delimiter).map((cell) => String(cell || '').trim());
        const row = {};
        header.forEach((name, idx) => {
          row[name] = cells[idx] || '';
        });
        return row;
      });
      rows.sort((a, b) => {
        const seqA = Number.parseInt(String(a['NR. SEQUENZIALE'] || '').trim(), 10);
        const seqB = Number.parseInt(String(b['NR. SEQUENZIALE'] || '').trim(), 10);
        if (Number.isFinite(seqA) && Number.isFinite(seqB)) return seqA - seqB;
        const da = this.parseItalianDate(a.Data || a.DATA || '');
        const db = this.parseItalianDate(b.Data || b.DATA || '');
        return da - db;
      });
      return rows;
    },

    detectDelimiter(line) {
      const source = String(line || '');
      const semicolon = (source.match(/;/g) || []).length;
      const comma = (source.match(/,/g) || []).length;
      if (!semicolon && !comma) return ';';
      return semicolon >= comma ? ';' : ',';
    },

    parseItalianDate(value) {
      const source = String(value || '').trim();
      if (!source) return 0;
      const parts = source.split('/');
      if (parts.length !== 3) return 0;
      const day = Number.parseInt(parts[0], 10);
      const month = Number.parseInt(parts[1], 10);
      const year = Number.parseInt(parts[2], 10);
      if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return 0;
      return new Date(year, month - 1, day).getTime();
    },

    async renderActiveAlgorithms(host, modules, options = {}) {
      host.innerHTML = '';
      const all = Array.isArray(modules) ? modules : [];
      const max = Math.max(1, Number(options.limit) || 6);
      const activeAlgorithms = all.filter((card) => {
        if (!card || card.isActive === false || card.view !== true) return false;
        return this.isAlgorithmCard(card);
      });
      if (!activeAlgorithms.length) {
        host.innerHTML = '<div class="cc-home-empty">Nessun algoritmo attivo disponibile.</div>';
        return;
      }

      const cardsApi = window.CARDS;
      const candidatePool = activeAlgorithms
        .slice()
        .sort((a, b) => {
          const hitA = this.getHitCount(a);
          const hitB = this.getHitCount(b);
          if (hitB !== hitA) return hitB - hitA;
          return String(b?.lastUpdated || '').localeCompare(String(a?.lastUpdated || ''));
        })
        .slice(0, Math.max(max * 2, 12));

      const rows = await Promise.all(candidatePool.map(async (card) => {
        let ranking = Number.isFinite(card?.rankingValue) ? Number(card.rankingValue) : Number.NaN;
        if (!Number.isFinite(ranking) && cardsApi && typeof cardsApi.computeRankingForAlgorithm === 'function') {
          ranking = await cardsApi.computeRankingForAlgorithm(card);
        }
        const family = this.resolveAlgorithmFamily(card) || 'core';
        return { card, ranking, family };
      }));
      rows.sort((a, b) => {
        const ra = Number.isFinite(a.ranking) ? a.ranking : Number.NEGATIVE_INFINITY;
        const rb = Number.isFinite(b.ranking) ? b.ranking : Number.NEGATIVE_INFINITY;
        if (rb !== ra) return rb - ra;
        return String(b.card?.lastUpdated || '').localeCompare(String(a.card?.lastUpdated || ''));
      });

      const top = rows.slice(0, max);
      const rankingFmt = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const html = top.map((row, index) => {
        const rankText = Number.isFinite(row.ranking) ? rankingFmt.format(row.ranking) : '--';
        const title = escapeHtml(row.card.title || row.card.id || 'Algoritmo');
        const subtitle = escapeHtml(String(row.card.subtitle || row.card.narrativeSummary || 'Modulo attivo monitorato').trim());
        const href = escapeHtml(ctx.resolveWithBase(row.card.page || '#') || '#');
        const tone = this.resolveFamilyVisualTone(row.family);
        const imageUrl = this.resolveCardImageUrl(row.card);
        const familyLabel = escapeHtml(String(row.family || row.card?.macroGroup || 'core').toUpperCase());
        const hitsCount = this.getHitCount(row.card);
        const hitsLabel = hitsCount > 0 ? `${hitsCount} hit ultimo concorso` : 'Nessun hit recente';
        return `
          <a href="${href}" class="cc-card cc-card3d card-3d algorithm-card group relative flex min-h-[330px] flex-col overflow-hidden rounded-2xl border border-white/10 transition cc-card-tone-${tone} is-active" aria-label="Apri ${title}">
            <span class="cc-home-active-card__badge">#${index + 1}</span>
            <div class="cc-card-media cc-card-media-frame algorithm-card__media algorithm-card__media--third relative overflow-hidden" style="position:relative;width:100%;aspect-ratio:15/8;min-height:0;max-height:none;overflow:hidden;">
              <img class="h-full w-full object-cover" src="${imageUrl}" alt="Anteprima ${title}" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block;">
            </div>
            <div class="cc-card-body algorithm-card__body flex flex-1 flex-col gap-1.5 px-4 pt-2.5 pb-10">
              <span class="text-[10px] uppercase tracking-[0.22em] text-neon/90">${familyLabel}</span>
              <h4 class="text-[0.98rem] font-semibold leading-tight group-hover:text-neon">${title}</h4>
              <p class="text-[0.66rem] font-medium leading-[1.15] text-ash">${subtitle}</p>
              <p class="algorithm-card__desc text-[0.74rem] leading-[1.25] text-ash">${escapeHtml(hitsLabel)}</p>
            </div>
            <div class="cc-card-proposal absolute bottom-2 left-3 right-3 w-auto rounded-full border border-neon/70 bg-neon/10 px-2 py-[0.24rem] text-[0.64rem] font-semibold tracking-[0.04em] text-neon overflow-hidden text-ellipsis shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_10px_rgba(0,0,0,0.35)]">Punteggio: ${rankText}</div>
          </a>
        `;
      }).join('');

      host.innerHTML = `<div class="cc-home-active-grid">${html}</div>`;
    },

    resolveFamilyVisualTone(family) {
      const value = String(family || '').toLowerCase();
      if (value === 'statistico') return 'alg-stat';
      if (value === 'neurale') return 'alg-neural';
      if (value === 'ibrido') return 'alg-hybrid';
      return 'study';
    },

    resolveCardImageUrl(card) {
      const image = String(card?.image || card?.img || '').trim();
      const page = String(card?.page || '').trim();
      let candidate = '';
      if (/^(https?:\/\/|file:|data:|\/)/i.test(image)) {
        candidate = image;
      } else if (image && page) {
        const base = /\.html?$/i.test(page)
          ? page.replace(/[^/]+$/i, '')
          : `${page.replace(/\/?$/, '/')}`;
        candidate = `${base}${image}`;
      } else if (image) {
        candidate = image;
      }
      if (!candidate) candidate = 'img/algoritm.webp';
      return escapeHtml(ctx.resolveWithBase(candidate) || '#');
    },

    renderTrendNumbers(host, rows) {
      host.innerHTML = '';
      const list = Array.isArray(rows) ? rows : [];
      if (!list.length) {
        host.innerHTML = '<div class="cc-home-empty">Trend numerici non disponibili al momento.</div>';
        return;
      }
      const numbersByRow = list.map((row) => this.extractSixNumbers(row)).filter((chunk) => chunk.length === 6);
      if (!numbersByRow.length) {
        host.innerHTML = '<div class="cc-home-empty">Impossibile estrarre trend dai dati storici.</div>';
        return;
      }

      const recentWindow = numbersByRow.slice(-90);
      const frequencies = new Map();
      for (let n = 1; n <= 90; n += 1) frequencies.set(n, 0);
      recentWindow.forEach((draw) => {
        draw.forEach((n) => {
          if (!frequencies.has(n)) return;
          frequencies.set(n, (frequencies.get(n) || 0) + 1);
        });
      });
      const ordered = Array.from(frequencies.entries()).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      const hot = ordered.slice(0, 6).map(([n, c]) => ({ n, c }));
      const cold = ordered.slice(-6).reverse().map(([n, c]) => ({ n, c }));
      const anomalies = this.computeDelays(numbersByRow).slice(0, 6);

      const hotTop = hot[0];
      const hotTitle = `Frequenza elevata rilevata (ultimi 90 concorsi)`;
      const hotInsight = hotTop
        ? `Il numero ${escapeHtml(String(hotTop.n).padStart(2, '0'))} è uscito ${hotTop.c} volte — sopra la media statistica`
        : 'Distribuzione nella norma';

      const coldTop = cold[0];
      const coldTitle = `Numeri in latenza prolungata`;
      const coldInsight = coldTop
        ? `Il numero ${escapeHtml(String(coldTop.n).padStart(2, '0'))} è uscito solo ${coldTop.c} volte nelle ultime 90 estrazioni`
        : 'Nessun numero particolarmente freddo';

      const delayTop = anomalies[0];
      const delayTitle = `Anomalie di ritardo rilevate`;
      const delayInsight = delayTop
        ? `Il numero ${escapeHtml(String(delayTop.n).padStart(2, '0'))} non esce da ${delayTop.c} concorsi consecutivi`
        : 'Nessuna anomalia di ritardo significativa';

      host.innerHTML = `
        <div class="cc-home-trends-grid">
          <article class="cc-home-trend-card">
            <h4>${hotTitle}</h4>
            <p class="cc-home-trend-card__insight">${hotInsight}</p>
            <div class="cc-home-trend-balls">${this.renderTrendBalls(hot, 'hot')}</div>
          </article>
          <article class="cc-home-trend-card">
            <h4>${coldTitle}</h4>
            <p class="cc-home-trend-card__insight">${coldInsight}</p>
            <div class="cc-home-trend-balls">${this.renderTrendBalls(cold, 'cold')}</div>
          </article>
          <article class="cc-home-trend-card">
            <h4>${delayTitle}</h4>
            <p class="cc-home-trend-card__insight">${delayInsight}</p>
            <div class="cc-home-trend-balls">${this.renderTrendBalls(anomalies, 'delay')}</div>
          </article>
        </div>
        <p class="cc-home-trends-loop-hint"><a class="cc-home-loop-link" href="${escapeHtml(ctx.resolveWithBase('pages/laboratorio-tecnico/'))}">Approfondisci nel Laboratorio →</a></p>
      `;
    },

    extractSixNumbers(row) {
      if (!row || typeof row !== 'object') return [];
      const keys = Object.keys(row);
      const picks = [];
      for (let i = 0; i < keys.length; i += 1) {
        const key = String(keys[i] || '').trim().toUpperCase();
        if (!/^N[1-6]$/.test(key)) continue;
        const parsed = Number.parseInt(String(row[keys[i]] || '').replace(/[^\d]/g, ''), 10);
        if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 90) picks.push(parsed);
      }
      return picks.slice(0, 6);
    },

    computeDelays(numbersByRow) {
      const lastSeen = new Map();
      for (let n = 1; n <= 90; n += 1) lastSeen.set(n, null);
      const orderedDesc = numbersByRow.slice().reverse();
      orderedDesc.forEach((draw, idx) => {
        draw.forEach((n) => {
          if (!lastSeen.has(n)) return;
          if (lastSeen.get(n) === null) lastSeen.set(n, idx);
        });
      });
      return Array.from(lastSeen.entries())
        .map(([n, seen]) => ({ n, c: seen === null ? orderedDesc.length : seen }))
        .sort((a, b) => b.c - a.c || a.n - b.n);
    },

    renderTrendBalls(items, kind) {
      const list = Array.isArray(items) ? items : [];
      return list.map((item) => {
        const n = Number(item?.n);
        const c = Number(item?.c);
        const tone = getBallTone(n);
        const value = Number.isFinite(n) ? String(n).padStart(2, '0') : '--';
        const detail = kind === 'delay'
          ? `${Number.isFinite(c) ? c : '--'} rit.`
          : `${Number.isFinite(c) ? c : '--'}x`;
        return `<span class="cc-home-trend-ball"><span class="cc-proposal-ball${tone ? ` ${tone}` : ''}">${escapeHtml(value)}</span><small>${escapeHtml(detail)}</small></span>`;
      }).join('');
    },

    renderCommunityActivity(host, feed) {
      host.innerHTML = '';
      const communityUrl = escapeHtml(ctx.resolveWithBase('pages/community/index.html'));
      const fallbackHtml = `
        <div class="cc-home-community-fallback">
          <p class="cc-home-community-fallback__title">Sistema di analisi operativo</p>
          <div class="cc-home-community-fallback__stats">
            <span class="cc-home-community-fallback__stat"><strong data-community-alg-count>--</strong> algoritmi attivi</span>
            <span class="cc-home-community-fallback__stat"><strong data-community-draw-count>--</strong> estrazioni analizzate</span>
            <span class="cc-home-community-fallback__stat"><strong>dal 1997</strong></span>
          </div>
          <p class="cc-home-community-fallback__cta-text">Partecipa alla community e condividi le tue analisi.</p>
          <a class="cc-home-community-fallback__cta" href="${communityUrl}">Entra nella Community</a>
        </div>
      `;

      const payload = feed && typeof feed === 'object' ? feed : null;
      if (!payload) {
        host.innerHTML = fallbackHtml;
        return;
      }
      const pulse = payload.pulse && typeof payload.pulse === 'object' ? payload.pulse : {};
      const pulseOnline = Number.parseInt(String(pulse.online_users ?? ''), 10);
      const pulseActions = Number.parseInt(String(pulse.actions_24h ?? ''), 10);
      const pulseSignals = Number.parseInt(String(pulse.signals_today ?? ''), 10);
      const pulseHtml = `
        <div class="cc-home-community__pulse">
          <span><strong>${Number.isFinite(pulseOnline) ? pulseOnline : 0}</strong> online</span>
          <span><strong>${Number.isFinite(pulseActions) ? pulseActions : 0}</strong> azioni 24h</span>
          <span><strong>${Number.isFinite(pulseSignals) ? pulseSignals : 0}</strong> segnali oggi</span>
        </div>
      `;
      const isDemoFeed = Boolean(payload.demo_mode);
      const demoText = isDemoFeed
        ? '<p class="cc-home-community__demo">Feed in modalita demo dichiarata: verra sostituito dai primi segnali reali.</p>'
        : '';
      const contest = escapeHtml(String(payload.contest_seq || '--'));
      const updatedAt = escapeHtml(String(payload.updated_at || '--'));
      const leaderboard = Array.isArray(payload.leaderboard) ? payload.leaderboard.slice(0, 3) : [];
      const activities = Array.isArray(payload.activities) ? payload.activities.slice(0, 4) : [];

      if (!leaderboard.length && !activities.length) {
        host.innerHTML = fallbackHtml;
        return;
      }

      const leaderboardHtml = leaderboard.length
        ? leaderboard.map((entry) => {
          const alias = escapeHtml(entry?.alias || 'utente');
          const score = escapeHtml(String(entry?.score ?? '--'));
          const position = escapeHtml(String(entry?.position ?? '--'));
          return `<li><span>#${position}</span><strong>${alias}</strong><em>${score}</em></li>`;
        }).join('')
        : '<li><span>#--</span><strong>Nessun utente ha ancora pubblicato risultati.</strong><em>--</em></li>';

      const activitiesHtml = activities.length
        ? activities.map((entry) => {
          const alias = escapeHtml(entry?.alias || 'utente');
          const action = escapeHtml(entry?.action || 'azione');
          const payloadTxt = escapeHtml(String(entry?.payload || ''));
          return `<li><strong>${alias}</strong> ${action}<span>${payloadTxt}</span></li>`;
        }).join('')
        : '<li><strong>Feed</strong> Nessun utente ha inviato attivita recenti<span>--</span></li>';

      host.innerHTML = `
        <div class="cc-home-community">
          <header>
            <h4>Attivita utenti</h4>
            <p>Concorso ${contest} - aggiornato ${updatedAt}</p>
            ${demoText}
          </header>
          ${pulseHtml}
          <div class="cc-home-community__grid">
            <article>
              <h5>Top player</h5>
              <ul>${leaderboardHtml}</ul>
            </article>
            <article>
              <h5>Ultime azioni</h5>
              <ul>${activitiesHtml}</ul>
            </article>
          </div>
          <a class="cc-home-community__cta" href="${communityUrl}">Apri Community completa</a>
        </div>
      `;
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

    renderHeroStatus(host, data) {
      if (!host) return;
      const modules = Array.isArray(data?.modules) ? data.modules : [];
      const activeAlgorithms = modules.filter((card) => {
        if (!card || card.isActive === false) return false;
        const page = String(card.page || '').toLowerCase();
        return page.includes('/algoritmi/algs/');
      }).length;

      const draws = Array.isArray(data?.draws_rows) ? data.draws_rows : [];
      const latestRow = draws.length ? draws[draws.length - 1] : null;
      const latestSeq = latestRow ? String(latestRow['NR. SEQUENZIALE'] || '--').trim() : '--';
      const latestDate = latestRow ? String(latestRow.Data || latestRow.DATA || '--').trim() : '--';

      const feed = data?.community_feed && typeof data.community_feed === 'object' ? data.community_feed : null;
      const communityUpdated = feed && feed.updated_at ? String(feed.updated_at).trim() : '';
      const communityShort = communityUpdated
        ? communityUpdated.replace('T', ' ').replace('Z', '').slice(0, 16)
        : '';
      const communityLabel = communityUpdated
        ? `Community aggiornata: ${escapeHtml(communityShort)}`
        : 'Community: nessun aggiornamento utenti';

      const chaosIndex = this.computeChaosIndex(draws);
      const signal = this.computeHeroSignal(draws);
      const iargosLabHref = escapeHtml(ctx.resolveWithBase('pages/laboratorio-tecnico/?tab=lab-iargos'));
      const chaosGuideHref = escapeHtml(ctx.resolveWithBase('pages/laboratorio-tecnico/?tab=lab-statistiche'));
      const chaosNote = 'Indice di Caos (0-100): misura la volatilita complessiva del dataset recente.';
      const signalVsChaos = 'Segnale del Giorno = pattern qualitativo dominante. Indice di Caos = metrica quantitativa di instabilita.';
      const signalHtml = signal
        ? `<div class="cc-home-signal"><span class="cc-home-signal__label">Segnale del Giorno</span><span class="cc-home-signal__text">${escapeHtml(signal)}</span></div>`
        : '';
      const statusHtml = `
        <div class="cc-home-iargos-status">
          <p class="cc-home-iargos-status__title">iARGOS AI</p>
          <span class="cc-home-live__item">Supervisore AI del backend attivo</span>
          <a class="cc-home-live__link" href="${iargosLabHref}">Apri approfondimento tecnico</a>
        </div>
      `;

      host.innerHTML = `
        ${signalHtml}
        ${statusHtml}
        <span class="cc-home-live__item">Ultimo concorso: ${escapeHtml(latestSeq)} (${escapeHtml(latestDate)})</span>
        <span class="cc-home-live__item">Algoritmi attivi: ${escapeHtml(String(activeAlgorithms))}</span>
        <span class="cc-home-live__item">${communityLabel}</span>
        <span class="cc-home-live__item cc-home-live__item--chaos">Indice di Caos: ${escapeHtml(String(chaosIndex))}/100</span>
        <p class="cc-home-live__note">${escapeHtml(chaosNote)} <a class="cc-home-live__inline-link" href="${chaosGuideHref}">Scopri come viene calcolato</a></p>
        <p class="cc-home-live__note">${escapeHtml(signalVsChaos)}</p>
      `;

    },

    computeHeroSignal(rows) {
      const list = Array.isArray(rows) ? rows : [];
      const numbersByRow = list.map((row) => this.extractSixNumbers(row)).filter((chunk) => chunk.length === 6);
      if (!numbersByRow.length) return null;

      const latestRow = list[list.length - 1] && typeof list[list.length - 1] === 'object' ? list[list.length - 1] : null;
      const latestSeq = latestRow ? String(latestRow['NR. SEQUENZIALE'] || '--').trim() : '--';
      const latestDate = latestRow ? String(latestRow.Data || latestRow.DATA || '--').trim() : '--';
      const contestPrefix = (latestSeq !== '--' || latestDate !== '--')
        ? `Concorso ${latestSeq} (${latestDate}): `
        : '';

      const signals = [];

      // Segnale 1: ritardatari oltre 40 concorsi
      const delays = this.computeDelays(numbersByRow);
      const longDelayed = delays.filter((d) => d.c >= 40);
      if (longDelayed.length >= 3) {
        const shown = longDelayed.slice(0, 6);
        const nums = shown.map((d) => String(d.n).padStart(2, '0')).join(', ');
        const extra = longDelayed.length > 6 ? ` e altri ${longDelayed.length - 6}` : '';
        const maxDelay = Number(longDelayed[0]?.c || 40);
        const score = longDelayed.length + Math.min(12, Math.round(maxDelay / 5));
        signals.push({
          score,
          text: `${longDelayed.length} numeri in ritardo oltre 40 concorsi (max ${maxDelay}): ${nums}${extra}`
        });
      }

      // Segnale 2: sbilanciamento fascia alta/bassa nelle ultime 30 estrazioni
      const recent30 = numbersByRow.slice(-30);
      const allRecent = recent30.flat();
      const highCount = allRecent.filter((n) => n >= 61).length;
      const lowCount = allRecent.filter((n) => n <= 30).length;
      if (allRecent.length > 0) {
        const highPct = Math.round((highCount / allRecent.length) * 100);
        const lowPct = Math.round((lowCount / allRecent.length) * 100);
        if (highPct >= 45) {
          signals.push({
            score: Math.max(1, Math.round((highPct - 33) / 2)),
            text: `fascia alta in evidenza (61-90): ${highPct}% delle uscite nelle ultime 30 estrazioni`
          });
        } else if (lowPct >= 45) {
          signals.push({
            score: Math.max(1, Math.round((lowPct - 33) / 2)),
            text: `fascia bassa in evidenza (01-30): ${lowPct}% delle uscite nelle ultime 30 estrazioni`
          });
        }
      }

      // Segnale 3: frequenza anomala nelle ultime 90 estrazioni
      const window90 = numbersByRow.slice(-90);
      const freq = new Map();
      for (let n = 1; n <= 90; n += 1) freq.set(n, 0);
      window90.forEach((draw) => draw.forEach((n) => freq.set(n, (freq.get(n) || 0) + 1)));
      const freqValues = Array.from(freq.values());
      const mean = freqValues.reduce((s, v) => s + v, 0) / Math.max(1, freqValues.length);
      const topEntry = Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topEntry && mean > 0) {
        const ratio = topEntry[1] / mean;
        if (ratio >= 2.5) {
          signals.push({
            score: Math.max(1, Math.round(ratio * 4)),
            text: `frequenza anomala: il numero ${String(topEntry[0]).padStart(2, '0')} e uscito ${topEntry[1]} volte nelle ultime ${window90.length} estrazioni`
          });
        }
      }

      // Segnale 4: ripetizioni negli ultimi 5 concorsi
      const last5 = numbersByRow.slice(-5);
      const repCount = new Map();
      last5.flat().forEach((n) => repCount.set(n, (repCount.get(n) || 0) + 1));
      const repeated = Array.from(repCount.entries()).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      if (repeated.length > 0) {
        const nums = repeated.slice(0, 3).map(([n]) => String(n).padStart(2, '0')).join(', ');
        const topRep = Number(repeated[0]?.[1] || 3);
        const score = repeated.length * 3 + topRep;
        signals.push({
          score,
          text: `ripetizioni ravvicinate negli ultimi 5 concorsi: ${nums} (fino a ${topRep} presenze)`
        });
      }

      if (signals.length) {
        signals.sort((a, b) => (b.score - a.score) || (String(b.text).length - String(a.text).length));
        return `${contestPrefix}${signals[0].text}`;
      }

      // Fallback dinamico: nessuna anomalia forte, ma frase sempre ancorata ai dati reali.
      const recent20 = numbersByRow.slice(-20);
      const recentFlat = recent20.flat();
      if (!recentFlat.length) return null;
      const evenCount = recentFlat.filter((n) => n % 2 === 0).length;
      const evenPct = Math.round((evenCount / recentFlat.length) * 100);
      const freq20 = new Map();
      recentFlat.forEach((n) => freq20.set(n, (freq20.get(n) || 0) + 1));
      const top2 = Array.from(freq20.entries())
        .sort((a, b) => b[1] - a[1] || a[0] - b[0])
        .slice(0, 2)
        .map(([n, c]) => `${String(n).padStart(2, '0')}(${c})`)
        .join(', ');
      const highPct20 = Math.round((recentFlat.filter((n) => n >= 61).length / recentFlat.length) * 100);
      return `${contestPrefix}quadro stabile: nessuna anomalia dominante; top ricorrenze ultime 20 estrazioni ${top2 || '--'}, fascia alta ${highPct20}%, pari ${evenPct}%`;
    },

    computeChaosIndex(rows) {
      const list = Array.isArray(rows) ? rows : [];
      const numbersByRow = list.map((row) => this.extractSixNumbers(row)).filter((chunk) => chunk.length === 6);
      if (numbersByRow.length < 10) return 0;

      const delays = this.computeDelays(numbersByRow);
      const delayed30 = delays.filter((d) => d.c >= 30).length;
      const comp1 = Math.min(40, Math.round((delayed30 / 20) * 40));

      const window30 = numbersByRow.slice(-30);
      const freq30 = new Map();
      for (let n = 1; n <= 90; n += 1) freq30.set(n, 0);
      window30.forEach((draw) => draw.forEach((n) => freq30.set(n, (freq30.get(n) || 0) + 1)));
      const freqVals = Array.from(freq30.values());
      const mean30 = freqVals.reduce((s, v) => s + v, 0) / freqVals.length;
      const variance = freqVals.reduce((s, v) => s + Math.pow(v - mean30, 2), 0) / freqVals.length;
      const comp2 = Math.min(40, Math.round((variance / 4) * 40));

      const last5 = numbersByRow.slice(-5);
      const repCount = new Map();
      last5.flat().forEach((n) => repCount.set(n, (repCount.get(n) || 0) + 1));
      const repeatedCount = Array.from(repCount.values()).filter((c) => c >= 3).length;
      const comp3 = Math.min(20, repeatedCount * 10);

      return Math.min(100, comp1 + comp2 + comp3);
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
        const iargosLabel = row.isUpdated ? 'Generata da iARGOS' : 'Validata da iARGOS';
        const ballsHtml = row.proposal.map((value) => {
          const tone = getBallTone(parseInt(value, 10));
          return `<span class="cc-proposal-ball${tone ? ' ' + tone : ''}">${escapeHtml(value)}</span>`;
        }).join('');
        return `
          <a href="${href}" class="cc-proposal-row" title="${title}">
            <span class="cc-proposal-alg-wrap">
              <span class="cc-proposal-alg cc-alg-link">${title}</span>
              <span class="cc-proposal-iargos">${escapeHtml(iargosLabel)}</span>
            </span>
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
