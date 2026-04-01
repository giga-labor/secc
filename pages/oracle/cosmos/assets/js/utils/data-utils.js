// data-utils.js — Utility pure per dati: CSV, path, card, messaggi
// Espone window.SECC_DATA_UTILS — nessuna dipendenza esterna.
(function(){
  'use strict';

  // ─── PATH / URL ───────────────────────────────────────────────────────────

  // Normalizza un path base "pages/xxx/" (trailing slash garantita)
  function normBasePath(p){
    if(!p) return '';
    let v=String(p||'').replace(/\\/g,'/').trim();
    try{ if(/^https?:\/\//i.test(v)) v=new URL(v).pathname; }catch(_e){}
    v=v.split('#')[0].split('?')[0];
    if(v.startsWith('./')) v=v.slice(2);
    if(v.startsWith('/')) v=v.slice(1);
    if(v.toLowerCase().endsWith('index.html')) v=v.slice(0, v.length - 'index.html'.length);
    if(v && !v.endsWith('/')) v += '/';
    return v;
  }

  // Risolve l'URL dell'immagine di una card relativo al suo base path
  function resolveCardImage(card){
    const img=String(card?.image||'').trim();
    if(!img) return '';
    if(/^https?:\/\//i.test(img) || img.startsWith('data:')) return img;
    if(img.startsWith('/')) return img.slice(1);
    if(img.startsWith('pages/') || img.startsWith('assets/') || img.startsWith('img/')) return img;
    const base=normBasePath(card.cardBase||card.page||'');
    let out = (base||'') + img;
    if(card?.imageVersion) out += `?v=${encodeURIComponent(String(card.imageVersion))}`;
    return out;
  }

  // Converte un href in etichetta leggibile (es. "pages/ranking/" → "ranking")
  function prettyPathLabel(href, fallback){
    let s=String(href||'').trim();
    if(!s) return String(fallback||'');
    s=s.replace(/\\/g,'/');
    try{ if(/^https?:\/\//i.test(s)) s=new URL(s).pathname; }catch(_e){}
    s=s.split('#')[0].split('?')[0];
    if(s.startsWith('/')) s=s.slice(1);
    if(s.startsWith('./')) s=s.slice(2);
    if(s.startsWith('pages/')) s=s.slice('pages/'.length);
    if(s.toLowerCase().endsWith('index.html')) s=s.slice(0, s.length - 'index.html'.length);
    while(s.endsWith('/')) s=s.slice(0,-1);
    return s.split('/').join(' · ');
  }

  // ─── CSV ──────────────────────────────────────────────────────────────────

  function csvSplit(line){
    const out=[]; let cur=''; let q=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'){
        if(q && line[i+1]==='"'){ cur+='"'; i++; }
        else q=!q;
      }else if(ch===',' && !q){
        out.push(cur); cur='';
      }else{
        cur+=ch;
      }
    }
    out.push(cur);
    return out;
  }

  function parseCsvRows(text){
    const rows=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
    if(rows.length<2) return [];
    const headers=csvSplit(rows[0]).map((v)=>String(v||'').trim());
    return rows.slice(1).map((line)=>{
      const cols=csvSplit(line);
      const rec={};
      headers.forEach((h,i)=>{ rec[h]=String(cols[i]??'').trim(); });
      return rec;
    });
  }

  // ─── METRICS ─────────────────────────────────────────────────────────────

  function readMetricValue(text, label){
    const rows=parseCsvRows(text);
    const hit=rows.find((row)=>String(row.METRICA||'').trim().toLowerCase()===String(label||'').trim().toLowerCase());
    return hit ? String(hit.VALORE||'').trim() : '';
  }

  // ─── MESSAGGI ─────────────────────────────────────────────────────────────

  function slugifyMessageKey(v){
    return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }

  function parseDrawDateLabel(v){
    const s=String(v||'').trim();
    if(!s) return '';
    const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m) return s;
    return `${m[3]}/${m[2]}/${m[1]}`;
  }

  // Estrae l'ultima riga CSV draws e crea un oggetto messaggio strutturato
  function extractLatestDrawMessage(drawRows){
    if(!Array.isArray(drawRows) || !drawRows.length) return null;
    const row=drawRows[drawRows.length-1]||{};
    const nums=[row.n1,row.n2,row.n3,row.n4,row.n5,row.n6].map((v)=>String(v||'').trim()).filter(Boolean);
    const extras=[row.jolly,row.superstar].map((v)=>String(v||'').trim()).filter(Boolean);
    const dateLabel=parseDrawDateLabel(row.data||row.date||'');
    const contest=String(row.concorso||row.contest||'').trim();
    const headlineParts=[];
    if(dateLabel) headlineParts.push(dateLabel);
    if(contest) headlineParts.push(`concorso ${contest}`);
    return {
      key:`draw-${dateLabel||contest||'latest'}-${nums.join('-')}`,
      tag:'DRAW',
      time:'nuova',
      title:`Nuova estrazione${headlineParts.length ? ` ${headlineParts.join(' · ')}` : ''}`,
      body:`Combinazione acquisita: ${nums.join(' ')}${extras.length ? ` · Jolly/SuperStar ${extras.join(' ')}` : ''}. Dataset storico e moduli statistici pronti al refresh.`,
      href:'pages/storico-estrazioni/',
      cta:'Apri Archivio',
    };
  }

  window.SECC_DATA_UTILS = Object.freeze({
    normBasePath,
    resolveCardImage,
    prettyPathLabel,
    csvSplit,
    parseCsvRows,
    readMetricValue,
    slugifyMessageKey,
    parseDrawDateLabel,
    extractLatestDrawMessage
  });
})();
