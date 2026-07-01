// v8-main.js - Shell grafica v8
// Dipende da: v8-data-bridge.js, core/cache-engine.js, core/data-repository.js, cards-index.js

// ─── CURSOR
const cur=document.getElementById('cur'),curR=document.getElementById('cur-r');
let mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cur.style.left=mx+'px';cur.style.top=my+'px';});
(function a(){rx+=(mx-rx)*.11;ry+=(my-ry)*.11;curR.style.left=rx+'px';curR.style.top=ry+'px';requestAnimationFrame(a);})();

// ─── CANVAS SETUP
const canvas=document.getElementById('c');
const ctx=canvas.getContext('2d');
let W,H,frame=0,alive=false;
function resize(){W=canvas.width=canvas.clientWidth||innerWidth;H=canvas.height=canvas.clientHeight||innerHeight;}
resize();

// ─── STATO DATI (popolato da v8WaitAndInit dopo il caricamento)
let LAST=[],HOT=[],COLD=[],JOLLY=null,ALGOS=[],DRAW_ID='--',DRAW_DATE='--',DRAWS_COUNT=0;
let _iargosStatus=null;
let _sestine=[];
let NUM_STATS={};          // statistiche per numero, popolate dopo caricamento draws
let _hovPrev=null;         // cella in hover al frame precedente
let _hovStart=0;           // timestamp inizio hover corrente
let _richOn=false;         // tooltip ricco visibile

// ─── CELLS
const cells=[];
function buildCells(){
  cells.length=0;
  const cols=10,rows=9;
  const margin=Math.min(W,H)*.1;
  const cw=(W-margin*2)/cols;
  const ch=(H-margin*2-94)/rows;
  const offX=margin+cw*.5;
  const offY=54+margin*.5+ch*.5;

  for(let n=1;n<=90;n++){
    const i=n-1,col=i%cols,row=Math.floor(i/cols);
    const tx=offX+col*cw+(row%2===1?cw*.25:0);
    const ty=offY+row*ch;
    const isLast=LAST.includes(n),isHot=HOT.includes(n),isCold=COLD.includes(n),isJolly=JOLLY!==null&&n===JOLLY;
    const cr=isJolly?245:isHot?200:isCold?139:120;
    const cg=isJolly?158:isHot?57:isCold?92:115;
    const cb=isJolly?11:isHot?26:isCold?246:130;
    cells.push({
      n,tx,ty,
      x:Math.random()*W,y:Math.random()*H,
      px:0,py:0,
      t:0,delay:i*.006+Math.random()*.08,
      size:isLast?20:isHot||isCold?15:11,
      isLast,isHot,isCold,isJolly,
      cr,cg,cb,
      energy:0,
      wave:Math.random()*Math.PI*2,
      wAmp:Math.random()*2.5+1,
      wSpd:0.012+Math.random()*.008,
    });
  }
}
// buildCells() non viene chiamata qui - viene chiamata dopo il caricamento dati

// ─── STATISTICHE PER NUMERO (calcolate su tutti i draws)
function computeNumStats(draws){
  const out={};
  const list=Array.isArray(draws)?draws:[];
  const n=list.length;
  for(let num=1;num<=90;num++){
    let lastIdx=-1,lastDate='--',lastId='--';
    let f90=0,f180=0,fFull=0;
    for(let i=0;i<n;i++){
      const d=list[i];
      if(Array.isArray(d.nums)&&d.nums.includes(num)){
        fFull++;lastIdx=i;lastDate=d.date||'--';lastId=d.id||'--';
        if(i>=n-90)f90++;
        if(i>=n-180)f180++;
      }
    }
    const delay=lastIdx>=0?n-1-lastIdx:n;
    const avgEvery=fFull>0?Math.round(n/fFull):n;
    out[num]={delay,f90,f180,fFull,lastDate,lastId,avgEvery};
  }
  return out;
}

function normalizeNumberStats(stats, draws){
  const computed=computeNumStats(draws||[]);
  const src=stats&&typeof stats==='object'?stats:{};
  const out={};
  for(let num=1;num<=90;num++){
    const raw=src[num]||src[String(num)]||{};
    const fallback=computed[num]||{};
    out[num]={
      delay:raw.delay??fallback.delay,
      f90:raw.f90??fallback.f90,
      f180:raw.f180??fallback.f180,
      fFull:raw.fFull??fallback.fFull,
      lastDate:raw.lastDate??fallback.lastDate,
      lastId:raw.lastId??fallback.lastId,
      avgEvery:raw.avgEvery??fallback.avgEvery,
    };
  }
  return out;
}

function hasStatValue(value){
  return value!==undefined&&value!==null&&value!=='';
}

function formatStatValue(value, fallback){
  return hasStatValue(value)?value:(fallback||'N/D');
}

// Resize: ricostruisce celle solo se i dati sono già disponibili
window.addEventListener('resize',()=>{resize();if(LAST.length||alive)buildCells();});

// ─── SEISMIC WAVES
const waves=[];
for(let i=0;i<5;i++){
  waves.push({
    y:.15+i*.155,speed:.25+Math.random()*.35,
    amp:6+Math.random()*18,freq:.018+Math.random()*.012,
    off:Math.random()*1000,
    col:i%2===0?`139,92,246`:`200,57,26`,
  });
}

let hovCell=null,pmx=-9999,pmy=-9999;
document.addEventListener('mousemove',e=>{pmx=e.clientX;pmy=e.clientY;});

const tt=document.getElementById('tt');
const ttB=document.getElementById('tt-b'),ttN=document.getElementById('tt-n'),ttI=document.getElementById('tt-i');

function isNumberHoverBlocked(){
  const panelEl=document.getElementById('panel');
  const blockers=[];
  if(panelEl&&panelEl.classList.contains('open'))blockers.push(panelEl);
  return blockers.some(el=>{
    const r=el.getBoundingClientRect();
    return pmx>=r.left&&pmx<=r.right&&pmy>=r.top&&pmy<=r.bottom;
  });
}

