(function(){
  'use strict';

  function cssText(){
    return `
      .secc-embedded-page,
      .secc-embedded-page body{
        background: transparent !important;
        color-scheme: dark;
      }
      .secc-embedded-page .site-header,
      .secc-embedded-page .site-banner,
      .secc-embedded-page .top-header,
      .secc-embedded-page .cc-site-header,
      .secc-embedded-page .cc-page-hub,
      .secc-embedded-page .ad-rail,
      .secc-embedded-page .ad-rail--right,
      .secc-embedded-page .bottom-ad,
      .secc-embedded-page .ad-policy-row,
      .secc-embedded-page .ad-slot,
      .secc-embedded-page .adsbygoogle,
      .secc-embedded-page .ad-slot-host,
      .secc-embedded-page .ad-rail__panel,
      .secc-embedded-page .bottom-ad__panel,
      .secc-embedded-page .ad-adsterra-display--right,
      .secc-embedded-page .ad-adsterra-display--bottom,
      .secc-embedded-page .ad-referral-banner,
      .secc-embedded-page .ad-referral-badge,
      .secc-embedded-page [id*="container-right-adsterra"],
      .secc-embedded-page [id*="container-bottom-adsterra"],
      .secc-embedded-page [data-cc-ad-container],
      .secc-embedded-page [data-ad-rail],
      .secc-embedded-page [data-bottom-ad],
      .secc-embedded-page [data-consent-banner],
      .secc-embedded-page [data-cookie-banner],
      .secc-embedded-page [data-ad-policy-row],
      .secc-embedded-page script[src*="effectivegatecpm.com"]{
        display:none !important;
      }
      .secc-embedded-page html[data-ad-rail="right"] main.content-width,
      .secc-embedded-page html[data-ad-rail="right"] main.content-fade,
      .secc-embedded-page html[data-ad-rail="right"] .mx-auto.max-w-5xl,
      .secc-embedded-page html[data-ad-rail="bottom"] main.content-width,
      .secc-embedded-page html[data-ad-rail="bottom"] main.content-fade,
      .secc-embedded-page html[data-ad-rail="bottom"] .mx-auto.max-w-5xl{
        padding-right: 0 !important;
        padding-bottom: 0 !important;
        width: 100% !important;
        max-width: none !important;
      }
      .secc-embedded-page main{
        max-width:none !important;
        width:100% !important;
        padding:8px 10px 12px !important;
        margin:0 !important;
        background: transparent !important;
      }
      .secc-embedded-page .content-box{
        margin:0 !important;
        padding:0 !important;
        background: transparent !important;
        box-shadow: none !important;
        border: 0 !important;
      }
      .secc-embedded-page [data-page-kicker-wrap],
      .secc-embedded-page main > header:first-child{
        margin-top:0 !important;
        padding-top:0 !important;
      }
      .secc-embedded-page .tabs-shell,
      .secc-embedded-page .tabs-sheet,
      .secc-embedded-page .cc-bridge-box,
      .secc-embedded-page .rounded-2xl,
      .secc-embedded-page .rounded-3xl,
      .secc-embedded-page [data-adsense-quality],
      .secc-embedded-page .table-scroll-shell,
      .secc-embedded-page .cc-table-wrap,
      .secc-embedded-page .folder-tabs,
      .secc-embedded-page .tab-panel,
      .secc-embedded-page section,
      .secc-embedded-page article,
      .secc-embedded-page aside{
        background: linear-gradient(180deg, rgba(18,24,44,.42), rgba(8,12,24,.24)) !important;
        border-color: rgba(255,255,255,.10) !important;
        box-shadow: 0 14px 34px rgba(0,0,0,.22) !important;
        backdrop-filter: blur(8px) !important;
      }
      .secc-embedded-page .folder-tabs,
      .secc-embedded-page [data-page-kicker-wrap],
      .secc-embedded-page main > header:first-child{
        background: transparent !important;
        box-shadow: none !important;
        border: 0 !important;
        backdrop-filter: none !important;
      }
      .secc-embedded-page img,
      .secc-embedded-page video{
        border-radius: 18px !important;
      }
      .secc-embedded-page .content-fade{
        animation: none !important;
        opacity: 1 !important;
      }
    `;
  }

  function applyToDocument(doc){
    if(!doc || !doc.documentElement) return false;
    try{
      doc.documentElement.classList.add('secc-embedded-page');
      doc.documentElement.removeAttribute('data-ad-rail');
      doc.documentElement.style.setProperty('--ad-reserve-bottom', '0px');
      doc.documentElement.style.setProperty('--ad-reserve-left', '0px');
      doc.documentElement.style.setProperty('--ad-reserve-right', '0px');
      doc.documentElement.style.setProperty('--ad-rail-bottom', '0px');
      if(doc.body) doc.body.classList.add('secc-embedded-page');

      const styleId='secc-embedded-page-style';
      if(!doc.getElementById(styleId)){
        const styleEl=doc.createElement('style');
        styleEl.id=styleId;
        styleEl.textContent=cssText();
        (doc.head || doc.documentElement).appendChild(styleEl);
      }

      doc.querySelectorAll('.ad-rail, .bottom-ad, [data-cc-ad-container], [data-ad-policy-row], [id*="container-right-adsterra"], [id*="container-bottom-adsterra"]').forEach((el)=>el.remove());
      doc.querySelectorAll('script[src*="effectivegatecpm.com"]').forEach((el)=>el.remove());
      return true;
    }catch(_e){
      return false;
    }
  }

  window.SECC_EMBEDDED_PAGE=Object.freeze({
    applyToDocument
  });
})();
