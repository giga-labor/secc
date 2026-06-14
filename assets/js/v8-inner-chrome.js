(function () {
  'use strict';
  if (/^\/pages\/oracle\//.test(window.location.pathname || '')) return;
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

// Home chrome globale: stesso header/bottombar V8 della homepage sulle pagine interne.
(function () {
  'use strict';

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function isOraclePage() {
    return String(document.body && document.body.dataset ? document.body.dataset.pageId || '' : '').toLowerCase() === 'oracle'
      || /^\/pages\/oracle\//.test(window.location.pathname || '');
  }

  function rebuildInnerTopbar() {
    var bar = document.getElementById('v8-inner-topbar');
    if (!bar || bar.dataset.homeChrome === '1') return;
    bar.dataset.homeChrome = '1';
    bar.id = 'tb';
    bar.innerHTML =
      '<a class="tb-logo" href="/">' +
        '<canvas id="cc-logo" width="100" height="52" style="flex-shrink:0;"></canvas>' +
        '<div class="tb-logo-stack">' +
          '<div class="tb-logo-text">Control<b>Chaos</b></div>' +
          '<span class="tb-version" id="tb-version" data-v8-version>--</span>' +
        '</div>' +
      '</a>' +
      '<div class="tb-sep"></div>' +
      '<a class="tb-github" href="https://giga-labor.github.io/gigalabor-web/index.html" target="_blank" rel="noopener noreferrer" aria-label="Apri il sito GiGa Labor">' +
        '<svg class="tb-github-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
          '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>' +
        '</svg>' +
        '<span class="tb-github-label">GiGa Labor</span>' +
        '<span class="tb-gigalabor-tip" aria-hidden="true">' +
          '<span class="tb-gigalabor-kicker">// laboratorio digitale</span>' +
          '<span class="tb-gigalabor-title">Sito creato da GiGa Labor</span>' +
          '<span class="tb-gigalabor-body">Ingegneria digitale, ricerca e innovazione: scopri l&apos;identita creativa dietro questa esperienza.</span>' +
          '<span class="tb-gigalabor-note">Apre una pagina esterna in una nuova scheda.</span>' +
        '</span>' +
      '</a>' +
      '<div class="tb-r">' +
        '<span class="tb-jk" id="v8-jackpot"><span class="tb-jk-label">Jackpot</span><span class="tb-jk-value">in caricamento</span></span>' +
        '<div class="tb-sep"></div>' +
        '<span class="tb-cd-wrap" aria-label="Mancano al prossimo concorso"><span class="tb-cd-label">Mancano</span><span class="tb-cd" id="cd">--:--:--</span></span>' +
        '<div class="tb-sep"></div>' +
        '<span id="v8-alg-count" style="font-size:1.36rem;letter-spacing:.1em;color:rgba(237,232,223,.25)">-- Algoritmi</span>' +
      '</div>';
  }

  function injectHomeChromeRules() {
    if (document.getElementById('v8-home-chrome-rules')) return;
    var css = document.createElement('style');
    css.id = 'v8-home-chrome-rules';
    css.textContent =
      '#tb{' +
        'position:fixed!important;top:0!important;left:0!important;right:var(--ad-reserve-right,0px)!important;height:88px!important;' +
        'z-index:9000!important;display:flex!important;align-items:center!important;padding:0 2rem!important;gap:clamp(.7rem,1.2vw,1.8rem)!important;' +
        'background:linear-gradient(180deg,rgba(3,1,9,.92) 60%,transparent)!important;' +
        'backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important;' +
        'border-bottom:1px solid rgba(237,232,223,.04)!important;box-sizing:border-box!important;font-family:"DM Mono",monospace!important;min-width:0!important;overflow:hidden!important;' +
      '}' +
      'body{padding-top:88px!important;padding-bottom:calc(var(--ad-reserve-bottom,0px) + 38px)!important;}' +
      '#tb .tb-logo{display:flex;align-items:center;gap:.7rem;text-decoration:none;min-width:0;flex-shrink:0;color:inherit!important;}' +
      '#tb .tb-logo canvas{width:100px;height:52px;flex-shrink:0;}' +
      '#tb .tb-logo-text{font-family:"BioRhyme",serif;font-weight:800;font-size:2.2rem;letter-spacing:-.02em;color:#EDE8DF;line-height:1;text-transform:none;}' +
      '#tb .tb-logo-text b{background:linear-gradient(90deg,#8B5CF6,#C8391A);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}' +
      '#tb .tb-logo-stack{display:flex;flex-direction:column;gap:.15rem;}' +
      '#tb .tb-version{font-family:"BioRhyme",serif;font-weight:400;font-size:1rem;letter-spacing:.12em;color:rgba(237,232,223,.2);line-height:1;}' +
      '#tb .tb-sep{width:1px;height:20px;background:rgba(237,232,223,.07);flex-shrink:0;}' +
      '#tb .tb-github{position:relative;display:flex;align-items:center;gap:.5rem;min-height:32px;padding:.35rem .72rem;color:#EDE8DF;text-decoration:none;background:linear-gradient(135deg,rgba(255,176,0,.16),rgba(255,102,0,.1));border:1px solid rgba(255,176,0,.3);border-radius:999px;box-shadow:0 0 18px rgba(255,176,0,.1),inset 0 0 0 1px rgba(237,232,223,.04);transition:color .2s,border-color .2s,background .2s,box-shadow .2s,transform .2s;}' +
      '#tb .tb-github:hover{color:#fff;background:linear-gradient(135deg,rgba(255,176,0,.24),rgba(255,102,0,.16));border-color:rgba(255,176,0,.62);box-shadow:0 0 24px rgba(255,176,0,.2),0 0 16px rgba(255,102,0,.12),inset 0 0 0 1px rgba(237,232,223,.08);transform:translateY(-1px);}' +
      '#tb .tb-github-icon{width:16px;height:16px;flex-shrink:0;}#tb .tb-github-label{font-size:1.1rem;letter-spacing:.12em;text-transform:uppercase;font-weight:600;}' +
      '#tb .tb-gigalabor-tip{position:absolute;left:50%;top:calc(100% + 11px);width:min(34rem,calc(100vw - 2.4rem));padding:.95rem 1rem 1rem;display:grid;gap:.28rem;color:#fff;background:linear-gradient(160deg,rgba(255,176,0,.16),rgba(255,102,0,.08) 38%,rgba(5,5,5,.98) 68%),#050505;border:1px solid rgba(255,176,0,.38);border-radius:8px;box-shadow:0 18px 38px rgba(0,0,0,.42),0 0 24px rgba(255,176,0,.16),inset 0 0 0 1px rgba(255,176,0,.08);opacity:0;visibility:hidden;pointer-events:none;transform:translate(-50%,-4px);transition:opacity .16s ease,visibility .16s ease,transform .16s ease;z-index:9002;text-align:left;white-space:normal;}' +
      '#tb .tb-github:hover .tb-gigalabor-tip,#tb .tb-github:focus-visible .tb-gigalabor-tip{opacity:1;visibility:visible;transform:translate(-50%,0);}' +
      '#tb .tb-gigalabor-kicker{color:#ffb000;font-size:.86rem;line-height:1;letter-spacing:.12em;text-transform:uppercase;}#tb .tb-gigalabor-title{font-family:"BioRhyme",serif;font-weight:800;font-size:1.35rem;line-height:1.05;}#tb .tb-gigalabor-body,#tb .tb-gigalabor-note{font-size:.82rem;line-height:1.35;color:rgba(255,255,255,.72);}' +
      '#tb .tb-r{margin-left:auto;display:flex;gap:clamp(.6rem,1vw,1.4rem);align-items:center;min-width:0;flex-shrink:1;}' +
      '#tb .tb-jk{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:.06rem;min-width:0;max-width:clamp(7.8rem,12vw,12.4rem);color:#F59E0B;font-weight:500;text-align:right;line-height:1;overflow:hidden;text-shadow:0 0 22px rgba(245,158,11,.45);font-variant-numeric:tabular-nums;}' +
      '#tb .tb-jk-label{display:block;font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(245,158,11,.72);line-height:1;}' +
      '#tb .tb-jk-value{display:block;max-width:100%;font-size:clamp(1rem,1.18vw,1.46rem);letter-spacing:.04em;color:#F59E0B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;line-height:1.08;}' +
      '#tb .tb-cd-wrap{display:flex;flex-direction:column;align-items:center;gap:.08rem;line-height:1;}' +
      '#tb .tb-cd-label{font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(237,232,223,.36);font-weight:500;}' +
      '#tb .tb-cd{font-size:1.44rem;letter-spacing:.08em;color:rgba(237,232,223,.7);font-weight:500;font-variant-numeric:tabular-nums;}' +
      '#tb .tb-cd-wrap.v8cd-on .tb-cd{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}' +
      '#tb .tb-cd-wrap.v8cd-on .tb-cd-label{display:none;}' +
      '#tb #v8cd{display:none;gap:.4rem;align-items:center;}' +
      '#tb .tb-cd-wrap.v8cd-on{flex-direction:row;}' +
      '#tb .tb-cd-wrap.v8cd-on #v8cd{display:flex;}' +
      '#tb .v8cd-seg{display:flex;flex-direction:column;align-items:center;gap:.1rem;background:rgba(237,232,223,.05);border:1px solid rgba(237,232,223,.08);border-radius:6px;padding:.28rem .5rem;min-width:42px;}' +
      '#tb .v8cd-seg b{font-size:1.3rem;font-weight:500;color:#EDE8DF;font-variant-numeric:tabular-nums;line-height:1;}' +
      '#tb .v8cd-seg i{font-style:normal;font-size:.56rem;letter-spacing:.25em;text-transform:uppercase;color:rgba(237,232,223,.28);}' +
      '#tb .v8cd-seg.hot b{color:#C8391A;text-shadow:0 0 14px rgba(200,57,26,.6);}' +
      '#site-header,main header[data-page-kicker-wrap],main [data-page-kicker-wrap]{display:none!important;visibility:hidden!important;pointer-events:none!important;height:0!important;min-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;border:0!important;}' +
      '#bb{position:fixed!important;left:0!important;right:var(--ad-reserve-right,0px)!important;bottom:var(--ad-reserve-bottom,0px)!important;height:38px!important;z-index:9001!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;padding:0 1.2rem!important;box-sizing:border-box!important;background:linear-gradient(0deg,rgba(3,1,9,.95) 62%,rgba(3,1,9,.1))!important;border-top:1px solid rgba(237,232,223,.05)!important;font-family:"DM Mono",monospace!important;}' +
      '#bb>span:not(#bb-msg){display:none!important;}' +
      '#bb-msg{width:100%;color:rgba(237,232,223,.35);text-align:center;font-size:.64rem;letter-spacing:.18em;text-transform:uppercase;}' +
      '#bb-msg.v8tk{overflow:hidden;position:relative;text-align:left;}' +
      '#bb-msg.v8tk .v8tk-in{display:inline-flex;gap:3.2rem;white-space:nowrap;will-change:transform;animation:v8tk 46s linear infinite;padding-left:100%;}' +
      '#bb-msg.v8tk:hover .v8tk-in{animation-play-state:paused;}' +
      '#bb-msg.v8tk .v8tk-in span{color:rgba(237,232,223,.35);}' +
      '#bb-msg.v8tk .v8tk-in b{font-weight:500;color:rgba(237,232,223,.7);}' +
      '#bb-msg.v8tk .v8tk-in .r{color:#C8391A;}#bb-msg.v8tk .v8tk-in .v{color:#8B5CF6;}#bb-msg.v8tk .v8tk-in .o{color:#F59E0B;}#bb-msg.v8tk .v8tk-in .cy{color:#6EE7FF;}#bb-msg.v8tk .v8tk-in .sep{color:rgba(200,57,26,.5);}' +
      '@keyframes v8tk{to{transform:translateX(-100%);}}' +
      '#v8-global-ticker{display:none!important;}' +
      '@media(max-width:980px){#tb{height:72px!important;padding:0 1rem!important;gap:1rem!important;}body{padding-top:72px!important;}#tb .tb-logo canvas{width:66px;height:38px;}#tb .tb-logo-text{font-size:1.8rem;}#tb .tb-jk{max-width:9.2rem;}#tb .tb-jk-value{font-size:1.16rem;}#tb .tb-github-label{display:none;}#tb .tb-r{gap:.8rem;}#tb .tb-r .tb-sep:last-of-type,#tb #v8-alg-count{display:none!important;}}' +
      '@media(max-width:640px){#tb{height:60px!important;padding:0 .75rem!important;gap:.7rem!important;}body{padding-top:60px!important;}#tb .tb-logo canvas{width:34px;height:34px;}#tb .tb-logo-text{font-size:1.5rem;}#tb .tb-version{display:none;}#tb .tb-github{display:none!important;}#tb .tb-jk{max-width:7.2rem;}#tb .tb-jk-label{font-size:.58rem;letter-spacing:.14em;}#tb .tb-jk-value{font-size:.92rem;}#tb .tb-cd-wrap{display:none;}#tb .tb-sep{display:none;}}';
    document.head.appendChild(css);
  }

  function buildCCEngine(cvs, opts) {
    if (!cvs || !cvs.getContext || cvs.dataset.ccEngine === '1') return;
    cvs.dataset.ccEngine = '1';
    var c2 = cvs.getContext('2d');
    var CW = cvs.width, CH = cvs.height;
    var scale = Math.min(CW, CH * 1.8) / 260;
    var R = 38 * scale, ri = 24 * scale, GAP = 14 * scale;
    var A0 = Math.PI * 0.22, A1 = Math.PI * 1.78;
    var C1X = CW / 2 - R - GAP / 2, C2X = CW / 2 + R + GAP / 2, CY = CH / 2;
    var N = 120, SPEED = (opts && opts.speed) || 1.8, LOOP_PAUSE = (opts && opts.pause) || 60;
    var arc1 = [], arc2 = [];
    for (var i = 0; i <= N; i++) {
      var a = A0 + (A1 - A0) * (i / N);
      arc1.push({ x: C1X + Math.cos(a) * R, y: CY + Math.sin(a) * R, letter: 1 });
      arc2.push({ x: C2X + Math.cos(a) * R, y: CY + Math.sin(a) * R, letter: 2 });
    }
    var bridge = [], bf = arc1[arc1.length - 1], bt = arc2[0], BN = 22;
    for (i = 0; i <= BN; i++) {
      var t = i / BN;
      bridge.push({ x: bf.x + (bt.x - bf.x) * t, y: bf.y + (bt.y - bf.y) * t + Math.sin(t * Math.PI) * R * 0.35, letter: 0 });
    }
    var PATH = arc1.concat(bridge, arc2), PLEN = PATH.length;
    var pos = 0, phase = 'fuse', pauseCnt = 0, burnedPts = [], sparks = [], parts = [], burnAlpha = 1;
    function reset() { pos = 0; phase = 'fuse'; pauseCnt = 0; burnedPts = []; sparks = []; parts = []; burnAlpha = 1; }
    function base() {
      [C1X, C2X].forEach(function (cx) {
        c2.beginPath(); c2.arc(cx, CY, R, A0, A1);
      c2.strokeStyle = 'rgba(237,232,223,.30)'; c2.lineWidth = Math.max(1.4, 2.4 * scale); c2.lineCap = 'round'; c2.stroke();
        c2.beginPath(); c2.arc(cx, CY, ri, A0, A1);
      c2.strokeStyle = 'rgba(237,232,223,.14)'; c2.lineWidth = Math.max(1, 1.5 * scale); c2.stroke();
      });
    }
    function dot(x, y, alpha) {
      c2.beginPath(); c2.arc(x, y, Math.max(4, 12 * scale), 0, Math.PI * 2); c2.fillStyle = 'rgba(255,65,5,' + (.18 * alpha) + ')'; c2.fill();
      c2.beginPath(); c2.arc(x, y, Math.max(1, 2.5 * scale), 0, Math.PI * 2); c2.fillStyle = 'rgba(255,235,150,' + (.8 * alpha) + ')'; c2.fill();
    }
    function fuse(p) {
      var len = Math.min(18, p);
      for (var j = 0; j < len; j++) {
        var idx = Math.floor(p - j); if (idx < 0 || idx >= PLEN) continue;
        var pt = PATH[idx], k = 1 - j / len;
        c2.beginPath(); c2.arc(pt.x, pt.y, Math.max(.8, 3 * k * scale), 0, Math.PI * 2);
        c2.fillStyle = j ? 'rgba(255,120,24,' + (.45 * k) + ')' : '#FFFAF0'; c2.fill();
      }
    }
    function boom(x, y) {
      var out = [{ x: x, y: y, vx: 0, vy: 0, life: 1, flash: true, size: 52 * scale }];
      for (var j = 0; j < 24; j++) {
        var a = Math.random() * Math.PI * 2, sp = (1.5 + Math.random() * 5) * scale;
        out.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5 * scale, life: 1, flash: false, size: (1 + Math.random() * 2) * scale });
      }
      return out;
    }
    function frame() {
      c2.fillStyle = 'rgba(3,1,9,1)'; c2.fillRect(0, 0, CW, CH); base();
      burnedPts.forEach(function (p) { dot(p.x, p.y, burnAlpha); });
      if (phase === 'fuse') {
        pos += SPEED;
        var idx = Math.min(Math.floor(pos), PLEN - 1);
        for (var j = burnedPts.length; j <= idx; j++) if (PATH[j] && PATH[j].letter !== 0) burnedPts.push({ x: PATH[j].x, y: PATH[j].y });
        fuse(pos);
        if (pos >= PLEN - 1) { parts = boom(PATH[PLEN - 1].x, PATH[PLEN - 1].y); phase = 'explode'; }
      } else if (phase === 'explode') {
        parts.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vy += .08 * scale; p.life -= .025; });
        parts = parts.filter(function (p) { return p.life > 0; });
        parts.forEach(function (p) {
          c2.save(); c2.globalAlpha = Math.max(0, p.life);
          c2.beginPath(); c2.arc(p.x, p.y, p.flash ? p.size : p.size, 0, Math.PI * 2);
          c2.fillStyle = p.flash ? 'rgba(255,160,40,.28)' : 'rgba(255,112,32,.72)'; c2.fill(); c2.restore();
        });
        if (!parts.length) { phase = 'pause'; pauseCnt = 0; }
      } else {
        pauseCnt += 1; burnAlpha = Math.max(0, 1 - pauseCnt / (LOOP_PAUSE * .7));
        if (pauseCnt > LOOP_PAUSE) reset();
      }
      requestAnimationFrame(frame);
    }
    frame();
  }

  function parseNextDrawDate(payload) {
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.next_datetime_iso === 'string' && payload.next_datetime_iso.trim()) {
      var dt = new Date(payload.next_datetime_iso.trim());
      if (!Number.isNaN(dt.getTime())) return dt;
    }
    if (typeof payload.next_date_iso === 'string' && payload.next_date_iso.trim()) {
      var raw = (typeof payload.next_time === 'string' && payload.next_time.trim()) ? payload.next_time.trim() : '20:00';
      var hhmm = /^\d{2}:\d{2}$/.test(raw) ? raw : '20:00';
      dt = new Date(payload.next_date_iso.trim() + 'T' + hhmm + ':00');
      if (!Number.isNaN(dt.getTime())) return dt;
    }
    return null;
  }

  function fallbackNextDrawDate() {
    var now = new Date();
    var drawDays = [2, 4, 5, 6];
    for (var offset = 0; offset <= 7; offset++) {
      var t = new Date(now);
      t.setDate(now.getDate() + offset);
      t.setHours(20, 0, 0, 0);
      if (drawDays.indexOf(t.getDay()) >= 0 && t > now) return t;
    }
    t = new Date(now);
    t.setDate(now.getDate() + 1);
    t.setHours(20, 0, 0, 0);
    return t;
  }

  function startSharedCountdown() {
    var cd = document.getElementById('cd');
    if (!cd || cd.dataset.v8Countdown === '1') return;
    cd.dataset.v8Countdown = '1';
    var target = fallbackNextDrawDate();
    fetch('/data/next-draw.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (payload) {
      var parsed = parseNextDrawDate(payload);
      if (parsed) target = parsed;
      var jk = document.getElementById('v8-jackpot');
      if (jk && payload) {
        var value = payload.jackpot_eur || payload.jackpot_str || 'N/D';
        jk.innerHTML = '<span class="tb-jk-label">Jackpot</span><span class="tb-jk-value">' + value + '</span>';
        jk.classList.add('v8jk-pulse');
      }
    }).catch(function () {});
    function tick() {
      var diff = Math.max(0, target - new Date());
      if (diff === 0) {
        cd.textContent = 'Risultati in arrivo...';
        return;
      }
      var h = Math.floor(diff / 3600000), r1 = diff % 3600000;
      var m = Math.floor(r1 / 60000), r2 = r1 % 60000;
      var s = Math.floor(r2 / 1000);
      var f = function (n) { return String(n).padStart(2, '0'); };
      cd.textContent = f(h) + ':' + f(m) + ':' + f(s);
    }
    tick();
    setInterval(tick, 1000);
  }

  function segmentedCountdown() {
    var cd = document.getElementById('cd');
    var wrap = cd && cd.closest('.tb-cd-wrap');
    if (!cd || !wrap || document.getElementById('v8cd')) return;
    var seg = document.createElement('span');
    seg.id = 'v8cd';
    seg.innerHTML =
      '<span class="v8cd-seg"><b id="v8cd-h">--</b><i>ore</i></span>' +
      '<span class="v8cd-seg"><b id="v8cd-m">--</b><i>min</i></span>' +
      '<span class="v8cd-seg hot"><b id="v8cd-s">--</b><i>sec</i></span>';
    cd.insertAdjacentElement('afterend', seg);
    var H = document.getElementById('v8cd-h');
    var M = document.getElementById('v8cd-m');
    var S = document.getElementById('v8cd-s');
    function sync() {
      var t = (cd.textContent || '').trim();
      var m = /^(\d{1,3}):(\d{2}):(\d{2})$/.exec(t);
      if (m) {
        wrap.classList.add('v8cd-on');
        if (H && H.textContent !== m[1]) H.textContent = m[1];
        if (M && M.textContent !== m[2]) M.textContent = m[2];
        if (S) S.textContent = m[3];
      } else {
        wrap.classList.remove('v8cd-on');
      }
    }
    new MutationObserver(sync).observe(cd, { childList: true, characterData: true, subtree: true });
    sync();
  }

  onReady(function () {
    if (isOraclePage()) return;
    injectHomeChromeRules();
    rebuildInnerTopbar();
    buildCCEngine(document.getElementById('cc-logo'), { speed: 1.8, pause: 60 });
    startSharedCountdown();
    segmentedCountdown();
  });
})();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   V8SKIN BOOTSTRAP - estende il chrome interno con il design V8+
   (font, v8skin.css, aurora, nav topbar, hero schede algoritmo)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