// ─── DRAW LOOP (parte subito - canvas nero finché i dati non arrivano)
function draw(){
  ctx.clearRect(0,0,W,H);
  frame++;

  // Vignetta
  const vg=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.72);
  vg.addColorStop(0,'rgba(8,3,22,0)');vg.addColorStop(1,'rgba(3,1,9,.65)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);

  // Onde sismiche
  if(alive){
    waves.forEach(w=>{
      w.off+=w.speed;
      const y=w.y*H;
      ctx.beginPath();ctx.moveTo(0,y);
      for(let x=0;x<=W;x+=4){
        const ny=y+Math.sin((x+w.off)*w.freq)*w.amp
                  +Math.sin((x+w.off)*w.freq*2.3)*(w.amp*.35);
        ctx.lineTo(x,ny);
      }
      ctx.strokeStyle=`rgba(${w.col},.035)`;ctx.lineWidth=1;ctx.stroke();
    });
  }

  // Cells
  hovCell=null;let cDist=Infinity;
  const hoverBlocked=isNumberHoverBlocked();

  cells.forEach(c=>{
    if(alive && c.t<1){
      c.t=Math.min(1,(frame/60-c.delay*1.5)*1.1);
      if(c.t<=0){c.px=c.x;c.py=c.y;return;}
      const e=1-Math.pow(1-Math.max(0,c.t),4);
      c.px=c.x+(c.tx-c.x)*e;
      c.py=c.y+(c.ty-c.y)*e;
    } else if(alive){
      c.wave+=c.wSpd;
      let ex=c.tx+Math.cos(c.wave)*c.wAmp;
      let ey=c.ty+Math.sin(c.wave*1.3)*c.wAmp;
      c.px=ex;c.py=ey;
    } else {c.px=c.x;c.py=c.y;}

    if(!alive)return;

    if(!hoverBlocked){
      const dh=Math.sqrt((c.px-pmx)**2+(c.py-pmy)**2);
      if(dh<c.size+16&&dh<cDist){cDist=dh;hovCell=c;}
    }
    // energia: sale rapida all'hover, scende lenta all'uscita
    const targetE=(hovCell===c)?1:0;
    c.energy+=(targetE-c.energy)*(hovCell===c?.16:.05);

    const {cr,cg,cb}=c;
    const baseA=c.isLast?.88:c.isHot||c.isCold?.6:.28;
    const alpha=Math.min(1,baseA+c.energy*.25);

    const glR=c.size*(c.isLast?3.2:2)+c.energy*18;
    if(c.energy>.05||c.isLast){
      const gr=ctx.createRadialGradient(c.px,c.py,0,c.px,c.py,glR);
      gr.addColorStop(0,`rgba(${cr},${cg},${cb},${(c.isLast?.12:.04)+c.energy*.18})`);
      gr.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath();ctx.arc(c.px,c.py,glR,0,Math.PI*2);
      ctx.fillStyle=gr;ctx.fill();
    }

    const sz=c.size+(c.energy*7);
    ctx.beginPath();ctx.arc(c.px,c.py,sz,0,Math.PI*2);
    ctx.fillStyle=`rgba(${cr},${cg},${cb},.05)`;ctx.fill();
    ctx.strokeStyle=`rgba(${cr},${cg},${cb},${alpha})`;
    ctx.lineWidth=c.isLast?1.5:.8+c.energy*.5;
    if(c.isJolly)ctx.setLineDash([3,3]);
    ctx.stroke();ctx.setLineDash([]);

    ctx.font=`${c.isLast?'500':'300'} ${Math.max(7,sz*.72)}px 'DM Mono'`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=`rgba(${cr},${cg},${cb},${c.isLast?.92:c.isHot||c.isCold?.6+c.energy*.25:.28+c.energy*.45})`;
    ctx.fillText(c.n,c.px,c.py);

    if(c.isLast||c.isJolly){
      cells.filter(o=>o!==c&&(o.isLast||o.isJolly)&&o.px).forEach(o=>{
        const d=Math.sqrt((c.px-o.px)**2+(c.py-o.py)**2);
        if(d<600){
          ctx.beginPath();ctx.moveTo(c.px,c.py);ctx.lineTo(o.px,o.py);
          ctx.strokeStyle=`rgba(${cr},${cg},${cb},${(1-d/600)*.07})`;
          ctx.lineWidth=.5;ctx.stroke();
        }
      });
    }
  });

  // ─── HOVER (tooltip disabilitato)
  if(hovCell){
    curR.classList.add('xl');
  } else {
    curR.classList.remove('xl');
  }

  requestAnimationFrame(draw);
}
draw();

