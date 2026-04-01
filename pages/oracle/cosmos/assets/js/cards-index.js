(() => {
  const BASE = window.CC_BASE || createBase();
  const JSON_CACHE = new Map();
  if (!window.CC_BASE) {
    window.CC_BASE = BASE;
  }

  const CARDS_INDEX = {
    async load(cardsIndexPath) {
      const aggregatePath = resolveAggregateIndexPath(cardsIndexPath);
      if (aggregatePath) {
        const aggregate = await fetchJson(resolveWithBase(aggregatePath), { cache: 'no-store' }, true);
        if (Array.isArray(aggregate) && aggregate.length) {
          return aggregate
            .map((card) => normalizeCard(card))
            .filter(Boolean);
        }
      }
      const manifestPath = resolveWithBase(resolveManifestPath(cardsIndexPath));
      const manifest = await fetchJson(manifestPath, { cache: 'no-store' }, true);
      if (Array.isArray(manifest) && manifest.length) {
        return buildFromManifest(manifest);
      }
      const fallback = await fetchJson(resolveWithBase(cardsIndexPath), { cache: 'no-store' }, false);
      if (!Array.isArray(fallback)) return [];
      return fallback
        .map((card) => normalizeCard(card))
        .filter(Boolean);
    },
    filter(cards, options = {}) {
      const list = Array.isArray(cards) ? cards : [];
      return list.filter((card) => matchesCardContext(card, options));
    },
    matches(card, options = {}) {
      return matchesCardContext(card, options);
    },
    hasNews(card) {
      return hasNewsBadge(card);
    },
    hasHits(card) {
      return hasHitsBadge(card);
    },
    getHitCount(card) {
      return getHitCount(card);
    }
  };

  window.CARDS_INDEX = CARDS_INDEX;

  async function buildFromManifest(entries) {
    const cards = await Promise.all(
      entries.map((entry) => fetchCard(entry))
    );
    return cards
      .filter(Boolean)
      .sort((a, b) => {
        const activeA = a.isActive !== false;
        const activeB = b.isActive !== false;
        if (activeA !== activeB) return activeA ? -1 : 1;
        return String(a.title || '').toLowerCase().localeCompare(String(b.title || '').toLowerCase());
      });
  }

  async function fetchCard(entry) {
    if (typeof entry !== 'string') return null;
    const normalizedEntry = normalizePath(entry);
    const cardUrl = resolveWithBase(normalizedEntry);
    const data = await fetchJson(cardUrl, { cache: 'no-store' }, true);
    if (!data || typeof data !== 'object') return null;

    const cardBase = normalizedEntry.replace(/card\.json$/i, '');
    const id = data.id || inferId(cardBase);
    return normalizeCard(data, { id, cardBase });
  }

  function normalizeCard(data, defaults = {}) {
    if (!data || typeof data !== 'object') return null;
    const card = { ...data };

    const id = card.id || defaults.id || inferId(card.cardBase || defaults.cardBase || '');
    if (!card.id) card.id = id;
    if (!card.cardBase && defaults.cardBase) card.cardBase = defaults.cardBase;
    if (!card.page) card.page = card.cardBase || defaults.cardBase || '';
    if (!card.image) card.image = 'img.webp';
    if (card.isActive === undefined) card.isActive = false;
    if (card.view === undefined) {
      card.view = (card.isActive !== undefined) ? Boolean(card.isActive) : true;
    } else {
      card.view = Boolean(card.view);
    }
    if (!card.title) card.title = card.id || id;
    if (card.no_data_show === undefined) card.no_data_show = true;
    const tierRaw = String(card.accessTier ?? 'off').trim().toLowerCase();
    card.accessTier = ['off', 'free', 'premium', 'gold'].includes(tierRaw) ? tierRaw : 'off';

    return card;
  }

  function resolveManifestPath(cardsIndexPath) {
    if (typeof cardsIndexPath !== 'string' || !cardsIndexPath.trim()) {
      return 'data/modules-manifest.json';
    }
    return cardsIndexPath;
  }

  function resolveAggregateIndexPath(cardsIndexPath) {
    const manifestPath = resolveManifestPath(cardsIndexPath);
    const value = String(manifestPath || '').trim();
    if (!/modules-manifest\.json$/i.test(value)) return '';
    return value.replace(/modules-manifest\.json$/i, 'cards-index.json');
  }

  function inferId(cardBase) {
    const trimmed = cardBase.replace(/\/+$/, '');
    const parts = trimmed.split('/');
    return parts[parts.length - 1] || '';
  }

  function normalizePath(value) {
    return String(value || '').replace(/\\/g, '/');
  }

  function matchesCardContext(card, options = {}) {
    if (!card || typeof card !== 'object') return false;
    const context = String(options.context || '').trim().toLowerCase();
    const requireView = options.requireView !== false;
    const includeInactive = options.includeInactive === true;

    if (requireView && card.view !== true) return false;

    const active = card.isActive !== false;
    const hasNews = hasNewsBadge(card);
    const hasHits = hasHitsBadge(card);
    const page = String(card.page || '').toLowerCase();

    if (!includeInactive && card.isActive === false) {
      if (context !== 'coming_soon') return false;
    }

    switch (context) {
      case '':
      case 'all':
        return true;
      case 'active':
        return active;
      case 'inactive':
      case 'coming_soon':
        return card.isActive === false;
      case 'news':
        return active && hasNews;
      case 'hits':
        return active && hasHits;
      case 'news_or_hits':
      case 'feed':
      case 'home_news':
        return active && (hasNews || hasHits);
      case 'algorithms':
        return page.includes('/pages/algoritmi/algs/') || page.includes('/algoritmi/algs/');
      case 'active_algorithms':
        return active && (page.includes('/pages/algoritmi/algs/') || page.includes('/algoritmi/algs/'));
      default:
        return true;
    }
  }

  function hasNewsBadge(card) {
    return Boolean(card?.hasNews || card?.featured || (Array.isArray(card?.news) && card.news.length > 0));
  }

  function getHitCount(card) {
    const raw = Number.parseInt(String(card?.hits?.count ?? ''), 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }

  function hasHitsBadge(card) {
    return Boolean(card?.hits?.enabled === true) && getHitCount(card) > 0;
  }

  function resolveWithBase(path) {
    if (!path) return path;
    const value = String(path);
    if (value.startsWith('#') || /^https?:\/\//i.test(value) || value.startsWith('file:')) {
      return value;
    }
    const trimmed = value.startsWith('/') ? value.slice(1) : value.replace(/^\.\//, '');
    return new URL(trimmed, BASE.url).toString();
  }

  function createBase() {
    const path = window.location.pathname.replace(/\\/g, '/');
    const marker = '/pages/';
    const index = path.toLowerCase().indexOf(marker);
    const basePath = index !== -1
      ? path.slice(0, index + 1)
      : path.replace(/\/[^\/]*$/, '/');
    const baseUrl = new URL(basePath, window.location.href);
    return {
      path: basePath,
      url: baseUrl,
      resolve: (value) => resolveWithBase(value)
    };
  }

  async function fetchJson(url, options, silent) {
    if (JSON_CACHE.has(url)) {
      return JSON_CACHE.get(url);
    }
    const loadPromise = (async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        if (silent) return null;
        throw new Error(`status ${response.status}`);
      }
      return response.json();
    })();
    JSON_CACHE.set(url, loadPromise);
    try {
      return await loadPromise;
    } catch (error) {
      JSON_CACHE.delete(url);
      if (silent) return null;
      throw error;
    }
  }
})();
