const AD_LAYOUT = Object.freeze({
  TABLET_LANDSCAPE: 1024
});

const ADSENSE_DEFAULT_CONFIG = Object.freeze({
  ENABLED: true,
  CLIENT: 'ca-pub-4257836243471373',
  SLOT_RIGHT: '1365924967',
  SLOT_BOTTOM: '7739761628',
  CMP_TCF_ENABLED: true,
  AUTO_ADS_ENABLED: true
});
const SMARTLINK_CONFIG = Object.freeze({
  ENABLED: false,
  URL: 'https://www.effectivegatecpm.com/nhv153qprr?key=d68e4e2ba05b70ea3652430fd9228177'
});
const RIGHT_RAIL_SMARTLINK_CONFIG = Object.freeze({
  ENABLED: false,
  URL: 'https://www.effectivegatecpm.com/i8my4m0w?key=bc4fe97c1756c654c5515e10e79ebd5d',
  CTA: 'Contenuto sponsorizzato'
});
const RIGHT_REFERRAL_BANNER_CONFIG = Object.freeze({
  ENABLED: true,
  URL: 'https://beta.publishers.adsterra.com/referral/gEwu8JJXMD',
  IMAGE_SRC: 'https://landings-cdn.adsterratech.com/referralBanners/gif/120x150_adsterra_reff.gif',
  LABEL: 'Partner'
});
const RIGHT_ADSTERRA_DISPLAY_CONFIG = Object.freeze({
  ENABLED: true,
  SCRIPT_SRC: 'https://www.highperformanceformat.com/d5db3e693a2e496945214af3d188b975/invoke.js',
  CONTAINER_ID: 'container-right-adsterra-display',
  KEY: 'd5db3e693a2e496945214af3d188b975',
  FORMAT: 'iframe',
  WIDTH: 160,
  HEIGHT: 300,
  LABEL: 'Partner Ad'
});
const BOTTOM_ADSTERRA_DISPLAY_CONFIG = Object.freeze({
  ENABLED: true,
  SCRIPT_SRC: 'https://www.highperformanceformat.com/49e69f729b9a38eace8bec52c40a4ccb/invoke.js',
  CONTAINER_ID: 'container-bottom-adsterra-display',
  KEY: '49e69f729b9a38eace8bec52c40a4ccb',
  FORMAT: 'iframe',
  WIDTH: 320,
  HEIGHT: 50,
  LABEL: 'Partner Ad'
});
const BOTTOM_REFERRAL_BANNER_CONFIG = Object.freeze({
  ENABLED: true,
  URL: 'https://beta.publishers.adsterra.com/referral/gEwu8JJXMD',
  IMAGE_SRC: 'https://landings-cdn.adsterratech.com/referralBanners/png/80%20x%2030%20px.png',
  LABEL: 'Partner'
});

const isLocalDevHost = () => {
  try {
    const host = String(window.location.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost');
  } catch (_) {
    return false;
  }
};

const ADS_THIRD_PARTY_LOCAL_BYPASS = isLocalDevHost();

const CONSENT_STORAGE_KEY = 'cc_cookie_consent_v1';
const CONSENT_EVENT_NAME = 'cc:consent-updated';
const FOOTER_DRAW_CACHE_KEY = 'cc-footer-latest-draw-cache';
const SMARTLINK_SESSION_KEY = 'cc_smartlink_1_opened_v1';

let adsenseLoaderPromise = null;
let fundingChoicesPromise = null;
let adsStylesheetPromise = null;
let consentModeSource = 'custom';
let adsInitialized = false;
let autoAdsInitialized = false;
let rightAdsterraDisplayLoaded = false;
let rightAdsterraFitObserver = null;
let bottomAdsterraDisplayLoaded = false;
let bottomAdsterraFitObserver = null;
let smartlinkArmed = false;
let smartlinkOpened = false;
let consentBannerDeferredTimer = 0;
let consentBannerDeferredHooked = false;
const adViewBound = new WeakSet();
const ADS_DISABLED_PATH_SEGMENTS = Object.freeze([
  '/pages/privacy-policy/',
  '/pages/cookie-policy/',
  '/pages/termini-servizio/',
  '/pages/disclaimer/',
  '/pages/contatti-chi-siamo/'
]);

const resolveAdsenseConfig = () => {
  const override = (window.CC_ADSENSE_CONFIG && typeof window.CC_ADSENSE_CONFIG === 'object')
    ? window.CC_ADSENSE_CONFIG
    : {};
  return {
    ENABLED: Boolean(override.ENABLED ?? ADSENSE_DEFAULT_CONFIG.ENABLED),
    CLIENT: String(override.CLIENT || ADSENSE_DEFAULT_CONFIG.CLIENT || '').trim(),
    SLOT_RIGHT: String(override.SLOT_RIGHT || ADSENSE_DEFAULT_CONFIG.SLOT_RIGHT || '').trim(),
    SLOT_BOTTOM: String(override.SLOT_BOTTOM || ADSENSE_DEFAULT_CONFIG.SLOT_BOTTOM || '').trim(),
    CMP_TCF_ENABLED: Boolean(override.CMP_TCF_ENABLED ?? ADSENSE_DEFAULT_CONFIG.CMP_TCF_ENABLED),
    AUTO_ADS_ENABLED: Boolean(override.AUTO_ADS_ENABLED ?? ADSENSE_DEFAULT_CONFIG.AUTO_ADS_ENABLED)
  };
};

const ADSENSE_CONFIG = resolveAdsenseConfig();

const normalizePagePathname = () => {
  const raw = String(window.location?.pathname || '/').replace(/\\/g, '/').toLowerCase();
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/index\.html$/, '/');
};

const isAdsDisabledByPage = () => {
  const body = document.body;
  const attr = String(
    body?.getAttribute('data-ads-disabled')
    || body?.dataset?.adsDisabled
    || body?.dataset?.ccAdsDisabled
    || ''
  ).trim().toLowerCase();
  if (attr === '1' || attr === 'true' || attr === 'yes' || attr === 'on') return true;

  const pathname = normalizePagePathname();
  return ADS_DISABLED_PATH_SEGMENTS.some((segment) => pathname.includes(segment));
};

const resolveSiteBase = () => {
  const script = document.querySelector('script[src*="assets/js/ads.js"]');
  const rawSrc = script?.getAttribute('src') || '';
  if (!rawSrc) return '/';
  const normalized = rawSrc.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('assets/js/ads.js');
  if (idx === -1) return '/';
  return normalized.slice(0, idx);
};

