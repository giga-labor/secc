// glass-comms.js — Glass page overlay + pannello COMMS messaggi
// Espone window.SECC_GLASS — richiede init() prima dell'uso.
// Dipende da: window.SECC_DATA_UTILS, window.SECC_GUIDE, window.SECC_EMBEDDED_PAGE (opzionale)
(function(){
  'use strict';

  // ─── COSTANTI ─────────────────────────────────────────────────────────────
  const MSG_READ_LS_KEY = 'secc_messages_read_v1';
  const MSG_SEQ_LS_KEY  = 'secc_message_seq_v1';

  // ─── STATO PRIVATO ────────────────────────────────────────────────────────
  // DOM refs — valorizzati in init()
  let glassPageEl, glassBackEl, glassNameEl, glassCloseEl;
  let glassFrameEl, glassMessagesEl, msgGridEl, commMailEl;

  let glassOpen      = false;
  let glassStateStack = [];
  let msgCards       = [];
  let msgFeed        = [];
  let externalLinkHandler = null;

  // ─── UTILITY LOCALE ────────────────────────────────────────────────────────
  function _normalizeKey(v){
    return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }

  // ─── PERSISTENZA MESSAGGI ─────────────────────────────────────────────────
  function loadReadMessages(){
    try{
      const raw=localStorage.getItem(MSG_READ_LS_KEY);
      const arr=raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr.map((v)=>String(v)) : []);
    }catch(_e){ return new Set(); }
  }
  function saveReadMessages(set){
    try{ localStorage.setItem(MSG_READ_LS_KEY, JSON.stringify(Array.from(set))); }catch(_e){}
  }

  // Assegna ID sequenziali stabili ai messaggi (per tracking "letto")
  function loadMessageSeqState(){
    try{
      const raw=localStorage.getItem(MSG_SEQ_LS_KEY);
      const parsed=raw ? JSON.parse(raw) : null;
      const map=(parsed && typeof parsed.map==='object' && parsed.map) ? parsed.map : {};
      const next=Math.max(1, Number(parsed?.next||1)|0);
      return { map:{...map}, next };
    }catch(_e){ return { map:{}, next:1 }; }
  }
  function saveMessageSeqState(state){
    try{ localStorage.setItem(MSG_SEQ_LS_KEY, JSON.stringify(state)); }catch(_e){}
  }
  function allocateMessageIds(items){
    const state=loadMessageSeqState();
    items.forEach((item)=>{
      const key=String(item.key||'').trim();
      if(!key) return;
      if(!state.map[key]){
        state.map[key]='0x'+String(state.next).toUpperCase(16).padStart(4,'0');
        state.next += 1;
      }
      item.id=state.map[key];
    });
    saveMessageSeqState(state);
    return items;
  }

  // ─── RENDER FEED ──────────────────────────────────────────────────────────
  function syncMessageUnreadState(){
    const readSet=loadReadMessages();
    let unread=0;
    msgCards.forEach((card)=>{
      const id=String(card.dataset.messageId||'');
      const isUnread = !id || !readSet.has(id);
      card.classList.toggle('is-unread', isUnread);
      if(isUnread) unread++;
    });
    if(window.SECC_HUD && typeof window.SECC_HUD.setUnreadMessages==='function'){
      window.SECC_HUD.setUnreadMessages(unread);
    }
  }
  function markMessagesSeen(){
    const readSet=loadReadMessages();
    msgCards.forEach((card)=>{
      const id=String(card.dataset.messageId||'');
      if(id) readSet.add(id);
    });
    saveReadMessages(readSet);
    syncMessageUnreadState();
  }
  function refreshMsgCardsRef(){
    msgCards = msgGridEl ? Array.from(msgGridEl.querySelectorAll('.msgCard[data-message-id]')) : [];
  }
  function buildMessageCard(item){
    const action = item.href
      ? `<button class="msgAction" type="button" data-message-link="${item.href}" data-message-label="${String(item.cta||item.title||'Apri').replace(/"/g,'&quot;')}">${item.cta||'Apri'}</button>`
      : '';
    return [
      `<article class="msgCard is-unread" data-message-id="${item.id}" data-message-key="${item.key}">`,
      `<div class="msgMeta"><span class="tag">${item.tag}</span><span class="time">${item.time}</span><span class="msgId">${item.id}</span></div>`,
      `<h3>${item.title}</h3>`,
      `<p>${item.body}</p>`,
      action,
      `</article>`
    ].join('');
  }
  function renderMessageFeed(items){
    msgFeed = Array.isArray(items) ? items.slice() : [];
    if(msgGridEl) msgGridEl.innerHTML = msgFeed.map(buildMessageCard).join('');
    refreshMsgCardsRef();
    syncMessageUnreadState();
  }

  // ─── CARICAMENTO COMMS ────────────────────────────────────────────────────
  async function loadCommsMessages(){
    const DU = window.SECC_DATA_UTILS || {};
    const parseCsvRows           = DU.parseCsvRows           || (()=>[]);
    const extractLatestDrawMsg   = DU.extractLatestDrawMessage|| (()=>null);
    const readMetricValue        = DU.readMetricValue         || (()=>'');
    const normBasePath           = DU.normBasePath            || ((p)=>p);
    const slugifyMessageKey      = DU.slugifyMessageKey       || ((v)=>v);

    const items=[];
    try{
      const [drawRes, cardsRes] = await Promise.all([
        fetch('archives/draws/draws.csv', { cache:'no-store' }),
        fetch('data/cards-index.json',    { cache:'no-store' })
      ]);
      const drawRows = drawRes.ok ? parseCsvRows(await drawRes.text()) : [];
      const drawMsg  = extractLatestDrawMsg(drawRows);
      if(drawMsg) items.push(drawMsg);

      const cards = cardsRes.ok ? await cardsRes.json() : [];
      const algoCards = Array.isArray(cards)
        ? cards.filter((card)=>String(card?.page||'').replace(/\\/g,'/').includes('pages/algoritmi/algs/'))
        : [];

      const algoMetrics = await Promise.all(algoCards.map(async(card)=>{
        const base=normBasePath(card.cardBase||card.page||'');
        if(!base) return null;
        try{
          const metricsRes=await fetch(`${base}out/metrics-db.csv`, { cache:'no-store' });
          if(!metricsRes.ok) return null;
          const text=await metricsRes.text();
          const twoHitExact   = Number(readMetricValue(text,'Con 2 hit')||0);
          const threeHitExact = Number(readMetricValue(text,'Con 3 hit')||0);
          const fourHitExact  = Number(readMetricValue(text,'Con 4 hit')||0);
          const hitRate2   = readMetricValue(text,'Hit rate >= 2');
          const lastCalc   = readMetricValue(text,'Ultimo concorso calcolato');
          const nextContest= readMetricValue(text,'Concorso successivo stimato');
          const nextSix    = readMetricValue(text,'Sestina proposta (prossimo concorso)');
          const score=(twoHitExact||0) + (threeHitExact||0)*10 + (fourHitExact||0)*100;
          if(score < 2) return null;
          return {
            key:`algo-${slugifyMessageKey(card.id||card.title)}-${lastCalc||card.lastUpdated||'current'}-${score}`,
            tag:'ALGO',
            time:String(card.lastUpdated||'update').trim() || 'update',
            title:`${String(card.title||card.id||'Algoritmo').trim()}: storico con >=2 hit`,
            body:`Storico validato: ${twoHitExact} concorsi con 2 hit${threeHitExact ? `, ${threeHitExact} con 3 hit` : ''}${fourHitExact ? `, ${fourHitExact} con 4 hit` : ''}. Hit rate >=2 ${hitRate2 || 'n/d'}${nextContest && nextSix ? ` · Prossimo ${nextContest}: ${nextSix}` : ''}.`,
            href:base,
            cta:'Entra nell\'algoritmo',
            score,
          };
        }catch(_e){ return null; }
      }));

      algoMetrics
        .filter(Boolean)
        .sort((a,b)=> (b.score-a.score) || String(b.time).localeCompare(String(a.time)))
        .slice(0, 2)
        .forEach((item)=>items.push(item));
    }catch(_e){}

    items.push({
      key:'guide-archive-to-models',
      tag:'GUIDE', time:'ora',
      title:'Parti da Archivio, poi confronta i modelli',
      body:'La nuova estrazione cambia frequenze, ritardi e ranking. Apri lo storico per il contesto, poi passa agli algoritmi per vedere chi reagisce meglio.',
      href:'pages/storico-estrazioni/', cta:'Apri il percorso'
    });
    items.push({
      key:'guide-statistics-context',
      tag:'STAT', time:'focus',
      title:'Leggi prima il segnale, poi il modello',
      body:'Le statistiche mostrano il contesto numerico; gli algoritmi mostrano come quel contesto viene interpretato. E\` il passaggio piu\` utile per navigare il sito.',
      href:'pages/analisi-statistiche/', cta:'Apri Statistiche'
    });

    const finalItems = allocateMessageIds(items.length ? items : [{
      key:'fallback-feed-empty',
      tag:'INFO', time:'sync',
      title:'Feed in aggiornamento',
      body:'Nessuna nuova estrazione o segnale algoritmico disponibile in questo momento.'
    }]);
    renderMessageFeed(finalItems);
  }

  // ─── GLASS PAGE ───────────────────────────────────────────────────────────
  function _applyEmbeddedMode(iframe){
    if(!iframe) return;
    let doc=null;
    try{ doc=iframe.contentDocument || iframe.contentWindow?.document || null; }catch(_e){ return; }
    if(!doc || !doc.documentElement) return;
    // Usa il modulo esterno se disponibile
    if(window.SECC_EMBEDDED_PAGE && typeof window.SECC_EMBEDDED_PAGE.applyToDocument==='function'){
      window.SECC_EMBEDDED_PAGE.applyToDocument(doc);
    }
  }

  function renderGlassState(state){
    if(!glassPageEl || !glassFrameEl) return;
    const s=state && typeof state==='object' ? state : null;
    if(!s) return;
    glassOpen=true;
    glassPageEl.classList.add('on');
    glassPageEl.setAttribute('aria-hidden','false');
    if(s.type==='messages' || s.type==='feed'){
      glassNameEl.textContent=(s.type==='feed' ? String(s.title||'Feed') : 'Messaggi');
      glassPageEl.classList.add('messages-mode');
      glassFrameEl.style.display='none';
      glassFrameEl.src='about:blank';
      if(glassMessagesEl){
        glassMessagesEl.classList.add('on');
        glassMessagesEl.setAttribute('aria-hidden','false');
      }
      if(s.type==='messages') markMessagesSeen();
      return;
    }
    const url=String(s.url||'');
    const label=String(s.label||'Pagina');
    glassNameEl.textContent=label;
    glassPageEl.classList.remove('messages-mode');
    if(glassMessagesEl){
      glassMessagesEl.classList.remove('on');
      glassMessagesEl.setAttribute('aria-hidden','true');
    }
    glassFrameEl.style.display='';
    if(glassFrameEl.src!==url) glassFrameEl.src=url;
  }

  function openGlassPage(url, label){
    if(!glassPageEl || !glassFrameEl) return;
    const u=String(url||'');
    const l=String(label||'Pagina');
    glassStateStack.push({ type:'page', url:u, label:l });
    renderGlassState(glassStateStack[glassStateStack.length-1]);
    // Apri context guide al primo accesso a un oggetto
    const k=_normalizeKey(u || l);
    if(k && window.SECC_GUIDE && typeof window.SECC_GUIDE.tryOpenContext==='function'){
      const ctxKey=`obj:${k}`;
      setTimeout(()=>{
        SECC_GUIDE.tryOpenContext(ctxKey, ()=>
          (typeof SECC_GUIDE.buildObjectSteps==='function')
            ? SECC_GUIDE.buildObjectSteps(l,u)
            : []
        );
      }, 120);
    }
  }

  function openMessagesPanel(){
    if(!glassPageEl || !glassFrameEl || !glassMessagesEl) return;
    glassStateStack.push({ type:'messages' });
    renderGlassState(glassStateStack[glassStateStack.length-1]);
  }
  function openFeedPanel(title, items){
    if(!glassPageEl || !glassFrameEl || !glassMessagesEl) return;
    const arr=Array.isArray(items) ? items : [];
    renderMessageFeed(allocateMessageIds(arr));
    glassStateStack.push({ type:'feed', title:String(title||'Feed') });
    renderGlassState(glassStateStack[glassStateStack.length-1]);
  }

  function closeGlassPage(){
    if(!glassPageEl || !glassFrameEl) return;
    if(glassStateStack.length>1){
      glassStateStack.pop();
      renderGlassState(glassStateStack[glassStateStack.length-1]);
      return;
    }
    glassStateStack.length=0;
    glassOpen=false;
    glassPageEl.classList.remove('messages-mode');
    glassPageEl.classList.remove('on');
    glassPageEl.setAttribute('aria-hidden','true');
    if(glassMessagesEl){
      glassMessagesEl.classList.remove('on');
      glassMessagesEl.setAttribute('aria-hidden','true');
    }
    glassFrameEl.style.display='';
    // Pulisce l'iframe dopo l'animazione di chiusura (libera CPU)
    setTimeout(()=>{ if(!glassOpen) glassFrameEl.src='about:blank'; }, 250);
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────
  function init(){
    // DOM refs
    glassPageEl     = document.getElementById('glassPage');
    glassBackEl     = document.getElementById('glassBack');
    glassNameEl     = document.getElementById('glassName');
    glassCloseEl    = document.getElementById('glassClose');
    glassFrameEl    = document.getElementById('glassFrame');
    glassMessagesEl = document.getElementById('glassMessages');
    msgGridEl       = document.getElementById('msgGrid');
    commMailEl      = document.getElementById('commMail');

    // Event listeners
    if(msgGridEl){
      msgGridEl.addEventListener('click', (ev)=>{
        const btn=ev.target && ev.target.closest ? ev.target.closest('[data-message-link]') : null;
        if(!btn) return;
        const href=String(btn.dataset.messageLink||'').trim();
        if(!href) return;
        const label=String(btn.dataset.messageLabel||'Pagina').trim() || 'Pagina';
        if(typeof externalLinkHandler==='function'){
          try{
            if(externalLinkHandler({ href, label, button:btn })===true) return;
          }catch(_e){}
        }
        openGlassPage(href, label);
      });
    }
    if(glassBackEl)  glassBackEl.addEventListener('click', closeGlassPage);
    if(glassCloseEl) glassCloseEl.addEventListener('click', closeGlassPage);
    if(glassFrameEl) glassFrameEl.addEventListener('load', ()=>_applyEmbeddedMode(glassFrameEl));
    if(commMailEl)   commMailEl.addEventListener('click', openMessagesPanel);

    // Messaggio placeholder iniziale mentre i dati reali vengono caricati
    renderMessageFeed(allocateMessageIds([
      {
        key:'boot-draw-feed', tag:'DRAW', time:'sync',
        title:'Feed estrazioni in sync',
        body:'Recupero ultima estrazione e confronto con i moduli attivi.',
        href:'pages/storico-estrazioni/', cta:'Apri Archivio'
      },
      {
        key:'boot-algo-feed', tag:'ALGO', time:'sync',
        title:'Feed algoritmi in sync',
        body:'Verifica locale degli algoritmi con almeno 2 hit nello storico validato.',
        href:'pages/algoritmi/', cta:'Apri Algoritmi'
      }
    ]));

    // Carica i messaggi reali in background
    loadCommsMessages();
  }

  // ─── API PUBBLICA ─────────────────────────────────────────────────────────
  window.SECC_GLASS = Object.freeze({
    init,
    isOpen:             ()=>glassOpen,
    openPage:           openGlassPage,
    openMessages:       openMessagesPanel,
    openFeed:           openFeedPanel,
    close:              closeGlassPage,
    renderFeed:         renderMessageFeed,
    allocateMessageIds,
    loadComms:          loadCommsMessages,
    setLinkHandler:     (fn)=>{ externalLinkHandler=(typeof fn==='function') ? fn : null; }
  });
})();
