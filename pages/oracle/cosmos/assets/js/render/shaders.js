// shaders.js — Sorgenti GLSL del motore 3D WebGL
// Espone window.SECC_SHADERS con tutte le stringhe vertex/fragment shader.
// Nessuna dipendenza esterna.
(function(){
  'use strict';

  // ─── MARBLE / SPHERE ─────────────────────────────────────────────────────
  const MBL_VS=`
attribute vec3 a_pos;
attribute vec3 a_nrm;
attribute vec2 a_uv;
uniform mat4 u_mvp;
uniform mat4 u_model;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUV;
void main(){
  mat3 nm = mat3(u_model[0].xyz, u_model[1].xyz, u_model[2].xyz);
  vN = nm * a_nrm;
  vW = (u_model * vec4(a_pos,1.0)).xyz;
  vUV = a_uv;
  gl_Position = u_mvp * vec4(a_pos,1.0);
}`;

  const MBL_FS=`
precision highp float;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUV;
uniform vec3 u_eye;
uniform vec3 u_tint;
uniform float u_time;
uniform sampler2D u_numTex;
uniform float u_sysA;

void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(u_eye - vW);
  float NV = clamp(dot(N,V),0.0,1.0);

  vec3 goldBase = vec3(0.95,0.78,0.22);
  vec3 tintBase = clamp(u_tint*1.25, 0.0, 1.0);
  vec3 albedo = mix(goldBase, tintBase, 0.68);

  vec3 L0 = normalize(vec3(0.6,1.8,1.2));
  float d0 = max(dot(N,L0),0.0);
  vec3 H0 = normalize(V+L0);
  float s0 = pow(max(dot(N,H0),0.0), 95.0);

  vec3 L1 = normalize(vec3(-1.4,0.5,0.2));
  float d1 = max(dot(N,L1),0.0);
  vec3 H1 = normalize(V+L1);
  float s1 = pow(max(dot(N,H1),0.0), 38.0);

  vec3 L2 = normalize(vec3(0.3,0.1,-1.6));
  float d2 = max(dot(N,L2),0.0);

  vec3 diff = albedo*(
    d0*vec3(1.0,0.90,0.55)*1.15 +
    d1*vec3(0.22,0.38,0.72)*0.38 +
    d2*tintBase*0.34
  );

  vec3 sc = mix(vec3(1.0,0.95,0.52),tintBase,0.42);
  vec3 spec = sc*(s0*2.8+s1*0.5);
  vec3 amb = albedo*vec3(0.04,0.05,0.09);

  float fr = pow(1.0-NV,3.2);
  vec3 rim = tintBase*fr*2.35;

  vec3 R = reflect(-V,N);
  float envH = exp(-abs(R.y)*3.5)*0.5;
  float envT = pow(max(R.y,0.0),5.0)*0.85;
  vec3 env = vec3(1.0,0.95,0.62)*(envH+envT)*(0.22+fr*0.78);

  float sss = pow(max(-dot(N,V),0.0),2.0);
  vec3 inner = tintBase*sss*0.42;

  vec3 col = amb+diff+spec+rim+env+inner;

  vec2 dUV = vec2(1.0 - vUV.x, vUV.y);
  vec2 tUV = (dUV - 0.5) * 2.25 + 0.5;
  if(tUV.x > 0.0 && tUV.x < 1.0 && tUV.y > 0.0 && tUV.y < 1.0){
    vec4 numSample = texture2D(u_numTex, tUV);
    float numA = numSample.a * 0.98;
    vec3 texCol = pow(clamp(numSample.rgb,0.0,1.0), vec3(2.2));
    texCol *= (0.82 + 0.18*NV);
    col = mix(col, texCol, numA);
  }

  col = col/(col+1.0);
  col = pow(max(col,vec3(0.0)),vec3(0.4545));
  gl_FragColor = vec4(col*u_sysA,0.98*u_sysA);
}`;

  // ─── ORBIT DUST ───────────────────────────────────────────────────────────
  const DST_VS=`
attribute vec3 a_pos;
attribute float a_seed;
uniform mat4 u_vp;
uniform mat4 u_sys;
uniform vec3 u_cam;
uniform float u_t;
varying float vS;
varying float vD;
void main(){
  vec3 wp = (u_sys * vec4(a_pos,1.0)).xyz;
  vec3 d = wp - u_cam;
  float dist = length(d);
  vD = dist;
  vS = a_seed;
  float tw = 0.72 + 0.28*sin(u_t*3.2 + a_seed*23.0);
  gl_PointSize = clamp((7.0*tw)/(0.23 + dist*0.052), 1.0, 6.8);
  gl_Position = u_vp*vec4(wp,1.0);
}`;
  const DST_FS=`
precision highp float;
uniform vec3 u_col;
uniform float u_t;
uniform float u_alpha;
uniform float u_sysA;
varying float vS;
varying float vD;
void main(){
  vec2 pc = gl_PointCoord - vec2(0.5);
  float r = length(pc);
  if(r>0.5) discard;
  float core = pow(max(0.0,1.0-r*2.0),1.35);
  float spark = 0.78 + 0.42*sin(vS*39.0 + u_t*5.8 + vD*0.04);
  float halo = pow(max(0.0,1.0-r*2.0), 3.2);
  vec3 c = mix(u_col*0.72, vec3(1.0,0.98,0.92), core*0.58);
  float a = (core*0.95 + halo*0.55) * spark * u_alpha * u_sysA;
  gl_FragColor = vec4(c, a);
}`;

  // ─── PARTICLES ────────────────────────────────────────────────────────────
  const PRT_VS=`
attribute vec3 a_pos;
uniform mat4 u_vp;
uniform vec3 u_cam;
void main(){
  float d=length(a_pos-u_cam);
  gl_PointSize=clamp(2.2-d*0.012,0.4,2.2);
  gl_Position=u_vp*vec4(a_pos,1.0);
}`;
  const PRT_FS=`
precision mediump float;
void main(){
  float d=length(gl_PointCoord-0.5);
  if(d>0.5)discard;
  gl_FragColor=vec4(1.0,0.93,0.68,(1.0-d*2.0)*0.32);
}`;

  // ─── BACKGROUND STARS ─────────────────────────────────────────────────────
  const STR_VS=`
attribute vec3 a_dir;
attribute float a_rad;
attribute vec3 a_col;
attribute float a_seed;
uniform mat4 u_vp;
uniform vec3 u_cam;
uniform float u_t;
uniform float u_alpha;
uniform float u_radMul;
uniform float u_sizeMul;
uniform float u_twOff;
varying vec3 vCol;
varying float vA;
void main(){
  vec3 wp = u_cam + a_dir * (a_rad*u_radMul);
  float tw = 0.90 + 0.10*sin(u_t*1.2 + a_seed*41.0 + u_twOff);
  float b = 0.35 + 0.65*a_seed;
  float size = (1.2 + 4.8*b) * tw * u_sizeMul * (920.0/(a_rad*u_radMul + 40.0));
  gl_PointSize = clamp(size, 0.7, 4.8);
  vCol = a_col;
  vA = u_alpha * (0.18 + 0.82*b) * (0.60 + 0.40*tw);
  gl_Position = u_vp * vec4(wp,1.0);
}`;
  const STR_FS=`
precision mediump float;
varying vec3 vCol;
varying float vA;
void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  if(r>0.5) discard;
  float core = exp(-r*r*12.0);
  float halo = pow(max(0.0, 1.0 - r*2.0), 2.4);
  float a = (core*0.75 + halo*0.35) * vA;
  gl_FragColor = vec4(vCol, a);
}`;

  // ─── REAL (PHYSICAL) STARS ────────────────────────────────────────────────
  const RSTR_VS=`
attribute vec3 a_pos;
attribute vec3 a_col;
attribute float a_seed;
attribute float a_lum;
uniform mat4 u_vp;
uniform vec3 u_cam;
uniform float u_t;
uniform float u_sizeMul;
uniform float u_pxPerRad;
varying vec3 vCol;
varying float vSeed;
void main(){
  vec3 dv = a_pos - u_cam;
  float d = max(1.0, length(dv));
  // Apparent diameter from angular size: stars shrink naturally with distance.
  // 1 UA = 10 WU, solar radius ~= 0.00465 UA => 0.0465 WU.
  float solarRwu = 0.0465;
  float s0 = fract(sin(a_seed*43758.5453123 + 17.13)*19642.3493);
  float s1 = fract(sin(a_seed*12497.113 + 3.71)*8342.7719);
  float classJit = 0.82 + 0.40*s0; // intrinsic spread: stars are not all same size class.
  float varAmp = 0.008 + 0.040*clamp(a_lum, 0.25, 1.80); // giants vary a bit more.
  float cycA = sin(u_t*(0.06 + 0.10*s1) + a_seed*41.7);
  float cycB = sin(u_t*(0.015 + 0.045*s0) + a_seed*89.3);
  float pulse = 1.0 + varAmp*(0.64*cycA + 0.36*cycB);
  float starRwu = solarRwu * (0.80 + 7.20*clamp(a_lum,0.25,1.80)) * classJit * pulse;
  float angRadius = atan(starRwu / d);
  float pxRadius = max(0.0, angRadius * u_pxPerRad);
  float size = max(1.0, pxRadius*2.0) * u_sizeMul;
  gl_PointSize = clamp(size, 1.0, 1280.0);
  float atten = 1.0/(1.0 + d*0.00048 + d*d*0.000000008);
  vCol = a_col;
  vSeed = a_seed;
  gl_Position = u_vp * vec4(a_pos,1.0);
}`;
const RSTR_FS=`
precision mediump float;
varying vec3 vCol;
varying float vSeed;
float hash21(vec2 p){
  p = fract(p*vec2(123.34, 456.21));
  p += dot(p, p+45.32);
  return fract(p.x*p.y);
}
float n2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash21(i);
  float b=hash21(i+vec2(1.0,0.0));
  float c=hash21(i+vec2(0.0,1.0));
  float d=hash21(i+vec2(1.0,1.0));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float s=0.0, a=0.55;
  mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<4;i++){
    s += a*n2(p);
    p = m*p + 0.37;
    a *= 0.5;
  }
  return s;
}
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float rr = dot(p,p);
  if(rr>1.0) discard;
  float mu = sqrt(max(0.0, 1.0-rr));
  float limb = 0.18 + 0.82*pow(mu, 0.88);
  float f0 = fbm(p*17.0 + vec2(vSeed*31.0, vSeed*57.0));
  float f1 = fbm(p*33.0 + vec2(vSeed*73.0, vSeed*19.0));
  float flames = clamp(0.66 + (f0-0.5)*0.44 + (f1-0.5)*0.20, 0.35, 1.45);

  // Fire material with star-dependent spectral tint.
  // vCol drives the hue family (cool/hot stars) while keeping a fiery plasma gradient.
  vec3 spec = clamp(vCol, 0.0, 1.0);
  float cool = clamp((spec.b - spec.r) * 1.2 + 0.5, 0.0, 1.0);
  vec3 warmOuter = vec3(0.98, 0.22, 0.02);
  vec3 warmMid   = vec3(1.00, 0.48, 0.04);
  vec3 warmCore  = vec3(1.00, 0.88, 0.56);
  vec3 coolOuter = vec3(0.52, 0.60, 1.00);
  vec3 coolMid   = vec3(0.70, 0.82, 1.00);
  vec3 coolCore  = vec3(0.92, 0.96, 1.00);
  vec3 cOuter = mix(warmOuter, coolOuter, cool) * mix(vec3(1.0), spec, 0.28);
  vec3 cMid   = mix(warmMid,   coolMid,   cool) * mix(vec3(1.0), spec, 0.34);
  vec3 cCore  = mix(warmCore,  coolCore,  cool) * mix(vec3(1.0), spec, 0.42);

  float coreW = exp(-rr*6.6);
  float midW = clamp(1.0 - rr*0.86, 0.0, 1.0);
  vec3 fire = mix(cOuter, cMid, midW);
  fire = mix(fire, cCore, coreW*0.92);
  vec3 col = fire * limb * flames;
  col *= 1.32;
  col = pow(clamp(col, 0.0, 1.0), vec3(0.88));
  gl_FragColor = vec4(col, 1.0);
}`;

  // ─── CARD CAROUSEL ────────────────────────────────────────────────────────
  const CRD_VS=`
attribute vec3 a_pos;
attribute vec2 a_uv;
uniform mat4 u_mvp;
uniform mat4 u_model;
uniform vec3 u_eye;
uniform float u_t;
uniform float u_alpha;
varying vec2 vUV;
varying float vF;
varying float vA;
void main(){
  vec3 N = normalize(mat3(u_model[0].xyz, u_model[1].xyz, u_model[2].xyz) * vec3(0.0,0.0,1.0));
  vec3 W = (u_model * vec4(a_pos,1.0)).xyz;
  vec3 V = normalize(u_eye - W);
  vF = pow(1.0 - clamp(dot(N,V),0.0,1.0), 2.6);
  vUV = vec2(1.0 - a_uv.x, 1.0 - a_uv.y);
  vA = u_alpha;
  gl_Position = u_mvp * vec4(a_pos,1.0);
}`;
  const CRD_FS=`
precision mediump float;
uniform sampler2D u_tex;
uniform float u_t;
varying vec2 vUV;
varying float vF;
varying float vA;
void main(){
  vec4 tex = texture2D(u_tex, vUV);
  float mask = smoothstep(0.02, 0.12, tex.a);
  if(mask < 0.01) discard;

  float edge = min(min(vUV.x,1.0-vUV.x), min(vUV.y,1.0-vUV.y));
  float border = smoothstep(0.010, 0.030, edge);
  float scan = 0.50 + 0.50*sin(u_t*0.9 + vUV.y*8.0);
  float sheen = (0.10 + 0.22*scan) * (0.15 + 0.85*vF);

  vec3 col = tex.rgb;
  col += vec3(0.90,0.95,1.00) * sheen;
  col = mix(vec3(0.0), col, border);
  col *= (vA * mask);
  gl_FragColor = vec4(col, 1.0);
}`;

  // ─── MENU BEACONS ─────────────────────────────────────────────────────────
  const BCN_VS=`
attribute vec3 a_pos;
attribute vec3 a_col;
attribute float a_seed;
uniform mat4 u_vp;
uniform vec3 u_cam;
uniform float u_t;
uniform float u_alpha;
varying vec3 vCol;
varying float vA;
void main(){
  vec3 d = a_pos - u_cam;
  float dist = length(d);
  float tw = 0.60 + 0.40*sin(u_t*2.2 + a_seed*37.0 + dist*0.008);
  float near = clamp(220.0/(dist+220.0), 0.0, 1.0);
  float farGlow = 0.12 + 0.88*near;
  float size = (2.2 + 7.0*near) * (0.75 + 0.6*tw);
  gl_PointSize = clamp(size, 1.6, 10.5);
  vCol = a_col;
  vA = u_alpha * farGlow * (0.55 + 0.45*tw);
  gl_Position = u_vp * vec4(a_pos,1.0);
}`;
  const BCN_FS=`
precision mediump float;
varying vec3 vCol;
varying float vA;
void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  if(r>0.5) discard;
  float core = exp(-r*r*16.0);
  float star = pow(max(0.0, 1.0 - r*2.0), 6.0);
  float a = (core*0.55 + star*0.85) * vA;
  gl_FragColor = vec4(vCol, a);
}`;

  // ─── SWARM DUST ───────────────────────────────────────────────────────────
  const SD_VS=`
attribute vec3 a_pos;
attribute float a_seed;
attribute float a_a;
uniform mat4 u_vp;
uniform vec3 u_cam;
uniform float u_t;
varying float vA;
varying float vS;
void main(){
  float d=length(a_pos-u_cam);
  float baseSize = clamp(4.6 - d*0.030, 0.85, 4.2);
  float tw = 0.50 + 0.50*sin(u_t*0.75 + a_seed*12.3 + d*0.010);
  gl_PointSize = baseSize * (0.78 + 0.72*tw);
  vA = a_a * (0.80 + 0.85*tw);
  vS = a_seed;
  gl_Position = u_vp*vec4(a_pos,1.0);
}`;
  const SD_FS=`
precision mediump float;
varying float vA;
varying float vS;
uniform float u_alphaScale;
void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  if(r>0.5) discard;
  float core = exp(-r*r*12.5);
  float spark = pow(max(0.0, 1.0 - r*2.0), 7.2);
  float tint = fract(vS*7.13);
  vec3 c0 = vec3(0.55,0.78,1.0);
  vec3 c1 = vec3(1.0,0.95,0.72);
  vec3 col = mix(c0,c1,tint);
  col *= (0.70 + 0.95*spark);
  float a = vA * (core*0.36 + spark*0.96);
  gl_FragColor = vec4(col, a * u_alphaScale);
}`;

  // ─── COSMIC WORD CLOUD ────────────────────────────────────────────────────
  const CWD_VS=`
attribute vec3 a_pos;
attribute float a_seed;
attribute float a_lum;
uniform mat4 u_vp;
uniform vec3 u_cam;
uniform float u_t;
uniform float u_alpha;
uniform float u_sizeMul;
varying float vA;
varying float vS;
varying float vL;
varying float vTw;
void main(){
  float d=length(a_pos-u_cam);
  float tw0=0.93 + 0.07*sin(u_t*0.72 + a_seed*19.0);
  float tw1=0.95 + 0.05*sin(u_t*2.5 + a_seed*47.0);
  float tw2=0.97 + 0.03*sin(u_t*5.6 + a_seed*83.0);
  float tw=tw0*tw1*tw2;
  float nearBoost=pow(clamp(9600.0/(d+200.0),0.0,1.0), 1.12);
  float base=(0.38 + 4.9*a_lum*nearBoost);
  float pulse=1.0 + 0.12*pow(max(0.0,sin(u_t*3.3 + a_seed*71.0)), 7.0);
  gl_PointSize = clamp(base*tw*u_sizeMul*pulse, 0.30, 5.2);
  vA = u_alpha * (0.22 + 0.62*a_lum) * tw * pulse * (0.88 + 0.12*nearBoost);
  vS = a_seed;
  vL = a_lum;
  vTw = tw*pulse;
  gl_Position = u_vp*vec4(a_pos,1.0);
}`;
  const CWD_FS=`
precision mediump float;
varying float vA;
varying float vS;
varying float vL;
varying float vTw;
void main(){
  vec2 uv=gl_PointCoord-0.5;
  float r=length(uv);
  if(r>0.5) discard;
  float core=exp(-r*r*18.0);
  float halo=exp(-r*r*5.8);
  float cross=max(pow(max(0.0,1.0-abs(uv.x*uv.y)*34.0), 9.0), pow(max(0.0,1.0-abs((uv.x+uv.y)*(uv.x-uv.y))*26.0), 7.0));
  float grain=0.93 + 0.07*sin(vS*191.0 + r*42.0);
  float glint=cross*grain*(0.64 + 0.20*vTw);
  float hot=0.86 + 0.14*sin(vS*67.0 + vL*6.0);
  vec3 c0=vec3(0.66,0.88,1.0);
  vec3 c1=vec3(1.0,0.95,0.80);
  vec3 col=mix(c0,c1,hot);
  float flare=pow(max(0.0, glint), 1.26);
  col *= (0.92 + 0.12*flare);
  float a=(core*0.78 + halo*0.24 + flare*0.11) * vA;
  gl_FragColor=vec4(col,a);
}`;

  window.SECC_SHADERS = Object.freeze({
    MBL_VS, MBL_FS,
    DST_VS, DST_FS,
    PRT_VS, PRT_FS,
    STR_VS, STR_FS,
    RSTR_VS, RSTR_FS,
    CRD_VS, CRD_FS,
    BCN_VS, BCN_FS,
    SD_VS, SD_FS,
    CWD_VS, CWD_FS
  });
})();
