(function () {
  'use strict';
  if (document.getElementById('v8-inner-topbar')) return;

  // â”€â”€ TOPBAR â”€â”€
  var bar = document.createElement('div');
  bar.id = 'v8-inner-topbar';
  bar.innerHTML = [
    '<style>',
    '#v8-inner-topbar{',
      'position:fixed;top:0;left:0;right:var(--ad-reserve-right,0px);height:64px;',
      'display:flex;align-items:center;padding:0 1.5rem;gap:1.2rem;',
      'background:rgba(3,1,9,.97);',
      'border-bottom:1px solid rgba(237,232,223,.06);',
      'backdrop-filter:blur(12px);z-index:9000;',
      'font-family:"DM Mono",monospace;',
    '}',
    '#v8-inner-topbar a{',
      'color:rgba(237,232,223,.6);text-decoration:none;',
      'font-size:1.2rem;letter-spacing:.1em;text-transform:uppercase;',
      'transition:color .2s;white-space:nowrap;',
    '}',
    '#v8-inner-topbar a:hover{color:#EDE8DF;}',
    '#v8-inner-topbar .v8i-logo{',
      'display:flex;flex-direction:column;align-items:flex-start;gap:.1rem;',
      'font-family:"BioRhyme",serif;font-size:1.5rem;font-weight:800;',
      'color:#EDE8DF;letter-spacing:-.02em;line-height:1;',
    '}',
    '#v8-inner-topbar .v8i-logo-main{display:block;}',
    '#v8-inner-topbar .v8i-version{',
      'display:block;font-family:"DM Mono",monospace;font-size:.72rem;font-weight:700;',
      'line-height:1;letter-spacing:.16em;color:rgba(237,232,223,.34);',
      'text-transform:uppercase;text-shadow:none;-webkit-text-fill-color:currentColor;',
    '}',
    '#v8-inner-topbar .v8i-logo b{',
      'background:linear-gradient(90deg,#8B5CF6,#C8391A);',
      '-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;',
    '}',
    '#v8-inner-topbar .v8i-sep{width:1px;height:18px;background:rgba(237,232,223,.08);}',
    '#v8-inner-topbar .v8i-back{display:inline-flex;align-items:center;gap:.35rem;flex-shrink:0;}',
    '#v8-inner-topbar .v8i-back .v8i-back-arrow{font-size:1rem;line-height:1;}',
    'body{padding-top:64px!important;}',
    '</style>',
    '<a href="/" class="v8i-logo"><span class="v8i-logo-main">Control<b>Chaos</b></span><span class="v8i-version" data-v8-version>--</span></a>',
    '<div class="v8i-sep"></div>',
    '<a href="javascript:history.back()" class="v8i-back"><span class="v8i-back-arrow" aria-hidden="true">&larr;</span><span>Indietro</span></a>'
  ].join('');

  if (document.body) {
    document.body.prepend(bar);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.prepend(bar);
    });
  }

  // â”€â”€ BODY OVERRIDE: allinea al design V8 home â”€â”€
  // Rimuove gradiente redesign-neo, sfondo-immagine, font Space Grotesk
  var override = document.createElement('style');
  override.id = 'v8-body-override';
  override.textContent =
    'body{' +
      'background:#030109!important;' +
      'background-image:none!important;' +
      'background-attachment:initial!important;' +
      'font-family:"DM Mono",monospace!important;' +
      'color:#EDE8DF!important;' +
    '}' +
    // Rimuove griglia ::before di redesign-neo.css
    'body.cc-neo::before,body.cc-redesign::before{display:none!important;}' +
    // Grain overlay sottile identico alla home
    'body::after{' +
      'content:"";position:fixed;inset:0;' +
      'right:var(--ad-reserve-right,0px);bottom:var(--ad-reserve-bottom,0px);' +
      'z-index:997;pointer-events:none;opacity:.018;' +
      'background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'300\' height=\'300\' filter=\'url(%23n)\'/%3E%3C/svg%3E");' +
      'background-size:180px;' +
    '}';

  // Inietta in <head> appena possibile
  if (document.head) {
    document.head.appendChild(override);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      document.head.appendChild(override);
    });
  }

  function siteAsset(path) {
    var clean = String(path || '').replace(/^\/+/, '');
    try {
      var script = document.currentScript && document.currentScript.src ? document.currentScript.src : '';
      if (script) return new URL('../../' + clean, script).toString();
    } catch (e) {}
    return '/' + clean;
  }

  function fetchTextAsset(path) {
    var primary = siteAsset(path);
    var fallback = '/' + String(path || '').replace(/^\/+/, '');
    return fetch(primary, { cache: 'no-store' }).then(function (r) {
      if (r.ok) return r.text();
      if (primary !== fallback) return fetch(fallback, { cache: 'no-store' }).then(function (r2) { return r2.ok ? r2.text() : ''; });
      return '';
    }).catch(function () {
      return primary !== fallback
        ? fetch(fallback, { cache: 'no-store' }).then(function (r2) { return r2.ok ? r2.text() : ''; }).catch(function () { return ''; })
        : '';
    });
  }

  function fetchJsonAsset(path, fallbackValue) {
    return fetchTextAsset(path).then(function (text) {
      if (!text) return fallbackValue;
      try { return JSON.parse(text); } catch (e) { return fallbackValue; }
    });
  }

  // â”€â”€ AD RAIL ALIGN â”€â”€
  // Il rail fisso (top:0 height:100vh) copre tutto inclusa la topbar.
  // Aggiungiamo padding-top pari alla topbar (64px) perche il contenuto
  // del pannello ads parta alla stessa quota del contenuto pagina,
  // come avviene sulla homepage V8 dove la topbar non esiste.
  if (!document.getElementById('v8-ad-rail-align')) {
    var _adAlignStyle = document.createElement('style');
    _adAlignStyle.id = 'v8-ad-rail-align';
    _adAlignStyle.textContent =
      '.ad-rail--right .ad-rail__panel{' +
        'padding-top:calc(64px + 0.75rem)!important;' +
      '}';
    if (document.head) {
      document.head.appendChild(_adAlignStyle);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        document.head.appendChild(_adAlignStyle);
      });
    }
  }

  // â”€â”€ NASCONDI VECCHIO HEADER â”€â”€
  // Usiamo una regola CSS (non inline style) perche header.js chiama
  // node.style.removeProperty('display') che rimuoverebbe un display:none inline.
  // Una regola in <style> con !important sopravvive a removeProperty().
  if (!document.getElementById('v8-hide-header-rule')) {
    var _v8HideStyle = document.createElement('style');
    _v8HideStyle.id = 'v8-hide-header-rule';
    // Nasconde solo il site-header globale (navbar), non gli header di sezione (data-page-kicker-wrap)
    _v8HideStyle.textContent =
      '#site-header {' +
        'display: none !important;' +
        'visibility: hidden !important;' +
        'pointer-events: none !important;' +
        'height: 0 !important;' +
        'overflow: hidden !important;' +
        'margin: 0 !important;' +
        'padding: 0 !important;' +
      '}';
    if (document.head) {
      document.head.appendChild(_v8HideStyle);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        document.head.appendChild(_v8HideStyle);
      });
    }
  }
})();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   V8SKIN BOOTSTRAP - estende il chrome interno con il design V8+
   (font, v8skin.css, aurora, nav topbar, hero schede algoritmo)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
