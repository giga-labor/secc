const cardsIndexPath = 'data/modules-manifest.json';
const spotlightCardsIndexPath = 'data/algorithms-spotlight/modules-manifest.json';

function shouldUseRuntimeDirector() {
  return Boolean(window.CC_PAGE_ORCHESTRATOR && document.body?.dataset?.pageId === 'algoritmi');
}

async function mountAlgorithmsPage(options = {}) {
  enableCardDepthForAll();
  const areaSelector = options.areaSelector || '[data-algorithms-area]';
  const counterSelector = options.counterSelector || '[data-algorithms-count]';
  const area = document.querySelector(areaSelector);
  const counter = document.querySelector(counterSelector);
  if (!area) return;
  await loadAlgorithms(area, counter);
}

document.addEventListener('DOMContentLoaded', () => {
  if (shouldUseRuntimeDirector()) return;
  mountAlgorithmsPage();
});

async function loadSpotlightCards(area) {
  try {
    const cards = await loadCardsIndex(spotlightCardsIndexPath);
    const spotlight = pickSpotlightByCategory(cards);
    await renderSpotlightCards(area, spotlight);
  } catch (error) {
    area.innerHTML = '<div class="rounded-2xl border border-dashed border-white/15 bg-transparent p-5 text-sm text-ash">Impossibile caricare le tipologie.</div>';
  }
}

async function loadAlgorithms(area, counter) {
  try {
    const [cards, spotlightCards] = await Promise.all([
      loadCardsIndex(cardsIndexPath),
      loadCardsIndex(spotlightCardsIndexPath).catch(() => [])
    ]);
    const algorithms = cards.filter((card) => card.id && card.id !== 'storico-estrazioni');
    await preloadAlgorithmRankings(algorithms);
    await renderAlgorithms(area, algorithms, spotlightCards);
    if (counter) {
      counter.textContent = `${algorithms.length} algoritmi`;
    }
  } catch (error) {
    area.innerHTML = '<div class="rounded-2xl border border-dashed border-white/15 bg-midnight/70 p-5 text-sm text-ash">Impossibile caricare gli algoritmi.</div>';
    if (counter) counter.textContent = '0 algoritmi';
  }
}

async function preloadAlgorithmRankings(cards) {
  if (!window.CARDS || typeof window.CARDS.computeRankingForAlgorithm !== 'function') return;
  const activeCards = (cards || []).filter((card) => card?.isActive !== false);
  await Promise.all(activeCards.map(async (card) => {
    try {
      const ranking = await window.CARDS.computeRankingForAlgorithm(card);
      if (Number.isFinite(ranking)) card.rankingValue = ranking;
    } catch (_) {
      // keep card without ranking
    }
  }));
}

async function loadCardsIndex(path) {
  if (window.CARDS_INDEX && typeof window.CARDS_INDEX.load === 'function') {
    return window.CARDS_INDEX.load(path);
  }
  const resolved = resolveWithBase(path);
  const response = await fetch(resolved, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`status ${response.status}`);
  }
  return response.json();
}

