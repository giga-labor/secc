(function(){'use strict';
var C=document.getElementById('intro-showcase'),FW=document.getElementById('intro-fw');
if(!C||!FW)return;
var ctx=FW.getContext('2d'),W,H;
function rFw(){W=FW.width=innerWidth;H=FW.height=innerHeight;}
rFw();addEventListener('resize',rFw);

var EK='cc-engagement',eng={visits:0,pages:[],time:0,score:0};
try{var r=localStorage.getItem(EK);if(r){var p=JSON.parse(r);eng.visits=p.visits||0;eng.pages=Array.isArray(p.pages)?p.pages:[];eng.time=p.time||0;}}catch(e){}
eng.visits++;
var cp=location.pathname.replace(/\/index\.html$/i,'/');
if(eng.pages.indexOf(cp)<0)eng.pages.push(cp);
eng.score=eng.visits+eng.pages.length*2+Math.floor(eng.time/60)*0.5;
function sav(){try{localStorage.setItem(EK,JSON.stringify(eng));}catch(e){}}
sav();
var tI=setInterval(function(){eng.time+=10;eng.score=eng.visits+eng.pages.length*2+Math.floor(eng.time/60)*0.5;sav();},10000);
window._ccEngagement=eng;
var quickExit=eng.score>=50;
var brief=eng.score>=20;

var COL=['#C8391A','#F59E0B','#8B5CF6','#10B981','#3B82F6','#EC4899','#EDE8DF','#F97316'];
var WEL=eng.visits<=1?'Benvenuto':'Bentornato';
var PH=[WEL+' in ControlChaos','30+ algoritmi di analisi','Ranking in tempo reale','Storico completo estrazioni',
'Sestine proposte per ogni modello','Consenso numerico','Analisi statistiche avanzate','Reti neurali e modelli ibridi',
'Frequenze e ritardi','Laboratorio tecnico','Community e aggiornamenti','Oracle · Segnali visuali',
'Pattern e anomalie','4000+ estrazioni analizzate','Distribuzione e raggruppamento','Co-occorrenze e correlazioni',
'Tavole di probabilità','Nessuna promessa · Solo dati','90 numeri · Infinite combinazioni'];
var FF=["'BioRhyme',serif","'DM Mono',monospace","system-ui,sans-serif","Impact,sans-serif"];
var AN=['showcase-fadeUp','showcase-fadeDown','showcase-zoomIn','showcase-slideLeft','showcase-slideRight','showcase-rotateIn','showcase-flip3d','showcase-swing3d'];
var FX3D=[
function(co){return'text-shadow:2px 2px 0 rgba(0,0,0,.8),-1px -1px 0 rgba(0,0,0,.5),4px 4px 8px rgba(0,0,0,.4),0 0 20px '+co+'66;-webkit-text-stroke:1px rgba(0,0,0,.3);'},
function(co){return'text-shadow:0 1px 0 #ccc,0 2px 0 #bbb,0 3px 0 #aaa,0 4px 0 #999,0 5px 0 #888,0 6px 6px rgba(0,0,0,.4),0 0 25px '+co+'55;'},
function(co){return'text-shadow:3px 3px 0 rgba(0,0,0,.7),6px 6px 0 rgba(0,0,0,.3),0 0 15px '+co+'44;-webkit-text-stroke:1.5px rgba(0,0,0,.4);'},
function(co){return'text-shadow:0 0 10px '+co+',0 0 30px '+co+'88,0 0 60px '+co+'44,2px 2px 0 rgba(0,0,0,.9);'},
function(co){return'text-shadow:1px 1px 0 rgba(255,255,255,.3),-1px -1px 0 rgba(0,0,0,.7),3px 3px 6px rgba(0,0,0,.5),0 0 20px '+co+'55;background:linear-gradient(180deg,'+co+','+co+'88);-webkit-background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(2px 4px 3px rgba(0,0,0,.6));'}
];

var AB=[];
function ov(b){for(var i=0;i<AB.length;i++){var a=AB[i];if(b.x<a.x+a.w&&b.x+b.w>a.x&&b.y<a.y+a.h&&b.y+b.h>a.y)return true;}return false;}
function fP(w,h){
var m=20,cz={x:innerWidth*.2,y:innerHeight*.15,w:innerWidth*.6,h:innerHeight*.5};
for(var t=0;t<30;t++){
var x=m+Math.random()*(innerWidth-w-m*2),y=m+Math.random()*(innerHeight-h-m*2);
var b={x:x,y:y,w:w,h:h},cx=x+w/2,cy=y+h/2;
if(!(cx>cz.x&&cx<cz.x+cz.w&&cy>cz.y&&cy<cz.y+cz.h)&&!ov(b))return b;
}
var fx=Math.max(m,Math.min(m+Math.random()*(innerWidth-w-m*2),innerWidth-w-m));
var fy=Math.max(m,Math.min(m+Math.random()*(innerHeight-h-m*2),innerHeight-h-m));
return{x:fx,y:fy,w:w,h:h};
}

var pts=[];
function boom(cx,cy){
var n=12+Math.floor(Math.random()*10);
for(var i=0;i<n;i++){
var a=(Math.PI*2*i)/n+(Math.random()-.5)*.4,sp=1.5+Math.random()*3;
pts.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1,
num:String(Math.floor(Math.random()*90)+1).padStart(2,'0'),
color:COL[Math.floor(Math.random()*COL.length)],alpha:1,
size:14+Math.random()*18,life:60+Math.floor(Math.random()*40),age:0,
rot:Math.random()*Math.PI*2,rs:(Math.random()-.5)*.1});
}}