const resolveAssetHref = (relativePath) => {
  const base = resolveSiteBase();
  if (!relativePath) return base || '/';
  const trimmed = String(relativePath).replace(/^\.?\//, '');
  try {
    const baseUrl = new URL(base || '/', window.location.href);
    return new URL(trimmed, baseUrl).toString();
  } catch (_) {
    return `${base}${trimmed}`;
  }
};

const ensureAdsStylesheet = () => {
  if (adsStylesheetPromise) return adsStylesheetPromise;
  const href = resolveAssetHref('assets/css/ads.css');
  const existing = document.querySelector(`link[data-cc-ads-style="true"][href="${href}"]`)
    || document.querySelector(`link[rel="stylesheet"][href="${href}"]`)
    || document.querySelector('link[href$="assets/css/ads.css"]');
  if (existing) {
    adsStylesheetPromise = Promise.resolve(existing);
    return adsStylesheetPromise;
  }

  adsStylesheetPromise = new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.ccAdsStyle = 'true';
    link.onload = () => resolve(link);
    link.onerror = () => resolve(link);
    document.head.appendChild(link);
  });

  return adsStylesheetPromise;
};

const buildPolicyRowMarkup = (baseHrefPrefix) => `
  <div class="ad-policy-row ad-policy-row--fixed" data-ad-policy-row="true" aria-label="Informazioni legali">
    <div class="ad-policy-row__top">
      <span class="ad-policy-row__brand">SuperEnalotto Control Chaos</span>
    </div>
    <div class="ad-policy-row__links">
      <a class="ad-policy-row__link" href="${baseHrefPrefix}pages/privacy-policy/index.html">Privacy Policy</a>
      <span class="ad-policy-row__sep" aria-hidden="true">|</span>
      <a class="ad-policy-row__link" href="${baseHrefPrefix}pages/cookie-policy/index.html">Cookie Policy</a>
      <span class="ad-policy-row__sep" aria-hidden="true">|</span>
      <a class="ad-policy-row__link" href="${baseHrefPrefix}pages/termini-servizio/index.html">Termini</a>
      <span class="ad-policy-row__sep" aria-hidden="true">|</span>
      <a class="ad-policy-row__link" href="${baseHrefPrefix}pages/disclaimer/index.html">Disclaimer</a>
      <span class="ad-policy-row__sep" aria-hidden="true">|</span>
      <a class="ad-policy-row__link" href="${baseHrefPrefix}pages/contatti-chi-siamo/index.html">Contatti / Chi siamo</a>
      <span class="ad-policy-row__sep" aria-hidden="true">|</span>
      <a class="ad-policy-row__link" href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">AdSense</a>
      <span class="ad-policy-row__sep" aria-hidden="true">|</span>
      <button class="ad-policy-row__button" type="button" data-consent-open="true">Gestisci cookie</button>
    </div>
  </div>
`;

