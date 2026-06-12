/* ════════════════════════════════════════════════════════════════
   V8CATALOG — griglia algoritmi in stile V8+ (pages/algoritmi)
   Legge /data/cards-index.json e renderizza card 3D con filtri
   per famiglia, ricerca live e metriche reali di ranking.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var GROUPS = {
    statistica: { label: 'Statistici', one: 'Statistico' },
    neurale:    { label: 'Neurali',    one: 'Neurale' },
    ibrido:     { label: 'Ibridi',     one: 'Ibrido' },
    storico:    { label: 'Storico',    one: 'Storico' }
  };

  function fmtValue(v) {
    if (v == null) return '—';
    if (v >= 1000) return (v / 1000).toFixed(1).replace('.', ',') + 'k';
    return String(Math.round(v));
  }

  function hitStats(card) {
    var hits = card.exactHits || null, sum = 0, weighted = 0, h3p = 0;
    if (hits && typeof hits === 'object') {
      Object.keys(hits).forEach(function (k) {
        var n = parseInt(k, 10), v = +hits[k] || 0;
        if (isNaN(n)) return;
        sum += v; weighted += n * v;
        if (n >= 3) h3p += v;
      });
    }
    return { media: sum ? (weighted / sum) : null, h3p: h3p, sum: sum };
  }

  /* conteggi reali della distribuzione hit: concorsi con almeno k numeri indovinati */
  function hitCounts(card) {
    var hits = card.exactHits || {};
    var cum = [0, 0, 0, 0, 0]; // indice = soglia k (1..4)
    Object.keys(hits).forEach(function (key) {
      var n = parseInt(key, 10), v = +hits[key] || 0;
      if (isNaN(n)) return;
      for (var k = 1; k <= 4; k++) if (n >= k) cum[k] += v;
    });
    var cells = [1, 2, 3, 4].map(function (k) {
      return '<div class="m"><b>' + cum[k].toLocaleString('it-IT') + '</b><span>' + k + '+ hit</span></div>';
    }).join('');
    return '<div class="meta v8card-hits" style="margin:.8rem 0 .1rem">' + cells + '</div>';
  }

  function init() {
    var mount = document.getElementById('v8cat');
    if (!mount) return;

    fetch('/data/cards-index.json')
      .then(function (r) { return r.json(); })
      .then(function (cards) {
        var algs = cards.filter(function (c) {
          var page = String((c && c.page) || '').replace(/^\/+/, '');
          return c && c.view !== false && page.indexOf('pages/algoritmi/algs/') === 0;
        });
        if (!algs.length) return;

        // ordina per posizione in classifica (null in fondo)
        algs.sort(function (a, b) {
          var pa = a.rankingPosition || 999, pb = b.rankingPosition || 999;
          return pa - pb;
        });

        // famiglie effettivamente presenti
        var present = {};
        algs.forEach(function (a) { present[a.macroGroup || 'statistica'] = true; });

        var toolsHtml =
          '<div class="v8cat-tools">' +
            '<button class="v8cat-f on" data-g="all">Tutti</button>' +
            Object.keys(GROUPS).filter(function (g) { return present[g]; }).map(function (g) {
              return '<button class="v8cat-f" data-g="' + g + '">' + GROUPS[g].label + '</button>';
            }).join('') +
            '<div class="v8cat-srch">⌕<input id="v8cat-q" placeholder="Cerca un algoritmo…" aria-label="Cerca un algoritmo"></div>' +
            '<span class="v8cat-count" id="v8cat-count"></span>' +
          '</div>' +
          '<div class="v8cat-grid" id="v8cat-grid"></div>';
        mount.innerHTML = toolsHtml;

        // nasconde il fallback SEO ora che il catalogo è attivo
        var fb = document.querySelector('[data-v8cat-fallback]') ||
                 document.querySelector('[data-seo-fallback="alg-catalog"]');
        if (fb) fb.style.display = 'none';

        var grid = document.getElementById('v8cat-grid');
        var countEl = document.getElementById('v8cat-count');

        function render() {
          var on = mount.querySelector('.v8cat-f.on');
          var g = on ? on.getAttribute('data-g') : 'all';
          var q = (document.getElementById('v8cat-q').value || '').toLowerCase();
          var list = algs.filter(function (a) {
            var grp = a.macroGroup || 'statistica';
            var txt = ((a.title || '') + ' ' + (a.id || '') + ' ' + (a.subtitle || '')).toLowerCase();
            return (g === 'all' || grp === g) && txt.indexOf(q) !== -1;
          });
          countEl.textContent = list.length + ' / ' + algs.length + ' moduli';

          grid.innerHTML = list.map(function (a, i) {
            var grp = a.macroGroup || 'statistica';
            var st = hitStats(a);
            var pos = a.rankingPosition;
            var href = '/' + String(a.page || '').replace(/^\/+/, '');
            return '<a class="v8card" data-g="' + grp + '" href="' + href + '" style="--d:' + (i * 0.05) + 's">' +
              (pos === 1 ? '<span class="badge">★ In testa</span>' : '') +
              '<span class="rk">' + (pos ? String(pos).padStart(2, '0') : '··') + '</span>' +
              '<span class="gr">' + (GROUPS[grp] ? GROUPS[grp].one : grp) + '</span>' +
              '<div class="tt">' + (a.title || a.id) + '</div>' +
              '<div class="sb">' + (a.subtitle || '') + '</div>' +
              hitCounts(a) +
              '<div class="meta">' +
                '<div class="m"><b>' + fmtValue(a.rankingValue) + '</b><span>Score</span></div>' +
                '<div class="m"><b>' + (st.media != null ? st.media.toFixed(2) : '—') + '</b><span>Hit medi</span></div>' +
                '<div class="m"><b>' + (st.h3p || '—') + '</b><span>≥3 numeri</span></div>' +
                '<span class="go">Apri scheda →</span>' +
              '</div>' +
            '</a>';
          }).join('');

          // tilt 3D + glow che segue il cursore (solo pointer fine)
          if (window.matchMedia && window.matchMedia('(pointer:fine)').matches) {
            grid.querySelectorAll('.v8card').forEach(function (c) {
              c.addEventListener('mousemove', function (e) {
                var r = c.getBoundingClientRect();
                var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
                c.style.setProperty('--gx', (x * 100) + '%');
                c.style.setProperty('--gy', (y * 100) + '%');
                c.style.transform = 'rotateY(' + ((x - 0.5) * 6) + 'deg) rotateX(' + ((0.5 - y) * 5) + 'deg) translateY(-3px)';
              });
              c.addEventListener('mouseleave', function () { c.style.transform = ''; });
            });
          }
        }

        mount.querySelectorAll('.v8cat-f').forEach(function (b) {
          b.addEventListener('click', function () {
            mount.querySelectorAll('.v8cat-f').forEach(function (x) { x.classList.remove('on'); });
            b.classList.add('on');
            render();
          });
        });
        document.getElementById('v8cat-q').addEventListener('input', render);

        render();
      })
      .catch(function () { /* fallback SEO resta visibile */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
/* v8catalog v1.0 */