// ═══════════════════════════════════════════════════════
// MOTORE MICCIA CC - usato da intro, topbar, panel watermark
// ═══════════════════════════════════════════════════════
function buildCCEngine(cvs, opts){
  const c2=cvs.getContext('2d');
  const CW=cvs.width,CH=cvs.height;
  const scale=Math.min(CW,CH*1.8)/260;
  const R=38*scale,ri=24*scale,GAP=14*scale;
  const A0=Math.PI*0.22,A1=Math.PI*1.78;
  const C1X=CW/2-R-GAP/2,C2X=CW/2+R+GAP/2,CY=CH/2;
  const N=120,SPEED=opts.speed||1.4,LOOP_PAUSE=opts.pause||80;

  const arc1=[],arc2=[];
  for(let i=0;i<=N;i++){
    const a=A0+(A1-A0)*(i/N);
    arc1.push({x:C1X+Math.cos(a)*R,y:CY+Math.sin(a)*R,a,letter:1});
    arc2.push({x:C2X+Math.cos(a)*R,y:CY+Math.sin(a)*R,a,letter:2});
  }
  const BN=22,bridge=[];
  const bf=arc1[arc1.length-1],bt=arc2[0];
  for(let i=0;i<=BN;i++){
    const t=i/BN;
    bridge.push({x:bf.x+(bt.x-bf.x)*t,y:bf.y+(bt.y-bf.y)*t+Math.sin(t*Math.PI)*R*0.35,letter:0,a:null});
  }
  const PATH=[...arc1,...bridge,...arc2],PLEN=PATH.length;

  let pos=0,phase='fuse',pauseCnt=0;
  let burnedPts=[],bridgeSparks=[],explParts=[],burnAlpha=1;

  function resetCC(){pos=0;phase='fuse';pauseCnt=0;burnedPts=[];bridgeSparks=[];explParts=[];burnAlpha=1;}

  function drawBase(){
    [C1X,C2X].forEach(cx=>{
      c2.beginPath();c2.arc(cx,CY,R,A0,A1);
      c2.strokeStyle='rgba(237,232,223,0.14)';c2.lineWidth=Math.max(1,1.8*scale);c2.lineCap='round';c2.stroke();
      c2.beginPath();c2.arc(cx,CY,ri,A0,A1);
      c2.strokeStyle='rgba(237,232,223,0.07)';c2.lineWidth=Math.max(0.8,1.2*scale);c2.stroke();
      [A0,A1].forEach(a=>{
        c2.beginPath();
        c2.moveTo(cx+Math.cos(a)*R,CY+Math.sin(a)*R);
        c2.lineTo(cx+Math.cos(a)*ri,CY+Math.sin(a)*ri);
        c2.strokeStyle='rgba(237,232,223,0.09)';c2.lineWidth=Math.max(0.8,1.5*scale);c2.stroke();
      });
    });
  }

  function burnDot(x,y,alpha){
    const g1=Math.max(4,14*scale),g2=Math.max(2,8*scale),g3=Math.max(1,3*scale);
    c2.beginPath();c2.arc(x,y,g1,0,Math.PI*2);c2.fillStyle=`rgba(255,65,5,${0.2*alpha})`;c2.fill();
    c2.beginPath();c2.arc(x,y,g2,0,Math.PI*2);c2.fillStyle=`rgba(255,110,20,${0.32*alpha})`;c2.fill();
    c2.beginPath();c2.arc(x,y,g3,0,Math.PI*2);c2.fillStyle=`rgba(255,190,50,${0.65*alpha})`;c2.fill();
    c2.beginPath();c2.arc(x,y,Math.max(0.6,1.2*scale),0,Math.PI*2);c2.fillStyle=`rgba(255,240,160,${0.9*alpha})`;c2.fill();
  }

  function spawnBridge(x,y){
    const C=['#FFD060','#FFA030','#FF6010'];
    for(let i=0;i<3;i++) bridgeSparks.push({
      x,y,vx:(Math.random()-.5)*2.5*scale,vy:(Math.random()-.5)*1.5*scale+.3*scale,
      life:.5+Math.random()*.5,decay:.05+Math.random()*.04,size:(.4+Math.random()*1.5)*scale,
      col:C[Math.floor(Math.random()*C.length)]
    });
  }

  const SC=['#FFF8E0','#FFE070','#FFB030','#FF7020','#C8391A'];
  function drawFuse(p){
    const len=Math.min(18,p);
    for(let i=0;i<len;i++){
      const idx=Math.floor(p-i);if(idx<0||idx>=PLEN)continue;
      const pt=PATH[idx];const t=1-i/len;
      for(let s=0;s<Math.floor(t*5)+1;s++){
        c2.save();c2.globalAlpha=t*(0.4+Math.random()*.6);
        c2.beginPath();
        c2.arc(pt.x+(Math.random()-.5)*6*t*scale,pt.y+(Math.random()-.5)*6*t*scale,
               Math.random()*2*t*scale+.3,0,Math.PI*2);
        c2.fillStyle=SC[Math.floor(Math.random()*SC.length)];c2.fill();c2.restore();
      }
      if(i===0){
        c2.beginPath();c2.arc(pt.x,pt.y,2.5*scale,0,Math.PI*2);c2.fillStyle='#FFFAF0';c2.fill();
        const g1=c2.createRadialGradient(pt.x,pt.y,0,pt.x,pt.y,11*scale);
        g1.addColorStop(0,'rgba(255,230,80,1)');g1.addColorStop(.4,'rgba(255,110,20,.65)');g1.addColorStop(1,'rgba(255,40,0,0)');
        c2.beginPath();c2.arc(pt.x,pt.y,11*scale,0,Math.PI*2);c2.fillStyle=g1;c2.fill();
      }
    }
  }

  function boom(x,y){
    const p=[];
    p.push({x,y,vx:0,vy:0,num:null,size:60*scale,life:1,decay:.1,flash:true,rot:0,rotV:0});
    for(let i=0;i<20;i++){const a=Math.random()*Math.PI*2,sp=(1.5+Math.random()*5)*scale;p.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1.5*scale,num:String(Math.floor(Math.random()*90)+1),size:(6+Math.random()*10)*scale,col:SC[Math.floor(Math.random()*SC.length)],life:1,decay:.012+Math.random()*.016,rot:(Math.random()-.5)*.3,rotV:(Math.random()-.5)*.05,flash:false});}
    for(let i=0;i<30;i++){const a=Math.random()*Math.PI*2,sp=(2+Math.random()*8)*scale;p.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2*scale,num:null,size:Math.random()*2*scale+.3,col:SC[Math.floor(Math.random()*SC.length)],life:1,decay:.018+Math.random()*.025,rot:0,rotV:0,flash:false});}
    return p;
  }

  function tickFrame(){
    c2.fillStyle='rgba(3,1,9,1)';c2.fillRect(0,0,CW,CH);
    drawBase();
    burnedPts.forEach(p=>burnDot(p.x,p.y,burnAlpha));

    if(phase==='fuse'){
      pos+=SPEED;
      const idx=Math.min(Math.floor(pos),PLEN-1);
      for(let i=burnedPts.length;i<=idx;i++){
        const pt=PATH[i];
        if(pt.letter!==0) burnedPts.push({x:pt.x,y:pt.y});
        else spawnBridge(pt.x,pt.y);
      }
      bridgeSparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=.05*scale;s.life-=s.decay;});
      bridgeSparks=bridgeSparks.filter(s=>s.life>0);
      bridgeSparks.forEach(s=>{c2.save();c2.globalAlpha=s.life;c2.beginPath();c2.arc(s.x,s.y,s.size,0,Math.PI*2);c2.fillStyle=s.col;c2.fill();c2.restore();});
      drawFuse(pos);
      if(pos>=PLEN-1){explParts=boom(PATH[PLEN-1].x,PATH[PLEN-1].y);phase='explode';}

    } else if(phase==='explode'){
      bridgeSparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=.05*scale;s.life-=s.decay;});
      bridgeSparks=bridgeSparks.filter(s=>s.life>0);
      bridgeSparks.forEach(s=>{c2.save();c2.globalAlpha=s.life;c2.beginPath();c2.arc(s.x,s.y,s.size,0,Math.PI*2);c2.fillStyle=s.col;c2.fill();c2.restore();});
      explParts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.08*scale;p.vx*=.98;p.life-=p.decay;p.rot+=p.rotV;});
      explParts=explParts.filter(p=>p.life>0);
      explParts.forEach(p=>{
        c2.save();c2.globalAlpha=Math.max(0,p.life);
        if(p.flash){const g=c2.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size);g.addColorStop(0,'rgba(255,245,220,.9)');g.addColorStop(.3,'rgba(255,160,40,.6)');g.addColorStop(1,'rgba(200,57,26,0)');c2.beginPath();c2.arc(p.x,p.y,p.size,0,Math.PI*2);c2.fillStyle=g;c2.fill();}
        else if(!p.num){c2.beginPath();c2.arc(p.x,p.y,p.size,0,Math.PI*2);c2.fillStyle=p.col;c2.fill();}
        else{c2.translate(p.x,p.y);c2.rotate(p.rot);c2.font=`500 ${p.size}px 'DM Mono'`;c2.textAlign='center';c2.textBaseline='middle';c2.shadowColor=p.col;c2.shadowBlur=6;c2.fillStyle=p.col;c2.fillText(p.num,0,0);}
        c2.restore();
      });
      if(explParts.length===0){phase='pause';pauseCnt=0;}

    } else if(phase==='pause'){
      pauseCnt++;
      burnAlpha=Math.max(0,1-(pauseCnt/(LOOP_PAUSE*.7)));
      if(pauseCnt>LOOP_PAUSE) resetCC();
    }
    requestAnimationFrame(tickFrame);
  }
  tickFrame();
}

