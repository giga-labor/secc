// engine-math.js — Libreria matematica del motore 3D WebGL
// Espone window.SECC_MATH con:
//   - Scalari: clamp, lerp
//   - Matrici 4x4 column-major (Float32Array[16]): m4, idt, mul, persp, lookat,
//               tmat, smat, rY, rX, rZ, xfm3
//   - Vettori 3D: vadd, vsub, vscl, vdot, vcross, vnorm, vlerp, proj3
(function(){
  'use strict';

  // ─── SCALARI ─────────────────────────────────────────────────────────────
  function clamp(v,a,b){ return v<a?a:v>b?b:v; }
  function lerp(a,b,t){ return a+(b-a)*t; }

  // ─── MATRICI 4x4 (column-major Float32Array[16]) ─────────────────────────
  // c=colonna, r=riga → index = c*4+r
  function m4(){ return new Float32Array(16); }
  function idt(){ const m=m4(); m[0]=m[5]=m[10]=m[15]=1; return m; }

  function mul(a,b){
    const o=m4();
    for(let c=0;c<4;c++) for(let r=0;r<4;r++){
      o[c*4+r]=a[0*4+r]*b[c*4+0]+a[1*4+r]*b[c*4+1]+a[2*4+r]*b[c*4+2]+a[3*4+r]*b[c*4+3];
    }
    return o;
  }

  function persp(fov,asp,n,f){
    const m=m4(); const t=Math.tan(fov/2);
    m[0]=1/(t*asp); m[5]=1/t;
    m[10]=(f+n)/(n-f); m[11]=-1;
    m[14]=2*f*n/(n-f);
    return m;
  }

  function lookat(ex,ey,ez, cx,cy,cz){
    // z = normalize(eye - center)
    let zx=ex-cx, zy=ey-cy, zz=ez-cz;
    let zl=Math.sqrt(zx*zx+zy*zy+zz*zz)||1;
    zx/=zl; zy/=zl; zz/=zl;
    // x = normalize(up × z), up=[0,1,0]
    // up×z = [zz, 0, -zx]
    let xx=zz, xy=0, xz=-zx;
    let xl=Math.sqrt(xx*xx+xy*xy+xz*xz)||1;
    xx/=xl; xy/=xl; xz/=xl;
    // y = z × x
    const yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
    const m=m4();
    // col0=[xx,yx,zx,0], col1=[xy,yy,zy,0], col2=[xz,yz,zz,0]
    m[0]=xx;  m[1]=yx;  m[2]=zx;  m[3]=0;
    m[4]=xy;  m[5]=yy;  m[6]=zy;  m[7]=0;
    m[8]=xz;  m[9]=yz;  m[10]=zz; m[11]=0;
    m[12]=-(xx*ex+xy*ey+xz*ez);
    m[13]=-(yx*ex+yy*ey+yz*ez);
    m[14]=-(zx*ex+zy*ey+zz*ez);
    m[15]=1;
    return m;
  }

  function tmat(x,y,z){ const m=idt(); m[12]=x;m[13]=y;m[14]=z; return m; }
  function smat(s){ const m=idt(); m[0]=s; m[5]=s; m[10]=s; return m; }
  function rY(a){ const m=idt(),c=Math.cos(a),s=Math.sin(a); m[0]=c;m[2]=s;m[8]=-s;m[10]=c; return m; }
  function rX(a){ const m=idt(),c=Math.cos(a),s=Math.sin(a); m[5]=c;m[6]=-s;m[9]=s;m[10]=c; return m; }
  function rZ(a){ const m=idt(),c=Math.cos(a),s=Math.sin(a); m[0]=c;m[1]=-s;m[4]=s;m[5]=c; return m; }

  function xfm3(m,x,y,z){
    return[
      m[0]*x+m[4]*y+m[8]*z+m[12],
      m[1]*x+m[5]*y+m[9]*z+m[13],
      m[2]*x+m[6]*y+m[10]*z+m[14],
    ];
  }

  // ─── VETTORI 3D ──────────────────────────────────────────────────────────
  function vadd(a,b){return[a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
  function vsub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
  function vscl(a,s){return[a[0]*s,a[1]*s,a[2]*s];}
  function vdot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
  function vcross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function vnorm(a){const l=Math.sqrt(vdot(a,a))||1;return vscl(a,1/l);}
  function vlerp(a,b,t){return[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];}

  // Proietta un punto mondo → NDC usando view+projection precompilate
  function proj3(pt,view,pr){
    const vp=mul(pr,view);
    const x=pt[0],y=pt[1],z=pt[2];
    const rw=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];
    if(Math.abs(rw)<1e-5) return null;
    return[
      (vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/rw,
      (vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/rw,
      (vp[2]*x+vp[6]*y+vp[10]*z+vp[14])/rw
    ];
  }

  window.SECC_MATH = Object.freeze({
    clamp, lerp,
    m4, idt, mul, persp, lookat,
    tmat, smat, rY, rX, rZ, xfm3,
    vadd, vsub, vscl, vdot, vcross, vnorm, vlerp, proj3
  });
})();
