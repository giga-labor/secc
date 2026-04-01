(function(){
  'use strict';

  const DU=window.SECC_DATA_UTILS || {};
  const parseCsvRows=DU.parseCsvRows || (()=>[]);
  const readMetricValue=DU.readMetricValue || (()=>'');
  const normBasePath=DU.normBasePath || ((p)=>String(p||''));
  const slugifyMessageKey=DU.slugifyMessageKey || ((v)=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-'));
  const extractLatestDrawMessage=DU.extractLatestDrawMessage || (()=>null);
  const parseDrawDateLabel=DU.parseDrawDateLabel || ((v)=>String(v||''));

  async function fetchJson(path){
    const r=await fetch(path,{cache:'no-store'});
    if(!r.ok) return null;
    return r.json();
  }
  async function fetchText(path){
    const r=await fetch(path,{cache:'no-store'});
    if(!r.ok) return '';
    return r.text();
  }
  async function loadCardsIndex(){
    const cards=await fetchJson('data/cards-index.json');
    return Array.isArray(cards) ? cards : [];
  }
  function classifyAlgoGroup(card){
    const g=String(card?.macroGroup||'').toLowerCase();
    if(g.includes('neur')) return 'alg_neurali';
    if(g.includes('ibrid')) return 'alg_ibridi';
    return 'alg_statistici';
  }
  function cardBaseFromCard(card){
    const p=String(card?.cardBase || card?.page || '').trim();
    return normBasePath(p);
  }
  function labelFromCard(card){
    return String(card?.title || card?.id || 'Algoritmo').trim() || 'Algoritmo';
  }
  function readDrawField(row, keys){
    if(!row || typeof row!=='object') return '';
    for(let i=0;i<keys.length;i++){
      const v=row[keys[i]];
      if(v!=null && String(v).trim()) return String(v).trim();
    }
    return '';
  }
  function buildLatestDrawItem(drawRows){
    if(!Array.isArray(drawRows) || !drawRows.length) return null;
    const row=drawRows[drawRows.length-1] || {};
    const contest=readDrawField(row,['concorso','contest','NR. SEQUENZIALE','nr. sequenziale','nr']);
    const dateRaw=readDrawField(row,['data','date','DATA','DATE']);
    const dateLabel=parseDrawDateLabel(dateRaw);
    const nums=['n1','n2','n3','n4','n5','n6','N1','N2','N3','N4','N5','N6']
      .map((k)=>String(row?.[k]||'').trim())
      .filter(Boolean)
      .slice(0,6);
    if(nums.length<6) return null;
    return {
      key:`news-draw-${slugifyMessageKey(contest||dateLabel||'latest')}`,
      tag:'DRAW',
      time:dateLabel || 'ultimo concorso',
      title:`Ultima estrazione${contest ? ` #${contest}` : ''}`,
      body:`Data: ${dateLabel || 'n/d'} - Sestina estratta: ${nums.join(' ')}`,
      href:'pages/storico-estrazioni/',
      cta:'Apri estrazione'
    };
  }
  function countBracketHitsInLine(line){
    return (String(line||'').match(/\[[0-9]{1,2}\]/g)||[]).length;
  }

  async function loadLatestDrawItem(){
    try{
      const drawsCsv=await fetchText('archives/draws/draws.csv');
      const drawRows=parseCsvRows(drawsCsv);
      const strictItem=buildLatestDrawItem(drawRows);
      if(strictItem) return strictItem;
      const drawMsg=extractLatestDrawMessage(drawRows);
      if(drawMsg && drawMsg.title && drawMsg.body) return drawMsg;
    }catch(_e){}
    return null;
  }

  async function buildNewsLatestDrawFeed(){
    const item=await loadLatestDrawItem();
    if(item) return [item];
    return [{
      key:'news-draw-fallback',
      tag:'DRAW',
      time:'sync',
      title:'Ultima estrazione non disponibile',
      body:'I dati dell ultimo concorso non sono ancora disponibili.',
      href:'pages/storico-estrazioni/',
      cta:'Apri archivio'
    }];
  }

  async function buildNewsTwoHitsLastDrawFeed(limit){
    const cards=await loadCardsIndex();
    const algos=cards.filter((c)=>{
      const page=String(c?.page||'').replace(/\\/g,'/').toLowerCase();
      return c && c.view!==false && c.isActive!==false && page.includes('/pages/algoritmi/algs/');
    });
    const rows=await Promise.all(algos.map(async(card)=>{
      const base=cardBaseFromCard(card);
      if(!base) return null;
      const hist=await fetchText(`${base}out/historical-db.csv`);
      if(!hist) return null;
      const lines=hist.split(/\r?\n/).filter(Boolean);
      if(lines.length<2) return null;
      const lastLine=lines[lines.length-1];
      const hits=countBracketHitsInLine(lastLine);
      if(hits<2) return null;
      return {
        key:`news-2hits-${slugifyMessageKey(card.id||labelFromCard(card))}`,
        tag:'ALGO',
        time:'ultimo concorso',
        title:`${labelFromCard(card)} - ${hits} hit`,
        body:`Nell ultima estrazione questo algoritmo ha centrato ${hits} hit.`,
        href:String(card.page||base).trim(),
        cta:'Apri algoritmo',
        score:hits
      };
    }));
    const out=rows
      .filter(Boolean)
      .sort((a,b)=>(b.score-a.score) || String(a.title||'').localeCompare(String(b.title||'')))
      .slice(0,Math.max(1,limit||12))
      .map(({score,...rest})=>rest);
    if(out.length) return out;
    return [{
      key:'news-2hits-fallback',
      tag:'ALGO',
      time:'ultimo concorso',
      title:'Nessun algoritmo con almeno 2 hit',
      body:'Nell ultima estrazione non risultano algoritmi con 2 o piu hit.',
      href:'pages/algoritmi/',
      cta:'Apri algoritmi'
    }];
  }

  async function buildNewsActiveCardsFeed(limit){
    const out=[];
    const latestDraw=await loadLatestDrawItem();
    if(latestDraw) out.push(latestDraw);

    const cards=await loadCardsIndex();
    const active=cards.filter((c)=>c && c.view!==false && c.isActive!==false);
    const news=active
      .filter((c)=>Boolean(c?.hasNews))
      .sort((a,b)=>String(b?.lastUpdated||'').localeCompare(String(a?.lastUpdated||'')));
    const newsItems=news.slice(0,Math.max(1,limit||12)).map((card,idx)=>({
      key:`news-${slugifyMessageKey(card.id||idx)}`,
      tag:'NEWS',
      time:String(card.lastUpdated||'agg.'),
      title:labelFromCard(card),
      body:String(card.subtitle || card.narrativeSummary || 'Aggiornamento disponibile').trim(),
      href:String(card.page||'').trim(),
      cta:'Apri scheda'
    }));
    out.push(...newsItems);
    if(out.length) return out;
    return [{
      key:'news-fallback',
      tag:'NEWS',
      time:'sync',
      title:'Nessun evento in evidenza',
      body:'Al momento non ci sono eventi news disponibili.',
      href:'pages/algoritmi/'
    }];
  }
  async function buildNewsFeed(limit){
    return buildNewsActiveCardsFeed(limit);
  }

  async function buildProposteFeed(limit){
    const cards=await loadCardsIndex();
    const algos=cards.filter((c)=>{
      const page=String(c?.page||'').replace(/\\/g,'/').toLowerCase();
      return c && c.view!==false && c.isActive!==false && page.includes('/pages/algoritmi/algs/');
    });
    const rows=await Promise.all(algos.map(async(card)=>{
      const base=cardBaseFromCard(card);
      if(!base) return null;
      const metrics=await fetchText(`${base}out/metrics-db.csv`);
      if(!metrics) return null;
      const nextContest=String(readMetricValue(metrics,'Concorso successivo stimato')||'').trim();
      const nextSix=String(readMetricValue(metrics,'Sestina proposta (prossimo concorso)')||'').trim();
      if(!nextSix) return null;
      const hit2=Number(readMetricValue(metrics,'Con 2 hit')||0);
      const hit3=Number(readMetricValue(metrics,'Con 3 hit')||0);
      const hit4=Number(readMetricValue(metrics,'Con 4 hit')||0);
      const score=(hit2||0) + (hit3||0)*12 + (hit4||0)*140;
      const soId=classifyAlgoGroup(card);
      const algoUrl=String(card.page||base).trim();
      const label=labelFromCard(card);
      const href=`secc://proposal?so=${encodeURIComponent(soId)}&url=${encodeURIComponent(algoUrl)}&label=${encodeURIComponent(label)}`;
      return {
        key:`proposal-${slugifyMessageKey(card.id||label)}-${slugifyMessageKey(nextContest||'next')}`,
        tag:'PROPOSTA',
        time:nextContest || String(card.lastUpdated||'agg.'),
        title:`${label} · ${nextSix}`,
        body:`Sestina proposta${nextContest ? ` per concorso ${nextContest}` : ''}. Seleziona per aprire l'algoritmo collegato.`,
        href,
        cta:'Seleziona sestina',
        score
      };
    }));
    const out=rows
      .filter(Boolean)
      .sort((a,b)=>(b.score-a.score) || String(b.time).localeCompare(String(a.time)))
      .slice(0,Math.max(1,limit||16))
      .map(({score,...rest})=>rest);
    if(out.length) return out;
    return [{
      key:'proposal-fallback',
      tag:'PROPOSTA',
      time:'sync',
      title:'Nessuna sestina disponibile',
      body:'Nessuna proposta disponibile nei moduli attivi.',
      href:'pages/algoritmi/',
      cta:'Apri algoritmi'
    }];
  }

  function buildLaboratorioFeed(){
    return [
      {
        key:'lab-stat-dashboard',
        tag:'LAB',
        time:'articolo',
        title:'Dashboard Statistiche',
        body:'Approfondimenti tecnici su frequenze, ritardi e trend.',
        href:'pages/analisi-statistiche/',
        cta:'Apri articolo'
      },
      {
        key:'lab-storico',
        tag:'LAB',
        time:'dataset',
        title:'Archivio Storico',
        body:'Dataset storico concorsi, base informativa per algoritmi e studi.',
        href:'pages/storico-estrazioni/',
        cta:'Apri articolo'
      },
      {
        key:'lab-ranking',
        tag:'LAB',
        time:'metrica',
        title:'Ranking Tecnico',
        body:'Lettura metrica e confronto moduli attivi.',
        href:'pages/ranking/',
        cta:'Apri articolo'
      }
    ];
  }

  function buildPolicyFeed(){
    return [
      { key:'policy-privacy', tag:'POLICY', time:'legale', title:'Privacy Policy', body:'Informativa privacy del sito.', href:'pages/privacy-policy/', cta:'Apri' },
      { key:'policy-cookie', tag:'POLICY', time:'legale', title:'Cookie Policy', body:'Gestione cookie e preferenze.', href:'pages/cookie-policy/', cta:'Apri' },
      { key:'policy-consenso', tag:'CONSENSO', time:'legale', title:'Policy e Consenso', body:'Sintesi consenso e gestione autorizzazioni.', href:'pages/policy-consenso/', cta:'Apri' },
      { key:'policy-termini', tag:'POLICY', time:'legale', title:'Termini di Servizio', body:'Termini e condizioni d uso.', href:'pages/termini-servizio/', cta:'Apri' }
    ];
  }

  window.SECC_SOH_HUBS=Object.freeze({
    buildNewsLatestDrawFeed,
    buildNewsTwoHitsLastDrawFeed,
    buildNewsActiveCardsFeed,
    buildNewsFeed,
    buildProposteFeed,
    buildLaboratorioFeed,
    buildPolicyFeed
  });
})();
