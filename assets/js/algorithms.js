const cardsIndexPath = 'data/cards-index.json';

document.addEventListener('DOMContentLoaded', () => {
  const area = document.querySelector('[data-algorithms-area]');
  const counter = document.querySelector('[data-algorithms-count]');
  if (!area) return;
  loadAlgorithms(area, counter);
});

async function loadAlgorithms(area, counter) {
  try {
    const cards = await loadCardsIndex(cardsIndexPath);
    const algorithms = cards.filter((card) => card.id && card.id !== 'storico-estrazioni');
    const grouped = groupByMacro(algorithms);
    renderAlgorithms(area, grouped);
    if (counter) {
      counter.textContent = `${algorithms.length} algoritmi`;
    }
  } catch (error) {
    area.innerHTML = '<div class="rounded-2xl border border-dashed border-white/15 bg-midnight/70 p-5 text-sm text-ash">Impossibile caricare gli algoritmi.</div>';
    if (counter) counter.textContent = '0 algoritmi';
  }
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

function renderAlgorithms(area, grouped) {
  area.innerHTML = '';
  const gridObservers = [];
  grouped.forEach((group) => {
    const section = document.createElement('section');
    section.className = 'mt-10';
    section.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neon/30 bg-neon/5 px-4 py-3 shadow-[0_0_18px_rgba(255,217,102,0.18)]">
        <div class="flex items-center gap-3">
          <span class="rounded-full border border-neon/40 bg-neon/15 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-neon">Macro area</span>
          <h2 class="text-xl font-semibold text-white">${group.label}</h2>
        </div>
        <p class="text-xs uppercase tracking-[0.2em] text-ash">Totale algoritmi: ${group.items.length}</p>
      </div>
      <div class="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" data-group-grid></div>
    `;
    const grid = section.querySelector('[data-group-grid]');
    group.items.forEach((algorithm) => {
      const card = document.createElement('a');
      const imageUrl = resolveCardImage(algorithm);
      const active = algorithm.isActive !== false;
      card.className = `card-3d algorithm-card group relative flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-white/10 transition hover:-translate-y-1 hover:border-neon/60${active ? ' is-active shadow-[0_0_22px_rgba(255,217,102,0.22)]' : ' bg-black/70 border-white/5 pointer-events-none'}`;
      card.href = active ? (algorithm.page || '#') : '#';
      const description = algorithm.subtitle || algorithm.narrativeSummary || 'Descrizione in arrivo';
      let lastText = '';
      let lastClass = 'text-[11px] text-ash';
      if (active) {
        if (algorithm.lastUpdated) {
          lastText = `Aggiornato ${algorithm.lastUpdated}`;
        } else {
          lastText = 'NO DATA';
          lastClass = 'text-[11px] uppercase tracking-[0.2em] text-red-400';
        }
      } else {
        lastText = algorithm.lastUpdated ? `Aggiornato ${algorithm.lastUpdated}` : '';
      }
      const safeLastText = lastText || '&nbsp;';
      card.innerHTML = `
        ${active ? '' : '<div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/45"><span class="select-none whitespace-nowrap text-[clamp(0.68rem,2.1vw,1.9rem)] font-semibold uppercase tracking-[clamp(0.16em,0.8vw,0.5em)] text-neon/60 rotate-[-60deg] [text-shadow:0_0_18px_rgba(255,217,102,0.65),0_0_32px_rgba(0,0,0,0.85)]">coming soon</span></div>'}
        <div class="algorithm-card__media relative overflow-hidden">
          <img class="h-full w-full object-cover" src="${imageUrl}" alt="Anteprima di ${algorithm.title}">
        </div>
        <div class="algorithm-card__body flex flex-1 flex-col gap-2 px-4 py-3">
          <span class="text-[10px] uppercase tracking-[0.25em] text-neon">${algorithm.macroGroup || 'algoritmo'}</span>
          <h3 class="text-base font-semibold leading-tight ${active ? 'group-hover:text-neon' : ''}">${algorithm.title || 'Algoritmo'}</h3>
          <p class="algorithm-card__desc text-xs text-ash">${description}</p>
          <div class="mt-auto ${lastClass}">${safeLastText}</div>
        </div>
      `;
      grid.appendChild(card);
    });
    area.appendChild(section);

    if (grid) {
      const getCardMin = () => {
        const raw = getComputedStyle(document.documentElement).getPropertyValue('--card-min');
        const parsed = Number.parseFloat(raw);
        return Number.isFinite(parsed) ? parsed : 220;
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
        grid.style.setProperty('display', 'grid');
        grid.style.setProperty('width', '100%');
        grid.style.setProperty('grid-template-columns', `repeat(${columns}, minmax(0, 1fr))`, 'important');
      };
      updateColumns();
      if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(() => updateColumns());
        observer.observe(grid);
        gridObservers.push(observer);
      } else {
        window.addEventListener('resize', updateColumns);
      }
    }
  });
}

function sortByTitle(a, b) {
  const nameA = (a.title || '').toLowerCase();
  const nameB = (b.title || '').toLowerCase();
  return nameA.localeCompare(nameB);
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
    label: labels[key] || key.replace(/(^\\w|\\s\\w)/g, (m) => m.toUpperCase()),
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

function resolveCardImage(card) {
  const fallback = '../../img/headerControlChaos3.webp';
  const imageValue = (card.image || '').trim();
  if (!imageValue) return fallback;
  if (imageValue.startsWith('http://') || imageValue.startsWith('https://') || imageValue.startsWith('/')) {
    return appendCacheBuster(imageValue, card.imageVersion);
  }
  if (card.cardBase) {
    return appendCacheBuster(`../../${card.cardBase}${imageValue}`, card.imageVersion);
  }
  if (card.page) {
    return appendCacheBuster(`../../${card.page}${imageValue}`, card.imageVersion);
  }
  return appendCacheBuster(imageValue, card.imageVersion);
}

function appendCacheBuster(url, version) {
  if (!version) return url;
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}v=${version}`;
}
