(() => {
  if (window.CC_DATA_REPOSITORY) return;

  const jsonCache = new Map();

  const resolveWithBase = (path) => {
    if (!path) return path;
    const value = String(path);
    if (value.startsWith('#') || /^https?:\/\//i.test(value) || value.startsWith('file:')) return value;
    const base = window.CC_BASE?.url;
    if (!base) return value;
    const trimmed = value.startsWith('/') ? value.slice(1) : value.replace(/^\.\//, '');
    return new URL(trimmed, base).toString();
  };

  const fetchJson = async (path, options = {}) => {
    const url = resolveWithBase(path);
    if (!url) return null;
    const cacheKey = `${url}|${options.cache || 'default'}`;
    if (jsonCache.has(cacheKey)) return jsonCache.get(cacheKey);
    const promise = (async () => {
      const res = await fetch(url, { cache: options.cache || 'no-store' });
      if (!res.ok) throw new Error(`json_fetch_failed:${res.status}:${url}`);
      return res.json();
    })();
    jsonCache.set(cacheKey, promise);
    try {
      return await promise;
    } catch (error) {
      jsonCache.delete(cacheKey);
      throw error;
    }
  };

  const loadCardsByManifest = async (manifestPath) => {
    const entries = await fetchJson(manifestPath, { cache: 'no-store' });
    if (!Array.isArray(entries)) return [];
    if (window.CARDS_INDEX && typeof window.CARDS_INDEX.load === 'function') {
      return window.CARDS_INDEX.load(manifestPath);
    }
    const out = [];
    for (const entry of entries) {
      if (typeof entry !== 'string') continue;
      try {
        const card = await fetchJson(entry, { cache: 'no-store' });
        if (card && typeof card === 'object') out.push(card);
      } catch (_) {
        // skip invalid card
      }
    }
    return out;
  };

  window.CC_DATA_REPOSITORY = {
    fetchJson,
    loadCardsByManifest,
    resolveWithBase
  };
})();
