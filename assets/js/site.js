const cardsIndexPath = 'data/cards-index.json';

document.addEventListener('DOMContentLoaded', () => {
  const area = document.querySelector('[data-module-area]');
  const section = document.querySelector('[data-module-section]');
  if (!area) return;

  loadModules(area, section);
});

async function loadModules(area, section) {
  try {
    const cards = await loadCardsIndex(cardsIndexPath);
    const newsModules = cards.filter((module) => isActive(module) && hasNews(module));
    if (!newsModules.length) {
      if (section) section.classList.add('hidden');
      area.innerHTML = '';
      return;
    }
    newsModules.sort(sortByLastUpdated);
    renderModules(area, newsModules);
    setupCarousel(area, section);
    if (window.CARDS && typeof window.CARDS.applyFeatures === 'function') {
      window.CARDS.applyFeatures(area);
    }
  } catch (error) {
    area.innerHTML = '';
  }
}

async function loadCardsIndex(path) {
  if (window.CARDS_INDEX && typeof window.CARDS_INDEX.load === 'function') {
    return window.CARDS_INDEX.load(path);
  }
  const resolved = resolveWithBase(path);
  const response = await fetch(resolved);
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
  const resolver = window.CC_BASE?.resolve;
  if (typeof resolver === 'function') {
    return resolver(value);
  }
  return value;
}

function renderModules(area, modules) {
  area.innerHTML = '';
  modules.forEach((module) => {
    const card = document.createElement('a');
    card.className = 'card-3d is-active flex min-h-[320px] w-[clamp(200px,22vw,230px)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/10 transition hover:-translate-y-2 hover:border-neon/60';
    card.dataset.cardId = module.id || '';
    card.href = module.page || '#';
    card.setAttribute('aria-label', `Apri ${module.title || 'modulo'}`);
    if (Array.isArray(module.features)) {
      card.dataset.features = module.features.join(',');
    } else if (typeof module.features === 'string') {
      card.dataset.features = module.features;
    }

    const imageUrl = resolveCardImage(module);
    const narrative = module.narrativeSummary || 'Modulo in evoluzione, presto la scheda completa.';
    const statusTag = module.statusTag || 'Pagina in allestimento';
    const noveltyTag = hasNews(module) ? 'Novità' : '';

    const imageStyle = resolveImageStyle(module);

    card.innerHTML = `
      <div class="relative h-28 overflow-hidden">
        <img class="h-full w-full saturate-110" style="${imageStyle}" src="${imageUrl}" alt="Anteprima di ${module.title}">
        ${noveltyTag ? `<span class="badge-novita absolute top-4 left-4 rounded-full border border-neon/80 bg-midnight/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-neon shadow-[0_0_14px_rgba(255,217,102,0.6)] [text-shadow:0_2px_6px_rgba(0,0,0,0.9)]"><span>Novità</span></span>` : ''}
        <span class="absolute bottom-4 right-4 rounded-full border border-neon bg-midnight/80 px-3 py-1 text-xs uppercase tracking-[0.15em] text-neon">${statusTag}</span>
      </div>
      <div class="flex flex-1 flex-col gap-3 px-5 py-4">
        <span class="text-xs uppercase tracking-[0.25em] text-neon">${module.macroGroup || 'statistica'}</span>
        <h3 class="text-base font-semibold">${module.title}</h3>
        ${module.subtitle ? `<p class="text-xs text-ash">${module.subtitle}</p>` : ''}
        <p class="text-xs text-white/80">${narrative}</p>
        <div class="mt-auto text-xs text-ash">
          <div class="card-updated-row">
            <span data-card-updated>${module.lastUpdated ? `Aggiornato ${module.lastUpdated}` : 'Ultimo aggiornamento in corso'}</span>
          </div>
          <div class="card-numbers" data-card-numbers hidden></div>
        </div>
      </div>
    `;

    area.appendChild(card);
  });
  updateCardAlignment(area, modules.length);
}

function hasNews(module) {
  return Boolean(module.hasNews || module.featured || (module.news && module.news.length));
}

function isActive(module) {
  return module.isActive !== false;
}

function resolveCardImage(module) {
  const fallback = 'img/headerControlChaos3.webp';
  const imageValue = (module.image || '').trim();
  if (!imageValue) return fallback;
  if (imageValue.startsWith('http://') || imageValue.startsWith('https://') || imageValue.startsWith('/')) {
    return appendCacheBuster(imageValue, module.imageVersion);
  }
  if (module.cardBase) {
    return appendCacheBuster(`${module.cardBase}${imageValue}`, module.imageVersion);
  }
  if (module.page) {
    return appendCacheBuster(`${module.page}${imageValue}`, module.imageVersion);
  }
  return appendCacheBuster(imageValue, module.imageVersion);
}

function resolveImageStyle(module) {
  const fit = normalizeFit(module.imageFit);
  const position = normalizePosition(module.imagePosition);
  return `object-fit:${fit};object-position:${position};`;
}

function normalizeFit(value) {
  const fit = String(value || '').trim().toLowerCase();
  if (fit === 'contain' || fit === 'cover' || fit === 'fill' || fit === 'none' || fit === 'scale-down') {
    return fit;
  }
  return 'cover';
}

function normalizePosition(value) {
  const pos = String(value || '').trim().toLowerCase();
  if (!pos) return 'center';
  const allowed = new Set([
    'center',
    'top',
    'bottom',
    'left',
    'right',
    'top left',
    'top center',
    'top right',
    'center left',
    'center right',
    'bottom left',
    'bottom center',
    'bottom right'
  ]);
  if (allowed.has(pos)) return pos;
  return 'center';
}

function appendCacheBuster(url, version) {
  if (!version) return url;
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}v=${version}`;
}


function sortByLastUpdated(a, b) {
  const dateA = parseIsoDate(a.lastUpdated);
  const dateB = parseIsoDate(b.lastUpdated);
  if (dateA === dateB) return 0;
  return dateB - dateA;
}

function parseIsoDate(value) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getTime();
}

function setupCarousel(area, section) {
  const prevButton = section?.querySelector('[data-module-prev]');
  const nextButton = section?.querySelector('[data-module-next]');
  if (!prevButton || !nextButton) return;

  const scrollAmount = () => {
    const card = area.querySelector('[data-card-id]') || area.firstElementChild;
    if (!card) return 280;
    return card.getBoundingClientRect().width + 16;
  };

  prevButton.addEventListener('click', () => {
    area.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
  });

  nextButton.addEventListener('click', () => {
    area.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
  });

  let autoScrollId = null;
  const startAutoScroll = () => {
    if (autoScrollId) return;
    autoScrollId = window.setInterval(() => {
      area.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
      if (area.scrollLeft + area.clientWidth >= area.scrollWidth - 8) {
        area.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }, 4500);
  };
  const stopAutoScroll = () => {
    if (autoScrollId) {
      window.clearInterval(autoScrollId);
      autoScrollId = null;
    }
  };

  area.addEventListener('mouseenter', stopAutoScroll);
  area.addEventListener('mouseleave', startAutoScroll);
  area.addEventListener('touchstart', stopAutoScroll, { passive: true });
  area.addEventListener('touchend', startAutoScroll, { passive: true });
  startAutoScroll();
}

function updateCardAlignment(area, count) {
  area.classList.remove('justify-center');
  if (count <= 2) {
    area.classList.add('justify-center');
  }
}
