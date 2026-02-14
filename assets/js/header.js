const ensureViewTransitionMeta = () => {
  const existing = document.querySelector('meta[name="view-transition"]');
  if (existing) return;
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'view-transition');
  meta.setAttribute('content', 'same-origin');
  document.head.appendChild(meta);
};

ensureViewTransitionMeta();

const CC_EVENT_VERSION = '1.0.0';

const createTelemetryRuntime = () => {
  if (window.CC_TELEMETRY) return window.CC_TELEMETRY;

  const storageKey = 'cc_telemetry_events_v1';
  const sessionKey = 'cc_telemetry_session_v1';
  const dedupKey = 'cc_telemetry_dedup_v1';
  const maxEvents = 1200;

  const readJson = (key, fallback) => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (_) {
      return fallback;
    }
  };

  const writeJson = (key, value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      // Ignore quota/privacy errors in dry-run mode.
    }
  };

  const ensureSessionId = () => {
    try {
      const existing = window.sessionStorage.getItem(sessionKey);
      if (existing) return existing;
      const id = `cc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(sessionKey, id);
      return id;
    } catch (_) {
      return `cc-${Date.now().toString(36)}-fallback`;
    }
  };

  const getPageType = () => {
    const path = (window.location.pathname || '').toLowerCase();
    if (/\/pages\/analisi-statistiche/.test(path)) return 'stats';
    if (/\/pages\/storico-estrazioni/.test(path)) return 'archive';
    if (/\/pages\/algoritmi\/algs\//.test(path)) return 'paper';
    if (/\/pages\/algoritmi/.test(path)) return 'data_section';
    if (/\/index\.html$|\/$/.test(path)) return 'dashboard';
    return 'other';
  };

  const getDeviceType = () => {
    const ua = (navigator.userAgent || '').toLowerCase();
    if (/tablet|ipad/.test(ua)) return 'tablet';
    if (/mobi|android/.test(ua)) return 'mobile';
    return 'desktop';
  };

  const getViewportBucket = () => {
    const w = window.innerWidth || document.documentElement.clientWidth || 0;
    if (w < 360) return 'xs';
    if (w < 768) return 'sm';
    if (w < 1024) return 'md';
    return 'lg';
  };

  const getSectionId = (element, fallback = '') => {
    if (!element || !(element instanceof Element)) return fallback;
    const host = element.closest('[data-section-id], section[id], [id]');
    if (!host) return fallback;
    return host.getAttribute('data-section-id') || host.id || fallback;
  };

  const rememberDedup = (key) => {
    if (!key) return false;
    const map = readJson(dedupKey, {});
    if (map[key]) return true;
    map[key] = Date.now();
    writeJson(dedupKey, map);
    return false;
  };

  const pushLocalEvent = (payload) => {
    const events = readJson(storageKey, []);
    events.push(payload);
    if (events.length > maxEvents) {
      events.splice(0, events.length - maxEvents);
    }
    writeJson(storageKey, events);
  };

  const track = (eventName, params = {}, options = {}) => {
    if (!eventName) return;
    const sessionId = ensureSessionId();
    const element = options.element instanceof Element ? options.element : null;
    const sectionId = params.section_id || getSectionId(element, options.sectionId || '');
    const dedupToken = options.dedupKey ? `${sessionId}:${options.dedupKey}` : '';
    if (options.oncePerSession && dedupToken && rememberDedup(dedupToken)) return;

    const payload = {
      event: String(eventName),
      event_version: CC_EVENT_VERSION,
      session_id: sessionId,
      page_type: getPageType(),
      page_path: window.location.pathname || '/',
      section_id: String(sectionId || ''),
      device_type: getDeviceType(),
      viewport_bucket: getViewportBucket(),
      ts: Date.now(),
      ...params
    };

    pushLocalEvent(payload);

    if (window.CC_TELEMETRY_DEBUG !== false) {
      // Keep this visible during offline migration dry-run.
      console.debug('[cc-telemetry]', payload);
    }

    if (typeof window.gtag === 'function') {
      const gtagPayload = {};
      Object.entries(payload).forEach(([key, value]) => {
        if (['string', 'number', 'boolean'].includes(typeof value)) {
          gtagPayload[key] = value;
        }
      });
      window.gtag('event', payload.event, gtagPayload);
    }
  };

  const observeImpression = (element, eventName, paramsBuilder = null, options = {}) => {
    if (!(element instanceof Element) || !('IntersectionObserver' in window)) return;
    let timer = 0;
    let fired = false;
    const threshold = Number.isFinite(options.threshold) ? options.threshold : 0.5;
    const dwellMs = Number.isFinite(options.dwellMs) ? options.dwellMs : 1000;
    const dedupBase = options.dedupKey || `${eventName}:${element.getAttribute('data-card-id') || element.id || 'node'}`;

    const fire = () => {
      if (fired) return;
      fired = true;
      const dynamic = typeof paramsBuilder === 'function' ? paramsBuilder(element) : {};
      track(eventName, dynamic || {}, {
        element,
        oncePerSession: true,
        dedupKey: dedupBase
      });
    };

    const clear = () => {
      if (!timer) return;
      window.clearTimeout(timer);
      timer = 0;
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (fired) return;
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          if (!timer) timer = window.setTimeout(fire, dwellMs);
        } else {
          clear();
        }
      });
    }, { threshold: [0, threshold, 1] });

    observer.observe(element);
  };

  window.CC_TELEMETRY = {
    EVENT_VERSION: CC_EVENT_VERSION,
    getSessionId: ensureSessionId,
    getEvents: () => readJson(storageKey, []),
    clearEvents: () => writeJson(storageKey, []),
    track,
    observeImpression,
    getSectionId
  };

  return window.CC_TELEMETRY;
};

createTelemetryRuntime();

const initTelemetryBindings = () => {
  const telemetry = window.CC_TELEMETRY;
  if (!telemetry || typeof telemetry.track !== 'function') return;

  const resolvePaperId = () => {
    const explicit = document.body?.getAttribute('data-paper-id');
    if (explicit) return explicit;
    const path = (window.location.pathname || '').replace(/\/$/, '');
    const match = path.match(/\/pages\/algoritmi\/algs\/([^/]+)/i);
    if (match) return match[1].toLowerCase();
    return '';
  };

  const bridgeBoxes = document.querySelectorAll('[data-bridge-box]');
  bridgeBoxes.forEach((box) => {
    const bridgeId = box.getAttribute('data-bridge-id') || box.id || 'bridge';
    const linkedPaperId = box.getAttribute('data-linked-paper-id') || '';
    const sourceDataModule = box.getAttribute('data-source-data-module') || '';
    telemetry.observeImpression(box, 'bridge_box_impression', () => ({
      bridge_id: bridgeId,
      linked_paper_id: linkedPaperId,
      source_data_module: sourceDataModule
    }), {
      dedupKey: `bridge_box_impression:${bridgeId}`
    });

    box.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        telemetry.track('bridge_box_click', {
          bridge_id: bridgeId,
          linked_paper_id: linkedPaperId,
          source_data_module: sourceDataModule
        }, { element: box });
      }, { passive: true });
    });
  });

  const paperId = resolvePaperId();
  if (!paperId) return;

  telemetry.track('paper_view', {
    paper_id: paperId,
    topic: document.body?.getAttribute('data-paper-topic') || '',
    level: document.body?.getAttribute('data-paper-level') || '',
    entry_source: document.referrer ? 'internal' : 'direct'
  });

  const thresholds = [25, 50, 75, 100];
  const fired = new Set();
  let maxDepth = 0;
  let engagedSeconds = 0;
  let activeMs = Date.now();
  let lastInteractionMs = Date.now();

  const markInteraction = () => {
    lastInteractionMs = Date.now();
  };

  ['scroll', 'mousemove', 'keydown', 'touchstart', 'click'].forEach((eventName) => {
    window.addEventListener(eventName, markInteraction, { passive: true });
  });

  const getDepth = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const docHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    return Math.max(0, Math.min(100, Math.round((scrollTop / docHeight) * 100)));
  };

  const handleDepth = () => {
    const depth = getDepth();
    if (depth > maxDepth) maxDepth = depth;
    thresholds.forEach((t) => {
      if (depth >= t && !fired.has(t)) {
        fired.add(t);
        telemetry.track('paper_scroll_depth', {
          paper_id: paperId,
          depth_pct: t
        });
      }
    });
  };

  const depthHandler = () => window.requestAnimationFrame(handleDepth);
  window.addEventListener('scroll', depthHandler, { passive: true });
  window.addEventListener('resize', depthHandler, { passive: true });
  handleDepth();

  window.setInterval(() => {
    const now = Date.now();
    const tabActive = document.visibilityState === 'visible';
    const interactedRecently = (now - lastInteractionMs) <= 30000;
    if (tabActive && interactedRecently) {
      engagedSeconds += Math.round((now - activeMs) / 1000);
      telemetry.track('paper_read_time', {
        paper_id: paperId,
        engaged_seconds: engagedSeconds
      });
    }
    activeMs = now;
  }, 15000);

  document.querySelectorAll('[data-related-paper-link]').forEach((link) => {
    link.addEventListener('click', () => {
      const target = link.getAttribute('data-target-paper-id') || link.getAttribute('href') || '';
      telemetry.track('related_paper_click', {
        paper_id: paperId,
        target_paper_id: target,
        position: Number(link.getAttribute('data-position') || 0)
      }, { element: link });
    }, { passive: true });
  });

  const emitExit = () => {
    handleDepth();
    const now = Date.now();
    const tabActive = document.visibilityState === 'visible';
    const interactedRecently = (now - lastInteractionMs) <= 30000;
    if (tabActive && interactedRecently) {
      engagedSeconds += Math.max(0, Math.round((now - activeMs) / 1000));
    }
    activeMs = now;
    telemetry.track('paper_exit', {
      paper_id: paperId,
      max_depth_pct: maxDepth,
      engaged_seconds: engagedSeconds,
      exit_type: document.visibilityState === 'hidden' ? 'hidden' : 'navigate'
    });
  };
  window.addEventListener('pagehide', emitExit, { passive: true });
  window.addEventListener('beforeunload', emitExit, { passive: true });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTelemetryBindings);
} else {
  initTelemetryBindings();
}

const initPaperTemplateFrame = () => {
  const path = (window.location.pathname || '').replace(/\/$/, '');
  const match = path.match(/\/pages\/algoritmi\/algs\/([^/]+)$/i);
  if (!match) return;
  const paperId = String(match[1] || '').toLowerCase();
  document.body?.setAttribute('data-paper-id', paperId);

  const topic = paperId.includes('genetic')
    ? 'neurali'
    : (paperId.includes('classic') ? 'statistica' : 'ibrido');
  document.body?.setAttribute('data-paper-topic', topic);
  if (!document.body?.getAttribute('data-paper-level')) {
    document.body?.setAttribute('data-paper-level', 'intermedio');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPaperTemplateFrame);
} else {
  initPaperTemplateFrame();
}

const rafThrottle = (fn) => {
  let frame = 0;
  return (...args) => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      fn(...args);
    });
  };
};

const ensureHeroBackgroundPreload = () => {
  const pageId = String(document.body?.dataset?.pageId || '').toLowerCase();
  const explicitPreload = document.body?.dataset?.heroPreload === 'true';
  if (!explicitPreload && pageId !== 'home') return;
  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  const heroPath = width <= 640
    ? 'img/fortuna_header_1_640.webp'
    : (width < 1200 ? 'img/fortuna_header_1_960.webp' : 'img/fortuna_header_1.webp');
  const href = resolveWithBaseHref(heroPath);
  if (!href) return;
  if (document.querySelector(`link[rel="preload"][as="image"][href="${href}"]`)) return;
  const preload = document.createElement('link');
  preload.rel = 'preload';
  preload.as = 'image';
  preload.href = href;
  preload.setAttribute('fetchpriority', 'high');
  document.head.appendChild(preload);
};

const optimizeImageLoading = () => {
  const images = document.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.getAttribute('decoding')) {
      img.setAttribute('decoding', 'async');
    }
    if (!img.getAttribute('loading')) {
      const eager = index < 2 || Boolean(img.closest('#site-header'));
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
    }
    if (!img.getAttribute('fetchpriority') && index === 0) {
      img.setAttribute('fetchpriority', 'high');
    }
  });
};

let header = document.getElementById('site-header');

const resolveBasePath = () => {
  const path = window.location.pathname.replace(/\\/g, '/');
  const marker = '/pages/';
  const index = path.toLowerCase().indexOf(marker);
  if (index !== -1) {
    return path.slice(0, index + 1);
  }
  return path.replace(/\/[^\/]*$/, '/');
};

const BASE = window.CC_BASE || (() => {
  const basePath = resolveBasePath();
  const baseUrl = new URL(basePath, window.location.href);
  return {
    path: basePath,
    url: baseUrl,
    resolve: (value) => resolveWithBase(value, baseUrl)
  };
})();

if (!window.CC_BASE) {
  window.CC_BASE = BASE;
}

const normalizeHrefPath = (href) => {
  if (!href || href.startsWith('#')) return '';
  try {
    const url = href.startsWith('http') || href.startsWith('file:')
      ? new URL(href)
      : new URL(href, BASE.url);
    return url.pathname.replace(/\/index\.html$/, '/');
  } catch (error) {
    return href.replace(/\/index\.html$/, '/');
  }
};

const resolveWithBaseHref = (href, baseUrl = BASE.url) => {
  if (!href) return href;
  if (href.startsWith('#') || /^https?:\/\//i.test(href) || href.startsWith('file:')) return href;
  const trimmed = href.startsWith('/') ? href.slice(1) : href.replace(/^\.\//, '');
  return new URL(trimmed, baseUrl).toString();
};

const ensureMigrationStylesheet = () => {
  const href = resolveWithBaseHref('assets/css/migration.css');
  if (!href) return;
  if (document.querySelector(`link[data-cc-migration-style="true"][href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.ccMigrationStyle = 'true';
  document.head.appendChild(link);
};

ensureMigrationStylesheet();

const AUDIO_ENABLED = true;

const getVersion = () => window.CC_VERSION || '00.00.000';
const getLastDraw = () => String(window.CC_LAST_DRAW || '').trim();
const getVersionDisplay = () => {
  const base = getVersion();
  const draw = getLastDraw();
  return draw ? `${base}.${draw}` : base;
};
const VERSION = getVersionDisplay();

const fetchLatestDrawHeader = async () => {
  const cacheKey = 'cc-latest-draw-cache';
  const now = Date.now();
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.value && Number.isFinite(parsed.ts) && (now - parsed.ts) < 5 * 60 * 1000) {
        return String(parsed.value);
      }
    }
  } catch (error) {
    // ignore session cache issues
  }
  try {
    const response = await fetch(resolveWithBaseHref('archives/draws/draws.csv'), { cache: 'no-store' });
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
    const latest = parts[0] || '';
    if (latest) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ value: latest, ts: now }));
      } catch (error) {
        // ignore storage quota/privacy failures
      }
    }
    return latest;
  } catch (error) {
    return '';
  }
};

