(function(){
  'use strict';

  function autopilotApproachBlend({distWU, startWU, endWU, clampFn}){
    const c=typeof clampFn==='function' ? clampFn : ((v,a,b)=>v<a?a:v>b?b:v);
    const span=Math.max(1e-5, startWU-endWU);
    return c((distWU-endWU)/span, 0, 1);
  }

  function computeBoostTarget({stage, BOOST_SHIFT_LEVEL, BOOST_LEVEL_1, BOOST_SUPER_LEVEL, BOOST_HYPER_LEVEL, cruiseLevel}){
    const lv1 = Number.isFinite(BOOST_LEVEL_1) ? BOOST_LEVEL_1 : BOOST_SHIFT_LEVEL;
    if(stage==='align') return 0.0;
    if(stage==='coast-in' || stage==='shift-down' || stage==='coast-out') return 0.0;
    if(stage==='shift-up') return lv1;
    if(stage==='ctrl') return Number.isFinite(cruiseLevel) ? cruiseLevel : BOOST_SUPER_LEVEL;
    if(stage==='hyper') return BOOST_HYPER_LEVEL;
    return 0.0;
  }

  function shouldStartFinalApproach({dist, brakeDist}){
    return Number.isFinite(dist) && Number.isFinite(brakeDist) && dist<=brakeDist;
  }

  window.SECC_AUTOPILOT_UTILS=Object.freeze({
    autopilotApproachBlend,
    computeBoostTarget,
    shouldStartFinalApproach
  });
})();
