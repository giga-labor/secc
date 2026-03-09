const ANALISI_PAYOUTS = { 0: 1.53, 1: 3.36, 2: 21.51, 3: 326.72, 4: 11906.95, 5: 1235346.49, 6: 622614630.0 };
let analisiMounted = false;

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
    const refreshTabsLayout = () => window.requestAnimationFrame(updateNotch);

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => activate(btn.dataset.tabTarget));
    });
    window.addEventListener('resize', refreshTabsLayout, { passive: true });
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

async function loadLaboratorioTechnicalCatalog() {
  const host = document.querySelector('[data-lab-algorithms]');
  if (!host) return;
  host.innerHTML = 'Caricamento moduli attivi in corso...';
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

    host.innerHTML = validEntries.map((entry) => {
      const intro = escapeHtml(entry.intro || 'N/D');
      const scope = escapeHtml(entry.scope || 'N/D');
      const method = escapeHtml(entry.method || 'N/D');
      const limits = escapeHtml(entry.limits || 'N/D');
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
    }).join('');
  } catch (_) {
    host.innerHTML = 'Impossibile caricare il catalogo tecnico automatico. Apri temporaneamente il catalogo algoritmi per consultare le schede operative.';
  }
}

const fetchAlgorithmRanking = async (card) => {
  const page = String(card?.page || '');
  if (!page) return null;
  const base = /\.html?$/i.test(page) ? page.replace(/[^/]+$/i, '') : `${page.replace(/\/?$/, '/')}`;
  const metricsUrl = resolveWithBase(`${base}out/metrics-db.csv`);
  const historicalUrl = resolveWithBase(`${base}out/historical-db.csv`);
  try {
    const [mRes, hRes] = await Promise.all([fetch(metricsUrl, { cache: 'no-store' }), fetch(historicalUrl, { cache: 'no-store' })]);
    const metricsRows = mRes.ok ? parseCsvRows(await mRes.text()) : [];
    const historicalRows = hRes.ok ? parseCsvRows(await hRes.text()) : [];
    const exact = mergeExactCountsLikeCards(metricsRows, historicalRows);
    const ranking = rankingFromCounts(exact);
    return {
      title: String(card?.title || card?.id || 'Algoritmo'),
      ranking,
      hits: exact
    };
  } catch (_) {
    return null;
  }
};

async function loadAnalisiRanking() {
  const tbody = document.querySelector('[data-ranking-body]');
  if (!tbody) return;
  try {
    const res = await fetch(resolveWithBase('data/modules-manifest.json'), { cache: 'no-store' });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const manifest = await res.json();
    const cardPaths = Array.isArray(manifest) ? manifest.filter((x) => typeof x === 'string') : [];
    const cards = (await Promise.all(cardPaths.map(async (path) => {
      try {
        const cardRes = await fetch(resolveWithBase(path), { cache: 'no-store' });
        if (!cardRes.ok) return null;
        return await cardRes.json();
      } catch (_) {
        return null;
      }
    }))).filter(Boolean);
    const algs = cards.filter((x) => x?.isActive !== false && String(x?.page || '').includes('/algoritmi/algs/'));
    const rankedRaw = (await Promise.all(algs.map(fetchAlgorithmRanking))).filter(Boolean);
    const ranked = rankedRaw
      .map((row) => ({ ...row, _rank: Number.isFinite(row.ranking) ? row.ranking : Number.NEGATIVE_INFINITY }))
      .sort((a, b) => b._rank - a._rank);
    if (!ranked.length) {
      tbody.innerHTML = '<tr><td class="px-4 py-3 text-ash" colspan="4">Nessun algoritmo attivo con ranking disponibile.</td></tr>';
      return;
    }
    tbody.innerHTML = ranked.map((row, idx) => {
      const d = row.hits;
      const detail = `0:${d[0]} 1:${d[1]} 2:${d[2]} 3:${d[3]} 4:${d[4]} 5:${d[5]} 6:${d[6]}`;
      const rankingLabel = Number.isFinite(row.ranking) ? formatRanking(row.ranking) : 'N/D';
      return `<tr><td class="px-4 py-3 text-ash">${idx + 1}</td><td class="px-4 py-3 text-white">${row.title}</td><td class="px-4 py-3 text-white">${rankingLabel}</td><td class="px-4 py-3 text-ash">${detail}</td></tr>`;
    }).join('');
  } catch (_) {
    tbody.innerHTML = '<tr><td class="px-4 py-3 text-ash" colspan="4">Impossibile caricare il ranking algoritmi.</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
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
    loadAnalisiRanking();
  }
});

window.CC_ANALISI_RUNTIME = {
  mount: mountAnalisiPage,
  loadRanking: loadAnalisiRanking
};