const buildHeaderPolicyMenuMarkup = (baseHrefPrefix) => {
  const href = `${baseHrefPrefix}pages/policy-consenso/index.html`;
  let isActive = false;
  try {
    const currentPath = String(window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
    isActive = currentPath.includes('/pages/policy-consenso/');
  } catch (_) {
    isActive = false;
  }
  return `<a class="cc-nav-link${isActive ? ' is-active' : ''}" href="${href}">Policy e Consenso</a>`;
};

const mountHeaderPolicyMenu = (baseHrefPrefix) => {
  const header = document.getElementById('site-header');
  if (!(header instanceof HTMLElement)) return false;
  const rightHost = header.querySelector('.header-actions__right');
  if (!(rightHost instanceof HTMLElement)) return false;
  rightHost.style.display = '';
  rightHost.hidden = false;
  rightHost.setAttribute('aria-hidden', 'false');
  rightHost.innerHTML = buildHeaderPolicyMenuMarkup(baseHrefPrefix);
  return true;
};

const buildRightRailSmartlinkMarkup = () => {
  if (!RIGHT_RAIL_SMARTLINK_CONFIG.ENABLED) return '';
  const url = String(RIGHT_RAIL_SMARTLINK_CONFIG.URL || '').trim();
  if (!/^https?:\/\//i.test(url)) return '';
  const cta = String(RIGHT_RAIL_SMARTLINK_CONFIG.CTA || 'Apri');
  return `
    <section class="ad-smartlink-card" aria-label="${cta}" data-smartlink-card="right-rail">
      <button class="ad-smartlink-card__cta" type="button" data-smartlink-open-window="true" data-smartlink-url="${url}">
        ${cta}
      </button>
    </section>
  `;
};

const buildBottomReferralBannerMarkup = () => {
  if (!BOTTOM_REFERRAL_BANNER_CONFIG.ENABLED) return '';
  const url = String(BOTTOM_REFERRAL_BANNER_CONFIG.URL || '').trim();
  const src = String(BOTTOM_REFERRAL_BANNER_CONFIG.IMAGE_SRC || '').trim();
  const label = String(BOTTOM_REFERRAL_BANNER_CONFIG.LABEL || 'Partner');
  if (!/^https?:\/\//i.test(url) || !/^https?:\/\//i.test(src)) return '';
  return `
    <a class="ad-referral-badge" href="${url}" target="_blank" rel="nofollow sponsored noopener noreferrer" aria-label="Referral Adsterra (${label})">
      <span class="ad-referral-badge__label">${label}</span>
      <img class="ad-referral-badge__img" alt="Referral Adsterra" src="${src}" width="80" height="30" loading="lazy" decoding="async">
    </a>
  `;
};

const buildRightReferralBannerMarkup = () => {
  if (!RIGHT_REFERRAL_BANNER_CONFIG.ENABLED) return '';
  const url = String(RIGHT_REFERRAL_BANNER_CONFIG.URL || '').trim();
  const src = String(RIGHT_REFERRAL_BANNER_CONFIG.IMAGE_SRC || '').trim();
  const label = String(RIGHT_REFERRAL_BANNER_CONFIG.LABEL || 'Partner');
  if (!/^https?:\/\//i.test(url) || !/^https?:\/\//i.test(src)) return '';
  return `
    <a class="ad-referral-banner" href="${url}" target="_blank" rel="nofollow sponsored noopener noreferrer" aria-label="Referral Adsterra (${label})">
      <span class="ad-referral-banner__label">${label}</span>
      <img class="ad-referral-banner__img" alt="Referral Adsterra" src="${src}" width="120" height="150" loading="lazy" decoding="async">
    </a>
  `;
};

const buildRightAdsterraDisplayMarkup = () => {
  if (!RIGHT_ADSTERRA_DISPLAY_CONFIG.ENABLED) return '';
  const containerId = String(RIGHT_ADSTERRA_DISPLAY_CONFIG.CONTAINER_ID || '').trim();
  const label = String(RIGHT_ADSTERRA_DISPLAY_CONFIG.LABEL || 'Partner Ad');
  if (!containerId) return '';
  return `
    <section class="ad-adsterra-display ad-adsterra-display--right" aria-label="${label}">
      <p class="ad-adsterra-display__label">${label}</p>
      <div class="ad-adsterra-display__host" id="${containerId}"></div>
    </section>
  `;
};

const buildAdsLabelHeadMarkup = (position = 'right') => {
  const config = position === 'bottom' ? BOTTOM_REFERRAL_BANNER_CONFIG : RIGHT_REFERRAL_BANNER_CONFIG;
  const url = String(config?.URL || '').trim();
  const hasLink = config?.ENABLED && /^https?:\/\//i.test(url);
  if (!hasLink) {
    return '<div class="ad-rail__label-head"><span>ANNUNCI</span></div>';
  }
  return `
    <div class="ad-rail__label-head">
      <span>ANNUNCI</span>
      <a class="ad-rail__label-link" href="${url}" target="_blank" rel="nofollow sponsored noopener noreferrer">Contenuti Sponsorizzati</a>
    </div>
  `;
};

const buildBottomAdsterraDisplayMarkup = () => {
  if (!BOTTOM_ADSTERRA_DISPLAY_CONFIG.ENABLED) return '';
  const containerId = String(BOTTOM_ADSTERRA_DISPLAY_CONFIG.CONTAINER_ID || '').trim();
  const label = String(BOTTOM_ADSTERRA_DISPLAY_CONFIG.LABEL || 'Partner Ad');
  if (!containerId) return '';
  return `
    <section class="ad-adsterra-display ad-adsterra-display--bottom" aria-label="${label}">
      <div class="ad-adsterra-display__host" id="${containerId}"></div>
    </section>
  `;
};

const ensureRightAdsterraDisplayLoader = () => {
  if (!RIGHT_ADSTERRA_DISPLAY_CONFIG.ENABLED) return;
  if (rightAdsterraDisplayLoaded) return;
  const containerId = String(RIGHT_ADSTERRA_DISPLAY_CONFIG.CONTAINER_ID || '').trim();
  const scriptSrc = String(RIGHT_ADSTERRA_DISPLAY_CONFIG.SCRIPT_SRC || '').trim();
  const key = String(RIGHT_ADSTERRA_DISPLAY_CONFIG.KEY || '').trim();
  const format = String(RIGHT_ADSTERRA_DISPLAY_CONFIG.FORMAT || 'iframe').trim();
  const width = Number.parseInt(String(RIGHT_ADSTERRA_DISPLAY_CONFIG.WIDTH || ''), 10);
  const height = Number.parseInt(String(RIGHT_ADSTERRA_DISPLAY_CONFIG.HEIGHT || ''), 10);
  if (!containerId || !/^https?:\/\//i.test(scriptSrc)) return;
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!key || !Number.isFinite(width) || !Number.isFinite(height)) return;
  if (container.dataset.adsterraLoaded === '1') {
    rightAdsterraDisplayLoaded = true;
    return;
  }
  container.textContent = '';
  window.atOptions = {
    key,
    format,
    height,
    width,
    params: {}
  };
  const script = document.createElement('script');
  script.async = false;
  script.src = scriptSrc;
  script.setAttribute('data-cfasync', 'false');
  script.dataset.ccAdsterraRightDisplay = 'true';
  script.onload = () => {
    rightAdsterraDisplayLoaded = true;
    container.dataset.adsterraLoaded = '1';
    window.requestAnimationFrame(fitRightAdsterraDisplay);
  };
  script.onerror = () => {
    rightAdsterraDisplayLoaded = false;
    container.dataset.adsterraLoaded = '0';
  };
  container.appendChild(script);
};

const ensureBottomAdsterraDisplayLoader = () => {
  if (!BOTTOM_ADSTERRA_DISPLAY_CONFIG.ENABLED) return;
  if (bottomAdsterraDisplayLoaded) return;
  const containerId = String(BOTTOM_ADSTERRA_DISPLAY_CONFIG.CONTAINER_ID || '').trim();
  const scriptSrc = String(BOTTOM_ADSTERRA_DISPLAY_CONFIG.SCRIPT_SRC || '').trim();
  const key = String(BOTTOM_ADSTERRA_DISPLAY_CONFIG.KEY || '').trim();
  const format = String(BOTTOM_ADSTERRA_DISPLAY_CONFIG.FORMAT || 'iframe').trim();
  const width = Number.parseInt(String(BOTTOM_ADSTERRA_DISPLAY_CONFIG.WIDTH || ''), 10);
  const height = Number.parseInt(String(BOTTOM_ADSTERRA_DISPLAY_CONFIG.HEIGHT || ''), 10);
  if (!containerId || !/^https?:\/\//i.test(scriptSrc)) return;
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!key || !Number.isFinite(width) || !Number.isFinite(height)) return;
  if (container.dataset.adsterraLoaded === '1') {
    bottomAdsterraDisplayLoaded = true;
    return;
  }
  container.textContent = '';
  window.atOptions = { key, format, height, width, params: {} };
  const script = document.createElement('script');
  script.async = false;
  script.src = scriptSrc;
  script.setAttribute('data-cfasync', 'false');
  script.dataset.ccAdsterraBottomDisplay = 'true';
  script.onload = () => {
    bottomAdsterraDisplayLoaded = true;
    container.dataset.adsterraLoaded = '1';
    window.requestAnimationFrame(fitBottomAdsterraDisplay);
  };
  script.onerror = () => {
    bottomAdsterraDisplayLoaded = false;
    container.dataset.adsterraLoaded = '0';
  };
  container.appendChild(script);
};

const fitRightAdsterraDisplay = () => {
  const containerId = String(RIGHT_ADSTERRA_DISPLAY_CONFIG.CONTAINER_ID || '').trim();
  if (!containerId) return;
  const host = document.getElementById(containerId);
  if (!(host instanceof HTMLElement)) return;
  const child = host.querySelector('iframe, div, img');
  if (!(child instanceof HTMLElement)) return;

  host.classList.add('is-fit-host');
  child.style.transform = '';
  child.style.transformOrigin = 'top center';

  const hostRect = host.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  if (!hostRect.width || !hostRect.height || !childRect.width || !childRect.height) return;

  const scaleX = hostRect.width / childRect.width;
  const scaleY = hostRect.height / childRect.height;
  const scale = Math.min(1, scaleX, scaleY);
  if (scale < 0.999) {
    child.style.transform = `scale(${scale})`;
  }
};

const ensureRightAdsterraDisplayFitObserver = () => {
  const containerId = String(RIGHT_ADSTERRA_DISPLAY_CONFIG.CONTAINER_ID || '').trim();
  if (!containerId) return;
  const host = document.getElementById(containerId);
  if (!(host instanceof HTMLElement)) return;

  if (rightAdsterraFitObserver) rightAdsterraFitObserver.disconnect();
  rightAdsterraFitObserver = new MutationObserver(() => {
    window.requestAnimationFrame(fitRightAdsterraDisplay);
  });
  rightAdsterraFitObserver.observe(host, { childList: true, subtree: true });
  window.requestAnimationFrame(fitRightAdsterraDisplay);
};

const fitBottomAdsterraDisplay = () => {
  const containerId = String(BOTTOM_ADSTERRA_DISPLAY_CONFIG.CONTAINER_ID || '').trim();
  if (!containerId) return;
  const host = document.getElementById(containerId);
  if (!(host instanceof HTMLElement)) return;
  const child = host.querySelector('iframe, div, img');
  if (!(child instanceof HTMLElement)) return;
  child.style.transform = '';
  child.style.transformOrigin = 'top left';
  const hostRect = host.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  if (!hostRect.width || !hostRect.height || !childRect.width || !childRect.height) return;
  const scale = Math.min(1, hostRect.width / childRect.width, hostRect.height / childRect.height);
  if (scale < 0.999) child.style.transform = `scale(${scale})`;
};

const ensureBottomAdsterraDisplayFitObserver = () => {
  const containerId = String(BOTTOM_ADSTERRA_DISPLAY_CONFIG.CONTAINER_ID || '').trim();
  if (!containerId) return;
  const host = document.getElementById(containerId);
  if (!(host instanceof HTMLElement)) return;
  if (bottomAdsterraFitObserver) bottomAdsterraFitObserver.disconnect();
  bottomAdsterraFitObserver = new MutationObserver(() => {
    window.requestAnimationFrame(fitBottomAdsterraDisplay);
  });
  bottomAdsterraFitObserver.observe(host, { childList: true, subtree: true });
  window.requestAnimationFrame(fitBottomAdsterraDisplay);
};

let rightRailSmartlinkUiWired = false;

const wireRightRailSmartlinkUi = () => {
  if (rightRailSmartlinkUiWired) return;
  rightRailSmartlinkUiWired = true;

  document.addEventListener('click', (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const openWindowBtn = target.closest('[data-smartlink-open-window="true"]');
    if (!openWindowBtn) return;
    event.preventDefault();
    const url = String(openWindowBtn.getAttribute('data-smartlink-url') || '').trim();
    if (!/^https?:\/\//i.test(url)) return;
    try {
      window.open(url, '_blank', 'noopener,noreferrer,width=460,height=760');
    } catch (_) {
      // no-op
    }
  });
};

const getBaseVersion = () => {
  const raw = String(window.CC_VERSION || '00.00.000').trim();
  return raw || '00.00.000';
};

const normalizeDrawSeq = (value) => {
  const n = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(n) || n < 0) return '';
  return String(n).padStart(5, '0');
};

const resolveLatestDrawSeq = async () => {
  const cachedWindow = normalizeDrawSeq(window.CC_LAST_DRAW);
  if (cachedWindow) return cachedWindow;

  const now = Date.now();
  try {
    const cached = window.sessionStorage.getItem(FOOTER_DRAW_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Number.isFinite(parsed.ts) && (now - parsed.ts) < 5 * 60 * 1000) {
        const seq = normalizeDrawSeq(parsed.value);
        if (seq) return seq;
      }
    }
  } catch (_) {
    // ignore storage access issues
  }

  try {
    const response = await fetch(`${resolveSiteBase()}archives/draws/draws.csv`, { cache: 'no-store' });
    if (!response.ok) return '';
    const raw = await response.text();
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
    if (lines.length < 2) return '';

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map((cell) => cell.trim().toUpperCase());
    const seqIndex = headers.findIndex((name) => name === 'NR. SEQUENZIALE' || name === 'CONCORSO');
    const lastParts = lines[lines.length - 1].split(delimiter).map((cell) => cell.trim());
    const seqRaw = seqIndex >= 0 ? lastParts[seqIndex] : lastParts[0];
    const seq = normalizeDrawSeq(seqRaw);
    if (!seq) return '';
    try {
      window.sessionStorage.setItem(FOOTER_DRAW_CACHE_KEY, JSON.stringify({ value: seq, ts: now }));
    } catch (_) {
      // ignore storage quota/privacy failures
    }
    return seq;
  } catch (_) {
    return '';
  }
};

const buildPolicyBrandText = (drawSeq) => {
  const base = getBaseVersion();
  const suffix = drawSeq ? `.${drawSeq}` : '';
  return `SuperEnalotto Control Chaos ${base}${suffix}`;
};

const buildFooterVersionText = (drawSeq) => {
  const base = getBaseVersion();
  const suffix = drawSeq ? `.${drawSeq}` : '';
  return `${base}${suffix}`;
};

const syncPolicyBrandVersion = async (policyRow) => {
  if (!(policyRow instanceof HTMLElement)) return;
  const brand = policyRow.querySelector('.ad-policy-row__brand');
  if (!(brand instanceof HTMLElement)) return;

  const immediateSeq = normalizeDrawSeq(window.CC_LAST_DRAW);
  brand.textContent = buildPolicyBrandText(immediateSeq);

  const latestSeq = await resolveLatestDrawSeq();
  if (latestSeq) {
    window.CC_LAST_DRAW = String(Number.parseInt(latestSeq, 10));
  }
  brand.textContent = buildPolicyBrandText(latestSeq || immediateSeq);
};

const ensureFooterVersionBadge = () => {
  let host = document.querySelector('[data-cc-footer-version="true"]');
  if (host instanceof HTMLElement) return host;
  host = document.createElement('div');
  host.className = 'cc-footer-version-fixed';
  host.dataset.ccFooterVersion = 'true';
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = '<span class="cc-footer-version-fixed__pill"></span>';
  document.body.appendChild(host);
  return host;
};

const syncFooterVersionBadge = async () => {
  const host = ensureFooterVersionBadge();
  if (!(host instanceof HTMLElement)) return;
  const pill = host.querySelector('.cc-footer-version-fixed__pill');
  if (!(pill instanceof HTMLElement)) return;

  const immediateSeq = normalizeDrawSeq(window.CC_LAST_DRAW);
  pill.textContent = buildFooterVersionText(immediateSeq);

  const latestSeq = await resolveLatestDrawSeq();
  if (latestSeq) {
    window.CC_LAST_DRAW = String(Number.parseInt(latestSeq, 10));
  }
  pill.textContent = buildFooterVersionText(latestSeq || immediateSeq);
};

const getStoredConsent = () => {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed.ads;
    if (value !== 'granted' && value !== 'denied') return null;
    return parsed;
  } catch (error) {
    return null;
  }
};

const persistConsent = (adsValue) => {
  const normalized = adsValue === 'granted' ? 'granted' : 'denied';
  const payload = {
    ads: normalized,
    analytics: normalized,
    updatedAt: new Date().toISOString()
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    return payload;
  }
  return payload;
};

const applyConsentMode = (consent) => {
  if (typeof window.gtag !== 'function') return;
  const granted = consent?.ads === 'granted';
  window.gtag('consent', 'update', {
    ad_storage: granted ? 'granted' : 'denied',
    ad_user_data: granted ? 'granted' : 'denied',
    ad_personalization: granted ? 'granted' : 'denied',
    analytics_storage: granted ? 'granted' : 'denied'
  });
};

const extractPublisherId = () => {
  const m = ADSENSE_CONFIG.CLIENT.match(/^ca-(pub-[0-9]+)$/i);
  return m ? m[1] : '';
};

const ensureFundingChoicesLoader = () => {
  if (ADS_THIRD_PARTY_LOCAL_BYPASS) return Promise.resolve(null);
  if (!ADSENSE_CONFIG.CMP_TCF_ENABLED) return Promise.resolve(null);
  if (fundingChoicesPromise) return fundingChoicesPromise;

  const publisherId = extractPublisherId();
  if (!publisherId) {
    fundingChoicesPromise = Promise.resolve(null);
    return fundingChoicesPromise;
  }

  const existing = document.querySelector('script[data-cc-fundingchoices-loader="true"]');
  if (existing) {
    fundingChoicesPromise = Promise.resolve(existing);
    return fundingChoicesPromise;
  }

  fundingChoicesPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.dataset.ccFundingchoicesLoader = 'true';
    script.src = `https://fundingchoicesmessages.google.com/i/${publisherId}?ers=1`;
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error('fundingchoices-loader-failed'));
    document.head.appendChild(script);
  });

  return fundingChoicesPromise;
};

