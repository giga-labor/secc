const shuffle = (list) => {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const fetchLatestDraw = async () => {
  try {
    const response = await fetch(resolveWithBase('archives/draws/draws.csv'), { cache: 'no-store' });
    if (!response.ok) return '';
    const raw = await response.text();
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
    if (!lines.length) return '';
    const lastLine = lines[lines.length - 1];
    const delimiter = lastLine.includes(';') ? ';' : ',';
    const parts = lastLine.split(delimiter).map((cell) => cell.trim());
    return parts[0] || '';
  } catch (error) {
    return '';
  }
};

const buildFallbackItems = (latestDraw) => {
  const drawText = latestDraw ? `Ultima estrazione archiviata: ${latestDraw}` : 'Ultime estrazioni archiviate e consultabili';
  const base = [
    { label: 'SuperEnalotto Control Chaos', text: 'Laboratorio SuperEnalotto con moduli in evoluzione' },
    { label: 'Scopo', text: 'Analisi statistiche, logiche e narrative sui dati' },
    { label: 'Archivio', text: drawText, isDraw: true },
    { label: 'Trasparenza', text: 'Nessuna promessa di vincita, solo studio dei dati' },
    { label: 'Aggiornamenti', text: 'Moduli e card in allestimento continuo' }
  ];
  return shuffle(base);
};


const estimateChars = (text) => String(text || '').replace(/\s+/g, ' ').trim().length;

const buildSideScroller = (items) => {
  const track = document.createElement('div');
  track.className = 'ad-rail__track';
  const renderItem = (item) => {
    const el = document.createElement('a');
    el.className = 'ad-rail__item';
    el.href = item.href || '#';
    el.target = item.href ? '_blank' : '_self';
    el.rel = item.href ? 'noopener noreferrer' : '';
    const drawAttr = item.isDraw ? ' data-ad-draw="true"' : '';
    el.innerHTML = `
      <span class="ad-rail__logo">
        <img src="${item.logo || ''}" alt="${item.label || 'Sponsor'} logo">
      </span>
      <span class="ad-rail__meta">
        <span class="ad-rail__label">${item.label || 'Sponsor'}</span>
        <span class="ad-rail__text"${drawAttr}>${item.text || ''}</span>
      </span>
    `;
    return el;
  };
  items.forEach((item) => {
    track.appendChild(renderItem(item));
  });
  return track;
};

const buildBottomItem = (item) => {
  const el = document.createElement('a');
  el.className = 'ad-rail__item bottom-ad__item';
  el.href = item.href || '#';
  el.target = item.href ? '_blank' : '_self';
  el.rel = item.href ? 'noopener noreferrer' : '';
  const drawAttr = item.isDraw ? ' data-ad-draw="true"' : '';
  el.innerHTML = `
    <span class="ad-rail__logo">
      <img src="${item.logo || ''}" alt="${item.label || 'Sponsor'} logo">
    </span>
    <span class="ad-rail__meta">
      <span class="ad-rail__label">${item.label || 'Sponsor'}</span>
      <span class="ad-rail__text"${drawAttr}>${item.text || ''}</span>
    </span>
  `;
  return el;
};
const buildBottomMarker = () => {
  const el = document.createElement('span');
  el.className = 'bottom-ad__marker';
  el.setAttribute('aria-hidden', 'true');
  return el;
};


const updateDrawTexts = (latestDraw) => {
  if (!latestDraw) return;
  const text = `Ultima estrazione archiviata: ${latestDraw}`;
  document.querySelectorAll('[data-ad-draw="true"]').forEach((el) => {
    el.textContent = text;
  });
};

const ensureAds = () => {
  if (document.querySelector('[data-ad-rail="left"]')) return;
  const left = document.createElement('div');
  left.className = 'ad-rail ad-rail--left';
  left.dataset.adRail = 'left';
  left.innerHTML = '<div class="ad-rail__panel"></div>';
  left.style.display = 'block';
  left.style.zIndex = '9999';

  const right = document.createElement('div');
  right.className = 'ad-rail ad-rail--right';
  right.dataset.adRail = 'right';
  right.innerHTML = '<div class="ad-rail__panel"></div>';
  right.style.display = 'block';
  right.style.zIndex = '9999';

  const fallbackItems = buildFallbackItems('');
  const buildSideItems = (items) => items.map((item, index) => ({
    ...item,
    logo: index % 3 === 0
      ? resolveWithBase('img/headerControlChaos3.webp')
      : index % 3 === 1
        ? resolveWithBase('img/headerControlChaos.webp')
        : resolveWithBase('img/fortuna.webp'),
    href: ''
  }));
  const sideItemsLeft = buildSideItems(shuffle(fallbackItems));
  // Right rail continues the left sequence in reverse direction
  const sideItemsRight = buildSideItems(sideItemsLeft.map((item) => ({ ...item })));
  const bottomItems = sideItemsLeft.map((item) => ({ ...item }));
  const leftPanel = left.querySelector('.ad-rail__panel');
  const rightPanel = right.querySelector('.ad-rail__panel');

  const bottom = document.createElement('div');
  bottom.className = 'bottom-ad';
  bottom.dataset.bottomAd = 'true';
  const bottomPanel = document.createElement('div');
  bottomPanel.className = 'bottom-ad__panel';
  bottomPanel.id = 'bottomAdPanel';


  bottom.appendChild(bottomPanel);
  bottom.style.display = 'flex';
  bottom.style.zIndex = '9999';

  document.body.appendChild(left);
  document.body.appendChild(right);
  document.body.appendChild(bottom);

  const hint = document.createElement('a');
  hint.className = 'bottom-ad__hint';
  hint.href = '#catalogo';
  hint.setAttribute('aria-label', 'Scorri verso gli algoritmi');
  const hintLabel = getHintLabel();
  hint.innerHTML = `
    <span class="bottom-ad__hint-label">${hintLabel}</span>
    <span class="bottom-ad__hint-arrow">&darr;</span>
  `;
  bottom.appendChild(hint);
  hint.dataset.hint = 'algorithms';

  const buildSidePanel = (panel, items) => {
    if (!panel) return;
    panel.innerHTML = '';
    const viewport = document.createElement('div');
    viewport.className = 'ad-rail__viewport';
    const track = buildSideScroller(items);
    viewport.appendChild(track);
    panel.appendChild(viewport);

    const panelHeight = panel.getBoundingClientRect().height;
    let safety = 0;
    while (track.scrollHeight < panelHeight && safety < 8) {
      items.forEach((item) => {
        track.appendChild(buildSideScroller([item]).firstElementChild);
      });
      safety += 1;
    }
    const clone = track.cloneNode(true);
    viewport.appendChild(clone);

    const baseChars = estimateChars(track.textContent);
    const baseHeight = track.scrollHeight || panelHeight;
    const targetCharsPerSecond = 3.5;
    const minDuration = 90;
    const durationByChars = baseChars ? (baseChars / targetCharsPerSecond) : 60;
    const durationByPixels = baseHeight ? (baseHeight / 18) : 60;
    const duration = Math.max(minDuration, Math.min(220, Math.max(durationByChars, durationByPixels)));
    panel.style.setProperty('--ticker-duration', `${duration.toFixed(1)}s`);
  };

  const buildBottomPanel = (items) => {
    if (!bottomPanel) return;
    const existing = bottomPanel.querySelector('.bottom-ad__ticker');
    if (existing) existing.remove();
    const ticker = document.createElement('div');
    ticker.className = 'bottom-ad__ticker';
    ticker.setAttribute('aria-label', 'Annunci scorrevoli');
    const viewport = document.createElement('div');
    viewport.className = 'bottom-ad__viewport';
    const track = document.createElement('div');
    track.className = 'bottom-ad__track';
    const appendItem = (item) => {
      track.appendChild(buildBottomItem(item));
      track.appendChild(buildBottomMarker());
    };
    items.forEach((item) => {
      appendItem(item);
    });
    viewport.appendChild(track);
    ticker.appendChild(viewport);
    bottomPanel.appendChild(ticker);

    const minWidth = Math.max(600, bottomPanel.getBoundingClientRect().width * 1.2);
    let safety = 0;
    while (track.scrollWidth < minWidth && safety < 6) {
      items.forEach((item) => {
        appendItem(item);
      });
      safety += 1;
    }
    resizeBottomTicker();
  };

  const resizeAllSideTickers = () => {
    buildSidePanel(leftPanel, sideItemsLeft);
    buildSidePanel(rightPanel, sideItemsRight);
    buildBottomPanel(bottomItems);
  };

  const updateHintVisibility = () => {
    const hintEl = document.querySelector('[data-hint="algorithms"]');
    if (!hintEl) return;
    const nearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8;
    hintEl.classList.toggle('is-hidden', nearBottom);
  };

  window.addEventListener('load', () => {
    resizeAllSideTickers();
    updateHintVisibility();
  });
  window.addEventListener('resize', () => {
    window.clearTimeout(window.__sideTickerResize);
    window.__sideTickerResize = window.setTimeout(resizeAllSideTickers, 150);
  });
  window.setTimeout(resizeAllSideTickers, 50);
  window.addEventListener('scroll', updateHintVisibility, { passive: true });

  const updateLayoutReserve = () => {
    const root = document.documentElement;
    const toPx = (value) => {
      const n = Number.parseFloat(value);
      return Number.isFinite(n) ? n : 0;
    };

    let reserveBottom = 0;
    let reserveRight = 0;

    if (bottom.style.display !== 'none') {
      const panelRect = bottomPanel.getBoundingClientRect();
      reserveBottom = panelRect.height > 0 ? Math.ceil(panelRect.height + 20) : 120;
    }

    if (right.style.display !== 'none' && left.style.display === 'none') {
      const panelRect = rightPanel.getBoundingClientRect();
      const styles = getComputedStyle(rightPanel);
      const margins = toPx(styles.marginLeft) + toPx(styles.marginRight);
      reserveRight = panelRect.width > 0 ? Math.ceil(panelRect.width + margins + 12) : 220;
    }

    root.style.setProperty('--ad-reserve-bottom', `${reserveBottom}px`);
    root.style.setProperty('--ad-reserve-right', `${reserveRight}px`);
  };

  const updateAdLayout = () => {
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    const isCompact = window.innerWidth < 900;
    const isWide = window.innerWidth >= 1200;

    if (isCompact || isPortrait) {
      left.style.display = 'none';
      right.style.display = 'none';
      bottom.style.display = 'flex';
      document.documentElement.style.setProperty('--ad-rail-bottom', '120px');
      document.documentElement.dataset.adRail = 'bottom';
      window.requestAnimationFrame(updateLayoutReserve);
      return;
    }

    if (isWide) {
      left.style.display = 'block';
      right.style.display = 'block';
      bottom.style.display = 'none';
      document.documentElement.style.setProperty('--ad-rail-bottom', '0px');
      document.documentElement.dataset.adRail = 'double';
      window.requestAnimationFrame(updateLayoutReserve);
      return;
    }

    left.style.display = 'none';
    right.style.display = 'block';
    bottom.style.display = 'none';
    document.documentElement.style.setProperty('--ad-rail-bottom', '120px');
    document.documentElement.dataset.adRail = 'right';
    window.requestAnimationFrame(updateLayoutReserve);
  };

  updateAdLayout();
  window.addEventListener('resize', updateAdLayout);
  window.matchMedia('(orientation: portrait)').addEventListener('change', updateAdLayout);

  fetchLatestDraw().then((latestDraw) => {
    updateDrawTexts(latestDraw);
    if (latestDraw) {
      buildBottomPanel(bottomItems);
      updateDrawTexts(latestDraw);
      window.requestAnimationFrame(updateLayoutReserve);
    }
  });
};

const resizeBottomTicker = () => {
  const ticker = document.querySelector('.bottom-ad__ticker');
  const track = ticker?.querySelector('.bottom-ad__track');
  if (!ticker || !track) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    track.style.transition = 'none';
    track.style.transform = 'translateX(0)';
    return;
  }

  if (window.__bottomStepperTimer) {
    window.clearTimeout(window.__bottomStepperTimer);
    window.__bottomStepperTimer = null;
  }

  track.style.transition = 'none';
  track.style.transform = 'translateX(0)';

  const pause = 4000;
  const speed = 70;

  const step = () => {
    if (!track.isConnected) return;
    const firstItem = track.firstElementChild;
    if (!firstItem) return;
    let marker = firstItem.nextElementSibling;
    if (!marker || !marker.classList.contains('bottom-ad__marker')) {
      marker = track.querySelector('.bottom-ad__marker');
    }

    const tickerRect = ticker.getBoundingClientRect();
    const markerRect = marker ? marker.getBoundingClientRect() : null;
    let move = markerRect ? Math.round(markerRect.left - tickerRect.left) : 0;
    if (!move || move <= 0) {
      const firstRect = firstItem.getBoundingClientRect();
      move = Math.round(firstRect.width);
    }

    const duration = Math.max(0.9, move / speed);
    track.style.transition = `transform ${duration.toFixed(2)}s linear`;
    track.style.transform = `translateX(-${move}px)`;

    const onEnd = () => {
      track.removeEventListener('transitionend', onEnd);
      if (!track.isConnected) return;
      track.style.transition = 'none';
      if (marker && marker.classList.contains('bottom-ad__marker')) {
        track.appendChild(firstItem);
        track.appendChild(marker);
      } else {
        track.appendChild(firstItem);
      }
      track.style.transform = 'translateX(0)';
      window.__bottomStepperTimer = window.setTimeout(step, pause);
    };
    track.addEventListener('transitionend', onEnd);
  };

  window.__bottomStepperTimer = window.setTimeout(step, pause);
};

