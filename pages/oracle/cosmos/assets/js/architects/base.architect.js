(() => {
  if (window.CC_ARCHITECT_BASE) return;

  const noop = () => {};

  const ensureNode = (selector) => document.querySelector(selector);

  const mountCardList = async (ctx, host, cards, options = {}) => {
    if (!host) return;

    const list = Array.isArray(cards) ? cards : [];
    const chunked = options.chunked === true;
    const chunkSize = Math.max(1, Number(options.chunkSize) || 4);
    const initialLimit = Number.isFinite(options.initialLimit) ? Math.max(0, Number(options.initialLimit)) : null;
    const deferRestMs = Math.max(0, Number(options.deferRestMs) || 0);
    const renderRestInIdle = options.renderRestInIdle === true;
    const deferDepth = options.deferDepth === true;

    host.__ccMountSeq = (host.__ccMountSeq || 0) + 1;
    const seq = host.__ccMountSeq;
    const isCurrent = () => host.__ccMountSeq === seq;

    const buildNode = async (card) => {
      if (window.CARDS && typeof window.CARDS.buildAlgorithmCard === 'function') {
        return window.CARDS.buildAlgorithmCard(card, options);
      }
      const fallback = document.createElement('a');
      fallback.className = 'cc-card cc-card-action algorithm-card';
      fallback.href = ctx.resolveWithBase(card.page || '#');
      fallback.textContent = card.title || card.id || 'Card';
      return fallback;
    };

    const runIdle = (fn) => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(fn, { timeout: 3000 });
        return;
      }
      window.setTimeout(fn, 0);
    };

    const renderList = async (items, replace = false) => {
      if (!isCurrent()) return;
      if (!items.length) {
        if (replace) host.innerHTML = '';
        return;
      }

      if (!chunked) {
        const built = [];
        for (const card of items) {
          if (!isCurrent()) return;
          built.push(await buildNode(card));
        }
        if (!isCurrent()) return;
        if (replace) {
          host.replaceChildren(...built);
        } else {
          built.forEach((node) => host.appendChild(node));
        }
        return;
      }

      if (replace) host.innerHTML = '';
      for (let i = 0; i < items.length; i += chunkSize) {
        if (!isCurrent()) return;
        const frag = document.createDocumentFragment();
        for (let j = i; j < Math.min(i + chunkSize, items.length); j += 1) {
          frag.appendChild(await buildNode(items[j]));
        }
        if (!isCurrent()) return;
        host.appendChild(frag);
        if (i + chunkSize < items.length) {
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      }
    };

    const applyDepth = () => {
      if (!isCurrent()) return;
      if (window.CARDS && typeof window.CARDS.enableDepth === 'function') {
        window.CARDS.enableDepth(host);
      }
    };

    if (initialLimit === null) {
      await renderList(list, true);
      if (!deferDepth) applyDepth();
      else window.setTimeout(applyDepth, deferRestMs);
      return;
    }

    const first = list.slice(0, initialLimit);
    const rest = list.slice(initialLimit);

    await renderList(first, true);

    const renderRest = async () => {
      await renderList(rest, false);
      applyDepth();
    };

    if (!rest.length) {
      if (!deferDepth) applyDepth();
      else window.setTimeout(applyDepth, deferRestMs);
      return;
    }

    const scheduleRest = () => {
      if (deferRestMs > 0) {
        window.setTimeout(() => {
          if (renderRestInIdle) runIdle(() => renderRest());
          else renderRest();
        }, deferRestMs);
        return;
      }
      if (renderRestInIdle) runIdle(() => renderRest());
      else window.setTimeout(() => renderRest(), 0);
    };

    scheduleRest();
  };

  window.CC_ARCHITECT_BASE = {
    noop,
    ensureNode,
    mountCardList
  };
})();
