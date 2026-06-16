/* ═══════════════════════════════════════════════════════════
   SCROLL-HINT — Indicatori direzionali globali
   Mostra frecce su/giù/sx/dx quando c'è contenuto scrollabile.
   Si auto-inizializza, zero dipendenze, caricato con defer.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── CSS iniettato una volta sola ──
  var STYLE_ID = 'cc-scroll-hint-css';
  if (!document.getElementById(STYLE_ID)) {
    var css = document.createElement('style');
    css.id = STYLE_ID;
    css.textContent = [
      '.sh{position:fixed;z-index:200;pointer-events:none;cursor:pointer;',
      '  opacity:0;transition:opacity .3s ease;}',
      '.sh.visible{opacity:1;pointer-events:auto;}',
      /* Frecce scroll — stile card/glass */
      '.sh svg{width:48px;height:48px;stroke:#d4c6ff;stroke-width:2;',
      '  filter:drop-shadow(0 0 14px rgba(139,92,246,.7)) drop-shadow(0 0 5px rgba(167,139,250,.95)) drop-shadow(0 0 2px #fff3);}',
      '.sh .sh-pill{display:flex;align-items:center;justify-content:center;',
      '  padding:.35em .55em;border-radius:10px;background:rgba(139,92,246,.15);',
      '  border:1px solid rgba(139,92,246,.3);backdrop-filter:blur(6px);',
      '  transition:background .2s,border-color .2s;}',
      '.sh:hover .sh-pill{background:rgba(139,92,246,.28);border-color:rgba(139,92,246,.55);}',
      '.sh:hover svg{stroke:#fff;}',

      '.sh--down{left:50%;bottom:10px;transform:translateX(-50%);animation:shY 1.6s ease-in-out infinite;}',
      '.sh--up{left:50%;top:10px;transform:translateX(-50%);animation:shY 1.6s ease-in-out infinite reverse;}',
      '.sh--right{right:10px;top:50%;transform:translateY(-50%);animation:shX 1.6s ease-in-out infinite;}',
      '.sh--left{left:10px;top:50%;transform:translateY(-50%);animation:shX 1.6s ease-in-out infinite reverse;}',

      '@media(max-width:640px){',
      '  .sh--down{bottom:calc(56px + var(--ad-reserve-bottom,0px) + 8px);}',
      '  .sh--up{top:calc(56px + 8px);}',
      '  .sh svg{width:40px;height:40px;}',
      '}',
      '@media(min-width:641px){',
      '  .sh--down{bottom:calc(62px + var(--ad-reserve-bottom,0px) + 8px);}',
      '  .sh--up{top:calc(88px + 8px);}',
      '  .sh--right{right:calc(var(--ad-reserve-right,0px) + 10px);}',
      '}',

      '@keyframes shY{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(8px)}}',
      '@keyframes shX{0%,100%{transform:translateY(-50%) translateX(0)}50%{transform:translateY(-50%) translateX(8px)}}',
      '@keyframes shFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.03)}}',
      '@keyframes shPillFloat{0%,100%{transform:scale(1);box-shadow:0 2px 8px rgba(139,92,246,.2)}50%{transform:scale(1.05);box-shadow:0 6px 20px rgba(139,92,246,.35)}}',
      '.sh .sh-pill{animation:shPillFloat 2.4s ease-in-out infinite !important;}',
      '@media(prefers-reduced-motion:reduce){.sh{animation:none!important;}.sh-back{animation:none!important;}.sh .sh-pill{animation:none!important;}}',

      /* Back button */
      '.sh-back{position:fixed;z-index:201;left:14px;cursor:pointer;',
      '  text-decoration:none;opacity:1;',
      '  display:flex;align-items:center;gap:.5em;',
      '  animation:shFloat 2.6s ease-in-out infinite !important;}',
      '.sh-back:hover{animation:none !important;transform:translateX(-5px);}',
      '.sh-back-arrow{display:flex;align-items:center;justify-content:center;',
      '  width:2.8rem;height:2.8rem;border-radius:10px;background:rgba(139,92,246,.18);',
      '  border:1px solid rgba(139,92,246,.35);backdrop-filter:blur(6px);',
      '  font-size:1.7rem;line-height:1;color:#a78bfa;',
      '  box-shadow:0 3px 12px rgba(139,92,246,.25);',
      '  transition:background .2s,border-color .2s,color .2s,box-shadow .2s;}',
      '.sh-back-label{font-family:"DM Mono",monospace;font-size:1.4rem;letter-spacing:.1em;',
      '  font-weight:700;text-transform:uppercase;color:#d4c6ff;',
      '  padding:.3em .7em;border-radius:10px;background:rgba(139,92,246,.18);',
      '  border:1px solid rgba(139,92,246,.35);backdrop-filter:blur(6px);',
      '  box-shadow:0 3px 12px rgba(139,92,246,.25);',
      '  filter:drop-shadow(0 0 14px rgba(139,92,246,.7)) drop-shadow(0 0 5px rgba(167,139,250,.95)) drop-shadow(0 0 2px #fff3);}',
      '.sh-back:hover .sh-back-label{color:#fff;background:rgba(139,92,246,.28);border-color:rgba(139,92,246,.55);}',
      '.sh-back:hover .sh-back-arrow{color:#fff;background:rgba(139,92,246,.28);border-color:rgba(139,92,246,.55);}',
      '@media(min-width:641px){.sh-back{top:calc(88px + 10px);}}',
      '@media(max-width:860px){.sh-back{top:calc(72px + 10px);}}',
      '@media(max-width:640px){.sh-back{top:calc(72px + 8px);} .sh-back-label{font-size:1.1rem;} .sh-back-arrow{width:2.2rem;height:2.2rem;font-size:1.3rem;}}',
      '@media(max-width:520px){.sh-back{top:calc(60px + 8px);}}'
    ].join('\n');
    document.head.appendChild(css);
  }

  // ── SVG chevron factory ──
  function makeArrow(dir) {
    var el = document.createElement('div');
    el.className = 'sh sh--' + dir;
    el.setAttribute('aria-hidden', 'true');
    var rotation = { down: 0, up: 180, right: -90, left: 90 }[dir] || 0;
    el.innerHTML = '<div class="sh-pill"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(' + rotation + 'deg)"><polyline points="6 9 12 15 18 9"/></svg></div>';
    return el;
  }

  // ── Trova il container scrollabile principale della pagina ──
  function findScrollTarget() {
    // Priorità: container con overflow-y:auto/scroll che ha altezza fissa
    var candidates = [
      '#v8-dashboard',        // home
      '#panel',               // panel home
      '.content-box',         // pagine neo
      '.page-content',        // pagine generiche
      'main',                 // semantico
      '[data-scroll-target]'  // esplicito
    ];
    for (var i = 0; i < candidates.length; i++) {
      var el = document.querySelector(candidates[i]);
      if (el && isScrollable(el)) return el;
    }
    // Fallback: body o documentElement se scrollabili
    if (document.documentElement.scrollHeight > document.documentElement.clientHeight) {
      return document.documentElement;
    }
    if (document.body.scrollHeight > document.body.clientHeight) {
      return document.body;
    }
    return null;
  }

  function isScrollable(el) {
    var style = getComputedStyle(el);
    var oy = style.overflowY;
    var ox = style.overflowX;
    var scrollableY = (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 2;
    var scrollableX = (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 2;
    return scrollableY || scrollableX;
  }

  // ── Init ──
  var arrows = {};
  var target = null;
  var attached = false;
  var THRESHOLD = 12; // px margine per considerare "al bordo"

  var SCROLL_AMOUNT = 280; // px per click

  function scrollDir(dir) {
    if (!target) return;
    var el = (target === document.documentElement || target === document.body) ? window : target;
    var opts = { behavior: 'smooth' };
    if (dir === 'down') opts.top = SCROLL_AMOUNT;
    else if (dir === 'up') opts.top = -SCROLL_AMOUNT;
    else if (dir === 'right') opts.left = SCROLL_AMOUNT;
    else if (dir === 'left') opts.left = -SCROLL_AMOUNT;
    el.scrollBy(opts);
  }

  function createArrows() {
    ['up', 'down', 'left', 'right'].forEach(function (dir) {
      arrows[dir] = makeArrow(dir);
      arrows[dir].addEventListener('click', function () { scrollDir(dir); });
      document.body.appendChild(arrows[dir]);
    });
  }

  function updateVisibility() {
    if (!target) return;

    var st, sl, sh, sw, ch, cw;

    if (target === document.documentElement || target === document.body) {
      st = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      sl = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
      sh = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      ch = window.innerHeight;
      cw = window.innerWidth;
    } else {
      st = target.scrollTop;
      sl = target.scrollLeft;
      sh = target.scrollHeight;
      sw = target.scrollWidth;
      ch = target.clientHeight;
      cw = target.clientWidth;
    }

    var canUp = st > THRESHOLD;
    var canDown = sh - st - ch > THRESHOLD;
    var canLeft = sl > THRESHOLD;
    var canRight = sw - sl - cw > THRESHOLD;

    toggle(arrows.up, canUp);
    toggle(arrows.down, canDown);
    toggle(arrows.left, canLeft);
    toggle(arrows.right, canRight);
  }

  function toggle(el, show) {
    if (show) {
      el.classList.add('visible');
    } else {
      el.classList.remove('visible');
    }
  }

  function attachTo(el) {
    if (attached && target === el) return;
    if (attached) detach();
    target = el;
    if (!target) return;

    var scrollEl = (target === document.documentElement || target === document.body) ? window : target;
    scrollEl.addEventListener('scroll', updateVisibility, { passive: true });
    attached = true;
    updateVisibility();
  }

  function detach() {
    if (!target) return;
    var scrollEl = (target === document.documentElement || target === document.body) ? window : target;
    scrollEl.removeEventListener('scroll', updateVisibility);
    attached = false;
    target = null;
  }

  // ── Rilevamento dinamico: il container scrollabile può apparire dopo (es. dashboard.open) ──
  function scan() {
    var t = findScrollTarget();
    if (t) {
      attachTo(t);
    } else {
      // Nascondi tutto se non c'è niente di scrollabile
      ['up', 'down', 'left', 'right'].forEach(function (d) { toggle(arrows[d], false); });
    }
  }

  function createBackButton() {
    // Solo pagine interne, non homepage
    var path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path === '' || path === '/' || path === '/index.html') return;
    var btn = document.createElement('a');
    btn.className = 'sh-back';
    btn.href = 'javascript:history.back()';
    btn.setAttribute('aria-label', 'Torna indietro');
    btn.innerHTML = '<span class="sh-back-arrow" aria-hidden="true">&#8592;</span><span class="sh-back-label">Back</span>';
    document.body.appendChild(btn);
  }

  function init() {
    createArrows();
    createBackButton();
    scan();

    // Riscan quando cambiano classi (es. dashboard.open, panel.open)
    var obs = new MutationObserver(function () {
      scan();
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    // Riscan su resize
    window.addEventListener('resize', scan, { passive: true });

    // Aggiorna periodicamente (catch-all per contenuto caricato async)
    setInterval(function () {
      if (target) updateVisibility();
      else scan();
    }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
