(function(){
  'use strict';

  function createRegistry(){
    const items=[];

    function isFiniteVec3(v){
      return Array.isArray(v) && v.length===3 && Number.isFinite(v[0]) && Number.isFinite(v[1]) && Number.isFinite(v[2]);
    }

    function clear(){
      items.length=0;
    }

    function register(entry){
      if(!entry || !isFiniteVec3(entry.pos)) return false;
      items.push({
        id:String(entry.id||'').trim() || 'unnamed',
        kind:String(entry.kind||'object').trim() || 'object',
        pos:[entry.pos[0], entry.pos[1], entry.pos[2]],
        meta:entry.meta && typeof entry.meta==='object' ? {...entry.meta} : {}
      });
      return true;
    }

    function registerMany(list){
      if(!Array.isArray(list)) return 0;
      let n=0;
      list.forEach((it)=>{ if(register(it)) n++; });
      return n;
    }

    function all(){
      return items.slice();
    }

    function nearest(pos, opts){
      if(!isFiniteVec3(pos)) return null;
      const allowCoincident=Boolean(opts && opts.allowCoincident);
      const filter=(opts && typeof opts.filter==='function') ? opts.filter : null;
      let best=null;
      let bestD2=Infinity;
      for(let i=0;i<items.length;i++){
        const it=items[i];
        if(filter && !filter(it)) continue;
        const dx=it.pos[0]-pos[0];
        const dy=it.pos[1]-pos[1];
        const dz=it.pos[2]-pos[2];
        const d2=dx*dx+dy*dy+dz*dz;
        if(!allowCoincident && d2<1e-8) continue;
        if(d2<bestD2){
          bestD2=d2;
          best={...it, d2};
        }
      }
      return best;
    }

    return Object.freeze({
      clear,
      register,
      registerMany,
      all,
      nearest
    });
  }

  window.SECC_COORD_REGISTRY=Object.freeze({
    createRegistry
  });
})();
