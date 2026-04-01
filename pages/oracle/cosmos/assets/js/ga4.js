const GA_MEASUREMENT_ID = 'G-7FLYS8Y9BB';

(() => {
  if (!GA_MEASUREMENT_ID) return;

  const loadGtagScript = () => {
    const existingLoader = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`);
    if (existingLoader) return;
    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(gtagScript);
  };

  const scheduleGtagLoader = () => {
    if (document.visibilityState === 'hidden') {
      loadGtagScript();
      return;
    }
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => loadGtagScript(), { timeout: 2000 });
      return;
    }
    window.setTimeout(loadGtagScript, 900);
  };

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag(){ window.dataLayer.push(arguments); };
  }

  if (!window.__ccGa4Initialized) {
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500
    });
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { transport_type: 'beacon' });
    window.__ccGa4Initialized = true;
  }

  if (document.readyState === 'complete') {
    scheduleGtagLoader();
  } else {
    window.addEventListener('load', scheduleGtagLoader, { once: true, passive: true });
  }
})();