window.addEventListener('load', resizeBottomTicker);
window.addEventListener('resize', () => {
  window.clearTimeout(window.__bottomTickerResize);
  window.__bottomTickerResize = window.setTimeout(resizeBottomTicker, 150);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureAds);
} else {
  ensureAds();
}

function resolveWithBase(path) {
  if (!path) return path;
  const value = String(path);
  if (value.startsWith('#') || /^https?:\/\//i.test(value) || value.startsWith('file:')) {
    return value;
  }
  const baseUrl = window.CC_BASE?.url || localBaseUrl();
  if (!baseUrl) return value;
  const trimmed = value.startsWith('/') ? value.slice(1) : value.replace(/^\.\//, '');
  return new URL(trimmed, baseUrl).toString();
}

function localBaseUrl() {
  const path = window.location.pathname.replace(/\\/g, '/');
  const marker = '/pages/';
  const index = path.toLowerCase().indexOf(marker);
  const basePath = index !== -1
    ? path.slice(0, index + 1)
    : path.replace(/\/[^\/]*$/, '/');
  return new URL(basePath, window.location.href);
}

function getHintLabel() {
  const path = window.location.pathname.replace(/\\/g, '/').toLowerCase();
  const isHome = path.endsWith('/index.html') && !path.includes('/pages/');
  const isStats = path.includes('/pages/analisi-statistiche');
  const isStorico = path.includes('/pages/storico-estrazioni');
  if (isHome || isStats || isStorico) return 'Continua...';
  return 'Algoritmi';
}