function resolveWithBase(path) {
  if (!path) return path;
  const value = String(path);
  if (value.startsWith('#') || /^https?:\/\//i.test(value) || value.startsWith('file:')) {
    return value;
  }
  const base = window.CC_BASE?.url;
  if (!base) return value;
  const trimmed = value.startsWith('/') ? value.slice(1) : value.replace(/^\.\//, '');
  return new URL(trimmed, base).toString();
}

async function renderAlgorithms(area, algorithms, spotlightCards = []) {
  area.innerHTML = '';
  const gridObservers = [];
  const tabsRoot = document.createElement('div');
  tabsRoot.className = 'tabs-shell mt-2';
  tabsRoot.dataset.tabsRoot = '';
  tabsRoot.dataset.tabPanelLabel = 'off';
  const tabsRow = document.createElement('div');
  tabsRow.className = 'folder-tabs';
  const tabsSheet = document.createElement('div');
  tabsSheet.className = 'tabs-sheet';

  const buckets = {
    statistici: [],
    neurali: [],
    ibridi: []
  };

  algorithms.forEach((algorithm) => {
    const category = classifyAlgorithmCategory(algorithm);
    buckets[category].push(algorithm);
  });

  const tabDefs = [
    { key: 'tipologie', label: 'Tipologie' },
    { key: 'statistici', label: 'Statistici' },
    { key: 'neurali', label: 'Neurali' },
    { key: 'ibridi', label: 'Ibridi' }
  ];

  for (let index = 0; index < tabDefs.length; index += 1) {
    const tabDef = tabDefs[index];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tab-btn${index === 0 ? ' is-active' : ''}`;
    button.dataset.tabTarget = tabDef.key;
    button.textContent = tabDef.label;
    tabsRow.appendChild(button);

    const panel = document.createElement('section');
    panel.className = `tab-panel space-y-10${index === 0 ? ' is-active' : ''}`;
    panel.dataset.tabPanel = tabDef.key;

    if (tabDef.key === 'tipologie') {
      const spotlight = pickSpotlightByCategory(spotlightCards);
      if (!spotlight.length) {
        panel.innerHTML = '<div class="rounded-2xl border border-dashed border-white/15 bg-midnight/70 p-5 text-sm text-ash">Nessuna tipologia disponibile.</div>';
      } else {
        const grid = document.createElement('div');
        grid.className = 'grid min-h-[220px] gap-4 sm:grid-cols-2 lg:grid-cols-3';
        const cards = await Promise.all(
          spotlight.map((algorithm) => createAlgorithmCard(algorithm, { forceActive: false }))
        );
        cards.forEach((card) => grid.appendChild(card));
        panel.appendChild(grid);
        bindAlgorithmGridLayout(grid, gridObservers);
      }
    } else {
      const items = buckets[tabDef.key] || [];
      if (!items.length) {
        panel.innerHTML = '<div class="rounded-2xl border border-dashed border-white/15 bg-midnight/70 p-5 text-sm text-ash">Nessuna tipologia disponibile.</div>';
        tabsSheet.appendChild(panel);
        continue;
      }
      const intro = document.createElement('div');
      intro.className = 'flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neon/30 bg-neon/5 px-4 py-3 shadow-[0_0_18px_rgba(255,217,102,0.18)]';
      const activeCount = items.filter((item) => item?.isActive !== false).length;
      intro.innerHTML = `
        <p class="text-xs uppercase tracking-[0.2em] text-ash">Totale: ${items.length} · Attivi: ${activeCount}</p>
      `;
      panel.appendChild(intro);

      const grid = document.createElement('div');
      grid.className = 'mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      grid.dataset.groupGrid = '';
      const cards = await Promise.all(
        items.map((algorithm) => createAlgorithmCard(algorithm, { forceActive: false }))
      );
      cards.forEach((card) => grid.appendChild(card));
      panel.appendChild(grid);
      bindAlgorithmGridLayout(grid, gridObservers);
    }

    tabsSheet.appendChild(panel);
  }

  tabsRoot.appendChild(tabsRow);
  tabsRoot.appendChild(tabsSheet);
  area.appendChild(tabsRoot);
  initTabsRootLocal(tabsRoot);
  enableCardDepthForAll();
  scrollToGroupHash();
}

async function renderSpotlightCards(area, cards) {
  area.innerHTML = '';
  const gridObservers = [];
  if (!Array.isArray(cards) || cards.length === 0) {
    area.innerHTML = '<div class="rounded-2xl border border-dashed border-white/15 bg-transparent p-5 text-sm text-ash">Nessuna tipologia attiva disponibile.</div>';
    return;
  }

  const visibleCards = cards.slice(0, 3);
  const builtCards = await Promise.all(
    visibleCards.map((cardData) => createAlgorithmCard(cardData, { forceActive: false }))
  );
  builtCards.forEach((card) => area.appendChild(card));

  bindAlgorithmGridLayout(area, gridObservers);

  enableCardDepthForAll();
}

async function createAlgorithmCard(algorithm, options = {}) {
  const tuneCardMedia = (card) => {
    const image = card?.querySelector?.('img');
    if (!image) return card;
    if (!image.getAttribute('decoding')) image.setAttribute('decoding', 'async');
    if (!image.getAttribute('loading')) image.setAttribute('loading', 'lazy');
    return card;
  };
  if (window.CARDS && typeof window.CARDS.buildAlgorithmCard === 'function') {
    const card = await window.CARDS.buildAlgorithmCard(algorithm, options);
    return tuneCardMedia(card);
  }
  const fallback = buildFallbackCard(algorithm);
  return tuneCardMedia(fallback);
}

function buildFallbackCard(algorithm) {
  const href = resolveWithBase(algorithm.page || '#') || '#';
  const title = algorithm.title || 'Algoritmo';
  const builder = window.CC_COMPONENTS;
  if (builder && typeof builder.build === 'function' && builder.has('card')) {
    const built = builder.build('card', {
      tag: 'a',
      className: 'cc-card cc-card-action card-3d algorithm-card is-active',
      href,
      dataset: {
        cardId: String(algorithm.id || title).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        cardType: 'action'
      },
      slots: {
        body: `<div class=\"cc-card-body algorithm-card__body flex flex-1 flex-col gap-2 px-4 py-4\"><h3 class=\"text-[0.98rem] font-semibold leading-tight\">${escapeHtml(title)}</h3></div>`
      }
    });
    if (built) return built;
  }
  const fallback = document.createElement('a');
  fallback.className = 'cc-card cc-card-action card-3d algorithm-card is-active';
  fallback.href = href;
  fallback.textContent = title;
  return fallback;
}

