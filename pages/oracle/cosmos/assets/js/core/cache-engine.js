(() => {
  const CACHE_PREFIX = 'cc_v2_cache';

  const stableStringify = (value) => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((x) => stableStringify(x)).join(',')}]`;
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  };

  const simpleHash = (input) => {
    const str = String(input || '');
    let hash = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16);
  };

  const keyForPage = (pageId) => `${CACHE_PREFIX}:${String(pageId || 'unknown')}`;

  const read = (pageId) => {
    try {
      const raw = localStorage.getItem(keyForPage(pageId));
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  };

  const write = (pageId, payload) => {
    try {
      localStorage.setItem(keyForPage(pageId), JSON.stringify(payload));
    } catch (_) {
      // ignore
    }
  };

  const computeSignature = ({ layout, data }) => {
    const layoutHash = simpleHash(stableStringify(layout || {}));
    const dataHash = simpleHash(stableStringify(data || {}));
    return {
      layout_hash: layoutHash,
      data_hash: dataHash,
      combined_hash: simpleHash(`${layoutHash}:${dataHash}`)
    };
  };

  window.CC_CACHE_ENGINE = {
    read,
    write,
    computeSignature,
    stableStringify,
    simpleHash
  };
})();