const normalizeKicker = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim()
  .toUpperCase();

const titleToKicker = () => {
  const raw = String(document.title || '').trim();
  if (!raw) return 'PAGINA';
  const primary = raw.split('|')[0].split(' - ')[0].trim();
  return normalizeKicker(primary || 'PAGINA');
};

const getPageKickerLabel = () => {
  const path = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
  if (path === '/' || path.endsWith('/index.html') && !path.includes('/pages/')) return 'HOME';
  if (path.includes('/pages/storico-estrazioni')) return 'ARCHIVIO STORICO';
  if (path.includes('/pages/analisi-statistiche')) return 'ANALISI STATISTICHE';
  if (path.includes('/pages/algoritmi/spotlight/statistici')) return 'SPOTLIGHT STATISTICI';
  if (path.includes('/pages/algoritmi/spotlight/neurali')) return 'SPOTLIGHT NEURALI';
  if (path.includes('/pages/algoritmi/spotlight/ibridi')) return 'SPOTLIGHT IBRIDI';
  if (path.includes('/pages/algoritmi/index')) return 'ALGORITMI';
  if (path.includes('/pages/algoritmi/')) return titleToKicker();
  if (path.includes('/pages/contatti-chi-siamo')) return 'CONTATTI E CHI SIAMO';
  if (path.includes('/pages/privacy-policy')) return 'PRIVACY POLICY';
  if (path.includes('/pages/cookie-policy')) return 'COOKIE POLICY';
  return titleToKicker();
};

