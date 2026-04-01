// guide-overlay.js — Sistema di onboarding/guida interattiva
// Espone window.SECC_GUIDE — richiede init(ctx) prima dell'uso.
//
// ctx (iniettato via SECC_GUIDE.init) deve fornire:
//   getCoordEditOpen()  → Boolean
//   getGlassOpen()      → Boolean
//   getPhase()          → String ('done'|...)
//   getMenuTrans()      → Object|null
//   getNavTrans()       → Object|null
//   getAutoPilot()      → Object|null
//   getMenuId()         → String
//   getActiveNodeId()   → String|null
//   resolveCurrentSoId()→ String|null
//   clearKeys()         → void (azzera l'oggetto keys per evitare tasto bloccato)
//   showHudKeyTip(tip)  → void
//   hideHudKeyTip()     → void
//   hudKeyTips          → Array (HUD_KEY_TIPS)
//   soLabels            → Object (SO_LABELS)
//   startNavTravel(id)  → void
//   getUserConfidenceSummary() → Object|null
//   hudModeNavsEl       → HTMLElement|null
(function(){
  'use strict';

  // ─── COSTANTI ─────────────────────────────────────────────────────────────
  const GUIDE_LS_KEY         = 'secc_onboarding_hidden_v1';
  const GUIDE_STATE_LS_KEY   = 'secc_onboarding_state_v2';
  const GUIDE_BOOT_ALWAYS_VISITS = 3;

  const GUIDE_KEY_LABELS = Object.freeze({
    w:'W', a:'A', s:'S', d:'D', q:'Q', e:'E',
    mouse:'Tieni premuto il mouse e muovi',
    arrows:'Frecce',
    ctrl:'Ctrl',
    alt:'Alt',
    ctrlalt:'Ctrl+Alt',
    navs:'Pulsante NAVS',
    comms:'Pulsante COMMS',
    soselect:'Menu SISTEMI ORBITANTI'
  });
  const GUIDE_TOPICS = Object.freeze([
    { id:'all',        label:'Percorso completo' },
    { id:'confidence', label:'Livello confidenza' },
    { id:'where',      label:'Dove mi trovo' },
    { id:'keys',       label:'Tasti e movimento' },
    { id:'navcomms',   label:'Uso NAVS e COMMS' },
    { id:'travel',     label:'Viaggio tra SO' },
    { id:'coords',     label:'Coordinate destinazione' },
    { id:'return',     label:'Ritorno alla Home' },
    { id:'so-arrival', label:'Arrivo su un SO' },
    { id:'page-object',label:'Uso pagine e oggetti' },
    { id:'navmode',    label:'Modalita navigazione' }
  ]);
  const GUIDE_TOPIC_GROUPS = Object.freeze([
    {
      label:'Panoramica',
      items:[ GUIDE_TOPICS[0], GUIDE_TOPICS[1] ]
    },
    {
      label:'Orientamento',
      items:[ GUIDE_TOPICS[2], GUIDE_TOPICS[7] ]
    },
    {
      label:'Comandi',
      items:[ GUIDE_TOPICS[3], GUIDE_TOPICS[4] ]
    },
    {
      label:'Navigazione',
      items:[ GUIDE_TOPICS[5], GUIDE_TOPICS[6], GUIDE_TOPICS[7], GUIDE_TOPICS[10] ]
    },
    {
      label:'Pagine e contenuti',
      items:[ GUIDE_TOPICS[9] ]
    }
  ]);

  const GUIDE_STEPS = [
    {
      title:'Benvenuto',
      body:'Sei nel punto di partenza. In pochi passi impari come muoverti.',
      note:'NOTA IMPORTANTE: DARH (Distanza, Alto/Basso, Direzione rispetto alla Home) e il punto 0. E il riferimento unico usato per posizionare tutti gli oggetti nell universo di ControlChaos.',
      bullets:[
        'Guarda il riquadro a sinistra.',
        'D = distanza: quanto sei lontano dal riferimento, misurato in UA.',
        'UA (Unita Astronomica): 1 UA = 149.597.870,7 KM = 92.955.807,3 miglia terrestri = 80.776.388,1 miglia nautiche.',
        'A = alto/basso: se sei piu in alto o piu in basso del riferimento.',
        'R = direzione: da che parte si trova il riferimento rispetto a te.',
        'Nel riquadro SOH i DAR sono riferiti al Sistema Orbitante della Homepage.',
        'Nel riquadro SOR i DAR sono riferiti all oggetto o SO agganciato.',
        'La scritta ControlChaos ti aiuta a orientarti.'
      ],
      hotkeys:[],
      focus:['#coordCell','#sorCell','#soCurrent']
    },
    {
      title:'Tasti base',
      body:'Usa questi tasti per muoverti e guardarti intorno.',
      bullets:[
        '[W]: vai avanti.',
        '[S]: vai indietro.',
        '[A]: vai a sinistra.',
        '[D]: vai a destra.',
        '[Q]: sali. [E]: scendi.',
        'Tieni premuto il tasto sinistro del mouse e muovi il mouse per guardarti intorno.',
        'In alternativa usa le [Frecce] della tastiera per guardarti intorno.',
        '[Ctrl]+[Freccia destra/sinistra]: ruota la camera in senso orario/antiorario.',
        '[Ctrl]: velocita alta. [Alt]: velocita molto alta. [Ctrl]+[Alt]: velocita massima.'
      ],
      hotkeys:['w','a','s','d','q','e','mouse','arrows','ctrl','alt'],
      focus:['[data-tip-key="w"]','[data-tip-key="q"]','[data-tip-key="mouse"]','[data-tip-key="up"]','[data-tip-key="ctrl"]','[data-tip-key="alt"]']
    },
    {
      title:'NAVS e COMMS',
      body:'Usa due pulsanti semplici: NAVS e COMMS.',
      bullets:[
        'NAVS: serve per muoverti nello spazio.',
        'COMMS: mostra messaggi, novita e risultati.',
        'Puoi cambiare tra NAVS e COMMS quando vuoi.',
        'Se non vuoi muoverti nello spazio, puoi aprire le pagine direttamente.',
        'Clicca il titolo ControlChaos per scegliere la modalita: Full Explorer, Half Explorer o Normale.'
      ],
      hotkeys:[],
      focus:['#hudModeNavs','#hudModeComms','#commMail']
    },
    {
      title:'Vai in un altro SO',
      body:'Apri il menu SISTEMI ORBITANTI e scegli dove andare.',
      bullets:[
        'Per iniziare scegli SO Archivio o SO Algoritmi.',
        'Durante il viaggio guarda la percentuale: indica quanto manca.',
        'Quando arrivi, la pagina giusta si apre da sola.',
        'Con Half Explorer usi teletrasporto con fade rapido.',
        'Con Normale apri direttamente le pagine glass.'
      ],
      hotkeys:[],
      focus:['#soSelect','#travelPct','#travelBoost']
    },
    {
      title:'Coordinate destinazione',
      body:'Puoi impostare una destinazione manuale con il pannello coordinate.',
      bullets:[
        'Clicca il riquadro coordinate a sinistra per aprire il pannello.',
        'Inserisci [D], [A], [R] e premi Vai.',
        'Scopo: raggiungere un punto preciso nello spazio senza scegliere un SO dal menu.'
      ],
      hotkeys:[],
      openCoordEdit:true,
      focus:['#coordCell']
    },
    {
      title:'Ritorno alla Home',
      body:'Ultimo passo: torna alla Home (SOH) con il pulsante qui sotto.',
      bullets:[
        'Quando torni alla Home puoi scegliere subito dove andare.',
        'Puoi riaprire questa guida quando vuoi.'
      ],
      hotkeys:[],
      focus:['#soSelect','#soCurrent'],
      action:{ id:'travel-soh', label:'Vai alla Home (SOH)' }
    }
  ];

  // ─── STATO PRIVATO ────────────────────────────────────────────────────────
  let ctx = null;

  // DOM refs — valorizzati in init()
  let guideOverlayEl, guideBackLayerEl, guideSpotEl, guidePanelEl, guideLinkEl;
  let guideTitleEl, guideBodyEl, guideListEl, guideNoteEl, guideKeysEl;
  let guideStepEl, guidePrevEl, guideNextEl, guideCloseEl;
  let guideActionEl, guideDismissEl;

  // Stato runtime
  let guideOpen         = false;
  let guideStepIndex    = 0;
  let guideActiveSteps  = GUIDE_STEPS;
  let guideFocusEls     = [];
  let guideTipTimer     = 0;
  let guideTipCursor    = 0;
  let guideLastDockedId = '';
  let guidePendingContext = null;
  let guideState        = { visits:0, seen:{} };
  let guideOpenedCoordEdit = false;

  // ─── PERSISTENZA ─────────────────────────────────────────────────────────
  function _loadGuideState(){
    try{
      const raw=localStorage.getItem(GUIDE_STATE_LS_KEY);
      const parsed=raw ? JSON.parse(raw) : null;
      return {
        visits: Math.max(0, Number(parsed?.visits)||0),
        seen: (parsed && parsed.seen && typeof parsed.seen==='object') ? {...parsed.seen} : {}
      };
    }catch(_e){ return { visits:0, seen:{} }; }
  }
  function saveGuideState(){
    try{ localStorage.setItem(GUIDE_STATE_LS_KEY, JSON.stringify(guideState)); }catch(_e){}
  }
  function bumpGuideVisitCount(){
    const mark='secc_onboarding_visit_mark_v2';
    try{
      if(sessionStorage.getItem(mark)==='1') return;
      sessionStorage.setItem(mark,'1');
    }catch(_e){}
    guideState.visits=Math.max(0, Number(guideState.visits)||0)+1;
    saveGuideState();
  }
  function hasGuideContextSeen(key){
    return Boolean(guideState && guideState.seen && guideState.seen[String(key||'')]);
  }
  function markGuideContextSeen(key){
    const k=String(key||'').trim();
    if(!k) return;
    if(!guideState.seen) guideState.seen={};
    guideState.seen[k]=1;
    saveGuideState();
  }
  function baseGuideIsMandatory(){
    return (Number(guideState?.visits)||0) <= GUIDE_BOOT_ALWAYS_VISITS;
  }
  function normalizeGuideKey(v){
    return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }
  function guideIsDismissed(){
    try{ return localStorage.getItem(GUIDE_LS_KEY)==='1'; }catch(_e){ return false; }
  }
  function setGuideDismissed(v){
    try{ localStorage.setItem(GUIDE_LS_KEY, v ? '1' : '0'); }catch(_e){}
  }

  // ─── FOCUS / SPOTLIGHT ───────────────────────────────────────────────────
  function clearGuideFocus(){
    guideFocusEls.forEach((el)=>{ try{ el.classList.remove('guide-focus'); }catch(_e){} });
    guideFocusEls=[];
  }
  function clearGuideIsolation(){
    document.querySelectorAll('.guide-isolate').forEach((el)=>{
      el.classList.remove('guide-spot');
    });
    if(guideBackLayerEl) guideBackLayerEl.style.setProperty('--hole-r','0px');
    if(guideSpotEl){
      guideSpotEl.classList.remove('is-on');
      guideSpotEl.style.left='0px';
      guideSpotEl.style.top='0px';
      guideSpotEl.style.width='0px';
      guideSpotEl.style.height='0px';
    }
    if(guideLinkEl){
      guideLinkEl.classList.remove('is-on');
      guideLinkEl.style.width='0px';
    }
  }
  function updateGuideSpotlight(el){
    if(!(el instanceof HTMLElement) || !guideBackLayerEl) return;
    const r=el.getBoundingClientRect();
    if(!(r.width>0 && r.height>0)) return;
    const cx=r.left + r.width*0.5;
    const cy=r.top + r.height*0.5;
    const rad=Math.max(86, Math.hypot(r.width, r.height)*0.72);
    guideBackLayerEl.style.setProperty('--hole-x', `${Math.round(cx)}px`);
    guideBackLayerEl.style.setProperty('--hole-y', `${Math.round(cy)}px`);
    guideBackLayerEl.style.setProperty('--hole-r', `${Math.round(rad)}px`);
    if(guideSpotEl){
      guideSpotEl.style.left=`${Math.round(r.left-6)}px`;
      guideSpotEl.style.top=`${Math.round(r.top-6)}px`;
      guideSpotEl.style.width=`${Math.round(r.width+12)}px`;
      guideSpotEl.style.height=`${Math.round(r.height+12)}px`;
      guideSpotEl.classList.add('is-on');
    }
  }
  function updateGuideConnector(){
    if(!guideLinkEl || !guidePanelEl || !guideFocusEls.length){
      if(guideLinkEl) guideLinkEl.classList.remove('is-on');
      return;
    }
    const target=guideFocusEls[0];
    if(!(target instanceof HTMLElement)) return;
    const tr=target.getBoundingClientRect();
    const pr=guidePanelEl.getBoundingClientRect();
    if(!(tr.width>0 && tr.height>0 && pr.width>0 && pr.height>0)){
      guideLinkEl.classList.remove('is-on');
      return;
    }
    const pcx=pr.left + pr.width*0.5;
    const pcy=pr.top + pr.height*0.5;
    const tcx=tr.left + tr.width*0.5;
    const tcy=tr.top + tr.height*0.5;
    function borderPointToward(rect, px, py){
      const cx=rect.left + rect.width*0.5;
      const cy=rect.top + rect.height*0.5;
      const hw=Math.max(1, rect.width*0.5);
      const hh=Math.max(1, rect.height*0.5);
      let dx=px-cx, dy=py-cy;
      if(Math.abs(dx)<1e-6 && Math.abs(dy)<1e-6) dx=1;
      const s=Math.max(Math.abs(dx)/hw, Math.abs(dy)/hh);
      const k=(s>1e-6)?(1/s):1;
      return { x:cx + dx*k, y:cy + dy*k };
    }
    const p0=borderPointToward(pr, tcx, tcy); // bordo tip verso target
    const p1=borderPointToward(tr, pcx, pcy); // bordo target verso tip
    const dx=p1.x-p0.x;
    const dy=p1.y-p0.y;
    const len=Math.hypot(dx,dy);
    if(len<8){
      guideLinkEl.classList.remove('is-on');
      return;
    }
    const pad=2;
    const sx=p0.x + (dx/len)*pad;
    const sy=p0.y + (dy/len)*pad;
    const lineLen=Math.max(0, len - pad*2);
    const ang=Math.atan2(dy,dx)*180/Math.PI;
    guideLinkEl.style.left=`${Math.round(sx)}px`;
    guideLinkEl.style.top=`${Math.round(sy)}px`;
    guideLinkEl.style.width=`${Math.round(lineLen)}px`;
    guideLinkEl.style.transform=`rotate(${ang.toFixed(2)}deg)`;
    guideLinkEl.classList.add('is-on');
  }
  function gClamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function cssPx(name, fallback){
    const raw=getComputedStyle(document.documentElement).getPropertyValue(name);
    const v=parseFloat(raw);
    return Number.isFinite(v) ? v : (fallback||0);
  }
  function getGuideSafeRect(){
    const vw=window.innerWidth||0;
    const vh=window.innerHeight||0;
    const topHud=document.querySelector('header.hud, .hud');
    const rightRail=document.querySelector('.ad-rail--right:not([hidden]), [data-ad-rail="right"]:not([hidden]), [data-cc-ad-container="right"]:not([hidden])');
    const bottomAd=document.querySelector('.bottom-ad:not([hidden]), [data-bottom-ad="true"]:not([hidden]), [data-cc-ad-container="bottom"]:not([hidden])');
    const hr=(topHud && typeof topHud.getBoundingClientRect==='function') ? topHud.getBoundingClientRect() : null;
    const rr=(rightRail && typeof rightRail.getBoundingClientRect==='function') ? rightRail.getBoundingClientRect() : null;
    const br=(bottomAd && typeof bottomAd.getBoundingClientRect==='function') ? bottomAd.getBoundingClientRect() : null;
    const adsRailW=Math.max(0, cssPx('--ads-rail-w', 260));
    const top=Math.max(0, Math.min(vh, (hr && hr.height>0) ? (hr.bottom + 8) : 78));
    const rrLeft=(rr && rr.width>0) ? Math.max(0, Math.min(vw, rr.left)) : (vw - adsRailW);
    const right=(rrLeft>0 && rrLeft<=vw) ? rrLeft : Math.max(0, vw-adsRailW);
    const bottom=(br && br.height>0) ? Math.max(0, Math.min(vh, br.top)) : vh;
    return { left:0, top, right, bottom, width:Math.max(1,right), height:Math.max(1,bottom-top) };
  }
  function rectIntersects(a,b){
    if(!a || !b) return false;
    return !(a.right<=b.left || a.left>=b.right || a.bottom<=b.top || a.top>=b.bottom);
  }
  function clampPanelRect(x, y, w, h, safe, margin){
    const minX=safe.left + margin;
    const maxX=Math.max(minX, safe.right - margin - w);
    const minY=safe.top + margin;
    const maxY=Math.max(minY, safe.bottom - margin - h);
    return {
      x:gClamp(x, minX, maxX),
      y:gClamp(y, minY, maxY)
    };
  }
  function resolveGuidePanelPos(safe, panelW, panelH){
    const margin=14;
    const center=clampPanelRect(
      safe.left + safe.width*0.5 - panelW*0.5,
      safe.top + safe.height*0.5 - panelH*0.5,
      panelW, panelH, safe, margin
    );
    const target=(guideFocusEls && guideFocusEls.length && guideFocusEls[0] instanceof HTMLElement)
      ? guideFocusEls[0]
      : null;
    if(!target) return center;
    const tr=target.getBoundingClientRect();
    if(!(tr.width>0 && tr.height>0)) return center;
    const avoid=10;
    const targetBox={
      left:tr.left-avoid, top:tr.top-avoid,
      right:tr.right+avoid, bottom:tr.bottom+avoid
    };
    const candidates=[
      { x: targetBox.right + 12, y: tr.top + tr.height*0.5 - panelH*0.5 },
      { x: targetBox.left - 12 - panelW, y: tr.top + tr.height*0.5 - panelH*0.5 },
      { x: tr.left + tr.width*0.5 - panelW*0.5, y: targetBox.bottom + 12 },
      { x: tr.left + tr.width*0.5 - panelW*0.5, y: targetBox.top - 12 - panelH },
      { x: center.x, y: center.y }
    ].map((c)=>{
      const p=clampPanelRect(c.x,c.y,panelW,panelH,safe,margin);
      const box={ left:p.x, top:p.y, right:p.x+panelW, bottom:p.y+panelH };
      const overlap=rectIntersects(box, targetBox);
      const dx=(p.x+panelW*0.5) - (tr.left+tr.width*0.5);
      const dy=(p.y+panelH*0.5) - (tr.top+tr.height*0.5);
      const dist=Math.hypot(dx,dy);
      const score=(overlap ? -1e6 : 0) + dist;
      return { x:p.x, y:p.y, score };
    });
    candidates.sort((a,b)=>b.score-a.score);
    return candidates[0] || center;
  }
  function positionGuidePanel(){
    if(!guideOpen || !guidePanelEl) return;
    const safe=getGuideSafeRect();
    const margin=14;
    const safeW=Math.max(140, safe.width - margin*2);
    const idealW=Math.max(360, safe.width*0.86);
    const panelW=Math.min(920, idealW, safeW);
    guidePanelEl.style.width=`${Math.round(panelW)}px`;
    const preferredH=Math.min(700, safe.height*0.72);
    guidePanelEl.style.maxHeight=`${Math.max(240, preferredH)}px`;
    const panelRect=guidePanelEl.getBoundingClientRect();
    const panelH=Math.max(220, panelRect.height || Math.min(560, safe.height*0.68));
    const pos=resolveGuidePanelPos(safe, panelW, panelH);
    guidePanelEl.style.left=`${Math.round(pos.x + panelW*0.5)}px`;
    guidePanelEl.style.top=`${Math.round(pos.y + panelH*0.5)}px`;
    updateGuideConnector();
  }
  function applyGuideFocus(selectors){
    clearGuideFocus();
    clearGuideIsolation();
    if(!Array.isArray(selectors) || !selectors.length){
      document.body.classList.remove('guide-focus-mode');
      return;
    }
    document.body.classList.add('guide-focus-mode');
    selectors.forEach((sel)=>{
      if(!sel) return;
      const el=document.querySelector(String(sel));
      if(!(el instanceof HTMLElement)) return;
      el.classList.add('guide-focus');
      guideFocusEls.push(el);
      let cur=el;
      while(cur && cur!==document.body){
        if(cur.classList && cur.classList.contains('guide-isolate')) cur.classList.add('guide-spot');
        cur=cur.parentElement;
      }
    });
    if(guideFocusEls.length) updateGuideSpotlight(guideFocusEls[0]);
    positionGuidePanel();
  }
  function syncGuideCoordEdit(step){
    if(!ctx) return;
    const wantsOpen=Boolean(step && step.openCoordEdit);
    const isOpen=(typeof ctx.getCoordEditOpen==='function') ? Boolean(ctx.getCoordEditOpen()) : false;
    if(wantsOpen){
      if(!isOpen && typeof ctx.openCoordEdit==='function'){
        ctx.openCoordEdit();
        guideOpenedCoordEdit=true;
      }
      return;
    }
    if(guideOpenedCoordEdit && isOpen && typeof ctx.closeCoordEdit==='function'){
      ctx.closeCoordEdit();
    }
    guideOpenedCoordEdit=false;
  }

  // ─── TIP CYCLE (key hint durante guide step) ─────────────────────────────
  function stopGuideTipCycle(){
    if(guideTipTimer){ clearInterval(guideTipTimer); guideTipTimer=0; }
  }
  function runGuideTipCycle(step){
    stopGuideTipCycle();
    // During onboarding we keep all keyboard guidance inside the central tip
    // (simulated keyboard), so no floating HUD key tips should appear.
    if(ctx && typeof ctx.hideHudKeyTip==='function') ctx.hideHudKeyTip();
  }

  // ─── RENDER STEP ──────────────────────────────────────────────────────────
  function renderGuideAction(step){
    if(!guideActionEl) return;
    const act=step && step.action ? step.action : null;
    if(!act){
      guideActionEl.hidden=true;
      guideActionEl.textContent='Azione';
      guideActionEl.removeAttribute('data-guide-action');
      return;
    }
    guideActionEl.hidden=false;
    guideActionEl.textContent=String(act.label||'Azione');
    guideActionEl.dataset.guideAction=String(act.id||'');
  }
  function escHtml(v){
    return String(v||'').replace(/[&<>"']/g,(m)=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
  }
  function withInlineKeys(text){
    const src=String(text||'');
    // Only values explicitly wrapped in [ ... ] are rendered as keycaps.
    const parts=[];
    let last=0;
    const rx=/\[([^\]]+)\]/g;
    let m;
    while((m=rx.exec(src))!==null){
      if(m.index>last) parts.push(escHtml(src.slice(last, m.index)));
      parts.push(`<span class="g-inline-key">${escHtml(String(m[1]||'').trim())}</span>`);
      last=rx.lastIndex;
    }
    if(last<src.length) parts.push(escHtml(src.slice(last)));
    return parts.join('');
  }
  function keyHtml(label, hot, cls=''){
    return `<span class="gk-key${cls?` ${cls}`:''}${hot?' hot':''}">${escHtml(label)}</span>`;
  }
  function renderGuideKeys(step){
    if(!guideKeysEl) return;
    const modeOptions=Array.isArray(step?.modeOptions) ? step.modeOptions : null;
    if(modeOptions && modeOptions.length){
      const modeBtns=modeOptions.map((it, idx)=>{
        const id=String(it && it.id ? it.id : '').trim().toLowerCase();
        const label=String(it && it.label ? it.label : '').trim() || id || 'Modalita';
        if(!id) return '';
        const accent=(idx===0) ? ' guideBtn--accent' : '';
        return `<button type="button" class="guideBtn${accent}" data-guide-navmode="${escHtml(id)}">${escHtml(label)}</button>`;
      }).filter(Boolean);
      guideKeysEl.innerHTML=modeBtns.length ? `<div class="guideTopicMenu">${modeBtns.join('')}</div>` : '';
      return;
    }
    const topicGroups=Array.isArray(step?.topicGroups) ? step.topicGroups : null;
    if(topicGroups && topicGroups.length){
      const groupBlocks=topicGroups.map((grp)=>{
        const title=String(grp && grp.label ? grp.label : '').trim() || 'Sezione';
        const items=Array.isArray(grp?.items) ? grp.items : [];
        if(!items.length) return '';
        const btns=items.map((it)=>{
          const id=String(it && it.id ? it.id : '').trim().toLowerCase();
          const label=String(it && it.label ? it.label : '').trim() || id || 'Aiuto';
          if(!id) return '';
          const accent=(id==='all') ? ' guideBtn--accent' : '';
          return `<button type="button" class="guideBtn${accent}" data-guide-topic="${escHtml(id)}">${escHtml(label)}</button>`;
        }).filter(Boolean).join('');
        if(!btns) return '';
        return `<section class="guideTopicGroup"><h4 class="guideTopicHead">${escHtml(title)}</h4><div class="guideTopicButtons">${btns}</div></section>`;
      }).filter(Boolean);
      guideKeysEl.innerHTML=groupBlocks.length ? `<div class="guideTopicMenu">${groupBlocks.join('')}</div>` : '';
      return;
    }
    const topicMenu=Array.isArray(step?.topicMenu) ? step.topicMenu : null;
    if(topicMenu && topicMenu.length){
      const topicBtns=topicMenu.map((it, idx)=>{
        const id=String(it && it.id ? it.id : '').trim().toLowerCase();
        const label=String(it && it.label ? it.label : '').trim() || id || 'Aiuto';
        if(!id) return '';
        const accent=(idx===0) ? ' guideBtn--accent' : '';
        return `<button type="button" class="guideBtn${accent}" data-guide-topic="${escHtml(id)}">${escHtml(label)}</button>`;
      }).filter(Boolean);
      guideKeysEl.innerHTML=topicBtns.length ? `<div class="guideTopicMenu">${topicBtns.join('')}</div>` : '';
      return;
    }
    const hotkeys=Array.isArray(step?.hotkeys) ? step.hotkeys.map((k)=>String(k||'').toLowerCase()) : [];
    if(!hotkeys.length){ guideKeysEl.innerHTML=''; return; }

    const isHot=(k)=>hotkeys.includes(String(k).toLowerCase());
    const hasKbd=hotkeys.some((k)=>['q','w','e','a','s','d','ctrl','alt','arrows'].includes(k));
    const nonKbd=hotkeys.filter((k)=>!['q','w','e','a','s','d','ctrl','alt','arrows'].includes(k));

    const out=[];
    if(hasKbd){
      out.push('<div class="guideKeyboard" aria-label="Tastiera guida">');
      out.push('<div class="gk-row">');
      out.push(keyHtml('Tab', false, 'wide'));
      out.push(keyHtml('Q', isHot('q')));
      out.push(keyHtml('W', isHot('w')));
      out.push(keyHtml('E', isHot('e')));
      out.push(keyHtml('R', false));
      out.push(keyHtml('T', false));
      out.push(keyHtml('Y', false));
      out.push('</div>');

      out.push('<div class="gk-row">');
      out.push(keyHtml('Caps', false, 'wide'));
      out.push(keyHtml('A', isHot('a')));
      out.push(keyHtml('S', isHot('s')));
      out.push(keyHtml('D', isHot('d')));
      out.push(keyHtml('F', false));
      out.push(keyHtml('G', false));
      out.push(keyHtml('H', false));
      out.push('</div>');

      out.push('<div class="gk-row">');
      out.push(keyHtml('Ctrl', isHot('ctrl'), 'xwide'));
      out.push(keyHtml('Alt', isHot('alt'), 'wide'));
      out.push(keyHtml('Space', false, 'xwide'));
      out.push(keyHtml('←', isHot('arrows')));
      out.push(keyHtml('↑', isHot('arrows')));
      out.push(keyHtml('→', isHot('arrows')));
      out.push(keyHtml('↓', isHot('arrows')));
      out.push('</div>');
      out.push('</div>');
    }

    if(nonKbd.length){
      out.push('<div class="gk-nonkbd">');
      nonKbd.forEach((k)=>{
        const lbl=GUIDE_KEY_LABELS[k] || k.toUpperCase();
        out.push(`<span class="guideKey">${escHtml(lbl)}</span>`);
      });
      out.push('</div>');
    }
    guideKeysEl.innerHTML=out.join('');
  }
  function renderGuideStep(){
    if(!guideBodyEl || !guideListEl || !guideStepEl) return;
    const steps=(Array.isArray(guideActiveSteps) && guideActiveSteps.length) ? guideActiveSteps : GUIDE_STEPS;
    const step=steps[Math.max(0, Math.min(steps.length-1, guideStepIndex))];
    if(!step) return;
    if(guideTitleEl) guideTitleEl.textContent=step.title;
    guideBodyEl.innerHTML=withInlineKeys(step.body);
    guideListEl.innerHTML=(step.bullets||[]).map((it)=>`<li>${withInlineKeys(String(it||''))}</li>`).join('');
    if(guideNoteEl){
      const note=String(step.note||'').trim();
      if(note){
        guideNoteEl.hidden=false;
        guideNoteEl.innerHTML=withInlineKeys(note);
      }else{
        guideNoteEl.hidden=true;
        guideNoteEl.textContent='';
      }
    }
    renderGuideKeys(step);
    guideStepEl.textContent=`${String(guideStepIndex+1).padStart(2,'0')} / ${String(steps.length).padStart(2,'0')}`;
    if(guidePrevEl) guidePrevEl.disabled=(guideStepIndex<=0);
    if(guideNextEl) guideNextEl.textContent=(guideStepIndex>=steps.length-1) ? 'Inizia' : 'Avanti';
    if(guideDismissEl) guideDismissEl.hidden=(step && step.allowDismiss===false);
    syncGuideCoordEdit(step);
    renderGuideAction(step);
    applyGuideFocus(step.focus);
    runGuideTipCycle(step);
    requestAnimationFrame(()=>{
      positionGuidePanel();
      requestAnimationFrame(positionGuidePanel);
    });
  }

  // ─── OPEN / CLOSE ─────────────────────────────────────────────────────────
  function closeGuide(){
    if(!guideOverlayEl) return;
    guideOpen=false;
    stopGuideTipCycle();
    if(ctx && typeof ctx.hideHudKeyTip==='function') ctx.hideHudKeyTip();
    clearGuideFocus();
    clearGuideIsolation();
    syncGuideCoordEdit(null);
    document.body.classList.remove('guide-focus-mode');
    guideOverlayEl.classList.remove('on');
    guideOverlayEl.setAttribute('aria-hidden','true');
    if(guidePendingContext && guidePendingContext.key){
      const pending=guidePendingContext;
      guidePendingContext=null;
      setTimeout(()=>{
        const coordEditOpen=ctx ? ctx.getCoordEditOpen() : false;
        if(guideOpen || coordEditOpen || guideIsDismissed()) return;
        openGuide(true, pending.steps);
      }, 160);
    }else{
      guidePendingContext=null;
    }
  }

  function openGuide(force, stepsOverride){
    if(!guideOverlayEl) return;
    const isMandatory=baseGuideIsMandatory();
    if(!force && !isMandatory && guideIsDismissed()) return;
    guideOpen=true;
    if(ctx && typeof ctx.clearKeys==='function') ctx.clearKeys();
    guideActiveSteps=(Array.isArray(stepsOverride) && stepsOverride.length) ? stepsOverride : GUIDE_STEPS;
    guideStepIndex=0;
    renderGuideStep();
    guideOverlayEl.classList.add('on');
    guideOverlayEl.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>{
      positionGuidePanel();
      requestAnimationFrame(positionGuidePanel);
    });
  }

  function scheduleGuideOpen(){
    let tries=0;
    const tick=()=>{
      if(!baseGuideIsMandatory() && guideIsDismissed()) return;
      const glassOpen=ctx ? ctx.getGlassOpen() : false;
      const coordEditOpen=ctx ? ctx.getCoordEditOpen() : false;
      if(document.body.classList.contains('live') && !glassOpen && !coordEditOpen){
        openGuide(false);
        return;
      }
      if(tries<20){ tries++; setTimeout(tick, 300); }
    };
    setTimeout(tick, 900);
  }

  // ─── CONTEXT GUIDE (primo arrivo in un SO / oggetto) ─────────────────────
  function buildSoArrivalGuideSteps(soId){
    const soLabels=(ctx && ctx.soLabels) ? ctx.soLabels : {};
    const soLabel=soLabels[String(soId||'')] || `SO ${String(soId||'').toUpperCase()}`;
    return [{
      title:`Primo arrivo su ${soLabel}`,
      body:`Sei arrivato su ${soLabel}.`,
      bullets:[
        'Ora sei dentro questa area.',
        'Guarda il riquadro a sinistra per conferma.',
        'Nel riquadro SOR i valori DAR mostrano distanza, alto o basso, e direzione rispetto all oggetto o SO agganciato.',
        'Apri COMMS per leggere i messaggi utili.',
        'Per cambiare area, usa il menu SISTEMI ORBITANTI.'
      ],
      hotkeys:[],
      focus:['#soCurrent','#coordCell','#sorCell','#hudModeComms','#soSelect']
    }];
  }

  function buildObjectGuideSteps(label, url){
    const cleanLabel=String(label||'Oggetto').trim() || 'Oggetto';
    const path=String(url||'').trim();
    return [{
      title:`Primo accesso: ${cleanLabel}`,
      body:'Hai aperto una pagina del sito.',
      bullets:[
        'Leggi la pagina con calma.',
        'Premi Chiudi per tornare allo spazio.',
        'Puoi usare il sito anche senza fare viaggi nello spazio.',
        path ? `Pagina aperta: ${path}` : 'Pagina aperta dal collegamento scelto.'
      ],
      hotkeys:[],
      focus:['#glassPanel','#glassClose']
    }];
  }
  function buildWhereGuideSteps(){
    const base=GUIDE_STEPS[0];
    const cur=(ctx && typeof ctx.resolveCurrentSoId==='function') ? (ctx.resolveCurrentSoId()||'root') : 'root';
    const arrival=buildSoArrivalGuideSteps(cur);
    return [...arrival, base];
  }
  function buildConfidenceGuideSteps(){
    const s=(ctx && typeof ctx.getUserConfidenceSummary==='function') ? ctx.getUserConfidenceSummary() : null;
    const score=Math.max(0, Math.min(100, Number(s?.score)||0));
    const level=String(s?.level||'Base');
    const explored=Math.max(0, Number(s?.exploredSo)||0);
    const exploredTarget=Math.max(1, Number(s?.exploredTarget)||8);
    const known=Math.max(0, Number(s?.commandsKnown)||0);
    const knownTot=Math.max(1, Number(s?.commandsTotal)||4);
    const menuTravels=Math.max(0, Number(s?.menuTravels)||0);
    const coordTravels=Math.max(0, Number(s?.coordTravels)||0);
    const moveMinutes=Math.max(0, Number(s?.moveMinutes)||0);
    return [{
      title:'Livello confidenza',
      body:'Qui vedi quanto stai prendendo confidenza con navigazione e comandi.',
      note:`CONFIDENCE ATTUALE: ${score}% (${level})`,
      bullets:[
        `Esplorazione: ${explored}/${exploredTarget} sistemi visitati.`,
        `Comandi appresi: ${known}/${knownTot}.`,
        `Viaggi da menu SO: ${menuTravels}.`,
        `Viaggi da coordinate: ${coordTravels}.`,
        `Tempo di movimento manuale: ${moveMinutes} minuti.`
      ],
      hotkeys:[],
      focus:['#helpMenuBtn','#soSelect','#coordCell']
    }];
  }
  function buildNavModeGuideSteps(){
    return [{
      title:'Modalita navigazione',
      body:'Puoi scegliere come usare il sito in ogni momento.',
      bullets:[
        'Clicca sul titolo ControlChaos in alto.',
        'FULL EXPLORER: viaggio completo nello spazio.',
        'HALF EXPLORER: teletrasporto con fade rapido.',
        'NORMALE: apertura diretta delle pagine glass senza viaggio.'
      ],
      hotkeys:[],
      focus:['#brandTitle','#navModeBadge']
    }];
  }

  function tryOpenContextGuide(contextKey, makeSteps){
    const k=String(contextKey||'').trim();
    if(!k || guideIsDismissed()) return false;
    const steps=(typeof makeSteps==='function') ? makeSteps() : [];
    const coordEditOpen=ctx ? ctx.getCoordEditOpen() : false;
    if(guideOpen || coordEditOpen){
      guidePendingContext={ key:k, steps };
      return false;
    }
    openGuide(true, steps);
    return true;
  }

  function openGuideTopic(topic){
    const t=String(topic||'').trim().toLowerCase();
    if(!t) return false;
    if(t==='all'){ openGuide(true, GUIDE_STEPS); return true; }
    if(t==='confidence'){ openGuide(true, buildConfidenceGuideSteps()); return true; }
    if(t==='where'){ openGuide(true, buildWhereGuideSteps()); return true; }
    if(t==='keys'){ openGuide(true, [GUIDE_STEPS[1]]); return true; }
    if(t==='navcomms'){ openGuide(true, [GUIDE_STEPS[2]]); return true; }
    if(t==='travel'){ openGuide(true, [GUIDE_STEPS[3]]); return true; }
    if(t==='coords'){ openGuide(true, [GUIDE_STEPS[4]]); return true; }
    if(t==='return'){ openGuide(true, [GUIDE_STEPS[5]]); return true; }
    if(t==='navmode'){ openGuide(true, buildNavModeGuideSteps()); return true; }
    if(t==='so-arrival'){
      const cur=(ctx && typeof ctx.resolveCurrentSoId==='function') ? (ctx.resolveCurrentSoId()||'root') : 'root';
      openGuide(true, buildSoArrivalGuideSteps(cur));
      return true;
    }
    if(t==='page-object'){
      openGuide(true, buildObjectGuideSteps('Pagina', ''));
      return true;
    }
    return false;
  }
  function openGuideTopicMenu(){
    openGuide(true, [{
      title:'Menu aiuti',
      body:'',
      bullets:[],
      hotkeys:[],
      allowDismiss:false,
      topicGroups:GUIDE_TOPIC_GROUPS,
      focus:['#helpMenuBtn']
    }]);
    return true;
  }

  // Chiamata ogni frame dal render loop per rilevare il primo docking a un SO
  function guideContextTick(){
    if(!ctx || typeof ctx.resolveCurrentSoId!=='function') return;
    const dockId=ctx.resolveCurrentSoId();
    const cur=dockId ? String(dockId) : '';
    if(cur && cur!==guideLastDockedId){
      const ctxKey=`so:${normalizeGuideKey(cur)}`;
      tryOpenContextGuide(ctxKey, ()=>buildSoArrivalGuideSteps(cur));
    }
    guideLastDockedId=cur;
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────
  function init(injectedCtx){
    ctx=injectedCtx;
    guideState=_loadGuideState();

    // DOM refs
    guideOverlayEl      = document.getElementById('guideOverlay');
    guideBackLayerEl    = document.querySelector('#guideOverlay .guideBack');
    guideSpotEl         = document.getElementById('guideSpot');
    guideLinkEl         = document.getElementById('guideLink');
    guidePanelEl        = document.querySelector('#guideOverlay .guidePanel');
    guideTitleEl        = document.getElementById('guideTitle');
    guideBodyEl         = document.getElementById('guideBody');
    guideListEl         = document.getElementById('guideList');
    guideNoteEl         = document.getElementById('guideNote');
    guideKeysEl         = document.getElementById('guideKeys');
    guideStepEl         = document.getElementById('guideStep');
    guidePrevEl         = document.getElementById('guidePrev');
    guideNextEl         = document.getElementById('guideNext');
    guideCloseEl        = document.getElementById('guideClose');
    guideActionEl       = document.getElementById('guideAction');
    guideDismissEl      = document.getElementById('guideDismiss');

    guideActiveSteps    = GUIDE_STEPS;

    // Event listeners
    guidePrevEl?.addEventListener('click', ()=>{
      guideStepIndex=Math.max(0, guideStepIndex-1);
      renderGuideStep();
    });
    guideNextEl?.addEventListener('click', ()=>{
      const steps=(Array.isArray(guideActiveSteps) && guideActiveSteps.length) ? guideActiveSteps : GUIDE_STEPS;
      if(guideStepIndex>=steps.length-1){ closeGuide(); return; }
      guideStepIndex+=1;
      renderGuideStep();
    });
    guideCloseEl?.addEventListener('click', closeGuide);
    guideDismissEl?.addEventListener('click', ()=>{
      setGuideDismissed(true);
      closeGuide();
    });

    guideActionEl?.addEventListener('click', ()=>{
      if(!ctx) return;
      const actionId=String(guideActionEl.dataset.guideAction||'').trim();
      if(actionId==='travel-soh'){
        const phase=ctx.getPhase();
        const menuTrans=ctx.getMenuTrans();
        const navTrans=ctx.getNavTrans();
        const autoPilot=ctx.getAutoPilot();
        if(phase==='done' && !menuTrans && !navTrans && !autoPilot){
          try{
            const navEl=ctx.hudModeNavsEl;
            if(navEl && typeof navEl.click==='function') navEl.click();
          }catch(_e){}
          const menuId=ctx.getMenuId();
          const activeNodeId=ctx.getActiveNodeId();
          if(menuId!=='root' || activeNodeId!=='root') ctx.startNavTravel('root');
        }
        closeGuide();
      }
    });
    guideKeysEl?.addEventListener('click', (e)=>{
      const m=e && e.target ? e.target.closest('[data-guide-navmode]') : null;
      if(m){
        const mode=String(m.getAttribute('data-guide-navmode')||'').trim().toLowerCase();
        if(mode && ctx && typeof ctx.setNavigationMode==='function'){
          ctx.setNavigationMode(mode);
          renderGuideStep();
        }
        return;
      }
      const t=e && e.target ? e.target.closest('[data-guide-topic]') : null;
      if(!t) return;
      const topic=String(t.getAttribute('data-guide-topic')||'').trim().toLowerCase();
      if(topic) openGuideTopic(topic);
    });

    guideOverlayEl?.addEventListener('click', (e)=>{
      if(e.target===guideOverlayEl || e.target.classList?.contains('guideBack')) closeGuide();
    });
    guideOverlayEl?.addEventListener('wheel', (e)=>{
      if(e.target===guidePanelEl || guidePanelEl?.contains(e.target)) return;
      e.preventDefault();
    }, {passive:false});
    window.addEventListener('resize', ()=>{
      if(!guideOpen) return;
      requestAnimationFrame(positionGuidePanel);
    }, {passive:true});
  }

  // ─── API PUBBLICA ─────────────────────────────────────────────────────────
  window.SECC_GUIDE = Object.freeze({
    init,
    open:               openGuide,
    openTopic:          openGuideTopic,
    openTopicMenu:      openGuideTopicMenu,
    close:              closeGuide,
    scheduleOpen:       scheduleGuideOpen,
    bumpVisitCount:     bumpGuideVisitCount,
    tryOpenContext:     tryOpenContextGuide,
    contextTick:        guideContextTick,
    buildObjectSteps:   buildObjectGuideSteps,
    isOpen:             ()=>guideOpen
  });
})();