// ─── COUNTDOWN
let _nextDrawAt=null;        // null = nessuna risposta ancora dal JSON
let _nextDrawLoading=false;
let _nextDrawFetched=false;  // true dopo il primo fetch andato a buon fine

function fallbackNextDrawDate(){
  const now=new Date();
  const drawDays=[2,4,5,6]; // martedi, giovedi, venerdi, sabato
  for(let offset=0;offset<=7;offset++){
    const t=new Date(now);
    t.setDate(now.getDate()+offset);
    t.setHours(20,0,0,0);
    if(drawDays.includes(t.getDay())&&t>now) return t;
  }
  const t=new Date(now);
  t.setDate(now.getDate()+1);
  t.setHours(20,0,0,0);
  return t;
}

function parseNextDrawDate(payload){
  if(!payload||typeof payload!=='object') return null;

  if(typeof payload.next_datetime_iso==='string'&&payload.next_datetime_iso.trim()){
    const dt=new Date(payload.next_datetime_iso.trim());
    if(!Number.isNaN(dt.getTime())) return dt;
  }

  if(typeof payload.next_date_iso==='string'&&payload.next_date_iso.trim()){
    const raw=(typeof payload.next_time==='string'&&payload.next_time.trim())?payload.next_time.trim():'20:00';
    const hhmm=/^\d{2}:\d{2}$/.test(raw)?raw:'20:00';
    const dt=new Date(`${payload.next_date_iso.trim()}T${hhmm}:00`);
    if(!Number.isNaN(dt.getTime())) return dt;
  }

  return null;
}

function _fmtJackpotShort(raw){
  if(!raw||raw==='N/D') return 'N/D';
  var cleaned=raw.replace(/[^\d.,]/g,'');
  var parts=cleaned.split(',');
  var intPart=parts[0].replace(/\./g,'');
  var n=parseFloat(intPart+(parts[1]?'.'+parts[1]:''));
  if(isNaN(n)||n<1) return raw;
  var mln=n/1000000;
  var val=mln.toFixed(2).replace('.',',');
  // Progressive: "Euro 54,20 Mln" → "€ 54,20 Mln" → "54,20 Mln"
  return '<span class="jk-euro">Euro </span><span class="jk-sym">€ </span>'+val+' Mln';
}

function _applyJackpot(payload){
  var jkEl=document.getElementById('v8-jackpot');
  if(!jkEl) return;
  if(!payload||typeof payload!=='object'){
    jkEl.innerHTML='<span class="tb-jk-label">Jackpot</span><span class="tb-jk-value">N/D</span>';
    return;
  }
  var jk=payload.jackpot_eur||payload.jackpot_str||null;
  var shortJk=_fmtJackpotShort(jk);
  jkEl.innerHTML='<span class="tb-jk-label">Jackpot</span><span class="tb-jk-value">'+shortJk+'</span>';

  // Mirror nella card dashboard (formato esteso)
  _applyNextCardInfo(payload,jk);
}

function _applyNextCardInfo(payload,jk){
  var dsNextJk=document.getElementById('ds-next-jk');
  var dbNext=document.getElementById('db-next');
  // Data e giorno della settimana
  var weekday=payload&&payload.next_weekday||'';
  var date=payload&&payload.next_date||'';
  var dateStr=(weekday&&date)?(weekday+' '+date):(date||'');
  // Popola la card next
  if(dbNext){
    dbNext.innerHTML=
      (dateStr?'<div class="next-date">'+dateStr+'</div>':'')+
      '<div class="next-jk-label">JACKPOT</div>'+
      '<div class="next-jk-value">'+_fmtJackpotShort(jk)+'</div>';
  }
  if(dsNextJk) dsNextJk.textContent='';
}

function fetchNextDrawDate(){
  if(_nextDrawLoading) return;
  _nextDrawLoading=true;

  const repo=window.CC_DATA_REPOSITORY;
  const req=(repo&&typeof repo.fetchJson==='function')
    ? repo.fetchJson('data/next-draw.json')
    : fetch('data/next-draw.json').then(function(r){return r.ok?r.json():null;});

  Promise.resolve(req)
    .then(function(payload){
      const parsed=parseNextDrawDate(payload);
      // Accetta sempre la data dal JSON, futura o passata:
      // - passata &rarr; siamo in attesa dei risultati (diff=0, waiting state)
      // - futura  &rarr; concorso successivo, countdown normale
      if(parsed) _nextDrawAt=parsed;
      _nextDrawFetched=true;
      _applyJackpot(payload);
    })
    .catch(function(){})
    .finally(function(){_nextDrawLoading=false;});
}