const applyUnifiedPageKicker = () => {
  const main = document.querySelector('main');
  if (!main) return;
  if (main.dataset.pageKicker === 'off' || document.body?.dataset.pageKicker === 'off') return;
  const host = main.querySelector(':scope > .content-box') || main;
  const label = getPageKickerLabel();
  if (!label) return;

  let wrap = host.querySelector(':scope > [data-page-kicker-wrap]');
  let textNode = wrap ? wrap.querySelector('[data-page-kicker]') : null;

  if (!wrap) {
    const firstHeader = host.querySelector(':scope > header');
    const firstHeaderText = firstHeader?.querySelector('span, p');
    const hasBigTitle = Boolean(firstHeader?.querySelector('h1, h2, h3'));
    if (firstHeader && firstHeaderText && !hasBigTitle) {
      wrap = firstHeader;
      wrap.dataset.pageKickerWrap = '';
      textNode = firstHeaderText;
      textNode.dataset.pageKicker = '';
    }
  }

  if (!wrap) {
    wrap = document.createElement('header');
    wrap.dataset.pageKickerWrap = '';
    textNode = document.createElement('span');
    textNode.dataset.pageKicker = '';
    wrap.appendChild(textNode);
    host.insertBefore(wrap, host.firstElementChild || null);
  }

  wrap.classList.add('page-kicker-wrap');
  textNode.classList.add('page-kicker-text');
  textNode.textContent = label;
};

const buildHeaderMarkup = () => `
  <header id="site-header" class="sticky top-0 z-50 relative border-b border-white/10 backdrop-blur-sm">
    <div class="header-bg absolute inset-0 opacity-0"></div>
    <div class="header-overlay absolute inset-0 bg-gradient-to-br from-midnight/80 via-midnight/60 to-midnight/40"></div>
    <div class="standing-marquee relative z-10 w-full px-6 py-2 text-xs uppercase tracking-[0.3em] text-ash">
      <div class="standing-marquee__track">
        <span>Il traffico sostiene il progetto con banner trasparenti; i dati sono curati manualmente e le previsioni restano sempre ipotesi. Nessuna promessa di vincita.</span>
        <span>Il traffico sostiene il progetto con banner trasparenti; i dati sono curati manualmente e le previsioni restano sempre ipotesi. Nessuna promessa di vincita.</span>
      </div>
    </div>
    <div class="header-container relative mx-auto w-[calc(100%-2rem)] max-w-[60rem] px-12 py-20">
      <div class="header-wrap rounded-3xl border border-white/15 bg-gradient-to-br from-midnight/90 via-midnight/80 to-neon/10 px-6 py-8 shadow-glow backdrop-blur-sm">
        <div class="header-topline">
          <p class="text-xs uppercase tracking-[0.35em] text-neon">SuperEnalotto Control Chaos</p>
          <span class="header-version" aria-label="Versione">${VERSION}</span>
        </div>
        <h1 class="header-title mt-4 text-3xl sm:text-5xl font-semibold drop-shadow-[0_0_14px_rgba(255,217,102,0.35)]">Statistiche e algoritmi per dominare il caos del <span class="superenalotto-mark" aria-label="Super-Enalotto"><span class="super-word">S<span class="super-u">u</span>per</span><span class="super-dash">-</span><span class="enalotto-word">Enalotto</span></span></h1>
        <div class="header-actions mt-10 flex flex-wrap items-center justify-between gap-4">
          <div class="header-actions__left flex flex-wrap items-center gap-4">
            <a class="home-badge home-badge--icon home-badge--home bg-neon/10 px-6 py-3 font-semibold text-neon transition" href="${resolveWithBaseHref('index.html')}#top" aria-label="Home" data-tooltip="HOME PAGE">
              <span class="home-badge__home-bg" aria-hidden="true"></span>
            </a>
            <a class="home-badge home-badge--icon home-badge--home bg-neon/10 px-6 py-3 font-semibold text-neon transition" href="${resolveWithBaseHref('pages/storico-estrazioni/')}" aria-label="Storico estrazioni" data-tooltip="Storico estrazioni">
              <img class="home-badge__icon home-badge__icon--img" src="${resolveWithBaseHref('img/history.webp')}" alt="" aria-hidden="true">
            </a>
            <a class="home-badge home-badge--icon home-badge--home bg-neon/10 px-6 py-3 font-semibold text-neon transition" href="${resolveWithBaseHref('pages/algoritmi/index.html')}" aria-label="Algoritmi" data-tooltip="Algoritmi">
              <img class="home-badge__icon home-badge__icon--img" src="${resolveWithBaseHref('img/algoritm.webp')}" alt="" aria-hidden="true">
            </a>
            <a class="home-badge home-badge--icon home-badge--home bg-neon/10 px-6 py-3 font-semibold text-neon transition" href="${resolveWithBaseHref('pages/analisi-statistiche/')}" aria-label="Analisi statistiche" data-tooltip="Analisi statistiche">
              <img class="home-badge__icon home-badge__icon--img" src="${resolveWithBaseHref('img/statistic.webp')}" alt="" aria-hidden="true">
            </a>
          </div>
          <div class="header-actions__right">
            <button class="home-badge home-badge--audio home-badge--home bg-neon/10 px-4 py-3 text-neon transition" type="button" aria-label="Audio" data-tooltip="MUSIC" data-audio-toggle${AUDIO_ENABLED ? '' : ' hidden'}>
              <img class="audio-icon home-badge__icon home-badge__icon--img" src="${resolveWithBaseHref('img/play.webp')}" alt="" aria-hidden="true">
              <span class="audio-track" data-audio-track>—</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
`;

