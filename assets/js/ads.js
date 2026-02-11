const AD_LAYOUT = Object.freeze({
  TABLET_LANDSCAPE: 1024
});

const ADSENSE_DEFAULT_CONFIG = Object.freeze({
  CLIENT: 'ca-pub-5166608547474961',
  SLOT_RIGHT: '',
  SLOT_BOTTOM: '',
  CMP_TCF_ENABLED: true
});

const CONSENT_STORAGE_KEY = 'cc_cookie_consent_v1';
const CONSENT_EVENT_NAME = 'cc:consent-updated';

let adsenseLoaderPromise = null;
let fundingChoicesPromise = null;
let consentModeSource = 'custom';

const resolveAdsenseConfig = () => {
  const override = (window.CC_ADSENSE_CONFIG && typeof window.CC_ADSENSE_CONFIG === 'object')
    ? window.CC_ADSENSE_CONFIG
    : {};
  return {
    CLIENT: String(override.CLIENT || ADSENSE_DEFAULT_CONFIG.CLIENT || '').trim(),
    SLOT_RIGHT: String(override.SLOT_RIGHT || ADSENSE_DEFAULT_CONFIG.SLOT_RIGHT || '').trim(),
    SLOT_BOTTOM: String(override.SLOT_BOTTOM || ADSENSE_DEFAULT_CONFIG.SLOT_BOTTOM || '').trim(),
    CMP_TCF_ENABLED: Boolean(override.CMP_TCF_ENABLED ?? ADSENSE_DEFAULT_CONFIG.CMP_TCF_ENABLED)
  };
};

const ADSENSE_CONFIG = resolveAdsenseConfig();

const resolveSiteBase = () => {
  const script = document.querySelector('script[src*="assets/js/ads.js"]');
  const rawSrc = script?.getAttribute('src') || '';
  if (!rawSrc) return '/';
  const normalized = rawSrc.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('assets/js/ads.js');
  if (idx === -1) return '/';
  return normalized.slice(0, idx);
};

const buildPolicyRowMarkup = (baseHrefPrefix) => `
  <div class="ad-policy-row ad-policy-row--fixed" data-ad-policy-row="true" aria-label="Informazioni legali">
    <span class="ad-policy-row__brand">SuperEnalotto Control Chaos</span>
    <a class="ad-policy-row__link" href="${baseHrefPrefix}pages/privacy-policy/index.html">Privacy Policy</a>
    <span class="ad-policy-row__sep" aria-hidden="true">|</span>
    <a class="ad-policy-row__link" href="${baseHrefPrefix}pages/cookie-policy/index.html">Cookie Policy</a>
    <span class="ad-policy-row__sep" aria-hidden="true">|</span>
    <a class="ad-policy-row__link" href="${baseHrefPrefix}pages/contatti-chi-siamo/index.html">Contatti / Chi siamo</a>
    <span class="ad-policy-row__sep" aria-hidden="true">|</span>
    <a class="ad-policy-row__link" href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">AdSense</a>
    <span class="ad-policy-row__sep" aria-hidden="true">|</span>
    <button class="ad-policy-row__button" type="button" data-consent-open="true">Gestisci cookie</button>
  </div>
`;

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
  if (adsenseLoaderPromise) return adsenseLoaderPromise;
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
};

const createConsentBanner = () => {
  const banner = document.createElement('aside');
  banner.className = 'cc-consent-banner';
  banner.dataset.ccConsentBanner = 'true';
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

const toggleConsentBanner = (forceVisible) => {
  const banner = ensureConsentBanner();
  if (forceVisible) {
    banner.hidden = false;
    banner.style.display = '';
  } else {
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
  toggleConsentBanner(true);
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

const ensureAds = () => {
  if (document.querySelector('[data-cc-ads-root="true"]')) return;

  const root = document.documentElement;
  const baseHrefPrefix = resolveSiteBase();
  const rightRail = document.createElement('aside');
  rightRail.className = 'ad-rail ad-rail--right';
  rightRail.dataset.adRail = 'right';
  rightRail.dataset.ccAdsRoot = 'true';
  rightRail.setAttribute('aria-label', 'Annunci laterali');
  rightRail.innerHTML = `
    <div class="ad-rail__panel">
      <p class="ad-rail__label-head">Annunci</p>
      <div class="ad-slot-host" data-ad-host="right"></div>
    </div>
  `;

  const bottomAd = document.createElement('aside');
  bottomAd.className = 'bottom-ad';
  bottomAd.dataset.bottomAd = 'true';
  bottomAd.setAttribute('aria-label', 'Annunci in basso');
  bottomAd.innerHTML = `
    <div class="bottom-ad__panel">
      <p class="ad-rail__label-head">Annunci</p>
      <div class="ad-slot-host" data-ad-host="bottom"></div>
    </div>
  `;

  const policyRow = document.createElement('aside');
  policyRow.className = 'ad-policy-fixed';
  policyRow.dataset.ccAdsPolicy = 'true';
  policyRow.innerHTML = buildPolicyRowMarkup(baseHrefPrefix);

  const adSlot = document.createElement('div');
  adSlot.className = 'ad-slot';
  adSlot.dataset.ccAdSlot = 'main';

  const rightHost = rightRail.querySelector('[data-ad-host="right"]');
  const bottomHost = bottomAd.querySelector('[data-ad-host="bottom"]');
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
    const width = window.innerWidth;
    const showRightRail = width >= AD_LAYOUT.TABLET_LANDSCAPE;

    if (showRightRail) {
      rightRail.hidden = false;
      bottomAd.hidden = true;
      rightRail.style.display = '';
      bottomAd.style.display = 'none';
      root.dataset.adRail = 'right';
      moveSlotTo(rightHost, 'right');
    } else {
      rightRail.hidden = true;
      bottomAd.hidden = false;
      rightRail.style.display = 'none';
      bottomAd.style.display = '';
      root.dataset.adRail = 'bottom';
      moveSlotTo(bottomHost, 'bottom');
    }

    updateLayoutReserve();
    rerenderCurrentAd();
  };

  document.body.appendChild(rightRail);
  document.body.appendChild(bottomAd);
  document.body.appendChild(policyRow);

  wireConsentUi();

  const start = async () => {
    await initConsentSource();
    if (consentModeSource !== 'tcf') {
      const consent = getStoredConsent();
      applyConsentMode(consent);
      toggleConsentBanner(!consent);
    }
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
  window.addEventListener('resize', scheduleAdLayout, { passive: true });
  window.addEventListener(CONSENT_EVENT_NAME, rerenderCurrentAd);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureAds);
} else {
  ensureAds();
}
