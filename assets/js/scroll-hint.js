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
      '.sh svg{width:36px;height:36px;stroke:#d4c6ff;stroke-width:2.5;',
      '  filter:drop-shadow(0 0 14px rgba(139,92,246,.7)) drop-shadow(0 0 5px rgba(167,139,250,.95)) drop-shadow(0 0 2px #fff3);}',

      '.sh--down{left:50%;bottom:10px;transform:translateX(-50%);animation:shY 1.6s ease-in-out infinite;}',
      '.sh--up{left:50%;top:10px;transform:translateX(-50%);animation:shY 1.6s ease-in-out infinite reverse;}',
      '.sh--right{right:10px;top:50%;transform:translateY(-50%);animation:shX 1.6s ease-in-out infinite;}',
      '.sh--left{left:10px;top:50%;transform:translateY(-50%);animation:shX 1.6s ease-in-out infinite reverse;}',

      '@media(max-width:640px){',
      '  .sh--down{bottom:calc(56px + var(--ad-reserve-bottom,0px) + 8px);}',
      '  .sh--up{top:calc(56px + 8px);}',
      '}',
      '@media(min-width:641px){',
      '  .sh--down{bottom:calc(62px + var(--ad-reserve-bottom,0px) + 8px);}',
      '  .sh--up{top:calc(88px + 8px);}',
      '  .sh--right{right:calc(var(--ad-reserve-right,0px) + 10px);}',
      '}',

      '@keyframes shY{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(5px)}}',
      '@keyframes shX{0%,100%{transform:translateY(-50%) translateX(0)}50%{transform:translateY(-50%) translateX(5px)}}',
      '@media(prefers-reduced-motion:reduce){.sh{animation:none!important;}}'
    ].join('\n');
    document.head.appendChild(css);
  }

  // ── SVG chevron factory ──
  function makeArrow(dir) {
    var el = document.createElement('div');
    el.className = 'sh sh--' + dir;
    el.setAttribute('aria-hidden', 'true');
    var rotation = { down: 0, up: 180, right: -90, left: 90 }[dir] || 0;
    el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(' + rotation + 'deg)"><polyline points="6 9 12 15 18 9"/></svg>';
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

  function init() {
    createArrows();
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