const ensureSiteHeader = () => {
  let node = document.getElementById('site-header');
  if (!node && document.body) {
    document.body.insertAdjacentHTML('afterbegin', buildHeaderMarkup());
    node = document.getElementById('site-header');
  }
  if (node) {
    node.hidden = false;
    node.style.removeProperty('display');
    node.style.removeProperty('visibility');
    node.removeAttribute('aria-hidden');
  }
  return node;
};

header = ensureSiteHeader();
window.CC_HEADER_ENSURE = ensureSiteHeader;

if (header) {
  const markActiveNav = () => {
    const links = header.querySelectorAll('.home-badge[href]');
    const currentPath = window.location.pathname.replace(/\/index\.html$/, '/');
    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('#')) return;
      const normalized = normalizeHrefPath(href);
      if (!normalized) return;
      const isRoot = normalized === BASE.path || normalized === '/';
      const isActive = isRoot
        ? currentPath === normalized || currentPath === '/index.html'
        : currentPath === normalized || currentPath.startsWith(normalized);
      link.classList.toggle('is-active', isActive);
    });
  };
  markActiveNav();
}

window.addEventListener('pageshow', () => {
  header = ensureSiteHeader();
});

if (header) {
  const main = document.querySelector('main');
  const getResponsiveContentGap = () => {
    const pageId = document.body?.dataset?.pageId || '';
    if (pageId === 'algsheet') return 0;
    const width = window.innerWidth || document.documentElement.clientWidth || 0;
    const railMode = document.documentElement.getAttribute('data-ad-rail') || 'right';
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;

    if (width >= 1600) return 8;
    if (width >= 1400) return 7;
    if (width >= 1200) return 6;
    if (width >= 1024) return 5;
    if (width >= 768) return railMode === 'bottom' || isPortrait ? 4 : 5;
    return 4;
  };

  const setHeaderOffsets = () => {
    const container = header.querySelector('.header-container') || header;
    const wrap = header.querySelector('.header-wrap') || container;
    const headerPosition = window.getComputedStyle(header).position;
    const inFlowLayout = headerPosition !== 'fixed';
    if (inFlowLayout) {
      document.documentElement.style.setProperty('--fixed-header-offset', '0px');
      document.documentElement.style.setProperty('--header-content-gap', '0px');
      document.documentElement.style.setProperty('--header-fade-height', '0px');
      if (main) {
        main.style.paddingTop = '0px';
      }
      return;
    }
    const rect = container.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const contentGap = getResponsiveContentGap();
    const headerBottom = Math.max(rect.bottom, wrapRect.bottom, headerRect.bottom);
    const offset = Math.ceil(headerBottom + contentGap);
    document.documentElement.style.setProperty('--fixed-header-offset', `${offset}px`);
    document.documentElement.style.setProperty('--header-content-gap', `${contentGap}px`);
    document.documentElement.style.setProperty('--header-fade-height', `${Math.ceil(offset + 1)}px`);
    document.documentElement.style.setProperty('--col-x', `${Math.max(0, Math.round(wrapRect.left))}px`);
    document.documentElement.style.setProperty('--col-w', `${Math.max(0, Math.round(wrapRect.width))}px`);
    if (main) {
      main.style.paddingTop = `${offset}px`;
    }
  };
  const scheduleHeaderOffsets = rafThrottle(setHeaderOffsets);
  setHeaderOffsets();
  window.addEventListener('load', scheduleHeaderOffsets, { passive: true });
  window.addEventListener('resize', scheduleHeaderOffsets, { passive: true });
  window.addEventListener('orientationchange', scheduleHeaderOffsets, { passive: true });
  window.addEventListener('pageshow', scheduleHeaderOffsets, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleHeaderOffsets, { passive: true });
  }
  window.setTimeout(scheduleHeaderOffsets, 80);
  window.setTimeout(scheduleHeaderOffsets, 220);
  window.setTimeout(scheduleHeaderOffsets, 480);
  if (document.fonts && typeof document.fonts.ready?.then === 'function') {
    document.fonts.ready.then(scheduleHeaderOffsets).catch(() => {});
  }
}

const syncHeaderVersion = () => {
  const versionEl = document.querySelector('.header-version');
  if (versionEl) {
    versionEl.textContent = getVersionDisplay();
  }
};

const syncHeaderTitleVisibility = () => {
  const titleEl = document.querySelector('#site-header .header-title');
  if (!titleEl) return;
  const size = Number.parseFloat(getComputedStyle(titleEl).fontSize);
  const isTooSmall = Number.isFinite(size) && size < 14;
  titleEl.classList.toggle('is-hidden', isTooSmall);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncHeaderVersion);
  document.addEventListener('DOMContentLoaded', syncHeaderTitleVisibility);
} else {
  syncHeaderVersion();
  syncHeaderTitleVisibility();
}

fetchLatestDrawHeader().then((latestDraw) => {
  if (!latestDraw) return;
  window.CC_LAST_DRAW = latestDraw;
  syncHeaderVersion();
});

const updateAdRails = () => {
  const container = header?.querySelector('.header-container');
  const wrap = header?.querySelector('.header-wrap');
  const title = header?.querySelector('.header-title');
  if (!container && !wrap && !title) return;
  const headerRect = header?.getBoundingClientRect();
  let bottomAd = document.querySelector('[data-bottom-ad]');
  if (!bottomAd) {
    bottomAd = document.querySelector('.bottom-ad') || document.querySelector('.fixed.bottom-4.left-1\\/2');
    if (bottomAd) bottomAd.dataset.bottomAd = 'true';
  }
  const anchorRect = (container || wrap || title).getBoundingClientRect();
  const wrapRect = wrap?.getBoundingClientRect();
  const containerRect = container?.getBoundingClientRect();
  const topSource = wrapRect?.top ?? containerRect?.top ?? headerRect?.top ?? anchorRect.top;
  const top = Math.max(0, topSource);
  const getBottomPad = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--ad-rail-bottom');
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 24;
  };
  const bottom = getBottomPad();
  if (bottomAd) {
    const bottomRect = bottomAd.getBoundingClientRect();
    const isHidden = bottomRect.width === 0 || bottomRect.height === 0;
    const bottomLimit = isHidden
      ? Math.max(0, window.innerHeight - bottom)
      : bottomRect.top;
    const trim = 16;
    const height = Math.max(0, bottomLimit - top - trim);
    document.documentElement.style.setProperty('--ad-rail-height', `${height}px`);
  } else {
    const trim = 16;
    const height = Math.max(0, window.innerHeight - top - bottom - trim);
    document.documentElement.style.setProperty('--ad-rail-height', `${height}px`);
  }
  document.documentElement.style.setProperty('--ad-rail-top', `${top}px`);
};

