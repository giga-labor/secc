(function(){
  'use strict';

  function buildCloud(opts){
    const {
      text,
      coordToNodePos,
      coord,
      offset,
      right,
      up,
      face,
      worldW,
      worldH,
      maxPoints,
      acceptByAlpha
    }=opts||{};
    if(typeof coordToNodePos!=='function'){
      return { pos:new Float32Array(0), seed:new Float32Array(0), lum:new Float32Array(0), n:0, anchor:[0,0,0] };
    }

    const cv=document.createElement('canvas');
    cv.width=2300;
    cv.height=440;
    const ctx=cv.getContext('2d');

    ctx.clearRect(0,0,cv.width,cv.height);
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.font='900 300px "Rajdhani", "Orbitron", sans-serif';
    ctx.fillStyle='rgba(255,255,255,0.98)';
    ctx.shadowColor='rgba(255,255,255,0.32)';
    ctx.shadowBlur=7;
    ctx.fillText(String(text||'ControlChaos'), cv.width*0.5, cv.height*0.54);

    const data=ctx.getImageData(0,0,cv.width,cv.height).data;
    const base=coordToNodePos(coord||{r:7000, az:7.5, ril:208});
    const off=Array.isArray(offset) && offset.length===3 ? offset : [190,68,-142];
    const anchor=[base[0]+off[0], base[1]+off[1], base[2]+off[2]];

    const pos=[];
    const seed=[];
    const lum=[];
    const candidates=[];
    const step=2;
    const ww=Number.isFinite(worldW)?worldW:560;
    const wh=Number.isFinite(worldH)?worldH:128;
    const cap=Math.max(1000, Number(maxPoints)||22000);
    const alphaFn=(typeof acceptByAlpha==='function')
      ? acceptByAlpha
      : ((aa)=>Math.random()<=(0.08 + 0.54*aa));

    for(let y=0;y<cv.height;y+=step){
      for(let x=0;x<cv.width;x+=step){
        const i=((y*cv.width+x)<<2);
        const aa=(data[i+3]||0)/255;
        if(aa<0.08) continue;
        if(!alphaFn(aa)) continue;
        candidates.push({x,y,aa});
      }
    }

    const count=Math.max(1, candidates.length);
    const target=Math.min(cap, count);
    for(let k=0;k<target;k++){
      const idx=Math.min(
        count-1,
        Math.floor(((k + Math.random()*0.35)/target) * count)
      );
      const pnt=candidates[idx];
      if(!pnt) continue;
      const x=pnt.x;
      const y=pnt.y;
      const aa=pnt.aa;
        const nx=(x/cv.width-0.5)*2;
        const ny=(0.5-y/cv.height)*2;
        const lx=nx*ww + (Math.random()*2-1)*(1.05 + (1-aa)*1.45);
        const ly=ny*wh + (Math.random()*2-1)*(0.95 + (1-aa)*1.30);
        const lz=(Math.random()*2-1)*(8.0 + (1-aa)*5.0) + 2.6*Math.sin(nx*6.0 + ny*2.4);

        if(Array.isArray(right) && right.length===3 && Array.isArray(up) && up.length===3 && Array.isArray(face) && face.length===3){
          const wx=anchor[0] + right[0]*lx + up[0]*ly + face[0]*lz;
          const wy=anchor[1] + right[1]*lx + up[1]*ly + face[1]*lz;
          const wz=anchor[2] + right[2]*lx + up[2]*ly + face[2]*lz;
          pos.push(wx,wy,wz);
        }else{
          pos.push(anchor[0]+lx, anchor[1]+ly, anchor[2]+lz);
        }
        seed.push(Math.random());
        lum.push(0.42 + aa*0.46 + Math.random()*0.12);
    }

    return {
      pos:new Float32Array(pos),
      seed:new Float32Array(seed),
      lum:new Float32Array(lum),
      n:pos.length/3,
      anchor
    };
  }

  window.SECC_COSMIC_WORD=Object.freeze({
    buildCloud
  });
})();