function enableCardDepthForAll() {
  if (window.CARDS && typeof window.CARDS.enableDepth === 'function') {
    window.CARDS.enableDepth(document);
  }
}

function sanitizeId(value) {
  return String(value || 'algoritmo')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sortBySpotlightType(a, b) {
  const order = ['statistici', 'neurale', 'ibrido'];
  const keyA = String(a?.macroGroup || '').toLowerCase();
  const keyB = String(b?.macroGroup || '').toLowerCase();
  const indexA = order.indexOf(keyA);
  const indexB = order.indexOf(keyB);
  if (indexA !== -1 || indexB !== -1) {
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  }
  return String(a?.title || '').localeCompare(String(b?.title || ''));
}

function classifyCategoryFromText(value) {
  const key = String(value || '').toLowerCase();
  if (key.includes('neur')) return 'neurali';
  if (key.includes('ibrid')) return 'ibridi';
  return 'statistici';
}

function classifyAlgorithmCategory(algorithm) {
  const macro = String(algorithm?.macroGroup || '');
  const id = String(algorithm?.id || '');
  const title = String(algorithm?.title || '');
  return classifyCategoryFromText(`${macro} ${id} ${title}`);
}

function pickSpotlightByCategory(cards) {
  const active = (cards || []).filter((card) => card?.isActive !== false);
  const chosen = [];
  const usedIds = new Set();
  const categories = ['statistici', 'neurali', 'ibridi'];

  categories.forEach((category) => {
    const match = active.find((card) => {
      const cardCategory = classifyAlgorithmCategory(card);
      return cardCategory === category && !usedIds.has(card.id);
    });
    if (match) {
      chosen.push(match);
      usedIds.add(match.id);
    }
  });

  if (chosen.length < 3) {
    const fallback = active
      .filter((card) => !usedIds.has(card.id))
      .sort(sortBySpotlightType)
      .slice(0, 3 - chosen.length);
    fallback.forEach((card) => {
      chosen.push(card);
      usedIds.add(card.id);
    });
  }
  return chosen.slice(0, 3);
}

function initTabsRootLocal(root) {
  if (!root || root.dataset.tabsReady === '1') return;
  const buttons = Array.from(root.querySelectorAll('[data-tab-target]'));
  const panels = Array.from(root.querySelectorAll('[data-tab-panel]'));
  const shell = root.classList.contains('tabs-shell') ? root : root.closest('.tabs-shell');
  const sheet = shell ? shell.querySelector('.tabs-sheet') : null;
  const tabRow = shell ? shell.querySelector('.folder-tabs') : null;
  if (!buttons.length || !panels.length || !shell || !sheet || !tabRow) return;
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
  root.dataset.tabsReady = '1';
  ensurePanelLabels();
  refreshTabsLayout();
  window.setTimeout(refreshTabsLayout, 80);
  window.setTimeout(refreshTabsLayout, 220);
  if (document.fonts && typeof document.fonts.ready?.then === 'function') {
    document.fonts.ready.then(refreshTabsLayout).catch(() => {});
  }
}

function bindAlgorithmGridLayout(grid, observersStore) {
  const getCardMin = () => {
    if (window.CARDS && typeof window.CARDS.getCardSizing === 'function') {
      const sizing = window.CARDS.getCardSizing();
      if (Number.isFinite(sizing?.minPx)) return sizing.minPx;
    }
    return Math.max(1, Math.round(grid.clientWidth || 1));
  };
  const getGap = () => {
    const styles = getComputedStyle(grid);
    const rawGap = styles.columnGap || styles.gap || '0';
    const parsed = Number.parseFloat(rawGap);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const updateColumns = () => {
    const width = grid.clientWidth || grid.getBoundingClientRect().width || 0;
    if (!width) return;
    const cardMin = getCardMin();
    const gap = getGap();
    const columns = Math.max(1, Math.floor((width + gap) / (cardMin + gap)));
    if (grid.dataset.columnsApplied === String(columns)) return;
    grid.dataset.columnsApplied = String(columns);
    grid.style.setProperty('display', 'grid');
    grid.style.setProperty('width', '100%');
    grid.style.setProperty('grid-template-columns', `repeat(${columns}, minmax(0, 1fr))`, 'important');
  };

  updateColumns();
  let raf = 0;
  const scheduleUpdate = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      updateColumns();
    });
  };
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => scheduleUpdate());
    observer.observe(grid);
    if (Array.isArray(observersStore)) observersStore.push(observer);
  } else {
    window.addEventListener('resize', scheduleUpdate, { passive: true });
  }
}

