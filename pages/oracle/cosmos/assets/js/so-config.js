// assets/js/so-config.js - SECC scene configuration + navigation helpers.
// Extracted from index.html. Exposes window.SECC_CONFIG.
window.SECC_CONFIG = (function () {
  "use strict";
  const PI = Math.PI, TAU = PI * 2, DEG = PI / 180;

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ SCENE CONFIG Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function syncReadJson(path){
  try{
    const xhr=new XMLHttpRequest();
    xhr.open('GET',path,false);
    xhr.send(null);
    if(!((xhr.status>=200 && xhr.status<300) || xhr.status===0)) return null;
    return JSON.parse(xhr.responseText||'null');
  }catch(_e){
    return null;
  }
}
function toPagePath(value){
  const s=String(value||'').trim().replace(/\\/g,'/');
  if(!s) return '';
  return s.replace(/^\/+/, '');
}
function classifyAlgoSoId(card){
  const g=String(card?.macroGroup||'').toLowerCase();
  if(g.includes('neur')) return 'alg_neurali';
  if(g.includes('ibrid')) return 'alg_ibridi';
  return 'alg_statistici';
}
function isVisibleAlgoCard(card){
  if(!card || typeof card!=='object') return false;
  if(card.view===false || card.isActive===false) return false;
  const page=toPagePath(card.page||card.cardBase||'').toLowerCase();
  return page.includes('pages/algoritmi/algs/');
}
const GROUP_META=Object.freeze({
  alg_statistici:{
    label:'SO Statistici',
    spotlight:'pages/algoritmi/spotlight/statistici/',
    col:[0.35,0.62,1.0]
  },
  alg_ibridi:{
    label:'SO Ibridi',
    spotlight:'pages/algoritmi/spotlight/ibridi/',
    col:[1.0,0.70,0.26]
  },
  alg_neurali:{
    label:'SO Neurali',
    spotlight:'pages/algoritmi/spotlight/neurali/',
    col:[0.24,0.90,0.70]
  }
});
function buildGroupDef(soId,cards){
  const meta=GROUP_META[soId];
  const list=(Array.isArray(cards)?cards:[])
    .filter(isVisibleAlgoCard)
    .sort((a,b)=>String(a.title||a.id||'').localeCompare(String(b.title||b.id||'')));
  const marbles=list.map((card,idx)=>({
    n:idx+1,
    ring:idx%2,
    name:String(card.title||card.id||`Algoritmo ${idx+1}`),
    href:toPagePath(card.page||card.cardBase||''),
    cardBase:toPagePath(card.cardBase||card.page||'')
  }));
  if(!marbles.length){
    marbles.push({
      n:1,
      ring:0,
      name:'Catalogo Algoritmi',
      href:'pages/algoritmi/',
      cardBase:'pages/algoritmi/'
    });
  }
  const ring0=Math.max(1, Math.ceil(marbles.length/2));
  const ring1=Math.max(1, marbles.length-ring0);
  const primaryBase=toPagePath(list[0]?.cardBase || list[0]?.page || '');
  return {
    label:meta.label,
    rings:[
      {r:5.0, torus:0.012, col:meta.col, name:'Algoritmi', tiltX:0.02, tiltZ:-0.02},
      {r:7.1, torus:0.010, col:meta.col, name:'Sestine', tiltX:-0.02, tiltZ:0.03},
    ],
    ringSlots:[ring0, ring1],
    marbles,
    centerCard:{
      title:meta.label,
      subtitle:'Selezione algoritmi',
      href:meta.spotlight,
      cardBase:meta.spotlight,
      proposalBase:primaryBase
    },
    back:'root'
  };
}
function buildFallbackMenuDefs(){
  const fallbackCards={
    alg_statistici:[
      { title:'Classic Frequency', page:'pages/algoritmi/algs/classic-frequency/', cardBase:'pages/algoritmi/algs/classic-frequency/' }
    ],
    alg_ibridi:[
      { title:'ARC90', page:'pages/algoritmi/algs/arc90-logico-algoritmica/', cardBase:'pages/algoritmi/algs/arc90-logico-algoritmica/' }
    ],
    alg_neurali:[
      { title:'Super6NN', page:'pages/algoritmi/algs/super6NN/', cardBase:'pages/algoritmi/algs/super6NN/' }
    ]
  };
  return buildAlgorithmMenuDefsFromCards([
    ...fallbackCards.alg_statistici.map((c)=>({ ...c, macroGroup:'statistica' })),
    ...fallbackCards.alg_ibridi.map((c)=>({ ...c, macroGroup:'ibrido' })),
    ...fallbackCards.alg_neurali.map((c)=>({ ...c, macroGroup:'neurale' })),
  ]);
}
function buildAlgorithmMenuDefsFromCards(rawCards){
  const cards=(Array.isArray(rawCards)?rawCards:[]).filter(isVisibleAlgoCard);
  const grouped={
    alg_statistici:[],
    alg_ibridi:[],
    alg_neurali:[]
  };
  cards.forEach((card)=>{
    const soId=classifyAlgoSoId(card);
    if(grouped[soId]) grouped[soId].push(card);
  });
  const defs={
    root:{
      label:'Oracle Experience',
      rings:[
        {r:4.9, torus:0.012, col:[0.35,0.62,1.0], name:'Tipologie', tiltX:-0.04, tiltZ:0.03},
      ],
      ringSlots:[3],
      marbles:[
        {
          n:1,
          ring:0,
          name:GROUP_META.alg_statistici.label,
          goto:'alg_statistici',
          cardBase:GROUP_META.alg_statistici.spotlight,
          proposalBase:toPagePath(grouped.alg_statistici[0]?.cardBase || grouped.alg_statistici[0]?.page || '')
        },
        {
          n:2,
          ring:0,
          name:GROUP_META.alg_ibridi.label,
          goto:'alg_ibridi',
          cardBase:GROUP_META.alg_ibridi.spotlight,
          proposalBase:toPagePath(grouped.alg_ibridi[0]?.cardBase || grouped.alg_ibridi[0]?.page || '')
        },
        {
          n:3,
          ring:0,
          name:GROUP_META.alg_neurali.label,
          goto:'alg_neurali',
          cardBase:GROUP_META.alg_neurali.spotlight,
          proposalBase:toPagePath(grouped.alg_neurali[0]?.cardBase || grouped.alg_neurali[0]?.page || '')
        }
      ],
      centerCard:{
        title:'Oracle Experience',
        subtitle:'Hub centrale tipologie algoritmi',
        href:'pages/oracle/',
        cardBase:'pages/algoritmi/spotlight/statistici/'
      }
    },
    alg_statistici:buildGroupDef('alg_statistici', grouped.alg_statistici),
    alg_ibridi:buildGroupDef('alg_ibridi', grouped.alg_ibridi),
    alg_neurali:buildGroupDef('alg_neurali', grouped.alg_neurali)
  };
  return defs;
}
function buildAlgorithmMenuDefs(){
  const cards=syncReadJson('data/cards-index.json');
  if(!Array.isArray(cards) || !cards.length) return buildFallbackMenuDefs();
  return buildAlgorithmMenuDefsFromCards(cards);
}
const MENU_DEFS=buildAlgorithmMenuDefs();

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ UNIVERSE COORDINATES / NAV NODES Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// SOH = "System Orbital Home" center. All menu systems live in the same world space.
// Systems are lazy-loaded (their geometry/textures are built only when activated),
// but their coordinates are known to the navigator.
const SOH_ID='root';
const SOH_Y=0.2;
const MIN_SO_SEPARATION_UA=100;
const MIN_SO_SEPARATION_WU=MIN_SO_SEPARATION_UA*10;

function hash01(str){
  // Deterministic [0,1) hash for layout.
  let h=2166136261>>>0;
  for(let i=0;i<str.length;i++){
    h^=str.charCodeAt(i);
    h = Math.imul(h, 16777619)>>>0;
  }
  return (h>>>0) / 4294967296;
}

// SOH coordinate helpers:
// brg (bearing, horizontal): 0deg = +Z, 90deg = +X, 180deg = -Z, 270deg = -X.
// az (azimut, elevation as requested): 0deg = SOH plane (XZ), +90deg = +Y.
function azDegFromXZ(dx,dz){
  let a=Math.atan2(dx,dz)/DEG; // dx first so 0=+Z
  a%=360; if(a<0) a+=360;
  return a;
}
function coordToNodePos(c){
  if(!c || typeof c!=='object') return null;
  const rad = Boolean(c.rad);
  // Horizontal bearing around SOH plane:
  // - Preferred key: brg (bearing) or bearing/theta
  // - Also accepted: ril/rilevamento (0..359)
  // - Legacy: az/azimuth is treated as horizontal bearing when an explicit bearing is absent
  let brg = NaN;
  const hasExplicitBearing = (c.brg!=null || c.bearing!=null || c.theta!=null || c.ril!=null || c.rilevamento!=null);
  if(c.brg!=null) brg=+c.brg;
  else if(c.bearing!=null) brg=+c.bearing;
  else if(c.theta!=null) brg=+c.theta;
  else if(c.ril!=null) brg=+c.ril;
  else if(c.rilevamento!=null) brg=+c.rilevamento;
  else if(c.az!=null) brg=+c.az;
  else if(c.azimuth!=null) brg=+c.azimuth;
  if(!Number.isFinite(brg)) return null;

  // Elevation angle relative to SOH plane:
  // - Preferred key: az (as requested) or azimut
  // - Legacy: el/elev/elevation
  let elev = NaN;
  if(hasExplicitBearing && c.az!=null) elev=+c.az; // disambiguate: az is elevation only when bearing is explicit
  else if(c.azimut!=null) elev=+c.azimut;
  else if(c.el!=null) elev=+c.el;
  else if(c.elev!=null) elev=+c.elev;
  else if(c.elevation!=null) elev=+c.elevation;

  const y  = (c.y!=null ? +c.y : (c.alt!=null ? +c.alt : NaN));
  const dist = (c.dist!=null ? +c.dist : (c.d!=null ? +c.d : NaN));
  const r = (c.r!=null ? +c.r : (c.radius!=null ? +c.radius : NaN));

  const brgR = rad ? brg : brg*DEG;
  if(Number.isFinite(r) && Number.isFinite(elev)){
    const elR = rad ? elev : elev*DEG;
    const ce=Math.cos(elR);
    return [Math.sin(brgR)*r*ce, Math.sin(elR)*r, Math.cos(brgR)*r*ce];
  }
  if(Number.isFinite(dist) && Number.isFinite(y)){
    return [Math.sin(brgR)*dist, y, Math.cos(brgR)*dist];
  }
  if(Number.isFinite(dist)){
    return [Math.sin(brgR)*dist, 0, Math.cos(brgR)*dist];
  }
  return null;
}
function nodePosToCoord(pos){
  if(!pos) return null;
  const x=+pos[0]||0, y=+pos[1]||0, z=+pos[2]||0;
  const dist=Math.sqrt(x*x+z*z);
  const r=Math.sqrt(x*x+y*y+z*z);
  const az = Math.atan2(y, dist||1e-9)/DEG; // elevation relative to SOH plane
  const ril = azDegFromXZ(x,z);
  return{
    brg: ril,
    bearing: ril,
    ril,
    az,
    dist,
    y,
    r,
  };
}

function buildNavNodes(){
  const ids=Object.keys(MENU_DEFS);
  const depth=new Map();
  depth.set(SOH_ID,0);
  // Depth via back-links (root = 0, child menus = 1, etc.)
  ids.forEach((id)=>{
    if(id===SOH_ID) return;
    let d=0, cur=id;
    const seen=new Set();
    while(cur && cur!==SOH_ID && MENU_DEFS[cur] && MENU_DEFS[cur].back && !seen.has(cur)){
      seen.add(cur);
      cur = MENU_DEFS[cur].back;
      d++;
      if(d>8) break;
    }
    depth.set(id, Math.max(1,d||1));
  });

  const nodes={};
  nodes[SOH_ID]={ id:SOH_ID, pos:[0,0,0], depth:0 };

  ids.forEach((id)=>{
    if(id===SOH_ID) return;
    const d=depth.get(id)||1;
    const manual = MENU_DEFS[id] && MENU_DEFS[id].pos;
    if(Array.isArray(manual) && manual.length===3){
      nodes[id]={ id, depth:d, pos:[+manual[0]||0, +manual[1]||0, +manual[2]||0] };
      return;
    }
    const coord = MENU_DEFS[id] && (MENU_DEFS[id].coord || MENU_DEFS[id].coords || MENU_DEFS[id].soh);
    const fromCoord = coordToNodePos(coord);
    if(fromCoord){
      nodes[id]={ id, depth:d, pos:fromCoord };
      return;
    }
    const hA=hash01(id+'#a');
    const hR=hash01(id+'#r');
    const hY=hash01(id+'#y');
    const ang = hA*TAU;
    // Real distances: each menu node gets its own radius (not all "0" / not only depth-based).
    // Depth pushes systems outward, hash spreads them across distinct distances at the same depth.
    const base = 240 + 420*d;      // keeps every non-root system away from origin
    const spread = 980;            // extra range so menus sit at noticeably different distances
    const rad = base + spread*hR;  // deterministic per-menu distance
    const y   = (hY-0.5)*140 + d*36;
    nodes[id]={ id, depth:d, pos:[Math.cos(ang)*rad, y, Math.sin(ang)*rad] };
  });

  enforceMinSoSeparation(nodes, MIN_SO_SEPARATION_WU);
  return nodes;
}

function enforceMinSoSeparation(nodes, minDistWU){
  if(!nodes || typeof nodes!=='object') return;
  const ids=Object.keys(nodes).filter((id)=>nodes[id] && Array.isArray(nodes[id].pos) && nodes[id].pos.length===3);
  const minD=Math.max(1, Number(minDistWU)||0);
  if(ids.length<2 || minD<=0) return;
  const EPS=1e-6;
  const ITER=24;
  for(let it=0; it<ITER; it++){
    let moved=false;
    for(let i=0;i<ids.length;i++){
      for(let j=i+1;j<ids.length;j++){
        const a=nodes[ids[i]];
        const b=nodes[ids[j]];
        if(!a || !b) continue;
        const pa=a.pos, pb=b.pos;
        let dx=pb[0]-pa[0], dy=pb[1]-pa[1], dz=pb[2]-pa[2];
        let d=Math.sqrt(dx*dx+dy*dy+dz*dz);
        if(d>=minD) continue;
        if(d<EPS){
          const h=hash01(ids[i]+'|'+ids[j]);
          const ang=h*TAU;
          dx=Math.cos(ang); dy=(hash01(ids[j]+'|'+ids[i])-0.5)*0.35; dz=Math.sin(ang);
          d=Math.sqrt(dx*dx+dy*dy+dz*dz) || 1;
        }
        const nx=dx/d, ny=dy/d, nz=dz/d;
        const overlap=minD-d;
        const aRoot=(a.id===SOH_ID), bRoot=(b.id===SOH_ID);
        let sa=0.5, sb=0.5;
        if(aRoot && !bRoot){ sa=0; sb=1; }
        else if(!aRoot && bRoot){ sa=1; sb=0; }
        else if(aRoot && bRoot){ sa=0; sb=0; }
        pa[0]-=nx*overlap*sa; pa[1]-=ny*overlap*sa; pa[2]-=nz*overlap*sa;
        pb[0]+=nx*overlap*sb; pb[1]+=ny*overlap*sb; pb[2]+=nz*overlap*sb;
        moved=true;
      }
    }
    if(!moved) break;
  }
}

// Ensure all menu systems have explicit SOH coordinates (brg/az/r) so the universe is fully navigable in 3D.
// If a menu already defines pos[] or coord, we keep it.
function seedMenuCoordsFromLayout(){
  const ids=Object.keys(MENU_DEFS).filter(id=>id!==SOH_ID);
  let posDb=(window.SECC_OBJECT_ARCHIVE && typeof window.SECC_OBJECT_ARCHIVE==='object' && window.SECC_OBJECT_ARCHIVE.soCoords && typeof window.SECC_OBJECT_ARCHIVE.soCoords==='object')
    ? window.SECC_OBJECT_ARCHIVE.soCoords
    : null;
  if(!posDb){
    try{
      // Synchronous load at bootstrap so NAV_NODES can be built immediately after.
      const xhr=new XMLHttpRequest();
      xhr.open('GET','pages/oracle/cosmos/data/so-coords.json',false);
      xhr.send(null);
      // status 0 can happen on file:// loads in local environments.
      if(((xhr.status>=200 && xhr.status<300) || xhr.status===0) && xhr.responseText){
        posDb=JSON.parse(xhr.responseText);
      }
    }catch(_e){ posDb=null; }
  }
  if(!posDb || typeof posDb!=='object'){
    throw new Error('Missing/invalid SO coordinate archive (SECC_OBJECT_ARCHIVE.soCoords or data/so-coords.json).');
  }

  ids.sort().forEach((id)=>{
    const def=MENU_DEFS[id];
    if(!def) return;
    const j=posDb && posDb[id];
    if(!(j && Number.isFinite(+j.ril) && Number.isFinite(+j.azimut) && (Number.isFinite(+j.r_ly)||Number.isFinite(+j.r)))){
      throw new Error('Invalid or missing SO coordinate entry for: '+id);
    }
    const ly=Number.isFinite(+j.r_ly) ? +j.r_ly : (+j.r)/(9.461*10);
    def.soh={ ril:+j.ril, azimut:+j.azimut, r:ly*9.461*10 };
    // Force navigation to use SO map coordinates only.
    delete def.pos;
    delete def.coord;
    delete def.coords;
  });

  // SOHome remains fixed at origin.
  if(MENU_DEFS[SOH_ID]){
    delete MENU_DEFS[SOH_ID].soh;
    delete MENU_DEFS[SOH_ID].coord;
    delete MENU_DEFS[SOH_ID].coords;
    delete MENU_DEFS[SOH_ID].pos;
  }
}
seedMenuCoordsFromLayout();

const NAV_NODES = buildNavNodes();
function nodePos(id){ return (NAV_NODES[id] && NAV_NODES[id].pos) ? NAV_NODES[id].pos : NAV_NODES[SOH_ID].pos; }
function nodeCenter(id){
  const p=nodePos(id);
  return [p[0], p[1]+SOH_Y, p[2]];
}
const SOH = nodeCenter(SOH_ID);
// Debugging / navigator surface.
window.SECC_NAV = { SOH_ID, SOH_Y, SOH, NAV_NODES, nodePos, nodeCenter, coordToNodePos, nodePosToCoord, azDegFromXZ };


  // Public API consumed by the main engine IIFE.
  return {
    MENU_DEFS,
    SOH_ID,
    SOH_Y,
    NAV_NODES,
    SOH,
    nodePos,
    nodeCenter,
    coordToNodePos,
    nodePosToCoord,
    azDegFromXZ,
    hash01,
  };
})();

