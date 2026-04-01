// assets/js/so-hud.js
// HUD utilities: pure formatters, DOM layout helpers, and per-frame render ticks.
// Extracted from index.html. Exposes window.SECC_HUD.
// Depends on window.SECC_CONFIG (so-config.js must load first, no defer).
window.SECC_HUD = (function () {
  'use strict';

  // ─── Tiny math helpers (mirrors of engine IIFE internals) ──────────────────
  const PI = Math.PI, TAU = PI * 2, DEG = PI / 180;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function vsub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
  function vnorm(a) {
    const l = Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]) || 1;
    return [a[0]/l, a[1]/l, a[2]/l];
  }
  function rrPath(c, x, y, w, h, r) {
    const rr = Math.min(r, w * 0.5, h * 0.5);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y,     x + w, y + h, rr);
    c.arcTo(x + w, y + h, x,     y + h, rr);
    c.arcTo(x,     y + h, x,     y,     rr);
    c.arcTo(x,     y,     x + w, y,     rr);
    c.closePath();
  }

  // ─── SO display labels ───────────────────────────────────────────────────────
  const SO_LABELS = Object.freeze({
    root: 'Oracle Experience',
    alg_neurali: 'SO Neurali',
    alg_ibridi: 'SO Ibridi',
    alg_statistici: 'SO Statistici'
  });
  const SPECIAL_SO_COORDS = Object.freeze({
    landingzone: { dUA: 783.44, aDeg: 7.4, rDeg: 206 }
  });

  // ─── DOM / canvas refs (set once via init) ───────────────────────────────────
  let _ribbonCtx = null, _ribbonCv = null;
  let _compassCtx = null;
  let _CCW = 72, _CCH = 72, _CCX = 36, _CCY = 36, _CCR = 26;
  let _hudMovePanelEl = null, _hudCameraPanelEl = null;
  let _travelPctEl = null, _travelBoostEl = null;
  let _travelPctNumEl = null, _travelPctLblEl = null;
  let _travelBoostFillEl = null, _travelBoostLblEl = null;
  let _soSelectEl = null, _soCurrentEl = null;
  let _hudModeNavsEl = null, _hudModeCommsEl = null;
  let _commModeNavsEl = null, _commModeCommsEl = null;
  let _hudModeCommsBadgeEl = null, _commModeCommsBadgeEl = null;
  let _commTargetEl = null, _commUnreadEl = null;
  let _coordDistEl = null, _coordAzEl = null, _coordBrgEl = null;
  let _sorDistEl = null, _sorAzEl = null, _sorBrgEl = null;
  let _manualHudMode = '';
  let _currentDockedId = null;
  let _commTargetOverride = '';
  let _unreadMessages = 3;

  // SO_RELEASE_RADIUS mirrors the IIFE const (20 world units = 2 UA).
  const SO_RELEASE_RADIUS = 20;

  function bindHudModeSeg(el, mode) {
    if (!el || el.dataset.hudModeBound === '1') return;
    el.dataset.hudModeBound = '1';
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.addEventListener('click', () => {
      _manualHudMode = mode;
      applyHudMode();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      _manualHudMode = mode;
      applyHudMode();
    });
  }
  function applyHudMode() {
    const showComms = (_manualHudMode === 'comms') || (!_manualHudMode && Boolean(_currentDockedId));
    document.body.classList.toggle('show-comms', showComms);
    document.body.classList.toggle('show-navs', !showComms);
    if (_hudModeNavsEl) _hudModeNavsEl.classList.toggle('is-on', !showComms);
    if (_hudModeCommsEl) _hudModeCommsEl.classList.toggle('is-on', showComms);
    if (_commModeNavsEl) _commModeNavsEl.classList.toggle('is-on', !showComms);
    if (_commModeCommsEl) _commModeCommsEl.classList.toggle('is-on', showComms);
  }

  // Accepts any subset of refs; only keys present in the object are updated.
  // Call multiple times to progressively set refs as they become available.
  function init(refs) {
    if (!refs) return;
    if ('ribbonCtx'        in refs) _ribbonCtx        = refs.ribbonCtx        || null;
    if ('ribbonCv'         in refs) _ribbonCv         = refs.ribbonCv         || null;
    if ('compassCtx'       in refs) _compassCtx       = refs.compassCtx       || null;
    if (refs.CCW != null) _CCW = refs.CCW;
    if (refs.CCH != null) _CCH = refs.CCH;
    if (refs.CCX != null) _CCX = refs.CCX;
    if (refs.CCY != null) _CCY = refs.CCY;
    if (refs.CCR != null) _CCR = refs.CCR;
    if ('hudMovePanelEl'   in refs) _hudMovePanelEl    = refs.hudMovePanelEl    || null;
    if ('hudCameraPanelEl' in refs) _hudCameraPanelEl  = refs.hudCameraPanelEl  || null;
    if ('travelPctEl'      in refs) _travelPctEl       = refs.travelPctEl       || null;
    if ('travelBoostEl'    in refs) _travelBoostEl     = refs.travelBoostEl     || null;
    if ('travelPctNumEl'   in refs) _travelPctNumEl    = refs.travelPctNumEl    || null;
    if ('travelPctLblEl'   in refs) _travelPctLblEl    = refs.travelPctLblEl    || null;
    if ('travelBoostFillEl' in refs) _travelBoostFillEl = refs.travelBoostFillEl || null;
    if ('travelBoostLblEl'  in refs) _travelBoostLblEl  = refs.travelBoostLblEl  || null;
    if ('soSelectEl'       in refs) _soSelectEl        = refs.soSelectEl        || null;
    if ('soCurrentEl'      in refs) _soCurrentEl       = refs.soCurrentEl       || null;
    if ('hudModeNavsEl'    in refs) _hudModeNavsEl     = refs.hudModeNavsEl     || null;
    if ('hudModeCommsEl'   in refs) _hudModeCommsEl    = refs.hudModeCommsEl    || null;
    if ('commModeNavsEl'   in refs) _commModeNavsEl    = refs.commModeNavsEl    || null;
    if ('commModeCommsEl'  in refs) _commModeCommsEl   = refs.commModeCommsEl   || null;
    if ('hudModeCommsBadgeEl' in refs) _hudModeCommsBadgeEl = refs.hudModeCommsBadgeEl || null;
    if ('commModeCommsBadgeEl' in refs) _commModeCommsBadgeEl = refs.commModeCommsBadgeEl || null;
    if ('commTargetEl'     in refs) _commTargetEl      = refs.commTargetEl      || null;
    if ('commUnreadEl'     in refs) _commUnreadEl      = refs.commUnreadEl      || null;
    if ('coordDistEl'      in refs) _coordDistEl       = refs.coordDistEl       || null;
    if ('coordAzEl'        in refs) _coordAzEl         = refs.coordAzEl         || null;
    if ('coordBrgEl'       in refs) _coordBrgEl        = refs.coordBrgEl        || null;
    if ('sorDistEl'        in refs) _sorDistEl         = refs.sorDistEl         || null;
    if ('sorAzEl'          in refs) _sorAzEl           = refs.sorAzEl           || null;
    if ('sorBrgEl'         in refs) _sorBrgEl          = refs.sorBrgEl          || null;
    bindHudModeSeg(_hudModeNavsEl, 'navs');
    bindHudModeSeg(_hudModeCommsEl, 'comms');
    bindHudModeSeg(_commModeNavsEl, 'navs');
    bindHudModeSeg(_commModeCommsEl, 'comms');
    syncUnreadBadges();
    applyHudMode();
  }
  function syncUnreadBadges() {
    const txt = String(Math.max(0, _unreadMessages|0));
    if (_commUnreadEl) _commUnreadEl.textContent = txt;
    if (_hudModeCommsBadgeEl) {
      _hudModeCommsBadgeEl.textContent = txt;
      _hudModeCommsBadgeEl.classList.toggle('is-hidden', _unreadMessages <= 0);
    }
    if (_commModeCommsBadgeEl) {
      _commModeCommsBadgeEl.textContent = txt;
      _commModeCommsBadgeEl.classList.toggle('is-hidden', _unreadMessages <= 0);
    }
  }
  function setUnreadMessages(n) {
    _unreadMessages = Math.max(0, n|0);
    syncUnreadBadges();
  }

  // ─── Pure formatters ─────────────────────────────────────────────────────────
  function boostLabelFromLevel(v) {
    if (v >= 2.45) return 'HYPER';
    if (v >= 1.45) return 'SUPER';
    if (v >= 0.45) return 'BOOST';
    return 'CRUISE';
  }
  function fmtDistLabel(dist) {
    if (!Number.isFinite(dist)) return '-- UA';
    const UA = Math.max(0, dist) / 10;
    return UA.toFixed(2) + ' UA';
  }
  function fmtDeg3(v) {
    const n = ((Math.round(v) % 360) + 360) % 360;
    return String(n).padStart(3, '0') + '\u00B0';
  }
  function fmtSignedDeg1(v) {
    if (!Number.isFinite(v)) return '--';
    const s = v >= 0 ? '+' : '-';
    return s + Math.abs(v).toFixed(1) + '\u00B0';
  }
  function formatSoLabel(id) {
    if (!id) return 'COSMO LIBERO';
    if (SO_LABELS[id]) return SO_LABELS[id];
    return 'SO ' + String(id || '').toUpperCase();
  }
  function parseDistToWorldUnits(input) {
    // Internal scale (same as fmtDistLabel): 1 UA = 10 world units, 1 UA = 1000 km
    // 1 a.l. = 9.461 UA, 1 pc = 206265 UA
    if (input == null) return NaN;
    let s = String(input).trim().toLowerCase();
    if (!s) return NaN;
    s = s.replace(',', '.');
    const m = s.match(/^([+-]?\d+(?:\.\d+)?)\s*([a-z\u00C0-\u024F \.\s]+)?$/i);
    if (!m) return NaN;
    const val = parseFloat(m[1]);
    if (!Number.isFinite(val)) return NaN;
    let u = (m[2] || 'ua').trim();
    u = u.replace(/\s+/g, '').replace(/\./g, '');
    let UA = NaN;
    if (u === '' || u === 'ua' || u === 'au' || u === 'uae') {
      UA = val;
    } else if (u === 'km') {
      UA = val / 1000;
    } else if (u === 'al' || u === 'anniluce' || u === 'annoluce' || u === 'ly' ||
               u === 'yr' || u === 'year' || u === 'years' || u === 'annosolare' ||
               u === 'annisolare' || u === 'as' || u === 'annisolari') {
      UA = val * 9.461;
    } else if (u === 'pc') {
      UA = val * 206265;
    } else if (u === 'wu' || u === 'unit' || u === 'units' || u === 'u') {
      return val;
    } else {
      UA = val; // unknown unit: treat as UA
    }
    return UA * 10;
  }

  // ─── DARH formatters (use SECC_CONFIG at call time) ─────────────────────────
  function formatDarhFromCoord(c) {
    if (!c) return 'D -- - A -- - R ---';
    const rr = Number.isFinite(c.r) ? c.r : (Number.isFinite(c.dist) ? c.dist : NaN);
    const dTxt = Number.isFinite(rr) ? fmtDistLabel(Math.max(0, rr)) : '--';
    const aTxt = Number.isFinite(c.az) ? fmtSignedDeg1(c.az) : '--';
    const rTxt = Number.isFinite(c.ril)
      ? String(((Math.round(c.ril) % 360) + 360) % 360).padStart(3, '0') : '---';
    return 'D ' + dTxt + ' - A ' + aTxt + ' - R ' + rTxt;
  }
  function formatDarhForSo(id) {
    if (SPECIAL_SO_COORDS[id]) {
      const s = SPECIAL_SO_COORDS[id];
      return 'D ' + s.dUA.toFixed(2) + 'UA - A ' + fmtSignedDeg1(s.aDeg) + ' - R ' + String(s.rDeg).padStart(3, '0');
    }
    const { NAV_NODES, nodePos, nodePosToCoord } = window.SECC_CONFIG;
    if (!id || !NAV_NODES[id]) return 'D -- - A -- - R ---';
    return formatDarhFromCoord(nodePosToCoord(nodePos(id)));
  }
  function formatDarhColumnsForSo(id) {
    if (SPECIAL_SO_COORDS[id]) {
      const s = SPECIAL_SO_COORDS[id];
      const sign = s.aDeg >= 0 ? '+' : '-';
      return {
        d: s.dUA.toFixed(2).padStart(7, '0') + 'UA',
        a: sign + Math.abs(s.aDeg).toFixed(1).padStart(4, '0') + '\u00B0',
        r: String(((Math.round(s.rDeg) % 360) + 360) % 360).padStart(3, '0')
      };
    }
    const { NAV_NODES, nodePos, nodePosToCoord } = window.SECC_CONFIG;
    if (!id || !NAV_NODES[id]) return { d: '----.--UA', a: '+--.-\u00B0', r: '---' };
    const c = nodePosToCoord(nodePos(id));
    const rr = Number.isFinite(c.r) ? c.r : (Number.isFinite(c.dist) ? c.dist : NaN);
    const dUA = Number.isFinite(rr) ? Math.max(0, rr) / 10 : NaN;
    let d = '----.--UA';
    if (Number.isFinite(dUA)) {
      d = dUA.toFixed(2).padStart(7, '0') + 'UA';
    }
    let a = '+--.-\u00B0';
    if (Number.isFinite(c.az)) {
      const sign = c.az >= 0 ? '+' : '-';
      a = sign + Math.abs(c.az).toFixed(1).padStart(4, '0') + '\u00B0';
    }
    const r = Number.isFinite(c.ril)
      ? String(((Math.round(c.ril) % 360) + 360) % 360).padStart(3, '0') : '---';
    return { d, a, r };
  }

  // ─── Travel overlay ──────────────────────────────────────────────────────────
  function setTravelPctOverlay(visible, pctProgress) {
    if (!_travelPctEl || !_travelPctNumEl) return;
    if (!visible) {
      _travelPctEl.classList.remove('on');
      if (_travelBoostEl) _travelBoostEl.classList.remove('on');
      _travelPctEl.style.setProperty('--tpAlpha', '0');
      _travelPctEl.style.setProperty('--tpScale', '.98');
      if (_travelBoostEl) {
        _travelBoostEl.style.setProperty('--tpAlpha', '0');
        _travelBoostEl.style.setProperty('--tpScale', '.98');
        _travelBoostEl.setAttribute('aria-hidden', 'true');
      }
      if (_travelBoostFillEl) _travelBoostFillEl.style.width = '0%';
      if (_travelBoostLblEl) _travelBoostLblEl.textContent = 'CRUISE';
      _travelPctEl.setAttribute('aria-hidden', 'true');
      return;
    }
    const pct = clamp(Math.round(pctProgress), 0, 100);
    const t = pct / 100;
    const edge = 0.12;
    const fadeIn  = clamp(t / edge, 0, 1);
    const fadeOut = clamp((1 - t) / edge, 0, 1);
    const fade  = clamp(Math.min(fadeIn, fadeOut), 0, 1);
    const alpha = (0.84 + 0.16 * fade);
    const scale = (0.98 + 0.02 * fade);
    _travelPctNumEl.textContent = pct + '%';
    if (_travelPctLblEl) _travelPctLblEl.textContent = 'COMPLETAMENTO';
    _travelPctEl.style.setProperty('--tpAlpha', alpha.toFixed(3));
    _travelPctEl.style.setProperty('--tpScale', scale.toFixed(3));
    _travelPctEl.classList.add('on');
    _travelPctEl.setAttribute('aria-hidden', 'false');
    if (_travelBoostEl) {
      _travelBoostEl.style.setProperty('--tpAlpha', alpha.toFixed(3));
      _travelBoostEl.style.setProperty('--tpScale', scale.toFixed(3));
      _travelBoostEl.classList.add('on');
      _travelBoostEl.setAttribute('aria-hidden', 'false');
    }
  }
  function setTravelBoostBar(levelNorm, label) {
    if (_travelBoostFillEl) {
      const n = clamp(levelNorm, 0, 1);
      _travelBoostFillEl.style.width = Math.round(n * 100) + '%';
      _travelBoostFillEl.style.opacity = (0.62 + 0.38 * n).toFixed(3);
    }
    if (_travelBoostLblEl && label) _travelBoostLblEl.textContent = String(label);
  }
  function updateTravelPctOverlay({ autoPilot, camPos, navTrans, thrustBoost, BOOST_HYPER_LEVEL, manualMoveActive }) {
    if (autoPilot && Array.isArray(autoPilot.targetPos) && autoPilot.targetPos.length === 3) {
      const ap = autoPilot;
      if (ap.stage === 'final-darr') {
        const fp = clamp(Number(ap.finalDarrProgress) || 0, 0, 1);
        setTravelPctOverlay(true, 99 + fp);
        setTravelBoostBar(clamp(0.35 + 0.65 * fp, 0, 1), 'DOCK');
        return;
      }
      const tx = ap.targetPos[0], ty = ap.targetPos[1], tz = ap.targetPos[2];
      const dx = tx - camPos[0], dy = ty - camPos[1], dz = tz - camPos[2];
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (Number.isFinite(dist)) {
        ap.bestDist = Math.min(Number.isFinite(ap.bestDist) ? ap.bestDist : dist, dist);
        const arrival = Math.max(0, Number(ap.arrivalDist) || 0);
        const start   = Math.max(arrival + 1e-4, Number(ap.startDist) || dist);
        const span    = Math.max(1e-4, start - arrival);
        const rem     = (Math.max(arrival, ap.bestDist) - arrival) / span;
        let progress  = (1 - clamp(rem, 0, 1)) * 100;
        if (ap.finalDarrMode) progress = Math.min(progress, 99);
        setTravelPctOverlay(true, progress);
        setTravelBoostBar(clamp(thrustBoost / BOOST_HYPER_LEVEL, 0, 1),
                          boostLabelFromLevel(thrustBoost));
        return;
      }
    }
    if (navTrans) {
      const dur = Math.max(1e-4, Number(navTrans.dur) || 1);
      const p   = clamp((Number(navTrans.t) || 0) / dur, 0, 1);
      setTravelPctOverlay(true, p * 100);
      setTravelBoostBar(clamp(Number(navTrans.warpV) || 0, 0, 1), 'WARP');
      return;
    }
    setTravelPctOverlay(true, 0);
    const moving=Boolean(manualMoveActive);
    const baseMoveLevel=0.24; // visible minimum when moving without boost
    if(!moving){
      setTravelBoostBar(0, 'STOP');
      return;
    }
    const boostN=clamp(thrustBoost / BOOST_HYPER_LEVEL, 0, 1);
    const level=baseMoveLevel + (1-baseMoveLevel)*boostN;
    setTravelBoostBar(level, boostLabelFromLevel(thrustBoost));
  }

  // ─── SO HUD ──────────────────────────────────────────────────────────────────
  // Internal helper: replicates resolveCurrentSoId logic using SECC_CONFIG.
  function _resolveCurrentSoId(activeNodeId, camPos) {
    const { MENU_DEFS, NAV_NODES, nodeCenter } = window.SECC_CONFIG;
    if (!activeNodeId || !MENU_DEFS[activeNodeId] || !NAV_NODES[activeNodeId]) return null;
    const c  = nodeCenter(activeNodeId);
    const dx = c[0] - camPos[0], dy = c[1] - camPos[1], dz = c[2] - camPos[2];
    return (Math.sqrt(dx*dx + dy*dy + dz*dz) <= SO_RELEASE_RADIUS) ? activeNodeId : null;
  }
  function refreshSoSelectDarhLabels() {
    if (!_soSelectEl) return;
    const entries = Array.from(_soSelectEl.options).filter((opt) => opt && opt.value);
    const nbsp = (n) => '\u00A0'.repeat(Math.max(0, n | 0));
    const titleWidth = entries.reduce((mx, opt) => {
      const base = (opt.dataset.baseLabel || opt.textContent || '').trim().toUpperCase();
      return Math.max(mx, base.length);
    }, 0);
    entries.forEach((opt) => {
      if (!(opt && opt.value)) return;
      if (!opt.dataset.baseLabel) opt.dataset.baseLabel = opt.textContent.trim();
      const darh      = formatDarhColumnsForSo(opt.value);
      const baseTitle = String(opt.dataset.baseLabel || '').toUpperCase();
      const title     = baseTitle + nbsp(titleWidth - baseTitle.length);
      opt.textContent = title + ' | D ' + darh.d + ' | A ' + darh.a + ' | R ' + darh.r;
    });
  }
  function syncSoHud({ activeNodeId, camPos }) {
    const id = _resolveCurrentSoId(activeNodeId, camPos);
    _currentDockedId = id;
    if (_soCurrentEl) _soCurrentEl.textContent = formatSoLabel(id);
    if (_soSelectEl)  _soSelectEl.value = '';
    document.body.classList.toggle('is-docked', Boolean(id));
    applyHudMode();
    if (_commTargetEl) _commTargetEl.textContent = _commTargetOverride || (id ? formatSoLabel(id) : 'Nessuno');
  }
  function setCommTargetLabel(label) {
    _commTargetOverride = (label == null) ? '' : String(label).trim();
    if (_commTargetEl) _commTargetEl.textContent = _commTargetOverride || (_currentDockedId ? formatSoLabel(_currentDockedId) : 'Nessuno');
  }

  // ─── DOM layout ──────────────────────────────────────────────────────────────
  function syncControlHudPanelsSize() {
    if (!_hudMovePanelEl || !_hudCameraPanelEl) return;
    _hudMovePanelEl.style.width     = '';
    _hudCameraPanelEl.style.width   = '';
    _hudMovePanelEl.style.minHeight = '';
    _hudCameraPanelEl.style.minHeight = '';
    const mw = Math.ceil(_hudMovePanelEl.getBoundingClientRect().width  || 0);
    const cw = Math.ceil(_hudCameraPanelEl.getBoundingClientRect().width  || 0);
    const mh = Math.ceil(_hudMovePanelEl.getBoundingClientRect().height || 0);
    const ch = Math.ceil(_hudCameraPanelEl.getBoundingClientRect().height || 0);
    const w = Math.max(mw, cw);
    const h = Math.max(mh, ch);
    if (!w || !h) return;
    const wPx = w + 'px', hPx = h + 'px';
    _hudMovePanelEl.style.width      = wPx;
    _hudCameraPanelEl.style.width    = wPx;
    _hudMovePanelEl.style.minHeight  = hPx;
    _hudCameraPanelEl.style.minHeight = hPx;
  }
  function syncNavHudWidthFromMovement() {
    if (!_hudMovePanelEl) return;
    const baseW = Math.round(_hudMovePanelEl.getBoundingClientRect().width || 0);
    if (!baseW) return;
    const navW = Math.max(1, Math.round(baseW * 0.5));
    document.documentElement.style.setProperty('--nav-hud-w', navW + 'px');
    if (_ribbonCv && _ribbonCv.width !== navW) _ribbonCv.width = navW;
  }
  function syncHudPanelLayout() {
    syncControlHudPanelsSize();
    syncNavHudWidthFromMovement();
  }

  // ─── Render ticks ─────────────────────────────────────────────────────────
  function ribbonTick({ camYaw, camPitch, camPos, phase, ctrlOn, animPos, animTarget }) {
    if (!_ribbonCtx || !_ribbonCv) return;
    const cw = _ribbonCv.width, ch = _ribbonCv.height;
    const ctx = _ribbonCtx;
    const { SOH } = window.SECC_CONFIG;

    const tx = SOH[0], ty = SOH[1], tz = SOH[2];
    const cp = (phase === 'done' && ctrlOn) ? camPos : animPos;
    const fw = (phase === 'done' && ctrlOn)
      ? [Math.sin(camYaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(camYaw) * Math.cos(camPitch)]
      : vnorm(vsub(animTarget, animPos));
    const yawNow = Math.atan2(fw[0], fw[2]);

    const dx = tx - cp[0], dz = tz - cp[2];
    const angT = Math.atan2(dx, dz);
    let dAng = angT - yawNow;
    dAng = (dAng + PI) % TAU; if (dAng < 0) dAng += TAU; dAng -= PI;

    const pad3 = (n) => String(((n % 360) + 360) % 360).padStart(3, '0');
    const relDegFloat = ((dAng / DEG) % 360 + 360) % 360;
    const relDeg      = ((Math.round(relDegFloat) % 360) + 360) % 360;

    const spanDeg = 60, pad = 10;
    const cx = cw * 0.5, cy = ch * 0.5;
    const pxPerDeg = (cw - 2 * pad) / (spanDeg * 2);
    const behind   = Math.abs(dAng) > PI * 0.5;

    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur    = 16;
    ctx.shadowOffsetY = 6;
    rrPath(ctx, 1, 1, cw - 2, ch - 2, 12);
    const g = ctx.createLinearGradient(0, 0, cw, 0);
    g.addColorStop(0,   'rgba(8,12,26,0.70)');
    g.addColorStop(0.5, 'rgba(6,9,20,0.88)');
    g.addColorStop(1,   'rgba(8,12,26,0.70)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    rrPath(ctx, 1, 1, cw - 2, ch - 2, 12);
    ctx.lineWidth   = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    const step    = 10;
    const fromDeg = Math.floor((relDegFloat - spanDeg) / step) * step;
    const toDeg   = Math.ceil((relDegFloat + spanDeg) / step) * step;
    for (let d = fromDeg; d <= toDeg; d += step) {
      const x = cx + (d - relDegFloat) * pxPerDeg;
      if (x < (pad - 14) || x > (cw - pad + 14)) continue;
      const is20 = (((d % 20) + 20) % 20) === 0;
      const is30 = (((d % 30) + 30) % 30) === 0;
      const yTop = is30 ? 8 : (is20 ? 10 : 12);
      const tick = is30 ? 11 : (is20 ? 8 : 5);
      ctx.globalAlpha = is30 ? 0.70 : (is20 ? 0.48 : 0.24);
      ctx.strokeStyle = 'rgba(240,235,224,0.30)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(x, yTop);        ctx.lineTo(x, yTop + tick);
      ctx.moveTo(x, ch - yTop);   ctx.lineTo(x, ch - (yTop + tick));
      ctx.stroke();
      if (is30) {
        ctx.globalAlpha = 0.72;
        ctx.fillStyle   = 'rgba(240,235,224,0.78)';
        ctx.fillText(pad3(d), x, ch - 6);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    {
      const label = pad3(relDeg);
      ctx.save();
      ctx.font         = '700 16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      const w = 54, h = 22, y = cy;
      rrPath(ctx, cx - w / 2, y - h / 2, w, h, 8);
      ctx.fillStyle   = 'rgba(0,0,0,0.55)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,232,140,' + (behind ? 0.35 : 0.75) + ')';
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.fillStyle   = 'rgba(255,232,140,' + (behind ? 0.55 : 0.95) + ')';
      ctx.fillText(label, cx, y + 0.5);
      ctx.restore();
    }
    ctx.restore();
  }

  function compassTick({ viewM }) {
    const { SOH } = window.SECC_CONFIG;
    const tx = SOH[0], ty = SOH[1], tz = SOH[2];
    const csx = viewM[0]*tx + viewM[4]*ty + viewM[8]*tz  + viewM[12];
    const csy = viewM[1]*tx + viewM[5]*ty + viewM[9]*tz  + viewM[13];
    const csz = viewM[2]*tx + viewM[6]*ty + viewM[10]*tz + viewM[14];
    const dirLen   = Math.sqrt(csx*csx + csy*csy + csz*csz) || 1;
    const nx = csx / dirLen, ny = csy / dirLen, nz = csz / dirLen;
    const frontness   = clamp(-nz, 0, 1);
    const behindAlpha = csz > 0 ? 0.34 : 1.0;
    const ex = nx, ey = -ny;

    const ctx = _compassCtx;
    ctx.clearRect(0, 0, _CCW, _CCH);

    ctx.beginPath(); ctx.arc(_CCX, _CCY, _CCR, 0, TAU);
    ctx.fillStyle   = 'rgba(4,6,18,0.62)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12, r1 = _CCR - 4, r2 = _CCR - 1;
      ctx.beginPath();
      ctx.moveTo(_CCX + Math.cos(a) * r1, _CCY + Math.sin(a) * r1);
      ctx.lineTo(_CCX + Math.cos(a) * r2, _CCY + Math.sin(a) * r2);
      ctx.strokeStyle = 'rgba(232,200,122,0.2)'; ctx.lineWidth = 1; ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(_CCX - _CCR * 0.56, _CCY); ctx.lineTo(_CCX + _CCR * 0.56, _CCY);
    ctx.moveTo(_CCX, _CCY - _CCR * 0.56); ctx.lineTo(_CCX, _CCY + _CCR * 0.56);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.stroke();

    const off      = Math.sqrt(ex * ex + ey * ey);
    const centered = off < 0.18 && frontness > 0.55;
    const arLen    = _CCR * 0.7;
    const tipX     = _CCX + ex * arLen, tipY = _CCY + ey * arLen;
    const shaftW   = 2.0 + frontness * 1.5;

    const grd = ctx.createLinearGradient(_CCX, _CCY, tipX, tipY);
    grd.addColorStop(0, 'rgba(232,200,122,' + (0.22 + frontness * 0.2) + ')');
    grd.addColorStop(1, 'rgba(255,232,140,' + (0.62 + 0.38 * behindAlpha) + ')');
    ctx.strokeStyle = grd; ctx.lineWidth = shaftW; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(_CCX, _CCY); ctx.lineTo(tipX, tipY); ctx.stroke();

    const hs = 6.0 + frontness * 2.4, arrowAngle = Math.atan2(ey, ex);
    ctx.fillStyle = 'rgba(255,232,140,' + (0.50 + 0.50 * behindAlpha) + ')';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - Math.cos(arrowAngle - 0.5) * hs, tipY - Math.sin(arrowAngle - 0.5) * hs);
    ctx.lineTo(tipX - Math.cos(arrowAngle + 0.5) * hs, tipY - Math.sin(arrowAngle + 0.5) * hs);
    ctx.closePath(); ctx.fill();

    ctx.beginPath(); ctx.arc(tipX, tipY, 1.9 + frontness * 1.3, 0, TAU);
    ctx.fillStyle = 'rgba(255,244,185,' + (0.7 + 0.3 * behindAlpha) + ')'; ctx.fill();

    const haloR = 2.4 + frontness * 1.6;
    ctx.beginPath(); ctx.arc(_CCX, _CCY, haloR, 0, TAU);
    ctx.fillStyle = 'rgba(255,246,210,' + (0.18 + frontness * 0.2) + ')'; ctx.fill();
    ctx.beginPath(); ctx.arc(_CCX, _CCY, 1.8, 0, TAU);
    ctx.fillStyle = 'rgba(232,200,122,' + (behindAlpha * 0.55) + ')'; ctx.fill();

    if (centered) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,232,140,0.94)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(_CCX, _CCY, 8.8, 0, TAU); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(_CCX - 4.2, _CCY); ctx.lineTo(_CCX + 4.2, _CCY);
      ctx.moveTo(_CCX, _CCY - 4.2); ctx.lineTo(_CCX, _CCY + 4.2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.font = '600 7px "Rajdhani",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const aR = 0.2 + Math.max(0,  nx) * 0.65, aL = 0.2 + Math.max(0, -nx) * 0.65;
    const aU = 0.2 + Math.max(0,  ny) * 0.65, aD = 0.2 + Math.max(0, -ny) * 0.65;
    ctx.fillStyle = 'rgba(232,200,122,' + aL + ')'; ctx.fillText('L',    _CCX - _CCR - 6, _CCY);
    ctx.fillStyle = 'rgba(232,200,122,' + aR + ')'; ctx.fillText('R',    _CCX + _CCR + 6, _CCY);
    ctx.fillStyle = 'rgba(232,200,122,' + aU + ')'; ctx.fillText('UP',   _CCX, _CCY - _CCR - 6);
    ctx.fillStyle = 'rgba(232,200,122,' + aD + ')'; ctx.fillText('DN',   _CCX, _CCY + _CCR + 6);
    ctx.font = 'bold 7px "Rajdhani",sans-serif';
    ctx.fillStyle = 'rgba(255,232,140,' + (0.28 + frontness * 0.72) + ')';
    ctx.fillText(frontness > 0.5 ? 'FWD' : 'BACK', _CCX, _CCY + _CCR + 9);
  }

  // Returns the coord {dist,azElev,rilDeg} so the caller can update coordLast.
  function coordTick({ phase, camPos, activeNodeId, sorOrigin }) {
    if (!_coordDistEl || !_coordAzEl || !_coordBrgEl) return null;
    if (phase !== 'done') return null;
    const { SOH, azDegFromXZ, MENU_DEFS, NAV_NODES, nodeCenter } = window.SECC_CONFIG;

    // calcCoordToSOH
    const dx = camPos[0] - SOH[0], dy = camPos[1] - SOH[1], dz = camPos[2] - SOH[2];
    const dist  = Math.sqrt(dx*dx + dy*dy + dz*dz);
    const horiz = Math.sqrt(dx*dx + dz*dz);
    const azElev = Math.atan2(dy, horiz || 1e-9) / DEG;
    const rilDeg = ((Math.round(azDegFromXZ(dx, dz)) % 360) + 360) % 360;
    const c = { dist, azElev, rilDeg };

    _coordDistEl.textContent = fmtDistLabel(c.dist);
    _coordAzEl.textContent   = fmtSignedDeg1(c.azElev);
    _coordBrgEl.textContent  = String(c.rilDeg).padStart(3, '0');

    if (_sorDistEl && _sorAzEl && _sorBrgEl) {
      // calcCoordToAttachedTarget (inline): explicit attached origin first, then docked SO fallback.
      let s = null;
      if (Array.isArray(sorOrigin) && sorOrigin.length === 3
          && Number.isFinite(sorOrigin[0]) && Number.isFinite(sorOrigin[1]) && Number.isFinite(sorOrigin[2])) {
        const ddx = camPos[0] - sorOrigin[0], ddy = camPos[1] - sorOrigin[1], ddz = camPos[2] - sorOrigin[2];
        const ddist = Math.sqrt(ddx*ddx + ddy*ddy + ddz*ddz);
        const hh = Math.sqrt(ddx*ddx + ddz*ddz);
        s = {
          dist:   ddist,
          azElev: Math.atan2(ddy, hh || 1e-9) / DEG,
          rilDeg: ((Math.round(azDegFromXZ(ddx, ddz)) % 360) + 360) % 360
        };
      } else if (activeNodeId && MENU_DEFS[activeNodeId] && NAV_NODES[activeNodeId]) {
        const origin = nodeCenter(activeNodeId);
        if (origin && Number.isFinite(origin[0])) {
          const ddx = camPos[0] - origin[0], ddy = camPos[1] - origin[1], ddz = camPos[2] - origin[2];
          const ddist = Math.sqrt(ddx*ddx + ddy*ddy + ddz*ddz);
          if (ddist <= SO_RELEASE_RADIUS) {
            const hh = Math.sqrt(ddx*ddx + ddz*ddz);
            s = {
              dist:   ddist,
              azElev: Math.atan2(ddy, hh || 1e-9) / DEG,
              rilDeg: ((Math.round(azDegFromXZ(ddx, ddz)) % 360) + 360) % 360
            };
          }
        }
      }
      if (s) {
        _sorDistEl.textContent = fmtDistLabel(s.dist);
        _sorAzEl.textContent   = fmtSignedDeg1(s.azElev);
        _sorBrgEl.textContent  = String(s.rilDeg).padStart(3, '0');
      } else {
        _sorDistEl.textContent = '--';
        _sorAzEl.textContent   = '--';
        _sorBrgEl.textContent  = '--';
      }
    }
    return c; // caller stores into coordLast
  }

  // ─── Public API ──────────────────────────────────────────────────────────────
  return {
    init,
    // Pure formatters
    boostLabelFromLevel, fmtDistLabel, fmtDeg3, fmtSignedDeg1,
    parseDistToWorldUnits, formatSoLabel,
    formatDarhFromCoord, formatDarhForSo, formatDarhColumnsForSo,
    // Travel overlay
    setTravelPctOverlay, setTravelBoostBar, updateTravelPctOverlay,
    // SO HUD
    refreshSoSelectDarhLabels, syncSoHud, setUnreadMessages, setCommTargetLabel,
    // DOM layout
    syncControlHudPanelsSize, syncNavHudWidthFromMovement, syncHudPanelLayout,
    // Render ticks
    ribbonTick, compassTick, coordTick,
  };
})();
