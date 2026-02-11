(() => {
  if (window.CC_ARCHITECT_BASE) return;

  const noop = () => {};

  const ensureNode = (selector) => document.querySelector(selector);

  const mountCardList = async (ctx, host, cards, options = {}) => {
    if (!host) return;
    host.innerHTML = '';
    const built = [];
    for (const card of cards) {
      if (window.CARDS && typeof window.CARDS.buildAlgorithmCard === 'function') {
        const node = await window.CARDS.buildAlgorithmCard(card, options);
        built.push(node);
      } else {
        const fallback = document.createElement('a');
        fallback.className = 'cc-card cc-card-action algorithm-card';
        fallback.href = ctx.resolveWithBase(card.page || '#');
        fallback.textContent = card.title || card.id || 'Card';
        built.push(fallback);
      }
    }
    built.forEach((node) => host.appendChild(node));
    if (window.CARDS && typeof window.CARDS.enableDepth === 'function') {
      window.CARDS.enableDepth(host);
    }
  };

  window.CC_ARCHITECT_BASE = {
    noop,
    ensureNode,
    mountCardList
  };
})();
