(function(){
'use strict';

// â”€â”€â”€ CONSTANTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PI=Math.PI, TAU=PI*2, DEG=PI/180;
const W=()=>window.innerWidth, H=()=>window.innerHeight;
// Matematica estratta in assets/js/math/engine-math.js → window.SECC_MATH
const { clamp, lerp, m4, idt, mul, persp, lookat,
        tmat, smat, rY, rX, rZ, xfm3,
        vadd, vsub, vscl, vdot, vcross, vnorm, vlerp, proj3 } = window.SECC_MATH;
// Utility dati estratte in assets/js/utils/data-utils.js → window.SECC_DATA_UTILS
const { normBasePath, resolveCardImage, prettyPathLabel, csvSplit, parseCsvRows,
        readMetricValue, slugifyMessageKey, parseDrawDateLabel,
        extractLatestDrawMessage } = window.SECC_DATA_UTILS;
const SOH_HUBS = window.SECC_SOH_HUBS || null;
function cssVarPx(name){
  const raw=getComputedStyle(document.documentElement).getPropertyValue(name);
  const n=parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}
let sceneVp={
  left:0, top:0, width:Math.max(1,W()), height:Math.max(1,H()),
  right:Math.max(1,W()), bottom:Math.max(1,H()),
  centerX:W()*0.5, centerY:H()*0.5,
  reserveLeft:0, reserveRight:0, reserveBottom:0
};
let sceneVpGl={x:-1,y:-1,w:-1,h:-1};
function syncSceneViewport(){
  const reserveLeftCss=Math.max(0, Math.round(cssVarPx('--ad-reserve-left')));
  const reserveRightCss=Math.max(0, Math.round(cssVarPx('--ad-reserve-right')));
  const reserveBottomCss=Math.max(0, Math.round(cssVarPx('--ad-reserve-bottom')));
  const rightRail=document.querySelector('.ad-rail--right:not([hidden]), [data-ad-rail="right"]:not([hidden]), [data-cc-ad-container="right"]:not([hidden])');
  const bottomAd=document.querySelector('.bottom-ad:not([hidden]), [data-bottom-ad="true"]:not([hidden]), [data-cc-ad-container="bottom"]:not([hidden])');
  const rightRect=(rightRail && typeof rightRail.getBoundingClientRect==='function') ? rightRail.getBoundingClientRect() : null;
  const bottomRect=(bottomAd && typeof bottomAd.getBoundingClientRect==='function') ? bottomAd.getBoundingClientRect() : null;
  const rightEdge=(rightRect && rightRect.width>0) ? Math.max(0, Math.min(W(), rightRect.left)) : Math.max(0, W()-reserveRightCss);
  const bottomEdge=(bottomRect && bottomRect.height>0) ? Math.max(0, Math.min(H(), bottomRect.top)) : Math.max(0, H()-reserveBottomCss);
  const reserveLeft=reserveLeftCss;
  const width=Math.max(1, rightEdge-reserveLeft);
  const height=Math.max(1, bottomEdge);
  sceneVp={
    left:reserveLeft,
    top:0,
    width,
    height,
    right:reserveLeft+width,
    bottom:height,
    centerX:reserveLeft + width*0.5,
    centerY:height*0.5,
    reserveLeft,
    reserveRight:Math.max(0, W()-(reserveLeft+width)),
    reserveBottom:Math.max(0, H()-height)
  };
  // Export scene center so CSS elements (reticle, etc.) can align to it
  const root=document.documentElement;
  root.style.setProperty('--scene-center-x', sceneVp.centerX+'px');
  root.style.setProperty('--scene-center-y', sceneVp.centerY+'px');
}
function sceneAspect(){ return sceneVp.width/Math.max(1,sceneVp.height); }
// Applica uno shift off-center alla projection matrix in modo che NDC(0,0)
// coincida con sceneVp.centerX/Y (centro visibile, escluse le fasce pubblicitarie)
// anziché W/2, H/2. Il GL viewport rimane invariato (0,0,W,H).
function sceneContainsPoint(px,py){
  return px>=sceneVp.left && px<=sceneVp.right && py>=sceneVp.top && py<=sceneVp.bottom;
}
// Map NDC → CSS pixel using the FULL canvas (consistent with gl.viewport=W×H, projM=W/H).
// sceneVp is narrower when ads reserve space, but the WebGL render always covers the
// full canvas, so labels and picks must follow the same mapping.
function sceneScreenXFromNdc(x){ return (x+1)*0.5*W(); }
function sceneScreenYFromNdc(y){ return (1-y)*0.5*H(); }
const BASE_FOVY = 62*DEG;
const WORLD_FAR_CLIP = 120000;
// clamp, lerp, m4, idt, mul, persp, lookat, tmat, smat, rY, rX, rZ, xfm3,
// vadd, vsub, vscl, vdot, vcross, vnorm, vlerp, proj3 → da window.SECC_MATH (engine-math.js)

// ─── SCENE CONFIG (loaded from assets/js/so-config.js) ────────────────────────────────
const { MENU_DEFS, SOH_ID, SOH_Y, NAV_NODES, SOH,
        nodePos, nodeCenter, coordToNodePos, nodePosToCoord, azDegFromXZ,
        hash01 } = window.SECC_CONFIG;
const STAR_MAP = window.SECC_STAR_MAP || null;
const OBJECT_ARCHIVE = window.SECC_OBJECT_ARCHIVE || null;
const ARCHIVE_REAL_STARS = (OBJECT_ARCHIVE && OBJECT_ARCHIVE.realStars && Array.isArray(OBJECT_ARCHIVE.realStars.stars))
  ? OBJECT_ARCHIVE.realStars.stars
  : null;
const coordRegistry = (window.SECC_COORD_REGISTRY && typeof window.SECC_COORD_REGISTRY.createRegistry==='function')
  ? window.SECC_COORD_REGISTRY.createRegistry()
  : null;
const AUTOPILOT_UTILS = window.SECC_AUTOPILOT_UTILS || null;


let menuId='root';
let activeNodeId=null;
let activeNodeP=nodePos(SOH_ID);
// 1 UA = 10 world units => 2 UA = 20 world units.
const SO_DOCK_RADIUS=20;    // if distance < 2 UA, attach to SO
const SO_RELEASE_RADIUS=20; // if distance > 2 UA, enter free cosmos
let RINGS=MENU_DEFS.root.rings;
let MARBLES=MENU_DEFS.root.marbles;
let RING_SLOTS=MENU_DEFS.root.ringSlots;
const BASE_Y=0.09;
const CORE_GOLD=[0.98,0.80,0.26];
let RING_ROT = RINGS.map(rg=>mul(rZ(rg.tiltZ||0), rX(rg.tiltX||0)));
function ringPoint(ringIdx,x,y,z){ return xfm3(RING_ROT[ringIdx],x,y,z); }
function sysOrigin(){ return [activeNodeP[0], activeNodeP[1], activeNodeP[2] + systemZ]; }
function sysCenterW(){ return [activeNodeP[0], activeNodeP[1] + SOH_Y, activeNodeP[2] + systemZ]; }
function distToSoCenter(id, pos){
  if(!id || !NAV_NODES[id]) return Infinity;
  const p=pos || camPos;
  if(!p || p.length!==3) return Infinity;
  const c=nodeCenter(id);
  const dx=c[0]-p[0], dy=c[1]-p[1], dz=c[2]-p[2];
  return Math.sqrt(dx*dx+dy*dy+dz*dz);
}

const SO_LABELS = Object.freeze(
  Object.keys(MENU_DEFS||{}).reduce((acc,id)=>{
    const def=MENU_DEFS[id]||{};
    if(def && def.label) acc[id]=String(def.label);
    else acc[id]=`SO ${String(id||'').toUpperCase()}`;
    return acc;
  }, {})
);
const ARCHIVE_SPECIAL = (OBJECT_ARCHIVE && OBJECT_ARCHIVE.specialObjects && typeof OBJECT_ARCHIVE.specialObjects==='object')
  ? OBJECT_ARCHIVE.specialObjects
  : {};
const ARCHIVE_CONTROLCHAOS = (ARCHIVE_SPECIAL.controlchaos && typeof ARCHIVE_SPECIAL.controlchaos==='object')
  ? ARCHIVE_SPECIAL.controlchaos
  : null;
const ARCHIVE_CROSSCALIBR = (ARCHIVE_SPECIAL.crosscalibr && typeof ARCHIVE_SPECIAL.crosscalibr==='object')
  ? ARCHIVE_SPECIAL.crosscalibr
  : null;
const CROSS_CALIBR_ID='crosscalibr';
const CROSS_CALIBR_NAME=String(ARCHIVE_CROSSCALIBR?.name || 'CrossCalibr');
const CROSS_CALIBR_DARH=Object.freeze({
  dUa:Number(ARCHIVE_CROSSCALIBR?.darh?.dUa ?? 1007.52),
  aDeg:Number(ARCHIVE_CROSSCALIBR?.darh?.aDeg ?? 88.06),
  rDeg:Number(ARCHIVE_CROSSCALIBR?.darh?.rDeg ?? 186.0)
});
const CROSS_CALIBR_DARR=Object.freeze({
  dUa:Number(ARCHIVE_CROSSCALIBR?.darr?.dUa ?? 30.0),
  aDeg:Number(ARCHIVE_CROSSCALIBR?.darr?.aDeg ?? 19.0),
  rDeg:Number(ARCHIVE_CROSSCALIBR?.darr?.rDeg ?? 185.0)
});
const CONTROLCHAOS_DARR_D_UA=Number(ARCHIVE_CONTROLCHAOS?.darr?.dUa ?? 84.0);
const CONTROLCHAOS_ATTACH_EXTRA_UA=Number(ARCHIVE_CONTROLCHAOS?.attachExtraUa ?? 3.0);
const CONTROLCHAOS_LABEL=String(ARCHIVE_CONTROLCHAOS?.name || 'ControlChaos');
const CONTROLCHAOS_COORD=Object.freeze({
  r:Number(ARCHIVE_CONTROLCHAOS?.coord?.r ?? 7000),
  az:Number(ARCHIVE_CONTROLCHAOS?.coord?.az ?? 7.5),
  ril:Number(ARCHIVE_CONTROLCHAOS?.coord?.ril ?? 208)
});
const CONTROLCHAOS_OFFSET=Object.freeze({
  x:Number(ARCHIVE_CONTROLCHAOS?.offset?.x ?? 190),
  y:Number(ARCHIVE_CONTROLCHAOS?.offset?.y ?? 68),
  z:Number(ARCHIVE_CONTROLCHAOS?.offset?.z ?? -142)
});
const CROSS_CALIBR_FADE_START_WU=80.0*10.0;
const CROSS_CALIBR_FADE_END_WU=900.0*10.0;
const CROSS_CALIBR_POS=(()=>{
  const distWU=CROSS_CALIBR_DARH.dUa*10.0;
  const elevR=clamp(CROSS_CALIBR_DARH.aDeg, -89.999, 89.999)*DEG;
  const brgR=(((CROSS_CALIBR_DARH.rDeg%360)+360)%360)*DEG;
  const horiz=Math.cos(elevR)*distWU;
  return [
    SOH[0] + Math.sin(brgR)*horiz,
    SOH[1] + Math.sin(elevR)*distWU,
    SOH[2] + Math.cos(brgR)*horiz
  ];
})();
const soSelectEl = document.getElementById('soSelect');
const SO_SELECT_EXIT_VALUE='__exit_site__';
const EXIT_SITE_HREF='pages/oracle/';
const EXIT_CC_APPROACH_WU=420.0;
const EXIT_CC_FADE_EXTRA_WU=36.0;
const EXIT_CC_FADE_MIN_APPROACH_SPD=0.6;
const EXIT_CC_MAX_TRAVEL_MS=20000;
const soCurrentEl = document.getElementById('soCurrent');
const navModeBadgeEl = document.getElementById('navModeBadge');
const brandTitleEl = document.getElementById('brandTitle');
const objSearchInputEl = document.getElementById('objSearchInput');
const objSearchGoEl = document.getElementById('objSearchGo');
const objSearchInfoEl = document.getElementById('objSearchInfo');
const hudKeyTipEl = document.getElementById('hudKeyTip');
const hudMoveEl = document.getElementById('hudMove');
const hudCameraEl = document.getElementById('hudCamera');
const travelPctEl = document.getElementById('travelPct');
const travelBoostEl = document.getElementById('travelBoost');
const travelPctNumEl = document.getElementById('travelPctNum');
const travelPctLblEl = document.getElementById('travelPctLbl');
const travelBoostFillEl = document.getElementById('travelBoostFill');
const travelBoostLblEl = document.getElementById('travelBoostLbl');
const commAttachToastEl = document.getElementById('commAttachToast');
const commHudEl = document.getElementById('commHud');
const quickTeleportFadeEl = document.getElementById('quickTeleportFade');
const NAV_MODE_LS_KEY='secc_nav_mode_v1';
const NAV_MODE_FULL='full';
const NAV_MODE_HALF='half';
const NAV_MODE_NORMAL='normal';
const NAV_MODE_LABELS=Object.freeze({
  [NAV_MODE_FULL]:'Full Explorer',
  [NAV_MODE_HALF]:'Half Explorer',
  [NAV_MODE_NORMAL]:'Normale'
});
let navigationMode=NAV_MODE_FULL;
function normalizeNavigationMode(v){
  const k=String(v||'').trim().toLowerCase();
  if(k===NAV_MODE_HALF || k===NAV_MODE_NORMAL) return k;
  return NAV_MODE_FULL;
}
function loadNavigationMode(){
  try{
    navigationMode=normalizeNavigationMode(localStorage.getItem(NAV_MODE_LS_KEY));
  }catch(_e){
    navigationMode=NAV_MODE_FULL;
  }
}
function saveNavigationMode(){
  try{ localStorage.setItem(NAV_MODE_LS_KEY, navigationMode); }catch(_e){}
}
function isFullExplorerMode(){ return navigationMode===NAV_MODE_FULL; }
function isHalfExplorerMode(){ return navigationMode===NAV_MODE_HALF; }
function isNormalMode(){ return navigationMode===NAV_MODE_NORMAL; }
function applyNavigationModeBodyClass(){
  document.body.classList.toggle('nav-mode-full', isFullExplorerMode());
  document.body.classList.toggle('nav-mode-half', isHalfExplorerMode());
  document.body.classList.toggle('nav-mode-normal', isNormalMode());
}
function setNavigationMode(mode){
  navigationMode=normalizeNavigationMode(mode);
  saveNavigationMode();
  markCommandLearned('nav-mode');
  applyNavigationModeBodyClass();
  if(navModeBadgeEl){
    navModeBadgeEl.textContent=(NAV_MODE_LABELS[navigationMode] || navigationMode).toUpperCase();
  }
  try{
    SECC_HUD.showHudKeyTip({
      key:'nav-mode',
      title:'Modalita navigazione',
      text:`Modalita attiva: ${NAV_MODE_LABELS[navigationMode] || navigationMode}. Clic sul titolo per cambiarla.`
    });
  }catch(_e){}
}
loadNavigationMode();
applyNavigationModeBodyClass();
if(navModeBadgeEl){
  navModeBadgeEl.textContent=(NAV_MODE_LABELS[navigationMode] || navigationMode).toUpperCase();
}
const hoverObjTipEl = document.createElement('div');
hoverObjTipEl.id='hoverObjTip';
hoverObjTipEl.className='hover-obj-tip';
hoverObjTipEl.setAttribute('aria-hidden','true');
hoverObjTipEl.innerHTML='<div class="hover-obj-tip__name"></div><div class="hover-obj-tip__darh"></div>';
document.body.appendChild(hoverObjTipEl);
const hoverObjTipNameEl=hoverObjTipEl.querySelector('.hover-obj-tip__name');
const hoverObjTipDarhEl=hoverObjTipEl.querySelector('.hover-obj-tip__darh');
const tipCalHudEl=document.getElementById('tipCalHud');
const tipCalXEl=document.getElementById('tipCalX');
const tipCalYEl=document.getElementById('tipCalY');
const tipCalCaptureEl=document.getElementById('tipCalCapture');
const tipCalAutoEl=document.getElementById('tipCalAuto');
const tipCalApplyEl=document.getElementById('tipCalApply');
const tipCalResetEl=document.getElementById('tipCalReset');
const tipCalStatusEl=document.getElementById('tipCalStatus');
const tipCalMarkerEl=document.getElementById('tipCalMarker');
let commAttachToastTimer=0;
let exitSiteSequence=null; // {phase:'travel'|'fading', lookPos,targetPos,fadeTriggerWU,startedAtMs}
let commAttachLastKey='';
const COMM_ATTACH_TOAST_MS=5200;
const TIP_HOVER_OFFSET_LS_KEY='secc_tip_hover_offset_v1';
const TIP_HOVER_MAP_LS_KEY='secc_tip_hover_map_v1';
const tipHoverMap={
  TL:{x:0, y:0},
  TR:{x:0, y:0},
  BR:{x:0, y:0},
  BL:{x:0, y:0},
  C:{x:0, y:0}
};
// Fine trim over mapped offsets.
let tipHoverOffsetX=0;
let tipHoverOffsetY=0;
let tipCalCaptureArmed=false;
let tipCalSamples=[];
let tipCalAutoMode=false;
let tipCalAutoCapture=false;
let tipCalGuideIdx=0;
let tipCalCenterOverrideUv=null;
const TIP_CAL_GUIDE_TARGET_UA=25.0;
const TIP_CAL_GUIDE_DIST_TOL_UA=0.35;
const TIP_CAL_GUIDE_LOCK_PX=44.0;
const TIP_CAL_GUIDE_POINTS=Object.freeze([
  { key:'C',  u:0.50, v:0.50, label:'centrale' },
  { key:'TL', u:0.14, v:0.16, label:'alto-sinistra' },
  { key:'TR', u:0.86, v:0.16, label:'alto-destra' },
  { key:'BR', u:0.86, v:0.84, label:'basso-destra' },
  { key:'BL', u:0.14, v:0.84, label:'basso-sinistra' }
]);
function mapPoint(k){
  const p=tipHoverMap[k];
  return (p && Number.isFinite(p.x) && Number.isFinite(p.y)) ? p : {x:0,y:0};
}
function isRectVisible(r){
  return !!(r && Number.isFinite(r.width) && Number.isFinite(r.height) && r.width>2 && r.height>2);
}
function tipCalibrationViewport(){
  let left=sceneVp.left;
  let right=sceneVp.right;
  let top=sceneVp.top;
  let bottom=sceneVp.bottom;
  const pad=8;
  const header=document.querySelector('.hud:not([hidden])');
  if(header && typeof header.getBoundingClientRect==='function'){
    const r=header.getBoundingClientRect();
    if(isRectVisible(r)) top=Math.max(top, r.bottom+pad);
  }
  const blockers=[
    document.getElementById('navHud'),
    document.getElementById('commHud'),
    document.getElementById('hudMove'),
    document.getElementById('hudCamera')
  ];
  for(const el of blockers){
    if(!el || el.hasAttribute('hidden') || typeof el.getBoundingClientRect!=='function') continue;
    const r=el.getBoundingClientRect();
    if(!isRectVisible(r)) continue;
    const mid=r.left + r.width*0.5;
    if(mid<=sceneVp.centerX){
      left=Math.max(left, r.right+pad);
    }else{
      right=Math.min(right, r.left-pad);
    }
  }
  if(!(right-left>160 && bottom-top>140)){
    return {
      left:sceneVp.left,
      top:sceneVp.top,
      width:sceneVp.width,
      height:sceneVp.height,
      right:sceneVp.right,
      bottom:sceneVp.bottom
    };
  }
  return {
    left,
    top,
    width:Math.max(1,right-left),
    height:Math.max(1,bottom-top),
    right,
    bottom
  };
}
function tipDynamicOffsetForMouse(mx,my){
  const vp=tipCalibrationViewport();
  const sx=clamp((Number(mx)||0), vp.left, vp.right);
  const sy=clamp((Number(my)||0), vp.top, vp.bottom);
  const u=clamp((sx-vp.left)/Math.max(1,vp.width), 0, 1);
  const v=clamp((sy-vp.top)/Math.max(1,vp.height), 0, 1);
  const topX=lerp(mapPoint('TL').x, mapPoint('TR').x, u);
  const topY=lerp(mapPoint('TL').y, mapPoint('TR').y, u);
  const botX=lerp(mapPoint('BL').x, mapPoint('BR').x, u);
  const botY=lerp(mapPoint('BL').y, mapPoint('BR').y, u);
  let mapX=lerp(topX, botX, v);
  let mapY=lerp(topY, botY, v);
  // Enforce measured center while keeping corners unchanged.
  const cxTop=lerp(mapPoint('TL').x, mapPoint('TR').x, 0.5);
  const cxBot=lerp(mapPoint('BL').x, mapPoint('BR').x, 0.5);
  const cyTop=lerp(mapPoint('TL').y, mapPoint('TR').y, 0.5);
  const cyBot=lerp(mapPoint('BL').y, mapPoint('BR').y, 0.5);
  const bilCenterX=lerp(cxTop, cxBot, 0.5);
  const bilCenterY=lerp(cyTop, cyBot, 0.5);
  const dCx=mapPoint('C').x - bilCenterX;
  const dCy=mapPoint('C').y - bilCenterY;
  const wx=1.0-Math.abs(2.0*u-1.0);
  const wy=1.0-Math.abs(2.0*v-1.0);
  const w=clamp(wx*wy, 0, 1);
  mapX += dCx*w;
  mapY += dCy*w;
  return { x:mapX + tipHoverOffsetX, y:mapY + tipHoverOffsetY };
}
function loadTipHoverMap(){
  try{
    const raw=localStorage.getItem(TIP_HOVER_MAP_LS_KEY);
    const p=raw ? JSON.parse(raw) : null;
    if(!p || typeof p!=='object') return;
    for(const k of ['TL','TR','BR','BL','C']){
      const v=p[k];
      if(v && Number.isFinite(Number(v.x)) && Number.isFinite(Number(v.y))){
        tipHoverMap[k].x=Number(v.x);
        tipHoverMap[k].y=Number(v.y);
      }
    }
  }catch(_){}
}
function saveTipHoverMap(){
  try{
    localStorage.setItem(TIP_HOVER_MAP_LS_KEY, JSON.stringify(tipHoverMap));
  }catch(_){}
}
function loadTipHoverOffset(){
  try{
    const raw=localStorage.getItem(TIP_HOVER_OFFSET_LS_KEY);
    const p=raw ? JSON.parse(raw) : null;
    tipHoverOffsetX=(p && Number.isFinite(Number(p.x))) ? Number(p.x) : 0;
    tipHoverOffsetY=(p && Number.isFinite(Number(p.y))) ? Number(p.y) : 0;
  }catch(_){
    tipHoverOffsetX=0;
    tipHoverOffsetY=0;
  }
}
function saveTipHoverOffset(){
  try{
    localStorage.setItem(TIP_HOVER_OFFSET_LS_KEY, JSON.stringify({
      x: Math.round(tipHoverOffsetX),
      y: Math.round(tipHoverOffsetY)
    }));
  }catch(_){}
}
function syncTipHoverOffsetHud(){
  if(tipCalXEl) tipCalXEl.value=String(Math.round(tipHoverOffsetX));
  if(tipCalYEl) tipCalYEl.value=String(Math.round(tipHoverOffsetY));
  if(tipCalStatusEl){
    const n=tipCalSamples.length|0;
    if(tipCalAutoMode){
      const step=TIP_CAL_GUIDE_POINTS[clamp(tipCalGuideIdx|0,0,TIP_CAL_GUIDE_POINTS.length-1)];
      const dUa=distanceCamToSohUa();
      const dTxt=Number.isFinite(dUa) ? dUa.toFixed(2) : '--';
      const centerTxt=(step.key==='C' && !tipCalCenterOverrideUv) ? ' | clicca per impostare il centro' : '';
      tipCalStatusEl.textContent=`Punto ${tipCalGuideIdx+1}/${TIP_CAL_GUIDE_POINTS.length} (${step.label}) | Cross ${dTxt} UA | premi OK${centerTxt}`;
    }else{
      tipCalStatusEl.textContent=`Campioni: ${n}`;
    }
  }
  if(tipCalCaptureEl) tipCalCaptureEl.classList.toggle('is-armed', tipCalCaptureArmed);
  if(tipCalAutoEl) tipCalAutoEl.classList.toggle('is-armed', tipCalAutoMode);
  if(tipCalCaptureEl) tipCalCaptureEl.textContent=tipCalAutoMode ? 'OK punto' : 'Rileva Cross';
  if(tipCalAutoEl){
    if(!tipCalAutoMode) tipCalAutoEl.textContent='Calibra 5 punti';
    else tipCalAutoEl.textContent=tipCalAutoCapture ? 'Auto ON' : 'Auto OFF';
  }
}
function applyTipHoverOffsetFromHud(){
  const x=Number(tipCalXEl && tipCalXEl.value);
  const y=Number(tipCalYEl && tipCalYEl.value);
  tipHoverOffsetX=clamp(Number.isFinite(x)?x:0,-300,300);
  tipHoverOffsetY=clamp(Number.isFinite(y)?y:0,-300,300);
  saveTipHoverOffset();
  syncTipHoverOffsetHud();
}
function initTipHoverOffsetHud(){
  loadTipHoverMap();
  loadTipHoverOffset();
  // Hard reset requested: zero all mouse-tip offsets and samples.
  tipHoverOffsetX=0;
  tipHoverOffsetY=0;
  tipCalSamples.length=0;
  tipCalCaptureArmed=false;
  saveTipHoverOffset();
  syncTipHoverOffsetHud();
  if(tipCalCaptureEl){
    tipCalCaptureEl.addEventListener('click',()=>{
      if(tipCalAutoMode){
        if(tipCalAutoCapture) return;
        captureTipGuideStep();
        return;
      }
      tipCalCaptureArmed=!tipCalCaptureArmed;
      if(tipCalCaptureArmed) tipCalAutoMode=false;
      syncTipHoverOffsetHud();
    });
  }
  if(tipCalAutoEl){
    tipCalAutoEl.addEventListener('click',()=>{
      if(!tipCalAutoMode){
        tipCalAutoMode=true;
        tipCalAutoCapture=false;
        tipCalCaptureArmed=false;
        tipCalGuideIdx=0;
        tipCalCenterOverrideUv=null;
        tipCalSamples.length=0;
      }else{
        tipCalAutoCapture=!tipCalAutoCapture;
      }
      syncTipHoverOffsetHud();
    });
  }
  if(tipCalApplyEl){
    tipCalApplyEl.addEventListener('click', applyTipHoverOffsetFromHud);
  }
  if(tipCalResetEl){
    tipCalResetEl.addEventListener('click',()=>{
      tipHoverOffsetX=0;
      tipHoverOffsetY=0;
      tipCalSamples.length=0;
      tipCalCaptureArmed=false;
      tipCalAutoMode=false;
      tipCalAutoCapture=false;
      tipCalGuideIdx=0;
      tipCalCenterOverrideUv=null;
      for(const k of ['TL','TR','BR','BL','C']){
        tipHoverMap[k].x=0;
        tipHoverMap[k].y=0;
      }
      if(tipCalMarkerEl) tipCalMarkerEl.classList.remove('on');
      saveTipHoverMap();
      saveTipHoverOffset();
      syncTipHoverOffsetHud();
    });
  }
}
initTipHoverOffsetHud();
function distanceCamToSohUa(){
  const c=CROSS_CALIBR_POS;
  const dx=camPos[0]-c[0], dy=camPos[1]-c[1], dz=camPos[2]-c[2];
  return Math.sqrt(dx*dx + dy*dy + dz*dz)/10.0;
}
function tipGuidePointScreen(stepIdx){
  const s=TIP_CAL_GUIDE_POINTS[clamp(stepIdx|0,0,TIP_CAL_GUIDE_POINTS.length-1)];
  const vp=tipCalibrationViewport();
  let u=s.u, v=s.v;
  if(s.key==='C' && tipCalCenterOverrideUv){
    u=clamp(Number(tipCalCenterOverrideUv.u)||0.5,0,1);
    v=clamp(Number(tipCalCenterOverrideUv.v)||0.5,0,1);
  }
  return [vp.left + u*vp.width, vp.top + v*vp.height, s];
}
function setTipCalibrationCenterFromScreen(mx,my){
  const vp=tipCalibrationViewport();
  const sx=clamp((Number(mx)||0), vp.left, vp.right);
  const sy=clamp((Number(my)||0), vp.top, vp.bottom);
  tipCalCenterOverrideUv={
    u:clamp((sx-vp.left)/Math.max(1,vp.width),0,1),
    v:clamp((sy-vp.top)/Math.max(1,vp.height),0,1)
  };
  return [sx,sy];
}
function setTipGuideMarker(x,y,on){
  if(!tipCalMarkerEl) return;
  if(on){
    tipCalMarkerEl.style.left=`${Math.round(x)}px`;
    tipCalMarkerEl.style.top=`${Math.round(y)}px`;
    tipCalMarkerEl.classList.add('on');
  }else{
    tipCalMarkerEl.classList.remove('on');
  }
}
function tipCalibrationGuideTick(dt){
  if(!tipCalAutoMode){
    setTipGuideMarker(0,0,false);
    return;
  }
  const distUa=distanceCamToSohUa();
  const [tx,ty,step]=tipGuidePointScreen(tipCalGuideIdx);
  setTipGuideMarker(tx,ty,true);
  if(tipCalStatusEl){
    const dTxt=Number.isFinite(distUa) ? `${distUa.toFixed(2)} UA` : '--';
    const modeTxt=tipCalAutoCapture ? 'AUTO' : 'MANUALE';
    const centerTxt=(step.key==='C' && !tipCalCenterOverrideUv) ? ' | clicca per impostare il centro' : '';
    tipCalStatusEl.textContent=`Punto ${tipCalGuideIdx+1}/${TIP_CAL_GUIDE_POINTS.length} (${step.label}) | ${modeTxt} | Cross ${dTxt} | target 25.00 UA${centerTxt}`;
  }
  if(!tipCalAutoCapture) return;
  const sp=projectWorldToScreen(CROSS_CALIBR_POS);
  if(!sp) return;
  const err=Math.hypot(sp[0]-tx, sp[1]-ty);
  const distOk=Math.abs(distUa-TIP_CAL_GUIDE_TARGET_UA)<=TIP_CAL_GUIDE_DIST_TOL_UA;
  if(distOk && err<=TIP_CAL_GUIDE_LOCK_PX){
    captureTipGuideStep();
  }
}
function captureTipGuideStep(){
  if(!tipCalAutoMode) return false;
  const distUa=distanceCamToSohUa();
  const [tx,ty,step]=tipGuidePointScreen(tipCalGuideIdx);
  if(step.key==='C' && !tipCalCenterOverrideUv){
    if(tipCalStatusEl) tipCalStatusEl.textContent='Prima imposta il centro con un click nell area visibile';
    return false;
  }
  const sp=projectWorldToScreen(CROSS_CALIBR_POS);
  if(!sp){
    if(tipCalStatusEl) tipCalStatusEl.textContent='CrossCalibr non visibile';
    return false;
  }
  const err=Math.hypot(sp[0]-tx, sp[1]-ty);
  const distOk=Math.abs(distUa-TIP_CAL_GUIDE_TARGET_UA)<=TIP_CAL_GUIDE_DIST_TOL_UA;
  if(!distOk){
    if(tipCalStatusEl) tipCalStatusEl.textContent=`Distanza CrossCalibr non valida (${distUa.toFixed(2)} UA). Usa 25.00 UA`;
    return false;
  }
  if(err>TIP_CAL_GUIDE_LOCK_PX){
    if(tipCalStatusEl) tipCalStatusEl.textContent=`CrossCalibr non allineato al marker (${Math.round(err)} px). Avvicina e premi OK`;
    return false;
  }
  const ok=captureTipOffsetSample(tx, ty);
  if(!ok) return false;
  const offX=sp[0]-tx;
  const offY=sp[1]-ty;
  tipHoverMap[step.key].x=clamp(offX,-300,300);
  tipHoverMap[step.key].y=clamp(offY,-300,300);
  saveTipHoverMap();
  tipCalGuideIdx+=1;
  if(tipCalGuideIdx>=TIP_CAL_GUIDE_POINTS.length){
    tipCalAutoMode=false;
    tipCalGuideIdx=TIP_CAL_GUIDE_POINTS.length-1;
    setTipGuideMarker(0,0,false);
    if(tipCalStatusEl) tipCalStatusEl.textContent='Calibrazione 5 punti completata';
  }
  syncTipHoverOffsetHud();
  return true;
}
function projectWorldToScreen(pos){
  if(!(Array.isArray(pos) && pos.length===3)) return null;
  const sc=proj3(pos, viewM, projM);
  if(!sc || !Number.isFinite(sc[0]) || !Number.isFinite(sc[1])) return null;
  if(sc[0] < -1.0 || sc[0] > 1.0 || sc[1] < -1.0 || sc[1] > 1.0) return null;
  return [ (sc[0]+1)*0.5*W(), (1-sc[1])*0.5*H() ];
}
function captureTipOffsetSample(mouseX, mouseY){
  const sp=projectWorldToScreen(CROSS_CALIBR_POS);
  if(!sp){
    if(tipCalStatusEl) tipCalStatusEl.textContent='CrossCalibr non visibile';
    return false;
  }
  const offX=sp[0]-mouseX;
  const offY=sp[1]-mouseY;
  if(!(Number.isFinite(offX) && Number.isFinite(offY))) return false;
  tipCalSamples.push([offX, offY]);
  if(tipCalSamples.length>24) tipCalSamples.shift();
  let sx=0, sy=0;
  for(let i=0;i<tipCalSamples.length;i++){ sx+=tipCalSamples[i][0]; sy+=tipCalSamples[i][1]; }
  tipHoverOffsetX=clamp(sx/Math.max(1,tipCalSamples.length), -300, 300);
  tipHoverOffsetY=clamp(sy/Math.max(1,tipCalSamples.length), -300, 300);
  saveTipHoverOffset();
  syncTipHoverOffsetHud();
  if(tipCalStatusEl){
    tipCalStatusEl.textContent=`Campioni: ${tipCalSamples.length}  (${Math.round(offX)}, ${Math.round(offY)})`;
  }
  return true;
}
const HUD_KEY_TIPS = Object.freeze([
  { key:'wasd',  sel:'[data-tip-key="w"]',     text:'WASD movimento sul piano' },
  { key:'q',     sel:'[data-tip-key="q"]',     text:'Q: sali di quota' },
  { key:'e',     sel:'[data-tip-key="e"]',     text:'E: scendi di quota' },
  { key:'mouse', sel:'[data-tip-key="mouse"]', text:'Drag mouse: ruota visuale' },
  { key:'arrows',sel:'[data-tip-key="up"]',    text:'Frecce: orienta la camera. Ctrl + frecce destra/sinistra: roll camera' },
  { key:'roll',  sel:'[data-tip-key="up"]',    text:'Ctrl + frecce destra/sinistra: rotazione camera oraria/antioraria' },
  { key:'ctrl',    sel:'[data-tip-key="ctrl"]',    text:'Ctrl: boost livello 1' },
  { key:'alt',     sel:'[data-tip-key="alt"]',     text:'Alt: boost livello 2' },
  { key:'ctrlalt', sel:'[data-tip-key="ctrlalt"]', text:'Ctrl + Alt: boost livello 3' },
  { key:'soselect', sel:'#soSelect', text:'Menu SISTEMI ORBITANTI: scegli un SO o Landing Zone' },
  { key:'navs',     sel:'#hudModeNavs', text:'NAVS: modalità di navigazione nello spazio' },
  { key:'comms',    sel:'#hudModeComms', text:'COMMS: messaggi, aggiornamenti e comunicazioni' },
  { key:'coord',    sel:'#coordCell', text:'Riquadro coordinate: apri inserimento destinazione manuale' },
  { key:'coord-ap', sel:'#coordEditGo', text:'Autopilota coordinate: inserisci D/A/R e premi Vai' },
  { key:'nav-mode', sel:'#brandTitle', text:'Clic sul titolo: scegli Full Explorer, Half Explorer o Normale' }
]);
let hudTipLoopTimer=0;
let hudTipHideTimer=0;
let hudTipLastKey='';
let ctrlHudHoldT=2.2;
let ctrlHudPeekT=0;
let ctrlHudNextPeek=5.0 + Math.random()*8.0;
let tipForcePanel='';
let tipForceGroup='';
let tipForceT=0;
const CTRL_GROUP_LS_KEY='secc_ctrl_groups_hidden_v1';
const COMMAND_MASTERY_LS_KEY='secc_command_mastery_v1';
const USER_CONF_LS_KEY='secc_user_confidence_v1';
const CONF_SO_TARGET=8;
const CTRL_GROUP_RANDOM_PEEK=false;
const COMMAND_TIP_KEYS=Object.freeze(Array.from(new Set(HUD_KEY_TIPS.map((it)=>String(it.key||'').trim().toLowerCase()).filter(Boolean))));
const ctrlGroupEls={
  wasd:document.querySelector('[data-ctrl-group="wasd"]'),
  boost:document.querySelector('[data-ctrl-group="boost"]'),
  mouse:document.querySelector('[data-ctrl-group="mouse"]'),
  arrows:document.querySelector('[data-ctrl-group="arrows"]')
};
const ctrlGroupKeys=Object.keys(ctrlGroupEls);
const ctrlGroupHidden={wasd:false,boost:false,mouse:false,arrows:false};
let ctrlGroupPeekKey='';
let ctrlGroupPeekT=0;
let ctrlGroupNextPeek=6.0 + Math.random()*10.0;
let ctrlGroupLastPeekKey='';
let userConfDirty=false;
let userConfSaveT=0;
function loadCommandMastery(){
  const out={};
  COMMAND_TIP_KEYS.forEach((k)=>{ out[k]=false; });
  try{
    const raw=localStorage.getItem(COMMAND_MASTERY_LS_KEY);
    const p=raw ? JSON.parse(raw) : null;
    if(p && typeof p==='object'){
      COMMAND_TIP_KEYS.forEach((k)=>{ out[k]=Boolean(p[k]); });
    }
  }catch(_){}
  try{
    const hasSavedNavMode=localStorage.getItem(NAV_MODE_LS_KEY)!==null;
    if(hasSavedNavMode && Object.prototype.hasOwnProperty.call(out,'nav-mode')){
      out['nav-mode']=true;
    }
  }catch(_){}
  return out;
}
const commandMastery=loadCommandMastery();
const commandUsedSession={};
COMMAND_TIP_KEYS.forEach((k)=>{ commandUsedSession[k]=Boolean(commandMastery[k]); });
function saveCommandMastery(){
  try{ localStorage.setItem(COMMAND_MASTERY_LS_KEY, JSON.stringify(commandMastery)); }catch(_){}
}
function markCommandLearned(key){
  const k=String(key||'').trim().toLowerCase();
  if(!k || !Object.prototype.hasOwnProperty.call(commandMastery,k)) return;
  commandUsedSession[k]=true; // immediate in-session suppression
  if(commandMastery[k]) return;
  commandMastery[k]=true;
  saveCommandMastery();
}
function loadUserConfidence(){
  try{
    const raw=localStorage.getItem(USER_CONF_LS_KEY);
    const p=raw ? JSON.parse(raw) : null;
    return {
      exploredSo: (p && p.exploredSo && typeof p.exploredSo==='object') ? {...p.exploredSo} : {},
      menuTravels: Math.max(0, Number(p?.menuTravels)||0),
      coordTravels: Math.max(0, Number(p?.coordTravels)||0),
      manualMoveSec: Math.max(0, Number(p?.manualMoveSec)||0)
    };
  }catch(_){
    return { exploredSo:{}, menuTravels:0, coordTravels:0, manualMoveSec:0 };
  }
}
const userConf=loadUserConfidence();
function flushUserConfidence(force){
  if(!force && !userConfDirty) return;
  try{
    localStorage.setItem(USER_CONF_LS_KEY, JSON.stringify(userConf));
    userConfDirty=false;
    userConfSaveT=0;
  }catch(_){}
}
function markUserConfidenceDirty(){
  userConfDirty=true;
}
function confidenceMarkSo(id){
  const k=String(id||'').trim();
  if(!k) return;
  if(userConf.exploredSo[k]) return;
  userConf.exploredSo[k]=1;
  markUserConfidenceDirty();
}
function confidenceBump(field, delta){
  if(!Object.prototype.hasOwnProperty.call(userConf, field)) return;
  userConf[field]=Math.max(0, Number(userConf[field]||0) + (Number(delta)||0));
  markUserConfidenceDirty();
}
function confidenceTick(dt, moving){
  if(moving){
    userConf.manualMoveSec=Math.max(0, Number(userConf.manualMoveSec)||0) + Math.max(0, Number(dt)||0);
    markUserConfidenceDirty();
  }
  if(!userConfDirty) return;
  userConfSaveT += Math.max(0, Number(dt)||0);
  if(userConfSaveT>=2.5) flushUserConfidence(false);
}
function getUserConfidenceSummary(){
  const cmdTotal=Math.max(1, COMMAND_TIP_KEYS.length);
  const cmdKnown=COMMAND_TIP_KEYS.reduce((n,k)=>n + (commandMastery[k] ? 1 : 0),0);
  const cmdPct=cmdKnown/cmdTotal;
  const soCount=Object.keys(userConf.exploredSo||{}).length;
  const soPct=Math.min(1, soCount/CONF_SO_TARGET);
  const practice=Math.min(1, (userConf.menuTravels*0.12) + (userConf.coordTravels*0.18) + (userConf.manualMoveSec/600));
  const score=Math.round((cmdPct*0.45 + soPct*0.35 + practice*0.20)*100);
  const level=(score>=80) ? 'Alta' : (score>=50 ? 'Media' : 'Base');
  return {
    score,
    level,
    exploredSo: soCount,
    exploredTarget: CONF_SO_TARGET,
    commandsKnown: cmdKnown,
    commandsTotal: cmdTotal,
    menuTravels: Math.round(userConf.menuTravels||0),
    coordTravels: Math.round(userConf.coordTravels||0),
    moveMinutes: Math.round((Number(userConf.manualMoveSec)||0)/60)
  };
}
try{
  const raw=localStorage.getItem(CTRL_GROUP_LS_KEY);
  if(raw){
    const data=JSON.parse(raw);
    for(const k of ctrlGroupKeys){
      ctrlGroupHidden[k]=Boolean(data && data[k]);
    }
  }
}catch(_){}
function saveCtrlGroupHidden(){
  try{
    localStorage.setItem(CTRL_GROUP_LS_KEY, JSON.stringify(ctrlGroupHidden));
  }catch(_){}
}
function markCtrlGroupUsed(group){
  if(!ctrlGroupHidden[group]){
    ctrlGroupHidden[group]=true;
    saveCtrlGroupHidden();
  }
}
function setCtrlGroupPersistentVisible(group, visible){
  if(!Object.prototype.hasOwnProperty.call(ctrlGroupHidden, group)) return false;
  ctrlGroupHidden[group]=!Boolean(visible);
  saveCtrlGroupHidden();
  return true;
}
function pickCtrlGroupForPeek(){
  const hidden=ctrlGroupKeys.filter((k)=>ctrlGroupHidden[k] && ctrlGroupEls[k]);
  if(!hidden.length) return '';
  const pool=hidden.filter((k)=>k!==ctrlGroupLastPeekKey);
  const src=pool.length?pool:hidden;
  return src[(Math.random()*src.length)|0] || '';
}
function ctrlGroupFromTipKey(key){
  const k=String(key||'').toLowerCase();
  if(k==='mouse') return 'mouse';
  if(k==='arrows') return 'arrows';
  if(k==='ctrl' || k==='alt' || k==='ctrlalt') return 'boost';
  if(k==='wasd' || k==='q' || k==='e') return 'wasd';
  return '';
}
function ctrlPanelFromGroup(group){
  if(group==='wasd' || group==='boost') return 'move';
  if(group==='mouse' || group==='arrows') return 'camera';
  return '';
}
function activateTipHudForKey(key, dur=3.8){
  const g=ctrlGroupFromTipKey(key);
  const p=ctrlPanelFromGroup(g);
  if(!g || !p) return;
  tipForceGroup=g;
  tipForcePanel=p;
  tipForceT=Math.max(tipForceT, Number(dur)||0);
  setCtrlHudVisible(true);
  updateCtrlGroupVisibility(0,true);
}
function updateCtrlGroupVisibility(dt, panelsVisible){
  if(tipForceT>0){
    tipForceT=Math.max(0, tipForceT-dt);
    if(tipForceT<=0){
      tipForcePanel='';
      tipForceGroup='';
    }
  }
  if(!panelsVisible){
    ctrlGroupPeekKey='';
    ctrlGroupPeekT=0;
    return;
  }
  if(CTRL_GROUP_RANDOM_PEEK){
    if(ctrlGroupPeekT>0){
      ctrlGroupPeekT=Math.max(0, ctrlGroupPeekT-dt);
      if(ctrlGroupPeekT<=0) ctrlGroupPeekKey='';
    }else{
      ctrlGroupNextPeek-=dt;
      if(ctrlGroupNextPeek<=0){
        const k=pickCtrlGroupForPeek();
        if(k){
          ctrlGroupPeekKey=k;
          ctrlGroupLastPeekKey=k;
          ctrlGroupPeekT=1.0 + Math.random()*1.8;
        }
        ctrlGroupNextPeek=5.5 + Math.random()*11.5;
      }
    }
  }else{
    ctrlGroupPeekKey='';
    ctrlGroupPeekT=0;
  }
  for(const k of ctrlGroupKeys){
    const el=ctrlGroupEls[k];
    if(!el) continue;
    const show=(!ctrlGroupHidden[k]) || (ctrlGroupPeekKey===k) || (tipForceGroup===k && tipForceT>0);
    el.classList.toggle('is-group-hidden', !show);
  }
}
function markUsedControlGroupsFromInput(){
  const moveHeld=Boolean(keys['w']||keys['a']||keys['s']||keys['d']||keys['q']||keys['e']);
  if(moveHeld){
    markCtrlGroupUsed('wasd');
    if(keys['w']||keys['a']||keys['s']||keys['d']) markCommandLearned('wasd');
    if(keys['q']) markCommandLearned('q');
    if(keys['e']) markCommandLearned('e');
  }
  // Boost controls are valid also while stationary.
  if(keys['control']||keys['ctrl']||keys['alt']){
    markCtrlGroupUsed('boost');
    if(keys['control']||keys['ctrl']) markCommandLearned('ctrl');
    if(keys['alt']) markCommandLearned('alt');
    if((keys['control']||keys['ctrl']) && keys['alt']) markCommandLearned('ctrlalt');
  }
  if(keys['arrowup']||keys['arrowdown']||keys['arrowleft']||keys['arrowright']){
    markCtrlGroupUsed('arrows');
    markCommandLearned('arrows');
    if((keys['control']||keys['ctrl']) && (keys['arrowleft']||keys['arrowright'])) markCommandLearned('roll');
  }
  if(dragging || rightMoveActive){
    markCtrlGroupUsed('mouse');
    markCommandLearned('mouse');
  }
}
function isHudTipLearned(key){
  const k=String(key||'').trim().toLowerCase();
  if(k && Object.prototype.hasOwnProperty.call(commandMastery,k)){
    return Boolean(commandMastery[k] || commandUsedSession[k]);
  }
  const g=ctrlGroupFromTipKey(k);
  if(!g) return false;
  return Boolean(ctrlGroupHidden[g]);
}
function hasVisibleGroupForPanel(panel){
  if(panel==='move'){
    return (!ctrlGroupHidden.wasd) || (!ctrlGroupHidden.boost);
  }
  if(panel==='camera'){
    return (!ctrlGroupHidden.mouse) || (!ctrlGroupHidden.arrows);
  }
  return false;
}
function exposeCtrlGroupApi(){
  const api=window.SECC_HUD || (window.SECC_HUD={});
  api.setControlGroupVisible=(group,visible)=>setCtrlGroupPersistentVisible(String(group||''), Boolean(visible));
  api.resetControlGroups=()=>{
    for(const k of ctrlGroupKeys) ctrlGroupHidden[k]=false;
    saveCtrlGroupHidden();
  };
}
exposeCtrlGroupApi();


function hideHudKeyTip(){
  if(!hudKeyTipEl) return;
  hudKeyTipEl.classList.remove('on','below','fixed-corner');
  hudKeyTipEl.style.left='';
  hudKeyTipEl.style.top='';
  tipForcePanel='';
  tipForceGroup='';
  tipForceT=0;
}

function showHudKeyTip(entry, opts){
  if(!hudKeyTipEl || !entry) return;
  const fixedCorner=Boolean(opts && opts.fixedCorner);
  activateTipHudForKey(entry.key, 3.8);
  const tipGroup=ctrlGroupFromTipKey(entry.key);
  const tipPanel=ctrlPanelFromGroup(tipGroup);
  const target=document.querySelector(entry.sel)
    || (tipPanel==='move' ? hudMoveEl : (tipPanel==='camera' ? hudCameraEl : null));
  if(!fixedCorner && !(target instanceof HTMLElement)) return;

  hudKeyTipEl.textContent=entry.text;
  hudKeyTipEl.classList.remove('below','fixed-corner');
  if(fixedCorner){
    hudKeyTipEl.classList.add('fixed-corner','on');
  }else{
    hudKeyTipEl.style.left='-9999px';
    hudKeyTipEl.style.top='-9999px';
    hudKeyTipEl.classList.add('on');

    const tr=target.getBoundingClientRect();
    const hr=hudKeyTipEl.getBoundingClientRect();
    const tw=Math.max(80, hr.width||0);
    const pad=12;
    let x=tr.left + tr.width*0.5;
    x=Math.max(pad + tw*0.5, Math.min((window.innerWidth||0) - pad - tw*0.5, x));

    let y=tr.top - 8;
    if(y<56){
      y=tr.bottom + 8;
      hudKeyTipEl.classList.add('below');
    }

    hudKeyTipEl.style.left=`${Math.round(x)}px`;
    hudKeyTipEl.style.top=`${Math.round(y)}px`;
  }
  hudTipLastKey=entry.key || '';

  clearTimeout(hudTipHideTimer);
  hudTipHideTimer=window.setTimeout(hideHudKeyTip, 3600);
}

function pickHudKeyTip(){
  const items=HUD_KEY_TIPS.filter((it)=>{
    const el=document.querySelector(it.sel);
    return (el instanceof HTMLElement) && !isHudTipLearned(it.key);
  });
  if(!items.length) return null;
  const pool=items.filter((it)=>it.key!==hudTipLastKey);
  const src=pool.length?pool:items;
  return src[(Math.random()*src.length)|0] || null;
}

function isGuideOverlayOpen(){
  const g=window.SECC_GUIDE;
  return !!(g && typeof g.isOpen==='function' && g.isOpen());
}

function scheduleHudKeyTips(){
  clearTimeout(hudTipLoopTimer);
  const wait=4500 + Math.random()*2500;
  hudTipLoopTimer=window.setTimeout(()=>{
    if(isGuideOverlayOpen()){
      hideHudKeyTip();
      scheduleHudKeyTips();
      return;
    }
    const tip=pickHudKeyTip();
    if(tip) showHudKeyTip(tip, { fixedCorner:true });
    scheduleHudKeyTips();
  }, wait);
}

function initHudKeyTips(){
  if(!hudKeyTipEl) return;
  window.addEventListener('resize', hideHudKeyTip, {passive:true});
  window.setTimeout(()=>{
    if(isGuideOverlayOpen()){
      scheduleHudKeyTips();
      return;
    }
    const first=pickHudKeyTip();
    if(first) showHudKeyTip(first, { fixedCorner:true });
    scheduleHudKeyTips();
  }, 800);
}
let objectSearchIndex=[];
let objectSearchMatch=null;
function normSearchText(s){
  return String(s||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}
function formatDarhShortFromPos(pos){
  const c=calcDarhFromPos(pos);
  if(!c) return 'D --.-- | A +--.- | R ---';
  const d=Number.isFinite(c.dUa) ? c.dUa.toFixed(2) : '--.--';
  const a=Number.isFinite(c.aDeg) ? `${c.aDeg>=0?'+':'-'}${Math.abs(c.aDeg).toFixed(1)}` : '+--.-';
  const r=Number.isFinite(c.rDeg) ? String(((Math.round(c.rDeg)%360)+360)%360).padStart(3,'0') : '---';
  return `D ${d} | A ${a} | R ${r}`;
}
function rebuildObjectSearchIndex(){
  objectSearchIndex=[];
  objectSearchMatch=null;
  if(!(coordRegistry && typeof coordRegistry.all==='function')) return;
  const items=coordRegistry.all();
  for(let i=0;i<items.length;i++){
    const entry=items[i];
    if(!isAttachEligibleEntry(entry)) continue;
    if(!(Array.isArray(entry.pos) && entry.pos.length===3)) continue;
    const label=attachLabelForEntry(entry);
    const tokens=`${label} ${String(entry.id||'')} ${String(entry.kind||'')}`;
    objectSearchIndex.push({
      entry,
      label,
      tokensNorm:normSearchText(tokens),
      darh:formatDarhShortFromPos(entry.pos)
    });
  }
}
function updateObjectSearchPreview(raw){
  const q=normSearchText(raw);
  if(!q){
    objectSearchMatch=null;
    if(objSearchInfoEl) objSearchInfoEl.textContent='-';
    return;
  }
  const hits=objectSearchIndex.filter((it)=>it.tokensNorm.includes(q));
  objectSearchMatch=hits.length ? hits[0] : null;
  if(!objSearchInfoEl) return;
  if(!objectSearchMatch){
    objSearchInfoEl.textContent='Nessun oggetto';
    return;
  }
  const suffix=(hits.length>1) ? ` (+${hits.length-1})` : '';
  objSearchInfoEl.textContent=`${objectSearchMatch.label} | ${objectSearchMatch.darh}${suffix}`;
}
function insertObjectSearchMatchInAutopilot(){
  if(!objectSearchMatch || !objectSearchMatch.entry) return;
  const entry=objectSearchMatch.entry;
  const pose=getEntryDarrPose(entry);
  if(!(pose && Array.isArray(pose.pos) && pose.pos.length===3)) return;
  const c=calcDarhFromPos(pose.pos);
  if(!c) return;
  if(typeof openCoordEdit==='function') openCoordEdit();
  if(typeof coordEditDistEl!=='undefined' && coordEditDistEl){
    coordEditDistEl.value=`${Math.max(0,c.dUa).toFixed(2)} UA`;
  }
  if(typeof coordEditAzEl!=='undefined' && coordEditAzEl){
    coordEditAzEl.value=(Number.isFinite(c.aDeg) ? c.aDeg : 0).toFixed(1);
  }
  if(typeof coordEditRilEl!=='undefined' && coordEditRilEl){
    coordEditRilEl.value=String(((Math.round(c.rDeg||0)%360)+360)%360);
  }
  if(objSearchInfoEl){
    objSearchInfoEl.textContent=`Coordinate inserite: ${objectSearchMatch.label}`;
  }
}
function setNavigatorCoordFieldsFromPos(pos, label){
  const c=calcDarhFromPos(pos);
  if(!c) return false;
  if(typeof coordEditDistEl!=='undefined' && coordEditDistEl){
    coordEditDistEl.value=`${Math.max(0,c.dUa).toFixed(2)} UA`;
  }
  if(typeof coordEditAzEl!=='undefined' && coordEditAzEl){
    coordEditAzEl.value=(Number.isFinite(c.aDeg) ? c.aDeg : 0).toFixed(1);
  }
  if(typeof coordEditRilEl!=='undefined' && coordEditRilEl){
    coordEditRilEl.value=String(((Math.round(c.rDeg||0)%360)+360)%360);
  }
  if(objSearchInfoEl){
    objSearchInfoEl.textContent=`Coordinate inserite: ${String(label||'destinazione')}`;
  }
  return true;
}
let navTransferAttachEntry = null;
let navTransferForceClearAttach = false;
function executeSystemNavigatorTransfer(destPos, lookPos, opts){
  const o=(opts && typeof opts==='object') ? opts : {};
  // Every transfer starts detached from previous target/SO.
  clearAttachedTargetState();
  if(activeNodeId){
    activeNodeId=null;
    SECC_HUD.syncSoHud({activeNodeId, camPos});
  }
  navTransferAttachEntry=o.attachEntry || null;
  navTransferForceClearAttach=!navTransferAttachEntry;
  coordNavDockArm=Boolean(o.coordNavDockArm);
  startNavTravelToPos(destPos, lookPos);
}
function routeSoSelectionViaNavigator(toId){
  const id=String(toId||'').trim();
  if(!id) return;
  if(id==='landingzone'){
    setNavigatorCoordFieldsFromPos(INITIAL_LANDING_POSE.pos, 'Landing Zone');
    executeSystemNavigatorTransfer(INITIAL_LANDING_POSE.pos, INITIAL_LANDING_POSE.target, {
      coordNavDockArm:false,
      attachEntry:null
    });
    return;
  }
  if(!MENU_DEFS[id] || !NAV_NODES[id]) return;
  const center=nodeCenter(id);
  const soEntry=getRegistryEntry('so', id) || { kind:'so', id, pos:center };
  const pose=getEntryDarrPose(soEntry, { centerOnTarget:true }) || { pos:center, look:center };
  const destPos=(Array.isArray(pose.pos) && pose.pos.length===3) ? pose.pos : center;
  const lookPos=(Array.isArray(pose.look) && pose.look.length===3) ? pose.look : center;
  setNavigatorCoordFieldsFromPos(destPos, SO_LABELS[id] || `SO ${id.toUpperCase()}`);
  executeSystemNavigatorTransfer(destPos, lookPos, {
    coordNavDockArm:true,
    attachEntry:soEntry
  });
}

function resolveCurrentSoId(){
  if(activeNodeId && MENU_DEFS[activeNodeId]){
    if(distToSoCenter(activeNodeId) <= SO_RELEASE_RADIUS) return activeNodeId;
    return null;
  }
  return null;
}
function clearAttachedTargetState(){
  attachedCoordKey='';
  attachedCoordPos=null;
  attachedCoordReleaseWU=SO_RELEASE_RADIUS;
  if(SECC_HUD && typeof SECC_HUD.setCommTargetLabel==='function'){
    SECC_HUD.setCommTargetLabel('');
  }
}
function forceAttachEntry(entry, opts){
  if(!entry) return false;
  const key=`${String(entry.kind||'object')}:${String(entry.id||'')}`;
  const c=entryCenterPos(entry) || (Array.isArray(entry.pos) ? [entry.pos[0],entry.pos[1],entry.pos[2]] : null);
  if(!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || !Number.isFinite(c[2])) return false;
  attachedCoordKey=key;
  attachedCoordPos=c;
  attachedCoordReleaseWU=entryReleaseRangeWU(entry);
  if(entry.kind==='so' && entry.id && MENU_DEFS[entry.id]){
    // Ensure SO visual system is actually active (rings/cards/orbits) after attach/teleport.
    if(menuId!==entry.id){
      applyMenu(entry.id);
    }
    activeNodeId=entry.id;
    SECC_HUD.syncSoHud({activeNodeId, camPos});
  }
  const silent=Boolean(opts && opts.silent);
  if(!silent){
    showCommsAttachToast(entry);
  }else if(SECC_HUD && typeof SECC_HUD.setCommTargetLabel==='function'){
    SECC_HUD.setCommTargetLabel(attachLabelForEntry(entry));
  }
  return true;
}
function nearestAttachableForPos(pos){
  if(!(Array.isArray(pos) && pos.length===3)) return null;
  const n=nearestAttachableRegistryEntry(pos);
  if(!n || !Number.isFinite(n.d2)) return null;
  const d=Math.sqrt(Math.max(0,n.d2));
  const allow=Math.max(4.0, entryAttachRangeWU(n));
  return (d<=allow) ? n : null;
}
function buildSoDirectPageMap(){
  const map={};
  Object.keys(MENU_DEFS||{}).forEach((id)=>{
    const def=MENU_DEFS[id]||{};
    const center=def.centerCard||{};
    const first=Array.isArray(def.marbles) ? def.marbles.find((m)=>m && m.href) : null;
    const url=String(center.href || first?.href || 'pages/algoritmi/').trim();
    map[id]={
      url: url || 'pages/algoritmi/',
      label: SO_LABELS[id] || `SO ${String(id||'').toUpperCase()}`
    };
  });
  map.root=map.root || { url:'pages/algoritmi/', label:'Oracle Experience' };
  map.landingzone={ url:'pages/algoritmi/', label:'Landing Zone' };
  return Object.freeze(map);
}
const SO_DIRECT_PAGE_MAP=buildSoDirectPageMap();
function quickFadeTeleport(action){
  if(!quickTeleportFadeEl){
    if(typeof action==='function') action();
    return;
  }
  quickTeleportFadeEl.classList.add('on');
  window.setTimeout(()=>{
    if(typeof action==='function') action();
  }, 55);
  window.setTimeout(()=>{
    quickTeleportFadeEl.classList.remove('on');
  }, 120);
}
function startExitSiteFade(){
  if(exitSiteSequence && exitSiteSequence.phase==='fading') return;
  if(!exitSiteSequence){
    exitSiteSequence={ phase:'fading', lookPos:null, targetPos:null, fadeTriggerWU:0, startedAtMs:performance.now() };
  }else{
    exitSiteSequence.phase='fading';
  }
  if(quickTeleportFadeEl){
    quickTeleportFadeEl.style.transition='opacity .95s ease';
    quickTeleportFadeEl.classList.add('on');
  }
  window.setTimeout(()=>{
    window.location.href=EXIT_SITE_HREF;
  }, 920);
}
function startExitSiteSequence(){
  if(exitSiteSequence && exitSiteSequence.phase==='fading') return;
  if(phase!=='done' || !ctrlOn || menuTrans || navTrans){
    startExitSiteFade();
    return;
  }
  const controlEntry=getRegistryEntry('object','controlchaos');
  let lookPos=(controlEntry && Array.isArray(controlEntry.pos)) ? [controlEntry.pos[0],controlEntry.pos[1],controlEntry.pos[2]] : null;
  if(!lookPos && cosmicWord && Array.isArray(cosmicWord.anchor) && cosmicWord.anchor.length===3){
    lookPos=[cosmicWord.anchor[0], cosmicWord.anchor[1], cosmicWord.anchor[2]];
  }
  if(!lookPos){
    startExitSiteFade();
    return;
  }
  const pose=getEntryDarrPose(controlEntry || { kind:'object', id:'controlchaos', pos:lookPos }, { centerOnTarget:true, yawOffsetRad:0 });
  let targetPos=(pose && Array.isArray(pose.pos) && pose.pos.length===3) ? [pose.pos[0],pose.pos[1],pose.pos[2]] : [...camPos];
  const toTarget=vsub(targetPos, lookPos);
  const baseDist=Math.sqrt(vdot(toTarget,toTarget));
  if(Number.isFinite(baseDist) && baseDist>EXIT_CC_APPROACH_WU){
    const dir=vnorm(toTarget);
    targetPos=vadd(lookPos, vscl(dir, EXIT_CC_APPROACH_WU));
  }

  clearAttachedTargetState();
  if(activeNodeId){
    activeNodeId=null;
    SECC_HUD.syncSoHud({activeNodeId, camPos});
  }
  startAutopilotTravel('pos', targetPos, {
    lookPos,
    attachEntry:controlEntry || null
  });
  exitSiteSequence={
    phase:'travel',
    lookPos,
    targetPos,
    fadeTriggerWU:EXIT_CC_APPROACH_WU + EXIT_CC_FADE_EXTRA_WU,
    startedAtMs:performance.now()
  };
}
function tickExitSiteSequence(){
  if(!exitSiteSequence || exitSiteSequence.phase!=='travel') return;
  if(!Array.isArray(exitSiteSequence.lookPos) || exitSiteSequence.lookPos.length!==3){
    startExitSiteFade();
    return;
  }
  const toLook=vsub(exitSiteSequence.lookPos, camPos);
  const dist=Math.sqrt(vdot(toLook,toLook));
  const dir=vnorm(toLook);
  const approachSpeed=vdot(camVel, dir);
  const elapsed=performance.now()-exitSiteSequence.startedAtMs;
  const closeAndApproaching=(dist<=exitSiteSequence.fadeTriggerWU && approachSpeed>=EXIT_CC_FADE_MIN_APPROACH_SPD);
  const closeAndSettled=(dist<=exitSiteSequence.fadeTriggerWU && !autoPilot);
  const timeout=elapsed>=EXIT_CC_MAX_TRAVEL_MS;
  if(closeAndApproaching || closeAndSettled || timeout){
    startExitSiteFade();
  }
}
function navigateSoByMode(toId){
  const id=String(toId||'').trim();
  if(!id) return;
  if(isNormalMode()){
    const pg=SO_DIRECT_PAGE_MAP[id] || SO_DIRECT_PAGE_MAP.root;
    SECC_GLASS.openPage(pg.url, pg.label || 'Pagina');
    return;
  }
  routeSoSelectionViaNavigator(id);
}
function openHrefByMode(url,label){
  const u=String(url||'').trim();
  if(!u) return;
  if(isNormalMode() || isHalfExplorerMode()){
    if(/^(https?:)?\/\//i.test(u)){
      window.location.href=u;
      return;
    }
    SECC_GLASS.openPage(u, label || 'Pagina');
    return;
  }
  startHrefWarp(u);
}
if(soSelectEl){
  soSelectEl.addEventListener('change',()=>{
    const toId=soSelectEl.value;
    if(!toId) return;
    if(toId===SO_SELECT_EXIT_VALUE){
      soSelectEl.value='';
      startExitSiteSequence();
      return;
    }
    markCommandLearned('soselect');
    routeSoSelectionViaNavigator(toId);
    soSelectEl.value = '';
  });
}
if(objSearchInputEl){
  objSearchInputEl.addEventListener('input',()=>{
    updateObjectSearchPreview(objSearchInputEl.value);
  });
  objSearchInputEl.addEventListener('keydown',(e)=>{
    if(e.key==='Enter'){
      e.preventDefault();
      insertObjectSearchMatchInAutopilot();
    }
  });
}
if(objSearchGoEl){
  objSearchGoEl.addEventListener('click',()=>{
    insertObjectSearchMatchInAutopilot();
  });
}
SECC_HUD.init({soSelectEl, soCurrentEl});
SECC_HUD.refreshSoSelectDarhLabels();
initHudKeyTips();

// â”€â”€â”€ WEBGL SETUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const cv=document.getElementById('c');
const gl=cv.getContext('webgl2')||cv.getContext('webgl');
if(!gl){
  document.body.innerHTML=`
    <main style="min-height:100vh;padding:40px 18px;max-width:920px;margin:0 auto;font-family:system-ui,Segoe UI,Roboto,Arial;color:#f5f0e6">
      <h1 style="font-size:34px;line-height:1.05;margin:0 0 10px">SuperEnalotto Control Chaos</h1>
      <p style="opacity:.75;margin:0 0 22px">WebGL non disponibile. Puoi comunque navigare il sito:</p>
      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li><a style="color:#e8c87a" href="pages/algoritmi/">Algoritmi</a></li>
        <li><a style="color:#e8c87a" href="pages/analisi-statistiche/">Dashboard</a></li>
        <li><a style="color:#e8c87a" href="pages/storico-estrazioni/">Archivio estrazioni</a></li>
        <li><a style="color:#e8c87a" href="pages/ranking/">Ranking</a></li>
        <li><a style="color:#e8c87a" href="pages/oracle/">Oracle</a></li>
        <li><a style="color:#e8c87a" href="pages/contatti-chi-siamo/">Chi siamo</a></li>
      </ul>
    </main>`;
  return;
}
gl.getExtension('OES_element_index_uint');

function applySceneViewport(force){
  const d=Math.min(devicePixelRatio||1,2);
  const x=0;
  const y=0;
  const w=Math.max(1,Math.round(W()*d));
  const h=Math.max(1,Math.round(H()*d));
  if(!force && x===sceneVpGl.x && y===sceneVpGl.y && w===sceneVpGl.w && h===sceneVpGl.h) return;
  sceneVpGl={x,y,w,h};
  gl.viewport(x,y,w,h);
}

function resize(){
  const d=Math.min(devicePixelRatio||1,2);
  const w=W()*d|0;
  const h=H()*d|0;
  if(w!==cv.width || h!==cv.height){
    cv.width=w; cv.height=h;
  }
  syncSceneViewport();
  applySceneViewport(true);
}
resize(); window.addEventListener('resize',resize);

function glShader(type,src){
  const s=gl.createShader(type);
  gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)+'\n'+src);
  return s;
}
function glProg(vs,fs){
  const p=gl.createProgram();
  gl.attachShader(p,glShader(gl.VERTEX_SHADER,vs));
  gl.attachShader(p,glShader(gl.FRAGMENT_SHADER,fs));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
  return p;
}
function glBuf(data,tgt,usage){
  tgt=tgt||gl.ARRAY_BUFFER; usage=usage||gl.STATIC_DRAW;
  const b=gl.createBuffer(); gl.bindBuffer(tgt,b); gl.bufferData(tgt,data,usage); return b;
}

// Right-button travel: move along the ray defined by the pointer.
let rightMoveActive=false;
let rightMoveDir=[0,0,1];
function pointerDirFromScreen(px,py){
  const rect=cv.getBoundingClientRect();
  if(rect.width<=0 || rect.height<=0) return null;
  const nx=((px-rect.left)/rect.width)*2 - 1;
  const ny=1 - ((py-rect.top)/rect.height)*2;
  if(nx<-1||nx>1||ny<-1||ny>1) return null;
  const tanY=(Number.isFinite(projM?.[5]) && Math.abs(projM[5])>1e-6) ? (1/projM[5]) : Math.tan(BASE_FOVY*0.5);
  const tanX=(Number.isFinite(projM?.[0]) && Math.abs(projM[0])>1e-6) ? (1/projM[0]) : (tanY*(rect.width/Math.max(1,rect.height)));
  const f=vnorm(camFwd);
  const u=vnorm(camUp);
  const r=basisRightFromFU(f,u);
  const d=vadd(vadd(f, vscl(r, nx*tanX)), vscl(u, ny*tanY));
  return vnorm(d);
}
function crosshairAimDir(){
  const aim=currentAimTargetPos();
  const d=pointerDirFromScreen(aim[0], aim[1]);
  return d || vnorm(camFwd);
}
function isPow2(v){ v|=0; return v>0 && (v & (v-1))===0; }
function glTex(canvas){
  const t=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
  // Mipmaps require power-of-two textures in WebGL1. Cards can be 15:10, so handle NPOT safely.
  const pot = isPow2(canvas.width) && isPow2(canvas.height);
  if(pot){
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  }else{
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  }
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return t;
}

// â”€â”€â”€ GEOMETRY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildSphere(rad,nl,nm){
  const p=[],n=[],uv=[],idx=[];
  for(let i=0;i<=nl;i++){
    const phi=PI*i/nl, sp=Math.sin(phi), cp=Math.cos(phi);
    for(let j=0;j<=nm;j++){
      const th=TAU*j/nm, st=Math.sin(th), ct=Math.cos(th);
      const x=sp*ct, y=cp, z=sp*st;
      p.push(x*rad,y*rad,z*rad);
      n.push(x,y,z);
      uv.push(j/nm, i/nl);
    }
  }
  for(let i=0;i<nl;i++) for(let j=0;j<nm;j++){
    const a=i*(nm+1)+j, b=a+nm+1;
    idx.push(a,b,a+1, b,b+1,a+1);
  }
  return{p:new Float32Array(p),n:new Float32Array(n),uv:new Float32Array(uv),i:new Uint16Array(idx)};
}

// Sphere buffers
const SG=buildSphere(0.48,44,44);
const sp_p=glBuf(SG.p), sp_n=glBuf(SG.n), sp_uv=glBuf(SG.uv);
const sp_i=glBuf(SG.i,gl.ELEMENT_ARRAY_BUFFER);
const sp_cnt=SG.i.length;

const IG=buildSphere(0.56,44,44); // intro ball
const ib_p=glBuf(IG.p),ib_n=glBuf(IG.n),ib_uv=glBuf(IG.uv);
const ib_i=glBuf(IG.i,gl.ELEMENT_ARRAY_BUFFER);
const ib_cnt=IG.i.length;

// Quad geometry for 3D cards (centered, Z=0 plane)
const QP=new Float32Array([
  -0.5,-0.5,0,
   0.5,-0.5,0,
   0.5, 0.5,0,
  -0.5, 0.5,0,
]);
const QU=new Float32Array([
  0,0,
  1,0,
  1,1,
  0,1,
]);
const QI=new Uint16Array([0,1,2, 0,2,3]);
const q_p=glBuf(QP);
const q_uv=glBuf(QU);
const q_i=glBuf(QI,gl.ELEMENT_ARRAY_BUFFER);
const q_cnt=QI.length;

// Orbit dust: irregular sparkling points (diamond-powder feel)
function buildOrbitDust(radius, ringIdx){
  const count = 1500 + ringIdx * 320;
  const p = new Float32Array(count*3);
  const s = new Float32Array(count);
  for(let i=0;i<count;i++){
    const a = (i/count)*TAU + (Math.random()-0.5)*0.08;
    const radialNoise = (Math.random()-0.5) * (0.22 + ringIdx*0.06);
    const centerPull = Math.cos(a*3.2 + ringIdx*0.7) * 0.11;
    const rr = radius + radialNoise - centerPull;
    const y = BASE_Y + (Math.random()-0.5) * (0.05 + ringIdx*0.015);
    const i3 = i*3;
    const rp = ringPoint(ringIdx, Math.cos(a)*rr, y, Math.sin(a)*rr);
    p[i3] = rp[0];
    p[i3+1] = rp[1];
    p[i3+2] = rp[2];
    s[i] = Math.random();
  }
  return {p,s,count};
}

// Build orbit dust for an arbitrary ring-rotation set (used by map/ghost systems).
function buildOrbitDustWithRot(radius, ringIdx, ringRot){
  const count = 1500 + ringIdx * 320;
  const p = new Float32Array(count*3);
  const s = new Float32Array(count);
  const rot = ringRot[ringIdx];
  for(let i=0;i<count;i++){
    const a = (i/count)*TAU + (Math.random()-0.5)*0.08;
    const radialNoise = (Math.random()-0.5) * (0.22 + ringIdx*0.06);
    const centerPull = Math.cos(a*3.2 + ringIdx*0.7) * 0.11;
    const rr = radius + radialNoise - centerPull;
    const y = BASE_Y + (Math.random()-0.5) * (0.05 + ringIdx*0.015);
    const i3 = i*3;
    const rp = xfm3(rot, Math.cos(a)*rr, y, Math.sin(a)*rr);
    p[i3] = rp[0];
    p[i3+1] = rp[1];
    p[i3+2] = rp[2];
    s[i] = Math.random();
  }
  return {p,s,count};
}
let orbitDustBuf = [];
function rebuildOrbitDustBuf(){
  orbitDustBuf.forEach(tb=>{
    if(tb?.p) gl.deleteBuffer(tb.p);
    if(tb?.seed) gl.deleteBuffer(tb.seed);
  });
  orbitDustBuf = mSt.map((s,i)=>{
    const radius = Number.isFinite(s.orbitR) ? s.orbitR : ((RINGS[s.ri]||RINGS[0]||{r:2.0}).r);
    const g = buildMarbleOrbitDust(radius, i, s.orbitRot);
    return { p: glBuf(g.p), seed: glBuf(g.s), cnt: g.count, ri:s.ri };
  });
}
// â”€â”€â”€ NUMBER TEXTURES (canvas â†’ WebGL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function contrastTextPalette(rgb){
  return {fill:[0,0,0], stroke:[0,0,0]};
}

function makeNumTex(val, baseRgb){
  const cv2=document.createElement('canvas');
  cv2.width=512; cv2.height=512;
  const c=cv2.getContext('2d');
  const pal=contrastTextPalette(baseRgb||[0.7,0.7,0.7]);
  c.clearRect(0,0,512,512);
  c.textAlign='center'; c.textBaseline='middle'; c.lineJoin='round';
  c.font='700 400px "Palatino Linotype",Palatino,"Times New Roman",serif';
  // Outer shadow for depth.
  c.lineWidth=22; c.strokeStyle='rgba(0,0,0,0.9)';
  c.strokeText(String(val),256,280);
  // Letter color always opposite to container.
  c.lineWidth=6; c.strokeStyle=`rgba(${pal.stroke[0]},${pal.stroke[1]},${pal.stroke[2]},0.98)`;
  c.strokeText(String(val),256,280);
  c.fillStyle=`rgba(${pal.fill[0]},${pal.fill[1]},${pal.fill[2]},1.0)`;
  c.fillText(String(val),256,280);
  return glTex(cv2);
}

function makeLabelTex(txt, baseRgb, sizeMul){
  const cv2=document.createElement('canvas');
  cv2.width=1024; cv2.height=1024;
  const c=cv2.getContext('2d');
  const pal=contrastTextPalette(baseRgb||CORE_GOLD);
  c.clearRect(0,0,1024,1024);
  c.textAlign='center'; c.textBaseline='middle'; c.lineJoin='round';
  const fs = (txt.length>12 ? 122 : 148) * (sizeMul||1);
  c.font=`600 ${fs}px "Cormorant Garamond","Palatino Linotype",serif`;
  c.lineWidth=42; c.strokeStyle='rgba(0,0,0,0.72)';
  c.strokeText(txt,512,560);
  c.lineWidth=12; c.strokeStyle=`rgba(${pal.stroke[0]},${pal.stroke[1]},${pal.stroke[2]},0.95)`;
  c.strokeText(txt,512,560);
  c.fillStyle=`rgba(${pal.fill[0]},${pal.fill[1]},${pal.fill[2]},1.0)`;
  c.fillText(txt,512,560);
  return glTex(cv2);
}

function rrPath(c,x,y,w,h,r){
  const rr = Math.min(r, w*0.5, h*0.5);
  c.beginPath();
  c.moveTo(x+rr, y);
  c.arcTo(x+w, y,   x+w, y+h, rr);
  c.arcTo(x+w, y+h, x,   y+h, rr);
  c.arcTo(x,   y+h, x,   y,   rr);
  c.arcTo(x,   y,   x+w, y,   rr);
  c.closePath();
}

const _cardImgCache = new Map(); // src -> {img, ready}
let _cardRebuildQueued = false;
function queueCardRebuild(){
  if(_cardRebuildQueued) return;
  _cardRebuildQueued = true;
  requestAnimationFrame(()=>{
    _cardRebuildQueued = false;
    // Rebuild 3D carousel textures (cards.json can update after async load/images).
    rebuildCardCarousel();
    // Refresh any visible map systems using card LOD.
    try{
      for(const inst of MAP_SYSTEMS.values()){
        if(inst && inst.texMode==='card') upgradeMapSystemTextures(inst,'card',true);
      }
    }catch(_e){}
  });
}
function getCardImg(src){
  if(!src) return null;
  const key=String(src);
  const hit=_cardImgCache.get(key);
  if(hit) return hit;
  const img=new Image();
  const rec={img, ready:false};
  _cardImgCache.set(key, rec);
  img.onload=()=>{ rec.ready=true; queueCardRebuild(); };
  img.onerror=()=>{ rec.ready=false; };
  img.src=key;
  return rec;
}

// Cards "source of truth": SECC cards built from card.json (aggregated in data/*cards-index.json).
const CARD_DB = {
  ready:false,
  byBase:new Map(), // normalized base "pages/.../" -> card
};
async function loadSeccCardDb(){
  const paths=[
    'data/cards-index.json',
    'data/algorithms-spotlight/cards-index.json'
  ];
  const all=[];
  for(const p of paths){
    try{
      const r=await fetch(p,{cache:'no-store'});
      if(!r.ok) continue;
      const j=await r.json();
      if(Array.isArray(j)) all.push(...j);
    }catch(_e){}
  }
  CARD_DB.byBase.clear();
  all.forEach((raw)=>{
    if(!raw || typeof raw!=='object') return;
    const base=normBasePath(raw.cardBase||raw.page||'');
    if(!base) return;
    const card={...raw};
    card.cardBase=base;
    CARD_DB.byBase.set(base, card);
  });
  CARD_DB.ready=true;
  queueCardRebuild();
}

// loadCommsMessages, glass/guide DOM, guide-overlay, glass-comms
// estratti in SECC_GLASS (glass-comms.js) e SECC_GUIDE (guide-overlay.js)
// init() chiamato dopo la definizione di coordEditOpen (vedi fine IIFE)

function marbleCardDef(md){
  const ringName=(RINGS[md.ring]||RINGS[0]||{name:'Menu'}).name;
  const href=String(md?.href||'');
  const base=normBasePath(md?.cardBase || href);
  const card=(CARD_DB.ready && base) ? CARD_DB.byBase.get(base) : null;

  if(card){
    const kicker = String(card.statusTag || card.type || card.macroGroup || ringName).toUpperCase();
    const title  = String(card.title || md.name || '');
    const subtitle = String(card.subtitle || '').trim() || prettyPathLabel(href, ringName);
    return{
      title,
      subtitle,
      kicker,
      img: resolveCardImage(card),
      lastUpdated: String(card.lastUpdated||'').trim(),
      hasNews: Boolean(card.hasNews || card.featured || (Array.isArray(card.news)&&card.news.length)),
      accessTier: String(card.accessTier||'off'),
    };
  }

  // Fallback if the card.json index doesn't contain an entry.
  return{
    title: md?.name || '',
    subtitle: prettyPathLabel(href, ringName),
    kicker: ringName.toUpperCase(),
    img: ''
  };
}

function rebuildShelf(){
  // No-op (kept only because some older callbacks call rebuildShelf()).
}

function makeCardTex(md, baseRgb){
  const deps={
    CORE_GOLD,
    contrastTextPalette,
    marbleCardDef,
    getCardImg,
    rrPath,
    TAU,
    glTex,
  };
  if(window.CARDS && typeof window.CARDS.makeOrbitCardTexture==='function'){
    const sharedTex=window.CARDS.makeOrbitCardTexture({ md, baseRgb, deps });
    if(sharedTex) return sharedTex;
  }
  return window.SECC_CARD_TEXTURE.makeCardTex(md, baseRgb, deps);
}

function rebuildCardCarousel(){
  // Build a 3D "vetrina a ruota" near the active system.
  // Cards come from cards.json (CARD_DB) via marbleCardDef().
  cardTex.forEach(t=>{ if(t) gl.deleteTexture(t); });
  cardTex=[];
  cardSt=[];
  cardDraw=[];
  if(centerCardTex){
    try{ gl.deleteTexture(centerCardTex); }catch(_e){}
    centerCardTex=null;
    centerCardTexKey='';
  }

  const N=(MARBLES||[]).length;
  if(!N) return;

  const maxR=Math.max(...(RINGS||[]).map(r=>r.r||0), 7.0);
  // Centered carousel, closer to the system center, placed above the orbits.
  // Slightly wider radius to accommodate portrait cards (same relative format as static site cards).
  const rad=clamp(maxR*0.72, 3.5, 6.4);
  const y=2.85;

  for(let i=0;i<N;i++){
    const md=MARBLES[i];
    const ringCol=(RINGS[md.ring]||RINGS[0]||{col:CORE_GOLD}).col;
    const tex=makeCardTex(md, ringCol);
    cardTex.push(tex);
    cardSt.push({
      i,
      md,
      baseA:(i/N)*TAU,
      rad,
      y,
      // Portrait card footprint aligned to static cards ratio (~0.60 w/h).
      w:2.16,
      h:3.60,
    });
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ MARBLE "PLANETS" NUMBERS (1..90) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
let marbleTex=[];    // WebGL textures shown on marbles (lotto numbers)
let marbleNums=[];   // per-marble 1..90 values
let cardTex=[];      // WebGL textures for 3D carousel cards
let cardSt=[];       // per-card state for carousel/picking
let cardDraw=[];     // per-frame draw cache {md, def, mvp, model, corners, tex, alpha}
let centerCardTex=null;
let centerCardTexKey='';
const ORBIT_USE_SHARED_DOM_CARDS = Boolean(window.CARDS && typeof window.CARDS.buildAlgorithmCard==='function');
const CENTER_ORBIT_CARD_ID='center-core-card';
let orbitCardLayerEl=null;
const orbitCardSlots=new Map();
const orbitCardSeen=new Set();
const orbitCardDataCache=new Map();

function ensureOrbitCardLayer(){
  if(!ORBIT_USE_SHARED_DOM_CARDS) return null;
  if(orbitCardLayerEl && orbitCardLayerEl.isConnected) return orbitCardLayerEl;
  const el=document.createElement('div');
  el.id='orbitCardLayer';
  el.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:39;';
  document.body.appendChild(el);
  orbitCardLayerEl=el;
  return el;
}
function hideAllOrbitDomCards(){
  orbitCardSeen.clear();
  orbitCardSlots.forEach((slot)=>{
    if(slot && slot.el) slot.el.style.display='none';
  });
}
async function orbitCardDataFromMd(md){
  const href=String(md?.href||'').trim();
  const base=normBasePath(md?.cardBase || href);
  const cacheKey=(base || href || String(md?.name||'')).toLowerCase();
  if(cacheKey && orbitCardDataCache.has(cacheKey)) return orbitCardDataCache.get(cacheKey);
  const store=(obj)=>{
    const out={ ...obj, view:true, isActive:true };
    if(cacheKey) orbitCardDataCache.set(cacheKey,out);
    return out;
  };
  const card=(CARD_DB.ready && base) ? CARD_DB.byBase.get(base) : null;
  if(card) return store(card);
  const tryBases=[base, normBasePath(href)].filter(Boolean);
  for(let i=0;i<tryBases.length;i++){
    const b=tryBases[i];
    try{
      const r=await fetch(`${b}card.json`,{cache:'no-store'});
      if(!r.ok) continue;
      const j=await r.json();
      if(j && typeof j==='object'){
        const page=String(j.page||href||b).trim() || b;
        return store({ ...j, page, cardBase:normBasePath(j.cardBase||b) || b });
      }
    }catch(_e){}
  }
  // Mapping to existing real cards when the marble is a hub node without its own card.json.
  if(CARD_DB.ready){
    const n=String(md?.name||'').toLowerCase();
    if(n.includes('news')){
      const c=CARD_DB.byBase.get('pages/storico-estrazioni/');
      if(c) return store(c);
    }
    if(n.includes('laboratorio')){
      const c=CARD_DB.byBase.get('pages/analisi-statistiche/');
      if(c) return store(c);
    }
  }
  const ringName=(RINGS[md?.ring]||RINGS[0]||{name:'Menu'}).name || 'Menu';
  return store({
    id: slugifyMessageKey(md?.name || base || href || 'orbit-card'),
    title: String(md?.name||'Card'),
    subtitle: prettyPathLabel(href, ringName),
    narrativeSummary: '',
    image: 'img/img.webp',
    page: href || 'pages/algoritmi/',
    cardBase: base || normBasePath(href || 'pages/algoritmi/'),
    macroGroup: ringName.toLowerCase(),
    type: 'menu',
    accessTier: 'free',
    hasNews: false,
    no_data_show: true,
    view: true,
    isActive: true
  });
}
function ensureOrbitCardSlot(idx, md){
  if(!ORBIT_USE_SHARED_DOM_CARDS) return null;
  const layer=ensureOrbitCardLayer();
  if(!layer) return null;
  let slot=orbitCardSlots.get(idx);
  if(slot) return slot;
  const wrap=document.createElement('div');
  wrap.style.cssText='position:absolute;left:0;top:0;display:none;pointer-events:none;transform-origin:0 0;';
  layer.appendChild(wrap);
  slot={ el:wrap, built:false, key:'' };
  orbitCardSlots.set(idx,slot);

  Promise.resolve(orbitCardDataFromMd(md))
    .then((data)=>window.CARDS.buildAlgorithmCard(data, { forceActive:true, sourceBlock:'orbit' }))
    .then((cardEl)=>{
      const s=orbitCardSlots.get(idx);
      if(!s || !s.el || !cardEl) return;
      cardEl.style.width='100%';
      cardEl.style.maxWidth='100%';
      cardEl.style.minWidth='0';
      cardEl.style.height='100%';
      cardEl.style.minHeight='0';
      s.el.innerHTML='';
      s.el.appendChild(cardEl);
      s.built=true;
      s.key=String(data.id||md?.name||idx);
    })
    .catch(()=>{});
  return slot;
}
function placeOrbitDomCard(idx, md, cornersS, alpha){
  if(!ORBIT_USE_SHARED_DOM_CARDS) return;
  const slot=ensureOrbitCardSlot(idx, md);
  if(!slot || !slot.el) return;
  slot.el.style.zIndex = (idx===CENTER_ORBIT_CARD_ID) ? '4' : '2';
  orbitCardSeen.add(idx);
  if(!cornersS || cornersS.length!==4 || alpha<0.05 || cornersS.some(p=>!p || p[2]>=0.99)){
    slot.el.style.display='none';
    return;
  }
  let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
  for(let i=0;i<cornersS.length;i++){
    const sx=sceneScreenXFromNdc(cornersS[i][0]);
    const sy=sceneScreenYFromNdc(cornersS[i][1]);
    if(!Number.isFinite(sx) || !Number.isFinite(sy)){ slot.el.style.display='none'; return; }
    if(sx<minX) minX=sx;
    if(sx>maxX) maxX=sx;
    if(sy<minY) minY=sy;
    if(sy>maxY) maxY=sy;
  }
  const w=Math.max(1,maxX-minX);
  const h=Math.max(1,maxY-minY);
  if(w<36 || h<24){ slot.el.style.display='none'; return; }
  slot.el.style.display='block';
  slot.el.style.opacity=String(clamp(alpha,0,1));
  slot.el.style.transform=`translate(${minX}px,${minY}px)`;
  slot.el.style.width=`${w}px`;
  slot.el.style.height=`${h}px`;
}
function finalizeOrbitDomCards(){
  if(!ORBIT_USE_SHARED_DOM_CARDS) return;
  orbitCardSlots.forEach((slot,idx)=>{
    if(!orbitCardSeen.has(idx) && slot && slot.el) slot.el.style.display='none';
  });
  orbitCardSeen.clear();
}
function centerCardCacheKey(md){
  return [md?.name||'', md?.cardBase||'', md?.href||'', menuId].join('|');
}
function getCenterCardTex(md){
  const key=centerCardCacheKey(md);
  if(centerCardTex && centerCardTexKey===key) return centerCardTex;
  if(centerCardTex){
    try{ gl.deleteTexture(centerCardTex); }catch(_e){}
  }
  centerCardTex=makeCardTex(md, (RINGS[0]||{col:CORE_GOLD}).col);
  centerCardTexKey=key;
  return centerCardTex;
}
function resolveCenterCardMd(){
  const def=MENU_DEFS[menuId]||{};
  const center=def.centerCard||{};
  const fallbackHref=(Array.isArray(def.marbles) ? (def.marbles.find((m)=>m && m.href)?.href || '') : '') || 'pages/algoritmi/';
  return {
    name:String(center.title || SO_LABELS[menuId] || 'Oracle Experience'),
    href:String(center.href || fallbackHref || 'pages/algoritmi/'),
    cardBase:String(center.cardBase || center.href || fallbackHref || 'pages/algoritmi/'),
    goto:center.goto ? String(center.goto) : undefined,
    proposalBase:center.proposalBase ? String(center.proposalBase) : undefined
  };
}

function normalizeSixTokens(value){
  const raw=Array.isArray(value) ? value.join(' ') : String(value||'');
  const tokens=(raw.match(/\d{1,2}/g)||[])
    .map((v)=>String(clamp(parseInt(v,10)||0,1,90)).padStart(2,'0'))
    .slice(0,6);
  return tokens.length===6 ? tokens : [];
}
function makeLottoTex(n, baseRgb){
  const six=normalizeSixTokens(n);
  const s=six.length ? six.join(' ') : String(clamp((n|0)||1,1,90)).padStart(2,'0');
  const cv2=document.createElement('canvas');
  cv2.width=512; cv2.height=512;
  const c=cv2.getContext('2d');
  const pal=contrastTextPalette(baseRgb||[0.7,0.7,0.7]);
  c.clearRect(0,0,512,512);
  c.textAlign='center'; c.textBaseline='middle'; c.lineJoin='round';
  if(six.length){
    const rowA=`${six[0]} ${six[1]} ${six[2]}`;
    const rowB=`${six[3]} ${six[4]} ${six[5]}`;
    c.font='700 110px "Palatino Linotype",Palatino,"Times New Roman",serif';
    c.lineWidth=20; c.strokeStyle='rgba(0,0,0,0.9)';
    c.strokeText(rowA,256,210);
    c.strokeText(rowB,256,330);
    c.lineWidth=6; c.strokeStyle=`rgba(${pal.stroke[0]},${pal.stroke[1]},${pal.stroke[2]},0.98)`;
    c.strokeText(rowA,256,210);
    c.strokeText(rowB,256,330);
    c.fillStyle=`rgba(${pal.fill[0]},${pal.fill[1]},${pal.fill[2]},1.0)`;
    c.fillText(rowA,256,210);
    c.fillText(rowB,256,330);
  }else{
    const fs = (s.length===2) ? 330 : 400;
    c.font=`700 ${fs}px "Palatino Linotype",Palatino,"Times New Roman",serif`;
    c.lineWidth=22; c.strokeStyle='rgba(0,0,0,0.9)';
    c.strokeText(s,256,280);
    c.lineWidth=6; c.strokeStyle=`rgba(${pal.stroke[0]},${pal.stroke[1]},${pal.stroke[2]},0.98)`;
    c.strokeText(s,256,280);
    c.fillStyle=`rgba(${pal.fill[0]},${pal.fill[1]},${pal.fill[2]},1.0)`;
    c.fillText(s,256,280);
  }
  return glTex(cv2);
}

function xorshift32(seed){
  let x=(seed>>>0)||0x12345678;
  return ()=>{
    x ^= x<<13; x >>>= 0;
    x ^= x>>>17; x >>>= 0;
    x ^= x<<5;  x >>>= 0;
    return (x>>>0)/4294967296;
  };
}
function dayKeyLocal(){
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const dd=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
const marbleProposalCache=new Map();
let marbleProposalReqId=0;
function proposalKeyFromMd(md){
  const raw=md?.proposalBase || md?.cardBase || md?.href || md?.page || md?.name || '';
  return String(normBasePath(raw) || String(raw||'').trim()).toLowerCase();
}
function parseProposalFromMetricsCsv(text){
  const direct=String(
    readMetricValue(text,'Sestina proposta (prossimo concorso)') ||
    readMetricValue(text,'Sestina proposta') ||
    ''
  ).trim();
  const line=(String(text||'').split(/\r?\n/).find((row)=>/sestina proposta/i.test(row))||'');
  return normalizeSixTokens(direct || line);
}
async function loadProposalForMarble(md){
  const base=normBasePath(md?.proposalBase || md?.cardBase || md?.href || md?.page || '');
  if(!base) return [];
  try{
    const r=await fetch(`${base}out/metrics-db.csv`,{cache:'no-store'});
    if(!r.ok) return [];
    const csv=await r.text();
    return parseProposalFromMetricsCsv(csv);
  }catch(_e){
    return [];
  }
}
async function refreshMarbleProposals(){
  const reqId=++marbleProposalReqId;
  const marbles=Array.isArray(MARBLES) ? MARBLES.slice() : [];
  await Promise.all(marbles.map(async(md)=>{
    const key=proposalKeyFromMd(md);
    if(!key || marbleProposalCache.has(key)) return;
    const proposal=await loadProposalForMarble(md);
    if(proposal.length===6) marbleProposalCache.set(key, proposal);
  }));
  if(reqId!==marbleProposalReqId) return;
  rebuildMarbleTex();
}
function rebuildMarbleNumbers(){
  const seed = ((hash01(menuId+'#'+dayKeyLocal())*0x7fffffff)|0) ^ ((hash01(menuId+'#n')*0x7fffffff)|0) ^ (MARBLES.length<<8);
  const rnd=xorshift32(seed);
  const pool=Array.from({length:90},(_,i)=>i+1);
  // Fisher-Yates shuffle
  for(let i=pool.length-1;i>0;i--){
    const j=(rnd()*(i+1))|0;
    const t=pool[i]; pool[i]=pool[j]; pool[j]=t;
  }
  marbleNums = pool.slice(0, Math.max(1, MARBLES.length));
}
function rebuildMarbleTex(){
  marbleTex.forEach(t=>{ if(t) gl.deleteTexture(t); });
  rebuildMarbleNumbers();
  marbleTex = MARBLES.map((md,i)=>{
    const key=proposalKeyFromMd(md);
    const proposed=(key && marbleProposalCache.has(key)) ? marbleProposalCache.get(key) : null;
    const value=(Array.isArray(proposed) && proposed.length===6) ? proposed : (marbleNums[i]||((i%90)+1));
    return makeLottoTex(value,(RINGS[md.ring]||RINGS[0]).col);
  });
  rebuildCardCarousel();
}
rebuildMarbleTex();
refreshMarbleProposals();
const introTex=makeLottoTex(7,RINGS[0].col);

// Rebuild once fonts are ready so lotto numbers + shelf typography are crisp.
if(document.fonts && document.fonts.ready){
  document.fonts.ready.then(()=>{ try{ rebuildMarbleTex(); }catch(_e){} });
}

// Load the real SECC card.json index for the shelf + map LOD.
loadSeccCardDb();

// â”€â”€â”€ PARTICLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PCOUNT=600;
const pArr=new Float32Array(PCOUNT*3);
const pPh=new Float32Array(PCOUNT),pAmp=new Float32Array(PCOUNT);
// Each particle has a "cell offset" from camera â€” regenerated when too far
const pCell=new Float32Array(PCOUNT*3); // world position
const PCELL_R=55; // respawn radius around camera
for(let i=0;i<PCOUNT;i++){
  const rx=(Math.random()-.5)*PCELL_R*2;
  const ry=(Math.random()-.5)*PCELL_R*2;
  const rz=(Math.random()-.5)*PCELL_R*2;
  pCell[i*3]=rx; pCell[i*3+1]=ry; pCell[i*3+2]=rz;
  pArr[i*3]=rx; pArr[i*3+1]=ry; pArr[i*3+2]=rz;
  pPh[i]=Math.random()*TAU; pAmp[i]=0.04+Math.random()*.16;
}
const pBuf=glBuf(pArr,gl.ARRAY_BUFFER,gl.DYNAMIC_DRAW);

// â”€â”€â”€ STELLAR SWARM DUST (near-camera drifting "material") â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// STARFIELD (far background stars anchored to camera for an "infinite" universe)
const STAR_COUNT=3200;
const ENABLE_BACKGROUND_STARS=false;
const starDir=new Float32Array(STAR_COUNT*3);
const starRad=new Float32Array(STAR_COUNT);
const starCol=new Float32Array(STAR_COUNT*3);
const starSeed=new Float32Array(STAR_COUNT);
if(STAR_MAP && STAR_MAP.background
   && STAR_MAP.background.count===STAR_COUNT
   && Array.isArray(STAR_MAP.background.dir)
   && STAR_MAP.background.dir.length===STAR_COUNT*3
   && Array.isArray(STAR_MAP.background.rad)
   && STAR_MAP.background.rad.length===STAR_COUNT
   && Array.isArray(STAR_MAP.background.col)
   && STAR_MAP.background.col.length===STAR_COUNT*3
   && Array.isArray(STAR_MAP.background.seed)
   && STAR_MAP.background.seed.length===STAR_COUNT){
  starDir.set(STAR_MAP.background.dir);
  starRad.set(STAR_MAP.background.rad);
  starCol.set(STAR_MAP.background.col);
  starSeed.set(STAR_MAP.background.seed);
}else{
  for(let i=0;i<STAR_COUNT;i++){
    // Uniform-ish direction on a sphere
    const z=Math.random()*2-1;
    const a=Math.random()*TAU;
    const rr=Math.sqrt(Math.max(0,1-z*z));
    const dx=Math.cos(a)*rr, dy=z, dz=Math.sin(a)*rr;
    starDir[i*3]=dx; starDir[i*3+1]=dy; starDir[i*3+2]=dz;

    // Radius biased toward far (background) stars
    starRad[i]=220 + Math.pow(Math.random(),0.35)*1800; // 220..~2020

    // Star "temperature" (simple palette)
    const tt=Math.random();
    let cr=1, cg=1, cb=1;
    if(tt<0.68){ cr=1.00; cg=0.98; cb=0.93; }       // white
    else if(tt<0.84){ cr=0.74; cg=0.86; cb=1.00; }  // cool
    else { cr=1.00; cg=0.90; cb=0.72; }             // warm

    const b=0.55 + Math.pow(Math.random(),0.35)*0.85; // brightness
    starCol[i*3]=cr*b; starCol[i*3+1]=cg*b; starCol[i*3+2]=cb*b;
    starSeed[i]=Math.random();
  }
}
const starDirBuf = glBuf(starDir, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const starRadBuf = glBuf(starRad, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const starColBuf = glBuf(starCol, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const starSeedBuf= glBuf(starSeed,gl.ARRAY_BUFFER,gl.STATIC_DRAW);

// MENU BEACONS (all menu systems positions, always present in world space)
const BCN_IDS=Object.keys(MENU_DEFS);
const BCN_COUNT=BCN_IDS.length;
const bcnPos=new Float32Array(BCN_COUNT*3);
const bcnCol=new Float32Array(BCN_COUNT*3);
const bcnSeed=new Float32Array(BCN_COUNT);
for(let i=0;i<BCN_COUNT;i++){
  const id=BCN_IDS[i];
  const c=nodeCenter(id);
  bcnPos[i*3]=c[0]; bcnPos[i*3+1]=c[1]; bcnPos[i*3+2]=c[2];
  const rg0=(MENU_DEFS[id] && MENU_DEFS[id].rings && MENU_DEFS[id].rings[0]) ? MENU_DEFS[id].rings[0] : null;
  const col=(rg0 && rg0.col) ? rg0.col : CORE_GOLD;
  bcnCol[i*3]=col[0]; bcnCol[i*3+1]=col[1]; bcnCol[i*3+2]=col[2];
  bcnSeed[i]=Math.random();
}
const bcnPosBuf = glBuf(bcnPos, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const bcnColBuf = glBuf(bcnCol, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const bcnSeedBuf= glBuf(bcnSeed,gl.ARRAY_BUFFER,gl.STATIC_DRAW);
const soCorePos=new Float32Array(BCN_COUNT*3);
const soCoreCol=new Float32Array(BCN_COUNT*3);
const soCoreSeed=new Float32Array(BCN_COUNT);
const soCoreLum=new Float32Array(BCN_COUNT);
for(let i=0;i<BCN_COUNT;i++){
  const i3=i*3;
  soCorePos[i3]=bcnPos[i3];
  soCorePos[i3+1]=bcnPos[i3+1];
  soCorePos[i3+2]=bcnPos[i3+2];
  soCoreCol[i3]=bcnCol[i3];
  soCoreCol[i3+1]=bcnCol[i3+1];
  soCoreCol[i3+2]=bcnCol[i3+2];
  soCoreSeed[i]=Math.random();
  soCoreLum[i]=1.26 + (i%3)*0.12; // brighter SO core stars so marble-orbit systems read clearly
}
const soCorePosBuf = glBuf(soCorePos, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const soCoreColBuf = glBuf(soCoreCol, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const soCoreSeedBuf= glBuf(soCoreSeed,gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const soCoreLumBuf = glBuf(soCoreLum, gl.ARRAY_BUFFER, gl.STATIC_DRAW);

// PHYSICAL STARS (real world-space stars you can approach)
const REAL_STAR_COUNT=(ARCHIVE_REAL_STARS && ARCHIVE_REAL_STARS.length>0) ? ARCHIVE_REAL_STARS.length : 1500;
const REAL_STAR_FIELD_SIDE_UA=10000.0;
const REAL_STAR_FIELD_HALF_WU=(REAL_STAR_FIELD_SIDE_UA*10.0)*0.5;
const realStarPos=new Float32Array(REAL_STAR_COUNT*3);
const realStarCol=new Float32Array(REAL_STAR_COUNT*3);
const realStarSeed=new Float32Array(REAL_STAR_COUNT);
const realStarLum=new Float32Array(REAL_STAR_COUNT);
let realStarN=0;
function hash01n(x){
  const s=Math.sin(x*127.1 + 311.7)*43758.5453123;
  return s-Math.floor(s);
}
function tripleLayerRand01(idx, axis){
  const i=(idx|0)+1;
  const a=(axis|0)+1;
  const l1=hash01n(i*97.137 + a*13.913 + 0.173);
  const l2=hash01n(i*211.731 + a*29.417 + l1*37.903 + 0.619);
  const l3=hash01n(i*389.117 + a*41.229 + l2*53.171 + 0.947);
  const mix0=l1*0.52 + l2*0.33 + l3*0.15;
  const warp=0.5 + 0.5*Math.sin((mix0*TAU*3.0) + (l1-l2)*1.7 + l3*2.1);
  return clamp(mix0*0.72 + warp*0.28, 0, 1);
}
function tripleLayerSigned(idx, axis){
  return tripleLayerRand01(idx, axis)*2.0 - 1.0;
}
function kelvinToRgb01(kelvin){
  let t=clamp(Number(kelvin)||5778, 1000, 40000)/100.0;
  let r,g,b;
  if(t<=66){
    r=255;
    g=99.4708025861*Math.log(Math.max(1e-6,t)) - 161.1195681661;
    if(t<=19) b=0;
    else b=138.5177312231*Math.log(Math.max(1e-6,t-10)) - 305.0447927307;
  }else{
    r=329.698727446*Math.pow(t-60,-0.1332047592);
    g=288.1221695283*Math.pow(t-60,-0.0755148492);
    b=255;
  }
  return [
    clamp(r/255,0,1),
    clamp(g/255,0,1),
    clamp(b/255,0,1)
  ];
}
function sampleStellarPropsFromSeed(seed, distWU){
  const u0=hash01n(seed*13.17 + 0.11);
  const u1=hash01n(seed*29.41 + 0.37);
  const u2=hash01n(seed*47.83 + 0.73);
  // Visual-sky prevalence tuned for this scene:
  // mostly white/yellow stars, fewer very red/very blue ones.
  let tempK=5778;
  let lum=0.82;
  if(u0<0.220){        tempK=clamp(3000 + u1*1000,3000,4000);  lum=0.42 + u2*0.20; } // red/orange
  else if(u0<0.500){   tempK=clamp(4000 + u1*1200,4000,5200);  lum=0.56 + u2*0.22; } // warm
  else if(u0<0.810){   tempK=clamp(5200 + u1*900, 5200,6100);  lum=0.74 + u2*0.24; } // yellow-white
  else if(u0<0.950){   tempK=clamp(6100 + u1*1200,6100,7300);  lum=0.92 + u2*0.26; } // white
  else if(u0<0.992){   tempK=clamp(7300 + u1*1800,7300,9100);  lum=1.08 + u2*0.24; } // blue-white
  else if(u0<0.999){   tempK=clamp(9100 + u1*6000,9100,15100); lum=1.22 + u2*0.22; } // blue (rare)
  else{                tempK=clamp(15100 + u1*9000,15100,24100); lum=1.36 + u2*0.16; } // extreme blue (very rare)
  // Rare evolved stars.
  const giant=hash01n(seed*61.07 + 0.19);
  if(giant>0.965){
    lum*=1.22 + hash01n(seed*83.11 + 0.59)*0.48;
  }
  // Distant stars tend to appear less dominant in this stylized scale.
  const farFade=clamp(1.0 - ((Math.max(0,Number(distWU)||0)-12000)/52000), 0.62, 1.0);
  lum=clamp(lum*farFade, 0.30, 1.72);
  return { col:kelvinToRgb01(tempK), lum, tempK };
}
function applyRealisticStarAppearance(){
  for(let i=0;i<realStarN;i++){
    const i3=i*3;
    const x=realStarPos[i3], y=realStarPos[i3+1], z=realStarPos[i3+2];
    const d=Math.sqrt(x*x + y*y + z*z);
    const seed=Number(realStarSeed[i])||0;
    const p=sampleStellarPropsFromSeed(seed, d);
    realStarCol[i3]=p.col[0];
    realStarCol[i3+1]=p.col[1];
    realStarCol[i3+2]=p.col[2];
    realStarLum[i]=p.lum;
  }
}
function canPlaceRealStar(x,y,z,minSepSq){
  for(let i=0;i<realStarN;i++){
    const i3=i*3;
    const dx=realStarPos[i3]-x;
    const dy=realStarPos[i3+1]-y;
    const dz=realStarPos[i3+2]-z;
    if(dx*dx+dy*dy+dz*dz < minSepSq) return false;
  }
  return true;
}
function pushRealStar(x,y,z,seed,lum,col){
  if(realStarN>=REAL_STAR_COUNT) return false;
  const i3=realStarN*3;
  realStarPos[i3]=x; realStarPos[i3+1]=y; realStarPos[i3+2]=z;
  realStarCol[i3]=col[0]; realStarCol[i3+1]=col[1]; realStarCol[i3+2]=col[2];
  realStarSeed[realStarN]=Number.isFinite(seed) ? seed : hash01n((x+y+z)*0.001 + realStarN*1.37);
  realStarLum[realStarN]=lum;
  realStarN++;
  return true;
}
function seedPhysicalStars(){
  if(ARCHIVE_REAL_STARS && ARCHIVE_REAL_STARS.length===REAL_STAR_COUNT){
    for(let i=0;i<ARCHIVE_REAL_STARS.length;i++){
      const s=ARCHIVE_REAL_STARS[i] || {};
      const x=Number(s.x), y=Number(s.y), z=Number(s.z);
      const seed=Number.isFinite(Number(s.seed)) ? Number(s.seed) : hash01n((i+1)*17.31);
      if(!(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z))) continue;
      if(!pushRealStar(x,y,z,seed,0.9,[1.0,1.0,1.0])) break;
    }
    applyRealisticStarAppearance();
    return;
  }
  if(STAR_MAP && STAR_MAP.real
     && STAR_MAP.real.count===REAL_STAR_COUNT
     && Array.isArray(STAR_MAP.real.pos)
     && STAR_MAP.real.pos.length===REAL_STAR_COUNT*3
     && Array.isArray(STAR_MAP.real.col)
     && STAR_MAP.real.col.length===REAL_STAR_COUNT*3
     && Array.isArray(STAR_MAP.real.seed)
     && STAR_MAP.real.seed.length===REAL_STAR_COUNT
     && Array.isArray(STAR_MAP.real.lum)
     && STAR_MAP.real.lum.length===REAL_STAR_COUNT){
    realStarPos.set(STAR_MAP.real.pos);
    realStarCol.set(STAR_MAP.real.col);
    realStarSeed.set(STAR_MAP.real.seed);
    realStarLum.set(STAR_MAP.real.lum);
    realStarN=REAL_STAR_COUNT;
    applyRealisticStarAppearance();
    return;
  }
  // Fixed pseudo-random coordinates in a 10000 UA cube centered on SOH.
  // Triple-layer randomness is used per axis to avoid regular patterns.
  const c=nodeCenter(SOH_ID);
  let idx=0, guard=0;
  while(realStarN<REAL_STAR_COUNT && guard<REAL_STAR_COUNT*120){
    const sx=tripleLayerSigned(idx,0);
    const sy=tripleLayerSigned(idx,1);
    const sz=tripleLayerSigned(idx,2);
    const x=c[0] + sx*REAL_STAR_FIELD_HALF_WU;
    const y=c[1] + sy*REAL_STAR_FIELD_HALF_WU;
    const z=c[2] + sz*REAL_STAR_FIELD_HALF_WU;
    const sep=140 + 320*tripleLayerRand01(idx,4); // 140..460 wu min spacing
    const seed=tripleLayerRand01(idx,3);
    idx++;
    guard++;
    if(!canPlaceRealStar(x,y,z,sep*sep)) continue;
    pushRealStar(x,y,z,seed,0.9,[1.0,1.0,1.0]);
  }
  applyRealisticStarAppearance();
}
seedPhysicalStars();
const realStarPosBuf=glBuf(realStarPos.subarray(0,realStarN*3), gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const realStarColBuf=glBuf(realStarCol.subarray(0,realStarN*3), gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const realStarSeedBuf=glBuf(realStarSeed.subarray(0,realStarN), gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const realStarLumBuf=glBuf(realStarLum.subarray(0,realStarN), gl.ARRAY_BUFFER, gl.STATIC_DRAW);

// Inter-system cosmic dust flow: faint filaments connecting SO nodes.
const BCN_INDEX=Object.create(null);
for(let i=0;i<BCN_COUNT;i++) BCN_INDEX[BCN_IDS[i]]=i;
function soEdgeKey(a,b){ return a<b ? `${a}|${b}` : `${b}|${a}`; }
function buildSoFlowEdges(){
  const out=[];
  const seen=new Set();
  const ids=BCN_IDS.filter(id=>id!==SOH_ID);
  function add(a,b){
    const ia=BCN_INDEX[a], ib=BCN_INDEX[b];
    if(!Number.isFinite(ia) || !Number.isFinite(ib) || ia===ib) return;
    const k=soEdgeKey(a,b);
    if(seen.has(k)) return;
    seen.add(k);
    out.push([ia,ib]);
  }
  // Structural links from menu hierarchy.
  ids.forEach((id)=>{
    const back=(MENU_DEFS[id] && MENU_DEFS[id].back && MENU_DEFS[MENU_DEFS[id].back]) ? MENU_DEFS[id].back : SOH_ID;
    add(id, back);
  });
  // Extra nearest-neighbor links to create a visible "web" between distant SO.
  ids.forEach((id)=>{
    const ia=BCN_INDEX[id];
    let best=-1, bestD2=1e18;
    ids.forEach((id2)=>{
      if(id2===id) return;
      const ib=BCN_INDEX[id2];
      const dx=bcnPos[ib*3]-bcnPos[ia*3], dy=bcnPos[ib*3+1]-bcnPos[ia*3+1], dz=bcnPos[ib*3+2]-bcnPos[ia*3+2];
      const d2=dx*dx+dy*dy+dz*dz;
      if(d2<bestD2){ bestD2=d2; best=ib; }
    });
    if(best>=0) add(id, BCN_IDS[best]);
  });
  return out;
}
const FLOW_EDGES=buildSoFlowEdges();
const FLOW_EDGE_COUNT=FLOW_EDGES.length;
const flowEdgeA=new Float32Array(FLOW_EDGE_COUNT*3);
const flowEdgeB=new Float32Array(FLOW_EDGE_COUNT*3);
const flowEdgeU=new Float32Array(FLOW_EDGE_COUNT*3);
const flowEdgeV=new Float32Array(FLOW_EDGE_COUNT*3);
const flowEdgeLen=new Float32Array(FLOW_EDGE_COUNT);
let FLOW_COUNT=0;
const flowPartsPerEdge=new Uint16Array(FLOW_EDGE_COUNT);
for(let e=0;e<FLOW_EDGE_COUNT;e++){
  const ia=FLOW_EDGES[e][0], ib=FLOW_EDGES[e][1];
  const ax=bcnPos[ia*3], ay=bcnPos[ia*3+1], az=bcnPos[ia*3+2];
  const bx=bcnPos[ib*3], by=bcnPos[ib*3+1], bz=bcnPos[ib*3+2];
  flowEdgeA[e*3]=ax; flowEdgeA[e*3+1]=ay; flowEdgeA[e*3+2]=az;
  flowEdgeB[e*3]=bx; flowEdgeB[e*3+1]=by; flowEdgeB[e*3+2]=bz;
  const dx=bx-ax, dy=by-ay, dz=bz-az;
  const len=Math.sqrt(dx*dx+dy*dy+dz*dz);
  flowEdgeLen[e]=len;
  const dir=len>1e-6 ? [dx/len,dy/len,dz/len] : [0,0,1];
  const up=Math.abs(dir[1])>0.92 ? [1,0,0] : [0,1,0];
  const u=vnorm(vcross(dir, up));
  const v=vnorm(vcross(dir, u));
  flowEdgeU[e*3]=u[0]; flowEdgeU[e*3+1]=u[1]; flowEdgeU[e*3+2]=u[2];
  flowEdgeV[e*3]=v[0]; flowEdgeV[e*3+1]=v[1]; flowEdgeV[e*3+2]=v[2];
  const n=clamp(Math.round(len/9), 160, 420);
  flowPartsPerEdge[e]=n;
  FLOW_COUNT += n;
}
const flowPos=new Float32Array(FLOW_COUNT*3);
const flowCol=new Float32Array(FLOW_COUNT*3);
const flowSeed=new Float32Array(FLOW_COUNT);
const flowEdgeOf=new Uint16Array(FLOW_COUNT);
const flowT=new Float32Array(FLOW_COUNT);
const flowSpeed=new Float32Array(FLOW_COUNT);
const flowOff=new Float32Array(FLOW_COUNT*3);
{
  let k=0;
  for(let e=0;e<FLOW_EDGE_COUNT;e++){
    const ia=FLOW_EDGES[e][0], ib=FLOW_EDGES[e][1];
    const ca=[bcnCol[ia*3],bcnCol[ia*3+1],bcnCol[ia*3+2]];
    const cb=[bcnCol[ib*3],bcnCol[ib*3+1],bcnCol[ib*3+2]];
    const ux=flowEdgeU[e*3], uy=flowEdgeU[e*3+1], uz=flowEdgeU[e*3+2];
    const vx=flowEdgeV[e*3], vy=flowEdgeV[e*3+1], vz=flowEdgeV[e*3+2];
    const n=flowPartsPerEdge[e];
    for(let i=0;i<n;i++,k++){
      flowEdgeOf[k]=e;
      flowSeed[k]=Math.random();
      flowT[k]=Math.random();
      const dirSign=Math.random()<0.5 ? -1 : 1;
      // Inter-SO flow should feel almost static: rarefied clouds drifting slowly.
      flowSpeed[k]=dirSign*(0.0006 + Math.random()*0.0024);
      const ou=(Math.random()*2-1)*(0.30 + Math.random()*1.10);
      const ov=(Math.random()*2-1)*(0.22 + Math.random()*0.90);
      flowOff[k*3]=ux*ou + vx*ov;
      flowOff[k*3+1]=uy*ou + vy*ov;
      flowOff[k*3+2]=uz*ou + vz*ov;
      const m=Math.random();
      let cr=ca[0]*(1-m)+cb[0]*m, cg=ca[1]*(1-m)+cb[1]*m, cb2=ca[2]*(1-m)+cb[2]*m;
      const tMix=0.44 + Math.random()*0.26;
      const tf=(Math.random()<0.68) ? [0.58,0.82,1.00] : [1.00,0.88,0.64];
      cr=cr*(1-tMix)+tf[0]*tMix;
      cg=cg*(1-tMix)+tf[1]*tMix;
      cb2=cb2*(1-tMix)+tf[2]*tMix;
      flowCol[k*3]=cr; flowCol[k*3+1]=cg; flowCol[k*3+2]=cb2;
    }
  }
}
const flowPosBuf=glBuf(flowPos, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
const flowColBuf=glBuf(flowCol, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const flowSeedBuf=glBuf(flowSeed, gl.ARRAY_BUFFER, gl.STATIC_DRAW);

// Swarm dust: near-camera luminous "space material" that crosses the view in bursts.
// Keep counts moderate to avoid burning fill-rate on integrated GPUs.
const SD_COUNT=1100;
const SD_CLUSTERS=10;
const sdArr=new Float32Array(SD_COUNT*3);
const sdOff=new Float32Array(SD_COUNT*3);
const sdSeed=new Float32Array(SD_COUNT);
const sdAlpha=new Float32Array(SD_COUNT);
const sdAlphaBase=new Float32Array(SD_COUNT);
const sdCi=new Uint16Array(SD_COUNT);

const sdC=new Float32Array(SD_CLUSTERS*3);
const sdV=new Float32Array(SD_CLUSTERS*3);
const sdLife=new Float32Array(SD_CLUSTERS);
const sdDur=new Float32Array(SD_CLUSTERS);
const sdSpread=new Float32Array(SD_CLUSTERS);
const sdFade=new Float32Array(SD_CLUSTERS);
const sdAcc=new Float32Array(SD_CLUSTERS*3);

// Spawn swarms close to the camera so they actually cross "in front of your eyes".
// (When too far, even slow drift looks static.)
const SD_MAXR=34, SD_MINR=8;
// Physical model (stylized): weak gravity + almost-zero damping (vacuum-like).
const SD_SOFTEN=36.0;
const SD_G_SOH=52.0;
const SD_G_ACTIVE=34.0;
const SD_G_SO_NET=10.0;
const SD_TURB=0.026;
const SD_MAX_SPD=2.15;
const SD_DAMP=0.002;
function smoothstep(a,b,x){
  const t2=clamp((x-a)/(b-a),0,1);
  return t2*t2*(3-2*t2);
}
function pulse01(t2){
  return smoothstep(0.0,0.22,t2) * (1.0 - smoothstep(0.78,1.0,t2));
}
function basisFromYawPitch(yaw,pitch){
  const f=vnorm([Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), Math.cos(yaw)*Math.cos(pitch)]);
  const r=vnorm(vcross([0,1,0], f));
  const u=vnorm(vcross(f, r));
  return{f,r,u};
}
function basisFromDir(dir){
  const f=vnorm((Array.isArray(dir) && dir.length===3) ? dir : [0,0,1]);
  let r=vcross([0,1,0], f);
  if((vdot(r,r)||0) < 1e-6) r=vcross([1,0,0], f);
  r=vnorm(r);
  const u=vnorm(vcross(f, r));
  return {f,r,u};
}
function travelEffectDir(){
  if(autoPilot && autoPilot.targetPos){
    return vnorm(vsub(autoPilot.targetPos, camPos));
  }
  if(navTrans && animTarget && animPos){
    return vnorm(vsub(animTarget, animPos));
  }
  return crosshairAimDir();
}
function respawnSwarm(ci, cp, basis){
  const f=basis.f, r=basis.r, u=basis.u;
  const ahead = SD_MINR + Math.random()*(SD_MAXR-SD_MINR);
  // Keep spawn very close to the center line so motion always starts from center.
  const side  = (Math.random()*2-1) * SD_MAXR*0.12;
  const up    = (Math.random()*2-1) * SD_MAXR*0.10;
  const c = vadd(cp, vadd(vscl(f,ahead), vadd(vscl(r,side), vscl(u,up))));
  sdC[ci*3]=c[0]; sdC[ci*3+1]=c[1]; sdC[ci*3+2]=c[2];

  // Drift: nearly axial (center-origin) with only tiny lateral wander.
  const drift = vnorm(vadd(vscl(f, -(0.85+Math.random()*0.55)),
                  vadd(vscl(r,(Math.random()*2-1)*0.10), vscl(u,(Math.random()*2-1)*0.08))));
  // Keep it slow and "floaty": the dust should read as material drifting in space.
  // Speed tuned so clusters cross the view within ~10â€“30s, not minutes.
  const spd = 0.30 + Math.random()*0.55;
  sdV[ci*3]=drift[0]*spd; sdV[ci*3+1]=drift[1]*spd; sdV[ci*3+2]=drift[2]*spd;

  // Persistent tiny drift acceleration (acts like background flow / radiation pressure).
  const accDir=vnorm(vadd(vscl(f,-0.45), vadd(vscl(r,(Math.random()*2-1)*0.22), vscl(u,(Math.random()*2-1)*0.15))));
  const accMag=0.010 + Math.random()*0.020;
  sdAcc[ci*3]=accDir[0]*accMag; sdAcc[ci*3+1]=accDir[1]*accMag; sdAcc[ci*3+2]=accDir[2]*accMag;

  sdLife[ci]=Math.random();
  sdFade[ci]=0;
  // Longer burst cycles so swarms cross the view more slowly.
  sdDur[ci]=6.5 + Math.random()*10.5;
  sdSpread[ci]=3.2 + Math.random()*8.5;
}

// Seed particle offsets and cluster assignment.
for(let i=0;i<SD_COUNT;i++){
  const ci=i%SD_CLUSTERS;
  sdCi[i]=ci;
  sdSeed[i]=Math.random();
  // Base alpha reduced: overall dust density is intentionally lighter.
  sdAlphaBase[i]=0.09 + Math.random()*0.22;
  const rx=(Math.random()*2-1), ry=(Math.random()*2-1), rz=(Math.random()*2-1);
  const rr=Math.pow(Math.random(), 1.8);
  const o=vnorm([rx,ry,rz]);
  const s = rr * (3.0 + Math.random()*7.0);
  sdOff[i*3]=o[0]*s; sdOff[i*3+1]=o[1]*s; sdOff[i*3+2]=o[2]*s;
}

// Swarm clusters depend on camera pose; initialize lazily once camera vars exist.
let sdInited=false;

const sdPosBuf=glBuf(sdArr,gl.ARRAY_BUFFER,gl.DYNAMIC_DRAW);
const sdSeedBuf=glBuf(sdSeed,gl.ARRAY_BUFFER,gl.STATIC_DRAW);
const sdAlphaBuf=glBuf(sdAlpha,gl.ARRAY_BUFFER,gl.DYNAMIC_DRAW);

// Cosmic dust word: large sparkling 3D "ControlChaos" near the landing coordinates.
const COSMIC_WORD_TEXT='ControlChaos';
const COSMIC_WORD_COORD={ r:CONTROLCHAOS_COORD.r, az:CONTROLCHAOS_COORD.az, ril:CONTROLCHAOS_COORD.ril };
const COSMIC_WORD_WORLD_W=560.0;
const COSMIC_WORD_WORLD_H=128.0;
const COSMIC_WORD_MAX_POINTS=22000;
function buildCosmicWordCloud(){
  const base=coordToNodePos(COSMIC_WORD_COORD);
  const anchor=[base[0]+190.0, base[1]+68.0, base[2]-142.0];
  const face=vnorm(vsub(nodeCenter(SOH_ID), anchor));
  let right=vcross([0,1,0], face);
  if(vdot(right,right)<1e-6) right=[1,0,0];
  right=vnorm(right);
  const up=vnorm(vcross(face,right));

  const api=window.SECC_COSMIC_WORD;
  if(api && typeof api.buildCloud==='function'){
    return api.buildCloud({
      text:COSMIC_WORD_TEXT,
      coordToNodePos,
      coord:COSMIC_WORD_COORD,
      offset:[CONTROLCHAOS_OFFSET.x, CONTROLCHAOS_OFFSET.y, CONTROLCHAOS_OFFSET.z],
      right,
      up,
      face,
      worldW:COSMIC_WORD_WORLD_W,
      worldH:COSMIC_WORD_WORLD_H,
      maxPoints:COSMIC_WORD_MAX_POINTS
    });
  }
  return { pos:new Float32Array(0), seed:new Float32Array(0), lum:new Float32Array(0), n:0, anchor };
}
const cosmicWord=buildCosmicWordCloud();
const cosmicWordPosBuf=glBuf(cosmicWord.pos, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const cosmicWordSeedBuf=glBuf(cosmicWord.seed, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const cosmicWordLumBuf=glBuf(cosmicWord.lum, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const COSMIC_WORD_COUNT=cosmicWord.n;
function buildCrossCalibrCloud(){
  const pts=[];
  const cols=[];
  const seeds=[];
  const c=CROSS_CALIBR_POS;
  const arm=18.0;
  const nArm=66;
  for(let i=0;i<nArm;i++){
    const t=(i/(nArm-1))*2-1;
    const j=(Math.random()*2-1)*0.28;
    pts.push(c[0] + t*arm, c[1] + j, c[2]);
    cols.push(0.78 + Math.random()*0.18, 0.90 + Math.random()*0.08, 1.00);
    seeds.push(Math.random());
    pts.push(c[0], c[1] + t*arm, c[2] + j);
    cols.push(0.78 + Math.random()*0.18, 0.90 + Math.random()*0.08, 1.00);
    seeds.push(Math.random());
  }
  const halo=84;
  for(let i=0;i<halo;i++){
    const a=(i/halo)*TAU;
    const r=3.8 + Math.random()*3.6;
    const y=(Math.random()*2-1)*1.4;
    pts.push(c[0] + Math.cos(a)*r, c[1] + y, c[2] + Math.sin(a)*r);
    cols.push(0.66, 0.82, 1.00);
    seeds.push(Math.random());
  }
  return {
    pos:new Float32Array(pts),
    col:new Float32Array(cols),
    seed:new Float32Array(seeds),
    n:seeds.length
  };
}
const crossCalibrCloud=buildCrossCalibrCloud();
const crossCalibrPosBuf=glBuf(crossCalibrCloud.pos, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const crossCalibrColBuf=glBuf(crossCalibrCloud.col, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const crossCalibrSeedBuf=glBuf(crossCalibrCloud.seed, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
const CROSS_CALIBR_COUNT=crossCalibrCloud.n;
rebuildCoordinateRegistry();

// â”€â”€â”€ SHADERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Shaders estratti in assets/js/render/shaders.js → window.SECC_SHADERS
const { MBL_VS, MBL_FS, DST_VS, DST_FS, PRT_VS, PRT_FS, STR_VS, STR_FS,
        RSTR_VS, RSTR_FS, CRD_VS, CRD_FS, BCN_VS, BCN_FS, SD_VS, SD_FS,
        CWD_VS, CWD_FS } = window.SECC_SHADERS;

const mProg=glProg(MBL_VS,MBL_FS);
const dProg=glProg(DST_VS,DST_FS);
const pProg=glProg(PRT_VS,PRT_FS);
const stProg=glProg(STR_VS,STR_FS);
const rstProg=glProg(RSTR_VS,RSTR_FS);
const cProg=glProg(CRD_VS,CRD_FS);
const bProg=glProg(BCN_VS,BCN_FS);
const sProg=glProg(SD_VS,SD_FS);
const wProg=glProg(CWD_VS,CWD_FS);

function locs(prog,aa,uu){
  const r={};
  aa.forEach(n=>{const v=gl.getAttribLocation(prog,n); r[n]=v;});
  uu.forEach(n=>{r[n]=gl.getUniformLocation(prog,n);});
  return r;
}
const ML=locs(mProg,['a_pos','a_nrm','a_uv'],['u_mvp','u_model','u_eye','u_tint','u_time','u_numTex','u_sysA']);
const DL=locs(dProg,['a_pos','a_seed'],['u_vp','u_sys','u_cam','u_col','u_t','u_alpha','u_sysA']);
const PL=locs(pProg,['a_pos'],['u_vp','u_cam']);
const STL=locs(stProg,['a_dir','a_rad','a_col','a_seed'],['u_vp','u_cam','u_t','u_alpha','u_radMul','u_sizeMul','u_twOff']);
const RSTL=locs(rstProg,['a_pos','a_col','a_seed','a_lum'],['u_vp','u_cam','u_t','u_sizeMul','u_pxPerRad']);
const CL=locs(cProg,['a_pos','a_uv'],['u_mvp','u_model','u_eye','u_t','u_alpha','u_tex']);
const BL=locs(bProg,['a_pos','a_col','a_seed'],['u_vp','u_cam','u_t','u_alpha']);
const SL=locs(sProg,['a_pos','a_seed','a_a'],['u_vp','u_cam','u_t','u_alphaScale']);
const WL=locs(wProg,['a_pos','a_seed','a_lum'],['u_vp','u_cam','u_t','u_alpha','u_sizeMul']);

function attrib(loc,buf,sz){
  if(loc<0)return;
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc,sz||3,gl.FLOAT,false,0,0);
}
function unAttrib(...locs2){ locs2.forEach(l=>{if(l>=0)gl.disableVertexAttribArray(l);}); }

// â”€â”€â”€ CAMERA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function camForward(yaw,pitch){
  return vnorm([
    Math.sin(yaw)*Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw)*Math.cos(pitch)
  ]);
}
function axisRotate(v,axis,ang){
  const a=vnorm(axis);
  const c=Math.cos(ang), s=Math.sin(ang);
  const k=1-c;
  const x=v[0], y=v[1], z=v[2];
  const ax=a[0], ay=a[1], az=a[2];
  return [
    x*(c+ax*ax*k) + y*(ax*ay*k-az*s) + z*(ax*az*k+ay*s),
    x*(ay*ax*k+az*s) + y*(c+ay*ay*k) + z*(ay*az*k-ax*s),
    x*(az*ax*k-ay*s) + y*(az*ay*k+ax*s) + z*(c+az*az*k)
  ];
}
function camRight(yaw,pitch,roll){
  const f=camForward(yaw,pitch);
  let r=vcross([0,1,0], f);
  if((vdot(r,r)||0) < 1e-7){
    // Forward almost parallel to world-up: keep a stable fallback axis.
    r=[-Math.cos(yaw),0,Math.sin(yaw)];
  }
  r=vnorm(r);
  const rl=Number.isFinite(roll)?roll:0;
  if(Math.abs(rl)>1e-8) r=vnorm(axisRotate(r,f,rl));
  return r;
}
function viewFromCameraPose(pos,yaw,pitch,roll){
  const f=camForward(yaw,pitch);
  const b=vscl(f,-1);         // camera back axis
  const r=camRight(yaw,pitch,roll);
  const u=vnorm(vcross(b,r)); // local up (stable near vertical poles)
  const m=m4();
  m[0]=r[0]; m[1]=u[0]; m[2]=b[0]; m[3]=0;
  m[4]=r[1]; m[5]=u[1]; m[6]=b[1]; m[7]=0;
  m[8]=r[2]; m[9]=u[2]; m[10]=b[2]; m[11]=0;
  m[12]=-(r[0]*pos[0] + r[1]*pos[1] + r[2]*pos[2]);
  m[13]=-(u[0]*pos[0] + u[1]*pos[1] + u[2]*pos[2]);
  m[14]=-(b[0]*pos[0] + b[1]*pos[1] + b[2]*pos[2]);
  m[15]=1;
  return m;
}
function viewFromCameraBasis(pos,fwd,up){
  const f=vnorm(fwd||[0,0,1]);
  let u=vnorm(up||[0,1,0]);
  let r=vcross(u,f);
  if((vdot(r,r)||0) < 1e-7){
    r=vcross([0,1,0],f);
    if((vdot(r,r)||0) < 1e-7) r=vcross([1,0,0],f);
  }
  r=vnorm(r);
  u=vnorm(vcross(f,r));
  const b=vscl(f,-1);
  const m=m4();
  m[0]=r[0]; m[1]=u[0]; m[2]=b[0]; m[3]=0;
  m[4]=r[1]; m[5]=u[1]; m[6]=b[1]; m[7]=0;
  m[8]=r[2]; m[9]=u[2]; m[10]=b[2]; m[11]=0;
  m[12]=-(r[0]*pos[0] + r[1]*pos[1] + r[2]*pos[2]);
  m[13]=-(u[0]*pos[0] + u[1]*pos[1] + u[2]*pos[2]);
  m[14]=-(b[0]*pos[0] + b[1]*pos[1] + b[2]*pos[2]);
  m[15]=1;
  return m;
}
function basisRightFromFU(f,u){
  let r=vcross(u,f);
  if((vdot(r,r)||0) < 1e-7){
    r=vcross([0,1,0],f);
    if((vdot(r,r)||0) < 1e-7) r=vcross([1,0,0],f);
  }
  return vnorm(r);
}

// Free-fly camera state (no orbital target coupling)
const LANDING_START_D_UA = 785.39;
const LANDING_START_A_DEG = 7.5;
const LANDING_START_R_DEG = 204.0;
const LANDING_START_DIST_WU = LANDING_START_D_UA * 10.0;
const INITIAL_LANDING_POSE = (()=>{
  const c=nodeCenter(SOH_ID);
  const brg=LANDING_START_R_DEG*DEG;
  const el=LANDING_START_A_DEG*DEG;
  const planar=Math.cos(el) * LANDING_START_DIST_WU;
  const pos=[
    c[0] + Math.sin(brg)*planar,
    c[1] + Math.sin(el)*LANDING_START_DIST_WU,
    c[2] + Math.cos(brg)*planar
  ];
  const yp=yawPitchToLook(pos, c);
  return { pos, yaw:yp.yaw, pitch:yp.pitch, target:c };
})();
let camPos=[...INITIAL_LANDING_POSE.pos];
let camYaw=INITIAL_LANDING_POSE.yaw;
let camPitch=INITIAL_LANDING_POSE.pitch;
let camRoll=0;
let camFwd=camForward(camYaw,camPitch);
let camUp=vnorm([0,1,0]);
let camSpeedMul=1.0;
let prevCamPos=[...camPos];
let camVel=[0,0,0];
let camSpd=0, camSpdSm=0, camFwdSpdSm=0;
let sysYaw=0, sysPitch=0, sysYawT=0, sysPitchT=0;
let menuOrbitOff=0, menuOrbitOffT=0;
let cardSpin=0, cardSpinT=0, cardSpinV=0;

// For smooth flight: these drift toward key input
let projM=persp(62*DEG,W()/H(),0.1,WORLD_FAR_CLIP);
let viewM=viewFromCameraBasis(camPos,camFwd,camUp);
let vpM=mul(projM,viewM);

// Mouse inertia
let dragging=false,lmx=0,lmy=0;
let vTheta=0,vPhi=0,vScroll=0;
let dragMode='orbit'; // 'orbit' | 'cards'
let downX=0, downY=0, downTS=0;
let menuTrans=null; // {toId,t,swapDone,fromYaw,fromPitch,toYaw,toPitch}
let hoverMouseX=W()*0.5, hoverMouseY=H()*0.5;
let hoverPointerInside=false;

const cur=document.getElementById('cur');
const reticleEl=document.getElementById('reticle');
const aimCalHudEl=document.getElementById('aimCalHud');
const aimCalStepEl=document.getElementById('aimCalStep');
const aimCalUpEl=document.getElementById('aimCalUp');
const aimCalDownEl=document.getElementById('aimCalDown');
const aimCalLeftEl=document.getElementById('aimCalLeft');
const aimCalRightEl=document.getElementById('aimCalRight');
const aimCalResetEl=document.getElementById('aimCalReset');
const aimCalYawValEl=document.getElementById('aimCalYawVal');
const aimCalPitchValEl=document.getElementById('aimCalPitchVal');
const AIM_OFFSET_LS_KEY='secc_aim_offset_v1';
let AIM_CENTER_OFFSET_X_PX=0.0;
let AIM_CENTER_OFFSET_Y_PX=0.0;
function loadAimOffset(){
  try{
    const raw=localStorage.getItem(AIM_OFFSET_LS_KEY);
    const p=raw ? JSON.parse(raw) : null;
    if(p && typeof p==='object'){
      AIM_CENTER_OFFSET_X_PX=Number.isFinite(Number(p.xPx)) ? Number(p.xPx) : 0.0;
      AIM_CENTER_OFFSET_Y_PX=Number.isFinite(Number(p.yPx)) ? Number(p.yPx) : 0.0;
    }
  }catch(_){}
}
function saveAimOffset(){
  try{
    localStorage.setItem(AIM_OFFSET_LS_KEY, JSON.stringify({
      xPx: +AIM_CENTER_OFFSET_X_PX.toFixed(2),
      yPx: +AIM_CENTER_OFFSET_Y_PX.toFixed(2)
    }));
  }catch(_){}
}
function applyAimReticleOffsetVisual(){
  if(!reticleEl) return;
  reticleEl.style.left=`calc(50% + ${AIM_CENTER_OFFSET_X_PX.toFixed(2)}px)`;
  reticleEl.style.top=`calc(50% + ${AIM_CENTER_OFFSET_Y_PX.toFixed(2)}px)`;
}
function renderAimOffsetHud(){
  if(aimCalYawValEl) aimCalYawValEl.textContent=`${AIM_CENTER_OFFSET_X_PX.toFixed(1)} px`;
  if(aimCalPitchValEl) aimCalPitchValEl.textContent=`${AIM_CENTER_OFFSET_Y_PX.toFixed(1)} px`;
  applyAimReticleOffsetVisual();
}
function aimOffsetStepDeg(){
  const v=Number(aimCalStepEl && aimCalStepEl.value);
  return clamp(Number.isFinite(v) ? v : 2.0, 0.5, 80.0);
}
function nudgeAimOffset(yawDeltaDeg, pitchDeltaDeg){
  AIM_CENTER_OFFSET_X_PX += Number(yawDeltaDeg)||0;
  AIM_CENTER_OFFSET_Y_PX += Number(pitchDeltaDeg)||0;
  AIM_CENTER_OFFSET_X_PX=clamp(AIM_CENTER_OFFSET_X_PX,-420,420);
  AIM_CENTER_OFFSET_Y_PX=clamp(AIM_CENTER_OFFSET_Y_PX,-320,320);
  saveAimOffset();
  renderAimOffsetHud();
}
function initAimOffsetHud(){
  // Hard reset in code: always start from zero offset.
  AIM_CENTER_OFFSET_X_PX=0;
  AIM_CENTER_OFFSET_Y_PX=0;
  saveAimOffset();
  renderAimOffsetHud();
  if(aimCalStepEl){
    aimCalStepEl.addEventListener('change',()=>{
      const s=aimOffsetStepDeg();
      aimCalStepEl.value=s.toFixed(2);
    });
  }
  if(aimCalUpEl){
    aimCalUpEl.addEventListener('click',()=>{ nudgeAimOffset(0,+aimOffsetStepDeg()); });
  }
  if(aimCalDownEl){
    aimCalDownEl.addEventListener('click',()=>{ nudgeAimOffset(0,-aimOffsetStepDeg()); });
  }
  if(aimCalLeftEl){
    aimCalLeftEl.addEventListener('click',()=>{ nudgeAimOffset(-aimOffsetStepDeg(),0); });
  }
  if(aimCalRightEl){
    aimCalRightEl.addEventListener('click',()=>{ nudgeAimOffset(+aimOffsetStepDeg(),0); });
  }
  if(aimCalResetEl){
    aimCalResetEl.addEventListener('click',()=>{
      AIM_CENTER_OFFSET_X_PX=0;
      AIM_CENTER_OFFSET_Y_PX=0;
      saveAimOffset();
      renderAimOffsetHud();
    });
  }
}
initAimOffsetHud();
function syncCamBasisFromAngles(){
  camFwd=camForward(camYaw,camPitch);
  camUp=vnorm([0,1,0]);
}
function syncCamAnglesFromBasis(){
  const f=vnorm(camFwd);
  camYaw=Math.atan2(f[0],f[2]);
  camPitch=Math.atan2(f[1],Math.sqrt(f[0]*f[0]+f[2]*f[2]));
}
function ensureCamBasisMatchesAngles(){
  const fa=camForward(camYaw,camPitch);
  if(vdot(fa,camFwd) < 0.9995){
    syncCamBasisFromAngles();
  }
}
function rotateCamLocal(yawDelta,pitchDelta,rollDelta){
  const yD=Number.isFinite(yawDelta)?yawDelta:0;
  const pD=Number.isFinite(pitchDelta)?pitchDelta:0;
  const rD=Number.isFinite(rollDelta)?rollDelta:0;
  if(Math.abs(yD)+Math.abs(pD)+Math.abs(rD) < 1e-9) return;
  let f=vnorm(camFwd);
  let u=vnorm(camUp);
  let r=basisRightFromFU(f,u);
  if(Math.abs(yD)>0){
    f=vnorm(axisRotate(f,u,yD));
    r=vnorm(axisRotate(r,u,yD));
  }
  if(Math.abs(pD)>0){
    f=vnorm(axisRotate(f,r,pD));
    u=vnorm(axisRotate(u,r,pD));
  }
  if(Math.abs(rD)>0){
    u=vnorm(axisRotate(u,f,rD));
  }
  r=basisRightFromFU(f,u);
  u=vnorm(vcross(f,r));
  camFwd=f;
  camUp=u;
  syncCamAnglesFromBasis();
}
function rotateCamAroundAxis(axis, ang){
  const a=(Array.isArray(axis) && axis.length===3) ? vnorm(axis) : null;
  const rA=Number(ang)||0;
  if(!a || !Number.isFinite(a[0]) || !Number.isFinite(a[1]) || !Number.isFinite(a[2])) return;
  if(Math.abs(rA)<1e-9) return;
  const f=vnorm(axisRotate(camFwd, a, rA));
  const u=vnorm(axisRotate(camUp, a, rA));
  if(!Number.isFinite(f[0]) || !Number.isFinite(f[1]) || !Number.isFinite(f[2])) return;
  if(!Number.isFinite(u[0]) || !Number.isFinite(u[1]) || !Number.isFinite(u[2])) return;
  camFwd=f;
  camUp=u;
  syncCamAnglesFromBasis();
}
function currentAimTargetPos(){
  return currentAimScreenPosRaw();
}
function currentAimScreenPosRaw(){
  if(reticleEl && typeof reticleEl.getBoundingClientRect==='function'){
    const r=reticleEl.getBoundingClientRect();
    if(r.width>0 && r.height>0){
      return [r.left + r.width*0.5, r.top + r.height*0.5];
    }
  }
  return [W()*0.5, H()*0.5];
}
function currentAimScreenPos(){
  return currentAimScreenPosRaw();
}
function centerAimCursor(){
  return;
}
window.addEventListener('mousemove',e=>{
  hoverMouseX=e.clientX;
  hoverMouseY=e.clientY;
  hoverPointerInside=sceneContainsPoint(e.clientX,e.clientY);
  if(rightMoveActive){
    const dir=crosshairAimDir();
    if(dir) rightMoveDir=dir;
  }
  if(!dragging) return;
  markCommandLearned('mouse');
  const dx=e.clientX-lmx, dy=e.clientY-lmy;
  if(dragMode==='orbit'){
    if(activeNodeId){
      // Docked to a system: drag controls orbital plane + menu travel.
      vTheta+=dx*0.0021;
      vPhi  +=dy*0.0017;
      menuOrbitOffT += dx*0.0034;
    }else{
      // Free cosmos: drag rotates the camera directly.
      rotateCamLocal(dx*0.0042, -dy*0.0032, 0);
    }
  }else if(dragMode==='cards'){
    // Horizontal drag rotates the "vetrina" of cards (no auto-rotation).
    const dd = dx*0.0060;
    cardSpinT += dd;
    cardSpinV = dd; // inertia sample
  }
  lmx=e.clientX; lmy=e.clientY;
});
cv.addEventListener('pointerdown',e=>{
  if(tipCalAutoMode && e.button===0 && tipCalGuideIdx===0 && !tipCalCenterOverrideUv){
    e.preventDefault();
    e.stopPropagation();
    const p=setTipCalibrationCenterFromScreen(e.clientX, e.clientY);
    setTipGuideMarker(p[0], p[1], true);
    if(tipCalStatusEl){
      tipCalStatusEl.textContent='Centro impostato. Ora premi Auto ON oppure OK punto.';
    }
    syncTipHoverOffsetHud();
    return;
  }
  if(tipCalCaptureArmed && e.button===0){
    e.preventDefault();
    e.stopPropagation();
    captureTipOffsetSample(e.clientX, e.clientY);
    return;
  }
  markCommandLearned('mouse');
  document.body.classList.add('is-pointer-down');
  if(SECC_GLASS.isOpen()) return;
  if(autoPilot || navTrans){
    interruptAutonomousNavigation();
    return;
  }
  if(e.button===2){
    if(phase!=='done' || !ctrlOn || menuTrans || navTrans || autoPilot) return;
    e.preventDefault();
    const dir=crosshairAimDir();
    if(dir){ rightMoveActive=true; rightMoveDir=dir; }
    return;
  }
  if(phase!=='done' || !ctrlOn || menuTrans || navTrans || autoPilot) return;
  // If the pointer is over a 3D card, drag moves the card carousel.
  dragMode = (pickCardAt(e.clientX,e.clientY) >= 0) ? 'cards' : 'orbit';
  dragging=true; lmx=e.clientX; lmy=e.clientY;
  if(dragMode==='orbit'){ vTheta=0; vPhi=0; }
  downX=e.clientX; downY=e.clientY; downTS=performance.now();
  cv.setPointerCapture(e.pointerId);
});
window.addEventListener('pointerup',e=>{
  document.body.classList.remove('is-pointer-down');
  if(e.button===2){
    rightMoveActive=false;
    rightMoveDir=[0,0,1];
    return;
  }
  if(!dragging) return;
  dragging=false;
  dragMode='orbit';
  if(SECC_GLASS.isOpen()) return;
  if(phase!=='done' || !ctrlOn || menuTrans || navTrans || autoPilot) return;
  const dx=e.clientX-downX, dy=e.clientY-downY;
  const d=Math.sqrt(dx*dx+dy*dy);
  const dt=performance.now()-downTS;
  if(d<7 && dt<260) handlePick(e.clientX,e.clientY);
});
window.addEventListener('pointercancel',()=>document.body.classList.remove('is-pointer-down'));
window.addEventListener('wheel',e=>{
  if(SECC_GLASS.isOpen() || SECC_GUIDE.isOpen()) return;
  markCommandLearned('mouse');
  if(ctrlOn && !autoPilot)vScroll+=e.deltaY*0.0035;
},{passive:true});
document.addEventListener('mouseleave',()=>{
  document.body.classList.remove('is-pointer-down');
  hoverPointerInside=false;
});

const keys={};
function clearInputBuffer(){
  for(const k in keys) keys[k]=false;
  dragging=false;
  dragMode='orbit';
  rightMoveActive=false;
  rightMoveDir=[0,0,1];
  hideHoverObjectTip();
}
window.addEventListener('keydown',e=>{
  if(SECC_GUIDE.isOpen()){
    if(e.key==='Escape'){
      SECC_GUIDE.close();
      e.preventDefault();
    }
    return;
  }
  if(e.key==='F1' || e.key==='?'){
    e.preventDefault();
    SECC_GUIDE.open(true);
    return;
  }
  if(e.key==='Escape' && SECC_GLASS.isOpen()){
    SECC_GLASS.close();
    return;
  }
  if(coordEditOpen){
    if(e.key==='Escape'){ closeCoordEdit(); return; }
    if(e.key==='Enter'){ applyCoordEdit(); return; }
    return;
  }
  if((autoPilot || navTrans) && (e.code==='Space' || e.key===' ' || e.key==='Spacebar')){
    e.preventDefault();
    interruptAutonomousNavigation();
    return;
  }
  const ae=document.activeElement;
  if(ae && (ae.tagName==='INPUT' || ae.tagName==='TEXTAREA' || ae.tagName==='SELECT' || ae.isContentEditable)) return;
  const k=e.key.toLowerCase();
  keys[k]=true;
  if(k==='w' || k==='a' || k==='s' || k==='d') markCommandLearned('wasd');
  if(k==='q') markCommandLearned('q');
  if(k==='e') markCommandLearned('e');
  if(k==='arrowup' || k==='arrowdown' || k==='arrowleft' || k==='arrowright') markCommandLearned('arrows');
  if(k==='control' || k==='ctrl') markCommandLearned('ctrl');
  if(k==='alt') markCommandLearned('alt');
  if((k==='arrowleft' || k==='arrowright') && (keys['control'] || keys['ctrl'])) markCommandLearned('roll');
  if((keys['control'] || keys['ctrl']) && keys['alt']) markCommandLearned('ctrlalt');
  if(e.key==='Escape' && phase==='done' && ctrlOn && !menuTrans && !navTrans && !autoPilot && menuId!=='root'){
    const back = MENU_DEFS[menuId]?.back || 'root';
    navigateSoByMode(back);
  }
});
window.addEventListener('keyup',  e=>{
  // Always release the key state first, even when overlays/inputs are open.
  keys[e.key.toLowerCase()]=false;
  if(coordEditOpen) return;
  const ae=document.activeElement;
  if(ae && (ae.tagName==='INPUT' || ae.tagName==='TEXTAREA' || ae.tagName==='SELECT' || ae.isContentEditable)) return;
});
window.addEventListener('contextmenu',e=>{ if(rightMoveActive) e.preventDefault(); });
window.addEventListener('blur', ()=>{ clearInputBuffer(); flushUserConfidence(true); });
window.addEventListener('pagehide', ()=>{ clearInputBuffer(); flushUserConfidence(true); });
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) clearInputBuffer(); });

function setCtrlHudVisible(on){
  const show=Boolean(on);
  const showMove=show && (hasVisibleGroupForPanel('move') || (tipForcePanel==='move' && tipForceT>0));
  const showCamera=show && (hasVisibleGroupForPanel('camera') || (tipForcePanel==='camera' && tipForceT>0));
  if(hudMoveEl) hudMoveEl.classList.toggle('hud-dyn-hidden', !showMove);
  if(hudCameraEl) hudCameraEl.classList.toggle('hud-dyn-hidden', !showCamera);
}
function isCtrlHudMotionActive(){
  if(autoPilot || navTrans || menuTrans || rightMoveActive || dragging) return true;
  if(Math.abs(vScroll)>0.004) return true;
  return Boolean(
    keys['w']||keys['a']||keys['s']||keys['d']||
    keys['q']||keys['e']||
    keys['arrowup']||keys['arrowdown']||keys['arrowleft']||keys['arrowright']
  );
}
function updateCtrlHudVisibility(dt){
  if(!hudMoveEl && !hudCameraEl) return;
  markUsedControlGroupsFromInput();
  if(!document.body.classList.contains('live')){
    setCtrlHudVisible(false);
    updateCtrlGroupVisibility(dt,false);
    return;
  }
  // Absolute priority: if a tip is active, keep its panel/group visible.
  if(tipForceT>0){
    setCtrlHudVisible(true);
    updateCtrlGroupVisibility(dt,true);
    return;
  }
  if(isCtrlHudMotionActive()){
    ctrlHudHoldT=2.4;
    ctrlHudPeekT=0;
    ctrlHudNextPeek=4.0 + Math.random()*7.0;
    setCtrlHudVisible(true);
    updateCtrlGroupVisibility(dt,true);
    return;
  }
  ctrlHudHoldT=Math.max(0, ctrlHudHoldT-dt);
  if(ctrlHudHoldT>0){
    setCtrlHudVisible(true);
    updateCtrlGroupVisibility(dt,true);
    return;
  }
  if(ctrlHudPeekT>0){
    ctrlHudPeekT=Math.max(0, ctrlHudPeekT-dt);
    setCtrlHudVisible(true);
    updateCtrlGroupVisibility(dt,true);
    return;
  }
  ctrlHudNextPeek-=dt;
  if(ctrlHudNextPeek<=0){
    ctrlHudPeekT=1.0 + Math.random()*1.6;
    ctrlHudNextPeek=5.5 + Math.random()*9.5;
    setCtrlHudVisible(true);
    updateCtrlGroupVisibility(dt,true);
    return;
  }
  setCtrlHudVisible(false);
  updateCtrlGroupVisibility(dt,false);
}
let thrustBoost=0; // 0=none, 1=ctrl boost, 2=alt boost, 3=ctrl+alt boost
let manualMoveInputActive=false;
let autoPilot=null; // {kind,toId?,targetPos,lookPos,dockAz?,routeAz,routeEl,routeDist,startDist,bestDist,autoHyperEligible,posStopPos?,posStopRange?,moveDir,navTargetSm,dockBlend,approachStartDist,stage,stageT,tCoastIn,tShiftUp,tShiftDown,tCoastOut,arrivalDist,alignYaw,alignPitch}
let coordNavDockArm=false; // DARH navigation can activate SO menu on first docking.
let arrivalEase=null; // {t,dur,fromPos,toPos,fromYaw,fromPitch,toYaw,toPitch}
let autoDockCd=0;
let attachedCoordKey='';
let attachedCoordPos=null;
let attachedCoordReleaseWU=SO_RELEASE_RADIUS;
const BASE_TRAVEL_SPEED=6.8;
const BOOST_LEVEL_1=1.0;
const BOOST_SUPER_LEVEL=2.0;
const BOOST_HYPER_LEVEL=3.0;
const CAMERA_ARROW_YAW_SPEED=1.20;   // rad/s, constant in all conditions
const CAMERA_ARROW_PITCH_SPEED=1.20; // rad/s, constant in all conditions
const CAMERA_ARROW_ROLL_SPEED=1.35;  // rad/s for Ctrl+Left/Right camera roll
const AUTO_HYPER_MIN_DIST=3200; // enable automatic hyperboost only on extreme-range transfers
const SO_POINT_STANDOFF=14.0;   // ~1.4 UA safety shell for explicit point targets inside a SO
const SO_POINT_STOP_RANGE=14.0; // stop when entering ~1.4 UA from SO center or target object
const AUTO_DOCK_DARR_DIST_UA=1.08;
const AUTO_DOCK_DARR_A=19.0;
const AUTO_DOCK_DARR_R=185.0;
const AUTO_DOCK_FINAL_YAW_RIGHT_OFFSET=10.0*DEG;
const MAX_ATTACH_DISTANCE_UA=1000.0;
const MAX_ATTACH_DISTANCE_WU=MAX_ATTACH_DISTANCE_UA*10.0;
const HOVER_OBJECT_MOUSE_RADIUS_PX=50.0;
const ENABLE_HOVER_3D_OBJECT_TIPS=false;
const AUTO_DOCK_USE_APPROACH_BEARING=true;
const AUTO_DOCK_DARR_DUR=0.55; // fast but smooth final settle to docked DARR pose
const AP_SLOW_START_UA=10.0;
const AP_SLOW_END_UA=2.0;
const FINAL_SOFT_CRUISE_UA=3.0;
const AP_SLOW_START_WU=AP_SLOW_START_UA*10.0;
const AP_SLOW_END_WU=AP_SLOW_END_UA*10.0;
const FINAL_SOFT_CRUISE_WU=FINAL_SOFT_CRUISE_UA*10.0;
const SYSTEM_FADE_START_UA=40.0;
const SYSTEM_FADE_END_UA=320.0;
const SYSTEM_FADE_START_WU=SYSTEM_FADE_START_UA*10.0;
const SYSTEM_FADE_END_WU=SYSTEM_FADE_END_UA*10.0;
function interruptAutonomousNavigation(){
  if(autoPilot){
    stopAutopilot(false);
    return true;
  }
  if(navTrans){
    // Abort timeline-based transfer and return immediately to manual control.
    const lookFrom=(Array.isArray(animPos) && animPos.length===3) ? animPos : camPos;
    const lookTo=(Array.isArray(animTarget) && animTarget.length===3)
      ? animTarget
      : vadd(lookFrom,[Math.sin(camYaw)*Math.cos(camPitch),Math.sin(camPitch),Math.cos(camYaw)*Math.cos(camPitch)]);
    camPos=[+lookFrom[0]||0,+lookFrom[1]||0,+lookFrom[2]||0];
    const yp=yawPitchToLook(camPos, lookTo);
    if(Number.isFinite(yp.yaw) && Number.isFinite(yp.pitch)){
      camYaw=yp.yaw;
      camPitch=yp.pitch;
      camRoll=0;
    }
    navTrans=null;
    SECC_HUD.setTravelPctOverlay(true,0);
    SECC_HUD.setTravelBoostBar(0,'CRUISE');
    phase='done';
    ctrlOn=true;
    started=true;
    warpSpeed=0;
    menuFade=1;
    orbitApproach=1;
    centerAimCursor();
    systemZ=0;
    systemScale=1;
    thrustBoost=0;
    rightMoveActive=false;
    rightMoveDir=[0,0,1];
    for(const k in keys) keys[k]=false;
    return true;
  }
  return false;
}
function nearestMenuIdTo(p){
  let bestI=-1, bestD2=1e18;
  for(let i=0;i<BCN_COUNT;i++){
    const dx=bcnPos[i*3]-p[0], dy=bcnPos[i*3+1]-p[1], dz=bcnPos[i*3+2]-p[2];
    const d2=dx*dx+dy*dy+dz*dz;
    if(d2<bestD2){ bestD2=d2; bestI=i; }
  }
  return { id: bestI>=0 ? BCN_IDS[bestI] : null, d2: bestD2 };
}
function dockNearestSo(activateMenu, snapView=true){
  const prevActive=activeNodeId;
  const n=nearestMenuIdTo(camPos);
  if(!n.id) return false;
  const d=Math.sqrt(n.d2);
  if(d >= SO_DOCK_RADIUS) return false;

  const shouldActivateMenu = (n.id!==menuId);
  if(n.id!==activeNodeId){
    if(shouldActivateMenu){
      activeNodeId=n.id;
      SECC_HUD.syncSoHud({activeNodeId, camPos});
      startSoftSwap(n.id);
      autoDockCd=1.2;
    }else{
      if(snapView) setDockedView(n.id);
      activeNodeId=n.id;
      SECC_HUD.syncSoHud({activeNodeId, camPos});
      autoDockCd=Math.max(autoDockCd,0.35);
    }
  }else{
    SECC_HUD.syncSoHud({activeNodeId, camPos});
    // If already docked to this SO but its menu is not active, activate it.
    if(shouldActivateMenu){
      startSoftSwap(n.id);
      autoDockCd=Math.max(autoDockCd,1.2);
    }
  }
  if(n.id!==prevActive){
    showCommsAttachToast({kind:'so', id:n.id});
  }
  return true;
}

function angleDelta(from,to){
  let d=(to-from+PI)%TAU;
  if(d<0) d+=TAU;
  return d-PI;
}
function updateAimCursor(dt){ return; }
function updateThrustBoost(dt, boostTarget){
  const isCtrl = boostTarget>=1.5;
  const catchup = boostTarget > thrustBoost ? (isCtrl ? 12.0 : 9.0) : 6.0;
  thrustBoost += (boostTarget-thrustBoost)*Math.min(1,dt*catchup);
}
function speedBoostFromThrust(v){
  const shiftPart=Math.min(v,1.0)*11.4;
  const superPart=clamp(v-1.0,0,1)*37.4;
  const hyperPart=Math.max(0,v-2.0)*49.8;
  return 1.0 + shiftPart + superPart + hyperPart;
}
function travelSpeedAtBoostLevel(boostLevel){
  return BASE_TRAVEL_SPEED*camSpeedMul*speedBoostFromThrust(boostLevel);
}
function currentTravelSpeed(){
  return travelSpeedAtBoostLevel(thrustBoost);
}
function autopilotCruiseBoostLevel(ap){
  return (ap && ap.autoHyperEligible) ? BOOST_HYPER_LEVEL : BOOST_SUPER_LEVEL;
}
function nearestSoCenterToPos(pos){
  let bestId=null, bestC=null, bestD=Infinity;
  for(const id of BCN_IDS){
    if(!MENU_DEFS[id]) continue;
    const c=nodeCenter(id);
    const dx=pos[0]-c[0], dy=pos[1]-c[1], dz=pos[2]-c[2];
    const d=Math.sqrt(dx*dx+dy*dy+dz*dz);
    if(d<bestD){ bestD=d; bestId=id; bestC=c; }
  }
  return {id:bestId, c:bestC, d:bestD};
}
function rebuildCoordinateRegistry(){
  if(!coordRegistry) return;
  coordRegistry.clear();
  const ids=Object.keys(NAV_NODES||{});
  const soEntries=ids.map((id)=>{
    const c=nodeCenter(id);
    return {
      id,
      kind:'so',
      pos:c,
      meta:{
        darr:{
          dUa:1.08,
          aDeg:19.0,
          rDeg:185.0
        }
      }
    };
  }).filter((it)=>Array.isArray(it.pos) && it.pos.length===3 && Number.isFinite(it.pos[0]) && Number.isFinite(it.pos[1]) && Number.isFinite(it.pos[2]));
  coordRegistry.registerMany(soEntries);
  coordRegistry.register({
    id:CROSS_CALIBR_ID,
    kind:'object',
    pos:[CROSS_CALIBR_POS[0], CROSS_CALIBR_POS[1], CROSS_CALIBR_POS[2]],
    meta:{
      label:CROSS_CALIBR_NAME,
      darr:{
        dUa:CROSS_CALIBR_DARR.dUa,
        aDeg:CROSS_CALIBR_DARR.aDeg,
        rDeg:CROSS_CALIBR_DARR.rDeg
      }
    }
  });
  if(cosmicWord && Array.isArray(cosmicWord.anchor) && cosmicWord.anchor.length===3){
    const a=cosmicWord.anchor;
    if(Number.isFinite(a[0]) && Number.isFinite(a[1]) && Number.isFinite(a[2])){
      coordRegistry.register({
        id:'controlchaos',
        kind:'object',
        pos:[a[0],a[1],a[2]],
        meta:{
          label:CONTROLCHAOS_LABEL,
          darr:{
            dUa:CONTROLCHAOS_DARR_D_UA,
            aDeg:19.0,
            rDeg:185.0
          }
        }
      });
    }
  }
  // Physical stars must be attachable too (not only visual).
  if(realStarN>0 && realStarPos && realStarPos.length>=realStarN*3){
    const starEntries=[];
    for(let i=0;i<realStarN;i++){
      const i3=i*3;
      const x=realStarPos[i3], y=realStarPos[i3+1], z=realStarPos[i3+2];
      if(!(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z))) continue;
      const hex=String(i).toUpperCase(16).padStart(4,'0');
      starEntries.push({
        id:`star-${hex}`,
        kind:'star',
        pos:[x,y,z],
        meta:{
          label:`Stella ${hex}`,
          darr:{ dUa:2.4, aDeg:19.0, rDeg:185.0 }
        }
      });
    }
    if(starEntries.length) coordRegistry.registerMany(starEntries);
  }
  rebuildObjectSearchIndex();
}
function nearestCoordinateObjectToPos(pos){
  const p=(Array.isArray(pos) && pos.length===3) ? pos : camPos;
  if(coordRegistry) return coordRegistry.nearest(p, { allowCoincident:false });
  return null;
}
function calcDarhFromPos(pos){
  if(!(Array.isArray(pos) && pos.length===3)) return null;
  const dx=(+pos[0]||0)-SOH[0], dy=(+pos[1]||0)-SOH[1], dz=(+pos[2]||0)-SOH[2];
  const distWU=Math.sqrt(dx*dx + dy*dy + dz*dz);
  const horiz=Math.sqrt(dx*dx + dz*dz);
  const dUa=distWU/10;
  const aDeg=Math.atan2(dy, horiz || 1e-9)/DEG;
  const rDeg=((Math.round(azDegFromXZ(dx,dz))%360)+360)%360;
  return { dUa, aDeg, rDeg };
}
function buildDynamicAttachCandidates(){
  const out=[];
  function pushCandidate(id, pos, label){
    if(!(Array.isArray(pos) && pos.length===3)) return;
    const x=+pos[0], y=+pos[1], z=+pos[2];
    if(!(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z))) return;
    out.push({
      id:String(id||'dyn'),
      kind:'dynamic',
      pos:[x,y,z],
      meta:{
        label:String(label||'Oggetto dinamico'),
        darr:{ dUa:1.2, aDeg:19.0, rDeg:185.0 }
      }
    });
  }
  // Dynamic marbles in currently loaded SO system.
  if(Array.isArray(mSt) && Array.isArray(RINGS) && mSt.length){
    const sysM = mul(
      tmat(activeNodeP[0],activeNodeP[1],activeNodeP[2]+systemZ),
      mul(rY(sysYaw), mul(rX(sysPitch), smat(systemScale)))
    );
    const soName=SO_LABELS[menuId] || `SO ${String(menuId||'').toUpperCase()}`;
    for(let i=0;i<mSt.length;i++){
      const s=mSt[i];
      if(!s) continue;
      const rg=RINGS[s.ri] || RINGS[0];
      if(!rg) continue;
      const rr=(Number.isFinite(s.orbitR)?s.orbitR:rg.r)+s.rad;
      const bx=Math.cos(s.th)*rr, bz=Math.sin(s.th)*rr;
      const rp=xfm3(s.orbitRot||RING_ROT[s.ri],bx,BASE_Y,bz);
      const wp=xfm3(sysM,rp[0],rp[1],rp[2]);
      pushCandidate(`dyn-${menuId}-m${i}`, wp, `${soName} · Oggetto ${i+1}`);
    }
  }
  // Dynamic marbles in nearby map systems.
  if(Array.isArray(mapVisible) && mapVisible.length){
    for(let k=0;k<mapVisible.length;k++){
      const inst=mapVisible[k];
      if(!inst || !Array.isArray(inst.mSt) || !Array.isArray(inst.rings)) continue;
      const sysM=mul(tmat(inst.pos[0],inst.pos[1],inst.pos[2]), mul(rY(inst.spin), smat(1.0)));
      const soName=SO_LABELS[inst.id] || `SO ${String(inst.id||'').toUpperCase()}`;
      for(let i=0;i<inst.mSt.length;i++){
        const s=inst.mSt[i];
        if(!s) continue;
        const rg=inst.rings[s.ri] || inst.rings[0];
        if(!rg) continue;
        const rr=(Number.isFinite(s.orbitR)?s.orbitR:rg.r)+s.rad;
        const bx=Math.cos(s.th)*rr, bz=Math.sin(s.th)*rr;
        const rp=xfm3(s.orbitRot,bx,BASE_Y,bz);
        const wp=xfm3(sysM,rp[0],rp[1],rp[2]);
        pushCandidate(`dyn-${inst.id}-m${i}`, wp, `${soName} · Oggetto ${i+1}`);
      }
    }
  }
  return out;
}
function nearestDynamicAttachToPos(pos){
  const p=(Array.isArray(pos) && pos.length===3) ? pos : camPos;
  const list=buildDynamicAttachCandidates();
  let best=null, bestD2=Infinity;
  for(let i=0;i<list.length;i++){
    const it=list[i];
    const dx=p[0]-it.pos[0], dy=p[1]-it.pos[1], dz=p[2]-it.pos[2];
    const d2=dx*dx + dy*dy + dz*dz;
    if(d2<bestD2){ bestD2=d2; best=it; }
  }
  return best ? { ...best, d2:bestD2 } : null;
}
function isAttachEligibleEntry(entry){
  if(!entry) return false;
  const k=String(entry.kind||'').toLowerCase();
  // Attach only principal objects:
  // - SO centers
  // - dispersed stars in deep space
  // - explicit main objects (e.g. ControlChaos anchor)
  // Exclude dynamic internal parts (marbles/orbits/etc.).
  return k==='so' || k==='star' || k==='object';
}
function nearestAttachableRegistryEntry(pos){
  if(!coordRegistry || typeof coordRegistry.all!=='function') return null;
  const p=(Array.isArray(pos) && pos.length===3) ? pos : camPos;
  const items=coordRegistry.all();
  let best=null, bestD2=Infinity;
  for(let i=0;i<items.length;i++){
    const it=items[i];
    if(!isAttachEligibleEntry(it)) continue;
    if(!(Array.isArray(it.pos) && it.pos.length===3)) continue;
    const dx=p[0]-it.pos[0], dy=p[1]-it.pos[1], dz=p[2]-it.pos[2];
    const d2=dx*dx + dy*dy + dz*dz;
    if(d2<bestD2){ bestD2=d2; best=it; }
  }
  return best ? { ...best, d2:bestD2 } : null;
}
function getNearestAttachableEntry(pos){
  const p=(Array.isArray(pos) && pos.length===3) ? pos : camPos;
  const best=nearestAttachableRegistryEntry(p);
  const bestD=(best && Number.isFinite(best.d2)) ? Math.sqrt(Math.max(0,best.d2)) : Infinity;
  const bestAttach=best ? entryAttachRangeWU(best) : Infinity;
  if(best && bestD<=Math.min(bestAttach, MAX_ATTACH_DISTANCE_WU)) return best;
  return null;
}
function getRegistryEntry(kind, id){
  if(!coordRegistry || typeof coordRegistry.all!=='function') return null;
  const k=String(kind||'').trim().toLowerCase();
  const key=String(id||'').trim().toLowerCase();
  if(!k || !key) return null;
  const items=coordRegistry.all();
  for(let i=0;i<items.length;i++){
    const it=items[i];
    if(String(it.kind||'').toLowerCase()!==k) continue;
    if(String(it.id||'').toLowerCase()!==key) continue;
    return it;
  }
  return null;
}
function getEntryDarrSpec(entry){
  const metaDarr=(entry && entry.meta && entry.meta.darr && typeof entry.meta.darr==='object') ? entry.meta.darr : null;
  if(metaDarr && Number.isFinite(metaDarr.dUa) && Number.isFinite(metaDarr.aDeg) && Number.isFinite(metaDarr.rDeg)){
    return { dUa:metaDarr.dUa, aDeg:metaDarr.aDeg, rDeg:metaDarr.rDeg };
  }
  if(!entry) return { dUa:AUTO_DOCK_DARR_DIST_UA, aDeg:AUTO_DOCK_DARR_A, rDeg:AUTO_DOCK_DARR_R };
  if(entry.kind==='so') return { dUa:AUTO_DOCK_DARR_DIST_UA, aDeg:AUTO_DOCK_DARR_A, rDeg:AUTO_DOCK_DARR_R };
  const id=String(entry.id||'').toLowerCase();
  if(id===CROSS_CALIBR_ID) return { dUa:CROSS_CALIBR_DARR.dUa, aDeg:CROSS_CALIBR_DARR.aDeg, rDeg:CROSS_CALIBR_DARR.rDeg };
  if(id==='controlchaos') return { dUa:CONTROLCHAOS_DARR_D_UA, aDeg:AUTO_DOCK_DARR_A, rDeg:AUTO_DOCK_DARR_R };
  return { dUa:2.4, aDeg:AUTO_DOCK_DARR_A, rDeg:AUTO_DOCK_DARR_R };
}
function darrDistUaForEntry(entry){
  return getEntryDarrSpec(entry).dUa;
}
function entryAttachRangeWU(entry){
  const dUa=Number(darrDistUaForEntry(entry));
  const id=String(entry && entry.id || '').toLowerCase();
  const extraUa=(id==='controlchaos') ? CONTROLCHAOS_ATTACH_EXTRA_UA : 0.0;
  if(Number.isFinite(dUa) && dUa>0){
    return Math.min(MAX_ATTACH_DISTANCE_WU, Math.max(2.0, (dUa + extraUa)*10.0));
  }
  return SO_DOCK_RADIUS;
}
function entryReleaseRangeWU(entry){
  const a=entryAttachRangeWU(entry);
  return a + Math.max(2.0, a*0.20);
}
function entryCenterPos(entry){
  if(!entry) return null;
  if(entry.kind==='so'){
    const id=String(entry.id||'');
    if(id && NAV_NODES[id]) return nodeCenter(id);
  }
  if(Array.isArray(entry.pos) && entry.pos.length===3){
    return [entry.pos[0],entry.pos[1],entry.pos[2]];
  }
  return null;
}
function getEntryDarrPose(entry, opts){
  const c=entryCenterPos(entry);
  if(!c) return null;
  const spec=getEntryDarrSpec(entry);
  const distWU=Math.max(0.1, Number(spec.dUa||0)*10.0);
  const elevR=clamp(Number(spec.aDeg||0),-89.9,89.9)*DEG;
  const brgR=(((Number(spec.rDeg||0)%360)+360)%360)*DEG;
  const horiz=Math.cos(elevR)*distWU;
  const dy=Math.sin(elevR)*distWU;
  const dx=Math.sin(brgR)*horiz;
  const dz=Math.cos(brgR)*horiz;
  const pos=[c[0]+dx, c[1]+dy, c[2]+dz];
  const yp=yawPitchToLook(pos, c);
  const centerOnTarget=Boolean(opts && opts.centerOnTarget);
  const yawOffset=Number.isFinite(Number(opts && opts.yawOffsetRad))
    ? Number(opts.yawOffsetRad)
    : (centerOnTarget ? 0 : AUTO_DOCK_FINAL_YAW_RIGHT_OFFSET);
  return { pos, look:c, yaw:yp.yaw + yawOffset, pitch:yp.pitch };
}
function attachLabelForEntry(entry){
  if(!entry) return 'Oggetto';
  const id=String(entry.id||'').trim();
  if(entry.kind==='so'){
    return SO_LABELS[id] || (`SO ${id.toUpperCase()}`);
  }
  if(id.toLowerCase()===CROSS_CALIBR_ID) return CROSS_CALIBR_NAME;
  if(id.toLowerCase()==='controlchaos') return CONTROLCHAOS_LABEL;
  if(entry.kind==='dynamic'){
    const lab=(entry.meta && typeof entry.meta.label==='string') ? entry.meta.label.trim() : '';
    return lab || 'Oggetto dinamico';
  }
  if(entry.kind==='star'){
    const lab=(entry.meta && typeof entry.meta.label==='string') ? entry.meta.label.trim() : '';
    if(lab) return lab;
    const sid=id.replace(/^star-/i,'').toUpperCase();
    return sid ? `Stella ${sid}` : 'Stella';
  }
  return id ? (`Oggetto ${id}`) : 'Oggetto';
}
function hoverPickRadiusPxForEntry(entry){
  if(!entry) return 18;
  const id=String(entry.id||'').toLowerCase();
  if(id===CROSS_CALIBR_ID) return 52;
  if(id==='controlchaos') return 150; // big object but tighter hover area
  if(entry.kind==='so-part') return 52;
  if(entry.kind==='so') return 56;
  if(entry.kind==='star') return 38;
  if(entry.kind==='object') return 64;
  return 32;
}
function hoverHitRadiusWUForEntry(entry){
  if(!entry) return 4.0;
  const id=String(entry.id||'').toLowerCase();
  if(id===CROSS_CALIBR_ID) return 40.0;
  if(id==='controlchaos') return 160.0;
  if(entry.kind==='so-part') return 3.4;
  if(entry.kind==='so') return 10.0;
  if(entry.kind==='star') return 3.2;
  if(entry.kind==='object') return 10.0;
  return 3.0;
}
function isWorldPointInFront(pos){
  if(!(Array.isArray(pos) && pos.length===3)) return false;
  const to=vsub(pos, camPos);
  return vdot(to, camFwd) > 0.02;
}
function mouseRayWorldDir(mx,my){
  if(!(Number.isFinite(mx) && Number.isFinite(my))) return null;
  const vw=Math.max(1, W());
  const vh=Math.max(1, H());
  const nx=(mx/vw)*2 - 1;
  const ny=1 - (my/vh)*2;
  const tanY=(Number.isFinite(projM?.[5]) && Math.abs(projM[5])>1e-6) ? (1/projM[5]) : Math.tan((BASE_FOVY||1.08)*0.5);
  const tanX=(Number.isFinite(projM?.[0]) && Math.abs(projM[0])>1e-6) ? (1/projM[0]) : (tanY*sceneAspect());
  const rx=nx*tanX;
  const uy=ny*tanY;
  const f=vnorm(camFwd);
  const u=vnorm(camUp);
  const r=basisRightFromFU(f,u);
  const d=vadd(vadd(vscl(r,rx), vscl(u,uy)), f);
  const n=vnorm(d);
  return (Number.isFinite(n[0]) && Number.isFinite(n[1]) && Number.isFinite(n[2])) ? n : null;
}
function isMouseOverControlChaos(mx,my){
  if(!(cosmicWord && Array.isArray(cosmicWord.anchor) && cosmicWord.anchor.length===3)) return false;
  const anchor=cosmicWord.anchor;
  const face=vnorm(vsub(nodeCenter(SOH_ID), anchor));
  let right=vcross([0,1,0], face);
  if(vdot(right,right)<1e-6) right=[1,0,0];
  right=vnorm(right);
  const up=vnorm(vcross(face,right));
  const halfW=COSMIC_WORD_WORLD_W*0.52;
  const halfH=COSMIC_WORD_WORLD_H*0.62;
  const a=proj3(anchor, viewM, projM);
  const rx=proj3(vadd(anchor, vscl(right, halfW)), viewM, projM);
  const uy=proj3(vadd(anchor, vscl(up,    halfH)), viewM, projM);
  if(!a || !rx || !uy) return false;
  const ax=sceneScreenXFromNdc(a[0]), ay=sceneScreenYFromNdc(a[1]);
  const rpx=sceneScreenXFromNdc(rx[0]), rpy=sceneScreenYFromNdc(rx[1]);
  const upx=sceneScreenXFromNdc(uy[0]), upy=sceneScreenYFromNdc(uy[1]);
  const rvx=rpx-ax, rvy=rpy-ay;
  const uvx=upx-ax, uvy=upy-ay;
  const rl2=rvx*rvx + rvy*rvy;
  const ul2=uvx*uvx + uvy*uvy;
  if(!(rl2>36 && ul2>16)) return false;
  const mvx=mx-ax, mvy=my-ay;
  const u=(mvx*rvx + mvy*rvy)/rl2;
  const v=(mvx*uvx + mvy*uvy)/ul2;
  return Math.abs(u)<=1.08 && Math.abs(v)<=1.12;
}
function formatDarhLineFromPos(pos){
  const c=calcDarhFromPos(pos);
  if(!c) return 'DARH D--.-- A+--.- R---';
  const d=Number.isFinite(c.dUa) ? c.dUa.toFixed(2) : '--.--';
  const a=Number.isFinite(c.aDeg) ? `${c.aDeg>=0?'+':'-'}${Math.abs(c.aDeg).toFixed(1)}` : '+--.-';
  const r=Number.isFinite(c.rDeg) ? String(((Math.round(c.rDeg)%360)+360)%360).padStart(3,'0') : '---';
  return `DARH D${d} A${a} R${r}`;
}
function formatDistanceFromCameraLine(pos){
  if(!(Array.isArray(pos) && pos.length===3) || !(Array.isArray(camPos) && camPos.length===3)){
    return 'Dist da te --.-- UA';
  }
  const dx=(+pos[0]||0)-(+camPos[0]||0);
  const dy=(+pos[1]||0)-(+camPos[1]||0);
  const dz=(+pos[2]||0)-(+camPos[2]||0);
  const dUa=Math.sqrt(dx*dx + dy*dy + dz*dz)/10.0;
  if(!Number.isFinite(dUa)) return 'Dist da te --.-- UA';
  if(dUa>MAX_ATTACH_DISTANCE_UA) return `Dist da te >${MAX_ATTACH_DISTANCE_UA.toFixed(0)} UA`;
  return `Dist da te ${dUa.toFixed(2)} UA`;
}
function isAttachedToCrossCalibr(){
  return attachedCoordKey===`object:${CROSS_CALIBR_ID}`;
}
function syncTipCalibrationHudVisibility(){
  const on=isAttachedToCrossCalibr();
  if(tipCalHudEl){
    tipCalHudEl.classList.toggle('on', on);
    tipCalHudEl.setAttribute('aria-hidden', on ? 'false' : 'true');
  }
  if(!on){
    tipCalCaptureArmed=false;
    tipCalAutoMode=false;
    tipCalAutoCapture=false;
    tipCalGuideIdx=0;
    tipCalCenterOverrideUv=null;
    setTipGuideMarker(0,0,false);
    syncTipHoverOffsetHud();
  }
}
function isWithinTipDistanceRange(pos){
  if(!(Array.isArray(pos) && pos.length===3) || !(Array.isArray(camPos) && camPos.length===3)) return false;
  const dx=(+pos[0]||0)-(+camPos[0]||0);
  const dy=(+pos[1]||0)-(+camPos[1]||0);
  const dz=(+pos[2]||0)-(+camPos[2]||0);
  const dWu=Math.sqrt(dx*dx + dy*dy + dz*dz);
  return Number.isFinite(dWu) && dWu<=MAX_ATTACH_DISTANCE_WU;
}
function hoverDisplayEntry(entry){
  if(entry && entry.meta && entry.meta.hoverMain && typeof entry.meta.hoverMain==='object'){
    return entry.meta.hoverMain;
  }
  return entry;
}
function buildHoverCandidates(){
  const out=[];
  const push=(entry)=>{
    if(!entry || !Array.isArray(entry.pos) || entry.pos.length!==3) return;
    const x=+entry.pos[0], y=+entry.pos[1], z=+entry.pos[2];
    if(!(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z))) return;
    out.push(entry);
  };
  // Complex systems: allow hovering their internal dynamic pieces,
  // but always resolve label/DARH to the principal object (the SO center).
  const pushSoDynamicProxy=(soId, pickPos)=>{
    const soMain={ kind:'so', id:String(soId||''), pos:nodeCenter(soId) };
    push({
      kind:'so-part',
      id:`so-part-${String(soId||'')}`,
      pos:[pickPos[0],pickPos[1],pickPos[2]],
      meta:{ hoverMain:soMain }
    });
  };
  if(Array.isArray(mSt) && Array.isArray(RINGS) && mSt.length && menuId){
    const sysM=mul(
      tmat(activeNodeP[0],activeNodeP[1],activeNodeP[2]+systemZ),
      mul(rY(sysYaw), mul(rX(sysPitch), smat(systemScale)))
    );
    for(let i=0;i<mSt.length;i++){
      const s=mSt[i];
      if(!s) continue;
      const rg=RINGS[s.ri] || RINGS[0];
      if(!rg) continue;
      const rr=(Number.isFinite(s.orbitR)?s.orbitR:rg.r)+s.rad;
      const bx=Math.cos(s.th)*rr, bz=Math.sin(s.th)*rr;
      const rp=xfm3(s.orbitRot||RING_ROT[s.ri],bx,BASE_Y,bz);
      const wp=xfm3(sysM,rp[0],rp[1],rp[2]);
      pushSoDynamicProxy(menuId, wp);
    }
  }
  if(Array.isArray(mapVisible) && mapVisible.length){
    for(let k=0;k<mapVisible.length;k++){
      const inst=mapVisible[k];
      if(!inst || !Array.isArray(inst.mSt) || !Array.isArray(inst.rings)) continue;
      const sysM=mul(tmat(inst.pos[0],inst.pos[1],inst.pos[2]), mul(rY(inst.spin), smat(1.0)));
      for(let i=0;i<inst.mSt.length;i++){
        const s=inst.mSt[i];
        if(!s) continue;
        const rg=inst.rings[s.ri] || inst.rings[0];
        if(!rg) continue;
        const rr=(Number.isFinite(s.orbitR)?s.orbitR:rg.r)+s.rad;
        const bx=Math.cos(s.th)*rr, bz=Math.sin(s.th)*rr;
        const rp=xfm3(s.orbitRot,bx,BASE_Y,bz);
        const wp=xfm3(sysM,rp[0],rp[1],rp[2]);
        pushSoDynamicProxy(inst.id, wp);
      }
    }
  }
  if(coordRegistry && typeof coordRegistry.all==='function'){
    const all=coordRegistry.all();
    for(let i=0;i<all.length;i++) push(all[i]);
  }
  return out;
}
function hideHoverObjectTip(){
  if(!hoverObjTipEl) return;
  hoverObjTipEl.classList.remove('on');
  hoverObjTipEl.setAttribute('aria-hidden','true');
}
function showHoverObjectTip(entry, sx, sy){
  if(!hoverObjTipEl || !entry) return;
  // Keep tooltip on top of any late-mounted HUD/overlay layers.
  if(hoverObjTipEl.parentElement===document.body){
    document.body.appendChild(hoverObjTipEl);
  }
  const base=hoverDisplayEntry(entry);
  const name=attachLabelForEntry(base);
  const p=(base && base.pos) ? base.pos : entry.pos;
  if(!isWithinTipDistanceRange(p)){
    hideHoverObjectTip();
    return;
  }
  const darh=formatDarhLineFromPos(p);
  const distLine=formatDistanceFromCameraLine(p);
  if(hoverObjTipNameEl) hoverObjTipNameEl.textContent = name || 'Oggetto';
  if(hoverObjTipDarhEl) hoverObjTipDarhEl.textContent = `${darh}  |  ${distLine}`;
  hoverObjTipEl.classList.add('on');
  hoverObjTipEl.setAttribute('aria-hidden','false');
  hoverObjTipEl.style.left='-9999px';
  hoverObjTipEl.style.top='-9999px';
  const rect=hoverObjTipEl.getBoundingClientRect();
  const tipW=Math.max(120, rect.width||220);
  const tipH=Math.max(36, rect.height||54);
  const offset=14;
  const minX=8;
  const maxX=W() - tipW - 8;
  const minY=8;
  const maxY=H() - tipH - 8;
  let x=sx + offset;
  let y=sy + offset;
  if(x>maxX) x=sx - tipW - offset;
  if(y>maxY) y=sy - tipH - offset;
  x=clamp(x, minX, Math.max(minX,maxX));
  y=clamp(y, minY, Math.max(minY,maxY));
  hoverObjTipEl.style.left=`${Math.round(x)}px`;
  hoverObjTipEl.style.top=`${Math.round(y)}px`;
}
function showMouseHelpTip(title, text, sx, sy){
  if(!hoverObjTipEl) return;
  if(hoverObjTipEl.parentElement===document.body){
    document.body.appendChild(hoverObjTipEl);
  }
  if(hoverObjTipNameEl) hoverObjTipNameEl.textContent = String(title||'Help');
  if(hoverObjTipDarhEl) hoverObjTipDarhEl.textContent = String(text||'');
  hoverObjTipEl.classList.add('on');
  hoverObjTipEl.setAttribute('aria-hidden','false');
  hoverObjTipEl.style.left='-9999px';
  hoverObjTipEl.style.top='-9999px';
  const rect=hoverObjTipEl.getBoundingClientRect();
  const tipW=Math.max(120, rect.width||220);
  const tipH=Math.max(36, rect.height||54);
  const offset=14;
  const minX=8;
  const maxX=W() - tipW - 8;
  const minY=8;
  const maxY=H() - tipH - 8;
  let x=sx + offset;
  let y=sy + offset;
  if(x>maxX) x=sx - tipW - offset;
  if(y>maxY) y=sy - tipH - offset;
  x=clamp(x, minX, Math.max(minX,maxX));
  y=clamp(y, minY, Math.max(minY,maxY));
  hoverObjTipEl.style.left=`${Math.round(x)}px`;
  hoverObjTipEl.style.top=`${Math.round(y)}px`;
}
function resolveUiMouseHelp(mx,my){
  const stack=(typeof document.elementsFromPoint==='function')
    ? document.elementsFromPoint(mx,my)
    : [document.elementFromPoint(mx,my)];
  if(!Array.isArray(stack) || !stack.length) return null;
  const uiEl=stack.find((n)=>{
    if(!(n instanceof HTMLElement)) return false;
    if(n===hoverObjTipEl || n.id==='hoverObjTip') return false;
    if(n.id==='c') return false;
    const pe=getComputedStyle(n).pointerEvents;
    return pe!=='none';
  });
  if(!(uiEl instanceof HTMLElement)) return null;
  const hit=(sel)=>uiEl.closest(sel);
  if(hit('#soSelect')) return { title:'Sistemi Orbitanti', text:'Scegli una destinazione SO dal menu.' };
  if(hit('#helpMenuBtn')) return { title:'Menu Aiuti', text:'Apri gli aiuti guidati del sito.' };
  if(hit('#coordCell')) return { title:'Coordinate SOH', text:'Apri il pannello per inserire D, A, R.' };
  if(hit('#sorCell')) return { title:'DARR Aggancio', text:'Dati relativi all oggetto o SO agganciato.' };
  if(hit('#coordEditDist')) return { title:'Distanza (D)', text:'Inserisci distanza in UA.' };
  if(hit('#coordEditAz')) return { title:'Alto/Basso (A)', text:'Inserisci altezza in gradi.' };
  if(hit('#coordEditRil')) return { title:'Direzione (R)', text:'Inserisci direzione 0-359.' };
  if(hit('#coordEditGo')) return { title:'Autopilota Vai', text:'Avvia il viaggio verso le coordinate inserite.' };
  if(hit('#objSearchInput')) return { title:'Ricerca Oggetti', text:'Cerca un oggetto per compilare le coordinate.' };
  if(hit('#objSearchGo')) return { title:'Inserisci Coordinate', text:'Inserisce nel pannello le coordinate dell oggetto trovato.' };
  if(hit('#hudModeNavs') || hit('#commModeNavs')) return { title:'Modalita NAVS', text:'Mostra HUD di navigazione.' };
  if(hit('#hudModeComms') || hit('#commModeComms')) return { title:'Modalita COMMS', text:'Mostra HUD comunicazioni e messaggi.' };
  if(hit('#commMail')) return { title:'Messaggi', text:'Apri la finestra messaggi e aggiornamenti.' };
  if(hit('#navHud')) return { title:'HUD Navigazione', text:'Bussola, coordinate e stato viaggio.' };
  if(hit('#commHud')) return { title:'HUD Comunicazioni', text:'Target attivo e messaggi non letti.' };
  if(hit('#hudMove')) return { title:'Controlli Movimento', text:'WASD, Q/E, Ctrl, Alt, Ctrl+Alt.' };
  if(hit('#hudCamera')) return { title:'Controlli Camera', text:'Mouse e frecce per orientare la vista.' };
  return null;
}
function updateHoverObjectTip(){
  const dOff=tipDynamicOffsetForMouse(hoverMouseX, hoverMouseY);
  const pickX=hoverMouseX + dOff.x;
  const pickY=hoverMouseY + dOff.y;
  if(hoverMouseX<0 || hoverMouseY<0 || hoverMouseX>W() || hoverMouseY>H()){
    hideHoverObjectTip();
    return;
  }
  if(!ENABLE_HOVER_3D_OBJECT_TIPS){
    const uiTip=resolveUiMouseHelp(hoverMouseX,hoverMouseY);
    if(uiTip){
      showMouseHelpTip(uiTip.title, uiTip.text, hoverMouseX, hoverMouseY);
      return;
    }
    hideHoverObjectTip();
    return;
  }
  const list=buildHoverCandidates();
  if(!list.length){
    // Safety: rebuild registry lazily if empty (can happen after async init/order changes).
    try{ rebuildCoordinateRegistry(); }catch(_){}
  }
  const list2=buildHoverCandidates();
  if(!list2.length){
    hideHoverObjectTip();
    return;
  }
  const maxR2=HOVER_OBJECT_MOUSE_RADIUS_PX*HOVER_OBJECT_MOUSE_RADIUS_PX;
  let best=null, bestD2=Infinity, bestSx=0, bestSy=0;
  for(let i=0;i<list2.length;i++){
    const it=list2[i];
    if(!isWithinTipDistanceRange(it.pos)) continue;
    if(!isWorldPointInFront(it.pos)) continue;
    const sc=proj3(it.pos, viewM, projM);
    if(!sc) continue;
    // Only visible candidates in/near viewport.
    if(sc[0] < -1.0 || sc[0] > 1.0 || sc[1] < -1.0 || sc[1] > 1.0) continue;
    const sx=(sc[0]+1)*0.5*W();
    const sy=(1-sc[1])*0.5*H();
    if(!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
    // Keep candidates on real screen; don't allow invisible off-screen targets.
    if(sx < 0 || sx > W() || sy < 0 || sy > H()) continue;
    const dx=sx-pickX, dy=sy-pickY;
    const d2=dx*dx + dy*dy;
    if(d2>maxR2) continue;
    if(d2<bestD2){
      bestD2=d2;
      best=it;
      bestSx=sx;
      bestSy=sy;
    }
  }
  if(!best){
    // UI/HUD help must follow the real mouse position (no object offset).
    const uiTip=resolveUiMouseHelp(hoverMouseX,hoverMouseY);
    if(uiTip){
      showMouseHelpTip(uiTip.title, uiTip.text, hoverMouseX, hoverMouseY);
      return;
    }
    hideHoverObjectTip();
    return;
  }
  showHoverObjectTip(best, bestSx, bestSy);
}
function showCommsAttachToast(entry){
  if(!commAttachToastEl || !entry) return;
  {
    const r=(commHudEl && typeof commHudEl.getBoundingClientRect==='function') ? commHudEl.getBoundingClientRect() : null;
    if(r && r.width>0 && r.height>0){
      const x=Math.round(r.right + 14);
      const y=Math.round(r.top + r.height*0.5);
      commAttachToastEl.style.left=`${x}px`;
      commAttachToastEl.style.top=`${y}px`;
    }
  }
  const key=`${String(entry.kind||'object')}:${String(entry.id||'')}`;
  if(key && key===commAttachLastKey && commAttachToastEl.classList.contains('on')) return;
  commAttachLastKey=key;
  const label=attachLabelForEntry(entry);
  commAttachToastEl.textContent=`Agganciato a ${label}`;
  if(SECC_HUD && typeof SECC_HUD.setCommTargetLabel==='function'){
    SECC_HUD.setCommTargetLabel(label);
  }
  commAttachToastEl.classList.add('on');
  clearTimeout(commAttachToastTimer);
  commAttachToastTimer=window.setTimeout(()=>{
    commAttachToastEl.classList.remove('on');
  }, COMM_ATTACH_TOAST_MS);
}
function orientCameraToNearestCoordinateObject(){
  const near=nearestCoordinateObjectToPos(camPos);
  if(!near || !Array.isArray(near.pos)) return false;
  const yp=yawPitchToLook(camPos, near.pos);
  if(!Number.isFinite(yp.yaw) || !Number.isFinite(yp.pitch)) return false;
  camYaw=yp.yaw;
  camPitch=yp.pitch;
  camRoll=0;
  return true;
}
function enforceSoStandoffForPointTarget(targetPos, fromPos){
  const t=[+targetPos[0]||0,+targetPos[1]||0,+targetPos[2]||0];
  const n=nearestSoCenterToPos(t);
  if(!n.id || !Array.isArray(n.c) || !Number.isFinite(n.d) || n.d>SO_POINT_STOP_RANGE){
    return t;
  }
  // If target is inside the SO core, project it onto a ~1.3 UA shell.
  let dir=vsub(t, n.c);
  let dl=Math.sqrt(vdot(dir,dir));
  if(dl<1e-6){
    dir=vsub(fromPos||camPos, n.c);
    dl=Math.sqrt(vdot(dir,dir));
  }
  if(dl<1e-6){
    dir=[0,0,1];
    dl=1;
  }
  const u=vscl(dir,1/dl);
  return vadd(n.c, vscl(u, SO_POINT_STANDOFF));
}
function getDockedDarrPose(id, opts){
  if(!id || !MENU_DEFS[id] || !NAV_NODES[id]) return false;
  const entry=getRegistryEntry('so', id) || { kind:'so', id, pos:nodeCenter(id) };
  return getEntryDarrPose(entry, opts);
}
function setDockedDarrView(id, opts){
  const pose=getDockedDarrPose(id, opts);
  if(!pose) return false;
  camPos=[pose.pos[0],pose.pos[1],pose.pos[2]];
  const yp={yaw:pose.yaw, pitch:pose.pitch};
  if(Number.isFinite(yp.yaw) && Number.isFinite(yp.pitch)){
    camYaw=yp.yaw;
    camPitch=yp.pitch;
    camRoll=0;
  }
  return true;
}
function alignCameraToDockedCenter(id){
  if(!id || !NAV_NODES[id]) return false;
  const c=nodeCenter(id);
  const yp=yawPitchToLook(camPos, c);
  if(!Number.isFinite(yp.yaw) || !Number.isFinite(yp.pitch)) return false;
  camYaw=yp.yaw;
  camPitch=yp.pitch;
  camRoll=0;
  return true;
}
function beginFinalDarrApproach(ap, dockId){
  if(!ap || !dockId || ap.stage==='final-darr') return false;
  const pose=getDockedDarrPose(dockId, { fromPos:camPos, bearingRad:ap.dockAz });
  if(!pose) return false;
  ap.finalDarrMode=true;
  ap.finalDarrId=dockId;
  ap.finalDarrStartPos=[camPos[0],camPos[1],camPos[2]];
  ap.finalDarrPos=[pose.pos[0],pose.pos[1],pose.pos[2]];
  ap.finalDarrLookPos=[pose.look[0],pose.look[1],pose.look[2]];
  ap.finalDarrDur=AUTO_DOCK_DARR_DUR;
  ap.finalDarrProgress=0;
  ap.stage='final-darr';
  ap.stageT=0;
  return true;
}
function setAutopilotStage(stage){
  if(!autoPilot) return;
  const prev=autoPilot.stage;
  if(stage==='shift-down' && prev!=='shift-down'){
    autoPilot.decelStartBoost=thrustBoost;
  }
  if(stage==='coast-out' && prev!=='coast-out'){
    autoPilot.coastStartBoost=thrustBoost;
  }
  autoPilot.stage=stage;
  autoPilot.stageT=0;
}
function isTargetCenteredInCrosshair(targetPos, pxTol){
  if(!(Array.isArray(targetPos) && targetPos.length===3)) return false;
  if(!isWorldPointInFront(targetPos)) return false;
  const sc=proj3(targetPos, viewM, projM);
  if(!sc || sc[2]>=0.995) return false;
  const sx=sceneScreenXFromNdc(sc[0]);
  const sy=sceneScreenYFromNdc(sc[1]);
  if(!Number.isFinite(sx) || !Number.isFinite(sy)) return false;
  const tol=Math.max(18, Number(pxTol)||56);
  const dx=sx-sceneVp.centerX, dy=sy-sceneVp.centerY;
  return (dx*dx + dy*dy) <= tol*tol;
}
function stopAutopilot(success){
  if(!autoPilot) return;
  const ap=autoPilot;
  autoPilot=null;
  SECC_HUD.setTravelPctOverlay(true,0);
  SECC_HUD.setTravelBoostBar(0,'CRUISE');
  // Ensure manual navigation is always re-enabled after autopilot.
  phase='done';
  ctrlOn=true;
  started=true;
  thrustBoost=0;
  rightMoveActive=false;
  rightMoveDir=[0,0,1];
  centerAimCursor();

  if(!success) return;
  // Successful transfer: previous target is no longer valid.
  clearAttachedTargetState();
  if(ap.kind==='menu' && ap.toId && MENU_DEFS[ap.toId]){
    coordNavDockArm=false;
    applyMenu(ap.toId);
    activeNodeId=ap.toId;
    SECC_HUD.syncSoHud({activeNodeId, camPos});
    const pref=getRegistryEntry('so', ap.toId) || { kind:'so', id:ap.toId, pos:nodeCenter(ap.toId) };
    forceAttachEntry(pref);
    const pose=getEntryDarrPose(pref) || getDockedDarrPose(ap.toId);
    if(pose) startArrivalEase(pose.pos, pose.look, 0.68);
    else if(ap.stage!=='final-darr') setDockedDarrView(ap.toId);
    return;
  }
  if(ap.kind==='pos'){
    // For explicit point destinations, keep reached pose unless a SO docking happens.
    const didDock=dockNearestSo(Boolean(coordNavDockArm), false);
    coordNavDockArm=false;
    if(didDock){
      const dockId=resolveCurrentSoId() || activeNodeId;
      if(dockId){
        const pref=getRegistryEntry('so', dockId) || { kind:'so', id:dockId, pos:nodeCenter(dockId) };
        forceAttachEntry(pref);
        const pose=getEntryDarrPose(pref, { centerOnTarget:Boolean(ap.hasExplicitLookTarget) }) || (ap.stage!=='final-darr' ? getDockedDarrPose(dockId) : null);
        if(pose) startArrivalEase(pose.pos, pose.look, 0.72, { arc:Boolean(ap.hasExplicitLookTarget), arcWU:1.0 });
      }
      return;
    }
    if(ap.hasExplicitLookTarget && Array.isArray(ap.lookPos) && ap.lookPos.length===3){
      // Explicit destination object: never snap position on disengage; only smooth reframe.
      startArrivalEase([camPos[0],camPos[1],camPos[2]], ap.lookPos, 1.05, { arc:false });
      SECC_HUD.syncSoHud({activeNodeId, camPos});
      return;
    }
    // Free-space arrivals:
    // if a real object is near the destination, align to it; otherwise keep destination and face SOH.
    const prefObj=(ap.attachEntry && typeof ap.attachEntry==='object') ? ap.attachEntry : null;
    const nearObj=prefObj || getNearestAttachableEntry(ap.targetPos);
    const nearCenter=nearObj ? (entryCenterPos(nearObj) || (Array.isArray(nearObj.pos) ? [nearObj.pos[0],nearObj.pos[1],nearObj.pos[2]] : null)) : null;
    const nearD=(nearObj && Number.isFinite(nearObj.d2))
      ? Math.sqrt(Math.max(0, nearObj.d2))
      : (nearCenter ? Math.hypot(camPos[0]-nearCenter[0], camPos[1]-nearCenter[1], camPos[2]-nearCenter[2]) : Infinity);
    const hasLocalObject=Boolean(nearObj && nearD<=entryAttachRangeWU(nearObj));
    if(hasLocalObject){
      forceAttachEntry(nearObj);
      const pose=getEntryDarrPose(nearObj, { centerOnTarget:true });
      if(pose){
        startArrivalEase(pose.pos, pose.look, 0.92, { arc:true, arcWU:1.25 });
      }else{
        const look=(ap.hasExplicitLookTarget && Array.isArray(ap.lookPos) && ap.lookPos.length===3)
          ? ap.lookPos
          : nodeCenter(SOH_ID);
        startArrivalEase(ap.targetPos, look, 0.95, { arc:Boolean(ap.hasExplicitLookTarget), arcWU:1.0 });
      }
    }else{
      if(ap.hasExplicitLookTarget && Array.isArray(ap.lookPos) && ap.lookPos.length===3){
        // If no attachable object is in range, keep position and reframe smoothly to target.
        startArrivalEase([camPos[0],camPos[1],camPos[2]], ap.lookPos, 1.18, { arc:false });
      }else{
        startArrivalEase(ap.targetPos, nodeCenter(SOH_ID), 0.9, { arc:true, arcWU:0.9 });
      }
    }
  }
  SECC_HUD.syncSoHud({activeNodeId, camPos});
}
function quadraticBezier3(p0,p1,p2,t){
  const u=1-t;
  return [
    p0[0]*u*u + p1[0]*2*u*t + p2[0]*t*t,
    p0[1]*u*u + p1[1]*2*u*t + p2[1]*t*t,
    p0[2]*u*u + p1[2]*2*u*t + p2[2]*t*t
  ];
}
function buildArrivalArcCtrl(fromPos,toPos,arcWU){
  const f=[+fromPos[0]||0,+fromPos[1]||0,+fromPos[2]||0];
  const t=[+toPos[0]||0,+toPos[1]||0,+toPos[2]||0];
  const mid=[(f[0]+t[0])*0.5,(f[1]+t[1])*0.5,(f[2]+t[2])*0.5];
  const dir=vsub(t,f);
  const dl=Math.sqrt(vdot(dir,dir));
  let n=(dl>1e-6) ? vscl(dir,1/dl) : [0,0,1];
  let side=vcross(n,[0,1,0]);
  const sl=Math.sqrt(vdot(side,side));
  side=(sl>1e-6) ? vscl(side,1/sl) : [1,0,0];
  const up=vnorm(vcross(side,n));
  const amp=Math.max(0.2, Number(arcWU)||0.9);
  return vadd(mid, vadd(vscl(side, amp*0.7), vscl(up, amp*0.45)));
}
function startArrivalEase(toPos, lookPos, dur, opts){
  if(!(Array.isArray(toPos) && toPos.length===3)) return false;
  const tx=+toPos[0], ty=+toPos[1], tz=+toPos[2];
  if(!(Number.isFinite(tx) && Number.isFinite(ty) && Number.isFinite(tz))) return false;
  const toP=[tx,ty,tz];
  const look=(Array.isArray(lookPos) && lookPos.length===3) ? lookPos : null;
  let yp=look ? yawPitchToLook(toP, look) : null;
  if(!yp || !Number.isFinite(yp.yaw) || !Number.isFinite(yp.pitch)){
    const near=nearestCoordinateObjectToPos(toP);
    yp=(near && Array.isArray(near.pos)) ? yawPitchToLook(toP, near.pos) : { yaw:camYaw, pitch:camPitch };
  }
  const d=Math.sqrt((toP[0]-camPos[0])**2 + (toP[1]-camPos[1])**2 + (toP[2]-camPos[2])**2);
  const dd=Math.max(0.30, Math.min(1.20, (Number(dur)||0.9) + d*0.012));
  const useArc=Boolean(opts && opts.arc);
  const arcWU=Number(opts && opts.arcWU);
  const ctrlPos=useArc ? buildArrivalArcCtrl(camPos,toP, Number.isFinite(arcWU)?arcWU:0.9) : null;
  arrivalEase={
    t:0,
    dur:dd,
    fromPos:[camPos[0],camPos[1],camPos[2]],
    toPos:toP,
    ctrlPos,
    fromYaw:camYaw,
    fromPitch:camPitch,
    toYaw:yp.yaw,
    toPitch:yp.pitch
  };
  clearInputBuffer();
  return true;
}
function arrivalEaseTick(dt){
  if(!arrivalEase) return false;
  arrivalEase.t += Math.max(0,dt);
  const p=clamp(arrivalEase.t/Math.max(1e-4,arrivalEase.dur),0,1);
  const e=p*p*(3-2*p);
  if(Array.isArray(arrivalEase.ctrlPos) && arrivalEase.ctrlPos.length===3){
    camPos=quadraticBezier3(arrivalEase.fromPos, arrivalEase.ctrlPos, arrivalEase.toPos, e);
  }else{
    camPos=vlerp(arrivalEase.fromPos, arrivalEase.toPos, e);
  }
  camYaw += angleDelta(camYaw, arrivalEase.toYaw)*Math.min(1, dt*8.5);
  camPitch += angleDelta(camPitch, arrivalEase.toPitch)*Math.min(1, dt*8.5);
  camRoll += (0-camRoll)*Math.min(1,dt*5.5);
  if(p>=1){
    camPos=[arrivalEase.toPos[0],arrivalEase.toPos[1],arrivalEase.toPos[2]];
    camYaw=arrivalEase.toYaw;
    camPitch=arrivalEase.toPitch;
    camRoll=0;
    arrivalEase=null;
  }
  return true;
}
function startAutopilotTravel(kind, targetPos, opts){
  if(phase!=='done' || !ctrlOn || menuTrans || navTrans || autoPilot) return;
  if(!Array.isArray(targetPos) || targetPos.length!==3) return;
  let tx=+targetPos[0], ty=+targetPos[1], tz=+targetPos[2];
  if(!(Number.isFinite(tx) && Number.isFinite(ty) && Number.isFinite(tz))) return;
  // Starting a new autonomous transfer always detaches from previous object/SO.
  clearAttachedTargetState();
  if(activeNodeId){
    activeNodeId=null;
    SECC_HUD.syncSoHud({activeNodeId, camPos});
  }
  const rawTarget=[tx,ty,tz];
  let posStopPos=null;
  let posStopRange=0;
  if(kind!=='menu'){
    const nRaw=nearestSoCenterToPos(rawTarget);
    if(nRaw.id && Array.isArray(nRaw.c) && Number.isFinite(nRaw.d) && nRaw.d<=SO_POINT_STOP_RANGE){
      // Destination is inside/very near SO core: stop on SO-centered safety shell range.
      posStopPos=[nRaw.c[0],nRaw.c[1],nRaw.c[2]];
    }else{
      // Generic known object/point: stop inside ~1.4 UA from that object.
      posStopPos=[rawTarget[0],rawTarget[1],rawTarget[2]];
    }
    posStopRange=SO_POINT_STOP_RANGE;
    const safe=enforceSoStandoffForPointTarget([tx,ty,tz], camPos);
    tx=safe[0]; ty=safe[1]; tz=safe[2];
  }

  const dx=tx-camPos[0], dy=ty-camPos[1], dz=tz-camPos[2];
  const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);
  const route=yawPitchToLook(camPos,[tx,ty,tz]);
  const routeAz=((Math.round(route.yaw/DEG)%360)+360)%360;
  const routeEl=route.pitch/DEG;
  const curveSeed=hash01(`apcurve:${kind}:${Math.round(tx*10)}:${Math.round(ty*10)}:${Math.round(tz*10)}:${routeAz}`);
  const curveSeed2=hash01(`apcurve2:${kind}:${Math.round(tx*10)}:${Math.round(ty*10)}:${Math.round(tz*10)}`);
  const curveSign=(curveSeed>=0.5)?1:-1;
  const upSign=(curveSeed2>=0.5)?1:-1;
  const curveAmpBase=(kind==='menu')
    ? clamp(dist*0.11, 10, 160)
    : clamp(dist*0.15, 14, 220);
  const dNorm=clamp(dist/420,0,1);
  const tCoastIn = 0.18 + 0.42*dNorm;
  const tShiftUp = 0.35 + 0.90*dNorm;
  const tShiftDown = 0.42 + 0.95*dNorm;
  const tCoastOut = 0.28 + 0.95*dNorm;
  // Menu SO travel: stop on real SO docking radius.
  // Manual coordinates: near-exact arrival on target (non-random).
  const arrivalDist=(kind==='menu')
    ? SO_DOCK_RADIUS
    : Math.min(0.8, Math.max(0.22, dist*0.004));
  const lookPos=(opts && Array.isArray(opts.lookPos) && opts.lookPos.length===3) ? opts.lookPos : [tx,ty,tz];
  const hasExplicitLookTarget=Boolean(opts && Array.isArray(opts.lookPos) && opts.lookPos.length===3);
  let dockAz=NaN;
  if(kind==='menu'){
    const rdx=camPos[0]-tx, rdz=camPos[2]-tz;
    dockAz=Math.atan2(rdx,rdz);
    if(!Number.isFinite(dockAz)) dockAz=camYaw+PI;
  }
  const routePlan=buildAutopilotRoutePlan(
    kind==='menu' ? 'menu' : 'pos',
    camPos,
    [tx,ty,tz],
    lookPos,
    curveAmpBase*curveSign,
    (curveAmpBase*(0.30 + curveSeed2*0.28))*upSign
  );
  const motionProfile=planAutopilotMotionProfile({
    kind: kind==='menu' ? 'menu' : 'pos',
    distWU: dist,
    ampSideWU: curveAmpBase*curveSign,
    ampUpWU: (curveAmpBase*(0.30 + curveSeed2*0.28))*upSign,
    hyperEligible: dist >= AUTO_HYPER_MIN_DIST
  });
  const tCoastInPlan=Math.max(tCoastIn, motionProfile.coastInDur);
  const tShiftDownPlan=Math.max(tShiftDown, motionProfile.shiftDownDur);
  const tCoastOutPlan=Math.max(tCoastOut, motionProfile.coastOutDur);

  autoPilot={
    kind: kind==='menu' ? 'menu' : 'pos',
    toId: opts && typeof opts.toId==='string' ? opts.toId : null,
    startPos:[camPos[0],camPos[1],camPos[2]],
    targetPos:[tx,ty,tz],
    lookPos:[+lookPos[0]||tx,+lookPos[1]||ty,+lookPos[2]||tz],
    hasExplicitLookTarget,
    attachEntry: (opts && opts.attachEntry && typeof opts.attachEntry==='object') ? opts.attachEntry : null,
    dockAz,
    routeAz,
    routeEl,
    routeDist:dist,
    routePlan,
    motionProfile,
    startDist:dist,
    bestDist:dist,
    autoHyperEligible: dist >= AUTO_HYPER_MIN_DIST,
    posStopPos,
    posStopRange,
    moveDir: camForward(camYaw,camPitch),
    launchDir: camForward(camYaw,camPitch),
    launchDur:motionProfile.launchDur,
    totalT:0,
    targetLockT:0,
    navTargetSm:[tx,ty,tz],
    dockBlend:0,
    slowStartWU:motionProfile.brakeStartWU,
    approachStartDist: arrivalDist + Math.max(24, dist*0.18),
    finalDarrMode: kind==='menu',
    finalDarrId:null,
    finalDarrStartPos:null,
    finalDarrPos:null,
    finalDarrLookPos:null,
    finalDarrDur:AUTO_DOCK_DARR_DUR,
    finalDarrProgress:0,
    stage:'align',
    stageT:0,
    tCoastIn:tCoastInPlan,
    tShiftUp,
    tShiftDown:tShiftDownPlan,
    tCoastOut:tCoastOutPlan,
    arrivalDist,
    alignYaw:1.6*DEG,
    alignPitch:1.2*DEG,
    curveEnabled:true,
    curveProg:0,
    curvePhase:curveSeed*TAU,
    curveAmpSide:curveAmpBase*curveSign,
    curveAmpUp:(curveAmpBase*(0.30 + curveSeed2*0.28))*upSign,
    decelStartBoost:0,
    coastStartBoost:BOOST_LEVEL_1
  };
  SECC_HUD.setTravelPctOverlay(true, 0);

  // Freeze any held manual input while autopilot is active.
  for(const k in keys) keys[k]=false;
  rightMoveActive=false;
  rightMoveDir=[0,0,1];
  centerAimCursor();
  if(kind!=='pos') coordNavDockArm=false;
}
function autopilotCheckStopShell(ap, stopPos, stopRange){
  if(!(stopPos && stopRange>0)) return false;
  const sx=stopPos[0]-camPos[0], sy=stopPos[1]-camPos[1], sz=stopPos[2]-camPos[2];
  const sDist=Math.sqrt(sx*sx+sy*sy+sz*sz);
  if(sDist>stopRange) return false;
  const near=nearestMenuIdTo(camPos);
  const nearDist=Math.sqrt(Math.max(0,near.d2));
  if(near.id && nearDist<SO_DOCK_RADIUS && beginFinalDarrApproach(ap, near.id)) return true;
  stopAutopilot(true);
  return true;
}
function autopilotUpdateDockBlend(ap, dist, dt){
  let dockBlendTarget=0;
  if(ap.kind==='menu' && ap.toId && MENU_DEFS[ap.toId]){
    const a0=Math.max(ap.arrivalDist+1.0, ap.approachStartDist||ap.arrivalDist+24);
    const n0=clamp((a0-dist)/Math.max(1e-3, a0-ap.arrivalDist),0,1);
    dockBlendTarget = n0*n0*(3-2*n0);
  }
  if(ap.stage==='shift-down'){
    dockBlendTarget = Math.max(dockBlendTarget, 0.55*clamp(ap.stageT/Math.max(0.001,ap.tShiftDown),0,1));
  }else if(ap.stage==='coast-out' || ap.stage==='stop'){
    const n=clamp(ap.stageT/Math.max(0.001,ap.tCoastOut),0,1);
    dockBlendTarget = Math.max(dockBlendTarget, 0.55 + 0.45*n);
  }
  ap.dockBlend += (dockBlendTarget-ap.dockBlend)*Math.min(1,dt*2.6);
  return clamp(ap.dockBlend,0,1);
}
function cubicBezier3(p0,p1,p2,p3,t){
  const u=1-t;
  const a=u*u*u, b=3*u*u*t, c=3*u*t*t, d=t*t*t;
  return [
    p0[0]*a + p1[0]*b + p2[0]*c + p3[0]*d,
    p0[1]*a + p1[1]*b + p2[1]*c + p3[1]*d,
    p0[2]*a + p1[2]*b + p2[2]*c + p3[2]*d
  ];
}
function planAutopilotMotionProfile({kind, distWU, ampSideWU, ampUpWU, hyperEligible}){
  const d=Math.max(1, Number(distWU)||1);
  const curveAbs=Math.hypot(Number(ampSideWU)||0, Number(ampUpWU)||0);
  const curveN=clamp(curveAbs/Math.max(10, d*0.22), 0, 1);
  const longN=clamp(d/2800, 0, 1);
  const launchDur=clamp(0.92 + 0.78*curveN + 0.68*longN, 0.90, 2.50);
  const coastInDur=clamp(0.24 + 0.22*curveN + 0.18*longN, 0.22, 0.95);
  const shiftDownDur=clamp(0.72 + 0.88*curveN + 0.40*longN, 0.70, 2.20);
  const coastOutDur=clamp(0.90 + 1.25*curveN + 0.58*longN, 0.90, 2.90);
  const brakeStartWU=Math.max(AP_SLOW_START_WU, d*(0.045 + 0.055*curveN));
  const brakeGain=1.02 + 0.14*curveN + (hyperEligible ? 0.04 : 0);
  return { kind, curveN, launchDur, coastInDur, shiftDownDur, coastOutDur, brakeStartWU, brakeGain };
}
function buildAutopilotRoutePlan(kind, startPos, targetPos, lookPos, ampSide, ampUp){
  const s=[+startPos[0]||0,+startPos[1]||0,+startPos[2]||0];
  const t=[+targetPos[0]||0,+targetPos[1]||0,+targetPos[2]||0];
  const v=vsub(t,s);
  const dist=Math.sqrt(vdot(v,v));
  const dir=(dist>1e-6) ? vscl(v,1/dist) : [0,0,1];
  let side=vcross(dir,[0,1,0]);
  let sl=Math.sqrt(vdot(side,side));
  if(sl<1e-5){
    side=vcross(dir,[1,0,0]);
    sl=Math.sqrt(vdot(side,side));
  }
  side=(sl>1e-6) ? vscl(side,1/sl) : [1,0,0];
  const up=vnorm(vcross(side,dir));
  const c1=vadd(vadd(s, vscl(dir, dist*0.28)), vadd(vscl(side, ampSide*0.70), vscl(up, ampUp*0.70)));
  const c2=vadd(vadd(s, vscl(dir, dist*0.72)), vadd(vscl(side, ampSide*0.40), vscl(up, -ampUp*0.18)));
  const lk=(Array.isArray(lookPos) && lookPos.length===3) ? [lookPos[0],lookPos[1],lookPos[2]] : [t[0],t[1],t[2]];
  const finalLook=yawPitchToLook(t, lk);
  return { kind, startPos:s, targetPos:t, ctrl1:c1, ctrl2:c2, lookPos:lk, finalLook };
}
function autopilotCurveTarget(ap, cx, cy, cz, dist, dt){
  if(!ap || !ap.curveEnabled) return [cx,cy,cz];
  const target=[cx,cy,cz];
  const plan=ap.routePlan;
  if(!(plan && Array.isArray(plan.startPos) && Array.isArray(plan.ctrl1) && Array.isArray(plan.ctrl2))) return target;

  const arrival=Math.max(0.01, Number(ap.arrivalDist)||0);
  const startDist=Math.max(arrival+1e-4, Number(ap.startDist)||dist);
  const span=Math.max(1e-4, startDist-arrival);
  const rem=(Math.max(arrival, dist)-arrival)/span;
  const pRaw=clamp(1-rem,0,1);
  ap.curveProg=(Number.isFinite(ap.curveProg)?ap.curveProg:pRaw);
  ap.curveProg += (pRaw-ap.curveProg)*Math.min(1, dt*2.8);
  const p=clamp(ap.curveProg,0,1);

  const envelope=Math.pow(Math.max(0, 4*p*(1-p)), 1.08);
  const fadeToTarget=clamp((dist-(arrival+10))/Math.max(12, startDist*0.18), 0, 1);
  const curveW=envelope*fadeToTarget;
  if(curveW<=1e-4) return target;
  // Adaptive final approach: pull curve control toward direct corridor.
  const adaptN=1-fadeToTarget;
  if(adaptN>0){
    const c2Direct=vadd(camPos, vscl(vsub(target, camPos), 0.60));
    const a=Math.min(1, dt*(2.0 + adaptN*4.2));
    plan.ctrl2=vlerp(plan.ctrl2, c2Direct, a);
  }
  const curved=cubicBezier3(plan.startPos, plan.ctrl1, plan.ctrl2, target, p);
  return vlerp(target, curved, curveW);
}
function autopilotBuildTargets(ap, cx, cy, cz, dist, dt){
  let rawNavTarget=autopilotCurveTarget(ap, cx, cy, cz, dist, dt);
  let lookTarget=ap.lookPos || rawNavTarget;
  const arrival=Math.max(0.01, Number(ap?.arrivalDist)||0);
  const finalGuideRange=Math.max(14, arrival*6.5);
  const finalGuideN=clamp((dist-arrival)/finalGuideRange,0,1);
  const finalGuide=finalGuideN*finalGuideN*(3-2*finalGuideN); // 1 far, 0 near
  rawNavTarget=vlerp([cx,cy,cz], rawNavTarget, finalGuide);
  const dockBlend=autopilotUpdateDockBlend(ap, dist, dt);
  if(ap.kind==='menu' && ap.toId && MENU_DEFS[ap.toId]){
    const dockRadius=Math.max(0.8, SO_DOCK_RADIUS*0.92);
    const r=Math.max(dockRadius, lerp(dist, dockRadius, dockBlend));
    const az=Number.isFinite(ap.dockAz) ? ap.dockAz : Math.atan2(camPos[0]-cx, camPos[2]-cz);
    const h=r*Math.cos(DOCK_VIEW_ELEV);
    const y=r*Math.sin(DOCK_VIEW_ELEV);
    const dockTrack=[cx + Math.sin(az)*h, cy + y, cz + Math.cos(az)*h];
    rawNavTarget=vlerp([cx,cy,cz], dockTrack, dockBlend);
    lookTarget=[cx,cy,cz];
  }
  // Final soft approach: add a small parabolic offset that decays to zero at touchdown.
  const softStartWU=Math.max(AP_SLOW_START_WU, Number(ap?.slowStartWU)||AP_SLOW_START_WU);
  if(dist<softStartWU && dist>arrival && ap?.routePlan){
    const s=Array.isArray(ap.routePlan.startPos) ? ap.routePlan.startPos : camPos;
    const t=[cx,cy,cz];
    const dv=vsub(t,s);
    const dl=Math.sqrt(vdot(dv,dv));
    let dir=(dl>1e-6)?vscl(dv,1/dl):[0,0,1];
    let side=vcross(dir,[0,1,0]);
    const sl=Math.sqrt(vdot(side,side));
    side=(sl>1e-6)?vscl(side,1/sl):[1,0,0];
    const up=vnorm(vcross(side,dir));
    const n=clamp((dist-arrival)/Math.max(1e-3, softStartWU-arrival),0,1); // 1 far, 0 near
    const parab=4*n*(1-n); // parabola peak mid-approach
    const curveN=clamp(Number(ap?.motionProfile?.curveN)||0.35,0,1);
    const amp=(3.5 + curveN*6.0);
    const off=vadd(vscl(side, amp*parab*0.50), vscl(up, amp*parab*0.28));
    rawNavTarget=vadd(rawNavTarget, off);
  }
  // Final framing rule: if an explicit destination object/point was provided,
  // progressively force the camera to keep it on the crosshair in the terminal leg.
  if(ap.hasExplicitLookTarget && Array.isArray(ap.lookPos) && ap.lookPos.length===3){
    const finalAimRange=Math.max(Number(ap.slowStartWU)||AP_SLOW_START_WU, Number(ap.arrivalDist||0)+12);
    const finalAimN=clamp((dist-(Number(ap.arrivalDist)||0))/Math.max(1e-3, finalAimRange-(Number(ap.arrivalDist)||0)),0,1); // 1 far, 0 near
    const lockW=1-finalAimN*finalAimN;
    lookTarget=vlerp(lookTarget, ap.lookPos, lockW);
  }
  const navSm=Array.isArray(ap.navTargetSm) ? ap.navTargetSm : rawNavTarget;
  const navBlend=Math.min(1,dt*(2.2 + Math.max(0.15,thrustBoost)*2.4));
  ap.navTargetSm=vlerp(navSm, rawNavTarget, navBlend);
  return { navTarget:ap.navTargetSm, lookTarget, finalGuide };
}
function autopilotApplyLookSteering(lookTarget, dt, steerScale=1){
  const look=yawPitchToLook(camPos, lookTarget);
  const yawErr=angleDelta(camYaw, look.yaw);
  const pitchErr=angleDelta(camPitch, look.pitch);
  const s=clamp(Number(steerScale)||0, 0, 1);
  const turnRate=(1.7 + Math.min(thrustBoost,1.0)*1.5 + Math.max(0,thrustBoost-1.0)*0.8) * s;
  camYaw += clamp(yawErr, -turnRate*dt, turnRate*dt);
  camPitch += clamp(pitchErr, -turnRate*0.78*dt, turnRate*0.78*dt);
  if(Math.abs(camYaw)>TAU*2) camYaw = ((camYaw%TAU)+TAU)%TAU;
  if(Math.abs(camPitch)>TAU*2) camPitch = ((camPitch%TAU)+TAU)%TAU;
  return { yawErr, pitchErr };
}
function autopilotStep(dt){
  if(!autoPilot) return;
  const ap=autoPilot;
  const cx=ap.targetPos[0], cy=ap.targetPos[1], cz=ap.targetPos[2];
  const dx=cx-camPos[0], dy=cy-camPos[1], dz=cz-camPos[2];
  const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);
  if(!Number.isFinite(dist)){
    stopAutopilot(false);
    return;
  }
  if(ap.stage==='final-darr'){
    const sp=(Array.isArray(ap.finalDarrStartPos) && ap.finalDarrStartPos.length===3) ? ap.finalDarrStartPos : [camPos[0],camPos[1],camPos[2]];
    const tp=(Array.isArray(ap.finalDarrPos) && ap.finalDarrPos.length===3) ? ap.finalDarrPos : [camPos[0],camPos[1],camPos[2]];
    const lookTarget=(Array.isArray(ap.finalDarrLookPos) && ap.finalDarrLookPos.length===3) ? ap.finalDarrLookPos : [cx,cy,cz];
    ap.stageT += dt;
    const dur=Math.max(0.18, Number(ap.finalDarrDur)||AUTO_DOCK_DARR_DUR);
    const p=clamp(ap.stageT/dur,0,1);
    const e=p*p*(3-2*p);
    camPos=vlerp(sp,tp,e);
    ap.finalDarrProgress=p;

    const look=yawPitchToLook(camPos, lookTarget);
    const yawErr=angleDelta(camYaw, look.yaw);
    const pitchErr=angleDelta(camPitch, look.pitch);
    const turnRate=5.6;
    camYaw += clamp(yawErr, -turnRate*dt, turnRate*dt);
    camPitch += clamp(pitchErr, -turnRate*0.8*dt, turnRate*0.8*dt);
    if(Math.abs(camYaw)>TAU*2) camYaw = ((camYaw%TAU)+TAU)%TAU;
    if(Math.abs(camPitch)>TAU*2) camPitch = ((camPitch%TAU)+TAU)%TAU;
    updateThrustBoost(dt, BOOST_LEVEL_1);
    if(p>=1){
      stopAutopilot(true);
      return;
    }
    return;
  }
  const stopPos=(ap.kind==='pos' && Array.isArray(ap.posStopPos) && ap.posStopPos.length===3) ? ap.posStopPos : null;
  const stopRange=(ap.kind==='pos' && Number.isFinite(ap.posStopRange)) ? Math.max(0,ap.posStopRange) : 0;
  if(autopilotCheckStopShell(ap, stopPos, stopRange)) return;

  const targets=autopilotBuildTargets(ap, cx, cy, cz, dist, dt);
  const navTarget=targets.navTarget;
  const lookTarget=targets.lookTarget;
  const finalGuide=Number.isFinite(targets.finalGuide) ? targets.finalGuide : 1;
  const cruiseBoost=autopilotCruiseBoostLevel(ap);
  const slowStartWU=Math.max(AP_SLOW_END_WU+1.0, Number(ap.slowStartWU)||AP_SLOW_START_WU);
  const approachN=(AUTOPILOT_UTILS && typeof AUTOPILOT_UTILS.autopilotApproachBlend==='function')
    ? AUTOPILOT_UTILS.autopilotApproachBlend({distWU:dist, startWU:slowStartWU, endWU:AP_SLOW_END_WU, clampFn:clamp})
    : clamp((dist-AP_SLOW_END_WU)/Math.max(1e-5, slowStartWU-AP_SLOW_END_WU),0,1); // 1 far, 0 near
  const decelN=1-approachN; // 0 far, 1 near
  const launchDurNow=Math.max(0.45, Number(ap.launchDur)||1.0);
  const steerN=ease(clamp((Number(ap.totalT||0)-0.18)/launchDurNow,0,1));
  const finalLockBoost=ap.hasExplicitLookTarget ? clamp((1-approachN)*0.65,0,0.65) : 0;
  const baseSteerScale=clamp(steerN + finalLockBoost, 0, 1);
  const steerScale=(ap.hasExplicitLookTarget && (Number(ap.totalT)||0)>0.30)
    ? Math.max(baseSteerScale, 0.72)
    : baseSteerScale;
  const lookErr=autopilotApplyLookSteering(lookTarget, dt, steerScale);
  const yawErr=lookErr.yawErr;
  const pitchErr=lookErr.pitchErr;

  const needsExplicitTargetLock=Boolean(ap.hasExplicitLookTarget && Array.isArray(ap.lookPos) && ap.lookPos.length===3);
  if(dist<=ap.arrivalDist && ap.stage!=='stop'){
    if(needsExplicitTargetLock && !isTargetCenteredInCrosshair(ap.lookPos, 54)){
      setAutopilotStage('target-lock');
    }else{
      setAutopilotStage('stop');
    }
  }
  ap.stageT += dt;
  ap.totalT = (Number(ap.totalT)||0) + Math.max(0,dt);

  let move=0;
  let boostTarget=(AUTOPILOT_UTILS && typeof AUTOPILOT_UTILS.computeBoostTarget==='function')
    ? AUTOPILOT_UTILS.computeBoostTarget({
      stage:ap.stage,
      BOOST_SHIFT_LEVEL: BOOST_LEVEL_1,
      BOOST_SUPER_LEVEL,
      BOOST_HYPER_LEVEL,
      cruiseLevel:cruiseBoost
    })
    : 0;

  if(ap.stage==='align'){
    // Start moving immediately while smoothly converging to route.
    const alignQ=1-clamp(
      Math.max(
        Math.abs(yawErr)/Math.max(1e-4,ap.alignYaw*2.0),
        Math.abs(pitchErr)/Math.max(1e-4,ap.alignPitch*2.0)
      ),
      0,1
    );
    const n=ease(clamp(ap.stageT/Math.max(1e-3, ap.tCoastIn*0.95),0,1));
    move=clamp(0.18 + 0.56*n*(0.45+0.55*alignQ), 0.18, 0.78);
    boostTarget=lerp(0.16, BOOST_LEVEL_1*0.70, n)*(0.45+0.55*alignQ);
    if((Math.abs(yawErr)<=ap.alignYaw && Math.abs(pitchErr)<=ap.alignPitch) || ap.stageT>=ap.tCoastIn*0.82){
      setAutopilotStage('coast-in');
    }
  }else if(ap.stage==='coast-in'){
    // Smooth launch: start moving gently while camera aligns to route.
    const n=ease(clamp(ap.stageT/Math.max(1e-3,ap.tCoastIn),0,1));
    const alignQ=1-clamp(
      Math.max(
        Math.abs(yawErr)/Math.max(1e-4,ap.alignYaw*1.8),
        Math.abs(pitchErr)/Math.max(1e-4,ap.alignPitch*1.8)
      ),
      0,1
    );
    move=clamp(0.08 + 0.78*n*alignQ, 0.08, 0.86);
    boostTarget=lerp(0.0, BOOST_LEVEL_1*0.55, n)*alignQ;
    if(ap.stageT>=ap.tCoastIn && alignQ>=0.72) setAutopilotStage('shift-up');
  }else if(ap.stage==='shift-up'){
    move=clamp(0.78 + ease(clamp(ap.stageT/Math.max(1e-3,ap.tShiftUp),0,1))*0.22, 0.78, 1.0);
    // Fast progressive acceleration to cruise for minimum transfer time.
    const n=ease(clamp(ap.stageT/Math.max(1e-3,ap.tShiftUp),0,1));
    boostTarget=lerp(BOOST_LEVEL_1, cruiseBoost, n);
    if(ap.stageT>=ap.tShiftUp) setAutopilotStage('ctrl');
  }else if(ap.stage==='ctrl'){
    move=1;
    // Hold maximum cruise as long as possible, then brake just-in-time.
    boostTarget=cruiseBoost;
    const mp=(ap.motionProfile && typeof ap.motionProfile==='object') ? ap.motionProfile : null;
    const baseSpd=travelSpeedAtBoostLevel(0);
    const lv1Spd=travelSpeedAtBoostLevel(BOOST_LEVEL_1);
    const cruiseSpd=travelSpeedAtBoostLevel(cruiseBoost);
    const brakeNeed=ap.arrivalDist + (cruiseSpd*0.30) + (lv1Spd*ap.tShiftDown*0.70) + (baseSpd*ap.tCoastOut*0.95);
    const brakeBase=Math.max(AP_SLOW_START_WU, Number(mp?.brakeStartWU)||AP_SLOW_START_WU);
    const brakeGain=Number.isFinite(Number(mp?.brakeGain)) ? Number(mp.brakeGain) : 1.15;
    const brakeDist=Math.max(brakeBase, brakeNeed*brakeGain);
    if(dist<=brakeDist){
      ap.slowStartWU=Math.max(brakeBase, dist);
      setAutopilotStage('shift-down');
    }
  }else if(ap.stage==='shift-down'){
    move=1;
    // Progressive deceleration from cruise to level-1.
    const tN=ease(clamp(ap.stageT/Math.max(1e-3,ap.tShiftDown),0,1));
    const fromBoost=Number.isFinite(ap.decelStartBoost) ? ap.decelStartBoost : cruiseBoost;
    boostTarget=lerp(fromBoost, BOOST_LEVEL_1, tN);
    if(ap.stageT>=ap.tShiftDown) setAutopilotStage('coast-out');
  }else if(ap.stage==='coast-out'){
    // Final progressive slowdown from level-1 to zero inside braking corridor.
    const fromBoost=Number.isFinite(ap.coastStartBoost) ? ap.coastStartBoost : BOOST_LEVEL_1;
    const tN=ease(clamp(ap.stageT/Math.max(1e-3,ap.tCoastOut),0,1));
    const s=clamp(0.35*tN + 0.65*ease(decelN), 0, 1);
    boostTarget=lerp(fromBoost, 0.0, s);
    const baseSpd=travelSpeedAtBoostLevel(0.05);
    if(ap.kind==='menu'){
      move=clamp(0.16 + approachN*0.84, 0.16, 1.0);
    }else{
      const slowRange=Math.max(baseSpd*1.2, ap.arrivalDist*0.35);
      const n=clamp((dist-ap.arrivalDist)/slowRange,0,1);
      move=clamp(0.12 + n*0.88, 0.12, 1.0);
    }
    if(dist<=ap.arrivalDist){
      setAutopilotStage('stop');
    }else if(ap.kind==='menu' && ap.stageT>=ap.tCoastOut){
      // Menu travel can proceed to final docking refinement even if not exactly on radius yet.
      setAutopilotStage('stop');
    }else if(ap.kind==='pos' && ap.stageT>=ap.tCoastOut){
      // DARH/manual travel: keep correcting route until destination is actually reached.
      // No timeout-based stop.
      ap.stageT=ap.tCoastOut*0.75;
    }
  }else if(ap.stage==='target-lock'){
    // Reacquire mode: keep AP engaged at minimal cruise and rotate until target is centered.
    boostTarget=0;
    ap.targetLockT=(Number(ap.targetLockT)||0) + Math.max(0,dt);
    move=0.16;
    if(dist<=FINAL_SOFT_CRUISE_WU) move=0.12;
    if(needsExplicitTargetLock && isTargetCenteredInCrosshair(ap.lookPos, 44)){
      setAutopilotStage('stop');
    }else if(ap.targetLockT>8.0){
      // Safety timeout: stop anyway but without positional snap (handled in stopAutopilot).
      setAutopilotStage('stop');
    }
  }else{
    boostTarget=0;
    if(ap.kind==='menu'){
      // Keep refining approach until both docking distance and +25deg elevation are satisfied.
      const hx=camPos[0]-cx, hz=camPos[2]-cz;
      const horiz=Math.sqrt(hx*hx+hz*hz);
      const elev=Math.atan2(camPos[1]-cy, horiz||1e-9); // +up
      const elevErr=Math.abs(elev-DOCK_VIEW_ELEV);
      const docked=dist <= SO_DOCK_RADIUS;

      const radialErr=Math.max(0, dist-SO_DOCK_RADIUS*0.92);
      const elevN=clamp(elevErr/(18*DEG),0,1);
      const n=(AUTOPILOT_UTILS && typeof AUTOPILOT_UTILS.autopilotApproachBlend==='function')
        ? AUTOPILOT_UTILS.autopilotApproachBlend({distWU:dist, startWU:AP_SLOW_START_WU, endWU:AP_SLOW_END_WU, clampFn:clamp})
        : clamp((dist-AP_SLOW_END_WU)/(AP_SLOW_START_WU-AP_SLOW_END_WU),0,1);
      move=clamp(0.20 + n*0.48 + elevN*0.22 + radialErr/16, 0.20, 0.82);

      if(docked){
        if(beginFinalDarrApproach(ap, ap.toId)) return;
        stopAutopilot(true);
        return;
      }
    }else{
      const stopRange=Math.max(1.6, ap.arrivalDist*0.40);
      const n=clamp((dist-ap.arrivalDist)/stopRange,0,1);
      // Keep a minimum thrust so guidance keeps converging instead of stalling.
      move=clamp(0.06 + n*0.30, 0.06, 0.36);
      if(dist<=ap.arrivalDist){
        const near=nearestMenuIdTo(camPos);
        const nearDist=Math.sqrt(Math.max(0,near.d2));
        if(near.id && nearDist<SO_DOCK_RADIUS && beginFinalDarrApproach(ap, near.id)) return;
        if(needsExplicitTargetLock && !isTargetCenteredInCrosshair(ap.lookPos, 52)){
          setAutopilotStage('target-lock');
        }else{
          stopAutopilot(true);
        }
        return;
      }
    }
  }
  if(dist<=FINAL_SOFT_CRUISE_WU){
    // Last UA: always minimal cruise (no boost), keep steady forward motion.
    boostTarget=0;
    move=Math.max(move, ap.kind==='menu' ? 0.88 : 0.80);
  }
  const hyperHeld=Boolean(keys['alt'] && (keys['control'] || keys['ctrl']));
  if(hyperHeld && dist>FINAL_SOFT_CRUISE_WU) boostTarget=Math.max(boostTarget, BOOST_HYPER_LEVEL);
  updateThrustBoost(dt, boostTarget);
  const spd = currentTravelSpeed();
  const toNav=vsub(navTarget, camPos);
  const toNavLen=Math.sqrt(vdot(toNav,toNav));
  let desiredDir=camForward(camYaw,camPitch);
  if(toNavLen>1e-4){
    const navDir=[toNav[0]/toNavLen, toNav[1]/toNavLen, toNav[2]/toNavLen];
    const launchDur=Math.max(0.35, Number(ap.launchDur)||1.0);
    const launchN=ease(clamp((Number(ap.totalT)||0)/launchDur,0,1));
    const ldir=(Array.isArray(ap.launchDir) && ap.launchDir.length===3) ? ap.launchDir : desiredDir;
    desiredDir=(launchN<0.999) ? vnorm(vlerp(ldir, navDir, launchN)) : navDir;
  }
  if(ap.hasExplicitLookTarget && (dist<=FINAL_SOFT_CRUISE_WU || ap.stage==='target-lock')){
    // If route correction is not enough, prioritize a smooth camera-led final reframe.
    const angErr=Math.hypot(Number(yawErr)||0, Number(pitchErr)||0);
    const camPriority=clamp(angErr/(10*DEG),0,1);
    move*=lerp(1.0, 0.42, camPriority);
    const cf=camForward(camYaw,camPitch);
    desiredDir=(ap.stage==='target-lock') ? cf : vnorm(vlerp(desiredDir, cf, 0.78*camPriority));
  }
  const prevDir=(Array.isArray(ap.moveDir) && ap.moveDir.length===3) ? ap.moveDir : camForward(camYaw,camPitch);
  const cosAng=clamp(vdot(prevDir,desiredDir),-1,1);
  const ang=Math.acos(cosAng);
  const launchDur=Math.max(0.35, Number(ap.launchDur)||1.0);
  const launchN=ease(clamp((Number(ap.totalT)||0)/launchDur,0,1));
  const finalTurnBoost=(1-finalGuide)*68*launchN;
  let maxTurn=(28 + 92*Math.max(move,0) + finalTurnBoost)*DEG*dt;
  if(launchN<1){
    maxTurn*= (0.24 + 0.76*launchN);
  }
  const steerBlend=(ang>1e-5) ? clamp(maxTurn/ang,0,1) : 1;
  ap.moveDir=vnorm(vlerp(prevDir, desiredDir, steerBlend));
  const f=ap.moveDir;
  camPos=[
    camPos[0] + f[0]*move*spd*dt,
    camPos[1] + f[1]*move*spd*dt,
    camPos[2] + f[2]*move*spd*dt
  ];
  if(ap.hasExplicitLookTarget && Array.isArray(ap.lookPos) && ap.lookPos.length===3 && (dist<=FINAL_SOFT_CRUISE_WU || ap.stage==='target-lock')){
    // Terminal hard lock: keep destination object centered on crosshair.
    const lock=yawPitchToLook(camPos, ap.lookPos);
    camYaw += angleDelta(camYaw, lock.yaw)*Math.min(1, dt*3.8);
    camPitch += angleDelta(camPitch, lock.pitch)*Math.min(1, dt*3.4);
  }
  if(autopilotCheckStopShell(ap, stopPos, stopRange)) return;
}

function camUpdate(dt){
  projM=persp(62*DEG,W()/H(),0.1,WORLD_FAR_CLIP);

  // Mouse wheel speed only (mouse drag controls orbit system/menu)
  vScroll*=0.85;
  camSpeedMul = clamp(camSpeedMul + vScroll*0.035, 0.35, 6.0);

  if(autoPilot){
    manualMoveInputActive=false;
    autopilotStep(dt);
    syncCamBasisFromAngles();
    camRoll += (0-camRoll)*Math.min(1,dt*2.2);
    viewM=viewFromCameraBasis(camPos,camFwd,camUp);
    vpM=mul(projM,viewM);
    return;
  }
  ensureCamBasisMatchesAngles();

  // Keyboard (free fly)
  const fw =(keys['w']?1:0)-(keys['s']?1:0);
  const sd =(keys['d']?1:0)-(keys['a']?1:0);
  const yw =(keys['arrowright']?1:0)-(keys['arrowleft']?1:0);
  const pi =(keys['arrowup']?1:0)-(keys['arrowdown']?1:0);
  const tr =(keys['e']?1:0)-(keys['q']?1:0);
  const ct =((keys['control']?1:0) || (keys['ctrl']?1:0));
  const al =(keys['alt']?1:0);
  const moveHeld=(fw!==0 || sd!==0 || tr!==0 || rightMoveActive);
  manualMoveInputActive=moveHeld;

  // Fast progressive boost with smooth release.
  const boostTargetRaw = (ct && al) ? BOOST_HYPER_LEVEL : (al ? BOOST_SUPER_LEVEL : (ct ? BOOST_LEVEL_1 : 0.0));
  const boostTarget = boostTargetRaw;
  updateThrustBoost(dt, boostTarget);
  const rollInput=(ct ? yw : 0);
  const yawInput=(ct ? 0 : yw);
  rotateCamLocal(
    yawInput*CAMERA_ARROW_YAW_SPEED*dt,
    -pi*CAMERA_ARROW_PITCH_SPEED*dt,
    0
  );
  if(rollInput!==0){
    const rollAxis=crosshairAimDir();
    rotateCamAroundAxis(rollAxis, -rollInput*CAMERA_ARROW_ROLL_SPEED*dt);
  }

  // Movement basis is derived from the current forward ray to avoid phase/skew.
  const f=crosshairAimDir();
  const r=basisRightFromFU(camFwd,camUp);

  const spd = currentTravelSpeed();
  camPos=[
    camPos[0] + (f[0]*fw + r[0]*sd)*spd*dt,
    camPos[1] + (f[1]*fw + tr)*spd*dt,
    camPos[2] + (f[2]*fw + r[2]*sd)*spd*dt
  ];
  if(rightMoveActive && rightMoveDir){
    const rstep = currentTravelSpeed()*dt;
    camPos = vadd(camPos, vscl(rightMoveDir, rstep));
  }

  viewM=viewFromCameraBasis(camPos,camFwd,camUp);
  vpM=mul(projM,viewM);
}

function systemNavUpdate(dt){
  const follow=Math.min(1,dt*8.5);
  sysYawT += vTheta*0.55;
  sysPitchT -= vPhi*0.45;
  sysYaw += (sysYawT - sysYaw)*follow;
  sysPitch += (sysPitchT - sysPitch)*follow;
  menuOrbitOff += (menuOrbitOffT - menuOrbitOff)*follow;

  // Card carousel: user-driven (no auto-rotation), with light inertia.
  cardSpinT += cardSpinV;
  cardSpin += (cardSpinT - cardSpin)*follow;
  cardSpinV *= Math.exp(-dt*6.0);

  vTheta*=0.84;
  vPhi*=0.84;

  mSt.forEach(s=>{ s.thT = s.baseTh + menuOrbitOff; });
}

function ease(t){ t=clamp(t,0,1); return t*t*(3-2*t); }

function marbleWorldPos(i){
  const s=mSt[i]; if(!s) return null;
  const rg=RINGS[s.ri]||RINGS[0]; if(!rg) return null;
  const rr=(Number.isFinite(s.orbitR)?s.orbitR:rg.r)+s.rad;
  const bx=Math.cos(s.th)*rr, bz=Math.sin(s.th)*rr;
  const rp=xfm3(s.orbitRot||RING_ROT[s.ri],bx,BASE_Y,bz);
  const sysM = mul(tmat(activeNodeP[0],activeNodeP[1],activeNodeP[2]+systemZ), mul(rY(sysYaw), mul(rX(sysPitch), smat(systemScale))));
  return xfm3(sysM,rp[0],rp[1],rp[2]);
}

function pickMarbleAt(px,py, radiusPx=48){
  let best=-1, bestD=1e9;
  for(let i=0;i<mSt.length;i++){
    const wp=marbleWorldPos(i);
    if(!wp) continue;
    const sc=proj3(wp,viewM,projM);
    if(!sc || sc[2]>=0.99) continue;
    const sx=sceneScreenXFromNdc(sc[0]);
    const sy=sceneScreenYFromNdc(sc[1]);
    const dx=sx-px, dy=sy-py;
    const d=dx*dx+dy*dy;
    if(d<bestD){ bestD=d; best=i; }
  }
  // Default click radius ~48px (can be widened for hover usage).
  const r=Math.max(8, Number(radiusPx)||48);
  if(best<0 || bestD>r*r) return -1;
  return best;
}

function pickCardAt(px,py){
  if(!cardDraw || !cardDraw.length) return -1;
  let best=-1, bestD=1e18;
  for(let i=0;i<cardDraw.length;i++){
    const cd=cardDraw[i];
    if((cd.alpha||0) < 0.08) continue;
    const cs=cd.cornersS;
    if(!cs || cs.length!==4) continue;
    if(cs.some(p=>!p || p[2]>=0.99)) continue;
    const pts=cs.map(p=>[sceneScreenXFromNdc(p[0]), sceneScreenYFromNdc(p[1])]);
    let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
    pts.forEach(p=>{ minX=Math.min(minX,p[0]); maxX=Math.max(maxX,p[0]); minY=Math.min(minY,p[1]); maxY=Math.max(maxY,p[1]); });
    // Expand slightly for usability
    minX-=6; maxX+=6; minY-=6; maxY+=6;
    if(px<minX||px>maxX||py<minY||py>maxY) continue;
    const cx=(minX+maxX)*0.5, cy=(minY+maxY)*0.5;
    const dx=cx-px, dy=cy-py;
    const d=dx*dx+dy*dy;
    if(d<bestD){ bestD=d; best=i; }
  }
  return best;
}

function startMenuTransition(toId, focusIdx){
  if(menuTrans) return;
  if(!MENU_DEFS[toId]) return;

  let toYaw=sysYaw, toPitch=sysPitch;
  if(focusIdx!=null && focusIdx>=0 && mSt[focusIdx]){
    const s=mSt[focusIdx];
    const rg=RINGS[s.ri]||RINGS[0];
    const rr=(Number.isFinite(s.orbitR)?s.orbitR:rg.r)+s.rad;
    const bx=Math.cos(s.th)*rr, bz=Math.sin(s.th)*rr;
    const rp=xfm3(s.orbitRot||RING_ROT[s.ri],bx,BASE_Y,bz);
    // Approx solve: yaw to cancel x, then pitch to cancel y.
    toYaw = -Math.atan2(rp[0], rp[2]);
    const rp1=xfm3(rY(toYaw), rp[0], rp[1], rp[2]);
    toPitch = clamp(-Math.atan2(rp1[1], rp1[2]), -0.52, 0.52);
  }

  menuTrans={toId,t:0,swapDone:false,fromYaw:sysYaw,fromPitch:sysPitch,toYaw,toPitch};
  ctrlOn=false;
}

function startSoftSwap(toId){
  if(menuTrans || navTrans) return;
  if(phase!=='done' || !ctrlOn) return;
  if(!MENU_DEFS[toId] || toId===menuId) return;
  menuTrans={toId,t:0,swapDone:false,soft:true};
}

function menuTransitionTick(dt){
  if(!menuTrans) return;
  menuTrans.t += dt;

  if(menuTrans.soft){
    const p=clamp(menuTrans.t/0.78,0,1);
    if(p<0.5){
      const k=ease(p/0.5);
      menuFade = 1.0 - k;
      systemScale = 1.0;
      systemZ = 0;
      return;
    }
    if(!menuTrans.swapDone){
      applyMenu(menuTrans.toId);
      menuTrans.swapDone=true;
      menuFade=0;
      systemScale=1.0;
      systemZ=0;
    }
    const k=ease((p-0.5)/0.5);
    menuFade = k;
    systemScale = 1.0;
    systemZ = 0;
    if(p>=1){
      menuTrans=null;
      menuFade=1;
      systemScale=1.0;
      systemZ=0;
    }
    return;
  }

  const p=clamp(menuTrans.t/1.25,0,1);

  // A: focus + slight zoom
  if(p<0.34){
    const k=ease(p/0.34);
    sysYaw = lerp(menuTrans.fromYaw, menuTrans.toYaw, k);
    sysPitch = lerp(menuTrans.fromPitch, menuTrans.toPitch, k);
    systemScale = lerp(1.0, 1.18, k);
    systemZ = 0;
    menuFade = 1;
    return;
  }

  // B: collapse out
  if(p<0.55){
    const k=ease((p-0.34)/0.21);
    sysYaw = menuTrans.toYaw;
    sysPitch = menuTrans.toPitch;
    systemScale = lerp(1.18, 0.22, k);
    systemZ = lerp(0, -80, k);
    menuFade = 1-k;
    return;
  }

  // Swap menu once, while hidden
  if(!menuTrans.swapDone){
    applyMenu(menuTrans.toId);
    systemScale=0.22;
    systemZ=-80;
    menuFade=0;
    menuTrans.swapDone=true;
  }

  // C: bring in new system
  const k=ease((p-0.55)/0.45);
  systemScale = lerp(0.22, 1.0, k);
  systemZ = lerp(-80, 0, k);
  menuFade = k;

  if(p>=1){
    menuTrans=null;
    systemScale=1;
    systemZ=0;
    menuFade=1;
    ctrlOn=true;
  }
}

// â”€â”€â”€ NAVIGATION TRAVEL (single universe, multi-menu coordinates) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// We keep all menu systems in one shared coordinate space (SOH reference),
// but lazy-load their geometry/textures only when activated (applyMenu).
let navTrans=null; // {kind:'menu'|'href', toId?, url?, t, dur, swapAt, revealAt, swapped, fromPos, toPos, fromT, toT, warpA, warpV}
let pendingGlassAfterTravel=null; // {url,label}

function yawPitchToLook(fromPos, targetPos){
  const v=vsub(targetPos, fromPos);
  const yaw=Math.atan2(v[0], v[2]);
  const pitch=Math.atan2(v[1], Math.sqrt(v[0]*v[0]+v[2]*v[2]));
  return {yaw, pitch};
}
const DOCK_VIEW_ELEV = 25*DEG;
function setDockedView(id){
  if(!id || !NAV_NODES[id]) return;
  const c=nodeCenter(id);
  const vx=camPos[0]-c[0], vy=camPos[1]-c[1], vz=camPos[2]-c[2];
  let r=Math.sqrt(vx*vx+vy*vy+vz*vz);
  if(!Number.isFinite(r)) r=16.0;
  r=Math.max(10.8, r); // Final docking distance floor: 1.08 UA (1 UA = 10 wu).
  let az=Math.atan2(vx,vz);
  if(!Number.isFinite(az)) az=camYaw+PI;
  const h=r*Math.cos(DOCK_VIEW_ELEV);
  const y=r*Math.sin(DOCK_VIEW_ELEV);
  camPos=[c[0]+Math.sin(az)*h, c[1]+y, c[2]+Math.cos(az)*h];
  const yp=yawPitchToLook(camPos, c);
  camYaw=yp.yaw;
  camPitch=yp.pitch;
  camRoll=0;
}
const CAM_ORBIT_OFF=[0,2.5,10.5];
function camOrbitPosForNode(id){
  const c=nodeCenter(id);
  return [c[0]+CAM_ORBIT_OFF[0], c[1]+CAM_ORBIT_OFF[1], c[2]+CAM_ORBIT_OFF[2]];
}

function startNavTravel(toId){
  if(isNormalMode()){
    const pg=SO_DIRECT_PAGE_MAP[String(toId||'').trim()] || SO_DIRECT_PAGE_MAP.root;
    SECC_GLASS.openPage(pg.url, pg.label || 'Pagina');
    return;
  }
  if(isHalfExplorerMode()){
    navigateSoByMode(toId);
    return;
  }
  if(phase!=='done' || !ctrlOn) return;
  if(navTrans || autoPilot) return;
  if(!MENU_DEFS[toId]) return;
  confidenceBump('menuTravels', 1);
  // Real autopilot transfer: orient, accelerate/decelerate in boost stages, stop near target.
  const toT=nodeCenter(toId);
  startAutopilotTravel('menu', toT, { toId, lookPos:toT });
}

function startNavTravelToPos(toPos, toT){
  if(isNormalMode()){
    SECC_GLASS.openPage('pages/algoritmi/','Navigazione Normale');
    return;
  }
  if(isHalfExplorerMode()){
    const lookPos=(Array.isArray(toT) && toT.length===3) ? toT : nodeCenter(SOH_ID);
    quickFadeTeleport(()=>{
      camPos=[...toPos];
      const yp=yawPitchToLook(camPos, lookPos);
      camYaw=yp.yaw; camPitch=yp.pitch; camRoll=0;
      syncCamBasisFromAngles();
      // Teleport rule: always detach previous target first, then attach only current destination target.
      clearAttachedTargetState();
      const forcedEntry=navTransferAttachEntry;
      const forceClear=navTransferForceClearAttach;
      navTransferAttachEntry=null;
      navTransferForceClearAttach=false;
      if(forceClear){
        // explicit no-attach destination (e.g. free-space landing pose)
      }else if(forcedEntry){
        forceAttachEntry(forcedEntry);
      }else{
        const targetEntry=nearestAttachableForPos(lookPos);
        if(targetEntry) forceAttachEntry(targetEntry);
      }
    });
    return;
  }
  const forcedEntry=navTransferAttachEntry;
  navTransferAttachEntry=null;
  navTransferForceClearAttach=false;
  if(phase!=='done' || !ctrlOn) return;
  if(navTrans || autoPilot) return;
  if(!Array.isArray(toPos) || toPos.length!==3) return;
  // Real autopilot transfer to arbitrary coordinates.
  const lookPos=(Array.isArray(toT) && toT.length===3) ? toT : toPos;
  startAutopilotTravel('pos', toPos, { lookPos, attachEntry:forcedEntry });
}

function startHrefWarp(url){
  if(isNormalMode() || isHalfExplorerMode()){
    const u=String(url||'').trim();
    if(!u) return;
    if(/^(https?:)?\/\//i.test(u)){
      window.location.href=u;
    }else{
      SECC_GLASS.openPage(u,'Pagina');
    }
    return;
  }
  if(phase!=='done' || !ctrlOn) { window.location.href=url; return; }
  if(navTrans) return;
  navTrans={
    kind:'href',
    url:String(url||''),
    t:0,
    dur:0.75,
    swapAt:1,
    revealAt:1,
    swapped:true,
    fromPos:[...camPos],
    toPos:[...camPos],
    fromT:sysCenterW(),
    toT:sysCenterW(),
    warpA:1.0,
    warpV:1.0
  };
  ctrlOn=false;
  started=false;
  phase='nav'; phaseT=0;
  menuFade=0;
  orbitApproach=0;
  animPos=[...camPos];
  animTarget=vadd(camPos,[Math.sin(camYaw)*Math.cos(camPitch),Math.sin(camPitch),Math.cos(camYaw)*Math.cos(camPitch)]);
  animFOV=86;
}
async function openNewsHubGlass(){
  if(!SOH_HUBS || typeof SOH_HUBS.buildNewsFeed!=='function'){
    SECC_GLASS.openMessages();
    return;
  }
  try{
    const items=await SOH_HUBS.buildNewsFeed(18);
    SECC_GLASS.openFeed('News', items);
  }catch(_e){
    SECC_GLASS.openMessages();
  }
}
async function openNewsLatestDrawGlass(){
  SECC_GLASS.openPage('pages/storico-estrazioni/','Ultima estrazione');
}
async function openNewsTwoHitsGlass(){
  if(!SOH_HUBS || typeof SOH_HUBS.buildNewsTwoHitsLastDrawFeed!=='function'){
    SECC_GLASS.openPage('pages/algoritmi/','Algoritmi >=2 hit');
    return;
  }
  try{
    const items=await SOH_HUBS.buildNewsTwoHitsLastDrawFeed(18);
    SECC_GLASS.openFeed('Algoritmi >=2 hit', items);
  }catch(_e){
    SECC_GLASS.openPage('pages/algoritmi/','Algoritmi >=2 hit');
  }
}
async function openNewsActiveGlass(){
  if(!SOH_HUBS || typeof SOH_HUBS.buildNewsActiveCardsFeed!=='function'){
    openNewsHubGlass();
    return;
  }
  try{
    const items=await SOH_HUBS.buildNewsActiveCardsFeed(18);
    SECC_GLASS.openFeed('News attive', items);
  }catch(_e){
    openNewsHubGlass();
  }
}
async function openProposteHubGlass(){
  if(!SOH_HUBS || typeof SOH_HUBS.buildProposteFeed!=='function'){
    SECC_GLASS.openPage('pages/algoritmi/','Algoritmi');
    return;
  }
  try{
    const items=await SOH_HUBS.buildProposteFeed(24);
    SECC_GLASS.openFeed('Proposte', items);
  }catch(_e){
    SECC_GLASS.openPage('pages/algoritmi/','Algoritmi');
  }
}
async function openLaboratorioHubGlass(){
  if(!SOH_HUBS || typeof SOH_HUBS.buildLaboratorioFeed!=='function'){
    SECC_GLASS.openPage('pages/analisi-statistiche/','Laboratorio Tecnico');
    return;
  }
  try{
    const items=SOH_HUBS.buildLaboratorioFeed();
    SECC_GLASS.openFeed('Laboratorio Tecnico', items);
  }catch(_e){
    SECC_GLASS.openPage('pages/analisi-statistiche/','Laboratorio Tecnico');
  }
}
function handleSpecialMarbleAction(md,label){
  const action=String(md?.action||'').trim().toLowerCase();
  if(!action) return false;
  if(action==='open-news-glass'){
    openNewsHubGlass();
    return true;
  }
  if(action==='open-news-draw-glass'){
    openNewsLatestDrawGlass();
    return true;
  }
  if(action==='open-news-2hits-glass'){
    openNewsTwoHitsGlass();
    return true;
  }
  if(action==='open-news-active-glass'){
    openNewsActiveGlass();
    return true;
  }
  if(action==='open-proposte-glass'){
    openProposteHubGlass();
    return true;
  }
  if(action==='open-laboratorio-glass'){
    openLaboratorioHubGlass();
    return true;
  }
  return false;
}
function setupGlassCustomLinkHandler(){
  if(!(SECC_GLASS && typeof SECC_GLASS.setLinkHandler==='function')) return;
  SECC_GLASS.setLinkHandler((payload)=>{
    const href=String(payload?.href||'').trim();
    const defaultLabel=String(payload?.label||'Algoritmo').trim() || 'Algoritmo';
    if(!href || !href.toLowerCase().startsWith('secc://proposal')) return false;
    let soId='root';
    let pageUrl='pages/algoritmi/';
    let pageLabel=defaultLabel;
    try{
      const u=new URL(href);
      soId=String(u.searchParams.get('so')||'root').trim() || 'root';
      pageUrl=decodeURIComponent(String(u.searchParams.get('url')||'pages/algoritmi/').trim() || 'pages/algoritmi/');
      pageLabel=decodeURIComponent(String(u.searchParams.get('label')||defaultLabel));
    }catch(_e){}
    const exploreMode=!isNormalMode() && (phase==='done' && ctrlOn);
    if(exploreMode){
      const ok=window.confirm('Sei pronto per partire?');
      if(!ok) return true;
    }
    SECC_GLASS.close();
    if(MENU_DEFS[soId]){
      if(isNormalMode()){
        SECC_GLASS.openPage(pageUrl, pageLabel||'Algoritmo');
        return true;
      }
      pendingGlassAfterTravel={ url:pageUrl, label:pageLabel||'Algoritmo' };
      navigateSoByMode(soId);
      return true;
    }
    SECC_GLASS.openPage(pageUrl, pageLabel||'Algoritmo');
    return true;
  });
}

function handlePick(px,py){
  const cidx=pickCardAt(px,py);
  if(cidx>=0){
    const cd=cardDraw[cidx];
    const md=cd?.md;
    const label=cd?.def?.title || md?.name || 'Pagina';
    if(handleSpecialMarbleAction(md,label)) return;
    if(md?.goto){ navigateSoByMode(md.goto); return; }
    if(md?.href){ SECC_GLASS.openPage(md.href, label); return; }
    return;
  }

  const idx=pickMarbleAt(px,py);
  if(idx<0) return;
  const md=MARBLES[idx];
  const label=md?.name || 'Pagina';
  if(handleSpecialMarbleAction(md,label)) return;
  if(md?.goto){ navigateSoByMode(md.goto); return; }
  if(md?.href){ openHrefByMode(md.href, label); }
}

// â”€â”€â”€ MARBLE PHYSICS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let mSt=[];
const ORBIT_MIN_STAR_CLEARANCE_UA = 1.5;
const ORBIT_MIN_STAR_CLEARANCE_WU = ORBIT_MIN_STAR_CLEARANCE_UA * 10.0;
function soCoreBoundaryRadiusWUById(soId){
  const id=String(soId||'').trim();
  if(!id) return 0;
  const idx=(typeof BCN_INDEX==='object' && BCN_INDEX && Number.isInteger(BCN_INDEX[id])) ? BCN_INDEX[id] : -1;
  if(idx<0) return 0;
  const lum=Number(soCoreLum && soCoreLum[idx]);
  if(!Number.isFinite(lum)) return 0;
  // Approximate stellar boundary (world units) derived from SO core luminosity.
  // Keeps larger SO stars with proportionally wider safe orbital clearance.
  const starRadiusUa = clamp(0.28 + 0.62*lum, 0.30, 2.20);
  return starRadiusUa * 10.0;
}
function buildUniqueOrbitRadii(total,rings,seedKey,opts){
  const n=Math.max(1,total|0);
  const rr=(Array.isArray(rings)?rings:[])
    .map(r=>Number(r?.r))
    .filter(v=>Number.isFinite(v) && v>0);
  const center=rr.length ? rr.reduce((a,b)=>a+b,0)/Math.max(1,rr.length) : 2.2;
  if(n<=1) return [Math.max(1.2, center)];

  // Target: orbit diameter difference random in [0.3, 0.6] UA (1 UA = 10 wu).
  // So radius gap is random in [0.15, 0.30] UA => [1.5, 3.0] wu.
  const gaps=new Array(n-1);
  let span=0;
  for(let i=0;i<n-1;i++){
    const rnd=hash01(`${seedKey}:gap:${i}`);
    const g=1.5 + 1.5*rnd; // 1.5..3.0 wu radius gap
    gaps[i]=g;
    span+=g;
  }
  const soId=(opts && typeof opts==='object') ? String(opts.soId||'').trim() : '';
  const starBoundaryWU=soCoreBoundaryRadiusWUById(soId);
  const minFirstOrbitWU=starBoundaryWU + ORBIT_MIN_STAR_CLEARANCE_WU;
  let r=Math.max(1.2, center - span*0.5, minFirstOrbitWU);
  const out=new Array(n);
  for(let i=0;i<n;i++){
    const jit=(hash01(`${seedKey}:jit:${i}`)-0.5)*0.16;
    let ri=r + jit + i*1e-4;
    if(i===0 && minFirstOrbitWU>0) ri=Math.max(ri, minFirstOrbitWU);
    if(i>0) ri=Math.max(ri, out[i-1]+0.02); // never equal
    out[i]=ri;
    if(i<n-1) r+=gaps[i];
  }
  return out;
}
const ORBIT_TILT_MAX_DEG = 5.0;
const ORBIT_TILT_MAX_RAD = ORBIT_TILT_MAX_DEG * DEG;
const ORBIT_TILT_PATTERN_X_DEG = Object.freeze([-2.2, -1.3, -0.6, 0.5, 1.2, 2.0, -1.8, 1.7]);
const ORBIT_TILT_PATTERN_Z_DEG = Object.freeze([1.9, 0.8, -0.4, -1.2, -2.1, 1.4, 0.3, -1.7]);
function orbitRotFromRingAndSeed(rings, ringIdx, seedKey, i){
  const rg=(Array.isArray(rings) && rings[ringIdx]) ? rings[ringIdx] : null;
  const baseX=Number(rg?.tiltX)||0;
  const baseZ=Number(rg?.tiltZ)||0;
  // Fixed tilt pattern (no random): orbit planes stay constant forever.
  const ix=Math.abs(i|0)%ORBIT_TILT_PATTERN_X_DEG.length;
  const iz=Math.abs(i|0)%ORBIT_TILT_PATTERN_Z_DEG.length;
  const cycle=Math.floor(Math.abs(i|0)/ORBIT_TILT_PATTERN_X_DEG.length);
  const dX=(ORBIT_TILT_PATTERN_X_DEG[ix] + cycle*0.16) * DEG;
  const dZ=(ORBIT_TILT_PATTERN_Z_DEG[iz] - cycle*0.12) * DEG;
  const tiltX=clamp(baseX + dX + i*1e-4, -ORBIT_TILT_MAX_RAD, ORBIT_TILT_MAX_RAD);
  const tiltZ=clamp(baseZ + dZ + i*1e-4, -ORBIT_TILT_MAX_RAD, ORBIT_TILT_MAX_RAD);
  return { tiltX, tiltZ, rot:mul(rZ(tiltZ), rX(tiltX)) };
}
function orbitColorKey(rings, ringIdx){
  const rg=(Array.isArray(rings) && rings[ringIdx]) ? rings[ringIdx] : null;
  const col=Array.isArray(rg?.col) ? rg.col : null;
  if(!col || col.length<3) return `ring:${ringIdx|0}`;
  return `col:${col[0].toFixed(3)},${col[1].toFixed(3)},${col[2].toFixed(3)}`;
}
function buildOrbitTilts(marbles,rings,seedKey){
  const arr=new Array(marbles.length);
  const perRingIdx={};
  const perColorIdx={};
  for(let i=0;i<marbles.length;i++){
    const md=marbles[i]||{};
    const ringCount=Math.max(1,(rings||[]).length|0);
    const ri=(Number.isInteger(md.ring) && md.ring>=0 && md.ring<ringCount) ? md.ring : (i%ringCount);
    const localRing=(perRingIdx[ri]||0);
    perRingIdx[ri]=localRing+1;
    const colorKey=orbitColorKey(rings, ri);
    const localColor=(perColorIdx[colorKey]||0);
    perColorIdx[colorKey]=localColor+1;
    const base=orbitRotFromRingAndSeed(rings, ri, seedKey, i);
    // Guaranteed divergence inside both ring family and color family.
    const fanRing=((localRing%2===0)?1:-1) * (0.85 + localRing*0.22) * DEG;
    const fanColor=((localColor%2===0)?-1:1) * (0.55 + localColor*0.18) * DEG;
    const fanX=fanRing + fanColor;
    const fanZ=(-fanRing*0.66) + (fanColor*0.88);
    const tiltX=clamp(base.tiltX + fanX, -ORBIT_TILT_MAX_RAD, ORBIT_TILT_MAX_RAD);
    const tiltZ=clamp(base.tiltZ + fanZ, -ORBIT_TILT_MAX_RAD, ORBIT_TILT_MAX_RAD);
    arr[i]={ tiltX, tiltZ, rot:mul(rZ(tiltZ), rX(tiltX)) };
  }
  return arr;
}
function orbitSpeedByRadius(radius, minR, maxR, seedKey){
  const minRR=Math.min(minR,maxR);
  const maxRR=Math.max(minR,maxR);
  const norm = clamp((radius-minRR)/Math.max(1e-5, maxRR-minRR), 0, 1);
  // Inner orbits faster, outer orbits slower (same direction).
  const base = lerp(0.42, 0.14, norm);
  const jitter = 0.93 + 0.14*hash01(`${seedKey}:spd`);
  return Math.max(0.02, base*jitter);
}
function buildMarbleOrbitDust(radius, orbitIdx, orbitRot){
  const p=[], s=[];
  const count = 980 + (orbitIdx%4)*170;
  const thickMul=2.0; // requested: double orbit dust thickness
  for(let i=0;i<count;i++){
    const a=(i/count)*TAU + Math.random()*0.016;
    const radialNoise=(Math.random()-0.5) * (0.11 + (orbitIdx%5)*0.012) * thickMul;
    const centerPull=Math.cos(a*3.0 + orbitIdx*0.73) * 0.045;
    const rr=Math.max(0.06, radius + radialNoise + centerPull);
    const y=BASE_Y + (Math.random()-0.5) * (0.032 + (orbitIdx%4)*0.006) * thickMul;
    const rp=xfm3(orbitRot||idt(), Math.cos(a)*rr, y, Math.sin(a)*rr);
    p.push(rp[0], rp[1], rp[2]);
    s.push(Math.random());
  }
  return { p:new Float32Array(p), s:new Float32Array(s), count };
}
function rebuildMarbleState(){
  const total=MARBLES.length;
  const ringCount=Math.max(1,RINGS.length|0);
  const orbitRadii=buildUniqueOrbitRadii(total,RINGS,`main:${menuId||'root'}`,{soId:menuId});
  const orbitTilts=buildOrbitTilts(MARBLES,RINGS,`main:${menuId||'root'}`);
  const minR=Math.min(...orbitRadii);
  const maxR=Math.max(...orbitRadii);
  mSt=MARBLES.map((md,i)=>{
    const ri=(Number.isInteger(md?.ring) && md.ring>=0 && md.ring<ringCount) ? md.ring : (i%ringCount);
    const orbitR=orbitRadii[i];
    const rotData=orbitTilts[i] || orbitRotFromRingAndSeed(RINGS, ri, `main:${menuId||'root'}`, i);
    const ang=(i/Math.max(1,total))*TAU+ri*0.22;
    const orbitSpeed=orbitSpeedByRadius(orbitR, minR, maxR, `main:${menuId||'root'}:${i}`);
    return{ri,th:ang,thT:ang,thV:0,rad:0,radV:0,
           orbitR,
           orbitSpeed,
           orbitTiltX:rotData.tiltX,
           orbitTiltZ:rotData.tiltZ,
           orbitRot:rotData.rot,
           baseTh:ang,
           tx:0,tz:0,tvx:0,tvz:0,spin:0,ry:ang,rx:0};
  });
}
rebuildMarbleState();
rebuildOrbitDustBuf();

function physTick(dt){
  mSt.forEach((s,i)=>{
    // Direct orbital progression: visibly revolves along its own orbit.
    const targetSpd=(s.orbitSpeed||0.22);
    s.thV += (targetSpd - s.thV) * Math.min(1,dt*6.5);
    s.th += s.thV*dt;
    s.thT=s.th;
    if(Math.abs(s.th)>TAU*256) s.th=((s.th%TAU)+TAU)%TAU;
    s.radV+=(-s.rad*9.0-s.radV*3.5)*dt;
    s.rad+=s.radV*dt; s.rad=clamp(s.rad,-0.18,0.18);
    const ext=s.thV*2.5;
    s.tvx+=(ext*0.08-s.tx*10.0-s.tvx*4.2)*dt;
    s.tvz+=((-ext)*0.05-s.tz*9.0-s.tvz*3.8)*dt;
    s.tx+=s.tvx*dt; s.tz+=s.tvz*dt;
    s.tx=clamp(s.tx,-0.22,0.22); s.tz=clamp(s.tz,-0.22,0.22);
    s.spin+=(Math.abs(ext)*0.07-s.spin*1.2)*dt;
    s.ry+=0.003+(i%3)*0.0007+s.spin; s.rx=s.tx;
  });
}

// â”€â”€â”€ TAGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TAGS_ENABLED=false;
const tagsEl=document.getElementById('tagsLayer');
let tags=[];
function rebuildTags(){ /* disabled */ }

function applyMenu(nextId){
  const def=MENU_DEFS[nextId];
  if(!def) return;
  menuId=nextId;
  activeNodeId=nextId;
  activeNodeP=nodePos(nextId);
  RINGS=def.rings;
  MARBLES=def.marbles;
  RING_SLOTS=def.ringSlots;
  RING_ROT = RINGS.map(rg=>mul(rZ(rg.tiltZ||0), rX(rg.tiltX||0)));

  sysYaw=sysPitch=sysYawT=sysPitchT=0;
  menuOrbitOff=menuOrbitOffT=0;
  vTheta=vPhi=0;

  rebuildMarbleState();
  rebuildOrbitDustBuf();
  rebuildMarbleTex();
  refreshMarbleProposals();
  if(TAGS_ENABLED) rebuildTags();
  SECC_HUD.syncSoHud({activeNodeId, camPos});
}
function tagsTick(){
  if(!TAGS_ENABLED) return;
  if(systemFade < 0.04){
    tags.forEach(el=>el.style.opacity='0');
    return;
  }
  const sysM = mul(tmat(activeNodeP[0],activeNodeP[1],activeNodeP[2]+systemZ), mul(rY(sysYaw), mul(rX(sysPitch), smat(systemScale))));
  mSt.forEach((s,i)=>{
    const rg=RINGS[s.ri];
    const rr=(Number.isFinite(s.orbitR)?s.orbitR:rg.r)+s.rad;
    const bx=Math.cos(s.th)*rr, bz=Math.sin(s.th)*rr;
    const rp=xfm3(s.orbitRot||RING_ROT[s.ri],bx,BASE_Y,bz);
    const wp=xfm3(sysM,rp[0],rp[1],rp[2]);
    const sc=proj3(wp,viewM,projM);
    const el=tags[i];
    if(!sc||sc[2]>=0.99){el.style.opacity='0';return;}
    const sx=(sc[0]+1)*0.5*W();
    const sy=(1-sc[1])*0.5*H();
    if(sx<-80||sx>W()+80||sy<-60||sy>H()+60){el.style.opacity='0';return;}
    el.style.left=clamp(sx,65,W()-65)+'px';
    el.style.top =clamp(sy-36,35,H()-35)+'px';
    el.style.opacity=String(systemFade*menuFade);
  });
}

// â”€â”€â”€ DRAW FUNCTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function drawMarble(modelMat, ri, texObj, isIB, tintOverride, sysAOverride){
  const mvp=mul(vpM,modelMat);
  gl.useProgram(mProg);
  gl.uniformMatrix4fv(ML.u_mvp,false,mvp);
  gl.uniformMatrix4fv(ML.u_model,false,modelMat);
  gl.uniform3fv(ML.u_eye,new Float32Array(camPos));
  const tint = tintOverride || ((typeof ri==='number' && RINGS[ri]) ? RINGS[ri].col : [0.98,0.78,0.24]);
  gl.uniform3fv(ML.u_tint,new Float32Array(tint));
  gl.uniform1f(ML.u_time,simTime);
  gl.uniform1f(ML.u_sysA, sysAOverride==null ? (systemFade*menuFade) : sysAOverride);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D,texObj);
  gl.uniform1i(ML.u_numTex,0);
  const pb=isIB?ib_p:sp_p, nb=isIB?ib_n:sp_n, uvb=isIB?ib_uv:sp_uv;
  const ib2=isIB?ib_i:sp_i, cnt=isIB?ib_cnt:sp_cnt;
  attrib(ML.a_pos,pb); attrib(ML.a_nrm,nb); attrib(ML.a_uv,uvb,2);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib2);
  gl.drawElements(gl.TRIANGLES,cnt,gl.UNSIGNED_SHORT,0);
  unAttrib(ML.a_pos,ML.a_nrm,ML.a_uv);
}

function drawOrbitDust(){
  const sysM = mul(tmat(activeNodeP[0],activeNodeP[1],activeNodeP[2]+systemZ), mul(rY(sysYaw), mul(rX(sysPitch), smat(systemScale))));
  gl.useProgram(dProg);
  gl.uniformMatrix4fv(DL.u_vp,false,vpM);
  gl.uniformMatrix4fv(DL.u_sys,false,sysM);
  gl.uniform3fv(DL.u_cam,new Float32Array(camPos));
  gl.uniform1f(DL.u_t,simTime);
  gl.uniform1f(DL.u_sysA, systemFade*menuFade);
  // Dust is volumetric: don't write depth (prevents it from incorrectly occluding cards/marbles).
  gl.depthMask(false);
  orbitDustBuf.forEach((tb,i)=>{
    if(!tb) return;
    const rg=RINGS[tb.ri]||RINGS[0]||{col:CORE_GOLD};
    gl.uniform3fv(DL.u_col,new Float32Array(rg.col));
    gl.uniform1f(DL.u_alpha, 0.78 + 0.24*Math.sin(simTime*(1.3+i*0.25)));
    attrib(DL.a_pos,tb.p);
    attrib(DL.a_seed,tb.seed,1);
    gl.drawArrays(gl.POINTS,0,tb.cnt);
    unAttrib(DL.a_pos,DL.a_seed);
  });
  gl.depthMask(true);
}

function drawStars(t){
  if(!ENABLE_BACKGROUND_STARS) return;
  gl.useProgram(stProg);
  gl.uniformMatrix4fv(STL.u_vp,false,vpM);
  gl.uniform3fv(STL.u_cam,new Float32Array(camPos));
  gl.uniform1f(STL.u_t,t);

  // Background: additive, no depth write.
  gl.depthMask(false);
  gl.disable(gl.DEPTH_TEST);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  attrib(STL.a_dir, starDirBuf);
  attrib(STL.a_rad, starRadBuf, 1);
  attrib(STL.a_col, starColBuf);
  attrib(STL.a_seed,starSeedBuf,1);
  const layers=(STAR_MAP && STAR_MAP.layers && Array.isArray(STAR_MAP.layers.background) && STAR_MAP.layers.background.length)
    ? STAR_MAP.layers.background
    : [
        { alpha:0.30, radMul:0.72, sizeMul:1.35, tw:0.0 },
        { alpha:0.40, radMul:1.00, sizeMul:1.00, tw:1.9 },
        { alpha:0.56, radMul:1.55, sizeMul:0.82, tw:3.8 }
      ];
  for(let i=0;i<layers.length;i++){
    const L=layers[i];
    gl.uniform1f(STL.u_alpha, L.alpha);
    gl.uniform1f(STL.u_radMul, L.radMul);
    gl.uniform1f(STL.u_sizeMul, L.sizeMul);
    gl.uniform1f(STL.u_twOff, L.tw);
    gl.drawArrays(gl.POINTS,0,STAR_COUNT);
  }
  unAttrib(STL.a_dir,STL.a_rad,STL.a_col,STL.a_seed);

  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
}
function drawRealStars(t){
  if(realStarN<=0) return;
  gl.useProgram(rstProg);
  gl.uniformMatrix4fv(RSTL.u_vp,false,vpM);
  gl.uniform3fv(RSTL.u_cam,new Float32Array(camPos));
  gl.uniform1f(RSTL.u_t,t);
  gl.uniform1f(RSTL.u_sizeMul, 1.0);
  gl.uniform1f(RSTL.u_pxPerRad, 0.5*Math.max(1,H())*Math.max(0.0001,projM[5]));

  // Physical stars live in world space: keep depth test for proper parallax/occlusion.
  gl.depthMask(true);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);

  attrib(RSTL.a_pos, realStarPosBuf);
  attrib(RSTL.a_col, realStarColBuf);
  attrib(RSTL.a_seed,realStarSeedBuf,1);
  attrib(RSTL.a_lum, realStarLumBuf,1);
  gl.drawArrays(gl.POINTS,0,realStarN);
  unAttrib(RSTL.a_pos,RSTL.a_col,RSTL.a_seed,RSTL.a_lum);

  // One large characteristic-color star at the center of each SO.
  gl.uniform1f(RSTL.u_sizeMul, 1.65);
  attrib(RSTL.a_pos, soCorePosBuf);
  attrib(RSTL.a_col, soCoreColBuf);
  attrib(RSTL.a_seed,soCoreSeedBuf,1);
  attrib(RSTL.a_lum, soCoreLumBuf,1);
  const activeIdx=(typeof BCN_INDEX==='object' && BCN_INDEX && Number.isInteger(BCN_INDEX[menuId])) ? BCN_INDEX[menuId] : -1;
  if(activeIdx>=0 && activeIdx<BCN_COUNT){
    if(activeIdx>0) gl.drawArrays(gl.POINTS,0,activeIdx);
    const tail=BCN_COUNT-activeIdx-1;
    if(tail>0) gl.drawArrays(gl.POINTS,activeIdx+1,tail);
  }else{
    gl.drawArrays(gl.POINTS,0,BCN_COUNT);
  }
  unAttrib(RSTL.a_pos,RSTL.a_col,RSTL.a_seed,RSTL.a_lum);

  gl.enable(gl.BLEND);
}

function drawBeacons(t){
  if(phase!=='done') return;
  gl.useProgram(bProg);
  gl.uniformMatrix4fv(BL.u_vp,false,vpM);
  gl.uniform3fv(BL.u_cam,new Float32Array(camPos));
  gl.uniform1f(BL.u_t,t);
  gl.uniform1f(BL.u_alpha, 0.85);

  gl.depthMask(false);
  gl.disable(gl.DEPTH_TEST);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  attrib(BL.a_pos, bcnPosBuf);
  attrib(BL.a_col, bcnColBuf);
  attrib(BL.a_seed,bcnSeedBuf,1);
  gl.drawArrays(gl.POINTS,0,BCN_COUNT);
  unAttrib(BL.a_pos,BL.a_col,BL.a_seed);

  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
}

function updateSoFlowDust(dt, t){
  if(FLOW_COUNT<=0 || FLOW_EDGE_COUNT<=0) return;
  for(let i=0;i<FLOW_COUNT;i++){
    const e=flowEdgeOf[i];
    let tt=flowT[i] + flowSpeed[i]*dt;
    tt%=1; if(tt<0) tt+=1;
    flowT[i]=tt;

    const ax=flowEdgeA[e*3], ay=flowEdgeA[e*3+1], az=flowEdgeA[e*3+2];
    const bx=flowEdgeB[e*3], by=flowEdgeB[e*3+1], bz=flowEdgeB[e*3+2];
    const ox=flowOff[i*3], oy=flowOff[i*3+1], oz=flowOff[i*3+2];
    const waveA=Math.sin(t*0.16 + flowSeed[i]*29.0 + tt*TAU*0.55);
    const waveB=Math.sin(t*0.09 + flowSeed[i]*17.0 + tt*TAU*0.28);
    const wave=0.82 + 0.12*waveA + 0.06*waveB;
    flowPos[i*3]   = ax + (bx-ax)*tt + ox*wave;
    flowPos[i*3+1] = ay + (by-ay)*tt + oy*wave;
    flowPos[i*3+2] = az + (bz-az)*tt + oz*wave;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, flowPosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, flowPos, gl.DYNAMIC_DRAW);
}

function drawSoFlowDust(dt, t){
  if(phase!=='done') return;
  if(FLOW_COUNT<=0 || FLOW_EDGE_COUNT<=0) return;

  // Visible mostly when far enough from the local SO, so filaments read as "cosmic lanes".
  const dLocal=distToSoCenter(menuId, camPos);
  const near=smoothstep(10, 120, dLocal);
  const far=1.0 - smoothstep(4200, 9000, dLocal);
  const pulse=0.92 + 0.08*Math.sin(t*0.22);
  const alpha=0.54 * near * far * pulse;
  if(alpha<=0.01) return;

  updateSoFlowDust(dt, t);

  gl.useProgram(bProg);
  gl.uniformMatrix4fv(BL.u_vp,false,vpM);
  gl.uniform3fv(BL.u_cam,new Float32Array(camPos));
  gl.uniform1f(BL.u_t,t);
  gl.uniform1f(BL.u_alpha, alpha);

  gl.depthMask(false);
  gl.disable(gl.DEPTH_TEST);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  attrib(BL.a_pos, flowPosBuf);
  attrib(BL.a_col, flowColBuf);
  attrib(BL.a_seed,flowSeedBuf,1);
  gl.drawArrays(gl.POINTS,0,FLOW_COUNT);
  gl.uniform1f(BL.u_alpha, alpha*0.24);
  gl.drawArrays(gl.POINTS,0,FLOW_COUNT);
  unAttrib(BL.a_pos,BL.a_col,BL.a_seed);

  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
}

function drawCosmicWord(t){
  if(COSMIC_WORD_COUNT<=0) return;
  gl.useProgram(wProg);
  gl.uniformMatrix4fv(WL.u_vp,false,vpM);
  gl.uniform3fv(WL.u_cam,new Float32Array(camPos));
  gl.uniform1f(WL.u_t,t);

  gl.depthMask(false);
  gl.enable(gl.DEPTH_TEST);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  attrib(WL.a_pos, cosmicWordPosBuf);
  attrib(WL.a_seed,cosmicWordSeedBuf,1);
  attrib(WL.a_lum, cosmicWordLumBuf,1);
  // Halo layer
  gl.uniform1f(WL.u_sizeMul,1.14);
  gl.uniform1f(WL.u_alpha,0.07);
  gl.drawArrays(gl.POINTS,0,COSMIC_WORD_COUNT);
  // Core layer
  gl.uniform1f(WL.u_sizeMul,0.76);
  gl.uniform1f(WL.u_alpha,0.36);
  gl.drawArrays(gl.POINTS,0,COSMIC_WORD_COUNT);
  unAttrib(WL.a_pos,WL.a_seed,WL.a_lum);

  gl.depthMask(true);
}
function drawCrossCalibr(t){
  if(CROSS_CALIBR_COUNT<=0) return;
  const dx=camPos[0]-CROSS_CALIBR_POS[0];
  const dy=camPos[1]-CROSS_CALIBR_POS[1];
  const dz=camPos[2]-CROSS_CALIBR_POS[2];
  const d=Math.sqrt(dx*dx + dy*dy + dz*dz);
  const fade=1.0 - smoothstep(CROSS_CALIBR_FADE_START_WU, CROSS_CALIBR_FADE_END_WU, d);
  if(fade<=0.01) return;
  gl.useProgram(bProg);
  gl.uniformMatrix4fv(BL.u_vp,false,vpM);
  gl.uniform3fv(BL.u_cam,new Float32Array(camPos));
  gl.uniform1f(BL.u_t,t);
  gl.depthMask(false);
  gl.enable(gl.DEPTH_TEST);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  attrib(BL.a_pos, crossCalibrPosBuf);
  attrib(BL.a_col, crossCalibrColBuf);
  attrib(BL.a_seed,crossCalibrSeedBuf,1);
  gl.uniform1f(BL.u_alpha,0.72*fade);
  gl.drawArrays(gl.POINTS,0,CROSS_CALIBR_COUNT);
  gl.uniform1f(BL.u_alpha,0.26*fade);
  gl.drawArrays(gl.POINTS,0,CROSS_CALIBR_COUNT);
  unAttrib(BL.a_pos,BL.a_col,BL.a_seed);
  gl.depthMask(true);
}

// â”€â”€â”€ MAP / MENU SYSTEM INSTANCES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MAP_DRAW_R=900;     // within this distance, other menu systems become visible ("optical range")
const MAP_FADE_R=180;     // fade-in/out ramp near MAP_DRAW_R
const MAP_CARD_R=520;     // within this distance, ghost systems upgrade to card textures
const MAP_DOCK_R=22;      // docking radius already used by proximity swap (keep consistent)

const MAP_SYSTEMS=new Map(); // id -> inst
let mapVisible=[]; // array of inst for current frame

function ringRotFor(rings){
  return rings.map(rg=>mul(rZ(rg.tiltZ||0), rX(rg.tiltX||0)));
}

function makeGhostTex(md, ringCol, mode){
  if(mode==='card') return makeCardTex(md, ringCol);
  if(md && md.n!=null) return makeNumTex(md.n, ringCol);
  return makeLabelTex(String(md?.name||'?'), ringCol, 0.9);
}

function buildMarbleStateFor(def, seedKey){
  const rings=def.rings||[];
  const marbles=def.marbles||[];
  const ringCount=Math.max(1,rings.length|0);
  const total=marbles.length;
  const soId=(typeof seedKey==='string' && seedKey.indexOf('map:')===0) ? seedKey.slice(4) : '';
  const orbitRadii=buildUniqueOrbitRadii(total, rings, String(seedKey||'map'), {soId});
  const orbitTilts=buildOrbitTilts(marbles,rings,String(seedKey||'map'));
  const minR=Math.min(...orbitRadii);
  const maxR=Math.max(...orbitRadii);
  return marbles.map((md,i)=>{
    const ri=(Number.isInteger(md?.ring) && md.ring>=0 && md.ring<ringCount) ? md.ring : (i%ringCount);
    const orbitR=orbitRadii[i];
    const rotData=orbitTilts[i] || orbitRotFromRingAndSeed(rings, ri, String(seedKey||'map'), i);
    const ang=(i/Math.max(1,total))*TAU+ri*0.22;
    const orbitSpeed=orbitSpeedByRadius(orbitR, minR, maxR, `${String(seedKey||'map')}:${i}`) * 0.92;
    return{ri,th:ang,thT:ang,thV:0,rad:0,radV:0,
           orbitR,
           orbitSpeed,
           orbitTiltX:rotData.tiltX,
           orbitTiltZ:rotData.tiltZ,
           orbitRot:rotData.rot,
           baseTh:ang,
           tx:0,tz:0,tvx:0,tvz:0,spin:0,ry:ang,rx:0};
  });
}

function physTickState(mStArr, dt){
  mStArr.forEach((s,i)=>{
    const targetSpd=(s.orbitSpeed||0.18);
    s.thV += (targetSpd - s.thV) * Math.min(1,dt*6.0);
    s.th += s.thV*dt;
    s.thT=s.th;
    if(Math.abs(s.th)>TAU*256) s.th=((s.th%TAU)+TAU)%TAU;
    s.radV+=(-s.rad*9.0-s.radV*3.5)*dt;
    s.rad+=s.radV*dt; s.rad=clamp(s.rad,-0.18,0.18);
    const ext=s.thV*2.5;
    s.tvx+=(ext*0.08-s.tx*10.0-s.tvx*4.2)*dt;
    s.tvz+=((-ext)*0.05-s.tz*9.0-s.tvz*3.8)*dt;
    s.tx+=s.tvx*dt; s.tz+=s.tvz*dt;
    s.tx=clamp(s.tx,-0.22,0.22); s.tz=clamp(s.tz,-0.22,0.22);
    s.spin+=(Math.abs(ext)*0.07-s.spin*1.2)*dt;
    s.ry+=0.003+(i%3)*0.0007+s.spin; s.rx=s.tx;
  });
}

function deleteMapSystem(inst){
  if(!inst) return;
  (inst.orbitDustBuf||[]).forEach(tb=>{
    if(tb?.p) gl.deleteBuffer(tb.p);
    if(tb?.seed) gl.deleteBuffer(tb.seed);
  });
  (inst.tex||[]).forEach(t=>{ if(t) gl.deleteTexture(t); });
  MAP_SYSTEMS.delete(inst.id);
}

function ensureMapSystem(id){
  let inst=MAP_SYSTEMS.get(id);
  if(inst) return inst;
  const def=MENU_DEFS[id];
  if(!def) return null;
  const rings=def.rings||[];
  const mStArr=buildMarbleStateFor(def, `map:${id}`);
  const orbitDustBuf=mStArr.map((s,i)=>{
    const radius = Number.isFinite(s.orbitR) ? s.orbitR : ((rings[s.ri]||rings[0]||{r:2.0}).r);
    const g=buildMarbleOrbitDust(radius, i, s.orbitRot);
    return { p: glBuf(g.p), seed: glBuf(g.s), cnt: g.count, ri:s.ri };
  });
  const tex=def.marbles.map(md=>makeGhostTex(md, (rings[md.ring]||rings[0]||{col:CORE_GOLD}).col, 'num'));
  inst={
    id,
    def,
    pos: nodePos(id),
    rings,
    orbitDustBuf,
    mSt: mStArr,
    tex,
    texMode:'num',
    spin: hash01(id+'#spin')*TAU,
    lastSeen: simTime
  };
  MAP_SYSTEMS.set(id, inst);
  return inst;
}

function upgradeMapSystemTextures(inst, mode, force){
  if(!inst) return;
  if(inst.texMode===mode && !force) return;
  inst.tex.forEach(t=>{ if(t) gl.deleteTexture(t); });
  inst.tex = inst.def.marbles.map(md=>makeGhostTex(md, (inst.rings[md.ring]||inst.rings[0]||{col:CORE_GOLD}).col, mode));
  inst.texMode=mode;
}

function mapTick(dt,t){
  if(phase!=='done') { mapVisible=[]; return; }
  mapVisible=[];

  // Find which menu systems are in optical range.
  for(let i=0;i<BCN_COUNT;i++){
    const id=BCN_IDS[i];
    // Never draw a ghost copy of the currently loaded system.
    if(id===menuId || id===activeNodeId) continue;
    const dx=bcnPos[i*3]-camPos[0], dy=bcnPos[i*3+1]-camPos[1], dz=bcnPos[i*3+2]-camPos[2];
    const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);
    if(dist > MAP_DRAW_R) continue;

    const inst=ensureMapSystem(id);
    if(!inst) continue;
    inst.lastSeen=t;
    inst.dist=dist;
    const edge = clamp(1.0 - (dist-(MAP_DRAW_R-MAP_FADE_R))/MAP_FADE_R, 0.0, 1.0);
    inst.alpha = 0.70 * edge;
    inst.spin += dt*(0.07 + 0.04*hash01(id+'#w'));

    // Animate marbles subtly in ghost systems.
    physTickState(inst.mSt, dt*0.75);

    if(dist < MAP_CARD_R) upgradeMapSystemTextures(inst,'card');
    mapVisible.push(inst);
  }

  // Garbage collect systems that haven't been visible for a while.
  // (Keep it conservative; number of menus is small, but this prevents unbounded growth later.)
  for(const inst of MAP_SYSTEMS.values()){
    if((t - inst.lastSeen) > 8.0 && (inst.dist==null || inst.dist > MAP_DRAW_R*1.35)){
      deleteMapSystem(inst);
    }
  }
}

function drawMapSystems(t){
  if(phase!=='done') return;
  if(!mapVisible.length) return;

  // Draw each nearby system at its real coordinate.
  mapVisible.forEach(inst=>{
    const sysM = mul(tmat(inst.pos[0],inst.pos[1],inst.pos[2]), mul(rY(inst.spin), smat(1.0)));
    const sysA = inst.alpha==null ? 0.5 : inst.alpha;

    // Orbit dust
    gl.useProgram(dProg);
    gl.uniformMatrix4fv(DL.u_vp,false,vpM);
    gl.uniformMatrix4fv(DL.u_sys,false,sysM);
    gl.uniform3fv(DL.u_cam,new Float32Array(camPos));
    gl.uniform1f(DL.u_t,simTime);
    gl.uniform1f(DL.u_sysA, sysA);
    gl.depthMask(false);
    inst.orbitDustBuf.forEach((tb,i)=>{
      if(!tb) return;
      const rg=inst.rings[tb.ri]||inst.rings[0]||{col:CORE_GOLD};
      gl.uniform3fv(DL.u_col,new Float32Array(rg.col));
      gl.uniform1f(DL.u_alpha, 0.62 + 0.20*Math.sin(simTime*(1.2+i*0.27) + inst.spin));
      attrib(DL.a_pos,tb.p);
      attrib(DL.a_seed,tb.seed,1);
      gl.drawArrays(gl.POINTS,0,tb.cnt);
      unAttrib(DL.a_pos,DL.a_seed);
    });
    gl.depthMask(true);

    // Marbles
    inst.mSt.forEach((s,i)=>{
      const rg=inst.rings[s.ri]||inst.rings[0];
      if(!rg) return;
      const rr=(Number.isFinite(s.orbitR)?s.orbitR:rg.r)+s.rad;
      const bx=Math.cos(s.th)*rr, bz=Math.sin(s.th)*rr;
      const rp=xfm3(s.orbitRot||idt(), bx, BASE_Y, bz);
      let model=tmat(rp[0],rp[1],rp[2]);
      model=mul(model,s.orbitRot||idt());
      model=mul(model,rY(s.ry));
      model=mul(model,rX(s.rx));
      model=mul(model,rZ(s.tz));
      model=mul(sysM,model);
      drawMarble(model,s.ri,inst.tex[i],false,rg.col,sysA);
    });
  });
}

// Debug surface
window.SECC_MAP = {
  MAP_DRAW_R, MAP_CARD_R, MAP_FADE_R,
  systems: MAP_SYSTEMS,
  getVisible: ()=>mapVisible.map(s=>({id:s.id, dist:+(s.dist||0).toFixed(1), alpha:+(s.alpha||0).toFixed(2), texMode:s.texMode})),
};

function drawCardCarousel(t){
  cardDraw=[];
  if(phase!=='done' || !started){
    hideAllOrbitDomCards();
    return;
  }
  if(!cardSt.length){
    hideAllOrbitDomCards();
    return;
  }

  // Place the carousel above the system center, but keep it upright (not coupled to orbit-plane rotation).
  // Constrained to the current system orientation plane.
  const sysM = mul(tmat(activeNodeP[0],activeNodeP[1],activeNodeP[2]+systemZ), mul(rY(sysYaw), mul(rX(sysPitch), smat(systemScale))));
  const spin = cardSpin;

  if(!ORBIT_USE_SHARED_DOM_CARDS){
    gl.useProgram(cProg);
    // Cards should occlude each other: write depth.
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);

    // Bind quad geometry
    attrib(CL.a_pos, q_p);
    attrib(CL.a_uv,  q_uv, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, q_i);
  }

  // Sort front-to-back so far cards never "bleed through" near cards.
  const order=[];
  for(let idx=0; idx<cardSt.length; idx++){
    const cs=cardSt[idx];
    const a = cs.baseA + spin;
    const lp=[Math.cos(a)*cs.rad, cs.y, Math.sin(a)*cs.rad];
    const cw = xfm3(sysM, lp[0], lp[1], lp[2]);
    const dx=cw[0]-camPos[0], dy=cw[1]-camPos[1], dz=cw[2]-camPos[2];
    order.push({idx, cw, d2:dx*dx+dy*dy+dz*dz, a});
  }
  order.sort((p,q)=>p.d2-q.d2);

  for(let oi=0; oi<order.length; oi++){
    const idx=order[oi].idx;
    const cs=cardSt[idx];
    const cw=order[oi].cw;

    // Billboard to camera, but resolve the 180deg ambiguity using camera axes (prevents mirrored text).
    const n = vnorm(vsub(camPos, cw)); // normal toward eye
    const sysUp=vnorm([sysM[4],sysM[5],sysM[6]]);
    const camRight=basisRightFromFU(camFwd,camUp);
    const camUpRef=vnorm(camUp);

    let r0 = vcross(sysUp, n);
    const rl=Math.sqrt(vdot(r0,r0))||0;
    if(rl<1e-4) r0=[...camRight];
    else r0=vscl(r0,1/rl);
    if(vdot(r0, camRight) < 0) r0=vscl(r0,-1);

    let u0 = vnorm(vcross(n, r0));
    if(vdot(u0, camUpRef) < 0){ r0=vscl(r0,-1); u0=vscl(u0,-1); }
    const r = vscl(r0, cs.w);
    const u = vscl(u0, cs.h);

    const m=idt();
    m[0]=r[0]; m[1]=r[1]; m[2]=r[2];
    m[4]=u[0]; m[5]=u[1]; m[6]=u[2];
    m[8]=n[0]; m[9]=n[1]; m[10]=n[2];
    m[12]=cw[0]; m[13]=cw[1]; m[14]=cw[2];

    const mvp=mul(vpM,m);
    const alpha = clamp(systemFade*menuFade*0.96, 0, 1);

    if(!ORBIT_USE_SHARED_DOM_CARDS){
      gl.uniformMatrix4fv(CL.u_mvp,false,mvp);
      gl.uniformMatrix4fv(CL.u_model,false,m);
      gl.uniform3fv(CL.u_eye,new Float32Array(camPos));
      gl.uniform1f(CL.u_t,simTime);
      gl.uniform1f(CL.u_alpha,alpha);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, cardTex[idx]);
      gl.uniform1i(CL.u_tex,0);

      gl.drawElements(gl.TRIANGLES,q_cnt,gl.UNSIGNED_SHORT,0);
    }

    // Picking cache (projected corners)
    const cornersL=[[-0.5,-0.5,0],[0.5,-0.5,0],[0.5,0.5,0],[-0.5,0.5,0]];
    const cornersW=cornersL.map(p=>xfm3(m,p[0],p[1],p[2]));
    const cornersS=cornersW.map(p=>proj3(p,viewM,projM));
    cardDraw.push({ md:cs.md, def:marbleCardDef(cs.md), cornersS, alpha });
    placeOrbitDomCard(idx, cs.md, cornersS, alpha);
  }

  const centerMd=resolveCenterCardMd();
  const centerW=xfm3(sysM, 0, 1.55, 0);
  const centerN=vnorm(vsub(camPos,centerW));
  const centerSysUp=vnorm([sysM[4],sysM[5],sysM[6]]);
  const centerCamRight=basisRightFromFU(camFwd,camUp);
  const centerCamUpRef=vnorm(camUp);
  let centerR0=vcross(centerSysUp,centerN);
  const centerRl=Math.sqrt(vdot(centerR0,centerR0))||0;
  if(centerRl<1e-4) centerR0=[...centerCamRight];
  else centerR0=vscl(centerR0,1/centerRl);
  if(vdot(centerR0,centerCamRight)<0) centerR0=vscl(centerR0,-1);
  let centerU0=vnorm(vcross(centerN,centerR0));
  if(vdot(centerU0,centerCamUpRef)<0){ centerR0=vscl(centerR0,-1); centerU0=vscl(centerU0,-1); }
  const centerR=vscl(centerR0,2.56);
  const centerU=vscl(centerU0,4.24);
  const centerM=idt();
  centerM[0]=centerR[0]; centerM[1]=centerR[1]; centerM[2]=centerR[2];
  centerM[4]=centerU[0]; centerM[5]=centerU[1]; centerM[6]=centerU[2];
  centerM[8]=centerN[0]; centerM[9]=centerN[1]; centerM[10]=centerN[2];
  centerM[12]=centerW[0]; centerM[13]=centerW[1]; centerM[14]=centerW[2];
  const centerCornersL=[[-0.5,-0.5,0],[0.5,-0.5,0],[0.5,0.5,0],[-0.5,0.5,0]];
  const centerCornersW=centerCornersL.map((p)=>xfm3(centerM,p[0],p[1],p[2]));
  const centerCornersS=centerCornersW.map((p)=>proj3(p,viewM,projM));
  const centerAlpha=clamp(systemFade*menuFade, 0, 1);
  cardDraw.push({ md:centerMd, def:marbleCardDef(centerMd), cornersS:centerCornersS, alpha:centerAlpha });
  if(ORBIT_USE_SHARED_DOM_CARDS){
    placeOrbitDomCard(CENTER_ORBIT_CARD_ID, centerMd, centerCornersS, centerAlpha);
  }else{
    const centerMvp=mul(vpM,centerM);
    gl.uniformMatrix4fv(CL.u_mvp,false,centerMvp);
    gl.uniformMatrix4fv(CL.u_model,false,centerM);
    gl.uniform3fv(CL.u_eye,new Float32Array(camPos));
    gl.uniform1f(CL.u_t,simTime);
    gl.uniform1f(CL.u_alpha,centerAlpha);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, getCenterCardTex(centerMd));
    gl.uniform1i(CL.u_tex,0);
    gl.drawElements(gl.TRIANGLES,q_cnt,gl.UNSIGNED_SHORT,0);
  }

  if(!ORBIT_USE_SHARED_DOM_CARDS){
    unAttrib(CL.a_pos,CL.a_uv);
    gl.enable(gl.BLEND);
  }
  finalizeOrbitDomCards();
}

function drawParts(t){
  const cx=camPos[0], cy=camPos[1], cz=camPos[2];
  for(let i=0;i<PCOUNT;i++){
    const i3=i*3;
    // Drift
    const wx=pCell[i3  ]+Math.sin(t*0.22+pPh[i])*pAmp[i];
    const wy=pCell[i3+1]+Math.cos(t*0.18+pPh[i]*0.7)*pAmp[i]*0.45;
    const wz=pCell[i3+2]+Math.sin(t*0.20+pPh[i]*1.2)*pAmp[i]*0.9;
    // Respawn if too far from camera
    const dx=wx-cx, dy=wy-cy, dz=wz-cz;
    const d2=dx*dx+dy*dy+dz*dz;
    if(d2>PCELL_R*PCELL_R*1.5){
      // Relocate to random pos around camera (not near center of orbits if far)
      pCell[i3  ]=cx+(Math.random()-.5)*PCELL_R*2;
      pCell[i3+1]=cy+(Math.random()-.5)*PCELL_R*2;
      pCell[i3+2]=cz+(Math.random()-.5)*PCELL_R*2;
    }
    pArr[i3]=wx; pArr[i3+1]=wy; pArr[i3+2]=wz;
  }
  gl.useProgram(pProg);
  gl.uniformMatrix4fv(PL.u_vp,false,vpM);
  gl.uniform3fv(PL.u_cam,new Float32Array(camPos));
  gl.bindBuffer(gl.ARRAY_BUFFER,pBuf);
  gl.bufferData(gl.ARRAY_BUFFER,pArr,gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(PL.a_pos);
  gl.vertexAttribPointer(PL.a_pos,3,gl.FLOAT,false,0,0);
  gl.drawArrays(gl.POINTS,0,PCOUNT);
  gl.disableVertexAttribArray(PL.a_pos);
}

function drawSwarmDust(dt,t, alphaScale=1.0){
  window.SECC_SWARM_DUST.draw({
    phase,
    sysCenterW,
    basisFromDir,
    travelEffectDir,
    respawnSwarm,
    pulse01,
    clamp,
    TAU,
    SD_CLUSTERS,
    SD_COUNT,
    SD_SOFTEN,
    SD_G_SOH,
    SD_G_ACTIVE,
    SD_G_SO_NET,
    SD_TURB,
    SD_DAMP,
    SD_MAX_SPD,
    SD_MAXR,
    BCN_COUNT,
    SOH,
    bcnPos,
    sdLife,
    sdDur,
    sdFade,
    sdC,
    sdV,
    sdAcc,
    sdCi,
    sdSpread,
    sdOff,
    sdSeed,
    sdArr,
    sdAlpha,
    sdAlphaBase,
    camPos,
    gl,
    sProg,
    SL,
    vpM,
    simTime,
    attrib,
    unAttrib,
    sdPosBuf,
    sdSeedBuf,
    sdAlphaBuf,
    sdInitedRef:{
      get value(){ return sdInited; },
      set value(v){ sdInited=!!v; }
    }
  }, dt, t, alphaScale);
}

// â”€â”€â”€ WARP CANVAS (2D overlay for starfield streaks) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const warpCv = document.createElement('canvas');
warpCv.style.cssText='position:fixed;inset:0;z-index:25;pointer-events:none;opacity:0;';
document.body.appendChild(warpCv);
const wctx = warpCv.getContext('2d');
function resizeWarp(){
  const d=Math.min(devicePixelRatio||1,2);
  const w=W()*d|0;
  const h=H()*d|0;
  if(w===warpCv.width && h===warpCv.height) return;
  warpCv.width=w; warpCv.height=h;
}
resizeWarp(); window.addEventListener('resize',resizeWarp);

// Stars: angle around center, distance from center, individual speed multiplier, color
function mkStar(){
  return{
    ang: Math.random()*TAU,
    r:   2 + Math.random()*60,
    spd: 0.4 + Math.random()*1.8,
    bright: 0.5+Math.random()*0.5,
    hue: Math.random()<0.72 ? 195+Math.random()*55 : 38+Math.random()*28,
  };
}
const WSTARS = Array.from({length:500}, mkStar);
// Spread them out initially so they're already distributed when warp starts
WSTARS.forEach(s=>{ s.r = 2+Math.random()*Math.sqrt(warpCv.width**2+warpCv.height**2)*0.5; });

// warpSpeed: 0=stopped â†’ 1=max warp. Driven externally per-phase.
let warpSpeed=0;
let warpCanvasAlpha=0;

// Mid title flash (between warp overlay and WebGL particles)
const midTitleEl=document.getElementById('midTitle');
let midTitleActive=false;
let midTitleT=0;
let midTitleShown=false;

function easeOutCubic(x){ return 1 - Math.pow(1-x,3); }
function easeInCubic(x){ return x*x*x; }
function midTitleTick(dt){
  if(!midTitleActive){
    midTitleEl.style.opacity='0';
    return;
  }
  midTitleT += dt;
  const dur = 0.85;
  const inDur = 0.16;
  const outAt = 0.44;
  const outDur = dur - outAt;
  const inP = easeOutCubic(clamp(midTitleT/inDur,0,1));
  const outP = easeInCubic(clamp((midTitleT-outAt)/outDur,0,1));

  const scale = (0.55 + 0.45*inP) * (1.0 + 0.95*outP);
  const op = (0.02 + 0.98*inP) * (1.0 - outP);
  const blur = (16*(1.0-inP)) + (10*outP);
  const y = -10*(1.0-inP) + 22*outP;

  midTitleEl.style.opacity = op.toFixed(3);
  midTitleEl.style.filter = `blur(${blur.toFixed(1)}px)`;
  midTitleEl.style.transform = `translate(-50%,-50%) translateY(${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;

  if(midTitleT >= dur){
    midTitleActive=false;
    midTitleT=0;
    midTitleEl.style.opacity='0';
  }
}

function tickWarp(dt, targetAlpha, speedOverride){
  const wSpd = speedOverride==null ? warpSpeed : speedOverride;
  const superBoostGlow = clamp(thrustBoost-1.0, 0, 1);
  const W2=warpCv.width, H2=warpCv.height;
  const aim=currentAimTargetPos();
  const wr=(warpCv && typeof warpCv.getBoundingClientRect==='function') ? warpCv.getBoundingClientRect() : null;
  const rw=(wr && wr.width>0) ? wr.width : Math.max(1, W());
  const rh=(wr && wr.height>0) ? wr.height : Math.max(1, H());
  const rx=(wr && Number.isFinite(wr.left)) ? wr.left : 0;
  const ry=(wr && Number.isFinite(wr.top)) ? wr.top : 0;
  const cx=((aim[0]-rx)/rw)*W2;
  const cy=((aim[1]-ry)/rh)*H2;
  const maxR=Math.sqrt(cx*cx+cy*cy)+80;

  // Smooth canvas opacity
  warpCanvasAlpha += (targetAlpha - warpCanvasAlpha)*Math.min(1,dt*5);
  warpCv.style.opacity=warpCanvasAlpha.toFixed(3);

  if(warpCanvasAlpha<0.01) return;

  // Motion blur trail â€” heavier when faster
  wctx.fillStyle=`rgba(2,3,10,${lerp(0.35,0.10,wSpd)})`;
  wctx.fillRect(0,0,W2,H2);

  WSTARS.forEach(s=>{
    const vel = s.spd * wSpd * 480; // px/s expansion
    const move = vel * dt;
    const rPrev = s.r;
    s.r += move;

    // Streak: from previous pos to new pos
    const x1=cx+Math.cos(s.ang)*s.r;
    const y1=cy+Math.sin(s.ang)*s.r;
    const x0=cx+Math.cos(s.ang)*rPrev;
    const y0=cy+Math.sin(s.ang)*rPrev;

    // At low speed: tiny point. At high speed: long bright streak.
    const streakLen = s.r - rPrev;
    if(streakLen < 0.3) return;

    const brightness = clamp(s.bright * (wSpd*(1.0 + 0.58*superBoostGlow) + 0.08*superBoostGlow), 0, 1);
    const lw = clamp(0.5 + wSpd*(1.8 + 1.6*superBoostGlow), 0.4, 4.4);

    const grad = wctx.createLinearGradient(x0,y0,x1,y1);
    grad.addColorStop(0, `hsla(${s.hue},88%,90%,0)`);
    grad.addColorStop(1, `hsla(${s.hue},95%,98%,${brightness})`);
    wctx.strokeStyle = grad;
    wctx.lineWidth = lw;
    wctx.beginPath(); wctx.moveTo(x0,y0); wctx.lineTo(x1,y1); wctx.stroke();

    // Wrap star back to center when it exits
    if(s.r > maxR){
      s.r = 1 + Math.random()*15;
      s.ang = Math.random()*TAU;
    }
  });

  // Radial glow at center when near light-speed
  if(wSpd > 0.7){
    const gA = clamp((wSpd-0.7)/0.3, 0, 1) * (0.45 + 0.35*superBoostGlow);
    const gr = wctx.createRadialGradient(cx,cy,0,cx,cy,cx*0.6);
    gr.addColorStop(0,`rgba(160,200,255,${gA})`);
    gr.addColorStop(0.5,`rgba(80,130,255,${gA*0.3})`);
    gr.addColorStop(1,'rgba(0,0,0,0)');
    wctx.fillStyle=gr;
    wctx.fillRect(0,0,W2,H2);
  }
}

// â”€â”€â”€ INTRO STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/*  Phases:
    idle    â€” ball floats above hole, camera overhead angle
    drop    â€” ball falls into hole (camera: third person from behind/above, 1.2s)
    follow  â€” camera chases ball from behind as it plunges into space (1.4s)
              stars start appearing, very slow
    warp    â€” full warp tunnel, speed ramps 0â†’1 over 2s, holds at peak 0.5s,
              then decelerates 1â†’0 over 2s. Ball faintly visible ahead.
              Orbit system appears from far ahead growing larger.  (4.5s total)
    arrive  â€” warp clears, orbits fill the screen, camera glides to final pos (1.8s)
    done    â€” user controls
*/
// Initial intro removed: app starts in a remote landing zone looking toward SOHome.
const INTRO_ENABLED = false;

let started=!INTRO_ENABLED, ctrlOn=!INTRO_ENABLED;
let phase=(INTRO_ENABLED ? 'idle' : 'done'), phaseT=0;

// Ball state
let ibPos=[0, 0.15, 7.0];
let ibRY=0, ibRX=0.25;
let ibShow=INTRO_ENABLED;
// Saved start position for drop interpolation
let ibDropStart=[0,0.15,7.0];

// Hole world position (where ball disappears into)
const HOLE_W=[0, -0.25, 5.8];

// Camera animation state
const CAM_ORBIT=[0, 2.5, 10.5]; // final orbit position near the local system
let animPos=[...INITIAL_LANDING_POSE.pos];
let animTarget=[...INITIAL_LANDING_POSE.target];
let animFOV=62;
let voidFromPos=[0, 0.1, 0];
let voidFromTarget=[0, 0, -5];
let voidFromFov=62;

// System approach: during warp decel, orbit system "comes toward camera"
// We do this by animating the orbit scale/distance in the draw call
let orbitApproach=INTRO_ENABLED ? 0 : 1; // 0=far away, 1=normal size
let systemFade=1;
let systemZ=INTRO_ENABLED ? -260 : 0;
let systemScale=INTRO_ENABLED ? 0.12 : 1.0;
let menuFade=1;

let simTime=0, lastTS=performance.now();

// â”€â”€â”€ RENDER LOOP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updateProximityDockingAndContext(dt){
  if(phase==='done' && ctrlOn && !menuTrans && !navTrans){
    if(activeNodeId && MENU_DEFS[activeNodeId]){
      const dCur=distToSoCenter(activeNodeId, camPos);
      if(dCur > SO_RELEASE_RADIUS){
        activeNodeId=null;
        SECC_HUD.syncSoHud({activeNodeId, camPos});
      }
    }
    autoDockCd=Math.max(0, autoDockCd-dt);
    // Manual flight must always allow re-docking/retargeting to nearby SOs,
    // regardless of current navigation mode (full/half) and previous activeNodeId.
    if(!autoPilot && autoDockCd<=0){
      if(dockNearestSo(Boolean(coordNavDockArm)) && coordNavDockArm){
        coordNavDockArm=false;
      }
    }

    // Generic coordinate objects (including custom cosmic word anchor):
    // show one attach notification when entering docking radius.
    let nearObj=getNearestAttachableEntry(camPos);
    if(attachedCoordKey && Array.isArray(attachedCoordPos) && attachedCoordPos.length===3){
      const dx0=camPos[0]-attachedCoordPos[0], dy0=camPos[1]-attachedCoordPos[1], dz0=camPos[2]-attachedCoordPos[2];
      const d0=Math.sqrt(dx0*dx0 + dy0*dy0 + dz0*dz0);
      if(d0>attachedCoordReleaseWU){
        attachedCoordKey='';
        attachedCoordPos=null;
        attachedCoordReleaseWU=SO_RELEASE_RADIUS;
        if(SECC_HUD && typeof SECC_HUD.setCommTargetLabel==='function'){
          SECC_HUD.setCommTargetLabel('');
        }
      }
    }
    if(nearObj && Number.isFinite(nearObj.d2)){
      const d=Math.sqrt(nearObj.d2);
      const key=`${String(nearObj.kind||'object')}:${String(nearObj.id||'')}`;
      const attachWU=entryAttachRangeWU(nearObj);
      if(d<=attachWU){
        if(attachedCoordKey!==key){
          attachedCoordKey=key;
          attachedCoordPos=entryCenterPos(nearObj) || [nearObj.pos[0],nearObj.pos[1],nearObj.pos[2]];
          attachedCoordReleaseWU=entryReleaseRangeWU(nearObj);
          if(!(nearObj.kind==='so' && nearObj.id===activeNodeId)){
            showCommsAttachToast(nearObj);
          }
        }
      }else if(attachedCoordKey===key && d>entryReleaseRangeWU(nearObj)){
        attachedCoordKey='';
        attachedCoordPos=null;
        attachedCoordReleaseWU=SO_RELEASE_RADIUS;
        if(SECC_HUD && typeof SECC_HUD.setCommTargetLabel==='function'){
          SECC_HUD.setCommTargetLabel('');
        }
      }
    }else{
      attachedCoordKey='';
      attachedCoordPos=null;
      attachedCoordReleaseWU=SO_RELEASE_RADIUS;
      if(SECC_HUD && typeof SECC_HUD.setCommTargetLabel==='function'){
        SECC_HUD.setCommTargetLabel('');
      }
    }
  }
  syncTipCalibrationHudVisibility();
  SECC_GUIDE.contextTick();
}
function drawBackgroundSpace(dt, t, travelOverlay){
  if(travelOverlay) return;
  drawRealStars(t);
  drawStars(t);
  drawBeacons(t);
  drawSoFlowDust(dt,t);
  drawMapSystems(t);
  drawCrossCalibr(t);
  drawCosmicWord(t);
}
function updateIntroAndApproachPhases(dt, t){
  if(phase==='idle'){
    const loop = (t*0.22)%1;
    ibPos[2] = lerp(9.1, 6.0, loop);
    ibPos[0] = Math.sin(loop*TAU*1.25)*0.22;
    ibPos[1] = 0.14 + Math.abs(Math.sin(loop*TAU*3.5))*0.05;
    ibRY += dt*(3.5 + loop*2.1);
    ibRX += dt*(1.0 + loop*0.8);
    animPos   = [ibPos[0]*0.2, 1.6, ibPos[2]+4.4];
    animTarget = [ibPos[0]*0.4, 0.05, 5.78];
    animFOV    = 62;
    warpSpeed  = 0;
    orbitApproach = 0;
    systemZ = -260;
    systemScale = 0.12;
    midTitleActive=false; midTitleT=0; midTitleShown=false;
  }
  if(phase==='drop'){
    phaseT = clamp(phaseT + dt/1.0, 0, 1);
    const e = phaseT*phaseT*phaseT;
    ibPos = vlerp(ibDropStart, HOLE_W, e);
    ibRY += dt*(2.0 + phaseT*10.0);
    ibRX += dt*(1.0 + phaseT*6.0);
    const camOffY = lerp(1.4, 0.5, e);
    const camOffZ = lerp(3.2, 1.8, e);
    animPos   = [ibPos[0], ibPos[1]+camOffY, ibPos[2]+camOffZ];
    animTarget = [...ibPos];
    animFOV   = lerp(62, 72, e);
    if(phaseT>=1){ phase='follow'; phaseT=0; ibPos=[...HOLE_W]; }
  }
  if(phase==='follow'){
    phaseT = clamp(phaseT + dt/1.6, 0, 1);
    const depth = phaseT*phaseT * 55;
    ibPos[2] = HOLE_W[2] - depth;
    ibPos[1] = HOLE_W[1] - phaseT*0.3;
    ibPos[0] = Math.sin(phaseT*PI*2)*0.12;
    ibRY += dt*12.0;
    ibRX += dt*4.0;
    animPos   = [ibPos[0]*0.5, ibPos[1]+0.4, ibPos[2]+2.2];
    animTarget = [...ibPos];
    animFOV   = lerp(72, 92, phaseT*phaseT);
    warpSpeed = clamp((phaseT-0.4)/0.6, 0, 0.12);
    orbitApproach = 0;
    systemZ = -260;
    systemScale = 0.12;
    if(phaseT>=1){ phase='warp'; phaseT=0; ibPos[2] = HOLE_W[2] - 55; }
  }
  if(phase==='warp'){
    phaseT = clamp(phaseT + dt/5.0, 0, 1);
    const p = phaseT;
    let spd;
    if(p < 0.30){
      const x=p/0.30;
      spd = x*x*x;
    } else if(p < 0.50){
      spd = 1.0;
    } else {
      const x=(p-0.50)/0.50;
      spd = 1.0 - x*x*(3-2*x);
    }
    warpSpeed = spd;
    ibPos[2] = lerp(-50, -200, p<0.5 ? p*2 : 1.0);
    ibShow = true;
    orbitApproach = 0;
    systemZ = -260;
    systemScale = 0.12;
    animPos    = [0, 0.1, 0];
    animTarget = [0, 0, -10];
    animFOV = lerp(92, 62, p>0.5 ? clamp((p-0.5)/0.5,0,1)*0.9 : 0);
    if(p<0.5) animFOV = lerp(72, 92, warpSpeed);
    if(phaseT>=1){
      phase='void'; phaseT=0;
      started=false;
      ibShow=false;
      voidFromPos=[...animPos];
      voidFromTarget=[...animTarget];
      voidFromFov=animFOV;
    }
  }
  if(phase==='void'){
    phaseT = clamp(phaseT + dt/0.9, 0, 1);
    const e = phaseT*phaseT*(3-phaseT*2);
    ibShow = false;
    warpSpeed = 0;
    orbitApproach = 0;
    systemZ = -260;
    systemScale = 0.12;
    animPos    = vlerp(voidFromPos, CAM_ORBIT, e);
    animTarget = vlerp(voidFromTarget, [0,0.2,0], e);
    animFOV    = lerp(voidFromFov, 62, e);
    if(phaseT>=1){ phase='approach'; phaseT=0; }
  }
  if(phase==='approach'){
    phaseT = clamp(phaseT + dt/2.6, 0, 1);
    const e = phaseT*phaseT*(3-phaseT*2);
    ibShow = false;
    warpSpeed = 0;
    animPos = [...CAM_ORBIT];
    animTarget = [0,0.2,0];
    animFOV = 62;
    orbitApproach = e;
    systemZ = lerp(-260, 0, e);
    systemScale = lerp(0.12, 1.0, e);
    started = orbitApproach > 0.08;
    if(phaseT>=1){
      phase='done'; ctrlOn=true;
      started=true;
      systemZ=0; systemScale=1; orbitApproach=1;
      camPos=[...CAM_ORBIT];
      const yp=yawPitchToLook(camPos, sysCenterW());
      camYaw=yp.yaw;
      camPitch=yp.pitch;
      camRoll=0;
    }
  }
}
function updateNavTransitPhase(dt){
  if(!(phase==='nav' && navTrans)) return;
  navTrans.t += dt;
  const p = clamp(navTrans.t/(navTrans.dur||1), 0, 1);
  const e = ease(p);
  const fp=vlerp(navTrans.fromPos, navTrans.toPos, e);
  const d=vsub(navTrans.toPos, navTrans.fromPos);
  const side=vnorm(vcross(vnorm(d), [0,1,0]));
  const curve = Math.sin(p*PI)*Math.min(18, Math.sqrt(vdot(d,d))*0.06);
  animPos = vadd(fp, vscl(side, curve));
  animTarget = vlerp(navTrans.fromT, navTrans.toT, e);
  const peak = Math.sin(clamp(p/0.65,0,1)*PI);
  animFOV = lerp(72, 98, peak);
  navTrans.warpA = 1.0;
  navTrans.warpV = 1.0;
  warpSpeed = 1.0;
  if(navTrans.kind==='menu'){
    if(!navTrans.swapped && p>=navTrans.swapAt){
      applyMenu(navTrans.toId);
      systemZ = 0;
      systemScale = 0.12;
      orbitApproach = 0;
      menuFade = 0;
      started = false;
      navTrans.swapped = true;
    }
    if(navTrans.swapped && p>=navTrans.revealAt){
      const k = ease((p-navTrans.revealAt)/(1.0-navTrans.revealAt));
      orbitApproach = k;
      systemZ = 0;
      systemScale = lerp(0.12, 1.0, k);
      menuFade = k;
      started = orbitApproach > 0.08;
      const s = k*k*(3.0-2.0*k);
      const nearFade = 1.0 - s;
      navTrans.warpA = 0.86 * nearFade;
      navTrans.warpV = (0.95*nearFade + 0.06*(1.0-nearFade));
      warpSpeed = navTrans.warpV;
    }
    if(p>=1){
      phase='done';
      ctrlOn=true;
      started=true;
      warpSpeed=0;
      menuFade=1;
      orbitApproach=1;
      systemZ=0;
      systemScale=1;
      camPos=[...navTrans.toPos];
      const yp=yawPitchToLook(camPos, navTrans.toT);
      camYaw=yp.yaw; camPitch=yp.pitch; camRoll=0;
      SECC_HUD.syncSoHud({activeNodeId, camPos});
      navTrans=null;
    }
  }
  if(navTrans && navTrans.kind==='href'){
    const out = clamp(p/0.35,0,1);
    menuFade = 1.0 - out;
    navTrans.warpA = 1.0;
    navTrans.warpV = lerp(0.25, 1.0, ease(out));
    warpSpeed = navTrans.warpV;
    if(p>=1){
      window.location.href = navTrans.url;
      return;
    }
  }
  if(navTrans && navTrans.kind==='pos'){
    const ra = navTrans.revealAt==null ? 0.74 : navTrans.revealAt;
    if(p>=ra){
      const k = ease((p-ra)/(1.0-ra));
      orbitApproach = k;
      systemZ = 0;
      systemScale = lerp(0.12, 1.0, k);
      menuFade = k;
      started = orbitApproach > 0.08;
      const s = k*k*(3.0-2.0*k);
      const nearFade = 1.0 - s;
      navTrans.warpA = 0.86 * nearFade;
      navTrans.warpV = (0.95*nearFade + 0.06*(1.0-nearFade));
      warpSpeed = navTrans.warpV;
    }
    if(p>=1){
      phase='done';
      ctrlOn=true;
      started=true;
      warpSpeed=0;
      menuFade=1;
      orbitApproach=1;
      systemZ=0;
      systemScale=1;
      camPos=[...navTrans.toPos];
      const yp=yawPitchToLook(camPos, navTrans.toT);
      camYaw=yp.yaw; camPitch=yp.pitch; camRoll=0;
      navTrans=null;
    }
  }
}
function frame(now){
  requestAnimationFrame(frame);
  const dt=clamp((now-lastTS)/1000,0,0.033); lastTS=now; simTime+=dt;
  const t=simTime;
  syncSceneViewport();
  applySceneViewport();
  updateAimCursor(dt);

  gl.clearColor(0.010,0.016,0.030,1);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);
  updateIntroAndApproachPhases(dt, t);
  updateNavTransitPhase(dt);
  if(pendingGlassAfterTravel && !navTrans && phase==='done' && ctrlOn && !SECC_GLASS.isOpen()){
    const p=pendingGlassAfterTravel;
    pendingGlassAfterTravel=null;
    if(p && p.url){
      SECC_GLASS.openPage(p.url, p.label || 'Pagina');
    }
  }

  if(phase==='done' && ctrlOn && !menuTrans && !navTrans){
    if(!arrivalEaseTick(dt)){
      camUpdate(dt);
    }
  } else if(phase==='done' && menuTrans){
    // Keep matrices stable during menu transitions.
    projM=persp(62*DEG,W()/H(),0.1,WORLD_FAR_CLIP);
    syncCamBasisFromAngles();
    viewM=viewFromCameraBasis(camPos,camFwd,camUp);
    vpM=mul(projM,viewM);
  } else {
    projM = persp(animFOV*DEG, W()/H(), 0.1, 400);
    viewM = lookat(animPos[0],animPos[1],animPos[2],
                   animTarget[0],animTarget[1],animTarget[2]);
    camPos = [...animPos];
    vpM = mul(projM, viewM);
  }
  updateCtrlHudVisibility(dt);
  const moveNow=Boolean(manualMoveInputActive || rightMoveActive || dragging);
  confidenceTick(dt, moveNow);
  const dockNow=resolveCurrentSoId();
  if(dockNow) confidenceMarkSo(dockNow);
  SECC_HUD.updateTravelPctOverlay({autoPilot, camPos, navTrans, thrustBoost, BOOST_HYPER_LEVEL, manualMoveActive:manualMoveInputActive});

  // Camera velocity (used for star "light-speed" effect while navigating)
  {
    const inv = 1/Math.max(1e-4,dt);
    const vx=(camPos[0]-prevCamPos[0])*inv;
    const vy=(camPos[1]-prevCamPos[1])*inv;
    const vz=(camPos[2]-prevCamPos[2])*inv;
    camVel=[vx,vy,vz];
    camSpd=Math.sqrt(vx*vx+vy*vy+vz*vz);
    camSpdSm += (camSpd-camSpdSm)*Math.min(1,dt*6);
    // Travel-aligned component: effects follow the actual movement/aim direction.
    const fwd=travelEffectDir();
    const fsp=Math.abs(vdot(camVel,fwd));
    camFwdSpdSm += (fsp-camFwdSpdSm)*Math.min(1,dt*6);
    prevCamPos=[...camPos];
  }
  tickExitSiteSequence();

  // Warp canvas tick:
  // keep travel effect alive through void/approach and fade only when orbit system is almost near.
  let warpAlphaTarget = 0;
  let warpVisualSpeed = warpSpeed;
  if(phase==='follow'){
    warpAlphaTarget = clamp(warpSpeed*4.5,0,0.9);
    warpVisualSpeed = clamp(warpSpeed*0.85,0.02,0.25);
  }else if(phase==='warp'){
    warpAlphaTarget = 1.0;
    warpVisualSpeed = warpSpeed;
  }else if(phase==='void'){
    // Keep the light-speed layer until the orbital system is basically "arrived".
    warpAlphaTarget = 0.86;
    warpVisualSpeed = 0.95;
  }else if(phase==='approach'){
    // systemZ: -260 (far) -> 0 (arrived). Fade only in the last ~2.2 units.
    const closeDist = 2.2;
    const tt = clamp((systemZ + closeDist)/closeDist,0,1);
    const s = tt*tt*(3.0-2.0*tt); // smoothstep
    const nearFade = 1.0 - s;
    warpAlphaTarget = 0.86 * nearFade;
    warpVisualSpeed = (0.95*nearFade + 0.06*(1.0-nearFade));
  }else if(phase==='nav' && navTrans){
    warpAlphaTarget = navTrans.warpA;
    warpVisualSpeed = navTrans.warpV;
  }

  // In free navigation: when moving fast, add a subtle "light-speed" streak overlay.
  if(phase==='done' && ctrlOn && !menuTrans && !navTrans){
    const superBoost = clamp(thrustBoost-1.0, 0, 1);
    const s0 = smoothstep(10, 92 - superBoost*24, camSpdSm);
    const f0 = camSpdSm>0.01 ? clamp(camFwdSpdSm/(camSpdSm+1e-3),0,1) : 0;
    const s = clamp(s0 * (0.35 + 0.65*f0) * (1.0 + superBoost*0.55), 0, 1);
    const a = (0.42 + superBoost*0.34) * s;
    const v = 0.10 + (0.90 + superBoost*0.35)*s;
    warpAlphaTarget = Math.max(warpAlphaTarget, a);
    warpVisualSpeed = Math.max(warpVisualSpeed, v);
  }
  // Place the title flash strictly between the two "travel videos":
  // warp overlay (warpCv) -> title -> WebGL particles (drawParts).
  if(!midTitleShown && phase==='approach' && warpAlphaTarget < 0.12 && warpCanvasAlpha < 0.18){
    midTitleShown=true;
    midTitleActive=true;
    midTitleT=0;
    // Ensure the warp layer is gone while the title shows.
    warpAlphaTarget = 0.0;
    warpVisualSpeed = 0.0;
  }
  if(midTitleActive){
    warpAlphaTarget = 0.0;
    warpVisualSpeed = 0.0;
  }
  tickWarp(dt, clamp(warpAlphaTarget,0,1), clamp(warpVisualSpeed,0,1));
  midTitleTick(dt);
  if(menuTrans) menuTransitionTick(dt);
  mapTick(dt,t);

  // Physics
  if(started){
    if(ctrlOn) systemNavUpdate(dt);
    physTick(dt);
  }

  updateProximityDockingAndContext(dt);
  tipCalibrationGuideTick(dt);
  updateHoverObjectTip();

  // Apparent-infinite universe: orbital system fades with distance.
  const cc = sysCenterW();
  const dcx = camPos[0]-cc[0], dcy = camPos[1]-cc[1], dcz = camPos[2]-cc[2];
  const distCenter = Math.sqrt(dcx*dcx + dcy*dcy + dcz*dcz);
  systemFade = clamp(
    1.0 - (distCenter-SYSTEM_FADE_START_WU)/Math.max(1e-4, SYSTEM_FADE_END_WU-SYSTEM_FADE_START_WU),
    0.0,
    1.0
  );
  if(phase==='warp' || phase==='approach' || phase==='nav') systemFade = Math.max(systemFade, clamp(orbitApproach,0.0,1.0));

  // â”€â”€â”€ DRAW SCENE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // During warp approach, orbit system scales from tiny to full size
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  // Stars are the universe backdrop. Hide them only during intro/nav travel overlays to avoid "double video".
  const travelOverlay = ((phase!=='done' || (phase==='nav' && navTrans)) && warpCanvasAlpha>0.04) || midTitleActive;
  drawBackgroundSpace(dt, t, travelOverlay);
  drawOrbitDust();
  const originDist=Math.sqrt(camPos[0]*camPos[0] + camPos[1]*camPos[1] + camPos[2]*camPos[2]);
  // The farther from world origin (0,0,0), the rarer the local space dust appears.
  const distRarity = 1.0 - smoothstep(800, 7000, originDist);
  const dustAlphaBaseScale = clamp(0.14 + 0.84*(1 - Math.min(1, warpCanvasAlpha)), 0.14, 0.92);
  const dustAlphaScale = clamp(dustAlphaBaseScale * lerp(0.05, 1.0, distRarity), 0.01, 0.92);
  drawSwarmDust(dt,t,dustAlphaScale);
  // Avoid "double travel video": while warp overlay is visible, hide the WebGL star particles.
  if(warpCanvasAlpha < 0.04 && !midTitleActive){
    drawParts(t);
  }

  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  if(started || orbitApproach>0.02){
    if(!travelOverlay) drawCardCarousel(t);
    const sysM = mul(tmat(activeNodeP[0],activeNodeP[1],activeNodeP[2]+systemZ), mul(rY(sysYaw), mul(rX(sysPitch), smat(systemScale))));
    mSt.forEach((s,i)=>{
      const rg=RINGS[s.ri];
      const rr=(Number.isFinite(s.orbitR)?s.orbitR:rg.r)+s.rad;
      const bx=Math.cos(s.th)*rr, bz=Math.sin(s.th)*rr;
      const rp=xfm3(s.orbitRot||RING_ROT[s.ri],bx,BASE_Y,bz);
      let model=tmat(rp[0],rp[1],rp[2]);
      model=mul(model,s.orbitRot||RING_ROT[s.ri]);
      model=mul(model,rY(s.ry));
      model=mul(model,rX(s.rx));
      model=mul(model,rZ(s.tz));
      model=mul(sysM,model);
      drawMarble(model,s.ri,marbleTex[i],false);
    });

  }

  // Ball (shown during idle/drop/follow/warp)
  if(ibShow && phase!=='arrive' && phase!=='done'){
    let ibM = tmat(ibPos[0],ibPos[1],ibPos[2]);
    ibM = mul(ibM, rY(ibRY));
    ibM = mul(ibM, rX(ibRX));
    drawMarble(ibM,0,introTex,phase==='idle'||phase==='drop');
  }

  if(TAGS_ENABLED && started) tagsTick();
  if(document.body.classList.contains('live')) SECC_HUD.ribbonTick({camYaw, camPitch, camPos, phase, ctrlOn, animPos, animTarget});
  if(started) SECC_HUD.compassTick({viewM});
  if(started){
    const sorOrigin=(attachedCoordKey && Array.isArray(attachedCoordPos) && attachedCoordPos.length===3)
      ? attachedCoordPos
      : null;
    const _cc=SECC_HUD.coordTick({phase,camPos,activeNodeId,sorOrigin});
    if(_cc) coordLast=_cc;
  }
}

// â”€â”€â”€ COMPASS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const compassCv  = document.getElementById('compassCv');
const compassCtx = compassCv.getContext('2d');
const CCW=72, CCH=72, CCX=36, CCY=36, CCR=26;
const hudMovePanelEl = document.getElementById('hudMove');
const hudCameraPanelEl = document.getElementById('hudCamera');

const ribbonCv = document.getElementById('ribbonCv');
const ribbonCtx = ribbonCv ? ribbonCv.getContext('2d') : null;

// SECC_HUD.syncHudPanelLayout() is called below, after SECC_HUD.init().
window.addEventListener('resize', ()=>window.requestAnimationFrame(SECC_HUD.syncHudPanelLayout.bind(SECC_HUD)), {passive:true});
window.addEventListener('load', ()=>window.requestAnimationFrame(SECC_HUD.syncHudPanelLayout.bind(SECC_HUD)), {passive:true});
if(document.fonts && document.fonts.ready){
  document.fonts.ready.then(()=>window.requestAnimationFrame(SECC_HUD.syncHudPanelLayout.bind(SECC_HUD)));
}
window.setTimeout(()=>SECC_HUD.syncHudPanelLayout(), 350);

const coordDistEl=document.getElementById('coordDist');
const coordAzEl=document.getElementById('coordAz');
const coordBrgEl=document.getElementById('coordBrg');
const sorDistEl=document.getElementById('sorDist');
const sorAzEl=document.getElementById('sorAz');
const sorBrgEl=document.getElementById('sorBrg');
const commTargetEl=document.getElementById('commTarget');
const commUnreadEl=document.getElementById('commUnread');
const hudModeNavsEl=document.getElementById('hudModeNavs');
const hudModeCommsEl=document.getElementById('hudModeComms');
const hudModeCommsBadgeEl=document.getElementById('hudModeCommsBadge');
const commModeNavsEl=document.getElementById('commModeNavs');
const commModeCommsEl=document.getElementById('commModeComms');
const commModeCommsBadgeEl=document.getElementById('commModeCommsBadge');
const coordCellEl=document.getElementById('coordCell');
const coordEditEl=document.getElementById('coordEdit');
const coordEditDistEl=document.getElementById('coordEditDist');
const coordEditAzEl=document.getElementById('coordEditAz');
const coordEditRilEl=document.getElementById('coordEditRil');
const coordEditGoEl=document.getElementById('coordEditGo');
const coordEditCancelEl=document.getElementById('coordEditCancel');
const coordEditCloseEl=document.getElementById('coordEditClose');
const helpMenuBtnEl=document.getElementById('helpMenuBtn');

SECC_HUD.init({
  ribbonCtx, ribbonCv, compassCtx,
  CCW, CCH, CCX, CCY, CCR,
  hudMovePanelEl, hudCameraPanelEl,
  travelPctEl, travelBoostEl, travelPctNumEl, travelPctLblEl,
  travelBoostFillEl, travelBoostLblEl,
  soSelectEl, soCurrentEl,
  hudModeNavsEl, hudModeCommsEl, commModeNavsEl, commModeCommsEl,
  hudModeCommsBadgeEl, commModeCommsBadgeEl,
  commTargetEl, commUnreadEl,
  coordDistEl, coordAzEl, coordBrgEl,
  sorDistEl, sorAzEl, sorBrgEl,
});
// Initial layout sync — must run after SECC_HUD.init() so refs are set.
SECC_HUD.syncHudPanelLayout();

let coordEditOpen=false;
// Inizializza pannello GLASS/COMMS e guide onboarding
SECC_GLASS.init();
setupGlassCustomLinkHandler();
SECC_GUIDE.init({
  getCoordEditOpen: ()=>coordEditOpen,
  getGlassOpen:     ()=>SECC_GLASS.isOpen(),
  getPhase:         ()=>phase,
  getMenuTrans:     ()=>menuTrans,
  getNavTrans:      ()=>navTrans,
  getAutoPilot:     ()=>autoPilot,
  getMenuId:        ()=>menuId,
  getActiveNodeId:  ()=>activeNodeId,
  resolveCurrentSoId,
  clearKeys:        ()=>{ for(const k in keys) keys[k]=false; },
  showHudKeyTip,
  hideHudKeyTip,
  hudKeyTips:       HUD_KEY_TIPS,
  soLabels:         SO_LABELS,
  startNavTravel,
  setNavigationMode,
  getNavigationMode: ()=>navigationMode,
  getUserConfidenceSummary,
  hudModeNavsEl,
  openCoordEdit,
  closeCoordEdit
});
function openNavigationModeTip(){
  if(!(window.SECC_GUIDE && typeof window.SECC_GUIDE.open==='function')) return;
  const cur=NAV_MODE_LABELS[navigationMode] || navigationMode;
  window.SECC_GUIDE.open(true, [{
    title:'Modalita navigazione',
    body:'Scegli come vuoi usare il sito adesso.',
    bullets:[
      'Full Explorer: viaggio completo nello spazio con tutte le animazioni.',
      'Half Explorer: teletrasporto con fade rapido e morbido, senza viaggio.',
      'Normale: apertura diretta delle pagine glass, senza visuale spazio.',
      'Il badge vicino al titolo mostra sempre la modalita attiva.'
    ],
    note:`Modalita attuale: ${cur}`,
    allowDismiss:false,
    modeOptions:[
      { id:NAV_MODE_FULL, label:'FULL EXPLORER' },
      { id:NAV_MODE_HALF, label:'HALF EXPLORER' },
      { id:NAV_MODE_NORMAL, label:'NORMALE' }
    ],
    focus:['#brandTitle']
  }]);
}
brandTitleEl?.addEventListener('click', openNavigationModeTip);
brandTitleEl?.addEventListener('pointerdown', (e)=>{ e.stopPropagation(); });
helpMenuBtnEl?.addEventListener('click', ()=>{
  if(window.SECC_GUIDE && typeof window.SECC_GUIDE.openTopicMenu==='function'){
    window.SECC_GUIDE.openTopicMenu();
    return;
  }
  if(window.SECC_GUIDE && typeof window.SECC_GUIDE.openTopic==='function'){
    window.SECC_GUIDE.openTopic('all');
  }
});
hudModeNavsEl?.addEventListener('click', ()=>markCommandLearned('navs'));
commModeNavsEl?.addEventListener('click', ()=>markCommandLearned('navs'));
hudModeCommsEl?.addEventListener('click', ()=>markCommandLearned('comms'));
commModeCommsEl?.addEventListener('click', ()=>markCommandLearned('comms'));
let coordLast=null; // {dist, azElev, rilDeg}

function calcCoordToSOH(){
  // DARH absolute coordinates of the current camera position in SOH reference frame.
  const dx=camPos[0]-SOH[0], dy=camPos[1]-SOH[1], dz=camPos[2]-SOH[2]; // SOH -> CAM
  const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);
  const horiz=Math.sqrt(dx*dx+dz*dz);
  const azElev = Math.atan2(dy, horiz||1e-9)/DEG; // [-90,+90], +up
  const rilDeg = ((Math.round(azDegFromXZ(dx,dz))%360)+360)%360; // absolute bearing in SOH frame
  return{dist, azElev, rilDeg};
}
function calcCoordRelativeToPoint(origin){
  if(!origin || !Number.isFinite(origin[0]) || !Number.isFinite(origin[1]) || !Number.isFinite(origin[2])) return null;
  const dx=camPos[0]-origin[0], dy=camPos[1]-origin[1], dz=camPos[2]-origin[2];
  const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);
  const horiz=Math.sqrt(dx*dx+dz*dz);
  const azElev = Math.atan2(dy, horiz||1e-9)/DEG;
  const rilDeg = ((Math.round(azDegFromXZ(dx,dz))%360)+360)%360;
  return {dist, azElev, rilDeg};
}
function calcCoordToDockedSO(){
  const id=resolveCurrentSoId();
  if(!id || !MENU_DEFS[id] || !NAV_NODES[id]) return null;
  return calcCoordRelativeToPoint(nodeCenter(id));
}


function openCoordEdit(){
  if(!coordEditEl || !coordEditDistEl || !coordEditAzEl || !coordEditRilEl) return;
  if(phase!=='done') return;
  markCommandLearned('coord');
  const c = coordLast || calcCoordToSOH();
  coordEditDistEl.value = SECC_HUD.fmtDistLabel(c.dist);
  coordEditAzEl.value   = c.azElev.toFixed(1);
  const rr = Number.isFinite(c.rilDeg) ? c.rilDeg : c.relDeg;
  coordEditRilEl.value  = String(((rr%360)+360)%360);
  coordEditEl.classList.add('on');
  coordEditEl.setAttribute('aria-hidden','false');
  coordEditOpen=true;
  // Avoid the flight controls "sticking" while typing in the inputs.
  if(typeof keys==='object'){
    for(const k in keys) keys[k]=false;
  }
  coordEditDistEl.focus();
  coordEditDistEl.select();
}
function closeCoordEdit(){
  if(!coordEditEl) return;
  coordEditEl.classList.remove('on');
  coordEditEl.setAttribute('aria-hidden','true');
  coordEditOpen=false;
}
function applyCoordEdit(){
  if(phase!=='done') return;
  const distWU = SECC_HUD.parseDistToWorldUnits(String(coordEditDistEl?.value||''));
  const azDeg  = parseFloat(String(coordEditAzEl?.value||''));
  const rilDeg = parseFloat(String(coordEditRilEl?.value||''));
  if(!Number.isFinite(distWU) || !Number.isFinite(azDeg) || !Number.isFinite(rilDeg)) return;
  const distWU2 = Math.max(0.8, distWU);
  const elevR = clamp(azDeg, -89.9, 89.9) * DEG;
  const horiz = Math.cos(elevR) * distWU2;
  const dyUp  = Math.sin(elevR) * distWU2; // positive az = above SOH plane

  // DARH manual input is absolute in SOH frame (same format shown in SO labels).
  // Autopilot then computes relative route (direction, azimuth, distance) from current pose.
  const rilN = ((rilDeg%360)+360)%360;
  const brgR = rilN * DEG;
  const dx   = Math.sin(brgR) * horiz;
  const dz   = Math.cos(brgR) * horiz;

  const targetPos=[SOH[0]+dx, SOH[1]+dyUp, SOH[2]+dz];
  markCommandLearned('coord-ap');
  confidenceBump('coordTravels', 1);
  closeCoordEdit();
  if(isNormalMode()){
    SECC_GLASS.openPage('pages/algoritmi/','Navigazione Normale');
    return;
  }
  coordNavDockArm=true;
  if(isHalfExplorerMode()){
    startNavTravelToPos(targetPos, targetPos);
    return;
  }
  // Real autopilot transfer (same flight model as menu SO travel).
  startNavTravelToPos(targetPos, targetPos);
}

// Manual coordinate input: click the coord cell to set Dist/Az/Ril.
coordCellEl?.addEventListener('pointerdown',(e)=>{
  e.preventDefault();
  e.stopPropagation();
  if(SECC_GLASS.isOpen()) return;
  if(coordEditOpen) return;
  openCoordEdit();
});
coordEditEl?.addEventListener('pointerdown',(e)=>{ e.stopPropagation(); });
coordEditGoEl?.addEventListener('click',applyCoordEdit);
coordEditCancelEl?.addEventListener('click',closeCoordEdit);
coordEditCloseEl?.addEventListener('click',closeCoordEdit);

requestAnimationFrame(frame);

// â”€â”€â”€ START LOGIC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.body.classList.add('live');
SECC_GUIDE.bumpVisitCount();
// Ensure final "menu-ready" state.
warpSpeed=0;
orbitApproach=1;
systemZ=0;
systemScale=1.0;
ibShow=false;
SECC_HUD.syncSoHud({activeNodeId, camPos});
SECC_GUIDE.scheduleOpen();

})();
