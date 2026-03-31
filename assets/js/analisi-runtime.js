const ANALISI_PAYOUTS = { 0: 1.53, 1: 3.36, 2: 21.51, 3: 326.72, 4: 11906.95, 5: 1235346.49, 6: 622614630.0 };
let analisiMounted = false;
let iargosVideoBound = false;

function shouldUseRuntimeDirectorAnalisi() {
  return Boolean(window.CC_PAGE_ORCHESTRATOR && document.body?.dataset?.pageId === 'analisi');
}

function isRankingPage() {
  return document.body?.dataset?.pageId === 'ranking';
}

function isLaboratorioPage() {
  return document.body?.dataset?.pageId === 'laboratorio-tecnico';
}

function mountAnalisiPage() {
  if (analisiMounted) return;
  analisiMounted = true;
  const requestedTab = new URLSearchParams(window.location.search || '').get('tab');

  const roots = Array.from(document.querySelectorAll('[data-tabs-root]'));
  roots.forEach((root) => {
    const buttons = Array.from(root.querySelectorAll('[data-tab-target]'));
    const panels = Array.from(root.querySelectorAll('[data-tab-panel]'));
    const shell = root.classList.contains('tabs-shell') ? root : root.closest('.tabs-shell');
    const sheet = shell ? shell.querySelector('.tabs-sheet') : null;
    const tabRow = shell ? shell.querySelector('.folder-tabs') : null;
    if (!shell || !sheet || !tabRow) return;
    const showPanelLabel = root.dataset.tabPanelLabel !== 'off';
    const getLabelByTarget = (target) => {
      const button = buttons.find((btn) => btn.dataset.tabTarget === target);
      return button ? button.textContent.trim() : '';
    };

    const ensurePanelLabels = () => {
      if (!showPanelLabel) {
        panels.forEach((panel) => {
          panel.querySelectorAll(':scope > [data-tab-active-label]').forEach((label) => label.remove());
        });
        return;
      }
      panels.forEach((panel) => {
        let label = panel.querySelector(':scope > [data-tab-active-label]');
        if (!label) {
          label = document.createElement('p');
          label.className = 'tab-active-label';
          label.dataset.tabActiveLabel = '';
          label.setAttribute('aria-live', 'polite');
          panel.prepend(label);
        }
        label.textContent = getLabelByTarget(panel.dataset.tabPanel);
      });
    };

    const updateNotch = () => {
      const activeBtn = buttons.find((btn) => btn.classList.contains('is-active')) || buttons[0];
      if (!activeBtn) return;
      const rowRect = tabRow.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const firstBtnRect = buttons[0]?.getBoundingClientRect();
      const left = Math.max(0, btnRect.left - rowRect.left);
      const width = Math.max(0, btnRect.width);
      const isWrapped = Boolean(firstBtnRect) && rowRect.height > (firstBtnRect.height + 6);
      const isOverflowing = tabRow.scrollWidth > (tabRow.clientWidth + 4);
      shell.classList.toggle('is-compact-tabs', isWrapped || isOverflowing);
      shell.style.setProperty('--active-notch-left', `${left.toFixed(2)}px`);
      shell.style.setProperty('--active-notch-width', `${width.toFixed(2)}px`);
    };

    const activate = (target) => {
      buttons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tabTarget === target));
      panels.forEach((panel) => panel.classList.toggle('is-active', panel.dataset.tabPanel === target));
      updateNotch();
    };
    const tabsRuntimeId = root.dataset.tabsRuntimeId || `analisi-tabs-${Math.random().toString(36).slice(2, 8)}`;
    root.dataset.tabsRuntimeId = tabsRuntimeId;
    const refreshTabsLayout = () => window.requestAnimationFrame(updateNotch);

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => activate(btn.dataset.tabTarget));
    });
    if (window.CC_PERF && typeof window.CC_PERF.onResize === 'function') {
      window.CC_PERF.onResize(tabsRuntimeId, refreshTabsLayout);
    } else {
      window.addEventListener('resize', refreshTabsLayout, { passive: true });
    }
    window.addEventListener('orientationchange', refreshTabsLayout, { passive: true });
    window.addEventListener('pageshow', refreshTabsLayout, { passive: true });
    document.addEventListener('visibilitychange', refreshTabsLayout, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', refreshTabsLayout, { passive: true });
    }
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(() => refreshTabsLayout());
      observer.observe(shell);
      observer.observe(tabRow);
      root._tabsResizeObserver = observer;
    }
    ensurePanelLabels();
    const initialTarget = buttons.some((btn) => btn.dataset.tabTarget === requestedTab)
      ? requestedTab
      : ((buttons.find((btn) => btn.classList.contains('is-active')) || buttons[0])?.dataset.tabTarget);
    if (initialTarget) activate(initialTarget);
    else refreshTabsLayout();
    window.setTimeout(refreshTabsLayout, 80);
    window.setTimeout(refreshTabsLayout, 220);
  });

  loadAnalisiRanking();
  loadLaboratorioTechnicalCatalog();
  loadLaboratorioIargosStatus();
  initLaboratorioIargosVideo();
}