function upCd(){
  const now=new Date();
  // Fallback solo prima che il JSON risponda - dopo usiamo sempre _nextDrawAt
  const target=(_nextDrawFetched&&_nextDrawAt)?_nextDrawAt:(_nextDrawAt||fallbackNextDrawDate());
  const diff=Math.max(0,target-now);
  const el=document.getElementById('cd');
  if(!el) return;
  if(diff===0){
    // Data dal JSON è nel passato: siamo in attesa dei risultati
    if(!el.dataset.waiting){
      el.dataset.waiting='1';
      el.textContent='Risultati in arrivo...';
      el.style.animation='cc-waiting-pulse 1.6s ease-in-out infinite';
    }
  } else {
    delete el.dataset.waiting;
    el.style.animation='';
    const h=Math.floor(diff/3600000),r1=diff%3600000;
    const m=Math.floor(r1/60000),r2=r1%60000;
    const s=Math.floor(r2/1000);
    const f=n=>String(n).padStart(2,'0');
    el.textContent=`${f(h)}:${f(m)}:${f(s)}`;
  }
  // Mirror countdown nella card dashboard
  const dtNext=document.getElementById('dt-next');
  if(dtNext) dtNext.textContent=el.textContent;
}
setInterval(upCd,1000);upCd();
fetchNextDrawDate();
// In attesa risultati: poll ogni 30s; normale: ogni 5min
let _fetchTimer=setInterval(fetchNextDrawDate,300000);
function _adaptFetchInterval(waiting){
  clearInterval(_fetchTimer);
  _fetchTimer=setInterval(fetchNextDrawDate,waiting?30000:300000);
}
// Controlla ogni 10s se il polling va adattato
setInterval(function(){
  const el=document.getElementById('cd');
  _adaptFetchInterval(!!(el&&el.dataset.waiting));
},10000);

function nextDrawDayLabel(){
  const target=_nextDrawAt||fallbackNextDrawDate();
  return target.toLocaleDateString('it-IT',{weekday:'long'});
}

// Dashboard sections.
const DASH_SECTIONS={
  concorso:'dc-concorso',
  next:'dc-next',
  storico:'dc-storico',
  algoritmi:'dc-algoritmi',
  ranking:'dc-ranking',
  ses:'dc-ses',
  analisi:'dc-analisi',
  lab:'dc-lab',
  ora:'dc-ora',
  community:'dc-community',
  info:'dc-info'
};

// Dashboard centrale della home.
const dash=document.getElementById('v8-dashboard');

function dashLink(title,href,note){
  return `<a class="lf" href="${href}">
    <span class="lf-t">${title}${note?'<br><span class="lf-sub">'+note+'</span>':''}</span>
    <span class="lf-a">&rarr;</span>
  </a>`;
}

function dashMetric(label,value,cls){
  return `<div class="sr"><span class="sr-k">${label}</span><span class="sr-v ${cls||''}">${value}</span></div>`;
}

function _dashBodyConcorso(){
  return `
    <div class="p-sec">Ultimo concorso</div>
    ${dashMetric('Concorso', '#'+String(DRAW_ID).padStart(3,'0'))}
    ${dashMetric('Data', DRAW_DATE)}
    ${dashMetric('Prossimo', nextDrawDayLabel(), 'v')}
    <div class="hub-links">
      ${dashLink('Dettaglio concorso','pages/concorso/')}
      ${dashLink('Storico estrazioni','pages/storico-estrazioni/')}
    </div>`;
}

// ─── SKY CANVAS (identico a v8-inner-chrome.js) ───────────────────────────────
function _startSky(cv){
  if(!cv||!cv.getContext)return;
  var ctx=cv.getContext('2d');
  var W=0,H=0,mx=-9999,my=-9999;
  function resize(){W=cv.width=Math.max(1,cv.clientWidth||Math.round(window.innerWidth*.666667));H=cv.height=Math.max(1,cv.clientHeight||Math.round(window.innerHeight*.4));}
  resize();
  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;},{passive:true});
  var pts=[];
  for(var i=1;i<=90;i++){pts.push({n:i,x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.18});}
  function frame(){
    requestAnimationFrame(frame);
    ctx.clearRect(0,0,W,H);
    var link=130,link2=link*link;
    for(var i=0;i<pts.length;i++){
      for(var j=i+1;j<pts.length;j++){
        var a=pts[i],b=pts[j],dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy;
        if(d2<link2){ctx.strokeStyle='rgba(139,92,246,'+((1-d2/link2)*.055).toFixed(3)+')';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
      }
    }
    for(i=0;i<pts.length;i++){
      var p=pts[i];
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>W)p.vx*=-1;
      if(p.y<0||p.y>H)p.vy*=-1;
      var ddx=p.x-mx,ddy=p.y-my,d=Math.sqrt(ddx*ddx+ddy*ddy);
      if(d<110&&d>0){p.x+=ddx/d*.45;p.y+=ddy/d*.45;}
      var near=d<130;
      ctx.fillStyle=near?'rgba(237,232,223,.55)':'rgba(237,232,223,.16)';
      ctx.beginPath();ctx.arc(p.x,p.y,near?2.4:1.5,0,7);ctx.fill();
      if(near){ctx.fillStyle='rgba(237,232,223,.75)';ctx.font='500 10px "DM Mono",monospace';ctx.fillText(p.n,p.x+7,p.y-6);}
    }
  }
  frame();
}
(function(){
  if(document.getElementById('v8-sky'))return;
  var cv=document.createElement('canvas');
  cv.id='v8-sky';
  cv.setAttribute('aria-hidden','true');
  cv.style.cssText='display:block;position:fixed;top:0;left:0;width:66.6667vw;height:40vh;z-index:0;pointer-events:none;opacity:.7;';
  document.body.prepend(cv);
  _startSky(cv);
})();

function _dashBodyStorico(){
  return `
    <div class="p-sec">Archivio dal 1997</div>
    ${dashMetric('Estrazioni archiviate', DRAWS_COUNT?DRAWS_COUNT.toLocaleString('it-IT'):'--')}
    ${dashMetric('Numeri caldi', LAST.filter(n=>HOT.includes(n)).join(' · ')||'--', 'r')}
    ${dashMetric('Numeri freddi', LAST.filter(n=>COLD.includes(n)).join(' · ')||'--', 'v')}
    <div class="hub-links">
      ${dashLink('Consulta l\'archivio','pages/storico-estrazioni/')}
    </div>`;
}

