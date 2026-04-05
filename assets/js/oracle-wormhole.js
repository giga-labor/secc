const canvas = document.querySelector('[data-wormhole-canvas]');
if (!(canvas instanceof HTMLCanvasElement)) {
  // no-op
} else {
  const TEXT_CYCLE_MS = 18000;
  const JOURNEY_GATE_CONST = 1.0;
  const FIRST_TEXT_DELAY_MS = 3000;
  const WORD_DISINTEGRATE_START = 0.383333;
  const WORD_DISINTEGRATE_END = 0.63;
  let textCycleStartMs = performance.now();
  let journeyGateSmooth = JOURNEY_GATE_CONST;

  const textStream = document.querySelector('.oracle-wormhole__text-stream');
  const wormholeWordTemplate = textStream ? textStream.querySelector('.oracle-wormhole__word') : null;
  const textTracks = [];
  let textAnimationsStarted = false;
  const startTextAnimations = () => {
    if (textAnimationsStarted) return;
    textAnimationsStarted = true;
    textCycleStartMs = performance.now();
    if (textStream instanceof HTMLElement) {
      textStream.style.visibility = 'visible';
    }
    textTracks.forEach((track) => {
      track.el.style.animationPlayState = 'running';
    });
  };

  if (wormholeWordTemplate instanceof HTMLElement) {
    const words = String(textStream?.dataset.words || wormholeWordTemplate.textContent || 'TEST')
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean);
    let wordIndex = 0;
    const CYCLE_MS = 18000;
    const START_OFFSET_MS = Math.round(CYCLE_MS * WORD_DISINTEGRATE_START);

    const nextWord = () => {
      const value = words[wordIndex % words.length] || 'TEST';
      wordIndex += 1;
      return value;
    };

    const renderWord = (host, word) => {
      const value = String(word || '').trim() || 'TEST';
      host.textContent = '';
      const chars = Array.from(value);
      const mid = (chars.length - 1) * 0.5;
      const maxDist = Math.max(1, mid);
      chars.forEach((ch, i) => {
        const span = document.createElement('span');
        span.className = 'oracle-wormhole__char';
        const core = document.createElement('span');
        core.className = 'oracle-wormhole__char-core';
        core.textContent = ch === ' ' ? '\u00A0' : ch;
        const dx = (Math.random() * 44 - 14).toFixed(2);
        const dy = (Math.random() * -34 - 2).toFixed(2);
        const rot = (Math.random() * 26 - 13).toFixed(2);
        const sc = (0.58 + Math.random() * 0.34).toFixed(3);
        const dist = Math.abs(i - mid);
        const distNorm = Math.min(1, dist / maxDist);
        const disDelay = Math.round((1 - distNorm) * 420);
        span.style.setProperty('--dx', `${dx}px`);
        span.style.setProperty('--dy', `${dy}px`);
        span.style.setProperty('--rot', `${rot}deg`);
        span.style.setProperty('--sc', sc);
        span.style.setProperty('--dis-delay', `${disDelay}ms`);
        span.appendChild(core);

        const sideSign = i < mid ? -1 : (i > mid ? 1 : (Math.random() < 0.5 ? -1 : 1));
        const bitCount = 16;
        for (let b = 0; b < bitCount; b += 1) {
          const bit = document.createElement('span');
          bit.className = 'oracle-wormhole__char-bit';
          const left = 10 + Math.random() * 80;
          const top = 10 + Math.random() * 80;
          const grainSize = 1.4 + Math.random() * 3.2;
          const bitDx = sideSign * (32 + Math.random() * 96) + (Math.random() * 20 - 10);
          const bitDy = -(8 + Math.random() * 58) + (Math.random() * 12 - 6);
          const bitRot = sideSign * (12 + Math.random() * 44);
          const bitScale = 0.32 + Math.random() * 0.52;
          const bitDelay = Math.round((1 - distNorm) * 260 + b * 14 + Math.random() * 24);
          const bitOpacity = (0.62 + Math.random() * 0.38).toFixed(3);
          const bitBlur = (1.4 + Math.random() * 3.2).toFixed(2);
          bit.style.setProperty('--bl', `${left.toFixed(2)}%`);
          bit.style.setProperty('--bt', `${top.toFixed(2)}%`);
          bit.style.setProperty('--bsz', `${grainSize.toFixed(2)}px`);
          bit.style.setProperty('--bdx', `${bitDx.toFixed(2)}px`);
          bit.style.setProperty('--bdy', `${bitDy.toFixed(2)}px`);
          bit.style.setProperty('--brot', `${bitRot.toFixed(2)}deg`);
          bit.style.setProperty('--bsc', `${bitScale.toFixed(3)}`);
          bit.style.setProperty('--bit-delay', `${bitDelay}ms`);
          bit.style.setProperty('--bo', bitOpacity);
          bit.style.setProperty('--bbl', `${bitBlur}px`);
          span.appendChild(bit);
        }
        host.appendChild(span);
      });
      host.dataset.word = value;
      host.classList.remove('is-disintegrating');
    };

    const trackA = wormholeWordTemplate;
    const trackB = wormholeWordTemplate.cloneNode(false);
    trackB.classList.add('oracle-wormhole__word--track-b');
    textStream.appendChild(trackB);

    // Start in steady-state so first shown string has same timing as all others.
    trackA.style.animationDelay = `-${START_OFFSET_MS}ms, -${START_OFFSET_MS}ms`;
    trackB.style.animationDelay = '0ms, 0ms';
    trackA.style.animationPlayState = 'paused';
    trackB.style.animationPlayState = 'paused';
    if (textStream instanceof HTMLElement) {
      textStream.style.visibility = 'hidden';
    }

    renderWord(trackA, nextWord());
    renderWord(trackB, nextWord());
    textTracks.push(
      { el: trackA, phaseOffsetMs: START_OFFSET_MS },
      { el: trackB, phaseOffsetMs: 0 }
    );

    trackA.addEventListener('animationiteration', (event) => {
      if (event.animationName !== 'wormhole-word-zoom') return;
      renderWord(trackA, nextWord());
    });
    trackB.addEventListener('animationiteration', (event) => {
      if (event.animationName !== 'wormhole-word-zoom') return;
      renderWord(trackB, nextWord());
    });
  }

  const TAU = Math.PI * 2;

  // â”€â”€ FALLBACK 2D â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const bootFallback2D = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const particles = [];
    const count = 1800;
    let raf = 0, t0 = performance.now();
    let firstTextDelayTimer = 0;
    const reset = p => { p.r=0.12+Math.random()*1.1; p.a=Math.random()*TAU; p.z=Math.random(); p.s=0.24+Math.random()*1.9; };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.max(1,Math.floor(rect.width*dpr));
      canvas.height=Math.max(1,Math.floor(rect.height*dpr));
      ctx.setTransform(dpr,0,0,dpr,0,0);
      particles.length=0;
      for(let i=0;i<count;i++){const p={};reset(p);particles.push(p);}
    };
    const draw = now => {
      const dt=Math.min(0.05,(now-t0)/1000); t0=now;
      const w=canvas.clientWidth||1,h=canvas.clientHeight||1,cx=w*.5,cy=h*.52,m=Math.min(w,h);
      const bg=ctx.createRadialGradient(cx,cy,10,cx,cy,m*.72);
      bg.addColorStop(0,'#7ab7ff');bg.addColorStop(.14,'#294f97');bg.addColorStop(.4,'#0c1630');bg.addColorStop(1,'#03060d');
      ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      for(let i=0;i<particles.length;i++){
        const p=particles[i];p.z-=dt*p.s*.95;p.a+=dt*(.22+p.s*.06);if(p.z<=.001)reset(p);
        const d=1/Math.max(.03,p.z),rr=p.r*m*.32*d,x=cx+Math.cos(p.a)*rr,y=cy+Math.sin(p.a)*rr*.76;
        ctx.strokeStyle=`rgba(170,215,255,${Math.min(.95,.08+d*.06)})`;ctx.lineWidth=Math.min(2.4,.25+d*.02);
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(p.a)*Math.min(26,2+d*.7),y+Math.sin(p.a)*Math.min(26,2+d*.7)*.76);ctx.stroke();
      }
      raf=requestAnimationFrame(draw);
    };
    resize();window.addEventListener('resize',resize,{passive:true});raf=requestAnimationFrame(draw);
    if (!textAnimationsStarted) {
      firstTextDelayTimer = window.setTimeout(() => {
        startTextAnimations();
        firstTextDelayTimer = 0;
      }, FIRST_TEXT_DELAY_MS);
    }
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){
        if(raf)cancelAnimationFrame(raf);raf=0;
        if (firstTextDelayTimer) {
          window.clearTimeout(firstTextDelayTimer);
          firstTextDelayTimer = 0;
        }
      }else if(!raf){
        t0=performance.now();raf=requestAnimationFrame(draw);
        if (!textAnimationsStarted && !firstTextDelayTimer) {
          firstTextDelayTimer = window.setTimeout(() => {
            startTextAnimations();
            firstTextDelayTimer = 0;
          }, FIRST_TEXT_DELAY_MS);
        }
      }
    });
  };

  // â”€â”€ THREE.JS â€“ WORMHOLE FOTOGRAFICO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  (async () => {
    try {
      const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js');

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(80, 16 / 9, 0.01, 50);
      camera.position.z = 0;

      // â”€â”€ SHADER FULL-SCREEN: campo stellare + lensing gravitazionale â”€â”€
      const wormholeMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime:   { value: 0.0 },
          uFlow:   { value: 0.0 },
          uStarFlow: { value: 0.0 },
          uSpeed:  { value: 1.0 },
          uAspect: { value: 16 / 9 },
          uMouse:  { value: new THREE.Vector2(0, 0) }
        },
        vertexShader: /* glsl */`
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */`
          precision highp float;
          varying vec2 vUv;
          uniform float uTime;
          uniform float uFlow;
          uniform float uStarFlow;
          uniform float uSpeed;
          uniform float uAspect;
          uniform vec2  uMouse;

          // â”€â”€ Hash / noise â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          float h11(float n){ return fract(sin(n)*43758.5453); }
          float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
          vec2  h22(vec2 p){ return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453); }

          float vnoise(vec2 p){
            vec2 i=floor(p),f=fract(p);
            float a=h21(i),b=h21(i+vec2(1,0)),c=h21(i+vec2(0,1)),d=h21(i+vec2(1,1));
            vec2 u=f*f*(3.-2.*f);
            return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
          }

          float fbm(vec2 p){
            float v=0.,a=.5;
            for(int i=0;i<7;i++){ v+=vnoise(p)*a; p*=2.03; a*=.49; }
            return v;
          }

          mat2 rot2(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }

          // â”€â”€ Campo stellare: griglia procedurale con stelle realistiche â”€
          // Restituisce (luminositÃ , tipo_spettrale)
          vec2 starGrid(vec2 uv, float scale, float density){
            vec2 cell  = floor(uv * scale);
            vec2 local = fract(uv * scale);
            float bright = 0.0, spec = 0.0;

            for(int i=-1; i<=1; i++){
              for(int j=-1; j<=1; j++){
                vec2 n   = cell + vec2(float(i),float(j));
                float rnd = h21(n);
                if(rnd > density) continue;

                vec2  spos = h22(n + 0.1);
                float dist = length(local - vec2(float(i),float(j)) - spos);
                float sz   = 0.018 + rnd * 0.055;
                float b    = pow(max(0., 1. - dist/sz), 5.0);
                float mag  = 0.5 + h21(n+0.7) * 3.5;

                bright += b * mag;
                spec    = h21(n + 1.3);
              }
            }
            return vec2(bright, spec);
          }

          // â”€â”€ Nebulose proceduali (emissione + riflessione + polvere) â”€â”€
          vec3 nebula(vec2 uv){
            vec2 q = uv;
            float n1 = fbm(q * 2.2 + uTime * 0.004);
            float n2 = fbm(q * 4.0 - uTime * 0.003);
            float n3 = fbm(q * 7.5 + uTime * 0.005);
            float n4 = fbm(q * 1.1 + vec2(3.1, 1.9)); // struttura larga

            vec3 col = vec3(0.0);
            // Nebulosa a emissione HÎ± (rosso-viola)
            col += vec3(0.40, 0.04, 0.10) * pow(n1, 3.0) * n4 * 0.9;
            // Nebulosa a riflessione (blu)
            col += vec3(0.03, 0.07, 0.30) * pow(n2, 2.5) * 0.7;
            // OIII (ciano-teal)
            col += vec3(0.02, 0.22, 0.18) * pow(n3, 2.0) * n2 * 0.5;
            // Polvere oscura
            float dust = fbm(q * 3.8 + vec2(2.0, 0.7));
            col *= max(0.0, 1.0 - dust * 0.5);

            return col * 0.55;
          }

          // â”€â”€ Galassie distanti (blob ellittici) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          float distGalaxy(vec2 uv, vec2 center, float rad, float ang, float ellong){
            vec2 d = rot2(ang) * (uv - center);
            d.x /= ellong;
            float r = length(d);
            float core = exp(-r * r / (rad * rad * 0.12)) * 0.9;
            float disc = exp(-r * r / (rad * rad)) * 0.4;
            return core + disc;
          }

          // â”€â”€ Pianeti (sfere colorate con shading lambertiano) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          float planet(vec2 uv, vec2 center, float rad){
            vec2 d = uv - center;
            float r = length(d);
            if(r > rad) return 0.0;
            float z  = sqrt(max(0., rad*rad - r*r));
            vec3 n   = normalize(vec3(d, z));
            vec3 l   = normalize(vec3(0.6, 0.4, 0.8));
            return dot(n, l) * 0.5 + 0.5;
          }

          // Stelle puntiformi in avvicinamento: nascono vicino al core,
          // accelerano verso la camera e spariscono ai bordi.
          vec3 flyingStars(vec2 uv, float t, float throatR, float speedAmp){
            vec3 acc = vec3(0.0);
            float rr = length(uv);

            for(int i = 0; i < 72; i++){
              float id = float(i);
              float seed = id * 19.137;
              float a0 = h11(seed + 0.3) * 6.2831853;
              float speed = 0.65 + h11(seed + 1.7) * 1.55;
              float life = fract(t * speed + h11(seed + 2.9));
              float jitter = (h11(seed + floor(t * 0.9)) - 0.5) * 0.22;
              float angle = a0 + jitter + sin(t * (0.25 + h11(seed + 5.1) * 0.7) + seed) * 0.08;

              float radius = throatR * 1.03 + pow(life, 2.35) * (2.35 + h11(seed + 7.3) * 0.9);
              vec2 p = vec2(cos(angle), sin(angle)) * radius;

              float sizeBoost = mix(0.9, 1.35, smoothstep(1.0, 2.2, speedAmp));
              float size = mix(0.004, 0.026, pow(life, 2.0)) * sizeBoost;
              float star = smoothstep(size, 0.0, length(uv - p));

              float fadeIn = smoothstep(throatR * 1.01, throatR * 1.22, rr);
              float fadeOut = 1.0 - smoothstep(2.2, 2.9, rr);
              float blink = 0.72 + 0.28 * sin(t * (2.0 + h11(seed + 9.9) * 5.0) + seed);
              float alphaBoost = mix(0.9, 1.45, smoothstep(1.0, 2.2, speedAmp));
              float alpha = star * fadeIn * fadeOut * blink * alphaBoost;

              vec3 col = mix(vec3(0.74, 0.86, 1.0), vec3(1.0, 0.92, 0.8), h11(seed + 11.4));
              acc += col * alpha * 1.1;
            }
            return acc;
          }

          void main(){
            vec2 uv = vUv * 2.0 - 1.0;
            uv.x *= uAspect;

            // Parallasse mouse + lento drift
            vec2 drift = uMouse * 0.04 + vec2(sin(uTime*0.08)*0.02, cos(uTime*0.06)*0.015);

            // Rotazione lenta del cielo stellato (siamo dentro il wormhole)
            vec2 sky = rot2(uTime * 0.022) * (uv + drift);

            // â”€â”€ Parametri wormhole â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            float r   = length(uv);
            float phi = atan(uv.y, uv.x);
            vec2 flowDir = normalize(uv + vec2(1e-5));

            // Gola che pulsa lentamente (respiro del wormhole)
            float throatR  = 0.26 + sin(uTime * 0.28) * 0.035 + cos(uTime * 0.17) * 0.02;
            float einsteinR = throatR * 1.40;
            float speedFactor = max(0.55, uSpeed);

            // â”€â”€ Lensing gravitazionale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            // Per ogni pixel fuori dalla gola, deformiamo le coordinate
            // del cielo simulando la curvatura dello spazio-tempo
            vec2 lensedSky;
            bool inThroat = (r < throatR * 0.98);

            if(!inThroat){
              // Deflessione: angolo âˆ (R_throat / r)^2
              float impact      = r;
              float deflAngle   = (throatR * throatR) / (impact * impact) * 1.1;

              // Near the Einstein ring radius: extreme lensing (caustica)
              float caustic = smoothstep(einsteinR * 1.8, einsteinR * 1.02, r);
              deflAngle *= (1.0 + caustic * 12.0);

              // Le stelle sembrano "avvolgersi" intorno alla gola
              float lensedPhi = phi + caustic * 0.45;
              float lensedR   = impact + deflAngle * throatR * 0.5;

              lensedSky = rot2(uTime * 0.022) * (vec2(cos(lensedPhi), sin(lensedPhi)) * lensedR + drift);
            } else {
              // Dentro la gola: vediamo l'altra universitÃ  (campo diverso, ruotato)
              vec2 innerCoord = (uv / max(r, 0.001)) * (throatR * 0.9);
              lensedSky = rot2(-uTime * 0.035 + 2.1) * (innerCoord * 1.8 + vec2(0.3, -0.2));
            }

            // â”€â”€ Background spaziale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            float motionSharpen = mix(0.42, 1.0, smoothstep(0.95, 1.9, speedFactor));
            vec2 flowSky = lensedSky - flowDir * (uFlow * motionSharpen);
            vec2 skyA = flowSky * 0.30 + 0.5; // coordinate UV per nebulosa/stelle
            vec3 space = vec3(0.0);

            // Nebulosa: in rallentamento diventa piu piena/morbida, ma sempre in avanzamento.
            float calmFactor = smoothstep(1.12, 0.62, speedFactor);
            vec2 calmJit = vec2(
              fbm(lensedSky * 3.1 + vec2(uTime * 0.05, -uTime * 0.04)) - 0.5,
              fbm(lensedSky.yx * 2.7 + vec2(-uTime * 0.04, uTime * 0.05)) - 0.5
            );
            vec2 calmSkyA = lensedSky * 0.22 + 0.5 + calmJit * (0.08 * calmFactor);
            vec3 nebFast = nebula(skyA);
            vec3 nebCalm = nebula(calmSkyA) * 1.18;
            space += mix(nebFast, nebCalm, calmFactor * 0.85);

            // Campo stellare multi-scala (stelle vicine, medie, lontane)
            vec2 st1 = starGrid(flowSky * 0.28 + 0.5, 38.0, 0.065);
            vec2 st2 = starGrid(flowSky * 0.20 + 0.5, 26.0, 0.055);
            vec2 st3 = starGrid(flowSky * 0.14 + 0.5, 16.0, 0.045);
            vec2 st4 = starGrid(flowSky * 0.09 + 0.5,  9.0, 0.035);

            float totalStars = st1.x * 0.45 + st2.x * 0.7 + st3.x * 1.1 + st4.x * 2.2;
            float spectral   = (st1.y + st2.y + st3.y + st4.y) * 0.25;

            // Colore stelle: blu-bianco (stelle calde) â†” arancio-rosso (stelle fredde)
            vec3 starHot  = vec3(0.65, 0.80, 1.00);
            vec3 starMid  = vec3(1.00, 0.97, 0.90);
            vec3 starCool = vec3(1.00, 0.60, 0.30);
            vec3 starCol  = mix(starHot, starMid, smoothstep(0.0, 0.5, spectral));
            starCol       = mix(starCol, starCool, smoothstep(0.6, 1.0, spectral));
            space += starCol * totalStars * 0.22;

            space += flyingStars(uv, uStarFlow, throatR, speedFactor);

            // Galassie distanti
            float g1 = distGalaxy(lensedSky, vec2( 0.42,  0.18), 0.09, 0.8, 2.5);
            float g2 = distGalaxy(lensedSky, vec2(-0.35, -0.30), 0.07, 2.1, 3.2);
            float g3 = distGalaxy(lensedSky, vec2( 0.08,  0.52), 0.12, 1.5, 1.8);
            float g4 = distGalaxy(lensedSky, vec2(-0.55,  0.10), 0.06, 0.3, 4.0);
            float g5 = distGalaxy(lensedSky, vec2( 0.20, -0.58), 0.05, 3.8, 2.2);
            space += vec3(0.85, 0.90, 1.00) * g1 * 0.5;
            space += vec3(1.00, 0.88, 0.72) * g2 * 0.4;
            space += vec3(0.72, 0.82, 1.00) * g3 * 0.45;
            space += vec3(0.95, 0.78, 0.85) * g4 * 0.35;
            space += vec3(0.88, 0.95, 1.00) * g5 * 0.38;

            // Pianeti (solo fuori dalla zona di forte lensing)
            float caus = smoothstep(einsteinR * 2.5, einsteinR * 1.5, r);
            if(caus < 0.9){
              float p1 = planet(lensedSky, vec2( 0.15, -0.22), 0.04);
              float p2 = planet(lensedSky, vec2(-0.28,  0.35), 0.025);
              if(p1 > 0.0){
                vec3 pn = vec3(lensedSky * 5.0, uTime * 0.1);
                float psurface = vnoise(lensedSky * 18.0 + uTime * 0.02);
                vec3 pCol = mix(vec3(0.08,0.20,0.55), vec3(0.18,0.55,0.28), psurface); // oceano/terra
                space += pCol * p1 * 0.7 * (1.0 - caus);
              }
              if(p2 > 0.0){
                float ps2 = vnoise(lensedSky * 24.0 - uTime * 0.015);
                vec3 pCol2 = mix(vec3(0.55,0.30,0.10), vec3(0.70,0.50,0.22), ps2); // deserto/gas
                space += pCol2 * p2 * 0.6 * (1.0 - caus);
              }
            }

            // â”€â”€ Gola del wormhole (nera, quasi opaca) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                        if(inThroat){
              float coreR = throatR * 0.74;
              float coreSoft = throatR * 0.11;
              float coreMask = smoothstep(coreR, coreR + coreSoft, r);
              space *= coreMask * 0.08;
              float rim = exp(-pow((r - (coreR + coreSoft * 0.95)) / (throatR * 0.05), 2.0));
              space += vec3(0.14, 0.28, 0.62) * rim * 0.55;
            }

            // Distorsione del nucleo senza cerchi visibili.
            float coreZone = smoothstep(throatR * 2.25, throatR * 0.92, r);
            float mirrorAxis = atan(uv.y, -uv.x);
            float shear = sin(mirrorAxis * 7.0 - uTime * 1.55 + fbm(uv * 7.2 + uTime * 0.25) * 3.5);
            float swirl = sin(mirrorAxis * 4.0 + uTime * 1.2 + fbm(uv * 5.0 - uTime * 0.2) * 2.4);
            vec3 sceneTint = normalize(space + vec3(0.02, 0.015, 0.01));
            vec3 warped = vec3(
              space.r * (1.0 + 0.20 * coreZone * shear),
              space.g * (1.0 + 0.15 * coreZone * swirl),
              space.b * (1.0 - 0.18 * coreZone * shear)
            );
            warped = mix(warped, sceneTint * (0.8 + 0.4 * coreZone), 0.35 * coreZone);
            space = mix(space, warped, 0.78 * coreZone);

            // Lente anulare attorno al buco: rifrazione/distorzione della scena.
            float annulusIn = smoothstep(throatR * 1.00, throatR * 1.22, r);
            float annulusOut = 1.0 - smoothstep(throatR * 1.95, throatR * 2.28, r);
            float annulus = annulusIn * annulusOut;
            float annNoise = fbm(uv * 10.0 + vec2(uTime * 0.42, -uTime * 0.33));
            float annWave = sin(mirrorAxis * 8.5 - uTime * 1.7 + annNoise * 3.6);
            float annTwist = sin(mirrorAxis * 3.0 + uTime * 1.15);
            float lensPower = annulus * (0.75 + 0.25 * annNoise);

            vec3 refractCol = vec3(
              mix(space.r, space.g, 0.44 + 0.30 * annWave),
              mix(space.g, space.b, 0.46 - 0.28 * annWave),
              mix(space.b, space.r, 0.42 + 0.26 * annTwist)
            );
            refractCol *= (0.92 + 0.22 * annulus + 0.08 * annWave);
            space = mix(space, refractCol, lensPower * 0.78);

            // Alone esterno diffuso
            float halo = exp(-pow((r - throatR * 1.25) / (throatR * 0.5), 2.0)) * 0.28;
            space += vec3(0.08, 0.18, 0.55) * halo;

            // Niente spike lineari: solo materia stellare/nebule puntiforme.

            float eventCoreR = throatR * 0.66;
            float eventSoft = throatR * 0.1;
            float eventMask = smoothstep(eventCoreR, eventCoreR + eventSoft, r);
            space *= eventMask;

            // â”€â”€ Tonemapping cinematografico â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            // ACES approssimato
            vec3 x = max(vec3(0.0), space);
            x = (x * (2.51*x + 0.03)) / (x * (2.43*x + 0.59) + 0.14);
            x = pow(clamp(x, 0.0, 1.0), vec3(1.0/2.2)); // gamma

            gl_FragColor = vec4(x, 1.0);
          }
        `
      });

      // Piano full-screen a distanza fissa dalla camera
      const bgPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), wormholeMat);
      bgPlane.position.z = -10.0;
      scene.add(bgPlane);

      // â”€â”€ RESIZE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const setSize = () => {
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width  || 1));
        const h = Math.max(1, Math.floor(rect.height || 1));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        wormholeMat.uniforms.uAspect.value = w / h;

        // Scala il piano per coprire esattamente il frustum
        const dist    = Math.abs(bgPlane.position.z);
        const fovRad  = camera.fov * Math.PI / 180;
        const planeH  = 2 * Math.tan(fovRad / 2) * dist;
        const planeW  = planeH * (w / h);
        bgPlane.scale.set(planeW * 1.05, planeH * 1.05, 1);
      };
      setSize();
      window.addEventListener('resize', setSize, { passive: true });

      // â”€â”€ MOUSE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const mouse = { x: 0, y: 0 };
      const mouseVec = new THREE.Vector2(0, 0);
      canvas.addEventListener('pointermove', ev => {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        mouse.x =  (ev.clientX - rect.left) / rect.width  * 2 - 1;
        mouse.y = -(ev.clientY - rect.top)  / rect.height * 2 + 1;
      }, { passive: true });

      // â”€â”€ LOOP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      let raf = 0;
      let t0  = performance.now();
      let firstFrameRendered = false;
      let firstTextDelayTimer = 0;

      const animate = now => {
        const dt = Math.min(0.05, (now - t0) / 1000);
        t0 = now;
        if (textAnimationsStarted && textTracks.length) {
          textTracks.forEach((track) => {
            const phase = (((now - textCycleStartMs) + track.phaseOffsetMs) % TEXT_CYCLE_MS) / TEXT_CYCLE_MS;
            if (phase >= WORD_DISINTEGRATE_START && phase <= WORD_DISINTEGRATE_END) {
              track.el.classList.add('is-disintegrating');
            } else {
              track.el.classList.remove('is-disintegrating');
            }
          });
        }
        const journeyGate = journeyGateSmooth;
        const tNext = wormholeMat.uniforms.uTime.value + dt;
        const throat = 0.26 + Math.sin(tNext * 0.28) * 0.035 + Math.cos(tNext * 0.17) * 0.02;
        const speedFactorBase = Math.min(2.8, Math.max(0.55, Math.pow(0.265 / Math.max(throat, 0.12), 1.35)));
        const speedFactor = speedFactorBase * journeyGate;
        wormholeMat.uniforms.uTime.value = tNext;
        wormholeMat.uniforms.uSpeed.value = speedFactor;
        wormholeMat.uniforms.uFlow.value += dt * 0.72 * speedFactor;
        wormholeMat.uniforms.uStarFlow.value += dt * 1.05 * speedFactor;
        mouseVec.set(mouse.x, mouse.y);
        wormholeMat.uniforms.uMouse.value.lerp(mouseVec, 0.04);

        renderer.render(scene, camera);
        if (!firstFrameRendered) {
          firstFrameRendered = true;
          firstTextDelayTimer = window.setTimeout(() => {
            startTextAnimations();
            firstTextDelayTimer = 0;
          }, FIRST_TEXT_DELAY_MS);
        }
        raf = requestAnimationFrame(animate);
      };
      raf = requestAnimationFrame(animate);

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
          if (firstTextDelayTimer) {
            window.clearTimeout(firstTextDelayTimer);
            firstTextDelayTimer = 0;
          }
        } else if (!raf) {
          t0 = performance.now();
          raf = requestAnimationFrame(animate);
        }
      });

    } catch (_) {
      bootFallback2D();
    }
  })();
}


