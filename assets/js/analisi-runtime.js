const ANALISI_PAYOUTS = { 0: 1.53, 1: 3.36, 2: 21.51, 3: 326.72, 4: 11906.95, 5: 1235346.49, 6: 622614630.0 };
let analisiMounted = false;

function shouldUseRuntimeDirectorAnalisi() {
  return Boolean(window.CC_PAGE_ORCHESTRATOR && document.body?.dataset?.pageId === 'analisi');
}

function mountAnalisiPage() {
  if (analisiMounted) return;
  analisiMounted = true;

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
    refreshTabsLayout();
    window.setTimeout(refreshTabsLayout, 80);
    window.setTimeout(refreshTabsLayout, 220);
  });

  loadAnalisiRanking();
}

const resolveWithBase = (path) => {
  const value = String(path || '');
  if (!value) return value;
  if (value.startsWith('#') || /^https?:\/\//i.test(value) || value.startsWith('file:')) return value;
  const base = window.CC_BASE?.url;
  if (!base) return value;
  const trimmed = value.startsWith('/') ? value.slice(1) : value.replace(/^\.\//, '');
  return new URL(trimmed, base).toString();
};

const formatRanking = (value) => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

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
  mountAnalisiPage();
});

window.CC_ANALISI_RUNTIME = {
  mount: mountAnalisiPage,
  loadRanking: loadAnalisiRanking
};