function _dashBodyAlgoritmi(){
  return `
    <div class="p-sec">Motori di analisi attivi</div>
    ${dashMetric('Algoritmi', ALGOS.length||'--', 'v')}
    <div class="dash-fam-list">
      <span class="dash-fam dash-fam--stat">Statistici &mdash; modelli classici su frequenze, ritardi e co-occorrenze</span>
      <span class="dash-fam dash-fam--neu">Neurali &mdash; reti adattive addestrate sullo storico</span>
      <span class="dash-fam dash-fam--ibr">Ibridi &mdash; combinazione di approcci statistici e ML</span>
      <span class="dash-fam dash-fam--gen">Generativi / Evolutivi &mdash; algoritmi a popolazione con selezione e mutazione</span>
    </div>
    <div class="hub-links">
      ${dashLink('Esplora tutti gli algoritmi','pages/algoritmi/')}
    </div>`;
}

function _dashBodyRanking(){
  const top=ALGOS.slice(0,7);
  return `
    <div class="p-sec">Classifica algoritmi</div>
    ${top.length?top.map(a=>`
      <div class="rank-row"><span>${String(a.r).padStart(2,'0')}</span><strong>${a.n}</strong></div>`).join(''):
      '<div class="p-sec" style="color:rgba(237,232,223,.3)">Classifica in caricamento...</div>'}
    <div class="hub-links">
      ${dashLink('Apri ranking completo','pages/ranking/')}
    </div>`;
}

function _dashBodySes(){
  const preview=_sestine.slice(0,4);
  const previewHtml=preview.map(s=>`
    <div class="ses-row">
      <span class="ses-alg">${s.title||s.id}</span>
      <span class="ses-balls">${(s.nums||[]).map(n=>`<span class="ses-b">${String(n).padStart(2,'0')}</span>`).join('')}</span>
    </div>`).join('');
  return `
    <div class="p-sec">Proposte per ${nextDrawDayLabel()}</div>
    ${_sestine.length?previewHtml:'<div class="p-sec" style="color:rgba(237,232,223,.3)">Caricamento sestine...</div>'}
    <div class="hub-links">
      ${dashLink('Tutte le sestine proposte','pages/sestine-proposte/')}
    </div>
    <div class="hub-disclaimer">Proposte algoritmiche &mdash; nessuna promessa di vincita.</div>`;
}

function _dashBodyAnalisi(){
  return `
    <div class="p-sec">Fondamenti statistici</div>
    <div class="dash-prose">Frequenze relative, ritardi critici e co-occorrenze calcolati su finestre mobili di 30, 90 e 180 estrazioni. Ogni valore viene confrontato col baseline teorico (6/90) per isolare segnali strutturali dal rumore stocastico.</div>
    ${dashMetric('Finestre analisi', '30 · 90 · 180 · full')}
    ${dashMetric('Dataset dal', '1997', 'v')}
    <div class="hub-links">
      ${dashLink('Apri analisi statistiche','pages/analisi-statistiche/')}
    </div>`;
}

function _dashBodyLab(){
  const st=_iargosStatus;
  return `
    <div class="p-sec">Strumenti per l'esperto</div>
    <div class="dash-prose">Formule, metriche di ranking, bias cognitivi e limiti metodologici dell'analisi statistica sul SuperEnalotto. Documentazione tecnica completa di ogni modulo.</div>
    <div class="p-sec">iARGOS &mdash; supervisore autonomo</div>
    <div class="dash-prose dash-prose--sm">Motore di monitoraggio continuo: verifica l'allineamento mirror/locale, esegue auto-healing e registra ogni intervento nel diario operativo.</div>
    ${dashMetric('Stato', st?(st.overview_green?'Operativo':(st.severity||'warning')):'--', st?(st.overview_green?'g':'r'):'')}
    ${dashMetric('Algoritmi allineati', st?.runtime?(st.runtime.algorithms_aligned_count||'--')+' / '+(st.runtime.algorithms_total_count||'--'):'--')}
    <div class="hub-links">
      ${dashLink('Apri Laboratorio Tecnico','pages/laboratorio-tecnico/')}
    </div>`;
}

function _dashBodyOra(){
  const hot=HOT.slice(0,3).join(' · ')||'--';
  const cold=COLD.slice(0,3).join(' · ')||'--';
  return `
    <div class="p-sec">Segnali visuali e mappa Cosmos</div>
    ${dashMetric('Numeri caldi', hot, 'r')}
    ${dashMetric('Numeri freddi', cold, 'v')}
    ${dashMetric('Prossima estrazione', nextDrawDayLabel(), 'v')}
    <div class="hub-links">
      ${dashLink('Apri Oracle','pages/oracle/')}
    </div>
    <div class="hub-disclaimer">Sintesi visuale &mdash; metafora di analisi, non previsione.</div>`;
}

function _dashBodyCommunity(){
  return `
    <div class="p-sec">Area pubblica del progetto</div>
    <div class="dash-prose">Feed operativo aggiornato: attivit&agrave; algoritmi, leaderboard e highlights statistici. Analisi statistica indipendente senza fini commerciali.</div>
    ${dashMetric('Progetto', 'Control Chaos')}
    ${dashMetric('Tipo', 'analisi indipendente')}
    <div class="hub-links">
      ${dashLink('Apri Community','pages/community/')}
    </div>`;
}

function _dashBodyInfo(){
  return `
    <div class="p-sec">Trasparenza e regole</div>
    <div class="hub-links">
      ${dashLink('Chi siamo','pages/contatti-chi-siamo/')}
      ${dashLink('Disclaimer','pages/disclaimer/')}
      ${dashLink('Privacy policy','pages/privacy-policy/')}
      ${dashLink('Cookie policy','pages/cookie-policy/')}
      ${dashLink('Termini di servizio','pages/termini-servizio/')}
      ${dashLink('Consenso','pages/consenso/')}
    </div>`;
}

