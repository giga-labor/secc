(function () {
  'use strict';
  var body = document.body;
  if (!body) return;
  var page = String(body.dataset.pageId || '');
  if (['proposte', 'storico', 'laboratorio-tecnico', 'backtest-roi'].indexOf(page) < 0) return;
  document.documentElement.classList.add('cc-algorithm-migrated', 'cc-primary-migrated');

  var icons = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2 12h2M20 12h2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v10h-6v-6H9v6H3Z"/></svg>',
    dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="1.5"/><circle cx="12" cy="6" r="1.5"/><circle cx="18" cy="6" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/><circle cx="6" cy="18" r="1.5"/><circle cx="12" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/></svg>',
    flask: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8"/></svg>',
    oracle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Zm-4 6 4-2 4 2-4 2Zm0 0v5l4 2 4-2V9"/></svg>',
    privacy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.7 2.8 8.3 7 10 4.2-1.7 7-5.3 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></svg>'
  };
  var titleMap = { proposte: 'Sestine consigliate', storico: 'Storico estrazioni', 'laboratorio-tecnico': 'Laboratorio tecnico', 'backtest-roi': 'Backtest ROI' };

  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function fetchJson(url, fallback) { return fetch(url, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : fallback; }).catch(function () { return fallback; }); }
  function fetchText(url) { return fetch(url, { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; }); }
  function family(value) { var v=String(value||'').toLowerCase(); return v.indexOf('oracle')>=0?'oracolo':v.indexOf('neur')>=0?'neurale':v.indexOf('ibrid')>=0||v.indexOf('genet')>=0?'ibrido':v.indexOf('gener')>=0?'generativi':'statistica'; }
  function title(card) { return String(card.title||card.id||'Algoritmo').replace(/-/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}); }
  function balls(values) { return (values||[]).slice(0,6).map(function (n) { return '<span class="cca-ball">'+esc(n)+'</span>'; }).join(''); }
  function trendBadges(card) {
    var score=Number(card&&card.rankingScoreDeltaPct),position=Number(card&&card.rankingPositionDelta);
    if(!Number.isFinite(score)||!Number.isFinite(position))return '';
    function tone(value){return value>0.049?'is-up':value<-.049?'is-down':'is-flat';}
    function signed(value,decimals){return(value>=0?'+':'')+value.toLocaleString('it-IT',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});}
    return '<span class="cc-trend-badges"><span class="cc-trend-badge '+tone(score)+'" title="Variazione del punteggio rispetto al concorso precedente">'+signed(score,1)+'%</span><span class="cc-trend-badge '+tone(position)+'" title="Posti guadagnati o persi rispetto al concorso precedente">'+signed(position,0)+' '+(Math.abs(Math.round(position))===1?'posto':'posti')+'</span></span>';
  }
  function parseCsv(text) {
    var lines=String(text||'').replace(/^\uFEFF/,'').trim().split(/\r?\n/); if(lines.length<2)return[];
    var head=lines.shift().split(',').map(function(x){return x.trim();});
    return lines.map(function(line){var vals=line.split(','),row={};head.forEach(function(h,i){row[h]=vals[i]||'';});return row;});
  }
  function chrome() {
    return '<header class="cca-topbar"><button class="cca-icon-btn" data-back aria-label="Indietro">'+icons.back+'</button><div class="cca-titlebar">'+titleMap[page]+'</div><button class="cca-icon-btn is-theme-disabled" data-theme disabled aria-label="Cambio tema (temporaneamente disabilitato)">'+icons.sun+'</button></header>'+
      '<nav class="cca-bottom-nav" aria-label="Navigazione principale">'+[
        ['Home','/#/home','home'],['Algoritmi','/pages/algoritmi/','dots'],['Laboratorio','/#/laboratorio','flask'],['Oracolo','/pages/oracle/','oracle'],['Privacy','/pages/privacy-policy/','privacy']
      ].map(function(i){return '<a class="cca-nav-item'+(i[2]==='flask'?' is-active':'')+'" href="'+i[1]+'">'+icons[i[2]]+'<span>'+i[0]+'</span></a>';}).join('')+'</nav>';
  }
  function mount(content) {
    body.innerHTML='<div class="cca-app">'+chrome()+'<main class="cca-page cca-primary-page">'+content+'</main></div>';
    var back=body.querySelector('[data-back]'); back.addEventListener('click',function(){history.length>1?history.back():location.assign('/');});
    body.querySelector('[data-theme]').addEventListener('click',function(){var n=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=n;try{localStorage.setItem('cc-app-theme',n);localStorage.setItem('cc-theme',n);}catch(_){}});
    document.documentElement.dataset.theme='dark'; // tema chiaro temporaneamente disabilitato
    document.documentElement.classList.add('cc-ui-ready');
  }
  function filters() { return '<div class="cca-filters" data-filters><button class="cca-filter is-active" data-family="all">Tutti</button><button class="cca-filter" data-family="statistica">Statistici</button><button class="cca-filter" data-family="neurale">AI & ML</button><button class="cca-filter" data-family="ibrido">Ibridi</button><button class="cca-filter" data-family="generativi">Generativi</button></div>'; }
  function bindFilters(selector) { body.querySelectorAll('[data-family]').forEach(function(btn){btn.addEventListener('click',function(){body.querySelectorAll('[data-family]').forEach(function(x){x.classList.toggle('is-active',x===btn);});body.querySelectorAll(selector).forEach(function(row){row.hidden=btn.dataset.family!=='all'&&row.dataset.family!==btn.dataset.family;});});}); }

  function proposalsPage() {
    Promise.all([fetchJson('../../data/cards-index.json',[]),fetchJson('../../data/next-draw.json',{})]).then(function(data){
      var cards=(data[0]||[]).filter(function(c){return c&&c.isActive!==false&&String(c.page||'').indexOf('pages/algoritmi/algs/')>=0;}).sort(function(a,b){return Number(b.rankingValue||0)-Number(a.rankingValue||0);});
      return Promise.all(cards.map(function(card){var base='/'+String(card.page||'').replace(/^\//,'').replace(/\/?$/,'/');return fetchJson(base+'out/snapshot.json',{}).then(function(s){return {card:card,snapshot:s};});})).then(function(rows){
        var contest=data[1]||{};
        var content='<section class="cca-card cca-primary-hero"><div><span class="cca-eyebrow">Prossimo concorso</span><h1>#'+esc(contest.next_seq||'--')+'</h1><p>'+esc((contest.next_weekday||'')+' '+(contest.next_date||'')+' · '+(contest.next_time||''))+'</p></div><div class="cca-orbit-mark" aria-hidden="true">6</div></section>'+filters()+'<section class="cca-proposal-list">'+rows.filter(function(r){return Array.isArray(r.snapshot.proposal)&&r.snapshot.proposal.length===6;}).map(function(r,i){var f=family(r.card.macroGroup),trend=trendBadges(r.card);return '<a class="cca-card cca-proposal-card" data-family="'+f+'" href="/'+esc(String(r.card.page||'').replace(/^\//,''))+'"><div class="cca-proposal-meta"><span>'+(i+1).toString().padStart(2,'0')+'</span><div><h2>'+esc(title(r.card))+'</h2><small>'+esc(f)+'</small>'+trend+'</div><strong>'+Number(r.card.rankingValue||0).toLocaleString('it-IT',{maximumFractionDigits:1})+'%</strong></div><div class="cca-proposal">'+balls(r.snapshot.proposal)+'</div></a>';}).join('')+'</section>';
        mount(content);bindFilters('.cca-proposal-card');
      });
    });
  }

  function historicPage() {
    Promise.all([fetchText('../../archives/draws/draws.csv'),fetchJson('../../data/draws-frequency.json',{}) ]).then(function(data){
      var rows=parseCsv(data[0]).reverse(),freq=data[1]||{}; var top=(freq.labels||[]).map(function(n,i){return {n:n,v:Number((freq.values||[])[i]||0)};}).sort(function(a,b){return b.v-a.v;}).slice(0,6);
      var content='<section class="cca-card cca-primary-hero"><div><span class="cca-eyebrow">Archivio completo</span><h1>'+rows.length.toLocaleString('it-IT')+'</h1><p>Estrazioni ordinate dalla più recente</p></div><div class="cca-orbit-mark" aria-hidden="true">90</div></section><section class="cca-card cca-pad"><h2 class="cca-section-label">Numeri più frequenti</h2><div class="cca-ranked-balls">'+top.map(function(x){return '<div><span class="cca-ball">'+x.n+'</span><small>'+x.v+' presenze</small></div>';}).join('')+'</div></section><div class="cca-history-tools"><input type="search" class="cca-search" data-search placeholder="Cerca data, concorso o numero" aria-label="Cerca nello storico"></div><section class="cca-history-list" data-list></section><div class="cca-pager"><button data-prev>Indietro</button><span data-page></span><button data-next>Avanti</button></div>';
      mount(content);var filtered=rows,pageNo=0,size=30,list=body.querySelector('[data-list]');
      function render(){var slice=filtered.slice(pageNo*size,pageNo*size+size);list.innerHTML=slice.map(function(r){var nums=[r.N1,r.N2,r.N3,r.N4,r.N5,r.N6];return '<article class="cca-card cca-history-row"><div><strong>#'+esc(r['NR. SEQUENZIALE'])+'</strong><small>'+esc(r.DATA)+'</small></div><div class="cca-proposal">'+balls(nums)+'</div></article>';}).join('');body.querySelector('[data-page]').textContent='Pagina '+(pageNo+1)+' / '+Math.max(1,Math.ceil(filtered.length/size));body.querySelector('[data-prev]').disabled=pageNo===0;body.querySelector('[data-next]').disabled=(pageNo+1)*size>=filtered.length;}
      body.querySelector('[data-search]').addEventListener('input',function(e){var q=e.target.value.trim().toLowerCase();filtered=!q?rows:rows.filter(function(r){return Object.values(r).join(' ').toLowerCase().indexOf(q)>=0;});pageNo=0;render();});body.querySelector('[data-prev]').addEventListener('click',function(){if(pageNo>0){pageNo--;render();scrollTo(0,0);}});body.querySelector('[data-next]').addEventListener('click',function(){if((pageNo+1)*size<filtered.length){pageNo++;render();scrollTo(0,0);}});render();
    });
  }

  function laboratoryPage() {
    Promise.all([fetchJson('../../data/precomputed/laboratorio-tecnico.json',{}),fetchJson('../../data/cards-index.json',[])]).then(function(data){var lab=data[0]||{},cards=(data[1]||[]).filter(function(c){return c&&c.isActive!==false&&String(c.page||'').indexOf('pages/algoritmi/algs/')>=0;});var k=lab.kpi||{};
      var content='<section class="cca-card cca-primary-hero"><div><span class="cca-eyebrow">Base tecnica verificabile</span><h1>Laboratorio</h1><p>Metodo, metriche e limiti dei modelli attivi.</p></div><div class="cca-orbit-mark" aria-hidden="true">'+esc(lab.active_algorithms_count||cards.length)+'</div></section><section class="cca-lab-kpis"><div class="cca-card"><strong>'+esc(k.algoritmi_documentati||cards.length)+'</strong><span>Algoritmi documentati</span></div><div class="cca-card"><strong>'+esc(k.storico_analizzato_anni||'--')+'</strong><span>Anni analizzati</span></div><div class="cca-card"><strong>'+esc(k.famiglie_modelli||'--')+'</strong><span>Famiglie</span></div></section>'+filters()+'<section class="cca-lab-list">'+cards.sort(function(a,b){return Number(b.rankingValue||0)-Number(a.rankingValue||0);}).map(function(card){var f=family(card.macroGroup),entry=(lab.entries||[]).find(function(e){return String(e.page||'').toLowerCase().indexOf(String(card.page||'').replace(/^\//,'').toLowerCase())>=0;})||{},trend=trendBadges(card);return '<article class="cca-card cca-lab-card" data-family="'+f+'"><button type="button" data-lab-toggle><img src="/'+esc(String(card.page||'').replace(/^\//,'').replace(/\/?$/,'/'))+'img.webp" alt=""><span><strong>'+esc(title(card))+'</strong><small>'+esc(entry.scope||card.subtitle||'')+'</small>'+trend+'</span><b>'+Number(card.rankingValue||0).toLocaleString('it-IT',{maximumFractionDigits:1})+'%</b></button><div class="cca-lab-detail" hidden><p><strong>Metodo</strong>'+esc(entry.method||'Documentazione in aggiornamento.')+'</p><p><strong>Limiti</strong>'+esc(entry.limits||'Nessuna garanzia predittiva.')+'</p><a href="/'+esc(String(card.page||'').replace(/^\//,''))+'">Apri scheda completa</a></div></article>';}).join('')+'</section>';
      mount(content);bindFilters('.cca-lab-card');body.querySelectorAll('[data-lab-toggle]').forEach(function(btn){btn.addEventListener('click',function(){var detail=btn.nextElementSibling;detail.hidden=!detail.hidden;});});
    });
  }
  function roiBacktestPage() {
    fetchJson('../../data/precomputed/roi-backtest.json', {}).then(function (data) {
      var rows = data.rows || [], cat = data.category_counts || {}, jackpot = data.jackpot_events || [];
      var content =
        '<section class="cca-card cca-primary-hero"><div><span class="cca-eyebrow">Ultimi ' + Math.round((data.period_days || 365) / 30) + ' mesi</span><h1>Backtest ROI</h1><p>Simulazione: 1 colonna (1&euro;) a concorso per ogni algoritmo attivo.</p></div><div class="cca-orbit-mark" aria-hidden="true">' + esc(data.contests_covered || '--') + '</div></section>' +
        '<section class="cca-lab-kpis"><div class="cca-card"><strong>&euro;' + Number(data.total_cost_eur || 0).toLocaleString('it-IT', {maximumFractionDigits: 2}) + '</strong><span>Speso stimato</span></div><div class="cca-card"><strong>&euro;' + Number(data.total_estimated_prize_eur || 0).toLocaleString('it-IT', {maximumFractionDigits: 2}) + '</strong><span>Vinto stimato</span></div><div class="cca-card"><strong>' + Number(data.roi_pct || 0).toLocaleString('it-IT', {maximumFractionDigits: 1}) + '%</strong><span>ROI</span></div></section>' +
        '<section class="cca-card cca-pad"><h2 class="cca-section-label">Distribuzione punti (&ge;2)</h2><div class="cca-ranked-balls">' + [2, 3, 4, 5, 6].map(function (k) { return '<div><span class="cca-ball">' + k + '</span><small>' + (cat[k] || 0) + ' volte</small></div>'; }).join('') + '</div>' +
        (jackpot.length ? '<p style="margin-top:12px;color:var(--text-muted)">Attenzione: ' + jackpot.length + ' evento/i a 6 punti nel periodo, escluso/i dal vinto stimato (jackpot troppo variabile per una media).</p>' : '') +
        '<p style="margin-top:12px;color:var(--text-muted)">' + esc(data.prize_table_note || '') + '</p></section>' +
        '<section class="cca-history-list">' + rows.slice().reverse().slice(0, 60).map(function (r) { return '<article class="cca-card cca-history-row"><div><strong>#' + esc(r.seq) + '</strong><small>' + esc(r.date) + '</small></div><div><span>hit medio ' + esc(r.avg_hits) + '</span> &middot; <span>speso &euro;' + esc(r.cost) + '</span> &middot; <span>vinto &euro;' + esc(r.estimated_prize) + '</span></div></article>'; }).join('') + '</section>';
      mount(content);
    });
  }
  if(page==='proposte')proposalsPage(); else if(page==='storico')historicPage(); else if(page==='backtest-roi')roiBacktestPage(); else laboratoryPage();
})();
