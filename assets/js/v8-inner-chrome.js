(function () {
  'use strict';
  if (document.getElementById('v8-inner-topbar')) return;

  // ── TOPBAR ──
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
      'transition:color .2s;',
    '}',
    '#v8-inner-topbar a:hover{color:#EDE8DF;}',
    '#v8-inner-topbar .v8i-logo{',
      'font-family:"BioRhyme",serif;font-size:1.5rem;font-weight:800;',
      'color:#EDE8DF;letter-spacing:-.02em;',
    '}',
    '#v8-inner-topbar .v8i-logo b{',
      'background:linear-gradient(90deg,#8B5CF6,#C8391A);',
      '-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;',
    '}',
    '#v8-inner-topbar .v8i-sep{width:1px;height:18px;background:rgba(237,232,223,.08);}',
    'body{padding-top:64px!important;}',
    '</style>',
    '<a href="/" class="v8i-logo">Control<b>Chaos</b></a>',
    '<div class="v8i-sep"></div>',
    '<a href="javascript:history.back()">← Indietro</a>'
  ].join('');

  if (document.body) {
    document.body.prepend(bar);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.prepend(bar);
    });
  }

  // ── BODY OVERRIDE: allinea al design V8 home ──
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

  // ── NASCONDI VECCHIO HEADER ──
  function _v8HideOldHeader() {
    var h = document.getElementById('site-header')
      || document.querySelector('header[class*="sticky"], header[id]');
    if (h) {
      h.style.cssText = 'display:none!important';
      h.setAttribute('aria-hidden', 'true');
      return true;
    }
    return false;
  }

  if (!_v8HideOldHeader()) {
    var _v8Obs = new MutationObserver(function (mutations) {
      for (var mi = 0; mi < mutations.length; mi++) {
        var nodes = mutations[mi].addedNodes;
        for (var ni = 0; ni < nodes.length; ni++) {
          var node = nodes[ni];
          if (node.nodeType !== 1) continue;
          if (node.id === 'site-header' || node.tagName === 'HEADER') {
            node.style.cssText = 'display:none!important';
            node.setAttribute('aria-hidden', 'true');
            _v8Obs.disconnect();
            return;
          }
        }
      }
    });
    var _v8ObsTarget = document.body || document.documentElement;
    _v8Obs.observe(_v8ObsTarget, { childList: true });
  }
})();
