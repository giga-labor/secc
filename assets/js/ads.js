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
    return parts[1] || '';
  } catch (error) {
    return '';
  }
};

const buildFallbackItems = (latestDraw) => {
  const drawText = latestDraw ? `Ultima estrazione archiviata: ${latestDraw}` : 'Ultime estrazioni archiviate e consultabili';
  const base = [
    { label: 'Control Chaos', text: 'Laboratorio SuperEnalotto con moduli in evoluzione' },
    { label: 'Scopo', text: 'Analisi statistiche, logiche e narrative sui dati' },
    { label: 'Archivio', text: drawText, isDraw: true },
    { label: 'Trasparenza', text: 'Nessuna promessa di vincita, solo studio dei dati' },
    { label: 'Aggiornamenti', text: 'Moduli e card in allestimento continuo' }
  ];
  return shuffle(base);
};

const buildTickerText = (items) => {
  const parts = items.map((item) => {
    const label = item.label || 'Annuncio';
    const text = item.text || '';
    return `${label} — ${text}`;
  });
  return parts.join(' • ');
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
  const leftPanel = left.querySelector('.ad-rail__panel');
  const rightPanel = right.querySelector('.ad-rail__panel');

  const bottom = document.createElement('div');
  bottom.className = 'bottom-ad';
  bottom.dataset.bottomAd = 'true';
  const bottomPanel = document.createElement('div');
  bottomPanel.className = 'bottom-ad__panel';
  bottomPanel.id = 'bottomAdPanel';

  const title = document.createElement('span');
  title.className = 'bottom-ad__title';
  title.textContent = 'Annunci';

  const ticker = document.createElement('div');
  ticker.className = 'bottom-ad__ticker';
  ticker.setAttribute('aria-label', 'Annunci scorrevoli');

  const items = fallbackItems;
  const tickerText = document.createElement('span');
  tickerText.className = 'bottom-ad__text';
  tickerText.id = 'bottomAdTickerText';
  tickerText.textContent = buildTickerText(items);
  tickerText.dataset.baseText = tickerText.textContent;
  tickerText.dataset.text = tickerText.textContent;
  ticker.appendChild(tickerText);

  bottomPanel.appendChild(title);
  bottomPanel.appendChild(ticker);
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
  hint.innerHTML = `
    <span class="bottom-ad__hint-label">Algoritmi</span>
    <span class="bottom-ad__hint-arrow">↓</span>
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

  const resizeAllSideTickers = () => {
    buildSidePanel(leftPanel, sideItemsLeft);
    buildSidePanel(rightPanel, sideItemsRight);
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

  fetchLatestDraw().then((latestDraw) => {
    updateDrawTexts(latestDraw);
    if (latestDraw) {
      const tickerText = document.getElementById('bottomAdTickerText');
      if (tickerText) {
        const updatedItems = buildFallbackItems(latestDraw);
        const updatedBase = buildTickerText(updatedItems);
        tickerText.dataset.baseText = updatedBase;
        tickerText.textContent = updatedBase;
      }
      resizeBottomTicker();
    }
  });
};

const resizeBottomTicker = () => {
  const ticker = document.querySelector('.bottom-ad__ticker');
  const text = document.getElementById('bottomAdTickerText');
  if (!ticker || !text) return;
  const base = text.dataset.baseText || text.textContent || '';
  if (!base.trim()) return;
  const containerWidth = ticker.getBoundingClientRect().width;
  text.dataset.text = base;
  text.textContent = base;
  const singleWidth = text.scrollWidth;
  if (!singleWidth) return;
  const repeats = Math.max(2, Math.ceil((containerWidth * 2) / singleWidth));
  text.textContent = Array.from({ length: repeats }).map(() => base).join(' • ');
  text.dataset.text = text.textContent;
  const baseChars = estimateChars(base);
  const targetCharsPerSecond = 3.8;
  const minDuration = 100;
  const durationByChars = baseChars ? (baseChars / targetCharsPerSecond) : 50;
  const durationByPixels = singleWidth ? (singleWidth / 18) : 50;
  const duration = Math.max(minDuration, Math.min(240, Math.max(durationByChars, durationByPixels)));
  ticker.style.setProperty('--ticker-duration', `${duration.toFixed(1)}s`);
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
