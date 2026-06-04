// v8-main.js — Shell grafica v8
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
// buildCells() non viene chiamata qui — viene chiamata dopo il caricamento dati

// ─── STATISTICHE PER NUMERO (calcolate su tutti i draws)
function computeNumStats(draws){
  const out={};
  const n=draws.length;
  for(let num=1;num<=90;num++){
    let lastIdx=-1,lastDate='--',lastId='--';
    let f90=0,f180=0,fFull=0;
    for(let i=0;i<n;i++){
      const d=draws[i];
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

let hovCell=null,pmx=W/2,pmy=H/2;
document.addEventListener('mousemove',e=>{pmx=e.clientX;pmy=e.clientY;});

const tt=document.getElementById('tt');
const ttB=document.getElementById('tt-b'),ttN=document.getElementById('tt-n'),ttI=document.getElementById('tt-i');
const bbMsg=document.getElementById('bb-msg');

function isNumberHoverBlocked(){
  const panelEl=document.getElementById('panel');
  const sideEl=document.getElementById('side');
  const blockers=[];
  if(panelEl&&panelEl.classList.contains('open'))blockers.push(panelEl);
  if(sideEl)blockers.push(sideEl);
  return blockers.some(el=>{
    const r=el.getBoundingClientRect();
    return pmx>=r.left&&pmx<=r.right&&pmy>=r.top&&pmy<=r.bottom;
  });
}

// ─── DRAW LOOP (parte subito — canvas nero finché i dati non arrivano)
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

  // ─── HOVER DELAY + TOOLTIP DIREZIONALE
  const now=performance.now();

  if(hovCell){
    curR.classList.add('xl');
    bbMsg.textContent=`N° ${hovCell.n} · ${hovCell.isHot?'caldo':hovCell.isCold?'freddo':hovCell.isJolly?'jolly':hovCell.isLast?'estratto':'nella media'}`;

    // Reset timer se la cella è cambiata
    if(hovCell!==_hovPrev){
      _hovPrev=hovCell;_hovStart=now;_richOn=false;tt.classList.remove('on');
    }

    // Dopo 650ms mostra il tooltip ricco
    if(!_richOn&&now-_hovStart>650){
      _richOn=true;
      const c=hovCell;
      const s=NUM_STATS[c.n]||{};

      // Badge categoria
      const badge=c.isLast&&LAST.includes(c.n)?`Estratto · #${String(DRAW_ID).padStart(3,'0')}`
        :c.isJolly?`Jolly · #${String(DRAW_ID).padStart(3,'0')}`
        :c.isHot?'Numero caldo'
        :c.isCold?'Ritardo prolungato'
        :'Campo numerico';
      ttB.textContent=badge;
      ttN.textContent=`N° ${c.n}`;

      // Contenuto ricco
      const catColor=c.isLast||c.isJolly?'#F59E0B':c.isHot?'#C8391A':c.isCold?'#8B5CF6':'rgba(237,232,223,.55)';
      const catLabel=c.isLast?'Ultima estrazione':c.isJolly?'Jolly':c.isHot?'Alta frequenza (ult. 30)':c.isCold?'Assente (ult. 50)':'Frequenza nella media';
      ttI.innerHTML=
        `<b style="color:${catColor}">${catLabel}</b><br>`+
        `Ritardo: <b>${s.delay!==undefined?s.delay:'--'}</b> estrazioni<br>`+
        `Ultime 90: <b>${s.f90!==undefined?s.f90:'--'}</b> uscite`+
        (s.f180!==undefined?` · 180: <b>${s.f180}</b>`:'')+`<br>`+
        `Ultima: <b>${s.lastDate||'--'}</b>`+
        (s.lastId&&s.lastId!=='--'?` · #${s.lastId}`:'')+`<br>`+
        `Media: ogni ~<b>${s.avgEvery||'--'}</b> estrazioni`;

      // Posizionamento direzionale: tooltip punta verso il centro schermo
      // Prima rendi visibile fuori schermo per misurare le dimensioni reali
      tt.style.left='-9999px';tt.style.top='-9999px';
      tt.classList.add('on');
      const TW=tt.offsetWidth||180;
      const TH=tt.offsetHeight||100;

      const cx=W/2,cy=H/2;
      const dx=c.px-cx,dy=c.py-cy;
      let tx,ty;
      if(Math.abs(dx)>=Math.abs(dy)){
        // Asse orizzontale dominante
        tx=dx>0?Math.min(c.px+22,W-TW-8):Math.max(c.px-TW-22,8);
        ty=Math.max(68,Math.min(c.py-TH/2,H-TH-8));
      } else {
        // Asse verticale dominante
        tx=Math.max(8,Math.min(c.px-TW/2,W-TW-8));
        ty=dy>0?Math.min(c.py+22,H-TH-8):Math.max(68,c.py-TH-22);
      }
      tt.style.left=tx+'px';tt.style.top=ty+'px';

      // Linea sottile dal tooltip verso la bolla (canvas)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(c.px,c.py);
      // punto di aggancio lato tooltip più vicino alla bolla
      const tlx=dx>0?tx:tx+TW;
      const tly=Math.max(68,Math.min(c.py,ty+TH));
      ctx.strokeStyle=`rgba(${c.cr},${c.cg},${c.cb},.18)`;
      ctx.lineWidth=.8;ctx.setLineDash([3,4]);ctx.stroke();
      ctx.setLineDash([]);ctx.restore();
    }
  } else {
    if(_hovPrev){_hovPrev=null;_richOn=false;}
    tt.classList.remove('on');
    bbMsg.textContent='Esplora il campo numerico';
    curR.classList.remove('xl');
  }

  requestAnimationFrame(draw);
}
draw();

// ═══════════════════════════════════════════════════════
// MOTORE MICCIA CC — usato da intro, topbar, panel watermark
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
let _nextDrawAt=null;
let _nextDrawLoading=false;

function fallbackNextDrawDate(){
  const now=new Date(),t=new Date();t.setHours(20,0,0,0);
  const d=(6-t.getDay()+7)%7||7;t.setDate(t.getDate()+(t.getDay()===6&&now<t?0:d));
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

function _applyJackpot(payload){
  var jkEl=document.getElementById('v8-jackpot');
  if(!jkEl) return;
  if(!payload||typeof payload!=='object'){
    jkEl.textContent='Jackpot N/D';
    return;
  }
  var jk=payload.jackpot_eur||payload.jackpot_str||null;
  jkEl.textContent=jk?'Jackpot '+jk:'Jackpot N/D';
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
      // Usa la data solo se è nel futuro — se passata usa il fallback calendario
      if(parsed && parsed>new Date()) _nextDrawAt=parsed;
      _applyJackpot(payload);
    })
    .catch(function(){})
    .finally(function(){_nextDrawLoading=false;});
}

function upCd(){
  const now=new Date();
  const target=_nextDrawAt||fallbackNextDrawDate();
  let diff=Math.max(0,target-now);
  const h=Math.floor(diff/3600000);diff%=3600000;
  const m=Math.floor(diff/60000);diff%=60000;
  const s=Math.floor(diff/1000);
  const f=n=>String(n).padStart(2,'0');
  const el=document.getElementById('cd');
  if(el) el.textContent=`${f(h)}:${f(m)}:${f(s)}`;

  if(diff===0) fetchNextDrawDate();
}
setInterval(upCd,1000);upCd();
fetchNextDrawDate();
setInterval(fetchNextDrawDate,300000);

// ─── PANELS
const PANELS={
  est:{
    kicker:'',
    title:'I numeri<br>estratti',
    sub:'',
    body:()=>`
      <div class="p-sec">Numeri estratti</div>
      <div class="ball-row">
        ${LAST.map(n=>`<div class="pball ${HOT.includes(n)?'hot':COLD.includes(n)?'cold':''}">${n}</div>`).join('')}
        ${JOLLY!==null?`<div class="pball jolly">★${JOLLY}</div>`:''}
      </div>
      <div class="p-sec">Info estrazione</div>
      <div class="sr"><span class="sr-k">Concorso</span><span class="sr-v">#${String(DRAW_ID).padStart(3,'0')}</span></div>
      <div class="sr"><span class="sr-k">Data</span><span class="sr-v">${DRAW_DATE}</span></div>
      <div class="sr"><span class="sr-k">Numeri caldi estratti</span><span class="sr-v r">${LAST.filter(n=>HOT.includes(n)).join(' · ')||'--'}</span></div>
      <div class="sr"><span class="sr-k">Numeri freddi estratti</span><span class="sr-v v">${LAST.filter(n=>COLD.includes(n)).join(' · ')||'--'}</span></div>
      <div class="p-sec">Archivio</div>
      <div class="sr"><span class="sr-k">Estrazioni totali</span><span class="sr-v">${DRAWS_COUNT.toLocaleString('it-IT')}</span></div>
      <div class="sr"><span class="sr-k">Archivio dal</span><span class="sr-v">1997</span></div>
    `
  },
  alg:{
    kicker:'Classifica algoritmi',
    title:'Algoritmi<br>in gara',
    sub:'',
    body:()=>`
      <div class="p-sec">Algoritmi attivi</div>
      ${ALGOS.map(a=>`
        <div class="ar" onclick="window.location='${a.page||'pages/algoritmi/algs/'+a.id+'/'}'" style="cursor:pointer">
          <div class="ar-top">
            <span class="ar-rk">${String(a.r).padStart(2,'0')}</span>
            <span class="ar-nm">${a.n}</span>
            <span class="ar-sc" style="font-size:1.1rem;color:rgba(237,232,223,.35);font-family:'DM Mono',monospace">${a.group||''}</span>
          </div>
          <div class="ar-bar"><div class="ar-fill" data-w="${a.w}%" style="width:0"></div></div>
        </div>`).join('')}
    `
  },
  ses:{
    kicker:'Sestine proposte',
    title:'Proposte<br>per sabato',
    sub:'Una per ogni algoritmo attivo',
    body:()=> _sestine.length ? `
      <div class="p-sec">Sestine per il prossimo concorso</div>
      ${_sestine.map(s=>`
        <div class="lf" onclick="window.location='${'pages/algoritmi/algs/'+s.id+'/'}'" style="cursor:pointer">
          <span class="lf-n">${s.id.slice(0,6).toUpperCase()}</span>
          <span class="lf-t">${s.nums.join(' · ')}</span>
          <span class="lf-a" style="color:rgba(237,232,223,.3);font-size:1.1rem">${s.group}</span>
        </div>`).join('')}
      <div style="margin-top:1.6rem;font-size:1.1rem;color:rgba(237,232,223,.15);letter-spacing:.08em">
        Proposta algoritmica · Non una previsione · Il gioco comporta rischi
      </div>
    ` : `
      <div class="p-sec" style="color:rgba(237,232,223,.3)">Caricamento sestine...</div>
      <div style="padding:1.5rem 0;font-size:1.44rem;color:rgba(237,232,223,.25)">
        <a href="pages/sestine-proposte/" style="color:#8B5CF6;text-decoration:none">
          Apri pagina sestine →
        </a>
      </div>
    `
  },
  lab:{
    kicker:'Laboratorio Tecnico',
    title:'Per<br>l\'esperto',
    sub:'Strumenti avanzati di analisi statistica',
    body:()=>`
      <div class="p-sec">Accesso ai dati</div>
      <div class="lf" onclick="window.location='pages/laboratorio-tecnico/'" style="cursor:pointer"><span class="lf-n">F·01</span><span class="lf-t">Paper tecnici degli algoritmi</span><span class="lf-a">→</span></div>
      <div class="lf" onclick="window.location='pages/storico-estrazioni/'" style="cursor:pointer"><span class="lf-n">F·02</span><span class="lf-t">Archivio storico estrazioni</span><span class="lf-a">→</span></div>
      <div class="lf" onclick="window.location='pages/ranking/'" style="cursor:pointer"><span class="lf-n">F·03</span><span class="lf-t">Classifica algoritmi</span><span class="lf-a">→</span></div>
      <div class="lf" onclick="window.location='pages/analisi-statistiche/'" style="cursor:pointer"><span class="lf-n">F·04</span><span class="lf-t">Analisi statistiche</span><span class="lf-a">→</span></div>
      <div class="p-sec">Sistema iARGOS</div>
      <div class="sr"><span class="sr-k">Versione</span><span class="sr-v v">${_iargosStatus?.version||'--'}</span></div>
      <div class="sr"><span class="sr-k">Stato</span><span class="sr-v ${_iargosStatus?(_iargosStatus.overview_green?'g':'r'):''}">${_iargosStatus?(_iargosStatus.overview_green?'Operativo':(_iargosStatus.severity||'warning')):'--'}</span></div>
      <div class="sr"><span class="sr-k">Algoritmi allineati</span><span class="sr-v">${_iargosStatus?.runtime?(_iargosStatus.runtime.algorithms_aligned_count||'--')+' / '+(_iargosStatus.runtime.algorithms_total_count||'--'):'--'}</span></div>
      <div class="sr"><span class="sr-k">Estrazioni archiviate</span><span class="sr-v">${DRAWS_COUNT||'--'}</span></div>
    `
  }
};

// ─── PANEL ENGINE
const panel=document.getElementById('panel');
const pKick=document.getElementById('p-kicker');
const pTitle=document.getElementById('p-title');
const pSub=document.getElementById('p-subtitle');
const pBody=document.getElementById('p-body');
const pCls=document.getElementById('p-cls');

function openPanel(id){
  const p=PANELS[id];if(!p)return;
  pKick.textContent=p.kicker;
  pTitle.innerHTML=p.title;
  pSub.textContent=p.sub;
  pBody.innerHTML=p.body();
  panel.classList.add('open');
  setTimeout(()=>{
    pBody.querySelectorAll('[data-w]').forEach(b=>{b.style.width=b.dataset.w;});
  },80);
}

if(pCls) pCls.addEventListener('click',()=>{
  panel.classList.remove('open');
  document.querySelectorAll('.si').forEach(s=>s.classList.remove('on'));
});

document.querySelectorAll('.si[data-p]').forEach(s=>{
  s.addEventListener('click',()=>{
    document.querySelectorAll('.si').forEach(i=>i.classList.remove('on'));
    s.classList.add('on');openPanel(s.dataset.p);
  });
});

const oraBtn=document.getElementById('ora-btn');
const ov=document.getElementById('ov');
const ovCls=document.getElementById('ov-cls');
if(oraBtn) oraBtn.addEventListener('click',()=>{
  document.querySelectorAll('.si').forEach(i=>i.classList.remove('on'));
  oraBtn.classList.add('on');ov.classList.add('on');
});
if(ovCls) ovCls.addEventListener('click',()=>{ov.classList.remove('on');oraBtn.classList.remove('on');});

// ─── V8 DATA INIT — attende che tutti i moduli siano pronti
function v8WaitAndInit(cb, attempts){
  attempts=attempts||0;
  if(window.V8_BRIDGE && window.CC_DATA_REPOSITORY && window.CARDS_INDEX){
    window.V8_BRIDGE.load().then(cb).catch(function(e){
      console.warn('[v8-main] V8_BRIDGE.load() failed:', e);
      // Procede con dati vuoti per non bloccare la UI
      cb({lastDraw:null,hotNums:[],coldNums:[],draws:[],cards:[]});
    });
  } else if(attempts<40){
    setTimeout(function(){v8WaitAndInit(cb,attempts+1);},100);
  } else {
    console.warn('[v8-main] Timeout attesa moduli V8_BRIDGE — avvio con dati vuoti');
    cb({lastDraw:null,hotNums:[],coldNums:[],draws:[],cards:[]});
  }
}

v8WaitAndInit(function(bundle){
  // Popola lo stato condiviso
  LAST  = bundle.lastDraw ? bundle.lastDraw.nums : [];
  HOT   = bundle.hotNums  || [];
  COLD  = bundle.coldNums || [];
  JOLLY = bundle.lastDraw ? bundle.lastDraw.jolly : null;
  DRAWS_COUNT = bundle.draws ? bundle.draws.length : 0;
  DRAW_ID     = bundle.lastDraw ? bundle.lastDraw.id   : '--';
  DRAW_DATE   = bundle.lastDraw ? bundle.lastDraw.date : '--';

  // ALGOS da cards reali
  ALGOS = (bundle.cards||[]).map(function(c,i){
    return {
      r:i+1,
      n:c.title||c.id,
      id:c.id,
      page:c.page||('pages/algoritmi/algs/'+c.id+'/'),
      group:c.macroGroup||'',
      w:60  // barra placeholder — metrica reale in fase successiva
    };
  });

  // Aggiorna PANELS.est e PANELS.alg kicker/sub con dati reali
  PANELS.est.kicker = `Ultima estrazione · #${String(DRAW_ID).padStart(3,'0')}`;
  PANELS.est.sub    = DRAW_DATE;
  PANELS.alg.sub    = `${ALGOS.length} algoritmi attivi`;

  // Aggiorna topbar
  var algCount=document.getElementById('v8-alg-count');
  if(algCount) algCount.textContent=ALGOS.length+' Algoritmi';

  // Costruisce il campo numerico con dati reali
  buildCells();
  // Usa numStats pre-calcolato dal backend se disponibile (fast path),
  // altrimenti calcola dal CSV completo (fallback)
  if(bundle.numStats && Object.keys(bundle.numStats).length===90){
    NUM_STATS=bundle.numStats;
  } else {
    NUM_STATS=computeNumStats(bundle.draws||[]);
  }
  DRAWS_COUNT=bundle.totalDraws||bundle.draws.length||DRAWS_COUNT;

  window.V8_BRIDGE.loadSestine(bundle.cards || [])
    .then(function(ses){ _sestine = ses; })
    .catch(function(){});

  // Carica dati iARGOS (asincrono, non bloccante) — cachati in _iargosStatus
  // Il panel Lab li legge da _iargosStatus al momento del render
  if(window.CC_DATA_REPOSITORY){
    window.CC_DATA_REPOSITORY.fetchJson('data/iargos-public-status.json')
      .then(function(status){ if(status) _iargosStatus=status; })
      .catch(function(){});
  }

  // Avvia motori CC logo
  buildCCEngine(document.getElementById('cc-intro'),{speed:1.2,pause:90});
  buildCCEngine(document.getElementById('cc-logo'), {speed:1.8,pause:60});
  buildCCEngine(document.getElementById('cc-panel'),{speed:1.4,pause:75});

  // Intro → Launch
  var intro=document.getElementById('intro');
  var ui=document.getElementById('ui');

  function launch(){
    if(alive)return;
    intro.classList.add('out');
    setTimeout(()=>{
      intro.style.display='none';
      ui.classList.add('on');
      alive=true;
      cells.forEach(c=>{c.t=0;});
      openPanel('est');
    },1600);
  }
  setTimeout(launch,3500);
  document.addEventListener('click',launch);
  document.addEventListener('keydown',launch);
});
