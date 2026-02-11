(() => {
  if (window.CC_COMPONENTS) return;

  const registry = new Map();

  const normalizeCardMedia = (root, config = {}) => {
    if (!root) return;
    const mediaRatio = String(config.mediaRatio || '15 / 8');
    const mediaScaleRaw = Number.parseFloat(String(config.mediaScale ?? root.dataset?.mediaScale ?? '1'));
    const mediaScale = Number.isFinite(mediaScaleRaw) && mediaScaleRaw > 0 ? mediaScaleRaw : 1;
    const mediaNodes = root.querySelectorAll('.cc-card-media, .cc-card-media-frame, .algorithm-card__media, .algorithm-card__media--third');
    mediaNodes.forEach((media) => {
      if (!(media instanceof HTMLElement)) return;
      media.classList.add('cc-card-media-frame');
      media.style.position = 'relative';
      media.style.width = '100%';
      media.style.aspectRatio = mediaRatio;
      media.style.flex = '0 0 auto';
      media.style.minHeight = '0';
      media.style.maxHeight = 'none';
      media.style.overflow = 'hidden';

      const images = media.querySelectorAll('img');
      images.forEach((img) => {
        if (!(img instanceof HTMLElement)) return;
        img.style.position = 'absolute';
        img.style.inset = '0';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.objectPosition = 'center';
        img.style.display = 'block';
        img.style.transform = mediaScale === 1 ? '' : `scale(${mediaScale.toFixed(3)})`;
        img.style.transformOrigin = 'center center';
      });
    });
  };

  const createElement = (spec = {}) => {
    const tag = String(spec.tag || 'div').toLowerCase();
    const el = document.createElement(tag);
    if (spec.className) el.className = String(spec.className);
    if (spec.text) el.textContent = String(spec.text);
    if (spec.html) el.innerHTML = String(spec.html);

    if (spec.attrs && typeof spec.attrs === 'object') {
      Object.entries(spec.attrs).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        el.setAttribute(key, String(value));
      });
    }

    if (spec.dataset && typeof spec.dataset === 'object') {
      Object.entries(spec.dataset).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        el.dataset[key] = String(value);
      });
    }

    if (spec.style && typeof spec.style === 'object') {
      Object.entries(spec.style).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        el.style[key] = String(value);
      });
    }

    if (Array.isArray(spec.children)) {
      spec.children.forEach((child) => {
        if (!child) return;
        if (child instanceof Node) {
          el.appendChild(child);
          return;
        }
        if (typeof child === 'string') {
          const span = document.createElement('span');
          span.textContent = child;
          el.appendChild(span);
          return;
        }
        if (typeof child === 'object') {
          el.appendChild(createElement(child));
        }
      });
    }

    return el;
  };

  registry.set('card', (config = {}) => {
    const root = createElement({
      tag: config.tag || 'article',
      className: config.className || 'cc-card',
      attrs: config.attrs,
      dataset: config.dataset,
      style: config.style
    });

    if (config.href && root.tagName.toLowerCase() === 'a') {
      root.href = String(config.href);
    }

    const slots = config.slots || {};
    ['overlay', 'media', 'header', 'body', 'footer'].forEach((slotName) => {
      const slot = slots[slotName];
      if (!slot) return;
      if (slot instanceof Node) {
        root.appendChild(slot);
        return;
      }
      if (typeof slot === 'string') {
        const block = document.createElement('div');
        block.innerHTML = slot;
        while (block.firstChild) root.appendChild(block.firstChild);
        return;
      }
      if (typeof slot === 'object') {
        root.appendChild(createElement(slot));
      }
    });

    root.dataset.ccCardRoot = root.dataset.ccCardRoot || '1';
    normalizeCardMedia(root, config);

    return root;
  });

  registry.set('sheet', (config = {}) => createElement({
    tag: config.tag || 'section',
    className: config.className || 'cc-sheet',
    attrs: config.attrs,
    dataset: config.dataset,
    style: config.style,
    html: config.html,
    children: config.children
  }));

  registry.set('collector', (config = {}) => {
    const root = createElement({
      tag: config.tag || 'section',
      className: config.className || 'cc-collector',
      attrs: config.attrs,
      dataset: config.dataset,
      style: config.style
    });

    if (config.title) {
      root.appendChild(createElement({
        tag: config.titleTag || 'h2',
        className: config.titleClass || 'cc-collector__title',
        text: config.title
      }));
    }

    if (config.subtitle) {
      root.appendChild(createElement({
        tag: 'p',
        className: config.subtitleClass || 'cc-collector__subtitle',
        text: config.subtitle
      }));
    }

    const itemsWrap = createElement({
      tag: config.itemsTag || 'div',
      className: config.itemsClass || 'cc-collector__items'
    });

    (config.items || []).forEach((item) => {
      if (!item) return;
      if (item instanceof Node) itemsWrap.appendChild(item);
      else itemsWrap.appendChild(createElement(item));
    });

    root.appendChild(itemsWrap);
    return root;
  });

  const api = {
    register(type, factory) {
      if (!type || typeof factory !== 'function') return false;
      registry.set(String(type), factory);
      return true;
    },
    build(type, config) {
      const factory = registry.get(String(type));
      if (!factory) return null;
      return factory(config || {});
    },
    has(type) {
      return registry.has(String(type));
    },
    createElement
  };

  window.CC_COMPONENTS = api;
})();