const waitForTcfApi = (timeoutMs = 3500) => new Promise((resolve) => {
  if (typeof window.__tcfapi === 'function') {
    resolve(true);
    return;
  }
  const start = Date.now();
  const timer = window.setInterval(() => {
    if (typeof window.__tcfapi === 'function') {
      window.clearInterval(timer);
      resolve(true);
      return;
    }
    if ((Date.now() - start) >= timeoutMs) {
      window.clearInterval(timer);
      resolve(false);
    }
  }, 120);
});

const readTcfConsent = (timeoutMs = 5000) => new Promise((resolve) => {
  if (typeof window.__tcfapi !== 'function') {
    resolve({ available: false, granted: false });
    return;
  }

  let settled = false;
  const onDone = (value) => {
    if (settled) return;
    settled = true;
    resolve(value);
  };

  const timeout = window.setTimeout(() => {
    onDone({ available: true, granted: false });
  }, timeoutMs);

  try {
    window.__tcfapi('addEventListener', 2, (tcData, success) => {
      if (!success || !tcData) return;
      const status = String(tcData.eventStatus || '').toLowerCase();
      if (status !== 'tcloaded' && status !== 'useractioncomplete') return;

      const purpose = tcData.purpose?.consents || {};
      const vendor = tcData.vendor?.consents || {};
      const googleVendorGranted = Boolean(vendor[755] || vendor['755']);
      const granted = Boolean(purpose[1] && purpose[3] && purpose[4] && googleVendorGranted);

      window.clearTimeout(timeout);
      onDone({ available: true, granted });
    });
  } catch (error) {
    window.clearTimeout(timeout);
    onDone({ available: true, granted: false });
  }
});