function initLaboratorioIargosVideo() {
  if (iargosVideoBound) return;
  const openBtn = document.querySelector('[data-iargos-video-open]');
  const modal = document.querySelector('[data-iargos-video-modal]');
  const video = document.querySelector('[data-iargos-video-player]');
  if (!openBtn || !modal || !(video instanceof HTMLVideoElement)) return;

  const closeNodes = Array.from(document.querySelectorAll('[data-iargos-video-close]'));
  const closeModal = () => {
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cc-iargos-video-modal-open');
    video.pause();
    try {
      video.currentTime = 0;
    } catch (_) {
      // ignore seek errors on close
    }
  };
  const openModal = () => {
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cc-iargos-video-modal-open');
    video.preload = 'auto';
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // autoplay can fail on some browsers; controls remain available.
      });
    }
  };

  openBtn.addEventListener('click', openModal);
  closeNodes.forEach((node) => node.addEventListener('click', closeModal));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal();
  });
  iargosVideoBound = true;
}

const resolveWithBase = (path) => {
  const value = String(path || '');
  if (!value) return value;
  if (value.startsWith('#') || /^https?:\/\//i.test(value) || value.startsWith('file:')) return value;
  const base = window.CC_BASE?.url;
  const trimmed = value.startsWith('/') ? value.slice(1) : value.replace(/^\.\//, '');
  if (!base) {
    if (/^(pages|data|assets|img|archives)\//i.test(trimmed)) return `/${trimmed}`;
    return value;
  }
  return new URL(trimmed, base).toString();
};

const buildFetchCandidates = (path) => {
  const value = String(path || '').trim();
  if (!value) return [];
  if (value.startsWith('#') || /^https?:\/\//i.test(value) || value.startsWith('file:')) return [value];
  const trimmed = value.startsWith('/') ? value.slice(1) : value.replace(/^\.\//, '');
  const fromBase = resolveWithBase(trimmed);
  const rootAbsolute = `/${trimmed}`;
  const pageRelative = `../../${trimmed}`;
  const direct = trimmed;
  return Array.from(new Set([fromBase, rootAbsolute, pageRelative, direct].filter(Boolean)));
};

const fetchFirstOk = async (path, init = { cache: 'no-store' }) => {
  const candidates = buildFetchCandidates(path);
  for (let i = 0; i < candidates.length; i += 1) {
    try {
      const res = await fetch(candidates[i], init);
      if (res.ok) return res;
    } catch (_) {
      // Try next candidate.
    }
  }
  return null;
};

const fetchJsonFirstOk = async (path) => {
  const res = await fetchFirstOk(path, { cache: 'no-store' });
  if (!res) return null;
  try {
    return await res.json();
  } catch (_) {
    return null;
  }
};

const fetchTextFirstOk = async (path) => {
  const res = await fetchFirstOk(path, { cache: 'no-store' });
  if (!res) return '';
  try {
    return await res.text();
  } catch (_) {
    return '';
  }
};

const formatRanking = (value) => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const parseCsvRows = (raw) => {
  const clean = (v) => {
    const s = String(v || '').trim();
    if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) return s.slice(1, -1).replace(/""/g, '"').trim();
    return s;
  };
  const lines = String(raw || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  if (!lines.length) return [];
  const header = lines[0].split(',').map((x) => clean(x));
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((x) => clean(x));
    if (cells.length > header.length) {
      const merged = cells.slice(0, header.length - 1);
      merged.push(clean(cells.slice(header.length - 1).join(',')));
      return header.reduce((acc, h, i) => { acc[h] = merged[i] || ''; return acc; }, {});
    }
    return header.reduce((acc, h, i) => { acc[h] = cells[i] || ''; return acc; }, {});
  });
};

const exactFromMetrics = (rows) => {
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let hasAny = false;
  (rows || []).forEach((row) => {
    const metric = String(row['METRICA'] || '').trim().toLowerCase();
    const m = metric.match(/^con\s+([0-6])\s+hit$/);
    if (!m) return;
    const k = Number.parseInt(m[1], 10);
    const v = Number.parseInt(String(row['VALORE'] || '').replace(/[^\d-]/g, ''), 10);
    if (!Number.isFinite(v)) return;
    counts[k] = Math.max(0, v);
    hasAny = true;
  });
  return hasAny ? counts : null;
};

const exactFromHistorical = (rows) => {
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  (rows || []).forEach((row) => {
    let h = 0;
    for (let i = 1; i <= 6; i += 1) {
      const val = String(row[`N${i}`] || '').trim();
      if (val.startsWith('[') && val.endsWith(']')) h += 1;
    }
    if (h >= 0 && h <= 6) counts[h] += 1;
  });
  return counts;
};

const rankingFromCounts = (counts) => {
  let total = 0;
  for (let k = 0; k <= 6; k += 1) total += (counts[k] || 0) * (ANALISI_PAYOUTS[k] || 0);
  return total;
};

const mergeExactCountsLikeCards = (metricsRows, historicalRows) => {
  const fromMetrics = exactFromMetrics(metricsRows);
  const fromHist = exactFromHistorical(historicalRows);
  if (fromMetrics) {
    const out = { ...fromMetrics };
    out[0] = fromHist[0] || 0;
    out[1] = fromHist[1] || 0;
    return out;
  }
  return fromHist;
};

const normalizePageDir = (value) => {
  let page = String(value || '').trim();
  if (!page) return '';
  if (!page.startsWith('/')) page = `/${page}`;
  if (!page.endsWith('/')) page = `${page}/`;
  return page;
};

const resolveRankingTone = (family) => {
  const value = String(family || '').toLowerCase();
  if (value === 'statistico') return 'alg-stat';
  if (value === 'neurale') return 'alg-neural';
  if (value === 'ibrido') return 'alg-hybrid';
  return 'study';
};

const resolveRankingImage = (card, page) => {
  const image = String(card?.image || card?.img || '').trim();
  if (/^(https?:\/\/|file:|data:|\/)/i.test(image)) return resolveWithBase(image);
  const pageDir = normalizePageDir(page || card?.page || '');
  if (image && pageDir) return resolveWithBase(`${pageDir}${image}`);
  if (image) return resolveWithBase(image);
  return resolveWithBase('img/algoritm.webp');
};

const setTextAll = (selector, value) => {
  const nodes = Array.from(document.querySelectorAll(selector));
  nodes.forEach((node) => {
    node.textContent = String(value ?? '--');
  });
};

async function loadLaboratorioIargosStatus() {
  const hasTargets = Boolean(
    document.querySelector('[data-lab-iargos-updated]')
  );
  if (!hasTargets) return;

  const formatStatusTs = (value) => {
    const raw = String(value || '').trim();
    if (!raw || raw === '--') return '--';
    const normalized = /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?/.test(raw) ? raw.replace(' ', 'T') : raw;
    const dt = new Date(normalized);
    if (!Number.isFinite(dt.getTime())) return raw;
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dt);
  };

  const fallback = () => {
    setTextAll('[data-lab-iargos-updated]', '--');
  };

  try {
    const data = await fetchJsonFirstOk('data/iargos-public-status.json');
    if (!data || typeof data !== 'object') {
      fallback();
      return;
    }

    const runtime = data.runtime && typeof data.runtime === 'object' ? data.runtime : {};
    const updatedAt = formatStatusTs(runtime.last_push_at || runtime.last_sync_at || data.updated_at || data.checked_at || '--');
    setTextAll('[data-lab-iargos-updated]', updatedAt);
  } catch (_) {
    fallback();
  }
}

async function loadLaboratorioTechnicalCatalog() {
  const host = document.querySelector('[data-lab-algorithms]');
  if (!host) return;
  host.innerHTML = '<span class="cc-skeleton cc-skeleton--block block h-4 w-full" aria-hidden="true"></span>';
  try {
    const manifestRes = await fetch(resolveWithBase('data/modules-manifest.json'), { cache: 'no-store' });
    if (!manifestRes.ok) throw new Error(`status ${manifestRes.status}`);
    const manifest = await manifestRes.json();
    const cardPaths = (Array.isArray(manifest) ? manifest : [])
      .map((p) => String(p || '').trim())
      .filter((p) => p.includes('pages/algoritmi/algs/') && p.endsWith('/card.json'));

    const cards = (await Promise.all(cardPaths.map(async (path) => {
      try {
        const res = await fetch(resolveWithBase(path), { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
      } catch (_) {
        return null;
      }
    }))).filter(Boolean).filter((card) => card?.isActive !== false);

    if (!cards.length) {
      host.innerHTML = 'Nessun modulo tecnico attivo trovato.';
      return;
    }

    cards.sort((a, b) => String(a.title || a.id || '').localeCompare(String(b.title || b.id || '')));
    const entries = await Promise.all(cards.map(async (card) => {
      const pageDir = normalizePageDir(card.page);
      if (!pageDir) return null;
      const sheetUrl = resolveWithBase(`${pageDir}out/algorithm-sheet.csv`);
      const analysisUrl = resolveWithBase(`${pageDir}out/analysis.txt`);
      const [sheetText, analysisText] = await Promise.all([
        fetch(sheetUrl, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')).catch(() => ''),
        fetch(analysisUrl, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')).catch(() => '')
      ]);
      const rows = parseCsvRows(sheetText);
      const map = new Map(rows.map((row) => [String(row.CHIAVE || '').trim().toUpperCase(), String(row.VALORE || '').trim()]));
      const facts = rows
        .map((row) => ({
          key: String(row.CHIAVE || '').trim(),
          value: String(row.VALORE || '').trim()
        }))
        .filter((row) => row.key && row.value);
      return {
        title: String(card.title || card.id || 'Modulo'),
        page: pageDir,
        intro: String(map.get('INTRO') || card.subtitle || '').trim(),
        scope: String(map.get('SCOPO') || '').trim(),
        method: String(map.get('METODO') || '').trim(),
        limits: String(map.get('LIMITI') || '').trim(),
        analysis: String(analysisText || '').trim(),
        facts
      };
    }));

    const validEntries = entries.filter(Boolean);
    if (!validEntries.length) {
      host.innerHTML = 'Nessun dettaglio tecnico disponibile per i moduli attivi.';
      return;
    }

    const toArticleHtml = (entry) => {
      const intro = escapeHtml(entry.intro || '--');
      const scope = escapeHtml(entry.scope || '--');
      const method = escapeHtml(entry.method || '--');
      const limits = escapeHtml(entry.limits || '--');
      const analysis = escapeHtml(entry.analysis || 'Analisi non disponibile.');
      const factsRows = Array.isArray(entry.facts) ? entry.facts : [];
      const factsHtml = factsRows.length
        ? `<div class="mt-3 overflow-auto"><table class="min-w-full text-left text-xs"><tbody class="divide-y divide-white/10">${factsRows.map((row) => `<tr><td class="px-2 py-1 text-neon/90">${escapeHtml(row.key)}</td><td class="px-2 py-1 text-ash">${escapeHtml(row.value)}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="mt-3 text-xs text-ash">Nessun campo tecnico addizionale disponibile.</p>';
      const pageHref = resolveWithBase(entry.page);
      return `
        <article class="mb-4 rounded-2xl border border-white/10 bg-midnight/70 p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-base font-semibold text-white">${escapeHtml(entry.title)}</h3>
            <a class="rounded-full border border-neon/70 bg-neon/10 px-3 py-1 text-xs font-semibold text-neon transition hover:-translate-y-1 hover:bg-neon/20" href="${pageHref}">Apri scheda operativa</a>
          </div>
          <p class="mt-3 text-sm text-ash"><strong>Scopo:</strong> ${scope}</p>
          <p class="mt-2 text-sm text-ash"><strong>Metodo:</strong> ${method}</p>
          <p class="mt-2 text-sm text-ash"><strong>Intro:</strong> ${intro}</p>
          <p class="mt-2 text-sm text-ash"><strong>Limiti:</strong> ${limits}</p>
          <details class="mt-3 rounded-xl border border-white/10 bg-midnight/80 p-3">
            <summary class="cursor-pointer text-sm font-semibold text-white">Dettaglio tecnico completo</summary>
            ${factsHtml}
            <pre class="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-ash">${analysis}</pre>
          </details>
        </article>
      `;
    };

    host.innerHTML = '';
    const perf = window.CC_PERF;
    if (perf && typeof perf.renderInChunks === 'function' && validEntries.length > 12) {
      await perf.renderInChunks(validEntries, (entry) => {
        host.insertAdjacentHTML('beforeend', toArticleHtml(entry));
      }, { chunkSize: 6 });
    } else {
      host.innerHTML = validEntries.map((entry) => toArticleHtml(entry)).join('');
    }
  } catch (_) {
    host.innerHTML = 'Impossibile caricare il catalogo tecnico automatico. Apri temporaneamente il catalogo algoritmi per consultare le schede operative.';
  }
}

const fetchAlgorithmRanking = async (card) => {
  const page = String(card?.page || '');
  if (!page) return null;
  const base = /\.html?$/i.test(page) ? page.replace(/[^/]+$/i, '') : `${page.replace(/\/?$/, '/')}`;
  const metricsUrl = `${base}out/metrics-db.csv`;
  const historicalUrl = `${base}out/historical-db.csv`;
  try {
    const [metricsText, historicalText] = await Promise.all([fetchTextFirstOk(metricsUrl), fetchTextFirstOk(historicalUrl)]);
    const metricsRows = metricsText ? parseCsvRows(metricsText) : [];
    const historicalRows = historicalText ? parseCsvRows(historicalText) : [];
    const exact = mergeExactCountsLikeCards(metricsRows, historicalRows);
    const ranking = rankingFromCounts(exact);
    return {
      title: String(card?.title || card?.id || 'Algoritmo'),
      page: String(card?.page || ''),
      ranking,
      hits: exact,
      family: String(card?.macroGroup || ''),
      card
    };
  } catch (_) {
    return null;
  }
};

async function loadAnalisiRanking() {
  const tbody = document.querySelector('[data-ranking-body]');
  const cardsHost = document.querySelector('[data-ranking-cards]');
  if (!tbody && !cardsHost) return;
  try {
    const manifest = await fetchJsonFirstOk('data/modules-manifest.json');
    if (!manifest) throw new Error('manifest_unavailable');
    const cardPaths = Array.isArray(manifest) ? manifest.filter((x) => typeof x === 'string') : [];
    const cards = (await Promise.all(cardPaths.map(async (path) => {
      return await fetchJsonFirstOk(path);
    }))).filter(Boolean);
    const algs = cards.filter((x) => x?.isActive !== false && String(x?.page || '').includes('/algoritmi/algs/'));
    const rankedRaw = (await Promise.all(algs.map(fetchAlgorithmRanking))).filter(Boolean);
    const ranked = rankedRaw
      .map((row) => ({ ...row, _rank: Number.isFinite(row.ranking) ? row.ranking : Number.NEGATIVE_INFINITY }))
      .sort((a, b) => b._rank - a._rank);
    if (!ranked.length) {
      if (cardsHost) cardsHost.innerHTML = '<div class="cc-home-empty">Nessun algoritmo attivo con ranking disponibile.</div>';
      if (tbody) tbody.innerHTML = '<tr><td class="px-4 py-3 text-ash" colspan="4">Nessun algoritmo attivo con ranking disponibile.</td></tr>';
      return;
    }

    const toCardHtml = (row, rankPosition, options = {}) => {
      const d = row.hits;
      const detail = `Hit 0:${d[0]} 1:${d[1]} 2:${d[2]} 3:${d[3]} 4:${d[4]} 5:${d[5]} 6:${d[6]}`;
      const rankingLabel = Number.isFinite(row.ranking) ? formatRanking(row.ranking) : '--';
      const href = row.page ? escapeHtml(resolveWithBase(row.page)) : '#';
      const title = escapeHtml(row.title);
      const family = escapeHtml(String(row.family || 'core').toUpperCase());
      const tone = resolveRankingTone(row.family);
      const imageUrl = escapeHtml(resolveRankingImage(row.card, row.page) || '#');
      const isPodium = options && options.podium === true;
      const podiumClass = isPodium ? ` cc-ranking-card--podium cc-ranking-card--podium-${rankPosition}` : '';
      return `
        <a href="${href}" class="cc-card cc-card3d card-3d algorithm-card cc-ranking-card${podiumClass} group relative flex min-h-[330px] flex-col overflow-hidden rounded-2xl border border-white/10 transition cc-card-tone-${tone} is-active" aria-label="Apri ${title}">
          <span class="cc-ranking-card__badge">#${rankPosition}</span>
          <div class="cc-card-media cc-card-media-frame algorithm-card__media algorithm-card__media--third relative overflow-hidden" style="position:relative;width:100%;aspect-ratio:15/8;min-height:0;max-height:none;overflow:hidden;">
            <img class="h-full w-full object-cover" src="${imageUrl}" alt="Anteprima ${title}" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block;">
          </div>
          <div class="cc-card-body algorithm-card__body flex flex-1 flex-col gap-1.5 px-4 pt-2.5 pb-10">
            <span class="text-[10px] uppercase tracking-[0.22em] text-neon/90">${family}</span>
            <h3 class="text-[0.98rem] font-semibold leading-tight group-hover:text-neon">${title}</h3>
            <p class="algorithm-card__desc text-[0.74rem] leading-[1.25] text-ash">${escapeHtml(detail)}</p>
          </div>
          <div class="cc-card-proposal absolute bottom-2 left-3 right-3 w-auto rounded-full border border-neon/70 bg-neon/10 px-2 py-[0.24rem] text-[0.64rem] font-semibold tracking-[0.04em] text-neon overflow-hidden text-ellipsis shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_10px_rgba(0,0,0,0.35)]">Punteggio: ${rankingLabel}</div>
        </a>
      `;
    };

    const toRowHtml = (row, idx) => {
      const d = row.hits;
      const detail = `0:${d[0]} 1:${d[1]} 2:${d[2]} 3:${d[3]} 4:${d[4]} 5:${d[5]} 6:${d[6]}`;
      const rankingLabel = Number.isFinite(row.ranking) ? formatRanking(row.ranking) : '--';
      const href = row.page ? escapeHtml(resolveWithBase(row.page)) : null;
      const titleCell = href
        ? `<a href="${href}" class="cc-alg-link">${escapeHtml(row.title)}</a>`
        : escapeHtml(row.title);
      return `<tr><td class="px-4 py-3 text-ash">${idx + 1}</td><td class="px-4 py-3 text-white">${titleCell}</td><td class="px-4 py-3 text-white">${rankingLabel}</td><td class="px-4 py-3 text-ash">${detail}</td></tr>`;
    };

    if (cardsHost) {
      const podium = ranked.slice(0, 3);
      const others = ranked.slice(3);

      const podiumHtml = podium.map((row, idx) => {
        const rankPosition = idx + 1;
        const slotClass = rankPosition === 1
          ? 'cc-ranking-podium__slot cc-ranking-podium__slot--first'
          : rankPosition === 2
            ? 'cc-ranking-podium__slot cc-ranking-podium__slot--second'
            : 'cc-ranking-podium__slot cc-ranking-podium__slot--third';
        return `<article class="${slotClass}">${toCardHtml(row, rankPosition, { podium: true })}</article>`;
      }).join('');

      const othersHtml = others.map((row, idx) => toCardHtml(row, idx + 4)).join('');
      const rankingMarkup = `
        <div class="cc-ranking-layout">
          <section class="cc-ranking-podium-wrap">
            <h3 class="cc-ranking-section-title">Podio algoritmi</h3>
            <div class="cc-ranking-podium">${podiumHtml}</div>
          </section>
          ${others.length
            ? `<section class="cc-ranking-list-wrap">
                <h3 class="cc-ranking-section-title">Tutti gli altri algoritmi</h3>
                <div class="cc-ranking-cards-grid">${othersHtml}</div>
              </section>`
            : ''}
        </div>
      `;

      cardsHost.classList.remove('cc-ranking-cards-grid');
      cardsHost.classList.add('cc-ranking-cards-host');
      cardsHost.innerHTML = rankingMarkup;
      if (window.CARDS && typeof window.CARDS.enableDepth === 'function') {
        window.CARDS.enableDepth(cardsHost);
      }
    } else if (tbody) {
      const perf = window.CC_PERF;
      tbody.innerHTML = '';
      if (perf && typeof perf.renderInChunks === 'function' && ranked.length > 18) {
        await perf.renderInChunks(ranked, (row, idx) => {
          tbody.insertAdjacentHTML('beforeend', toRowHtml(row, idx));
        }, { chunkSize: 10 });
      } else {
        tbody.innerHTML = ranked.map((row, idx) => toRowHtml(row, idx)).join('');
      }
    }
  } catch (_) {
    if (cardsHost) {
      const hasFallbackCard = Boolean(cardsHost.querySelector('.algorithm-card'));
      if (!hasFallbackCard) {
        cardsHost.innerHTML = '<div class="cc-home-empty">Impossibile caricare il ranking algoritmi.</div>';
      }
    }
    if (tbody) tbody.innerHTML = '<tr><td class="px-4 py-3 text-ash" colspan="4">Impossibile caricare il ranking algoritmi.</td></tr>';
  }
}

let rankingBooted = false;

const bootAnalisiRuntime = () => {
  if (shouldUseRuntimeDirectorAnalisi()) return;
  if (document.body?.dataset?.pageId === 'analisi') {
    mountAnalisiPage();
    return;
  }
  if (isLaboratorioPage()) {
    mountAnalisiPage();
    return;
  }
  if (isRankingPage()) {
    if (rankingBooted) return;
    rankingBooted = true;
    loadAnalisiRanking();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootAnalisiRuntime, { once: true });
} else {
  bootAnalisiRuntime();
}

window.addEventListener('pageshow', bootAnalisiRuntime, { passive: true });
window.addEventListener('load', bootAnalisiRuntime, { passive: true });

window.CC_ANALISI_RUNTIME = {
  mount: mountAnalisiPage,
  loadRanking: loadAnalisiRanking,
  loadIargosStatus: loadLaboratorioIargosStatus
};