(function () {
  'use strict';
  if (/^\/pages\/oracle\//.test(window.location.pathname || '')) return;
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
    var nav = scope.querySelector ? scope.querySelector('.v8sheet-subnav') : document.querySelector('.v8sheet-subnav');
    if (nav && !nav.querySelector('a[href="#v8sheet-metodo"]')) {
      var metodoLink = document.createElement('a');
      metodoLink.href = '#v8sheet-metodo';
      metodoLink.textContent = 'Metodo';
      nav.appendChild(metodoLink);
    }
    var sections = Array.prototype.slice.call(scope.querySelectorAll('.v8sheet-sec'));
    var scrollRoot = window.CC_SCROLLER && document.documentElement.dataset.adRail === 'right'
      ? window.CC_SCROLLER
      : null;
    var markVisibleSections = function () {
      var limit = (window.innerHeight || document.documentElement.clientHeight || 720) * 1.12;
      sections.forEach(function (section) {
        var box = section.getBoundingClientRect();
        if (box.top < limit && box.bottom > -80) section.classList.add('vis');
      });
    };
    if (!('IntersectionObserver' in window)) {
      sections.forEach(function (section) { section.classList.add('vis'); });
      return;
    }
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add('vis');
      });
    }, { root: scrollRoot, threshold: 0.15 });
    sections.forEach(function (section) { reveal.observe(section); });
    markVisibleSections();
    window.addEventListener('scroll', markVisibleSections, { passive: true });
    window.addEventListener('resize', markVisibleSections, { passive: true });
    if (scrollRoot) scrollRoot.addEventListener('scroll', markVisibleSections, { passive: true });
    setTimeout(markVisibleSections, 350);
    setTimeout(markVisibleSections, 1200);
    var links = Array.prototype.slice.call(document.querySelectorAll('.v8sheet-subnav a'));
    var active = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) {
          link.classList.toggle('on', link.hash === '#' + entry.target.id);
        });
      });
    }, { root: scrollRoot, rootMargin: '-40% 0px -55% 0px' });
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
      l.href = '/assets/css/v8skin.css?v=20260613-performance-scale';
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
      cv.style.display = 'block';
      cv.style.position = 'fixed';
      cv.style.top = '0';
      cv.style.left = '0';
      cv.style.width = '66.6667vw';
      cv.style.height = '40vh';
      cv.style.zIndex = '0';
      cv.style.pointerEvents = 'none';
      cv.style.opacity = '.7';
      document.body.prepend(cv);
      startSky(cv);
    }
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
    el.textContent = 'v ' + base;
  }

  function v8BuildPerformanceSvg(rows) {
    var data = (rows || []).slice();
    if (!data.length) {
      return '<line x1="0" y1="120" x2="800" y2="120"/><text x="400" y="126" text-anchor="middle" fill="rgba(237,232,223,.36)" font-size="18">Storico non disponibile</text>';
    }
    function rowHit(row) { return +row.hit || +row.hits || 0; }
    var maxHit = 6;
    var rolling = data.map(function (r, i) {
      if (r && typeof r.moving_avg === 'number') return r.moving_avg;
      var part = data.slice(Math.max(0, i - 9), i + 1);
      var avg = part.reduce(function (a, row) { return a + rowHit(row); }, 0) / Math.max(1, part.length);
      return avg;
    });
    function y(v) { return 210 - (v / maxHit) * 170; }
    var main = '', avg = '', area = '';
    var dots = '';
    data.forEach(function (r, i) {
      var x = data.length === 1 ? 400 : i * (800 / (data.length - 1));
      var h = rowHit(r);
      var yy = y(h);
      var ay = y(rolling[i]);
      main += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + yy.toFixed(1) + ' ';
      avg += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + ay.toFixed(1) + ' ';
      dots += '<circle cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="' + (h >= 3 ? '4.6' : (h > 0 ? '2.6' : '1.15')) + '" class="perfpoint h' + Math.max(0, Math.min(6, h)) + (h >= 3 ? ' hitdot' : '') + '"><title>' + v8Escape((r.date || '') + ' - ' + h + ' hit') + '</title></circle>';
    });
    area = main + 'L800 240 L0 240 Z';
    return '<defs><linearGradient id="v8sheet-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(139,92,246,.28)"/><stop offset="100%" stop-color="rgba(139,92,246,0)"/></linearGradient></defs>' +
      '<g class="v8perf-ygrid">' +
        [0, 1, 2, 3, 4, 5, 6].map(function (n) {
          var gy = y(n);
          return '<line x1="0" y1="' + gy.toFixed(1) + '" x2="800" y2="' + gy.toFixed(1) + '"/><text x="8" y="' + (gy - 4).toFixed(1) + '">' + n + '</text>';
        }).join('') +
      '</g>' +
      '<rect data-v8perf-window x="0" y="18" width="0" height="204" rx="8"/>' +
      '<path class="area" data-v8perf-full-area d="' + area + '"/><path class="avg" data-v8perf-full-avg d="' + avg + '"/><path class="main" data-v8perf-full-line d="' + main + '"/>' + dots +
      '<line data-v8perf-cross x1="0" y1="24" x2="0" y2="222"/><circle data-v8perf-dot cx="0" cy="0" r="0"/>';
  }

  function v8RenderPerformanceChart(chart, rows) {
    if (!chart) return;
    var data = (rows || []).filter(function (r) { return r && typeof r === 'object'; });
    chart.setAttribute('viewBox', '0 0 800 240');
    chart.innerHTML = v8BuildPerformanceSvg(data);
    v8AttachPerformanceHover(chart, data);
  }

  function v8AttachPerformanceHover(chart, rows) {
    if (!chart || !rows || !rows.length) return;
    var box = chart.closest ? chart.closest('.v8sheet-chart') : null;
    if (!box) return;
    var tip = box.querySelector('[data-v8perf-tip]');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'v8perf-tip';
      tip.setAttribute('data-v8perf-tip', '1');
      box.appendChild(tip);
    }
    var legend = box.querySelector('.v8sheet-legend');
    var zoomBox = legend ? legend.querySelector('[data-v8perf-zoom-box]') : null;
    if (legend && !zoomBox) {
      zoomBox = document.createElement('div');
      zoomBox.className = 'v8perf-zoom-box';
      zoomBox.setAttribute('data-v8perf-zoom-box', '1');
      zoomBox.innerHTML =
        '<span data-v8perf-zoom-label>Zoom 40 concorsi</span>' +
        '<svg viewBox="0 0 260 54" preserveAspectRatio="none" aria-hidden="true">' +
          '<path data-v8perf-zoom-path d=""></path>' +
          '<circle data-v8perf-zoom-dot cx="0" cy="0" r="0"></circle>' +
        '</svg>';
      legend.appendChild(zoomBox);
    }
    var cross = chart.querySelector('[data-v8perf-cross]');
    var dot = chart.querySelector('[data-v8perf-dot]');
    var win = chart.querySelector('[data-v8perf-window]');
    var zoomPath = zoomBox ? zoomBox.querySelector('[data-v8perf-zoom-path]') : null;
    var zoomDot = zoomBox ? zoomBox.querySelector('[data-v8perf-zoom-dot]') : null;
    var zoomLabel = zoomBox ? zoomBox.querySelector('[data-v8perf-zoom-label]') : null;
    var maxHit = Math.max(3, Math.max.apply(null, rows.map(function (r) { return +r.hit || +r.hits || 0; })));
    function hit(row) { return +row.hit || +row.hits || 0; }
    function y(v) { return 210 - (v / maxHit) * 170; }
    function picks(row) {
      var list = Array.isArray(row.picks) ? row.picks : (Array.isArray(row.nums) ? row.nums : []);
      return list.map(function (x) {
        var n = x.number != null ? x.number : x.n;
        return '<span class="v8perf-n' + (x.hit ? ' hit' : '') + '">' + String(n || '').padStart(2, '0') + '</span>';
      }).join('');
    }
    function zoomFor(center) {
      var len = rows.length;
      var start = Math.max(0, Math.min(len - 40, center - 20));
      var end = Math.min(len, start + 40);
      var part = rows.slice(start, end);
      var path = '';
      part.forEach(function (row, i) {
        var x = part.length === 1 ? 130 : i * (260 / (part.length - 1));
        var yy = 48 - (hit(row) / maxHit) * 42;
        path += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + yy.toFixed(1) + ' ';
      });
      if (win) {
        var wx = len === 1 ? 0 : start * (800 / (len - 1));
        var ww = len === 1 ? 800 : Math.max(8, (end - start - 1) * (800 / (len - 1)));
        win.setAttribute('x', wx.toFixed(1));
        win.setAttribute('width', ww.toFixed(1));
      }
      if (zoomPath) zoomPath.setAttribute('d', path);
      if (zoomLabel) zoomLabel.textContent = 'Zoom 40 concorsi #' + v8Escape(rows[start].seq) + '-' + v8Escape(rows[end - 1].seq);
    }
    function move(evt) {
      var rect = chart.getBoundingClientRect();
      var rel = Math.max(0, Math.min(1, (evt.clientX - rect.left) / Math.max(1, rect.width)));
      var idx = Math.max(0, Math.min(rows.length - 1, Math.round(rel * (rows.length - 1))));
      var row = rows[idx];
      var x = rows.length === 1 ? 400 : idx * (800 / (rows.length - 1));
      var yy = y(hit(row));
      if (cross) { cross.setAttribute('x1', x.toFixed(1)); cross.setAttribute('x2', x.toFixed(1)); }
      if (dot) { dot.setAttribute('cx', x.toFixed(1)); dot.setAttribute('cy', yy.toFixed(1)); dot.setAttribute('r', '6'); }
      if (zoomDot) {
        var local = Math.max(0, Math.min(39, idx - Math.max(0, Math.min(rows.length - 40, idx - 20))));
        zoomDot.setAttribute('cx', (local * (260 / 39)).toFixed(1));
        zoomDot.setAttribute('cy', (48 - (hit(row) / maxHit) * 42).toFixed(1));
        zoomDot.setAttribute('r', '4.5');
      }
      zoomFor(idx);
      tip.innerHTML =
        '<b>Concorso #' + v8Escape(row.seq) + '</b>' +
        '<span>' + v8Escape(row.date || '') + ' &middot; ' + hit(row) + ' hit</span>' +
        '<div>' + picks(row) + '</div>';
      var left = Math.min(rect.width - 220, Math.max(12, evt.clientX - rect.left + 16));
      tip.style.left = left + 'px';
      tip.style.top = Math.max(12, evt.clientY - rect.top - 18) + 'px';
      tip.classList.add('on');
      chart.classList.add('is-hovering');
    }
    chart.addEventListener('mousemove', move);
    chart.addEventListener('mouseleave', function () {
      tip.classList.remove('on');
      chart.classList.remove('is-hovering');
      if (dot) dot.setAttribute('r', '0');
      if (zoomDot) zoomDot.setAttribute('r', '0');
    });
    zoomFor(Math.max(0, rows.length - 1));
  }

  function hydrateV8SheetData(sheet, card, fallbackBalls, fallbackMetrics) {
    if (!sheet || sheet.dataset.v8Hydrated === '1') return;
    sheet.dataset.v8Hydrated = '1';
    fetch('/data/precomputed/algorithm-sheets.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
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
      v8RenderPerformanceChart(chart, rows);
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
        var chart = sheet.querySelector('[data-v8sheet-chart]');
        var perfK = sheet.querySelector('[data-v8sheet-perf-title]');
        v8RenderPerformanceChart(chart, rows);
        if (perfK) perfK.textContent = 'Performance - tutti i ' + rows.length.toLocaleString('it-IT') + ' concorsi';
        rows.reverse(); // piu recenti in alto

        var methodSection = sheet.querySelector('#v8sheet-metodo');
        var section = document.createElement('section');
        section.className = 'v8sheet-sec v8sheet-history-inline vis';
        section.id = 'v8sheet-storico';
        section.innerHTML =
          '<div class="v8sheet-k">Pronostici algoritmo &middot; ' + rows.length.toLocaleString('it-IT') + ' concorsi valutati &middot; numeri indovinati evidenziati</div>' +
          '<div class="v8hist" data-v8hist-list></div>' +
          '<div class="v8hist-foot">' +
            '<button type="button" class="v8sheet-btn" data-v8hist-more>Mostra altri</button>' +
            '<span class="v8hist-count" data-v8hist-count></span>' +
          '</div>';
        if (methodSection) methodSection.insertAdjacentElement('afterend', section);
        else sheet.appendChild(section);

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
        '<div class="v8sheet-legend"><div class="v8perf-scale" aria-label="Scala hit 0-6"><div class="v8perf-scale__ticks"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div><i></i></div></div></div>' +
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
    if (document.getElementById('bb') && document.getElementById('bb-msg') && document.getElementById('bb-msg').classList.contains('v8tk')) return;
    Promise.all([
      fetch('/data/cards-index.json').then(function (r) { return r.json(); }).catch(function () { return []; }),
      fetch('/archives/draws/draws.csv').then(function (r) { return r.text(); }).catch(function () { return ''; })
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

      var archiveEl = document.getElementById('v8-inner-jackpot');
      var lastEl = document.getElementById('v8-inner-last');
      var algEl = document.getElementById('v8-alg-count');
      if (archiveEl) archiveEl.textContent = 'Archivio ' + draws.length.toLocaleString('it-IT');
      if (lastEl) lastEl.textContent = last ? last.date : '--';
      if (algEl) algEl.textContent = ranked.length.toLocaleString('it-IT') + ' Algoritmi';

      var items = [];
      if (last) {
        items.push('Ultima estrazione <b class="o">' + last.date + '</b>');
        items.push('Numeri <b>' + last.nums.join(' &middot; ') + '</b>');
        items.push('Archivio <b class="cy">' + draws.length.toLocaleString('it-IT') + '</b> estrazioni dal 1997');
        items.push('Ritardo critico <b class="r">' + worstN + '</b> &middot; assente da <b class="r">' + worstD + '</b> concorsi');
        items.push('Pi&ugrave; frequente (90 concorsi) <b class="cy">' + hotN + '</b> &middot; ' + hotC + ' uscite');
      }
      if (ranked[0]) {
        items.push('Algoritmo in testa <b class="v">' + (ranked[0].title || ranked[0].id) + '</b>');
        items.push('<b class="v">' + ranked.length.toLocaleString('it-IT') + '</b> algoritmi in gara permanente');
      }
      items.push('Gioca responsabilmente &middot; nessuna promessa di vincita &middot; 18+');
      var ticker = document.getElementById('bb');
      if (!ticker) {
        ticker = document.createElement('div');
        ticker.id = 'bb';
        ticker.innerHTML =
          '<span>ControlChaos &middot; Analisi statistica indipendente</span>' +
          '<span class="bb-sep">&middot;</span>' +
          '<span id="bb-msg">Gioca responsabilmente, nessuna promessa di vincita</span>' +
          '<span class="bb-r">Vietato ai minori &middot; Nessuna promessa di vincita &middot; Gioca responsabilmente</span>';
        document.body.appendChild(ticker);
      }
      var msg = document.getElementById('bb-msg');
      if (!msg) return;
      var sep = '<span class="sep">&#9670;</span>';
      var html = items.map(function (x) { return '<span>' + x + '</span>'; }).join(sep) + sep;
      msg.classList.add('v8tk');
      msg.innerHTML = '<span class="v8tk-in">' + html + html + '</span>';
    });
  }

  function startSky(cv) {
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, mx = -9999, my = -9999;
    function resize() {
      W = cv.width = Math.max(1, cv.clientWidth || Math.round(window.innerWidth * 0.666667));
      H = cv.height = Math.max(1, cv.clientHeight || Math.round(window.innerHeight * 0.4));
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

    fetch('/data/cards-index.json')
      .then(function (r) { return r.json(); })
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
                '<div class="v8sheet-legend"><div class="v8perf-scale" aria-label="Scala hit 0-6"><div class="v8perf-scale__ticks"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div><i></i></div></div>' +
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
        fetch('/data/cards-index.json', { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : []; })
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