let adRailTicking = false;
const onAdRailScroll = () => {
  if (adRailTicking) return;
  adRailTicking = true;
  window.requestAnimationFrame(() => {
    updateAdRails();
    adRailTicking = false;
  });
};

window.addEventListener('load', updateAdRails);
window.addEventListener('resize', rafThrottle(updateAdRails), { passive: true });
window.addEventListener('resize', rafThrottle(syncHeaderTitleVisibility), { passive: true });
// Ads stay standing; no scroll listener.

const bindGlassLight = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return;

  let pointerX = Math.round(window.innerWidth * 0.5);
  let pointerY = Math.round(window.innerHeight * 0.2);
  let rafId = 0;

  const reflectiveSelector = [
    '#site-header .header-container',
    '#site-header .header-wrap',
    '.ad-rail__panel',
    '.bottom-ad__panel',
    '.home-badge',
    '.audio-menu',
    '.tabs-sheet',
    '.tab-btn'
  ].join(', ');

  const ensureOverlay = (el) => {
    if (!el || !(el instanceof HTMLElement)) return;
    el.classList.add('glass-reflective');
    if (!el.querySelector(':scope > .glass-light-overlay')) {
      const overlay = document.createElement('span');
      overlay.className = 'glass-light-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      el.appendChild(overlay);
    }
  };

  const refreshReflectiveTargets = () => {
    document.querySelectorAll('.glass-reflective').forEach((el) => {
      if (el.matches(reflectiveSelector)) return;
      el.classList.remove('glass-reflective');
      const overlay = el.querySelector(':scope > .glass-light-overlay');
      if (overlay) overlay.remove();
      el.style.setProperty('--glass-light-a', '0');
    });
    document.querySelectorAll(reflectiveSelector).forEach(ensureOverlay);
  };

  const applyLight = () => {
    rafId = 0;
    const targets = document.querySelectorAll('.glass-reflective');
    targets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
        return;
      }

      const localX = ((pointerX - rect.left) / rect.width) * 100;
      const localY = ((pointerY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(-10, Math.min(110, localX));
      const clampedY = Math.max(-10, Math.min(110, localY));

      const nearestX = Math.max(rect.left, Math.min(pointerX, rect.right));
      const nearestY = Math.max(rect.top, Math.min(pointerY, rect.bottom));
      const dx = pointerX - nearestX;
      const dy = pointerY - nearestY;
      const dist = Math.hypot(dx, dy);
      const activationDist = Math.max(42, Math.min(rect.width, rect.height) * 0.28);
      if (dist > activationDist) {
        el.style.setProperty('--glass-light-a', '0');
        return;
      }
      const proximity = Math.max(0, 1 - (dist / activationDist));
      const eased = proximity * proximity * (3 - 2 * proximity);
      const intensity = 0.62 * eased;
      const radius = Math.max(70, Math.min(160, Math.min(rect.width, rect.height) * 0.34));

      el.style.setProperty('--glass-light-x', `${clampedX.toFixed(2)}%`);
      el.style.setProperty('--glass-light-y', `${clampedY.toFixed(2)}%`);
      el.style.setProperty('--glass-light-a', intensity.toFixed(3));
      el.style.setProperty('--glass-light-r', `${radius.toFixed(1)}px`);
    });
  };

  const scheduleApply = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(applyLight);
  };

  const onPointerMove = (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    scheduleApply();
  };

  const scheduleRefresh = rafThrottle(refreshReflectiveTargets);

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('resize', () => {
    scheduleRefresh();
    scheduleApply();
  }, { passive: true });
  window.addEventListener('scroll', scheduleApply, { passive: true });
  window.addEventListener('load', () => {
    scheduleRefresh();
    scheduleApply();
  }, { passive: true });

  const observer = new MutationObserver(() => {
    scheduleRefresh();
    scheduleApply();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  refreshReflectiveTargets();
  window.setTimeout(() => {
    refreshReflectiveTargets();
    scheduleApply();
  }, 120);
};

optimizeImageLoading();
ensureHeroBackgroundPreload();

if (document.readyState === 'complete') {
  document.documentElement.classList.add('cc-ready');
  bindGlassLight();
} else {
  window.addEventListener('load', () => {
    document.documentElement.classList.add('cc-ready');
    bindGlassLight();
  }, { once: true, passive: true });
}

const homeBadges = document.querySelectorAll('.home-badge[data-tooltip]');
let homeTooltip = document.querySelector('[data-home-tooltip]');
if (homeBadges.length && !homeTooltip) {
  homeTooltip = document.createElement('div');
  homeTooltip.className = 'home-tooltip';
  homeTooltip.dataset.homeTooltip = '';
  homeTooltip.textContent = 'HOME PAGE';
  (header || document.body).appendChild(homeTooltip);
}
if (homeBadges.length && homeTooltip) {
  const offset = 14;
  const positionTooltip = (event) => {
    homeTooltip.style.left = `${event.clientX + offset}px`;
    homeTooltip.style.top = `${event.clientY + offset}px`;
  };
  const onEnter = (event) => {
    const label = event.currentTarget.getAttribute('data-tooltip') || 'HOME PAGE';
    homeTooltip.textContent = label;
    homeTooltip.classList.add('is-visible');
    positionTooltip(event);
  };
  const onLeave = () => {
    homeTooltip.classList.remove('is-visible');
  };
  homeBadges.forEach((badge) => {
    badge.addEventListener('mouseenter', onEnter);
    badge.addEventListener('mousemove', positionTooltip);
    badge.addEventListener('mouseleave', onLeave);
  });
}

const audioToggle = document.querySelector('[data-audio-toggle]');
if (audioToggle && AUDIO_ENABLED) {
  const audio = new Audio();
  audio.preload = 'none';
  const volumeKey = 'cc-audio-volume';
  const safeStorageGet = (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  };
  const safeStorageSet = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // ignore storage access failures
    }
  };
  const savedVolumeRaw = Number.parseFloat(safeStorageGet(volumeKey) || '0.35');
  let targetVolume = Number.isFinite(savedVolumeRaw) ? savedVolumeRaw : 0.35;
  audio.volume = 0;
  let playlist = null;
  let playlistPromise = null;
  const storageKey = 'cc-audio-enabled';
  const trackKey = 'cc-audio-track';
  const timeKey = 'cc-audio-time';
  const defaultEnabled = 'on';
  let resumeTime = 0;
  const history = [];
  let toggleBusy = false;
  let audioMenu = null;

  const loadPlaylist = async () => {
    if (playlist) return playlist;
    if (!playlistPromise) {
      const cacheBust = Date.now();
      const playlistUrl = resolveWithBaseHref(`assets/audio/playlist.json?cb=${cacheBust}`);
      playlistPromise = fetch(playlistUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`playlist ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          playlist = Array.isArray(data)
            ? data.filter(Boolean).map((item) => resolveWithBaseHref(item))
            : [];
          return playlist;
        })
        .catch(() => {
          playlist = [];
          return playlist;
        });
    }
    return playlistPromise;
  };

  const pickRandom = (list, current) => {
    if (!list.length) return '';
    if (list.length === 1) return list[0];
    let next = list[Math.floor(Math.random() * list.length)];
    while (next === current) {
      next = list[Math.floor(Math.random() * list.length)];
    }
    return next;
  };

  const clampVolume = (value) => Math.min(1, Math.max(0, value));
  targetVolume = clampVolume(targetVolume);
  safeStorageSet(volumeKey, String(targetVolume));
  const syncAudioVolumeMeter = () => {
    if (!audioMenu) return;
    audioMenu.style.setProperty('--audio-volume-level', targetVolume.toFixed(3));
  };
  const fadeTo = (value, duration = 800) => new Promise((resolve) => {
    const start = audio.volume;
    const delta = value - start;
    if (delta === 0) {
      resolve();
      return;
    }
    const startTime = performance.now();
    const step = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      audio.volume = clampVolume(start + delta * t);
      if (t < 1) {
        window.requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    window.requestAnimationFrame(step);
  });

  const setTrack = async (next) => {
    if (!next) return;
    if (!audio.paused && audio.currentTime > 0) {
      await fadeTo(0, 500);
    }
    audio.src = next;
    localStorage.setItem(trackKey, next);
    const trackLabel = audioToggle.querySelector('[data-audio-track]');
    if (trackLabel) {
      const fileName = (next.split('/').pop() || '').split('?')[0];
      const cleanName = decodeURIComponent(fileName)
        .replace(/\\.mp3$/i, '')
        .replace(/\\.[^.]+$/, '');
      trackLabel.classList.remove('is-visible');
      window.setTimeout(() => {
        trackLabel.textContent = cleanName;
        if (audioToggle.classList.contains('is-playing')) {
          trackLabel.classList.add('is-visible');
        }
      }, 220);
    }
    if (history[history.length - 1] !== next) {
      history.push(next);
      if (history.length > 20) history.shift();
    }
    resumeTime = Number.parseFloat(localStorage.getItem(timeKey) || '0') || 0;
    try {
      audio.volume = 0;
      await audio.play();
      fadeTo(targetVolume, 900);
      if (resumeTime > 0 && audio.duration) {
        audio.currentTime = Math.min(resumeTime, Math.max(audio.duration - 1, 0));
      }
    } catch (error) {
      audioToggle.classList.remove('is-playing');
      audioToggle.setAttribute('aria-pressed', 'false');
    }
  };

  const playNext = async () => {
    const list = await loadPlaylist();
    if (!list.length) return;
    const storedTrack = localStorage.getItem(trackKey);
    const next = storedTrack && list.includes(storedTrack) ? storedTrack : pickRandom(list, audio.src);
    await setTrack(next);
  };

  const playNextRandom = async () => {
    const list = await loadPlaylist();
    if (!list.length) return;
    const next = pickRandom(list, audio.src);
    await setTrack(next);
  };

  audio.addEventListener('ended', () => {
    if (!audioToggle.classList.contains('is-playing')) return;
    localStorage.removeItem(timeKey);
    playNextRandom();
  });

  audio.addEventListener('timeupdate', () => {
    if (!audioToggle.classList.contains('is-playing')) return;
    if (audio.currentTime > 0) {
      localStorage.setItem(timeKey, String(audio.currentTime));
    }
  });

  audio.addEventListener('loadedmetadata', () => {
    if (resumeTime > 0) {
      audio.currentTime = Math.min(resumeTime, Math.max(audio.duration - 1, 0));
    }
  });

  const setEnabledState = (enabled) => {
    audioToggle.classList.toggle('is-playing', enabled);
    audioToggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    localStorage.setItem(storageKey, enabled ? 'on' : 'off');
    const trackLabel = audioToggle.querySelector('[data-audio-track]');
    if (trackLabel) {
      trackLabel.classList.toggle('is-visible', enabled);
    }
  };

  const ensurePlayback = async () => {
    if (!audioToggle.classList.contains('is-playing')) return;
    await playNext();
  };

  const tryAutoplay = async () => {
    await ensurePlayback();
  };

  const interactionResume = () => {
    document.removeEventListener('click', interactionResume);
    document.removeEventListener('keydown', interactionResume);
    document.removeEventListener('touchstart', interactionResume);
    document.removeEventListener('mousemove', interactionResume);
    ensurePlayback();
  };

  const stopPlayback = async () => {
    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    if (currentTime > 0) {
      localStorage.setItem(timeKey, String(currentTime));
    }
    await fadeTo(0, 280);
    audio.pause();
  };

  const startPlayback = async () => {
    const hasSource = Boolean(audio.src);
    if (hasSource) {
      try {
        audio.volume = 0;
        await audio.play();
        await fadeTo(targetVolume, 520);
        return;
      } catch (error) {
        // fallback to playlist flow
      }
    }
    await playNext();
  };

  audioToggle.addEventListener('click', async () => {
    if (toggleBusy) return;
    toggleBusy = true;
    try {
      const isPlaying = audioToggle.classList.contains('is-playing');
      if (isPlaying) {
        setEnabledState(false);
        await stopPlayback();
        return;
      }
      setEnabledState(true);
      await startPlayback();
    } finally {
      toggleBusy = false;
    }
  });

  const stored = localStorage.getItem(storageKey);
  const shouldPlay = stored ? stored === 'on' : defaultEnabled === 'on';
  setEnabledState(shouldPlay);
  if (shouldPlay) {
    tryAutoplay();
    document.addEventListener('click', interactionResume, { once: true });
    document.addEventListener('keydown', interactionResume, { once: true });
    document.addEventListener('touchstart', interactionResume, { once: true, passive: true });
    document.addEventListener('mousemove', interactionResume, { once: true });
  }

  const buildAudioMenu = () => {
    if (audioMenu) return audioMenu;
    audioMenu = document.createElement('div');
    audioMenu.className = 'audio-menu';
    audioMenu.innerHTML = `
      <button type="button" data-audio-prev aria-label="Brano precedente">Prev</button>
      <button type="button" data-audio-next aria-label="Brano successivo">Next</button>
      <button type="button" data-audio-random aria-label="Brano random">Rnd</button>
      <button type="button" data-audio-vol-down aria-label="Volume giù">Vol-</button>
      <button type="button" data-audio-vol-up aria-label="Volume su">Vol+</button>
      <div class="audio-menu-volume" aria-hidden="true">
        <span class="audio-menu-volume__fill"></span>
      </div>
    `;
    document.body.appendChild(audioMenu);
    audioMenu.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    audioMenu.querySelector('[data-audio-prev]')?.addEventListener('click', async () => {
      await playPrevious();
    });
    audioMenu.querySelector('[data-audio-next]')?.addEventListener('click', async () => {
      await playRandom();
    });
    audioMenu.querySelector('[data-audio-random]')?.addEventListener('click', async () => {
      await playRandom();
    });
    audioMenu.querySelector('[data-audio-vol-down]')?.addEventListener('click', () => changeVolume(-0.1));
    audioMenu.querySelector('[data-audio-vol-up]')?.addEventListener('click', () => changeVolume(0.1));
    syncAudioVolumeMeter();
    return audioMenu;
  };

  const positionMenu = () => {
    if (!audioMenu) return;
    const rect = audioToggle.getBoundingClientRect();
    const menuRect = audioMenu.getBoundingClientRect();
    const minGap = 12;
    const gap = 10;
    const maxLeft = Math.max(minGap, window.innerWidth - menuRect.width - minGap);
    const maxTop = Math.max(minGap, window.innerHeight - menuRect.height - minGap);
    const fitsLeft = (rect.left - gap - menuRect.width) >= minGap;

    let left;
    let top;
    if (fitsLeft) {
      left = rect.left - menuRect.width - gap;
      top = rect.top;
    } else {
      left = rect.right - menuRect.width;
      top = rect.bottom + gap;
    }

    left = Math.min(maxLeft, Math.max(minGap, left));
    top = Math.min(maxTop, Math.max(minGap, top));

    audioMenu.style.left = `${left}px`;
    audioMenu.style.top = `${top}px`;
  };

  const OPEN_DELAY_MS = 1400;
  const CLOSE_DELAY_MS = 2000;
  let openTimer = 0;
  let closeTimer = 0;
  let overToggle = false;
  let overMenu = false;

  const clearOpenTimer = () => {
    if (!openTimer) return;
    window.clearTimeout(openTimer);
    openTimer = 0;
  };

  const clearCloseTimer = () => {
    if (!closeTimer) return;
    window.clearTimeout(closeTimer);
    closeTimer = 0;
  };

  const ensureMenuMounted = () => {
    buildAudioMenu();
    if (!document.body.contains(audioMenu)) {
      document.body.appendChild(audioMenu);
    }
  };

  const showMenu = () => {
    ensureMenuMounted();
    positionMenu();
    syncAudioVolumeMeter();
    audioMenu.classList.add('is-visible');
  };

  const hideMenu = () => {
    if (!audioMenu) return;
    audioMenu.classList.remove('is-visible');
  };

  const scheduleOpenMenu = () => {
    clearCloseTimer();
    clearOpenTimer();
    openTimer = window.setTimeout(() => {
      openTimer = 0;
      if (overToggle || overMenu) {
        showMenu();
      }
    }, OPEN_DELAY_MS);
  };

  const scheduleCloseMenu = () => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimer = window.setTimeout(() => {
      closeTimer = 0;
      if (!overToggle && !overMenu) {
        hideMenu();
      }
    }, CLOSE_DELAY_MS);
  };

  const getAdaptiveVolumeStep = (direction) => {
    const level = clampVolume(targetVolume);
    const nearLow = level <= 0.22;
    const nearHigh = level >= 0.78;
    const outerBand = level <= 0.4 || level >= 0.6;
    if ((direction < 0 && nearLow) || (direction > 0 && nearHigh)) return 0.015;
    if (outerBand) return 0.03;
    return 0.06;
  };

  const changeVolume = (delta) => {
    const direction = delta < 0 ? -1 : 1;
    const step = getAdaptiveVolumeStep(direction);
    targetVolume = clampVolume(targetVolume + (step * direction));
    safeStorageSet(volumeKey, String(targetVolume));
    if (!audio.paused) {
      audio.volume = targetVolume;
    }
    syncAudioVolumeMeter();
  };

  const playRandom = async () => {
    const list = await loadPlaylist();
    if (!list.length) return;
    const next = pickRandom(list, audio.src);
    await setTrack(next);
  };

  const playPrevious = async () => {
    const list = await loadPlaylist();
    if (!list.length) return;
    if (history.length > 1) {
      history.pop();
      const prev = history.pop();
      if (prev) {
        await setTrack(prev);
        return;
      }
    }
    await playRandom();
  };

  ensureMenuMounted();
  hideMenu();

  audioToggle.addEventListener('mouseenter', () => {
    overToggle = true;
    scheduleOpenMenu();
  });
  audioToggle.addEventListener('mouseleave', () => {
    overToggle = false;
    scheduleCloseMenu();
  });
  audioToggle.addEventListener('focus', () => {
    overToggle = true;
    scheduleOpenMenu();
  });
  audioToggle.addEventListener('blur', () => {
    overToggle = false;
    scheduleCloseMenu();
  });

  audioMenu.addEventListener('mouseenter', () => {
    overMenu = true;
    clearCloseTimer();
  });
  audioMenu.addEventListener('mouseleave', () => {
    overMenu = false;
    scheduleCloseMenu();
  });

  window.addEventListener('resize', () => {
    if (!audioMenu) return;
    if (audioMenu.classList.contains('is-visible')) {
      positionMenu();
    }
  }, { passive: true });
  window.addEventListener('scroll', () => {
    if (audioMenu && audioMenu.classList.contains('is-visible')) {
      positionMenu();
    }
  }, { passive: true });
}

const initTabsRoot = (root) => {
  if (!root || root.dataset.tabsReady === '1') return;
  const buttons = Array.from(root.querySelectorAll('[data-tab-target]'));
  const panels = Array.from(root.querySelectorAll('[data-tab-panel]'));
  if (!buttons.length || !panels.length) return;
  const shell = root.classList.contains('tabs-shell') ? root : root.closest('.tabs-shell');
  const sheet = shell ? shell.querySelector('.tabs-sheet') : null;
  const tabRow = shell ? shell.querySelector('.folder-tabs') : null;
  if (!shell || !sheet || !tabRow) return;
  const tabsIdBase = root.id || root.dataset.tabsId || `tabs-${Math.random().toString(36).slice(2, 8)}`;
  const showPanelLabel = root.dataset.tabPanelLabel !== 'off';
  const getLabelByTarget = (target) => {
    const button = buttons.find((btn) => btn.dataset.tabTarget === target);
    return button ? button.textContent.trim() : '';
  };
  const getButtonByTarget = (target) => buttons.find((btn) => btn.dataset.tabTarget === target);
  const getPanelByTarget = (target) => panels.find((panel) => panel.dataset.tabPanel === target);

  tabRow.setAttribute('role', 'tablist');
  tabRow.setAttribute('aria-label', root.dataset.tablistLabel || 'Sezioni contenuto');

  buttons.forEach((btn, index) => {
    const target = btn.dataset.tabTarget || `tab-${index + 1}`;
    const panelId = `${tabsIdBase}-panel-${target}`;
    const tabId = `${tabsIdBase}-tab-${target}`;
    btn.id = tabId;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', panelId);
    btn.setAttribute('aria-selected', 'false');
    btn.setAttribute('tabindex', '-1');
  });

  panels.forEach((panel, index) => {
    const target = panel.dataset.tabPanel || `tab-${index + 1}`;
    const panelId = `${tabsIdBase}-panel-${target}`;
    const tabId = `${tabsIdBase}-tab-${target}`;
    panel.id = panelId;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
    panel.setAttribute('tabindex', '0');
    panel.hidden = !panel.classList.contains('is-active');
  });

  const ensurePanelLabels = () => {
    if (!showPanelLabel) {
      panels.forEach((panel) => {
        panel.querySelectorAll(':scope > [data-tab-active-label]').forEach((label) => label.remove());
      });
      return;
    }
    panels.forEach((panel) => {
      let label = panel.querySelector(':scope > [data-tab-active-label]');
      if (!label) {
        label = document.createElement('p');
        label.className = 'tab-active-label';
        label.dataset.tabActiveLabel = '';
        label.setAttribute('aria-live', 'polite');
        panel.prepend(label);
      }
      label.textContent = getLabelByTarget(panel.dataset.tabPanel);
    });
  };

  const updateNotch = () => {
    const activeBtn = buttons.find((btn) => btn.classList.contains('is-active')) || buttons[0];
    if (!activeBtn) return;
    const rowRect = tabRow.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const firstBtnRect = buttons[0]?.getBoundingClientRect();
    const left = Math.max(0, btnRect.left - rowRect.left);
    const width = Math.max(0, btnRect.width);
    const isWrapped = Boolean(firstBtnRect) && rowRect.height > (firstBtnRect.height + 6);
    const isOverflowing = tabRow.scrollWidth > (tabRow.clientWidth + 4);
    shell.classList.toggle('is-compact-tabs', isWrapped || isOverflowing);
    shell.style.setProperty('--active-notch-left', `${left.toFixed(2)}px`);
    shell.style.setProperty('--active-notch-width', `${width.toFixed(2)}px`);
  };

  const activate = (target, options = {}) => {
    const { focus = false } = options;
    buttons.forEach((btn) => {
      const isActive = btn.dataset.tabTarget === target;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
      if (focus && isActive) btn.focus();
    });
    panels.forEach((panel) => {
      const isActive = panel.dataset.tabPanel === target;
      panel.classList.toggle('is-active', isActive);
      panel.hidden = !isActive;
    });
    updateNotch();
  };

  const refreshTabsLayout = rafThrottle(() => updateNotch());

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => activate(btn.dataset.tabTarget));
    btn.addEventListener('keydown', (event) => {
      const currentIndex = buttons.indexOf(btn);
      if (currentIndex === -1) return;

      let nextIndex = -1;
      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % buttons.length;
          break;
        case 'ArrowLeft':
          nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = buttons.length - 1;
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          activate(btn.dataset.tabTarget);
          return;
        default:
          return;
      }
      event.preventDefault();
      const nextBtn = buttons[nextIndex];
      if (!nextBtn) return;
      activate(nextBtn.dataset.tabTarget, { focus: true });
    });
  });
  window.addEventListener('resize', refreshTabsLayout, { passive: true });
  window.addEventListener('orientationchange', refreshTabsLayout, { passive: true });
  window.addEventListener('pageshow', refreshTabsLayout, { passive: true });
  document.addEventListener('visibilitychange', refreshTabsLayout, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', refreshTabsLayout, { passive: true });
  }
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => refreshTabsLayout());
    observer.observe(shell);
    observer.observe(tabRow);
    root._tabsResizeObserver = observer;
  }
  root.dataset.tabsReady = '1';
  ensurePanelLabels();
  const activeTarget = buttons.find((btn) => btn.classList.contains('is-active'))?.dataset.tabTarget
    || panels.find((panel) => panel.classList.contains('is-active'))?.dataset.tabPanel
    || buttons[0]?.dataset.tabTarget;
  if (activeTarget) activate(activeTarget);
  refreshTabsLayout();
  window.setTimeout(refreshTabsLayout, 80);
  window.setTimeout(refreshTabsLayout, 220);
  if (document.fonts && typeof document.fonts.ready?.then === 'function') {
    document.fonts.ready.then(refreshTabsLayout).catch(() => {});
  }
};

const slugifyTab = (value, index) => {
  const base = String(value || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return base || `sezione-${index + 1}`;
};

const applyAutoGlassTabs = () => {
  const path = (window.location.pathname || '').toLowerCase();
  const isAlgorithmsCatalog = /\/pages\/algoritmi(?:\/index\.html|\/)?$/.test(path);
  if (isAlgorithmsCatalog) return;
  if (document.querySelector('[data-tabs-root]')) {
    document.querySelectorAll('[data-tabs-root]').forEach(initTabsRoot);
    return;
  }
  const main = document.querySelector('main');
  if (!main) return;
  const host = main.querySelector(':scope > .content-box') || main;
  if (!host || host.dataset.autoTabsApplied === '1') return;
  const sections = Array.from(host.children).filter((el) => el.tagName === 'SECTION');
  if (!sections.length) return;

  const shell = document.createElement('div');
  shell.className = 'tabs-shell';
  const hideTabBar = host.dataset.tabsHideBar === '1' || main.dataset.tabsHideBar === '1' || document.body?.dataset.tabsHideBar === '1';
  if (hideTabBar) shell.classList.add('tabs-hide-bar');
  const panelLabelMode = host.dataset.tabPanelLabel || main.dataset.tabPanelLabel || document.body?.dataset.tabPanelLabel;
  if (panelLabelMode) {
    shell.dataset.tabPanelLabel = panelLabelMode;
  } else if (hideTabBar) {
    shell.dataset.tabPanelLabel = 'off';
  }
  shell.dataset.tabsRoot = '';

  const folderTabs = document.createElement('div');
  folderTabs.className = 'folder-tabs';
  const sheet = document.createElement('div');
  sheet.className = 'tabs-sheet';

  sections.forEach((section, index) => {
    const titleNode = section.querySelector('h2, h1, h3');
    const rawTitle = titleNode ? titleNode.textContent : '';
    const explicitLabel = String(section.dataset.tabLabel || '').trim();
    const label = String(explicitLabel || rawTitle || `Sezione ${index + 1}`).trim().slice(0, 40);
    const target = slugifyTab(label, index);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tab-btn${index === 0 ? ' is-active' : ''}`;
    btn.dataset.tabTarget = target;
    btn.textContent = label || `Sezione ${index + 1}`;

    section.classList.add('tab-panel');
    if (index === 0) section.classList.add('is-active');
    section.dataset.tabPanel = target;

    folderTabs.appendChild(btn);
    sheet.appendChild(section);
  });

  shell.appendChild(folderTabs);
  shell.appendChild(sheet);
  host.appendChild(shell);
  host.dataset.autoTabsApplied = '1';
  initTabsRoot(shell);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyAutoGlassTabs);
  document.addEventListener('DOMContentLoaded', applyUnifiedPageKicker);
} else {
  applyAutoGlassTabs();
  applyUnifiedPageKicker();
}

