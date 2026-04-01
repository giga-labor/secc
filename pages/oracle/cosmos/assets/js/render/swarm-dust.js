(function(){
'use strict';

function updateSwarmClusters(ctx, dt, t, basis){
  const ac=ctx.sysCenterW();
  if(!ctx.sdInitedRef.value){
    for(let c=0;c<ctx.SD_CLUSTERS;c++) ctx.respawnSwarm(c, ctx.camPos, basis);
    ctx.sdInitedRef.value=true;
  }
  for(let c=0;c<ctx.SD_CLUSTERS;c++){
    ctx.sdLife[c] += dt/(ctx.sdDur[c]||2.0);
    if(ctx.sdLife[c] >= 1){
      ctx.respawnSwarm(c, ctx.camPos, basis);
      continue;
    }
    ctx.sdFade[c] = Math.min(1, ctx.sdFade[c] + dt*0.35);
    const i3=c*3;
    let px=ctx.sdC[i3], py=ctx.sdC[i3+1], pz=ctx.sdC[i3+2];
    let vx=ctx.sdV[i3], vy=ctx.sdV[i3+1], vz=ctx.sdV[i3+2];
    let ax=ctx.sdAcc[i3], ay=ctx.sdAcc[i3+1], az=ctx.sdAcc[i3+2];

    const dx0=ctx.SOH[0]-px, dy0=ctx.SOH[1]-py, dz0=ctx.SOH[2]-pz;
    const r20=dx0*dx0+dy0*dy0+dz0*dz0+ctx.SD_SOFTEN;
    const invR0=1/Math.sqrt(r20);
    const f0=ctx.SD_G_SOH/(r20);
    ax += dx0*invR0*f0; ay += dy0*invR0*f0; az += dz0*invR0*f0;

    const dx1=ac[0]-px, dy1=ac[1]-py, dz1=ac[2]-pz;
    const r21=dx1*dx1+dy1*dy1+dz1*dz1+ctx.SD_SOFTEN;
    const invR1=1/Math.sqrt(r21);
    const f1=ctx.SD_G_ACTIVE/(r21);
    ax += dx1*invR1*f1; ay += dy1*invR1*f1; az += dz1*invR1*f1;

    for(let j=0;j<ctx.BCN_COUNT;j++){
      const j3=j*3;
      const dxn=ctx.bcnPos[j3]-px, dyn=ctx.bcnPos[j3+1]-py, dzn=ctx.bcnPos[j3+2]-pz;
      const r2n=dxn*dxn+dyn*dyn+dzn*dzn + ctx.SD_SOFTEN*2.4;
      const invRn=1/Math.sqrt(r2n);
      const fn=ctx.SD_G_SO_NET/r2n;
      ax += dxn*invRn*fn; ay += dyn*invRn*fn; az += dzn*invRn*fn;
    }

    const turbX=Math.sin(t*0.42 + c*1.7 + px*0.028 + py*0.017);
    const turbY=Math.sin(t*0.36 + c*2.1 + py*0.024 + pz*0.019);
    const turbZ=Math.sin(t*0.47 + c*1.3 + pz*0.026 + px*0.016);
    ax += turbX*ctx.SD_TURB; ay += turbY*ctx.SD_TURB*0.8; az += turbZ*ctx.SD_TURB;

    const swirl=0.045*invR1;
    ax += (-dz1)*swirl;
    az += (dx1)*swirl;

    vx = vx*(1.0-ctx.SD_DAMP*dt) + ax*dt;
    vy = vy*(1.0-ctx.SD_DAMP*dt) + ay*dt;
    vz = vz*(1.0-ctx.SD_DAMP*dt) + az*dt;
    const v2=vx*vx+vy*vy+vz*vz;
    if(v2 > ctx.SD_MAX_SPD*ctx.SD_MAX_SPD){
      const invV=ctx.SD_MAX_SPD/Math.sqrt(v2);
      vx*=invV; vy*=invV; vz*=invV;
    }
    px += vx*dt; py += vy*dt; pz += vz*dt;

    ctx.sdV[i3]=vx; ctx.sdV[i3+1]=vy; ctx.sdV[i3+2]=vz;
    ctx.sdC[i3]=px; ctx.sdC[i3+1]=py; ctx.sdC[i3+2]=pz;

    const dx=px-ctx.camPos[0], dy=py-ctx.camPos[1], dz=pz-ctx.camPos[2];
    const fwd=basis.f;
    const ahead = dx*fwd[0] + dy*fwd[1] + dz*fwd[2];
    if(ahead < -6.0){
      ctx.respawnSwarm(c, ctx.camPos, basis);
      continue;
    }
    if(dx*dx+dy*dy+dz*dz > (ctx.SD_MAXR*ctx.SD_MAXR*1.9)){
      ctx.respawnSwarm(c, ctx.camPos, basis);
    }
  }
}

function buildSwarmParticles(ctx, t){
  for(let i=0;i<ctx.SD_COUNT;i++){
    const ci=ctx.sdCi[i];
    const p = ctx.pulse01(ctx.sdLife[ci]);
    const spread = ctx.sdSpread[ci] || 6.0;
    const i3=i*3;
    const ox=ctx.sdOff[i3]*spread, oy=ctx.sdOff[i3+1]*spread, oz=ctx.sdOff[i3+2]*spread;
    const j = 0.12 + 0.08*Math.sin(t*0.35 + ctx.sdSeed[i]*ctx.TAU*5.0);
    ctx.sdArr[i3]   = ctx.sdC[ci*3]   + ox*(0.55+j);
    ctx.sdArr[i3+1] = ctx.sdC[ci*3+1] + oy*(0.55+j*0.85);
    ctx.sdArr[i3+2] = ctx.sdC[ci*3+2] + oz*(0.55+j);
    const fadeMix = 0.35 + 0.65 * ctx.clamp(ctx.sdFade[ci], 0, 1);
    ctx.sdAlpha[i] = ctx.sdAlphaBase[i] * p * fadeMix;
  }
}

function renderSwarmDust(ctx, alphaScale){
  const gl=ctx.gl;
  gl.useProgram(ctx.sProg);
  gl.uniformMatrix4fv(ctx.SL.u_vp,false,ctx.vpM);
  gl.uniform3fv(ctx.SL.u_cam,new Float32Array(ctx.camPos));
  gl.uniform1f(ctx.SL.u_t,ctx.simTime);
  gl.uniform1f(ctx.SL.u_alphaScale, alphaScale);

  gl.depthMask(false);
  gl.disable(gl.DEPTH_TEST);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  ctx.attrib(ctx.SL.a_pos, ctx.sdPosBuf);
  gl.bindBuffer(gl.ARRAY_BUFFER, ctx.sdPosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, ctx.sdArr, gl.DYNAMIC_DRAW);
  ctx.attrib(ctx.SL.a_seed, ctx.sdSeedBuf, 1);
  ctx.attrib(ctx.SL.a_a, ctx.sdAlphaBuf, 1);
  gl.bindBuffer(gl.ARRAY_BUFFER, ctx.sdAlphaBuf);
  gl.bufferData(gl.ARRAY_BUFFER, ctx.sdAlpha, gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.POINTS,0,ctx.SD_COUNT);
  ctx.unAttrib(ctx.SL.a_pos,ctx.SL.a_seed,ctx.SL.a_a);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
}

function draw(ctx, dt, t, alphaScale){
  if(ctx.phase!=='done' && ctx.phase!=='arrive') return;
  const basis=ctx.basisFromDir(ctx.travelEffectDir());
  updateSwarmClusters(ctx, dt, t, basis);
  buildSwarmParticles(ctx, t);
  renderSwarmDust(ctx, alphaScale);
}

window.SECC_SWARM_DUST = { draw };

})();