function _dashPopulate(focusId){
  const dkConcorso=document.getElementById('dk-concorso');
  const dsConcorso=document.getElementById('ds-concorso');
  const dbConcorso=document.getElementById('db-concorso');
  if(dkConcorso)dkConcorso.innerHTML=`Ultima estrazione &middot; #${String(DRAW_ID).padStart(3,'0')}`;
  if(dsConcorso)dsConcorso.textContent=DRAW_DATE;
  if(dbConcorso)dbConcorso.innerHTML=_dashBodyConcorso();

  // ── Mini-sestina mobile nella card concorso ──
  const concorsoHead=document.querySelector('#dc-concorso .dash-card-head');
  if(concorsoHead&&LAST.length&&!concorsoHead.querySelector('.mob-sestina')){
    const wrap=document.createElement('div');
    wrap.className='mob-sestina';
    LAST.forEach(function(n){
      const b=document.createElement('span');
      b.className='ses-b';
      b.textContent=n;
      wrap.appendChild(b);
    });
    concorsoHead.appendChild(wrap);
  }

  // ── Card countdown + jackpot ──
  // Il contenuto viene popolato da _applyNextCardInfo() al fetch del JSON

  const dsStorico=document.getElementById('ds-storico');
  const dbStorico=document.getElementById('db-storico');
  if(dsStorico)dsStorico.textContent=DRAWS_COUNT?`${DRAWS_COUNT.toLocaleString('it-IT')} concorsi archiviati`:'Archivio storico';
  if(dbStorico)dbStorico.innerHTML=_dashBodyStorico();

  const dsAlgoritmi=document.getElementById('ds-algoritmi');
  const dbAlgoritmi=document.getElementById('db-algoritmi');
  if(dsAlgoritmi)dsAlgoritmi.textContent=`${ALGOS.length||'--'} algoritmi attivi`;
  if(dbAlgoritmi)dbAlgoritmi.innerHTML=_dashBodyAlgoritmi();

  const dbRanking=document.getElementById('db-ranking');
  if(dbRanking)dbRanking.innerHTML=_dashBodyRanking();

  const dtSes=document.getElementById('dt-ses');
  const dbSes=document.getElementById('db-ses');
  if(dtSes)dtSes.innerHTML=`Sestine<br>${nextDrawDayLabel()}`;
  if(dbSes)dbSes.innerHTML=_dashBodySes();

  const dbAnalisi=document.getElementById('db-analisi');
  if(dbAnalisi)dbAnalisi.innerHTML=_dashBodyAnalisi();

  const dbLab=document.getElementById('db-lab');
  if(dbLab)dbLab.innerHTML=_dashBodyLab();

  const dbOra=document.getElementById('db-ora');
  if(dbOra)dbOra.innerHTML=_dashBodyOra();

  const dbCommunity=document.getElementById('db-community');
  if(dbCommunity)dbCommunity.innerHTML=_dashBodyCommunity();

  const dbInfo=document.getElementById('db-info');
  if(dbInfo)dbInfo.innerHTML=_dashBodyInfo();

  // ── Card cliccabili ovunque ──
  if(dash){
    dash.querySelectorAll('.dash-card').forEach(function(card){
      if(card.hasAttribute('data-href')) return; // già processata
      var link=card.querySelector('.dash-card-foot[href]');
      if(link){
        card.setAttribute('data-href',link.getAttribute('href'));
      }
    });
    dash.querySelectorAll('.dash-card').forEach(c=>c.classList.remove('dash-focus'));
  }
  const focusEl=focusId?document.getElementById(DASH_SECTIONS[focusId]):null;
  if(focusEl){focusEl.classList.add('dash-focus');}
}

function openDashboard(focusId){
  if(!dash)return;
  const id=DASH_SECTIONS[focusId]?focusId:'concorso';
  _dashPopulate(id);
  dash.classList.add('open');
  canvas.style.opacity='0';
  updatePanelHash(id);
  rememberPanel(id);
}

function closeDashboard(){
  if(dash)dash.classList.remove('open');
  canvas.style.opacity='';
}

// Card intere cliccabili — delegato sulla dash-grid
if(dash)dash.addEventListener('click',function(e){
  var card=e.target.closest('.dash-card[data-href]');
  if(!card) return;
  // non intercettare click su link/button interni
  if(e.target.closest('a,button')) return;
  window.location.href=card.getAttribute('data-href');
});