var fwOn=false;
function tick(){
if(!fwOn)return;ctx.clearRect(0,0,W,H);
for(var i=pts.length-1;i>=0;i--){
var q=pts[i];q.age++;if(q.age>q.life){pts.splice(i,1);continue;}
q.x+=q.vx;q.y+=q.vy;q.vy+=.03;q.vx*=.99;q.rot+=q.rs;
q.alpha=Math.max(0,1-q.age/q.life);
ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.rot);ctx.globalAlpha=q.alpha;
ctx.font='bold '+q.size+'px "DM Mono",monospace';ctx.fillStyle=q.color;
ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(q.num,0,0);ctx.restore();
}
requestAnimationFrame(tick);
}
function eFw(){if(!fwOn){fwOn=true;tick();}}

var usd=[],pq=[];
function pick(){
if(!pq.length){pq=PH.slice();
if(!usd.length){var wi=pq.indexOf(WEL+' in ControlChaos');if(wi>0){pq.splice(wi,1);pq.unshift(WEL+' in ControlChaos');}}
else{for(var i=pq.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=pq[i];pq[i]=pq[j];pq[j]=t;}}
}var ph=pq.shift();usd.push(ph);return ph;}

var stopped=false;
function spawn(){
if(stopped)return;
var tx=pick(),el=document.createElement('div');el.className='intro-float-text';el.textContent=tx;
var isWel=tx.indexOf(WEL)===0;
var fs=isWel?(52+Math.floor(Math.random()*20)):(28+Math.floor(Math.random()*32));
var ff=isWel?"Impact,sans-serif":FF[Math.floor(Math.random()*FF.length)];
var co=isWel?'#F59E0B':COL[Math.floor(Math.random()*COL.length)];
var an=isWel?'showcase-zoomIn':AN[Math.floor(Math.random()*AN.length)];
var fx=isWel?'text-shadow:0 0 20px #F59E0B,0 0 50px #F59E0Baa,0 0 80px #F59E0B55,3px 3px 0 rgba(0,0,0,.9),-1px -1px 0 rgba(0,0,0,.7);-webkit-text-stroke:2px rgba(0,0,0,.4);':FX3D[Math.floor(Math.random()*FX3D.length)](co);
var up=isWel?true:Math.random()>.4,ital=Math.random()>.7;
var persp=(!isWel&&Math.random()>.5)?'transform:perspective(500px) rotateY('+(Math.random()*16-8)+'deg) rotateX('+(Math.random()*10-5)+'deg);':'';
var bgA=isWel?'0.35':(.12+Math.random()*.18).toFixed(2);
el.style.cssText='font-size:'+fs+'px;font-family:'+ff+';color:'+co+';font-weight:800;'+
'padding:.15em .45em;border-radius:6px;background:rgba(0,0,0,'+bgA+');'+
'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);'+
(up?'text-transform:uppercase;letter-spacing:.12em;':'letter-spacing:.04em;')+
(ital&&!isWel?'font-style:italic;':'')+fx+persp+
'animation:'+an+' .8s cubic-bezier(.23,1,.32,1) both;';
C.appendChild(el);
var rc=el.getBoundingClientRect(),bx=fP(rc.width+10,rc.height+10);
bx.x=Math.max(5,Math.min(bx.x,innerWidth-rc.width-5));
bx.y=Math.max(5,Math.min(bx.y,innerHeight-rc.height-5));
el.style.left=bx.x+'px';el.style.top=bx.y+'px';AB.push(bx);
var vt=quickExit?2800:brief?(2500+Math.random()*1500):(3500+Math.random()*2500);
setTimeout(function(){
if(stopped)return;
var rr=el.getBoundingClientRect();
el.style.animation='showcase-explode .4s forwards';
eFw();boom(rr.left+rr.width/2,rr.top+rr.height/2);
if(isWel){try{window.dispatchEvent(new Event('intro-welcome-done'));}catch(e){}}
setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);var ix=AB.indexOf(bx);if(ix>=0)AB.splice(ix,1);
if(isWel&&quickExit)stop();},450);
},vt);
}

var sT=null,iD=brief?1800:3500,sR=brief?2200:3500,sJ=brief?800:1500;
function start(){
if(quickExit){setTimeout(function(){if(!stopped)spawn();},800);return;}
setTimeout(function(){if(stopped)return;spawn();
sT=setInterval(function(){if(stopped)return;spawn();
if(!brief&&Math.random()>.6&&AB.length<3)setTimeout(function(){if(!stopped)spawn();},300);
},sR+Math.random()*sJ);
},iD);
}

function stop(){
stopped=true;if(sT)clearInterval(sT);clearInterval(tI);
while(C.firstChild)C.removeChild(C.firstChild);
AB.length=0;
setTimeout(function(){fwOn=false;ctx.clearRect(0,0,W,H);},2000);
}

window._introShowcaseStop=stop;
start();
})();