function scrollToGroupHash() {
  const hash = String(window.location.hash || '').trim();
  if (!hash.startsWith('#group-')) return;
  const fragment = hash.slice(1);
  const parts = fragment.split('&').filter(Boolean);
  const targetId = parts[0];
  const offsetPart = parts.find((part) => part.toLowerCase().startsWith('offset='));
  const offsetValue = offsetPart ? Number.parseInt(offsetPart.split('=')[1], 10) : 0;
  const offset = Number.isFinite(offsetValue) ? offsetValue : 0;

  const tryScroll = (attemptsLeft) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (offset !== 0) {
        window.setTimeout(() => {
          window.scrollBy({ top: offset, left: 0, behavior: 'auto' });
        }, 280);
      }
      return;
    }
    if (attemptsLeft > 0) {
      window.setTimeout(() => tryScroll(attemptsLeft - 1), 50);
    }
  };

  tryScroll(20);
}

function sortByTitle(a, b) {
  const activeA = a.isActive !== false;
  const activeB = b.isActive !== false;
  if (activeA !== activeB) {
    return activeA ? -1 : 1;
  }
  const nameA = String(a.title || '').toLowerCase();
  const nameB = String(b.title || '').toLowerCase();
  return nameA.localeCompare(nameB);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function groupByMacro(items) {
  const groups = new Map();
  items.forEach((item) => {
    const key = (item.macroGroup || 'algoritmo').toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  });

  const order = ['statistici', 'logici', 'statistica', 'neurale', 'ibrido', 'custom', 'algoritmo', 'storico'];
  const labels = {
    statistici: 'Statistici',
    logici: 'Logici',
    statistica: 'Statistici / Logici',
    neurale: 'Reti neurali',
    ibrido: 'Ibridi / Custom',
    custom: 'Custom',
    algoritmo: 'Algoritmi',
    storico: 'Storico'
  };

  const sorted = Array.from(groups.entries()).map(([key, list]) => ({
    key,
    label: labels[key] || key.replace(/(^\w|\s\w)/g, (m) => m.toUpperCase()),
    items: list.sort(sortByTitle)
  }));

  sorted.sort((a, b) => {
    const ia = order.indexOf(a.key);
    const ib = order.indexOf(b.key);
    if (ia === -1 && ib === -1) return a.label.localeCompare(b.label);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return sorted;
}

window.CC_ALGORITHMS_RUNTIME = {
  mount: mountAlgorithmsPage,
  loadAlgorithms,
  loadSpotlightCards
};