(function () {
  'use strict';
  if (window.__V8SKIN__) return;
  window.__V8SKIN__ = true;

  function onHead(fn) {
    if (document.head) { fn(); }
    else { document.addEventListener('DOMContentLoaded', fn); }
  }
  function onBody(fn) {
    if (document.body) { fn(); }
    else { document.addEventListener('DOMContentLoaded', fn); }
  }

  function ensureV8SheetProgress() {
    if (document.getElementById('v8sheet-prog')) return;
    var prog = document.createElement('div');
    prog.id = 'v8sheet-prog';
    prog.setAttribute('aria-hidden', 'true');
    document.body.prepend(prog);
    var tick = function () {
      var sc = window.CC_SCROLLER;
      var useC = sc && document.documentElement.dataset.adRail === 'right';
      var h = useC
        ? Math.max(1, sc.scrollHeight - sc.clientHeight)
        : Math.max(1, document.body.scrollHeight - window.innerHeight);
      var y = useC ? sc.scrollTop : window.scrollY;
      prog.style.width = Math.max(0, Math.min(100, (y / h) * 100)) + '%';
    };
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick, { passive: true });
    tick();
  }

  function setupV8SheetInteractions(root) {
    ensureV8SheetProgress();
    var scope = root || document;
    var sections = Array.prototype.slice.call(scope.querySelectorAll('.v8sheet-sec'));
    if (!('IntersectionObserver' in window)) {
      sections.forEach(function (section) { section.classList.add('vis'); });
      return;
    }
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add('vis');
      });
    }, { threshold: 0.15 });
    sections.forEach(function (section) { reveal.observe(section); });
    var links = Array.prototype.slice.call(document.querySelectorAll('.v8sheet-subnav a'));
    var active = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) {
          link.classList.toggle('on', link.hash === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (section) {
      if (section.id) active.observe(section);
    });
  }

  function injectRailSafeLayout() {
    if (document.getElementById('v8-rail-safe-layout')) return;
    var st = document.createElement('style');
    st.id = 'v8-rail-safe-layout';
    st.textContent =
      'body[data-page-id]:not([data-page-id="home"]):not([data-page-id="oracle"]) main{' +
        'width:calc(100vw - var(--ad-reserve-right,0px) - 32px)!important;' +
        'max-width:none!important;' +
        'margin-left:16px!important;' +
        'margin-right:calc(var(--ad-reserve-right,0px) + 16px)!important;' +
        'padding-left:0!important;padding-right:0!important;' +
        'box-sizing:border-box!important;' +
      '}' +
      'body[data-page-id]:not([data-page-id="home"]):not([data-page-id="oracle"]) main>.content-box,' +
      'body[data-page-id]:not([data-page-id="home"]):not([data-page-id="oracle"]) main .content-box,' +
      'body[data-page-id]:not([data-page-id="home"]):not([data-page-id="oracle"]) .tabs-shell,' +
      'body[data-page-id]:not([data-page-id="home"]):not([data-page-id="oracle"]) .tabs-sheet,' +
      'body[data-page-id]:not([data-page-id="home"]):not([data-page-id="oracle"]) .v8sheet-body{' +
        'width:100%!important;max-width:none!important;' +
        'margin-left:0!important;margin-right:0!important;' +
        'box-sizing:border-box!important;' +
      '}' +
      'body[data-page-id]:not([data-page-id="home"]):not([data-page-id="oracle"]) .v8-page-hero,' +
      'body[data-page-id="algsheet"] .v8sh{' +
        'width:100%!important;' +
        'max-width:none!important;' +
        'margin-left:0!important;margin-right:0!important;' +
        'box-sizing:border-box!important;' +
      '}' +
      'body[data-page-id="algsheet"] .v8sh,' +
      'body[data-page-id="algsheet"] .v8sheet-body{' +
        'transform:none!important;' +
      '}' +
      '@media(max-width:1023px){' +
        'body[data-page-id]:not([data-page-id="home"]):not([data-page-id="oracle"]) main,' +
        'body[data-page-id]:not([data-page-id="home"]):not([data-page-id="oracle"]) .v8-page-hero,' +
        'body[data-page-id="algsheet"] .v8sh{' +
          'margin-left:0!important;margin-right:0!important;' +
        '}' +
        'body[data-page-id]:not([data-page-id="home"]):not([data-page-id="oracle"]) main{' +
          'width:calc(100vw - 24px)!important;' +
          'margin-left:12px!important;margin-right:12px!important;' +
        '}' +
      '}';
    document.head.appendChild(st);
  }

  function clearStaleSheetTitles() {
    document.querySelectorAll('[data-sheet-fixed-title="1"]').forEach(function (node) {
      node.remove();
    });
    if (document.body) document.body.removeAttribute('data-sheet-fixed-title-ready');
  }

  function placeSheetPrevNextAfterHero() {
    var hero = document.querySelector('.v8sh');
    var nav = document.querySelector('[data-alg-prev-next="1"]');
    if (!hero || !nav) return;
    if (hero.nextElementSibling !== nav) {
      hero.insertAdjacentElement('afterend', nav);
    }
  }

  // â”€â”€ FONT V8 (BioRhyme + DM Mono) â”€â”€
  onHead(function () {
    if (!document.getElementById('v8skin-fonts')) {
      var f = document.createElement('link');
      f.id = 'v8skin-fonts';
      f.rel = 'stylesheet';
      f.href = 'https://fonts.googleapis.com/css2?family=BioRhyme:wght@300;700;800&family=DM+Mono:wght@300;400;500&display=swap';
      document.head.appendChild(f);
    }
    if (!document.getElementById('v8skin-css')) {
      var l = document.createElement('link');
      l.id = 'v8skin-css';
      l.rel = 'stylesheet';
      l.href = siteAsset('assets/css/v8skin.css?v=20260613-0305');
      document.head.appendChild(l);
    }
    injectRailSafeLayout();
  });

  // â”€â”€ AURORA â”€â”€
  onBody(function () {
    if (!document.querySelector('.v8-aurora')) {
      var a = document.createElement('div');
      a.className = 'v8-aurora';
      a.setAttribute('aria-hidden', 'true');
      a.innerHTML = '<i class="a1"></i><i class="a2"></i><i class="a3"></i>';
      document.body.prepend(a);
    }
    if (!document.getElementById('v8-sky')) {
      var cv = document.createElement('canvas');
      cv.id = 'v8-sky';
      cv.setAttribute('aria-hidden', 'true');
      document.body.prepend(cv);
      startSky(cv);
    }
  });

  // â”€â”€ NAV NELLA TOPBAR â”€â”€
  onBody(function () {
    var bar = document.getElementById('v8-inner-topbar');
    if (!bar || bar.querySelector('.v8i-nav')) return;
    var nav = document.createElement('div');
    nav.className = 'v8i-nav';
    nav.innerHTML =
      '<style>' +
      '.v8i-nav{display:flex;align-items:center;gap:1.1rem;margin-left:auto;overflow-x:auto;scrollbar-width:none}' +
      '.v8i-nav::-webkit-scrollbar{display:none}' +
      '.v8i-nav a{white-space:nowrap;font-size:1.05rem!important}' +
      '.v8i-nav a.act{color:#EDE8DF!important;border-bottom:1px solid #8B5CF6;padding-bottom:2px}' +
      '@media(max-width:760px){.v8i-nav a{font-size:.95rem!important}}' +
      '</style>' +
      '<a href="/pages/algoritmi/" data-pp="algoritmi">Algoritmi</a>' +
      '<a href="/pages/sestine-proposte/" data-pp="proposte">Sestine</a>' +
      '<a href="/pages/storico-estrazioni/" data-pp="storico">Storico</a>' +
      '<a href="/pages/laboratorio-tecnico/" data-pp="laboratorio">Lab</a>' +
      '<a href="/pages/community/" data-pp="community">Community</a>';
    bar.appendChild(nav);
    var pid = (document.body.getAttribute('data-page-id') || '').toLowerCase();
    nav.querySelectorAll('a[data-pp]').forEach(function (x) {
      if (pid.indexOf(x.getAttribute('data-pp')) === 0) x.classList.add('act');
    });
  });

  onBody(function () {
    var staleChips = document.getElementById('v8-global-chips');
    if (staleChips) staleChips.remove();
    injectPageHero();
    buildGlobalSignals();
  });

  function parseCSV(text) {
    var rows = [];
    String(text || '').split(/\r?\n/).forEach(function (line, idx) {
      if (!line || idx === 0) return;
      var p = line.split(',');
      if (p.length < 8) return;
      var nums = [];
      for (var i = 2; i < 8; i++) {
        var n = parseInt(p[i], 10);
        if (!isNaN(n) && n >= 1 && n <= 90) nums.push(n);
      }
      if (nums.length === 6) rows.push({ seq: p[0], date: p[1], nums: nums });
    });
    return rows;
  }

  function pageLabel(pid) {
    var cleanTitle = document.title.replace(/\s*-\s*SuperEnalotto.*$/i, '');
    var map = {
      algoritmi: ['Algoritmi', 'Algoritmi in ranking', 'modelli statistici, logici, neurali e ibridi ordinati per punteggio'],
      storico: ['Archivio storico', 'Storico estrazioni', '90 numeri letti come una mappa viva'],
      ranking: ['Algoritmi', 'Algoritmi in ranking', 'confronto continuo tra segnali indipendenti'],
      proposte: ['Sestine', 'Sestine proposte', 'campioni generati dagli algoritmi attivi'],
      laboratorio: ['Laboratorio tecnico', 'Lab Control Chaos', 'dataset, pipeline e trasparenza operativa'],
      community: ['Community', 'Osservatorio condiviso', 'lettura collettiva dei segnali statistici'],
      algsheet: ['Scheda algoritmo', cleanTitle, 'metodo, metriche e limiti dichiarati']
    };
    return map[pid] || ['Osservatorio statistico', cleanTitle || 'Control Chaos', 'SuperEnalotto Control Chaos'];
  }

  function v8Escape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function v8ParseKvCsv(text) {
    var out = {};
    String(text || '').split(/\r?\n/).forEach(function (line, idx) {
      if (!line || idx === 0) return;
      var cut = line.indexOf(',');
      if (cut < 0) return;
      var key = line.slice(0, cut).trim().toUpperCase();
      var val = line.slice(cut + 1).trim();
      if (key) out[key] = val;
    });
    return out;
  }

  function v8ParseHistoricalCsv(text) {
    var rows = [];
    String(text || '').split(/\r?\n/).forEach(function (line, idx) {
      if (!line || idx === 0) return;
      var p = line.split(',');
      if (p.length < 8) return;
      var picks = p.slice(2, 8).map(function (raw) {
        var hit = /\[/.test(raw);
        var n = parseInt(String(raw).replace(/[^\d]/g, ''), 10);
        return { n: isNaN(n) ? null : n, hit: hit };
      }).filter(function (x) { return x.n != null; });
      rows.push({
        seq: p[0],
        date: p[1],
        picks: picks,
        hit: picks.filter(function (x) { return x.hit; }).length
      });
    });
    return rows;
  }

  function v8ExtractProposal(text) {
    var m = String(text || '').match(/Sestina proposta:\s*([0-9\s]+)/i);
    if (!m) return [];
    return m[1].trim().split(/\s+/).map(function (x) { return parseInt(x, 10); })
      .filter(function (n) { return n >= 1 && n <= 90; }).slice(0, 6);
  }

  function v8ExtractMetric(text, re) {
    var m = String(text || '').match(re);
    return m ? m[1] : '';
  }

  function setV8TopbarVersion(drawSeq) {
    var el = document.querySelector('[data-v8-version]');
    if (!el) return;
    var base = String(window.CC_VERSION || '00.00.000').trim() || '00.00.000';
    var seq = parseInt(String(drawSeq || ''), 10);
    el.textContent = base + (Number.isFinite(seq) && seq > 0 ? '.' + String(seq).padStart(5, '0') : '');
  }

  function v8BuildPerformanceSvg(rows) {
    var data = rows.slice(-40);
    if (!data.length) {
      return '<line x1="0" y1="120" x2="800" y2="120"/><text x="400" y="126" text-anchor="middle" fill="rgba(237,232,223,.36)" font-size="18">Storico non disponibile</text>';
    }
    var maxHit = Math.max(3, Math.max.apply(null, data.map(function (r) { return r.hit; })));
    var rolling = data.map(function (r, i) {
      if (r && typeof r.moving_avg === 'number') return r.moving_avg;
      var part = data.slice(Math.max(0, i - 9), i + 1);
      var avg = part.reduce(function (a, row) { return a + (+row.hit || 0); }, 0) / Math.max(1, part.length);
      return avg;
    });
    function y(v) { return 210 - (v / maxHit) * 170; }
    var main = '', avg = '', area = '';
    var dots = '';
    data.forEach(function (r, i) {
      var x = data.length === 1 ? 400 : i * (800 / (data.length - 1));
      var yy = y(+r.hit || 0);
      var ay = y(rolling[i]);
      main += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + yy.toFixed(1) + ' ';
      avg += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + ay.toFixed(1) + ' ';
      if ((+r.hit || 0) >= 3) dots += '<circle cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="5" class="hitdot"><title>' + v8Escape(r.date + ' - ' + r.hit + ' hit') + '</title></circle>';
    });
    area = main + 'L800 240 L0 240 Z';
    return '<defs><linearGradient id="v8sheet-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(139,92,246,.28)"/><stop offset="100%" stop-color="rgba(139,92,246,0)"/></linearGradient></defs>' +
      '<line x1="0" y1="40" x2="800" y2="40"/><line x1="0" y1="100" x2="800" y2="100"/><line x1="0" y1="160" x2="800" y2="160"/>' +
      '<path class="area" d="' + area + '"/><path class="avg" d="' + avg + '"/><path class="main" d="' + main + '"/>' + dots;
  }

  function hydrateV8SheetData(sheet, card, fallbackBalls, fallbackMetrics) {
    if (!sheet || sheet.dataset.v8Hydrated === '1') return;
    sheet.dataset.v8Hydrated = '1';
    fetchJsonAsset('data/precomputed/algorithm-sheets.json', null)
      .then(function (payload) {
      var sheets = payload && payload.sheets && typeof payload.sheets === 'object' ? payload.sheets : {};
      var path = '/' + String((card && card.page) || window.location.pathname).replace(/^\/+/, '').replace(/index\.html$/i, '');
      if (path.slice(-1) !== '/') path += '/';
      var slug = path.split('/').filter(Boolean).pop() || '';
      var data = sheets[slug] || null;
      if (!data) {
        Object.keys(sheets).some(function (key) {
          var item = sheets[key];
          var p = '/' + String((item && item.page) || '').replace(/^\/+/, '').replace(/index\.html$/i, '');
          if (p.slice(-1) !== '/') p += '/';
          if (p === path) { data = item; return true; }
          return false;
        });
      }
      if (!data) return;
      var rows = data.performance && Array.isArray(data.performance.rows) ? data.performance.rows : [];
      var proposal = Array.isArray(data.proposal) ? data.proposal : [];
      var balls = proposal.length === 6 ? proposal : fallbackBalls;
      var chart = sheet.querySelector('[data-v8sheet-chart]');
      var ballsHost = sheet.querySelector('[data-v8sheet-balls]');
      var metodo = sheet.querySelector('[data-v8sheet-metodo]');
      var metrics = sheet.querySelector('[data-v8sheet-metrics]');
      var perfK = sheet.querySelector('[data-v8sheet-perf-title]');
      if (ballsHost) {
        ballsHost.innerHTML = balls.map(function (n, i) {
          return '<span class="v8sheet-ball" style="--d:' + (0.08 + i * 0.08) + 's">' + String(n).padStart(2, '0') + '</span>';
        }).join('') + (balls.length ? '<span class="v8sheet-ball j" style="--d:.62s">' + (((balls[5] || 1) * 7) % 90 + 1) + '</span>' : '') +
        '<p class="v8sheet-note">Proposta algoritmica &middot; Non una previsione &middot; Il gioco comporta rischi &middot; 18+</p>';
      }
      if (chart) chart.innerHTML = v8BuildPerformanceSvg(rows);
      if (perfK) perfK.textContent = (data.performance && data.performance.label) || (rows.length ? 'Performance - ultimi ' + Math.min(40, rows.length) + ' concorsi' : 'Performance storica');

      var m = data.metrics || {};
      var avgHit = m.avg_hits || '';
      var hit2 = m.hit_rate_gte_2 || '';
      var hit3 = m.hit_rate_gte_3 || '';
      var last200 = m.last_200_avg || '';
      var std = m.std_hit || '';
      var signal = m.ranking_stability_pct || fallbackMetrics.signal || 12;
      if (metrics) {
        metrics.innerHTML =
          '<div class="v8sheet-mc"><b>' + signal + '%</b><span>Stabilita ranking</span><i style="--w:' + signal + '%"></i></div>' +
          '<div class="v8sheet-mc amber"><b>' + (hit2 || (fallbackMetrics.coverage || '--') + '%') + '</b><span>Hit rate >=2</span><i style="--w:' + Math.max(8, Math.min(96, parseFloat(hit2) || fallbackMetrics.coverage || 12)) + '%"></i></div>' +
          '<div class="v8sheet-mc red"><b>' + (hit3 || '--') + '</b><span>Hit rate >=3</span><i style="--w:' + Math.max(8, Math.min(96, (parseFloat(hit3) || 0) * 12 + 8)) + '%"></i></div>' +
          '<div class="v8sheet-mc cyan"><b>' + (avgHit || fallbackMetrics.media || 'N/D') + '</b><span>Hit medi</span><i style="--w:' + Math.max(10, Math.min(96, (parseFloat(avgHit) || parseFloat(fallbackMetrics.media) || 0) * 42)) + '%"></i></div>' +
          '<div class="v8sheet-mc green"><b>' + (last200 || '--') + '</b><span>Media ultimi 200</span><i style="--w:' + Math.max(10, Math.min(96, (parseFloat(last200) || 0) * 42)) + '%"></i></div>' +
          '<div class="v8sheet-mc"><b>' + (std || '--') + '</b><span>Deviazione hit</span><i style="--w:' + Math.max(10, Math.min(96, (parseFloat(std) || 0) * 80)) + '%"></i></div>';
      }
      if (metodo) {
        var methodData = data.method || {};
        var intro = methodData.intro || card.narrativeSummary || card.subtitle || 'Scheda tecnica del modulo.';
        var method = methodData.method || '';
        var limits = methodData.limits || 'Le metriche descrivono comportamento storico, non garanzie predittive.';
        var observed = methodData.observed_results || '';
        metodo.innerHTML =
          '<p class="drop">' + v8Escape(intro) + '</p>' +
          (method ? '<blockquote>' + v8Escape(method) + '</blockquote>' : '') +
          '<p>' + v8Escape(methodData.scope || 'La lettura corretta e comparativa: confronta questa scheda con storico, ranking e altri modelli.') + '</p>' +
          (observed ? '<pre class="v8sheet-analysis">' + v8Escape(observed.trim()) + '</pre>' : '') +
          '<p>' + v8Escape(limits) + '</p>';
      }
    }).catch(function () { /* payload statico opzionale: fallback visuale gia' presente */ });
  }

  /* ── Storico completo concorso per concorso con hit evidenziati (stile legacy) ── */
  function hydrateV8SheetHistory(sheet) {
    if (!sheet || sheet.querySelector('#v8sheet-storico')) return;
    var base = String(window.location.pathname || '').replace(/index\.html$/i, '');
    if (base.slice(-1) !== '/') base += '/';
    fetch(base + 'out/historical-db.csv', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (text) {
        if (!text) return;
        var lines = text.replace(/\r/g, '').split('\n');
        var rows = [];
        for (var i = 1; i < lines.length; i++) {
          var p = lines[i].split(',');
          if (p.length < 8) continue;
          var nums = [];
          var hitCount = 0;
          for (var j = 2; j < 8; j++) {
            var raw = String(p[j] || '').trim();
            var isHit = raw.indexOf('[') !== -1;
            var m = /\d+/.exec(raw);
            if (!m) continue;
            if (isHit) hitCount++;
            nums.push({ n: +m[0], hit: isHit });
          }
          if (nums.length === 6) rows.push({ seq: p[0], date: p[1], nums: nums, hits: hitCount });
        }
        if (!rows.length) return;
        rows.reverse(); // piu recenti in alto

        var section = document.createElement('section');
        section.className = 'v8sheet-sec';
        section.id = 'v8sheet-storico';
        section.innerHTML =
          '<div class="v8sheet-k">Concorso per concorso &middot; ' + rows.length.toLocaleString('it-IT') + ' estrazioni &middot; numeri indovinati evidenziati</div>' +
          '<div class="v8hist" data-v8hist-list></div>' +
          '<div class="v8hist-foot">' +
            '<button type="button" class="v8sheet-btn" data-v8hist-more>Mostra altri</button>' +
            '<span class="v8hist-count" data-v8hist-count></span>' +
          '</div>';
        var actions = sheet.querySelector('.v8sheet-actions');
        if (actions) sheet.insertBefore(section, actions);
        else sheet.appendChild(section);

        var nav = sheet.querySelector('.v8sheet-subnav');
        if (nav) {
          var link = document.createElement('a');
          link.href = '#v8sheet-storico';
          link.textContent = 'Concorsi';
          nav.appendChild(link);
        }

        var list = section.querySelector('[data-v8hist-list]');
        var moreBtn = section.querySelector('[data-v8hist-more]');
        var countEl = section.querySelector('[data-v8hist-count]');
        var PAGE = 100;
        var shown = 0;

        function rowHtml(r) {
          return '<div class="v8hist-row' + (r.hits >= 2 ? ' good' : '') + '">' +
            '<span class="v8hist-seq">#' + v8Escape(r.seq) + '</span>' +
            '<span class="v8hist-date">' + v8Escape(r.date) + '</span>' +
            '<span class="v8hist-nums">' + r.nums.map(function (x) {
              return '<span class="v8hist-n' + (x.hit ? ' hit' : '') + '">' + String(x.n).padStart(2, '0') + '</span>';
            }).join('') + '</span>' +
            '<span class="v8hist-hits">' + (r.hits ? r.hits + ' hit' : '&ndash;') + '</span>' +
          '</div>';
        }

        function renderMore() {
          var next = rows.slice(shown, shown + PAGE);
          shown += next.length;
          list.insertAdjacentHTML('beforeend', next.map(rowHtml).join(''));
          countEl.textContent = shown.toLocaleString('it-IT') + ' / ' + rows.length.toLocaleString('it-IT') + ' concorsi';
          if (shown >= rows.length) moreBtn.style.display = 'none';
        }

        moreBtn.addEventListener('click', renderMore);
        renderMore();
      })
      .catch(function () { /* storico opzionale */ });
  }

  function mountV8SheetBodyOnly(card) {
    if (document.querySelector('.v8sheet-body')) return;
    var hero = document.querySelector('.v8sh');
    if (!hero) return;
    var page = String((card && card.page) || window.location.pathname || '');
    var seed = page || document.title;
    var fallbackBalls = [];
    var seedNum = 0;
    String(seed).split('').forEach(function (ch) { seedNum = (seedNum * 31 + ch.charCodeAt(0)) >>> 0; });
    while (fallbackBalls.length < 6) {
      seedNum = (seedNum * 1664525 + 1013904223) >>> 0;
      var n = (seedNum % 90) + 1;
      if (fallbackBalls.indexOf(n) === -1) fallbackBalls.push(n);
    }
    fallbackBalls.sort(function (a, b) { return a - b; });
    var sheet = document.createElement('div');
    sheet.className = 'v8sheet-body';
    sheet.innerHTML =
      '<nav class="v8sheet-subnav" aria-label="Navigazione scheda">' +
        '<a href="#v8sheet-sestina" class="on">Sestina</a>' +
        '<a href="#v8sheet-perf">Performance</a>' +
        '<a href="#v8sheet-metriche">Metriche</a>' +
        '<a href="#v8sheet-metodo">Metodo</a>' +
      '</nav>' +
      '<section class="v8sheet-sec" id="v8sheet-sestina">' +
        '<div class="v8sheet-k">Proposta algoritmica</div>' +
        '<div class="v8sheet-sest" data-v8sheet-balls>' +
          fallbackBalls.map(function (value, i) { return '<span class="v8sheet-ball" style="--d:' + (0.08 + i * 0.08) + 's">' + String(value).padStart(2, '0') + '</span>'; }).join('') +
          '<span class="v8sheet-ball j" style="--d:.62s">' + (((fallbackBalls[5] || 1) * 7) % 90 + 1) + '</span>' +
          '<p class="v8sheet-note">Proposta algoritmica &middot; Non una previsione &middot; Il gioco comporta rischi &middot; 18+</p>' +
        '</div>' +
      '</section>' +
      '<section class="v8sheet-sec" id="v8sheet-perf">' +
        '<div class="v8sheet-k" data-v8sheet-perf-title>Performance storica</div>' +
        '<div class="v8sheet-chart"><svg viewBox="0 0 800 240" preserveAspectRatio="none" aria-label="Andamento performance algoritmo" data-v8sheet-chart></svg>' +
        '<div class="v8sheet-legend"><span><i></i>Hit per concorso</span><span><i class="avg"></i>Media mobile</span><span><i class="dot"></i>Hit &gt;= 3</span></div></div>' +
      '</section>' +
      '<section class="v8sheet-sec" id="v8sheet-metriche">' +
        '<div class="v8sheet-k">Metriche di affidabilita</div>' +
        '<div class="v8sheet-mgrid" data-v8sheet-metrics></div>' +
      '</section>' +
      '<section class="v8sheet-sec" id="v8sheet-metodo">' +
        '<div class="v8sheet-k">Come ragiona</div>' +
        '<div class="v8sheet-prose" data-v8sheet-metodo></div>' +
      '</section>' +
      '<section class="v8sheet-sec v8sheet-actions">' +
        '<a class="v8sheet-btn primary" href="/pages/algoritmi/">Algoritmi in ranking</a>' +
        '<a class="v8sheet-btn" href="/pages/algoritmi/">Tutti gli algoritmi</a>' +
        '<a class="v8sheet-btn" href="/pages/storico-estrazioni/">Apri storico</a>' +
      '</section>';
    placeSheetPrevNextAfterHero();
    var nav = document.querySelector('[data-alg-prev-next="1"]');
    if (nav && nav.parentNode) nav.insertAdjacentElement('afterend', sheet);
    else hero.insertAdjacentElement('afterend', sheet);
    hydrateV8SheetData(sheet, card || { page: window.location.pathname }, fallbackBalls, { signal: 50, coverage: 50, media: null });
    hydrateV8SheetHistory(sheet);
    setupV8SheetInteractions(sheet);
  }

  function injectPageHero() {
    if (document.querySelector('.v8-page-hero')) return;
    var main = document.querySelector('main');
    if (!main) return;
    var pid = (document.body.getAttribute('data-page-id') || '').toLowerCase();
    if (pid === 'algsheet') return;
    var lab = pageLabel(pid);
    var hero = document.createElement('section');
    hero.className = 'v8-page-hero';
    hero.innerHTML =
      '<div class="v8ph-k">' + lab[0] + ' &middot; SuperEnalotto &middot; Control Chaos</div>' +
      '<div class="v8ph-title"><span>' + lab[1] + '</span></div>' +
      '<div class="v8ph-sub">' + lab[2] + '</div>' +
      '<div class="v8ph-line"></div>';
    main.prepend(hero);
  }

  function buildGlobalSignals() {
    if (document.getElementById('v8-global-ticker')) return;
    Promise.all([
      fetchJsonAsset('data/cards-index.json', []),
      fetchTextAsset('archives/draws/draws.csv')
    ]).then(function (res) {
      var cards = res[0] || [];
      var draws = parseCSV(res[1] || '');
      var ranked = cards.filter(function (c) { return c && c.rankingPosition; });
      ranked.sort(function (a, b) { return a.rankingPosition - b.rankingPosition; });
      var last = draws.length ? draws[draws.length - 1] : null;
      setV8TopbarVersion(last ? last.seq : '');
      var lastSeen = new Array(91).fill(-1);
      var worstN = 0, worstD = -1, hotN = 0, hotC = 0;
      draws.forEach(function (d, i) { d.nums.forEach(function (n) { lastSeen[n] = i; }); });
      for (var n = 1; n <= 90; n++) {
        var dly = lastSeen[n] >= 0 ? (draws.length - 1 - lastSeen[n]) : draws.length;
        if (dly > worstD) { worstD = dly; worstN = n; }
      }
      var freq = new Array(91).fill(0);
      draws.slice(-90).forEach(function (d) { d.nums.forEach(function (n) { freq[n]++; }); });
      for (n = 1; n <= 90; n++) if (freq[n] > hotC) { hotC = freq[n]; hotN = n; }

      var bar = document.getElementById('v8-inner-topbar');
      if (bar && !bar.querySelector('.v8i-live')) {
        var live = document.createElement('div');
        live.className = 'v8i-live';
        live.innerHTML =
          '<span class="v8i-jk">Archivio ' + draws.length.toLocaleString('it-IT') + '</span>' +
          '<span class="v8i-dot"></span>' +
          '<span class="v8i-cd">' + (last ? last.date : '--') + '</span>';
        bar.appendChild(live);
      }

      var items = [];
      if (last) {
        items.push('Ultima estrazione <b class="o">' + last.date + '</b>');
        items.push('Numeri <b>' + last.nums.join(' &middot; ') + '</b>');
      }
      items.push('Archivio <b class="cy">' + draws.length.toLocaleString('it-IT') + '</b> estrazioni');
      items.push('Ritardo critico <b class="r">' + worstN + '</b> &middot; ' + worstD + ' concorsi');
      if (ranked[0]) items.push('Algoritmo in testa <b class="v">' + (ranked[0].title || ranked[0].id) + '</b>');
      items.push('Gioca responsabilmente &middot; nessuna promessa di vincita &middot; 18+');
      var ticker = document.createElement('div');
      ticker.id = 'v8-global-ticker';
      var sep = '<span class="sep">&#9670;</span>';
      var html = items.map(function (x) { return '<span>' + x + '</span>'; }).join(sep) + sep;
      ticker.innerHTML = '<div>' + html + html + '</div>';
      document.body.appendChild(ticker);
    });
  }

  function startSky(cv) {
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, mx = -9999, my = -9999;
    function resize() {
      W = cv.width = cv.clientWidth || window.innerWidth;
      H = cv.height = cv.clientHeight || window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    var pts = [];
    for (var i = 1; i <= 90; i++) {
      pts.push({ n: i, x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18 });
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      var link = 130, link2 = link * link;
      for (var i = 0; i < pts.length; i++) {
        for (var j = i + 1; j < pts.length; j++) {
          var a = pts[i], b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < link2) {
            ctx.strokeStyle = 'rgba(139,92,246,' + ((1 - d2 / link2) * 0.055).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        var ddx = p.x - mx, ddy = p.y - my, d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < 110 && d > 0) { p.x += ddx / d * 0.45; p.y += ddy / d * 0.45; }
        var near = d < 130;
        ctx.fillStyle = near ? 'rgba(237,232,223,.55)' : 'rgba(237,232,223,.16)';
        ctx.beginPath(); ctx.arc(p.x, p.y, near ? 2.4 : 1.5, 0, 7); ctx.fill();
        if (near) {
          ctx.fillStyle = 'rgba(237,232,223,.75)';
          ctx.font = '500 10px "DM Mono",monospace';
          ctx.fillText(p.n, p.x + 7, p.y - 6);
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // â”€â”€ HERO SCHEDA ALGORITMO (score ring) â”€â”€
  onBody(function () {
    if ((document.body.getAttribute('data-page-id') || '') !== 'algsheet') return;
    clearStaleSheetTitles();
    if (document.querySelector('.v8sh')) {
      mountV8SheetBodyOnly({ page: window.location.pathname });
      return;
    }
    var anchor = document.querySelector('[data-page-kicker-wrap]') ||
                 document.querySelector('main .content-box') ||
                 document.querySelector('main');
    if (!anchor) return;

    fetchJsonAsset('data/cards-index.json', [])
      .then(function (cards) {
        function normPagePath(value) {
          var p = '/' + String(value || '').replace(/^\/+/, '');
          p = p.replace(/index\.html$/i, '');
          if (p.slice(-1) !== '/') p += '/';
          return p;
        }
        var path = normPagePath(window.location.pathname);
        var card = null;
        for (var i = 0; i < cards.length; i++) {
          var p = normPagePath(cards[i].page);
          if (p !== '/' && path === p) { card = cards[i]; break; }
        }
        if (!card) {
          var title = document.title.replace(/\s*-\s*SuperEnalotto.*$/i, '') || 'Scheda algoritmo';
          var desc = document.querySelector('meta[name="description"]');
          card = {
            id: path.split('/').filter(Boolean).pop() || title,
            title: title,
            subtitle: desc ? desc.getAttribute('content') : '',
            macroGroup: 'statistica',
            isActive: true,
            accessTier: 'free',
            page: path
          };
        }

        var GROUPS = {
          statistica: { label: 'Statistico', ac: '#F59E0B' },
          neurale:    { label: 'Neurale',    ac: '#8B5CF6' },
          ibrido:     { label: 'Ibrido',     ac: '#C8391A' },
          storico:    { label: 'Storico',    ac: '#6EE7FF' }
        };
        var g = GROUPS[card.macroGroup] || GROUPS.statistica;

        // ranking &rarr; percentuale ring
        var pos = card.rankingPosition || null;
        var tot = 0;
        cards.forEach(function (c) { if (c.rankingPosition) tot++; });
        var pct = (pos && tot) ? (tot - pos + 1) / tot : 0.5;

        // metriche da exactHits
        var hits = card.exactHits || card.hits || null;
        var sum = 0, weighted = 0, h3p = 0;
        if (hits && typeof hits === 'object') {
          Object.keys(hits).forEach(function (k) {
            var n = parseInt(k, 10), v = +hits[k] || 0;
            if (isNaN(n)) return;
            sum += v; weighted += n * v;
            if (n >= 3) h3p += v;
          });
        }
        var media = sum ? (weighted / sum).toFixed(2) : null;
        var h0 = hits && hits[0] ? +hits[0] : 0;
        var h1 = hits && hits[1] ? +hits[1] : 0;
        var h2 = hits && hits[2] ? +hits[2] : 0;
        var h3 = hits && hits[3] ? +hits[3] : 0;
        var h4 = hits && hits[4] ? +hits[4] : 0;
        var stability = sum ? Math.round(((h2 + h3 * 2 + h4 * 3) / Math.max(1, sum)) * 1000) : Math.round(pct * 100);
        stability = Math.max(8, Math.min(98, stability));
        var signal = Math.max(10, Math.min(96, Math.round(pct * 100)));
        var coverage = sum ? Math.max(10, Math.min(96, Math.round((1 - h0 / Math.max(1, sum)) * 100))) : signal;

        function synthNums(seedText) {
          var seed = 0;
          String(seedText || '').split('').forEach(function (ch) { seed = (seed * 31 + ch.charCodeAt(0)) >>> 0; });
          var nums = [];
          while (nums.length < 6) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            var n = (seed % 90) + 1;
            if (nums.indexOf(n) === -1) nums.push(n);
          }
          return nums.sort(function (a, b) { return a - b; });
        }
        var balls = synthNums(card.id || card.title);
        var sparkMax = Math.max(1, h0, h1, h2, h3, h4);
        var spark = [h0, h1, h2, h3, h4].map(function (v, i) {
          return (i * 25) + ',' + (46 - (v / sparkMax) * 40).toFixed(1);
        }).join(' ');

        var R = 120, CIRC = 2 * Math.PI * R;
        var score = Math.max(0, Math.min(10.5, pct * 10.5));
        var scoreLabel = score.toFixed(1);
        var hero = document.createElement('section');
        hero.className = 'v8sh';
        hero.style.setProperty('--ac', g.ac);
        hero.innerHTML =
          '<div>' +
            '<span class="v8sh-gr">Famiglia ' + g.label + (pos ? ' &middot; Rank #' + String(pos).padStart(2, '0') : '') + '</span>' +
            '<div class="v8sh-title">' + (card.title || card.id) + '</div>' +
            (card.subtitle ? '<div class="v8sh-sub">' + card.subtitle + '</div>' : '') +
            '<div class="v8sh-badges">' +
              (card.isActive ? '<span class="v8sh-b on">&#9679; Attivo</span>' : '<span class="v8sh-b">Inattivo</span>') +
              (card.accessTier ? '<span class="v8sh-b">' + card.accessTier + ' tier</span>' : '') +
              (card.lastUpdated ? '<span class="v8sh-b">Agg. ' + card.lastUpdated + '</span>' : '') +
              (sum ? '<span class="v8sh-b">' + sum.toLocaleString('it-IT') + ' concorsi valutati</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="v8sh-side">' +
          '<div class="v8sh-ring">' +
            '<svg width="300" height="300" viewBox="0 0 300 300">' +
              '<defs><linearGradient id="v8shg" x1="0" y1="0" x2="1" y2="1">' +
                '<stop offset="0%" stop-color="#8B5CF6"/><stop offset="60%" stop-color="#C8391A"/><stop offset="100%" stop-color="#F59E0B"/>' +
              '</linearGradient></defs>' +
              '<circle class="bgc" cx="150" cy="150" r="' + R + '" fill="none" stroke-width="10"/>' +
              '<circle class="fgc" cx="150" cy="150" r="' + R + '" fill="none" stroke-width="10" ' +
                'stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="' + CIRC.toFixed(1) + '"/>' +
            '</svg>' +
            '<div class="v8sh-mid">' +
              '<span class="v">' + (pos ? '#' + String(pos).padStart(2, '0') : '-') + '</span>' +
              '<span class="l">Score complessivo</span>' +
              (media ? '<span class="l" style="margin-top:.3rem;color:rgba(245,158,11,.7)">' + media + ' hit medi &middot; ' + h3p + 'x &gt;=3</span>' : '') +
            '</div>' +
          '</div>' +
          '<svg class="v8sh-spark" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">' +
            '<polyline points="' + spark + '" fill="none" stroke="var(--ac)" stroke-width="2" stroke-linejoin="round"/>' +
            '<line x1="0" y1="46" x2="100" y2="46" stroke="rgba(237,232,223,.08)" />' +
          '</svg>' +
          '</div>';

        if (anchor.matches && (anchor.matches('main .content-box') || anchor.matches('main'))) {
          anchor.prepend(hero);
        } else {
          anchor.insertAdjacentElement('afterend', hero);
        }
        var scoreElInit = hero.querySelector('.v8sh-mid .v');
        if (scoreElInit) {
          scoreElInit.setAttribute('data-v8-score', scoreLabel);
          scoreElInit.textContent = '0.0';
        }
        var ringMeta = hero.querySelector('.v8sh-mid .l + .l');
        if (ringMeta) {
          ringMeta.className = 'rk';
          ringMeta.textContent = (pos ? 'Rank #' + String(pos).padStart(2, '0') : 'Rank catalogo') + (media ? ' &middot; ' + media + ' hit medi' : '');
        }
        placeSheetPrevNextAfterHero();
        if (!document.querySelector('.v8sheet-body')) {
          var sheet = document.createElement('div');
          sheet.className = 'v8sheet-body';
          sheet.innerHTML =
            '<nav class="v8sheet-subnav" aria-label="Navigazione scheda">' +
              '<a href="#v8sheet-sestina" class="on">Sestina</a>' +
              '<a href="#v8sheet-perf">Performance</a>' +
              '<a href="#v8sheet-metriche">Metriche</a>' +
              '<a href="#v8sheet-metodo">Metodo</a>' +
            '</nav>' +
            '<section class="v8sheet-sec" id="v8sheet-sestina">' +
              '<div class="v8sheet-k">Proposta algoritmica</div>' +
              '<div class="v8sheet-sest" data-v8sheet-balls>' +
                balls.map(function (n, i) { return '<span class="v8sheet-ball" style="--d:' + (0.08 + i * 0.08) + 's">' + n + '</span>'; }).join('') +
                '<span class="v8sheet-ball j" style="--d:.62s">' + (((balls[5] || 1) * 7) % 90 + 1) + '</span>' +
                '<p class="v8sheet-note">Proposta algoritmica &middot; Non una previsione &middot; Il gioco comporta rischi &middot; 18+</p>' +
              '</div>' +
            '</section>' +
            '<section class="v8sheet-sec" id="v8sheet-perf">' +
              '<div class="v8sheet-k" data-v8sheet-perf-title>Performance storica</div>' +
              '<div class="v8sheet-chart">' +
                '<svg viewBox="0 0 800 240" preserveAspectRatio="none" aria-label="Andamento performance algoritmo" data-v8sheet-chart>' +
                  '<line x1="0" y1="46" x2="800" y2="46"/><line x1="0" y1="118" x2="800" y2="118"/><line x1="0" y1="190" x2="800" y2="190"/>' +
                  '<path class="area" d="M0 ' + (46 - h0 / sparkMax * 40).toFixed(1) + ' L200 ' + (46 - h1 / sparkMax * 40).toFixed(1) + ' L400 ' + (46 - h2 / sparkMax * 40).toFixed(1) + ' L600 ' + (46 - h3 / sparkMax * 40).toFixed(1) + ' L800 ' + (46 - h4 / sparkMax * 40).toFixed(1) + ' L800 240 L0 240 Z"/>' +
                  '<polyline class="main" points="0,' + (46 - h0 / sparkMax * 40).toFixed(1) + ' 200,' + (46 - h1 / sparkMax * 40).toFixed(1) + ' 400,' + (46 - h2 / sparkMax * 40).toFixed(1) + ' 600,' + (46 - h3 / sparkMax * 40).toFixed(1) + ' 800,' + (46 - h4 / sparkMax * 40).toFixed(1) + '"/>' +
                  '<polyline class="avg" points="0,142 200,132 400,146 600,126 800,136"/>' +
                '</svg>' +
                '<div class="v8sheet-legend"><span><i></i>Hit per concorso</span><span><i class="avg"></i>Media mobile</span><span><i class="dot"></i>Hit >= 3</span></div>' +
              '</div>' +
            '</section>' +
            '<section class="v8sheet-sec" id="v8sheet-metriche">' +
              '<div class="v8sheet-k">Metriche di affidabilita</div>' +
              '<div class="v8sheet-mgrid" data-v8sheet-metrics>' +
                '<div class="v8sheet-mc"><b>' + signal + '%</b><span>Stabilita ranking</span><i style="--w:' + signal + '%"></i></div>' +
                '<div class="v8sheet-mc amber"><b>' + coverage + '%</b><span>Copertura storica</span><i style="--w:' + coverage + '%"></i></div>' +
                '<div class="v8sheet-mc red"><b>' + stability + '%</b><span>Anti-rumore</span><i style="--w:' + stability + '%"></i></div>' +
                '<div class="v8sheet-mc cyan"><b>' + (media || 'N/D') + '</b><span>Hit medi</span><i style="--w:' + Math.max(12, Math.min(96, Number(media || 0) * 42)) + '%"></i></div>' +
              '</div>' +
            '</section>' +
            '<section class="v8sheet-sec" id="v8sheet-metodo">' +
              '<div class="v8sheet-k">Come ragiona</div>' +
              '<div class="v8sheet-prose" data-v8sheet-metodo>' +
                '<p class="drop">' + (card.narrativeSummary || card.subtitle || 'Scheda tecnica del modulo: input, metriche, limiti e interpretazione statistica dello storico disponibile.') + '</p>' +
                '<blockquote>Non dice cosa uscira sicuramente. Ordina scenari e segnali in base alla coerenza osservata sul dataset storico.</blockquote>' +
                '<p>La lettura corretta e comparativa: confronta questa scheda con storico, ranking e altri modelli. Nessun sistema garantisce vincite e il gioco comporta rischi.</p>' +
              '</div>' +
            '</section>' +
            '<section class="v8sheet-sec v8sheet-actions">' +
              '<a class="v8sheet-btn primary" href="/pages/algoritmi/">Algoritmi in ranking</a>' +
              '<a class="v8sheet-btn" href="/pages/algoritmi/">Tutti gli algoritmi</a>' +
              '<a class="v8sheet-btn" href="/pages/storico-estrazioni/">Apri storico</a>' +
            '</section>';
          hero.insertAdjacentElement('afterend', sheet);
          hydrateV8SheetData(sheet, card, balls, { signal: signal, coverage: coverage, stability: stability, media: media });
          hydrateV8SheetHistory(sheet);
          setupV8SheetInteractions(sheet);
        }

        // anima il ring
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            hero.querySelector('.fgc').style.strokeDashoffset = (CIRC * (1 - pct)).toFixed(1);
            var scoreEl = hero.querySelector('[data-v8-score]');
            if (scoreEl) {
              var target = parseFloat(scoreEl.getAttribute('data-v8-score') || '0') || 0;
              var current = 0;
              var step = Math.max(0.08, target / 70);
              (function up() {
                current = Math.min(target, current + step);
                scoreEl.textContent = current.toFixed(1);
                if (current < target) requestAnimationFrame(up);
              })();
            }
          });
        });
      })
      .catch(function () { /* hero opzionale: nessun errore bloccante */ });
  });

  onBody(function () {
    if ((document.body.getAttribute('data-page-id') || '') !== 'algsheet') return;
    function mountLateSheetHero() {
      clearStaleSheetTitles();
      if (document.querySelector('.v8sh')) {
        mountV8SheetBodyOnly({ page: window.location.pathname });
        return;
      }
      var target = document.querySelector('main .content-box') || document.querySelector('main');
      if (!target) return;
      var title = document.title.replace(/\s*-\s*SuperEnalotto.*$/i, '') || 'Scheda algoritmo';
      var desc = document.querySelector('meta[name="description"]');
      var subtitle = desc ? desc.getAttribute('content') : 'Metodo, output e limiti operativi del modulo.';
      var hero = document.createElement('section');
      hero.className = 'v8sh';
      hero.style.setProperty('--ac', '#F59E0B');
      hero.innerHTML =
        '<div>' +
          '<span class="v8sh-gr">Scheda algoritmo</span>' +
          '<div class="v8sh-title">' + title + '</div>' +
          '<div class="v8sh-sub">' + subtitle + '</div>' +
          '<div class="v8sh-badges"><span class="v8sh-b on">&#9679; Attivo</span><span class="v8sh-b">Free tier</span><span class="v8sh-b">Metodo documentato</span></div>' +
        '</div>' +
        '<div class="v8sh-side">' +
          '<div class="v8sh-ring"><svg width="190" height="190" viewBox="0 0 190 190"><defs><linearGradient id="v8shg-late" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8B5CF6"/><stop offset="60%" stop-color="#C8391A"/><stop offset="100%" stop-color="#F59E0B"/></linearGradient></defs><circle class="bgc" cx="95" cy="95" r="78" fill="none" stroke-width="8"/><circle class="fgc" cx="95" cy="95" r="78" fill="none" stroke-width="8" stroke-dasharray="490" stroke-dashoffset="172"/></svg><div class="v8sh-mid"><span class="v">V8+</span><span class="l">Scheda migrata</span></div></div>' +
        '</div>';
      target.prepend(hero);
      (function enrichLateHero() {
        var kpis = Array.prototype.slice.call(document.querySelectorAll('[data-metric-card]')).map(function (el) {
          return (el.textContent || '').trim();
        });
        var gr = hero.querySelector('.v8sh-gr');
        var midValue = hero.querySelector('.v8sh-mid .v');
        var midLabel = hero.querySelector('.v8sh-mid .l');
        if (gr) gr.setAttribute('data-v8sh-family', '1');
        if (midValue) {
          midValue.setAttribute('data-v8sh-rank', '1');
          if (midValue.textContent === 'V8+') midValue.textContent = '--';
        }
        if (midLabel) midLabel.textContent = 'Rank catalogo';
        if (!hero.querySelector('.v8sh-metrics')) {
          var metrics = document.createElement('div');
          metrics.className = 'v8sh-metrics';
          metrics.innerHTML =
            '<div class="v8sh-m"><b>' + (kpis[0] || '--') + '</b><span>Concorsi</span><i style="--w:82%"></i></div>' +
            '<div class="v8sh-m"><b>' + (kpis[1] || '--') + '</b><span>Hit medi</span><i style="--w:52%"></i></div>' +
            '<div class="v8sh-m"><b>' + (kpis[2] || '--') + '</b><span>Hit rate</span><i style="--w:44%"></i></div>';
          var left = hero.firstElementChild;
          if (left) left.appendChild(metrics);
        }
        fetchJsonAsset('data/cards-index.json', [])
          .then(function (cards) {
            var path = window.location.pathname.replace(/index\.html$/i, '');
            if (path.slice(-1) !== '/') path += '/';
            var card = (cards || []).find(function (c) {
              var p = '/' + String((c && c.page) || '').replace(/^\/+/, '').replace(/index\.html$/i, '');
              if (p.slice(-1) !== '/') p += '/';
              return p === path;
            });
            if (!card) return;
            var rank = card.rankingPosition ? ('#' + String(card.rankingPosition).padStart(2, '0')) : '--';
            var familyEl = hero.querySelector('[data-v8sh-family]');
            var rankEl = hero.querySelector('[data-v8sh-rank]');
            if (familyEl) familyEl.textContent = 'Famiglia ' + (card.macroGroup || 'algoritmo') + (card.rankingPosition ? ' &middot; Rank ' + rank : '');
            if (rankEl) rankEl.textContent = rank;
          })
          .catch(function () {});
      })();
      placeSheetPrevNextAfterHero();
    }
    clearStaleSheetTitles();
    setTimeout(mountLateSheetHero, 400);
    setTimeout(mountLateSheetHero, 1400);
    setTimeout(placeSheetPrevNextAfterHero, 1800);
    setTimeout(placeSheetPrevNextAfterHero, 2600);
    setTimeout(clearStaleSheetTitles, 2200);
  });
})();
