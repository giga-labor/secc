/* ════════════════════════════════════════════════════════════════
   V8STORICO — Heatmap esplorativa dei 90 numeri (storico-estrazioni)
   Legge /archives/draws/draws.csv (reale) e renderizza:
   · heatmap frequenza / ritardo commutabile
   · focus sul singolo numero (uscite, ritardi, compagno frequente)
   · top ritardi critici
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function parseCSV(text) {
    var rows = [];
    text.split(/\r?\n/).forEach(function (line, idx) {
      if (!line || idx === 0) return; // salta header
      var p = line.split(',');
      if (p.length < 8) return;
      var nums = [];
      for (var i = 2; i < 8; i++) {
        var n = parseInt(p[i], 10);
        if (!isNaN(n) && n >= 1 && n <= 90) nums.push(n);
      }
      if (nums.length === 6) {
        rows.push({ seq: parseInt(p[0], 10), date: p[1], nums: nums });
      }
    });
    return rows;
  }

  function yearOf(d) {
    var m = /(\d{4})\s*$/.exec(d || '');
    return m ? +m[1] : null;
  }

  function init() {
    var mount = document.getElementById('v8x-mount');
    if (!mount) return;

    fetch('/archives/draws/draws.csv')
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var draws = parseCSV(text);
        if (!draws.length) return;
        var total = draws.length;
        var last = draws[draws.length - 1];

        // ── statistiche ──
        var freq = new Array(91).fill(0);
        var lastSeen = new Array(91).fill(-1);   // indice ultima uscita
        var maxGap = new Array(91).fill(0);
        var prevIdx = new Array(91).fill(-1);
        var years = {};                            // uscite per anno per numero (per sparkline)
        var co = {};                               // co-occorrenze del focus (lazy)

        draws.forEach(function (d, i) {
          var y = yearOf(d.date);
          d.nums.forEach(function (n) {
            freq[n]++;
            if (prevIdx[n] >= 0) maxGap[n] = Math.max(maxGap[n], i - prevIdx[n]);
            prevIdx[n] = i;
            lastSeen[n] = i;
            if (y) {
              if (!years[n]) years[n] = {};
              years[n][y] = (years[n][y] || 0) + 1;
            }
          });
        });
        var delay = [];
        for (var n = 1; n <= 90; n++) {
          delay[n] = lastSeen[n] >= 0 ? (total - 1 - lastSeen[n]) : total;
          maxGap[n] = Math.max(maxGap[n], delay[n]);
        }
        var fMin = Infinity, fMax = -Infinity, dMax = 0;
        for (n = 1; n <= 90; n++) {
          fMin = Math.min(fMin, freq[n]); fMax = Math.max(fMax, freq[n]);
          dMax = Math.max(dMax, delay[n]);
        }

        function mate(sel) {
          if (co[sel]) return co[sel];
          var cnt = new Array(91).fill(0);
          draws.forEach(function (d) {
            if (d.nums.indexOf(sel) !== -1) {
              d.nums.forEach(function (m) { if (m !== sel) cnt[m]++; });
            }
          });
          var best = 0, bestN = 0;
          for (var m = 1; m <= 90; m++) if (cnt[m] > best) { best = cnt[m]; bestN = m; }
          co[sel] = { n: bestN, c: best };
          return co[sel];
        }

        // ── markup ──
        var sum = last.nums.reduce(function (a, b) { return a + b; }, 0);
        var even = last.nums.filter(function (x) { return x % 2 === 0; }).length;
        mount.innerHTML =
          '<div class="v8x">' +
            '<div class="v8x-head">' +
              '<span class="v8x-k">Mappa viva dei 90 numeri · ' + total.toLocaleString('it-IT') + ' estrazioni dal 1997</span>' +
              '<div class="v8x-mode">' +
                '<button class="on" id="v8x-mf" type="button">Frequenza</button>' +
                '<button id="v8x-mr" type="button">Ritardo</button>' +
              '</div>' +
            '</div>' +
            '<div class="v8x-cols">' +
              '<div>' +
                '<div class="v8x-grid" id="v8x-grid"></div>' +
                '<div class="v8x-legend"><span id="v8x-lo">Raro</span><div class="v8x-lg" id="v8x-lg"></div><span id="v8x-hi">Frequente</span></div>' +
              '</div>' +
              '<div>' +
                '<div class="v8x-focus" id="v8x-focus"></div>' +
                '<div class="v8x-k" style="margin:1.3rem 0 .2rem">Ritardi critici</div>' +
                '<div class="v8x-rit" id="v8x-rit"></div>' +
                '<div class="v8x-k" style="margin:1.3rem 0 .4rem">Ultima estrazione · ' + last.date + '</div>' +
                '<div style="font-family:\'DM Mono\',monospace;font-size:.9rem;letter-spacing:.18em;color:#EDE8DF">' + last.nums.join(' · ') + '</div>' +
                '<div style="font-size:.56rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(237,232,223,.3);margin-top:.5rem">Somma ' + sum + ' · Pari/Dispari ' + even + '/' + (6 - even) + '</div>' +
              '</div>' +
            '</div>' +
          '</div>';

        var grid = document.getElementById('v8x-grid');
        var mode = 'F', sel = last.nums[0];

        function colF(v) {
          var t = (v - fMin) / Math.max(1, fMax - fMin);
          return 'rgba(' + Math.round(139 - 29 * t) + ',' + Math.round(92 + 139 * t) + ',' + Math.round(246 + 9 * t) + ',' + (0.10 + t * 0.55) + ')';
        }
        function colR(v) {
          var t = Math.min(1, v / Math.max(1, dMax));
          return 'rgba(200,57,26,' + (0.05 + t * 0.72) + ')';
        }

        function paint() {
          var html = '';
          for (var i = 1; i <= 90; i++) {
            var v = mode === 'F' ? freq[i] : delay[i];
            html += '<div class="v8x-n' + (i === sel ? ' sel' : '') + '" data-n="' + i + '" ' +
              'style="background:' + (mode === 'F' ? colF(v) : colR(v)) + '" ' +
              'title="' + (mode === 'F' ? v + ' uscite' : 'ritardo ' + v) + '">' + i + '</div>';
          }
          grid.innerHTML = html;
          document.getElementById('v8x-lg').style.background = mode === 'F'
            ? 'linear-gradient(90deg,rgba(139,92,246,.15),rgba(110,231,255,.8))'
            : 'linear-gradient(90deg,rgba(200,57,26,.08),rgba(200,57,26,.85))';
          document.getElementById('v8x-lo').textContent = mode === 'F' ? 'Raro' : 'Recente';
          document.getElementById('v8x-hi').textContent = mode === 'F' ? 'Frequente' : 'Ritardo critico';
        }

        function focus() {
          var m = mate(sel);
          var ys = years[sel] || {};
          var yk = Object.keys(ys).sort();
          var maxy = 1;
          yk.forEach(function (y) { maxy = Math.max(maxy, ys[y]); });
          var pts = yk.map(function (y, i) {
            var x = (i * (100 / Math.max(1, yk.length - 1))).toFixed(1);
            var yy = (48 - (ys[y] / maxy) * 42).toFixed(1);
            return x + ',' + yy;
          }).join(' ');
          document.getElementById('v8x-focus').innerHTML =
            '<div class="v8x-k" style="margin-bottom:.4rem">Focus numero</div>' +
            '<div class="big">' + sel + '</div>' +
            '<div class="v8x-frow"><span>Uscite totali</span><b class="cy">' + freq[sel] + '</b></div>' +
            '<div class="v8x-frow"><span>Ritardo attuale</span><b class="am">' + delay[sel] + ' concorsi</b></div>' +
            '<div class="v8x-frow"><span>Ritardo massimo storico</span><b>' + maxGap[sel] + '</b></div>' +
            '<div class="v8x-frow"><span>Compagno più frequente</span><b class="hot">' + m.n + ' · ' + m.c + ' volte</b></div>' +
            (pts ? '<svg class="v8x-spark" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">' +
              '<polyline points="' + pts + '" fill="none" stroke="#6EE7FF" stroke-width="1.6" opacity=".8"/></svg>' : '');
        }

        grid.addEventListener('click', function (e) {
          var t = e.target.closest('.v8x-n');
          if (!t) return;
          sel = +t.getAttribute('data-n');
          focus(); paint();
        });
        document.getElementById('v8x-mf').addEventListener('click', function () {
          mode = 'F'; this.classList.add('on');
          var r = document.getElementById('v8x-mr'); r.classList.remove('on', 'rit');
          paint();
        });
        document.getElementById('v8x-mr').addEventListener('click', function () {
          mode = 'R'; this.classList.add('on', 'rit');
          document.getElementById('v8x-mf').classList.remove('on');
          paint();
        });

        // top 5 ritardi
        var top = [];
        for (n = 1; n <= 90; n++) top.push([n, delay[n]]);
        top.sort(function (a, b) { return b[1] - a[1]; });
        document.getElementById('v8x-rit').innerHTML = top.slice(0, 5).map(function (x) {
          return '<div class="v8x-rr"><span class="nn">' + x[0] + '</span>' +
            '<div class="bar"><i style="--w:' + Math.round(x[1] / top[0][1] * 100) + '%"></i></div>' +
            '<b>' + x[1] + ' conc.</b></div>';
        }).join('');

        paint(); focus();
      })
      .catch(function () { /* explorer opzionale */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
