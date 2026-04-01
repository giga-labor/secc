const cardsIndexPath = 'data/modules-manifest.json';

document.addEventListener('DOMContentLoaded', () => {
  const area = document.querySelector('[data-module-area]');
  const section = document.querySelector('[data-module-section]');
  if (!area) return;
  loadModules(area, section);
});

async function loadModules(area, section) {
  try {
    const cards = await loadCardsIndex(cardsIndexPath);
    const newsCards = (window.CARDS_INDEX && typeof window.CARDS_INDEX.filter === 'function')
      ? window.CARDS_INDEX.filter(cards, { context: 'home_news' })
      : cards.filter((card) => card?.view === true && isNewsFeedEligibleCard(card));
    if (!newsCards.length) {
      renderNoNews(area, cards.length);
      if (section) section.classList.remove('hidden');
      return;
    }

    newsCards.sort((a, b) => String(b.lastUpdated || '').localeCompare(String(a.lastUpdated || '')));
    await renderNewsCards(area, newsCards);
    applyNewsLayout(area);
    applyCardEffects(area);
    if (section) section.classList.remove('hidden');
  } catch (error) {
    area.innerHTML = `<div class="rounded-2xl border border-dashed border-rose-300/40 bg-rose-300/10 px-5 py-6 text-sm text-rose-100">Errore caricamento elenco news: ${escapeHtml(error?.message || 'errore sconosciuto')}</div>`;
    if (section) section.classList.remove('hidden');
  }
}

async function loadCardsIndex(path) {
  if (window.CARDS_INDEX && typeof window.CARDS_INDEX.load === 'function') {
    return window.CARDS_INDEX.load(path);
  }

  const manifestRes = await fetch(resolveWithBase(path), { cache: 'no-store' });
  if (!manifestRes.ok) throw new Error(`manifest ${manifestRes.status}`);
  const manifest = await manifestRes.json();
  if (!Array.isArray(manifest)) return [];

  const cards = await Promise.all(
    manifest.map(async (entry) => {
      if (typeof entry !== 'string') return null;
      try {
        const normalizedEntry = String(entry).replace(/\\/g, '/');
        const response = await fetch(resolveWithBase(normalizedEntry), { cache: 'no-store' });
        if (!response.ok) return null;
        const card = await response.json();
        if (!card || typeof card !== 'object') return null;
        if (!card.cardBase) card.cardBase = normalizedEntry.replace(/card\.json$/i, '');
        if (!card.page) card.page = card.cardBase;
        if (!card.image) card.image = 'img.webp';
        if (card.no_data_show === undefined) card.no_data_show = true;
        return card;
      } catch {
        return null;
      }
    })
  );

  return cards.filter(Boolean);
}

async function renderNewsCards(area, modules) {
  area.innerHTML = '';
  const built = await Promise.all(
    modules.map((module, index) => createNewsCard(module, index))
  );
  built.filter(Boolean).forEach((card) => area.appendChild(card));
}

async function createNewsCard(module, index = -1) {
  if (!module || module.view !== true) return null;
  const tuneCardMedia = (card) => {
    const image = card?.querySelector?.('img');
    if (!image) return card;
    if (!image.getAttribute('decoding')) image.setAttribute('decoding', 'async');
    if (index === 0) {
      image.setAttribute('loading', 'eager');
      image.setAttribute('fetchpriority', 'high');
    } else if (!image.getAttribute('loading')) {
      image.setAttribute('loading', 'lazy');
      image.setAttribute('fetchpriority', 'low');
    }
    return card;
  };
  if (window.CARDS && typeof window.CARDS.buildAlgorithmCard === 'function') {
    const card = await window.CARDS.buildAlgorithmCard(module, { forceActive: false });
    if (card) return tuneCardMedia(card);
    return null;
  }
  const fallback = buildFallbackCard(module);
  return tuneCardMedia(fallback);
}