const smoothScrollToTop = (duration = 600) => {
  const start = window.scrollY || window.pageYOffset;
  if (start <= 0) return;
  const startTime = performance.now();
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const step = (now) => {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(t);
    const nextY = Math.round(start * (1 - eased));
    window.scrollTo(0, nextY);
    if (t < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
};

document.querySelectorAll('[data-scroll-top]').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    smoothScrollToTop();
  });
});

document.querySelectorAll('a[href="#top"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    smoothScrollToTop();
  });
});

const isInternalNavigation = (href) => {
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return false;
  try {
    const target = new URL(href, window.location.href);
    if (target.origin !== window.location.origin) return false;
    if (target.pathname === window.location.pathname && target.hash) return false;
    return true;
  } catch (error) {
    return false;
  }
};

const markPageNavigating = () => {
  document.documentElement.classList.add('is-navigating');
};

const supportsCrossDocumentTransitions = () => {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
  return CSS.supports('view-transition-name: page-main');
};

document.addEventListener('click', (event) => {
  if (event.defaultPrevented) return;
  const anchor = event.target.closest('a[href]');
  if (!anchor) return;
  if (anchor.target && anchor.target !== '_self') return;
  if (anchor.hasAttribute('download')) return;
  const href = anchor.getAttribute('href') || '';
  if (!isInternalNavigation(href)) return;
  if (supportsCrossDocumentTransitions()) return;
  markPageNavigating();
});