function panelIdFromHash(){
  const raw=String(window.location.hash||'').replace(/^#/,'');
  if(raw.startsWith('dash-')) return raw.slice(5);
  if(raw.startsWith('panel-')) {
    const legacy={est:'concorso',alg:'algoritmi',com:'community'};
    const old=raw.slice(6);
    return legacy[old]||old;
  }
  return '';
}

function rememberPanel(id){
  try{ sessionStorage.setItem('cc-v8-panel',id); }catch(e){}
}

function updatePanelHash(id){
  if(!id)return;
  const next='#dash-'+id;
  if(window.location.hash===next)return;
  try{ history.replaceState(history.state,'',next); }catch(e){ window.location.hash=next; }
}

function initialPanelId(){
  const fromHash=panelIdFromHash();
  if(DASH_SECTIONS[fromHash])return fromHash;
  try{
    const stored=sessionStorage.getItem('cc-v8-panel');
    if(DASH_SECTIONS[stored])return stored;
  }catch(e){}
  return 'concorso';
}

window.addEventListener('hashchange',()=>{
  if(!alive)return;
  const id=panelIdFromHash();
  if(DASH_SECTIONS[id])openDashboard(id);
});

const ov=document.getElementById('ov');
const ovCls=document.getElementById('ov-cls');
const oracleOpen=document.getElementById('oracle-open');
if(oracleOpen&&ov) oracleOpen.addEventListener('click',()=>{
  ov.classList.add('on');
  openDashboard('ora');
});
if(ovCls&&ov) ovCls.addEventListener('click',()=>{ov.classList.remove('on');});

// V8 DATA INIT - attende che tutti i moduli siano pronti
function v8WaitAndInit(cb, attempts){
  attempts=attempts||0;
  if(window.V8_BRIDGE && window.CC_DATA_REPOSITORY && window.CARDS_INDEX){
    window.V8_BRIDGE.load().then(cb).catch(function(e){
      console.warn('[v8-main] V8_BRIDGE.load() failed:', e);
      cb({lastDraw:null,hotNums:[],coldNums:[],draws:[],cards:[]});
    });
  } else if(attempts<40){
    setTimeout(function(){v8WaitAndInit(cb,attempts+1);},100);
  } else {
    console.warn('[v8-main] Timeout attesa moduli V8_BRIDGE - avvio con dati vuoti');
    cb({lastDraw:null,hotNums:[],coldNums:[],draws:[],cards:[]});
  }
}

v8WaitAndInit(function(bundle){
  LAST  = bundle.lastDraw ? bundle.lastDraw.nums : [];
  HOT   = bundle.hotNums  || [];
  COLD  = bundle.coldNums || [];
  JOLLY = bundle.lastDraw ? bundle.lastDraw.jolly : null;
  DRAWS_COUNT = bundle.draws ? bundle.draws.length : 0;
  DRAW_ID     = bundle.lastDraw ? bundle.lastDraw.id   : '--';
  DRAW_DATE   = bundle.lastDraw ? bundle.lastDraw.date : '--';

  ALGOS = (bundle.cards||[]).map(function(c,i){
    return {
      r:i+1,
      n:c.title||c.id,
      id:c.id,
      page:c.page||('pages/algoritmi/algs/'+c.id+'/'),
      group:c.macroGroup||'',
      w:60
    };
  });

  var algCount=document.getElementById('v8-alg-count');
  if(algCount) algCount.textContent=ALGOS.length+' Algoritmi';

  // Versione sotto ControlChaos
  var tbVer=document.getElementById('tb-version');
  if(tbVer) tbVer.textContent='v '+(window.CC_VERSION||'--');

  buildCells();
  NUM_STATS=normalizeNumberStats(bundle.numStats,bundle.draws||[]);
  DRAWS_COUNT=bundle.totalDraws||bundle.draws.length||DRAWS_COUNT;

  function _normPage(p){ return String(p||'').replace(/^\/+/,'').replace(/\/+$/,''); }

  function _applyRankingOrder(rankRows){
    if(!Array.isArray(rankRows)||!rankRows.length) return;
    var maxScore=rankRows[0].ranking||1;
    var rankMap={};
    rankRows.forEach(function(row,i){
      rankMap[_normPage(row.page)]={pos:i+1,score:row.ranking||0,title:row.title||''};
    });
    ALGOS.sort(function(a,b){
      var ra=rankMap[_normPage(a.page)];
      var rb=rankMap[_normPage(b.page)];
      return ((ra?ra.pos:9999)-(rb?rb.pos:9999));
    });
    ALGOS.forEach(function(a,i){
      a.r=i+1;
      var ri=rankMap[_normPage(a.page)];
      a.w=ri?Math.round((ri.score/maxScore)*100):20;
      if(ri&&ri.title) a.n=ri.title;
    });
    if(_sestine.length){
      _sestine.sort(function(a,b){
        var pa='pages/algoritmi/algs/'+a.id;
        var pb='pages/algoritmi/algs/'+b.id;
        var ra=rankMap[_normPage(pa)];
        var rb=rankMap[_normPage(pb)];
        return ((ra?ra.pos:9999)-(rb?rb.pos:9999));
      });
    }
  }

  var _rankRows=null;
  var _rankPromise=(typeof DataRegistry!=='undefined')
    ?DataRegistry.load('algorithms.rankings_db').catch(function(){return window.CC_DATA_REPOSITORY?window.CC_DATA_REPOSITORY.fetchJson('data/precomputed/ranking.json'):null;})
    :window.CC_DATA_REPOSITORY?window.CC_DATA_REPOSITORY.fetchJson('data/precomputed/ranking.json'):Promise.resolve(null);
  if(_rankPromise){
    _rankPromise
      .then(function(rk){
        if(rk&&Array.isArray(rk.rows)&&rk.rows.length){
          _rankRows=rk.rows;
          _applyRankingOrder(_rankRows);
        }
      })
      .catch(function(){});
  }

  window.V8_BRIDGE.loadSestine(bundle.cards || [])
    .then(function(ses){
      _sestine=ses;
      if(_rankRows) _applyRankingOrder(_rankRows);
    })
    .catch(function(){});

  if(window.CC_DATA_REPOSITORY){
    window.CC_DATA_REPOSITORY.fetchJson('data/iargos-public-status.json')
      .then(function(status){ if(status) _iargosStatus=status; })
      .catch(function(){});
  }

  buildCCEngine(document.getElementById('cc-intro'),{speed:1.2,pause:90});
  buildCCEngine(document.getElementById('cc-logo'), {speed:1.8,pause:60});

  var intro=document.getElementById('intro');
  var ui=document.getElementById('ui');

  // ── Intro progressiva basata su engagement ──
  // Score calcolato da intro-showcase.js: visits*1 + pages*2 + floor(time/60)*0.5
  //   0-19  → intro completa (click per entrare)
  //   20-49 → intro breve (auto-skip dopo 4s, click per saltare)
  //   50+   → skip immediato
  var _engScore=0;
  try{
    var _engRaw=localStorage.getItem('cc-engagement');
    if(_engRaw){var _engObj=JSON.parse(_engRaw);_engScore=(_engObj.visits||0)+(_engObj.pages?_engObj.pages.length:0)*2+Math.floor((_engObj.time||0)/60)*0.5;}
  }catch(e){}

  var _skipIntro=false;
  var _autoSkipDelay=0;
  const fromInternalPage=(()=>{
    try{
      const ref=new URL(document.referrer||'',window.location.href);
      return ref.origin===window.location.origin&&ref.pathname.includes('/pages/');
    }catch(e){return false;}
  })();

  if(DASH_SECTIONS[panelIdFromHash()]||fromInternalPage){
    _skipIntro=true;
  } else if(_engScore>=50){
    _skipIntro=true;
  } else if(_engScore>=20){
    _autoSkipDelay=4000;
  }

  function launch(){
    if(alive)return;
    // Stop showcase animato
    if(typeof window._introShowcaseStop==='function') window._introShowcaseStop();
    intro.classList.add('out');
    var delay=_skipIntro?80:1600;
    setTimeout(function(){
      intro.style.display='none';

      ui.classList.add('on');
      alive=true;
      cells.forEach(function(c){c.t=0;});
      openDashboard(initialPanelId());
    },delay);
  }


  if(_skipIntro&&(DASH_SECTIONS[panelIdFromHash()]||fromInternalPage)){
    // Navigazione interna o hash: skip immediato, nessuna intro
    setTimeout(launch,120);
  } else if(_skipIntro){
    // Score>=50: attende esplosione "Bentornato" poi entra
    window.addEventListener('intro-welcome-done',function(){setTimeout(launch,300);},{once:true});
    // Fallback se intro-showcase non caricato o errore
    setTimeout(function(){if(!alive)launch();},8000);
    document.addEventListener('click',launch);
    document.addEventListener('keydown',launch);
  } else {
    document.addEventListener('click',launch);
    document.addEventListener('keydown',launch);
    if(_autoSkipDelay>0){
      // Score 20-49: attende esplosione "Bentornato" oppure timeout
      window.addEventListener('intro-welcome-done',function(){setTimeout(launch,300);},{once:true});
      setTimeout(function(){if(!alive)launch();},_autoSkipDelay);
    }
  }
});