function buildFallbackCard(module) {
  const active = module?.isActive !== false;
  const href = active ? (resolveWithBase(module.page || '#') || '#') : '#';
  const title = module.title || 'Modulo';
  const overlayHtml = active ? '' : '<div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/45"><span class="select-none whitespace-nowrap text-[clamp(0.68rem,2.1vw,1.9rem)] font-semibold uppercase tracking-[clamp(0.16em,0.8vw,0.5em)] text-neon/60 rotate-[-60deg] [text-shadow:0_0_18px_rgba(255,217,102,0.65),0_0_32px_rgba(0,0,0,0.85)]">coming soon</span></div>';
  const builder = window.CC_COMPONENTS;
  if (builder && typeof builder.build === 'function' && builder.has('card')) {
    const built = builder.build('card', {
      tag: 'a',
      className: `cc-card cc-card-action card-3d algorithm-card${active ? ' is-active' : ' is-inactive bg-black/70 border-white/5'}`,
      href,
      dataset: {
        cardId: String(module.id || title).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        cardType: 'action'
      },
      slots: {
        overlay: overlayHtml,
        body: `<div class=\"cc-card-body algorithm-card__body flex flex-1 flex-col gap-2 px-4 py-4\"><h3 class=\"text-[0.98rem] font-semibold leading-tight\">${escapeHtml(title)}</h3></div>`
      }
    });
    if (built) {
      if (!active) {
        built.setAttribute('aria-disabled', 'true');
        built.setAttribute('tabindex', '-1');
        built.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
      }
      return built;
    }
  }
  const fallback = document.createElement('a');
  fallback.className = `cc-card cc-card-action card-3d algorithm-card${active ? ' is-active' : ' is-inactive bg-black/70 border-white/5'}`;
  fallback.href = href;
  fallback.innerHTML = `${active ? '' : overlayHtml}<span>${escapeHtml(title)}</span>`;
  if (!active) {
    fallback.setAttribute('aria-disabled', 'true');
    fallback.setAttribute('tabindex', '-1');
    fallback.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  }
  return fallback;
}

function renderNoNews(area, totalCards) {
  area.innerHTML = `
    <div class="rounded-2xl border border-dashed border-white/15 bg-midnight/40 px-5 py-6 text-sm text-ash">
      Nessuna card con news attiva.
      <div class="mt-2 text-xs text-white/70">Totale card lette: ${totalCards} | News trovate: 0</div>
    </div>
  `;
}

function applyNewsLayout(area) {
  const sizing = getCardSizing();
  area.classList.remove('news-strip');
  area.classList.add('news-grid');
  area.style.display = 'grid';
  if (sizing) {
    area.style.gridTemplateColumns = `repeat(auto-fit, minmax(${sizing.min}, ${sizing.max}))`;
  } else {
    area.style.gridTemplateColumns = 'repeat(auto-fit, minmax(0, 1fr))';
  }
  area.style.gap = '1rem';
  area.style.justifyContent = 'start';
  area.style.alignItems = 'start';
}

function getCardSizing() {
  if (window.CARDS && typeof window.CARDS.getCardSizing === 'function') {
    return window.CARDS.getCardSizing();
  }
  return null;
}

function applyCardEffects(area) {
  try {
    if (window.CARDS && typeof window.CARDS.applyFeatures === 'function') {
      window.CARDS.applyFeatures(area);
    }
    if (window.CARDS && typeof window.CARDS.enableDepth === 'function') {
      window.CARDS.enableDepth(area);
    }
  } catch {
    // Rendering remains valid even if visual effects fail.
  }
}

function isNewsFeedEligibleCard(module) {
  if (module?.isActive === false) return false;
  return hasNews(module) || hasHits(module);
}

function hasNews(module) {
  return Boolean(module?.hasNews || module?.featured || (Array.isArray(module?.news) && module.news.length > 0));
}

function isComingSoon(module) {
  return module?.isActive === false;
}

function hasHits(module) {
  const hitsEnabled = module?.hits?.enabled === true;
  const hitCountRaw = Number.parseInt(String(module?.hits?.count ?? ''), 10);
  const hitCount = Number.isFinite(hitCountRaw) && hitCountRaw > 0 ? hitCountRaw : 0;
  return hitsEnabled && hitCount > 0;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
