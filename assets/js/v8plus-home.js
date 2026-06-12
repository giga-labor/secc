/* ════════════════════════════════════════════════════════════════
   V8PLUS-HOME — potenziamenti home v8 (stile mockup V8+)
   · ticker segnali statistici nel bottombar (dati reali)
   · countdown a segmenti ORE/MIN/SEC (wrappa il #cd esistente)
   · pulse sul jackpot quando arriva il valore
   · chip statistiche flottanti con parallax (dati reali)
   Layer additivi: non tocca la logica di v8-main.js.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── CSV parsing (NR,DATA,N1..N6) ── */
  function parseCSV(text) {
    var rows = [];
    text.split(/\r?\n/).forEach(function (line, idx) {
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

  /* ════════ COSTELLAZIONE HERO (mockup V8+) ════════
     90 numeri che vagano collegati da una rete viva, con repulsione
     al passaggio del mouse. Gira solo finché la hero è visibile. */
  var _heroHi = { hot: [], cold: [] }; // evidenziazioni da dati reali

  function heroConstellation() {
    var cv = document.getElementById('ihero');
    var intro = document.getElementById('intro');
    if (!cv || !intro || !cv.getContext) return;

    var ctx = cv.getContext('2d');
    var W, H;
    function rs() {
      W = cv.width = cv.clientWidth || window.innerWidth;
      H = cv.height = cv.clientHeight || window.innerHeight;
    }
    rs();
    window.addEventListener('resize', rs, { passive: true });

    var mx = -9999, my = -9999;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
    }, { passive: true });

    var P = [];
    for (var i = 1; i <= 90; i++) {
      P.push({
        n: i,
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22
      });
    }

    var LINK = 140, LINK2 = LINK * LINK;
    function frame() {
      // stop definitivo quando l'intro è stata rimossa
      if (intro.style.display === 'none') return;
      // pausa render durante il fade-out
      if (!intro.classList.contains('out')) {
        ctx.clearRect(0, 0, W, H);
        var i, j, a, b, dx, dy, d2;
        ctx.lineWidth = 1;
        for (i = 0; i < P.length; i++) {
          for (j = i + 1; j < P.length; j++) {
            a = P[i]; b = P[j];
            dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy;
            if (d2 < LINK2) {
              ctx.strokeStyle = 'rgba(139,92,246,' + ((1 - d2 / LINK2) * 0.10).toFixed(3) + ')';
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
          }
        }
        var t = Date.now();
        for (i = 0; i < P.length; i++) {
          var p = P[i];
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
          dx = p.x - mx; dy = p.y - my;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120 && d > 0) { p.x += dx / d * 0.9; p.y += dy / d * 0.9; }
          var near = d < 150;
          var hot = _heroHi.hot.indexOf(p.n) !== -1;
          var cold = _heroHi.cold.indexOf(p.n) !== -1;
          var col = hot ? '200,57,26' : cold ? '110,231,255' : '237,232,223';
          var base = (hot || cold) ? 0.5 : 0.22;
          ctx.fillStyle = 'rgba(' + col + ',' + (near ? Math.min(1, base + 0.5) : base) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, (hot || cold) ? 2.6 : 1.7, 0, 7); ctx.fill();
          if (near) {
            ctx.fillStyle = 'rgba(' + col + ',.85)';
            ctx.font = '500 11px "DM Mono",monospace';
            ctx.fillText(p.n, p.x + 7, p.y - 6);
          }
          if (hot) {
            ctx.strokeStyle = 'rgba(200,57,26,.25)';
            ctx.beginPath(); ctx.arc(p.x, p.y, 6 + Math.sin(t / 300 + p.n) * 2, 0, 7); ctx.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ════════ COUNTDOWN A SEGMENTI ════════
     v8-main.js riscrive #cd ("hh:mm:ss") ogni secondo: lo osserviamo
     e renderizziamo i segmenti, nascondendo il testo originale. */
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

    var H = document.getElementById('v8cd-h'),
        M = document.getElementById('v8cd-m'),
        S = document.getElementById('v8cd-s');

    function sync() {
      var t = (cd.textContent || '').trim();
      var m = /^(\d{1,3}):(\d{2}):(\d{2})$/.exec(t);
      if (m) {
        wrap.classList.add('v8cd-on');
        if (H.textContent !== m[1]) H.textContent = m[1];
        if (M.textContent !== m[2]) M.textContent = m[2];
        S.textContent = m[3];
      } else {
        // "Risultati in arrivo…" o stato non standard: mostra il testo originale
        wrap.classList.remove('v8cd-on');
      }
    }
    new MutationObserver(sync).observe(cd, { childList: true, characterData: true, subtree: true });
    sync();
  }

  /* ════════ JACKPOT PULSE ════════ */
  function jackpotPulse() {
    var jk = document.getElementById('v8-jackpot');
    if (!jk) return;
    new MutationObserver(function () {
      jk.classList.remove('v8jk-pulse');
      void jk.offsetWidth; // restart animazione
      jk.classList.add('v8jk-pulse');
    }).observe(jk, { childList: true, characterData: true, subtree: true });
  }

  /* ════════ DATI REALI → TICKER + CHIPS ════════ */
  function buildDataLayers() {
    Promise.all([
      fetch('data/cards-index.json').then(function (r) { return r.json(); }).catch(function () { return []; }),
      fetch('archives/draws/draws.csv').then(function (r) { return r.text(); }).catch(function () { return ''; })
    ]).then(function (res) {
      var cards = res[0] || [];
      var draws = parseCSV(res[1] || '');

      var stats = { algs: 0, topAlg: null, draws: draws.length, worstN: 0, worstD: -1, hotN: 0, hotC: 0, last: null };

      var ranked = cards.filter(function (c) { return c && c.rankingPosition; });
      ranked.sort(function (a, b) { return a.rankingPosition - b.rankingPosition; });
      stats.algs = ranked.length;
      stats.topAlg = ranked.length ? (ranked[0].title || ranked[0].id) : null;

      if (draws.length) {
        stats.last = draws[draws.length - 1];
        var lastSeen = new Array(91).fill(-1);
        var delays = [];
        draws.forEach(function (d, i) { d.nums.forEach(function (n) { lastSeen[n] = i; }); });
        for (var n = 1; n <= 90; n++) {
          var dly = lastSeen[n] >= 0 ? (draws.length - 1 - lastSeen[n]) : draws.length;
          delays.push([n, dly]);
          if (dly > stats.worstD) { stats.worstD = dly; stats.worstN = n; }
        }
        // più frequente negli ultimi 90 concorsi
        var freq = new Array(91).fill(0);
        draws.slice(-90).forEach(function (d) { d.nums.forEach(function (n) { freq[n]++; }); });
        for (n = 1; n <= 90; n++) if (freq[n] > stats.hotC) { stats.hotC = freq[n]; stats.hotN = n; }

        // evidenziazioni hero: ultima sestina (rosso) + top-4 ritardi (ciano)
        _heroHi.hot = stats.last.nums.slice();
        delays.sort(function (a, b) { return b[1] - a[1]; });
        _heroHi.cold = delays.slice(0, 4).map(function (x) { return x[0]; });
      }

      buildTicker(stats);
      buildChips(stats);
    }).catch(function () { /* layer opzionali */ });
  }

  function buildTicker(st) {
    var msg = document.getElementById('bb-msg');
    if (!msg || msg.classList.contains('v8tk')) return;
    var items = [];
    if (st.last) {
      items.push('Ultima estrazione <b class="o">' + st.last.date + '</b>');
      items.push('Numeri <b>' + st.last.nums.join(' · ') + '</b>');
      items.push('Archivio <b class="cy">' + st.draws.toLocaleString('it-IT') + '</b> estrazioni dal 1997');
      items.push('Ritardo critico <b class="r">' + st.worstN + '</b> · assente da <b class="r">' + st.worstD + '</b> concorsi');
      items.push('Più frequente (90 concorsi) <b class="cy">' + st.hotN + '</b> · ' + st.hotC + ' uscite');
    }
    if (st.topAlg) {
      items.push('Algoritmo in testa <b class="v">' + st.topAlg + '</b>');
      items.push('<b class="v">' + st.algs + '</b> algoritmi in gara permanente');
    }
    items.push('Gioca responsabilmente · nessuna promessa di vincita · 18+');
    if (!items.length) return;
    var sep = '<span class="sep">◆</span>';
    var html = items.map(function (t) { return '<span>' + t + '</span>'; }).join(sep) + sep;
    msg.classList.add('v8tk');
    msg.innerHTML = '<span class="v8tk-in">' + html + html + '</span>';
  }

  function buildChips(st) {
    // montate su #v8-root: visibili già in hero, non solo dopo l'ingresso
    var ui = document.getElementById('v8-root') || document.getElementById('ui');
    if (!ui || document.getElementById('v8chips') || !st.draws) return;

    var chips = document.createElement('div');
    chips.id = 'v8chips';
    chips.setAttribute('aria-hidden', 'true');
    chips.innerHTML =
      '<div class="v8chip violet p1" data-px="14"><span class="ck">Algoritmi in gara</span><span class="cv">' + (st.algs || '—') + '</span><span class="cs">4 famiglie di modelli</span></div>' +
      '<div class="v8chip amber p2" data-px="-18"><span class="ck">Estrazioni in archivio</span><span class="cv">' + st.draws.toLocaleString('it-IT') + '</span><span class="cs">dal 1997 · aggiornato a ogni concorso</span></div>' +
      '<div class="v8chip red p3" data-px="-12"><span class="ck">Ritardo critico</span><span class="cv">' + st.worstN + '</span><span class="cs">assente da ' + st.worstD + ' concorsi</span></div>' +
      '<div class="v8chip cyan p4" data-px="16"><span class="ck">Più frequente · 90 conc.</span><span class="cv">' + st.hotN + '</span><span class="cs">' + st.hotC + ' uscite recenti</span></div>';
    ui.appendChild(chips);

    // parallax leggero (rAF-throttled)
    var mx = 0, my = 0, raf = null;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        chips.querySelectorAll('.v8chip').forEach(function (ch) {
          var k = +ch.getAttribute('data-px') || 10;
          ch.style.transform = 'translate(' + (mx * k) + 'px,' + (my * k) + 'px)';
        });
      });
    }, { passive: true });

    // nascondi le chip quando il panel è aperto
    var panel = document.getElementById('panel');
    if (panel) {
      new MutationObserver(function () {
        chips.classList.toggle('hide', panel.classList.contains('open'));
      }).observe(panel, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function start() {
    heroConstellation();
    segmentedCountdown();
    jackpotPulse();
    buildDataLayers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
