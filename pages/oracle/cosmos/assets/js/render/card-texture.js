(function(){
'use strict';

function drawCardFrame(c, box, baseRgb, rrPath){
  const {x,y,w,h,r,headH}=box;
  c.shadowColor='rgba(0,0,0,0.38)';
  c.shadowBlur=28;
  c.shadowOffsetY=10;
  rrPath(c,x,y,w,h,r);
  c.fillStyle='rgba(6,9,20,0.88)';
  c.fill();
  c.shadowBlur=0;
  c.shadowOffsetY=0;

  rrPath(c,x,y,w,h,r);
  c.lineWidth=3;
  c.strokeStyle='rgba(' + Math.round(baseRgb[0]*255) + ',' + Math.round(baseRgb[1]*255) + ',' + Math.round(baseRgb[2]*255) + ',0.65)';
  c.stroke();

  c.save();
  rrPath(c,x+1,y+1,w-2,headH,r-2);
  c.clip();
  const g=c.createLinearGradient(x,y,x+w,y+headH);
  g.addColorStop(0,'rgba(' + Math.round(baseRgb[0]*255) + ',' + Math.round(baseRgb[1]*255) + ',' + Math.round(baseRgb[2]*255) + ',0.55)');
  g.addColorStop(1,'rgba(232,200,122,0.18)');
  c.fillStyle=g;
  c.fillRect(x,y,w,headH);
  c.restore();
}

function drawCardThumbnail(c, thumb, imgRec, rrPath){
  const {x,y,w,h,r}=thumb;
  rrPath(c,x,y,w,h,r);
  c.fillStyle='rgba(255,255,255,0.04)';
  c.fill();

  if(imgRec && imgRec.ready){
    c.save();
    rrPath(c,x,y,w,h,r);
    c.clip();
    const iw=imgRec.img.naturalWidth||1;
    const ih=imgRec.img.naturalHeight||1;
    const s=Math.max(w/iw, h/ih);
    const dw=iw*s;
    const dh=ih*s;
    const dx=x+(w-dw)/2;
    const dy=y+(h-dh)/2;
    c.globalAlpha=0.98;
    c.drawImage(imgRec.img, dx, dy, dw, dh);
    const gg=c.createLinearGradient(0,y,0,y+h);
    gg.addColorStop(0,'rgba(255,255,255,0.10)');
    gg.addColorStop(0.6,'rgba(0,0,0,0.00)');
    gg.addColorStop(1,'rgba(0,0,0,0.10)');
    c.fillStyle=gg;
    c.fillRect(x,y,w,h);
    c.restore();
    return;
  }

  c.save();
  rrPath(c,x,y,w,h,r);
  c.clip();
  c.globalAlpha=0.85;
  c.fillStyle='rgba(255,255,255,0.035)';
  for(let i=0;i<28;i++) c.fillRect(x+(i/28)*w, y, 2, h);
  c.restore();
}

function drawCardKickerBadge(c, box, def, pal, rrPath, TAU){
  const kx=box.x+22;
  const ky=box.y+26;
  const kw=Math.min(460, 22 + (def.kicker.length*13));
  const kh=38;
  c.save();
  rrPath(c,kx,ky,kw,kh,999);
  c.fillStyle='rgba(255,255,255,0.06)';
  c.fill();
  c.lineWidth=1;
  c.strokeStyle='rgba(255,255,255,0.10)';
  c.stroke();
  c.font='600 20px "Rajdhani",system-ui,sans-serif';
  c.textAlign='left';
  c.textBaseline='middle';
  c.fillStyle='rgba(' + pal.fill[0] + ',' + pal.fill[1] + ',' + pal.fill[2] + ',0.92)';
  c.fillText(def.kicker, kx+14, ky+kh/2+1);
  if(def.hasNews){
    c.beginPath();
    c.arc(kx+kw+14, ky+kh/2, 5.2, 0, TAU);
    c.fillStyle='rgba(255,90,90,0.95)';
    c.fill();
    c.beginPath();
    c.arc(kx+kw+14, ky+kh/2, 8.5, 0, TAU);
    c.strokeStyle='rgba(255,255,255,0.14)';
    c.lineWidth=1;
    c.stroke();
  }
  c.restore();
}

function drawCardTierRibbon(c, box, def, rrPath){
  if(def.accessTier!=='premium' && def.accessTier!=='gold') return;
  c.save();
  c.translate(box.x+box.w-88, box.y+22);
  c.rotate(0.78);
  rrPath(c,-56,-16,134,32,7);
  const rg=c.createLinearGradient(-50,0,70,0);
  rg.addColorStop(0,'rgba(255,250,210,0.92)');
  rg.addColorStop(0.55,'rgba(232,200,122,0.92)');
  rg.addColorStop(1,'rgba(172,116,8,0.92)');
  c.fillStyle=rg;
  c.fill();
  c.lineWidth=1;
  c.strokeStyle='rgba(255,255,255,0.35)';
  c.stroke();
  c.font='900 16px "Rajdhani",system-ui,sans-serif';
  c.fillStyle='rgba(20,10,0,0.92)';
  c.textAlign='center';
  c.textBaseline='middle';
  c.fillText(def.accessTier.toUpperCase(), 10, 1);
  c.restore();
}

function drawCardLastUpdated(c, box, def){
  if(!def.lastUpdated) return;
  c.save();
  c.font='600 18px "Rajdhani",system-ui,sans-serif';
  c.textAlign='right';
  c.textBaseline='middle';
  c.fillStyle='rgba(240,235,224,0.55)';
  c.fillText(def.lastUpdated, box.x+box.w-22, box.y+46);
  c.restore();
}

function drawCardTitles(c, box, def){
  c.textAlign='left';
  c.textBaseline='alphabetic';
  c.fillStyle='rgba(240,235,224,0.96)';
  c.font='600 66px "Cormorant Garamond","Palatino Linotype",serif';
  c.fillText(def.title, box.x+28, box.titleY);
  c.font='400 28px "Rajdhani",system-ui,sans-serif';
  c.fillStyle='rgba(240,235,224,0.62)';
  c.fillText(def.subtitle, box.x+28, box.subY);
}

function drawCardCornerGlint(c, box, TAU){
  c.globalCompositeOperation='screen';
  c.fillStyle='rgba(255,255,255,0.06)';
  c.beginPath();
  c.arc(box.x+box.w-34, box.y+34, 22, 0, TAU);
  c.fill();
  c.globalCompositeOperation='source-over';
}

function makeCardTex(md, baseRgb, deps){
  const cv2=document.createElement('canvas');
  cv2.width=1536;
  cv2.height=1024;
  const c=cv2.getContext('2d');

  const ringRgb=baseRgb||deps.CORE_GOLD;
  const pal=deps.contrastTextPalette(ringRgb);
  const def=deps.marbleCardDef(md);
  const imgRec=deps.getCardImg(def.img);

  const W=cv2.width;
  const H=cv2.height;
  c.clearRect(0,0,W,H);
  c.save();

  const pad=88;
  const x=pad, y=pad, w=W-pad*2, h=H-pad*2, r=54;
  const headH=Math.round(h*0.21);
  const tx=x+22, ty=y+headH+18, tw=w-44, th=Math.round(h*0.49);
  const titleY = ty+th+Math.round(h*0.18);
  const subY   = ty+th+Math.round(h*0.25);
  const box={x,y,w,h,r,headH,titleY,subY};

  drawCardFrame(c, box, ringRgb, deps.rrPath);
  drawCardThumbnail(c, {x:tx,y:ty,w:tw,h:th,r:28}, imgRec, deps.rrPath);
  drawCardKickerBadge(c, box, def, pal, deps.rrPath, deps.TAU);
  drawCardTierRibbon(c, box, def, deps.rrPath);
  drawCardLastUpdated(c, box, def);
  drawCardTitles(c, box, def);
  drawCardCornerGlint(c, box, deps.TAU);

  c.restore();
  return deps.glTex(cv2);
}

window.SECC_CARD_TEXTURE = { makeCardTex };

})();

