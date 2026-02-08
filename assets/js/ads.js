const AD_LAYOUT = Object.freeze({
  TABLET_LANDSCAPE: 1024
});

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
  </div>
`;

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

  const mountCustomRenderer = () => {
    if (typeof window.CC_RENDER_AD_SLOT !== 'function') return;
    if (adSlot.dataset.ccAdRendered === 'true') return;
    try {
      window.CC_RENDER_AD_SLOT(adSlot);
      adSlot.dataset.ccAdRendered = 'true';
    } catch (error) {
      adSlot.dataset.ccAdRendered = 'error';
    }
  };

  const moveSlotTo = (host) => {
    if (!host) return;
    if (adSlot.parentElement === host) return;
    host.appendChild(adSlot);
    mountCustomRenderer();
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

  const updateAdLayout = () => {
    const width = window.innerWidth;
    const showRightRail = width >= AD_LAYOUT.TABLET_LANDSCAPE;

    if (showRightRail) {
      rightRail.hidden = false;
      bottomAd.hidden = true;
      root.dataset.adRail = 'right';
      moveSlotTo(rightHost);
    } else {
      rightRail.hidden = true;
      bottomAd.hidden = false;
      root.dataset.adRail = 'bottom';
      moveSlotTo(bottomHost);
    }

    updateLayoutReserve();
  };

  document.body.appendChild(rightRail);
  document.body.appendChild(bottomAd);
  document.body.appendChild(policyRow);

  updateAdLayout();
  window.addEventListener('load', updateAdLayout);
  window.addEventListener('resize', () => {
    window.clearTimeout(window.__ccAdLayoutResize);
    window.__ccAdLayoutResize = window.setTimeout(updateAdLayout, 120);
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureAds);
} else {
  ensureAds();
}
