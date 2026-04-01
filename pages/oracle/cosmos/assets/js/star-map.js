/* Fixed deterministic star map (background layers + real stars). */
(function(){
  'use strict';
  const TAU=Math.PI*2;

  function makeRng(seed){
    let s=(seed|0) || 1;
    return function(){
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s>>>0) / 4294967296);
    };
  }
  function randDir(rng){
    const z=rng()*2-1;
    const a=rng()*TAU;
    const rr=Math.sqrt(Math.max(0,1-z*z));
    return [Math.cos(a)*rr, z, Math.sin(a)*rr];
  }
  function randCol(rng){
    const t=rng();
    if(t<0.67) return [1.00,0.98,0.93];
    if(t<0.84) return [0.74,0.86,1.00];
    return [1.00,0.90,0.72];
  }

  const BG_COUNT=3200;
  const bgDir=new Array(BG_COUNT*3);
  const bgRad=new Array(BG_COUNT);
  const bgCol=new Array(BG_COUNT*3);
  const bgSeed=new Array(BG_COUNT);
  {
    const rng=makeRng(0x79f3a11d);
    for(let i=0;i<BG_COUNT;i++){
      const d=randDir(rng);
      const i3=i*3;
      bgDir[i3]=d[0];
      bgDir[i3+1]=d[1];
      bgDir[i3+2]=d[2];
      bgRad[i]=220 + Math.pow(rng(),0.35)*1800;
      const c=randCol(rng);
      const b=0.55 + Math.pow(rng(),0.35)*0.85;
      bgCol[i3]=c[0]*b;
      bgCol[i3+1]=c[1]*b;
      bgCol[i3+2]=c[2]*b;
      bgSeed[i]=rng();
    }
  }

  const REAL_COUNT=920;
  const realPos=new Array(REAL_COUNT*3);
  const realCol=new Array(REAL_COUNT*3);
  const realSeed=new Array(REAL_COUNT);
  const realLum=new Array(REAL_COUNT);
  {
    const rng=makeRng(0x5d1ec0de);
    for(let i=0;i<REAL_COUNT;i++){
      const d=randDir(rng);
      const rr=22000 + Math.pow(rng(),0.50)*38000; // 2200..6000 UA
      const i3=i*3;
      realPos[i3]=d[0]*rr;
      realPos[i3+1]=d[1]*rr*0.30;
      realPos[i3+2]=d[2]*rr;
      const c=randCol(rng);
      realCol[i3]=c[0];
      realCol[i3+1]=c[1];
      realCol[i3+2]=c[2];
      realSeed[i]=rng();
      realLum[i]=0.36 + Math.pow(rng(),0.52)*0.98;
    }
  }

  window.SECC_STAR_MAP=Object.freeze({
    version: 1,
    layers: Object.freeze({
      background: Object.freeze([
        Object.freeze({ alpha:0.30, radMul:0.72, sizeMul:1.35, tw:0.0 }),
        Object.freeze({ alpha:0.40, radMul:1.00, sizeMul:1.00, tw:1.9 }),
        Object.freeze({ alpha:0.56, radMul:1.55, sizeMul:0.82, tw:3.8 })
      ])
    }),
    background: Object.freeze({
      count: BG_COUNT,
      dir: bgDir,
      rad: bgRad,
      col: bgCol,
      seed: bgSeed
    }),
    real: Object.freeze({
      count: REAL_COUNT,
      pos: realPos,
      col: realCol,
      seed: realSeed,
      lum: realLum
    })
  });
})();