const ensureAdsenseLoader = () => {
  if (ADS_THIRD_PARTY_LOCAL_BYPASS) {
    return Promise.reject(new Error('adsense-localhost-bypass'));
  }
  if (!ADSENSE_CONFIG.ENABLED) {
    return Promise.reject(new Error('adsense-disabled'));
  }
  if (adsenseLoaderPromise) return adsenseLoaderPromise;
  const existingBySrc = document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]');
  if (existingBySrc) {
    adsenseLoaderPromise = Promise.resolve(existingBySrc);
    return adsenseLoaderPromise;
  }
  const existingScript = document.querySelector('script[data-cc-adsense-loader="true"]');
  if (existingScript) {
    adsenseLoaderPromise = Promise.resolve(existingScript);
    return adsenseLoaderPromise;
  }
  adsenseLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.dataset.ccAdsenseLoader = 'true';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CONFIG.CLIENT)}`;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error('adsense-loader-failed'));
    document.head.appendChild(script);
  });
  return adsenseLoaderPromise;
};

const ensureAutoAds = async () => {
  if (autoAdsInitialized) return;
  if (!ADSENSE_CONFIG.ENABLED) return;
  if (!ADSENSE_CONFIG.AUTO_ADS_ENABLED) return;
  if (isAdsDisabledByPage()) return;
  const consent = getStoredConsent();
  if (!consent || consent.ads !== 'granted') return;

  try {
    await ensureAdsenseLoader();
    (window.adsbygoogle = window.adsbygoogle || []).push({
      google_ad_client: ADSENSE_CONFIG.CLIENT,
      enable_page_level_ads: true
    });
    autoAdsInitialized = true;
  } catch (_) {
    // fallback to manual slots only
  }
};

const hasOpenedSmartlinkThisSession = () => {
  if (smartlinkOpened) return true;
  try {
    return window.sessionStorage.getItem(SMARTLINK_SESSION_KEY) === '1';
  } catch (_) {
    return false;
  }
};

const markSmartlinkOpened = () => {
  smartlinkOpened = true;
  try {
    window.sessionStorage.setItem(SMARTLINK_SESSION_KEY, '1');
  } catch (_) {
    // ignore storage failures
  }
};

const canOpenSmartlink = () => {
  if (!SMARTLINK_CONFIG.ENABLED) return false;
  const target = String(SMARTLINK_CONFIG.URL || '').trim();
  if (!/^https?:\/\//i.test(target)) return false;
  if (isAdsDisabledByPage()) return false;
  if (hasOpenedSmartlinkThisSession()) return false;
  const consent = getStoredConsent();
  return Boolean(consent && consent.ads === 'granted');
};

const tryOpenSmartlink = () => {
  if (!canOpenSmartlink()) return false;
  const target = String(SMARTLINK_CONFIG.URL || '').trim();
  try {
    const popup = window.open(target, '_blank', 'noopener,noreferrer');
    if (!popup) return false;
    markSmartlinkOpened();
    return true;
  } catch (_) {
    return false;
  }
};

const armSmartlink = () => {
  if (smartlinkArmed) return;
  if (!SMARTLINK_CONFIG.ENABLED) return;
  smartlinkArmed = true;

  const onFirstUserGesture = () => {
    if (!tryOpenSmartlink()) return;
    document.removeEventListener('click', onFirstUserGesture, true);
    document.removeEventListener('touchend', onFirstUserGesture, true);
    document.removeEventListener('keydown', onKeyDown, true);
  };

  const onKeyDown = (event) => {
    const key = String(event?.key || '').toLowerCase();
    if (key !== 'enter' && key !== ' ') return;
    onFirstUserGesture();
  };

  document.addEventListener('click', onFirstUserGesture, true);
  document.addEventListener('touchend', onFirstUserGesture, true);
  document.addEventListener('keydown', onKeyDown, true);
};

const createBlockedNotice = (title = 'Annunci sospesi', text = 'Apri "Gestisci cookie" per attivare AdSense.') => {
  const notice = document.createElement('div');
  notice.className = 'ad-slot__notice';
  notice.innerHTML = `
    <p class="ad-slot__notice-title">${title}</p>
    <p class="ad-slot__notice-text">${text}</p>
  `;
  return notice;
};

const isValidSlotId = (value) => /^\d{8,}$/.test(String(value || '').trim());

const getSlotForPosition = (position) => {
  const slot = position === 'bottom' ? ADSENSE_CONFIG.SLOT_BOTTOM : ADSENSE_CONFIG.SLOT_RIGHT;
  return String(slot || '').trim();
};

const createAdsenseNode = (position) => {
  const slotValue = getSlotForPosition(position);
  if (!isValidSlotId(slotValue)) {
    throw new Error(`slot-not-configured:${position}`);
  }

  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.style.width = '100%';
  ins.style.height = '100%';
  ins.setAttribute('data-ad-client', ADSENSE_CONFIG.CLIENT);
  ins.setAttribute('data-ad-slot', slotValue);
  ins.setAttribute('data-ad-format', 'auto');
  ins.setAttribute('data-full-width-responsive', 'true');
  return ins;
};

const renderAdsSlot = async (slotNode, position) => {
  if (!(slotNode instanceof HTMLElement)) return;

  if (typeof window.CC_RENDER_AD_SLOT === 'function') {
    try {
      slotNode.textContent = '';
      window.CC_RENDER_AD_SLOT(slotNode);
      slotNode.dataset.ccAdMode = 'custom';
      return;
    } catch (error) {
      slotNode.dataset.ccAdMode = 'custom-error';
    }
  }

  const consent = getStoredConsent();
  if (!consent || consent.ads !== 'granted') {
    slotNode.textContent = '';
    slotNode.appendChild(createBlockedNotice());
    slotNode.dataset.ccAdMode = 'blocked';
    return;
  }

  const slotId = getSlotForPosition(position);
  if (!isValidSlotId(slotId)) {
    slotNode.textContent = '';
    slotNode.appendChild(createBlockedNotice('Slot non configurato', 'Imposta SLOT_RIGHT e SLOT_BOTTOM con ID AdSense reali.'));
    slotNode.dataset.ccAdMode = 'slot-missing';
    return;
  }

  try {
    await ensureAdsenseLoader();
    slotNode.textContent = '';
    const ins = createAdsenseNode(position);
    slotNode.appendChild(ins);
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    slotNode.dataset.ccAdMode = 'adsense';
  } catch (error) {
    slotNode.textContent = '';
    slotNode.appendChild(createBlockedNotice());
    slotNode.dataset.ccAdMode = 'loader-error';
  }

  bindAdTelemetry(slotNode, position);
};

const bindAdTelemetry = (slotNode, position) => {
  if (!(slotNode instanceof HTMLElement)) return;
  const telemetry = window.CC_TELEMETRY;
  if (!telemetry || typeof telemetry.observeImpression !== 'function') return;
  if (adViewBound.has(slotNode)) return;
  adViewBound.add(slotNode);
  const slotId = getSlotForPosition(position) || 'unknown';
  telemetry.observeImpression(slotNode, 'ads_slot_view', () => ({
    slot_id: slotId,
    position,
    ad_mode: slotNode.dataset.ccAdMode || 'unknown'
  }), {
    dedupKey: `ads_slot_view:${position}:${slotId}`
  });
};

const createConsentBanner = () => {
  const banner = document.createElement('aside');
  banner.className = 'cc-consent-banner';
  banner.dataset.ccConsentBanner = 'true';
  banner.hidden = true;
  banner.style.display = 'none';
  banner.innerHTML = `
    <div class="cc-consent-banner__box" role="dialog" aria-live="polite" aria-label="Gestione consenso cookie">
      <p class="cc-consent-banner__title">Cookie e annunci</p>
      <p class="cc-consent-banner__text">
        Usiamo cookie per annunci AdSense e misurazione. Puoi accettare o rifiutare.
      </p>
      <div class="cc-consent-banner__actions">
        <button type="button" class="cc-consent-banner__btn cc-consent-banner__btn--accept" data-consent-action="accept">Accetta</button>
        <button type="button" class="cc-consent-banner__btn cc-consent-banner__btn--reject" data-consent-action="reject">Rifiuta</button>
      </div>
    </div>
  `;
  return banner;
};

const ensureConsentBanner = () => {
  let banner = document.querySelector('[data-cc-consent-banner="true"]');
  if (!banner) {
    banner = createConsentBanner();
    document.body.appendChild(banner);
  }
  return banner;
};

const showConsentBannerNow = (banner) => {
  if (!(banner instanceof HTMLElement)) return;
  banner.hidden = false;
  banner.style.display = '';
};

const scheduleConsentBannerShow = (banner) => {
  if (!(banner instanceof HTMLElement)) return;
  if (banner.dataset.ccConsentVisibleScheduled === '1') return;
  banner.dataset.ccConsentVisibleScheduled = '1';

  const show = () => {
    if (consentBannerDeferredTimer) {
      window.clearTimeout(consentBannerDeferredTimer);
      consentBannerDeferredTimer = 0;
    }
    banner.dataset.ccConsentVisibleScheduled = '0';
    showConsentBannerNow(banner);
  };

  const armTimer = () => {
    if (consentBannerDeferredTimer) return;
    consentBannerDeferredTimer = window.setTimeout(show, 1400);
  };

  if (!consentBannerDeferredHooked) {
    consentBannerDeferredHooked = true;
    window.addEventListener('load', armTimer, { once: true, passive: true });
  }

  if (document.readyState === 'complete') {
    armTimer();
    return;
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(armTimer, { timeout: 2200 });
  } else {
    window.setTimeout(armTimer, 900);
  }
};

const toggleConsentBanner = (forceVisible, options = {}) => {
  const banner = ensureConsentBanner();
  const immediate = Boolean(options.immediate);
  if (forceVisible) {
    if (immediate) {
      showConsentBannerNow(banner);
      return;
    }
    scheduleConsentBannerShow(banner);
  } else {
    if (consentBannerDeferredTimer) {
      window.clearTimeout(consentBannerDeferredTimer);
      consentBannerDeferredTimer = 0;
    }
    banner.dataset.ccConsentVisibleScheduled = '0';
    banner.hidden = true;
    banner.style.display = 'none';
  }
};

const emitConsentUpdated = (payload) => {
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT_NAME, { detail: payload }));
};

const openConsentUi = () => {
  if (consentModeSource === 'tcf' && window.googlefc && typeof window.googlefc.showRevocationMessage === 'function') {
    try {
      window.googlefc.showRevocationMessage();
      return;
    } catch (error) {
      // fallback below
    }
  }
  toggleConsentBanner(true, { immediate: true });
};

const wireConsentUi = () => {
  const banner = ensureConsentBanner();
  banner.addEventListener('click', (event) => {
    const actionTarget = event.target instanceof HTMLElement
      ? event.target.closest('[data-consent-action]')
      : null;
    if (!actionTarget) return;
    const action = actionTarget.getAttribute('data-consent-action');
    const consent = persistConsent(action === 'accept' ? 'granted' : 'denied');
    applyConsentMode(consent);
    toggleConsentBanner(false);
    emitConsentUpdated(consent);
  });

  document.addEventListener('click', (event) => {
    const openBtn = event.target instanceof HTMLElement
      ? event.target.closest('[data-consent-open="true"]')
      : null;
    if (!openBtn) return;
    event.preventDefault();
    openConsentUi();
  });
};

const initConsentSource = async () => {
  if (!ADSENSE_CONFIG.CMP_TCF_ENABLED) {
    consentModeSource = 'custom';
    return;
  }

  try {
    await ensureFundingChoicesLoader();
    const tcfApiAvailable = await waitForTcfApi(3500);
    if (!tcfApiAvailable) {
      consentModeSource = 'custom';
      return;
    }

    const tcfConsent = await readTcfConsent(5000);
    consentModeSource = tcfConsent.available ? 'tcf' : 'custom';

    if (tcfConsent.available) {
      const consent = persistConsent(tcfConsent.granted ? 'granted' : 'denied');
      applyConsentMode(consent);
      toggleConsentBanner(false);
      emitConsentUpdated(consent);
      return;
    }
  } catch (error) {
    consentModeSource = 'custom';
  }
};

const pickFirstElement = (selectors = []) => {
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (node instanceof HTMLElement) return node;
  }
  return null;
};

const resolveAdHost = (position) => {
  const rightSelectors = [
    '[data-ad-host="right"]',
    '[data-cc-ad-host="right"]',
    '[data-ads-host="right"]',
    '#ad-slot-right',
    '#ads-slot-right',
    '#ad-right-slot',
    '.ad-slot-host--right'
  ];
  const bottomSelectors = [
    '[data-ad-host="bottom"]',
    '[data-cc-ad-host="bottom"]',
    '[data-ads-host="bottom"]',
    '#ad-slot-bottom',
    '#ads-slot-bottom',
    '#ad-bottom-slot',
    '.ad-slot-host--bottom'
  ];
  return pickFirstElement(position === 'bottom' ? bottomSelectors : rightSelectors);
};

const resolveAdContainer = (host, position) => {
  if (!(host instanceof HTMLElement)) return null;
  const rightContainerSelectors = '.ad-rail--right, .ad-rail, [data-ad-rail="right"], [data-cc-ad-container="right"]';
  const bottomContainerSelectors = '.bottom-ad, [data-bottom-ad="true"], [data-cc-ad-container="bottom"]';
  const selector = position === 'bottom' ? bottomContainerSelectors : rightContainerSelectors;
  return host.closest(selector) || host;
};

const waitForInitialAdsWarmup = () => new Promise((resolve) => {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    resolve();
  };

  if (document.readyState === 'complete') {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => finish(), { timeout: 1200 });
    } else {
      window.setTimeout(finish, 500);
    }
    return;
  }

  window.addEventListener('load', () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => finish(), { timeout: 1200 });
      return;
    }
    window.setTimeout(finish, 500);
  }, { once: true, passive: true });

  window.setTimeout(finish, 1800);
});

const ensureAds = () => {
  if (adsInitialized) return;
  adsInitialized = true;
  ensureAdsStylesheet();

  const root = document.documentElement;
  const baseHrefPrefix = resolveSiteBase();
  const adsDisabledForPage = isAdsDisabledByPage();
  const adsenseStandby = !ADSENSE_CONFIG.ENABLED;
  const disableDisplayAds = adsDisabledForPage || adsenseStandby;
  root.dataset.ccAdsMonetization = disableDisplayAds
    ? (adsenseStandby ? 'adsense-standby' : 'disabled')
    : 'enabled';
  let rightHost = resolveAdHost('right');
  let rightRail = resolveAdContainer(rightHost, 'right');
  const rightCreated = !(rightHost && rightRail);
  if (rightCreated) {
    rightRail = document.createElement('aside');
    rightRail.className = 'ad-rail ad-rail--right';
    rightRail.dataset.adRail = 'right';
    rightRail.dataset.ccAdsRoot = 'true';
    rightRail.setAttribute('aria-label', 'Annunci laterali');
    rightRail.innerHTML = `
      <div class="ad-rail__panel">
        ${buildAdsLabelHeadMarkup('right')}
        ${buildRightRailSmartlinkMarkup()}
        ${buildRightAdsterraDisplayMarkup()}
        ${buildRightReferralBannerMarkup()}
        <div class="ad-slot-host" data-ad-host="right"></div>
      </div>
    `;
    rightHost = rightRail.querySelector('[data-ad-host="right"]');
  }

  let bottomHost = resolveAdHost('bottom');
  let bottomAd = resolveAdContainer(bottomHost, 'bottom');
  const bottomCreated = !(bottomHost && bottomAd);
  if (bottomCreated) {
    bottomAd = document.createElement('aside');
    bottomAd.className = 'bottom-ad';
    bottomAd.dataset.bottomAd = 'true';
    bottomAd.dataset.ccAdsRoot = 'true';
    bottomAd.setAttribute('aria-label', 'Annunci in basso');
    bottomAd.innerHTML = `
      <div class="bottom-ad__panel">
        ${buildAdsLabelHeadMarkup('bottom')}
        ${buildRightRailSmartlinkMarkup()}
        ${buildBottomAdsterraDisplayMarkup()}
        ${buildBottomReferralBannerMarkup()}
        <div class="ad-slot-host" data-ad-host="bottom"></div>
      </div>
    `;
    bottomHost = bottomAd.querySelector('[data-ad-host="bottom"]');
  }
  rightRail.dataset.ccAdsRoot = 'true';
  bottomAd.dataset.ccAdsRoot = 'true';
  bottomAd.dataset.bottomAd = 'true';

  let policyRow = document.querySelector('[data-cc-ads-policy="true"]');
  const policyCreated = !(policyRow instanceof HTMLElement);
  if (!(policyRow instanceof HTMLElement)) {
    policyRow = document.createElement('aside');
    policyRow.className = 'ad-policy-fixed';
    policyRow.dataset.ccAdsPolicy = 'true';
    policyRow.innerHTML = buildPolicyRowMarkup(baseHrefPrefix);
  }
  syncPolicyBrandVersion(policyRow);
  syncFooterVersionBadge();
  const policyMountedInHeader = mountHeaderPolicyMenu(baseHrefPrefix);
  if (policyMountedInHeader && policyRow?.parentElement) {
    policyRow.remove();
  }

  if (disableDisplayAds) {
    root.style.setProperty('--ad-reserve-bottom', '0px');
    root.style.setProperty('--ad-reserve-left', '0px');
    root.style.setProperty('--ad-reserve-right', '0px');
    root.style.setProperty('--ad-rail-bottom', '0px');
    if (!policyMountedInHeader && policyCreated) document.body.appendChild(policyRow);
    wireConsentUi();

    const startPolicyOnly = async () => {
      await waitForInitialAdsWarmup();
      await initConsentSource();
      if (consentModeSource !== 'tcf') {
        const consent = getStoredConsent();
        applyConsentMode(consent);
        toggleConsentBanner(!consent);
      }
      armSmartlink();
    };

    startPolicyOnly();
    return;
  }

  const adSlot = document.createElement('div');
  adSlot.className = 'ad-slot';
  adSlot.dataset.ccAdSlot = 'main';
  let currentPosition = 'right';

  const moveSlotTo = (host, position) => {
    if (!host) return;
    if (adSlot.parentElement !== host) {
      host.appendChild(adSlot);
    }
    currentPosition = position;
  };

  const updateLayoutReserve = () => {
    const rightVisible = !rightRail.hidden;
    const bottomVisible = !bottomAd.hidden;
    const reserveRight = rightVisible
      ? Math.ceil((rightRail.getBoundingClientRect().width || 0) + 16)
      : 0;
    const reserveBottom = bottomVisible
      ? Math.ceil((bottomAd.getBoundingClientRect().height || 0) + 8)
      : 0;

    root.style.setProperty('--ad-reserve-bottom', `${reserveBottom}px`);
    root.style.setProperty('--ad-reserve-left', '0px');
    root.style.setProperty('--ad-reserve-right', `${reserveRight}px`);
    root.style.setProperty('--ad-rail-bottom', `${reserveBottom}px`);
  };

  const rerenderCurrentAd = () => {
    renderAdsSlot(adSlot, currentPosition);
  };

  const updateAdLayout = () => {
    const width = Math.max(0, window.innerWidth || document.documentElement.clientWidth || 0);
    const showRightRail = width >= AD_LAYOUT.TABLET_LANDSCAPE;

    if (showRightRail) {
      rightRail.hidden = false;
      bottomAd.hidden = true;
      if (rightCreated) rightRail.style.display = '';
      if (bottomCreated) bottomAd.style.display = 'none';
      root.dataset.adRail = 'right';
      moveSlotTo(rightHost, 'right');
    } else {
      rightRail.hidden = true;
      bottomAd.hidden = false;
      if (rightCreated) rightRail.style.display = 'none';
      if (bottomCreated) bottomAd.style.display = '';
      root.dataset.adRail = 'bottom';
      moveSlotTo(bottomHost, 'bottom');
    }

    if (showRightRail) {
      ensureRightAdsterraDisplayLoader();
      ensureRightAdsterraDisplayFitObserver();
    } else {
      ensureBottomAdsterraDisplayLoader();
      ensureBottomAdsterraDisplayFitObserver();
    }

    updateLayoutReserve();
    rerenderCurrentAd();
  };

  if (rightCreated) document.body.appendChild(rightRail);
  if (bottomCreated) document.body.appendChild(bottomAd);
  if (!policyMountedInHeader && policyCreated) document.body.appendChild(policyRow);

  wireConsentUi();
  wireRightRailSmartlinkUi();

  const start = async () => {
    await waitForInitialAdsWarmup();
    await initConsentSource();
    if (consentModeSource !== 'tcf') {
      const consent = getStoredConsent();
      applyConsentMode(consent);
      toggleConsentBanner(!consent);
    }
    await ensureAutoAds();
    armSmartlink();
    updateAdLayout();
  };

  start();

  let layoutRaf = 0;
  const scheduleAdLayout = () => {
    if (layoutRaf) return;
    layoutRaf = window.requestAnimationFrame(() => {
      layoutRaf = 0;
      updateAdLayout();
    });
  };
  window.addEventListener('load', scheduleAdLayout, { passive: true });
  window.addEventListener('resize', () => {
    scheduleAdLayout();
    window.requestAnimationFrame(fitRightAdsterraDisplay);
    window.requestAnimationFrame(fitBottomAdsterraDisplay);
  }, { passive: true });
  window.addEventListener(CONSENT_EVENT_NAME, () => {
    ensureAutoAds();
    armSmartlink();
    rerenderCurrentAd();
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureAds);
} else {
  ensureAds();
}
