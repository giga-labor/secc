const CARDS = {
  CARD_SIZE: Object.freeze({
    minPx: 178,
    maxPx: 210,
    fluidWidth: '24vw'
  }),

  _cardSizingReady: false,
  _componentStylesReady: false,
  _globalTipReady: false,
  _globalTipEl: null,
  _csvRowsCache: new Map(),
  _latestDrawDataPromise: null,
  _rankingCache: new Map(),
  _rankingPositionCache: null,
  _rankingPositionPromise: null,
  _tipTemplateHistory: Object.create(null),
  _rankingPayouts: Object.freeze({
    0: 1.53,
    1: 3.36,
    2: 21.51,
    3: 326.72,
    4: 11906.95,
    5: 1235346.49,
    6: 622614630.0
  }),

  ensureComponentStyles() {
    if (this._componentStylesReady) return;
    this._componentStylesReady = true;
    const styleId = 'cc-cards-component-style-v1';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .cc-card3d {
        --card-rotate-x: 0deg;
        --card-rotate-y: 0deg;
        --card-lift: 0px;
        --card-z: 0px;
        --card-glow-x: 50%;
        --card-glow-y: 8%;
        --edge-left-a: 0.14;
        --edge-right-a: 0.14;
        --edge-top-a: 0.16;
        --edge-bottom-a: 0.18;
        --edge-spread: 5%;
        --edge-spread-top: 4%;
        --edge-spread-bottom: 6%;
        --edge-left-w: 2px;
        --edge-right-w: 2px;
        --edge-top-w: 2px;
        --edge-bottom-w: 3px;
        position: relative;
        transform-style: preserve-3d;
        isolation: isolate;
        overflow: hidden;
        border-radius: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.22);
        background:
          linear-gradient(160deg, rgba(52, 61, 112, 0.66), rgba(21, 27, 50, 0.6) 57%, rgba(8, 10, 20, 0.56)),
          radial-gradient(120% 80% at 18% -10%, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0) 55%);
        backdrop-filter: blur(7px) saturate(1.12);
        -webkit-backdrop-filter: blur(7px) saturate(1.12);
        transform: perspective(920px) rotateX(calc(var(--card-rotate-x))) rotateY(calc(var(--card-rotate-y))) translateY(var(--card-lift)) translateZ(var(--card-z));
        transition: transform 130ms cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 180ms ease, border-color 180ms ease, filter 180ms ease;
        will-change: transform;
      }
      .cc-card3d::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        transform: translateZ(14px);
        background:
          radial-gradient(58% 42% at 16% 8%, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0) 70%),
          radial-gradient(circle at var(--card-glow-x) var(--card-glow-y), rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0) 46%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0) 56%),
          radial-gradient(ellipse at 50% 100%, rgba(255, 217, 102, 0.2), rgba(255, 217, 102, 0) 66%);
      }
      .cc-card3d::after {
        content: '';
        position: absolute;
        inset: 1px;
        border-radius: inherit;
        pointer-events: none;
        transform: translateZ(10px);
        background:
          linear-gradient(135deg, rgba(4, 6, 12, var(--edge-right-a)) 0%, rgba(4, 6, 12, 0) calc(42% + var(--edge-spread))),
          linear-gradient(45deg, rgba(3, 5, 10, var(--edge-bottom-a)) 0%, rgba(3, 5, 10, 0) calc(44% + var(--edge-spread-bottom))),
          linear-gradient(90deg, rgba(255, 246, 212, var(--edge-left-a)) 0%, rgba(255, 246, 212, 0) calc(var(--edge-left-w) + var(--edge-spread))),
          linear-gradient(270deg, rgba(7, 9, 18, var(--edge-right-a)) 0%, rgba(7, 9, 18, 0) calc(var(--edge-right-w) + var(--edge-spread))),
          linear-gradient(180deg, rgba(255, 255, 255, var(--edge-top-a)) 0%, rgba(255, 255, 255, 0) calc(var(--edge-top-w) + var(--edge-spread-top))),
          linear-gradient(0deg, rgba(0, 0, 0, var(--edge-bottom-a)) 0%, rgba(0, 0, 0, 0) calc(var(--edge-bottom-w) + var(--edge-spread-bottom)));
        box-shadow:
          inset 0 16px 24px rgba(255, 255, 255, 0.16),
          inset 0 -22px 0 rgba(8, 10, 20, 0.9),
          inset 0 -30px 24px rgba(0, 0, 0, 0.72),
          inset 0 0 0 1px rgba(255, 217, 102, 0.2);
      }
      .cc-card3d.cc-card-tone-alg-stat {
        border-color: rgba(122, 188, 219, 0.58);
        background:
          linear-gradient(160deg, rgba(46, 83, 102, 0.64), rgba(24, 49, 66, 0.6) 57%, rgba(12, 27, 40, 0.56)),
          radial-gradient(120% 80% at 18% -10%, rgba(174, 220, 244, 0.2), rgba(174, 220, 244, 0) 55%);
      }
      .cc-card3d.cc-card-tone-alg-neural {
        border-color: rgba(160, 137, 222, 0.56);
        background:
          linear-gradient(160deg, rgba(63, 48, 96, 0.66), rgba(34, 27, 61, 0.62) 57%, rgba(18, 14, 36, 0.58)),
          radial-gradient(120% 80% at 18% -10%, rgba(202, 184, 255, 0.2), rgba(202, 184, 255, 0) 55%);
      }
      .cc-card3d.cc-card-tone-alg-hybrid {
        border-color: rgba(111, 196, 156, 0.56);
        background:
          linear-gradient(160deg, rgba(38, 86, 74, 0.66), rgba(22, 55, 46, 0.62) 57%, rgba(12, 34, 30, 0.58)),
          radial-gradient(120% 80% at 18% -10%, rgba(171, 234, 206, 0.2), rgba(171, 234, 206, 0) 55%);
      }
      .cc-card3d.cc-card-tone-alg-core {
        border-color: rgba(207, 170, 102, 0.58);
        background:
          linear-gradient(160deg, rgba(98, 72, 34, 0.66), rgba(61, 43, 21, 0.62) 57%, rgba(34, 24, 13, 0.58)),
          radial-gradient(120% 80% at 18% -10%, rgba(245, 216, 162, 0.2), rgba(245, 216, 162, 0) 55%);
      }
      .cc-card3d.cc-card-tone-menu {
        border-color: rgba(129, 154, 221, 0.54);
        background:
          linear-gradient(160deg, rgba(44, 58, 98, 0.66), rgba(25, 34, 64, 0.62) 57%, rgba(14, 20, 40, 0.58)),
          radial-gradient(120% 80% at 18% -10%, rgba(181, 199, 255, 0.18), rgba(181, 199, 255, 0) 55%);
      }
      .cc-card3d.cc-card-tone-archivi {
        border-color: rgba(108, 182, 188, 0.54);
        background:
          linear-gradient(160deg, rgba(36, 78, 86, 0.66), rgba(20, 50, 56, 0.62) 57%, rgba(11, 30, 34, 0.58)),
          radial-gradient(120% 80% at 18% -10%, rgba(164, 226, 230, 0.18), rgba(164, 226, 230, 0) 55%);
      }
      .cc-card3d.cc-card-tone-stato {
        border-color: rgba(207, 127, 139, 0.56);
        background:
          linear-gradient(160deg, rgba(95, 43, 52, 0.66), rgba(60, 26, 33, 0.62) 57%, rgba(34, 15, 19, 0.58)),
          radial-gradient(120% 80% at 18% -10%, rgba(245, 183, 191, 0.18), rgba(245, 183, 191, 0) 55%);
      }
      .cc-card3d.cc-card-tone-info {
        border-color: rgba(142, 169, 202, 0.54);
        background:
          linear-gradient(160deg, rgba(50, 70, 98, 0.66), rgba(29, 43, 64, 0.62) 57%, rgba(16, 24, 40, 0.58)),
          radial-gradient(120% 80% at 18% -10%, rgba(194, 214, 246, 0.18), rgba(194, 214, 246, 0) 55%);
      }
      .cc-card3d .cc-card-proposal.text-black {
        color: #000 !important;
        font-weight: 900 !important;
        text-shadow: none !important;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(248, 255, 178, 1) 24%, rgba(227, 255, 98, 1) 58%, rgba(206, 255, 62, 1) 100%) !important;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.98),
          inset 0 -2px 0 rgba(70, 88, 0, 0.5),
          0 0 20px rgba(255, 255, 255, 0.98),
          0 0 36px rgba(216, 255, 76, 1),
          0 0 58px rgba(178, 255, 30, 0.95) !important;
      }
      .cc-card3d.cc-card-tone-alg-stat .cc-card-proposal.text-black.has-balls {
        background: linear-gradient(
          180deg,
          rgba(168, 210, 232, 0.96) 0%,
          rgba(120, 179, 208, 0.94) 44%,
          rgba(82, 143, 176, 0.92) 100%
        ) !important;
        box-shadow:
          inset 0 1px 0 rgba(230, 246, 255, 0.44),
          inset 0 -2px 0 rgba(18, 62, 82, 0.5),
          0 0 6px rgba(120, 196, 232, 0.22),
          0 0 10px rgba(54, 147, 196, 0.14) !important;
      }
      .cc-card3d.cc-card-tone-alg-stat .cc-card-proposal.has-balls {
        color: #071c25 !important;
        border-color: rgba(132, 194, 224, 0.7) !important;
        background: linear-gradient(180deg, rgba(159, 211, 235, 0.9), rgba(108, 170, 201, 0.88)) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 4px 10px rgba(0, 0, 0, 0.28) !important;
      }
      .cc-card3d.cc-card-tone-alg-neural .cc-card-proposal.has-balls {
        color: #efe9ff !important;
        border-color: rgba(178, 159, 237, 0.7) !important;
        background: linear-gradient(180deg, rgba(103, 81, 156, 0.9), rgba(72, 55, 118, 0.88)) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 4px 10px rgba(0, 0, 0, 0.3) !important;
      }
      .cc-card3d.cc-card-tone-alg-hybrid .cc-card-proposal.has-balls {
        color: #052117 !important;
        border-color: rgba(116, 196, 160, 0.7) !important;
        background: linear-gradient(180deg, rgba(128, 207, 171, 0.9), rgba(79, 154, 123, 0.88)) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 4px 10px rgba(0, 0, 0, 0.28) !important;
      }
      .cc-card3d.cc-card-tone-alg-core .cc-card-proposal.has-balls {
        color: #251703 !important;
        border-color: rgba(209, 172, 106, 0.72) !important;
        background: linear-gradient(180deg, rgba(220, 188, 127, 0.9), rgba(176, 133, 63, 0.88)) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 4px 10px rgba(0, 0, 0, 0.28) !important;
      }
      .cc-card3d.cc-card-tone-menu .cc-card-proposal.has-balls {
        color: #eaf0ff !important;
        border-color: rgba(141, 166, 228, 0.68) !important;
        background: linear-gradient(180deg, rgba(95, 116, 176, 0.9), rgba(62, 78, 132, 0.88)) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 4px 10px rgba(0, 0, 0, 0.3) !important;
      }
      .cc-card3d.cc-card-tone-archivi .cc-card-proposal.has-balls {
        color: #e7f9fb !important;
        border-color: rgba(124, 194, 203, 0.66) !important;
        background: linear-gradient(180deg, rgba(84, 153, 161, 0.9), rgba(54, 111, 118, 0.88)) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 4px 10px rgba(0, 0, 0, 0.3) !important;
      }
      .cc-card3d.cc-card-tone-stato .cc-card-proposal.has-balls {
        color: #ffeef1 !important;
        border-color: rgba(214, 138, 151, 0.7) !important;
        background: linear-gradient(180deg, rgba(162, 80, 95, 0.9), rgba(118, 53, 64, 0.88)) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 10px rgba(0, 0, 0, 0.32) !important;
      }
      .cc-card3d.cc-card-tone-info .cc-card-proposal.has-balls {
        color: #edf4ff !important;
        border-color: rgba(151, 178, 211, 0.68) !important;
        background: linear-gradient(180deg, rgba(92, 119, 154, 0.9), rgba(62, 83, 115, 0.88)) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 4px 10px rgba(0, 0, 0, 0.3) !important;
      }
      .cc-global-card-tip {
        position: fixed;
        z-index: 9999;
        width: min(34rem, calc(100vw - 2rem));
        min-height: 9rem;
        pointer-events: none;
        border-radius: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: rgba(13, 20, 34, 0.92);
        backdrop-filter: blur(8px) saturate(1.06);
        -webkit-backdrop-filter: blur(8px) saturate(1.06);
        padding: 0.9rem 1rem;
        color: #f1f7ff;
        text-shadow: 0 1px 0 rgba(0, 0, 0, 0.62);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 16px 34px rgba(0, 0, 0, 0.34);
        opacity: 0;
        visibility: hidden;
        transition: opacity 140ms ease, visibility 140ms ease;
        overflow-x: hidden;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      .cc-global-card-tip::after {
        content: '';
        position: absolute;
        top: 50%;
        width: 0;
        height: 0;
        transform: translateY(-50%);
        border-top: 10px solid transparent;
        border-bottom: 10px solid transparent;
      }
      .cc-global-card-tip[data-side="right"]::after {
        left: -9px;
        border-right: 9px solid rgba(13, 20, 34, 0.92);
      }
      .cc-global-card-tip[data-side="left"]::after {
        right: -9px;
        border-left: 9px solid rgba(13, 20, 34, 0.92);
      }
      .cc-global-card-tip.is-visible {
        opacity: 1;
        visibility: visible;
      }
      .cc-global-card-tip__title {
        display: block;
        font-size: 0.76rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        opacity: 0.96;
      }
      .cc-global-card-tip__line {
        display: block;
        margin-top: 0.35rem;
        font-size: 1rem;
        line-height: 1.26;
        font-weight: 800;
      }
      .cc-global-card-tip__hits {
        display: block;
        margin-top: 0.34rem;
        font-size: 0.88rem;
        line-height: 1.28;
        opacity: 0.98;
      }
      .cc-global-card-tip__recent {
        display: block;
        margin-top: 0.52rem;
        padding: 0.4rem 0.56rem 0.46rem;
        border-radius: 0.62rem;
        border: 1px solid rgba(255, 216, 109, 0.58);
        background:
          linear-gradient(180deg, rgba(255, 214, 94, 0.23), rgba(255, 214, 94, 0.12)),
          rgba(26, 22, 10, 0.74);
        color: #fff3c9;
        font-size: 0.85rem;
        line-height: 1.28;
        font-weight: 700;
        letter-spacing: 0.01em;
        text-shadow: 0 1px 0 rgba(0, 0, 0, 0.52);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 8px 18px rgba(0, 0, 0, 0.28);
      }
      .cc-global-card-tip__recent strong {
        font-weight: 800;
        letter-spacing: 0.06em;
        margin-right: 0.28rem;
      }
      .cc-global-card-tip--alg-stat { border-color: rgba(143, 206, 236, 0.64); background: rgba(24, 63, 85, 0.94); color: #eaf9ff; }
      .cc-global-card-tip--alg-neural { border-color: rgba(183, 162, 244, 0.64); background: rgba(43, 33, 73, 0.94); color: #f2ecff; }
      .cc-global-card-tip--alg-hybrid { border-color: rgba(126, 203, 165, 0.64); background: rgba(23, 63, 49, 0.94); color: #e9fff2; }
      .cc-global-card-tip--alg-core { border-color: rgba(216, 183, 120, 0.64); background: rgba(74, 50, 21, 0.94); color: #fff2df; }
      .cc-global-card-tip--menu { border-color: rgba(148, 174, 232, 0.62); background: rgba(33, 46, 81, 0.94); color: #eef2ff; }
      .cc-global-card-tip--archivi { border-color: rgba(132, 201, 211, 0.62); background: rgba(24, 58, 65, 0.94); color: #eafcff; }
      .cc-global-card-tip--stato { border-color: rgba(216, 143, 156, 0.62); background: rgba(72, 30, 39, 0.94); color: #ffeef2; }
      .cc-global-card-tip--info { border-color: rgba(158, 186, 220, 0.62); background: rgba(31, 48, 70, 0.94); color: #edf5ff; }
      .cc-tier-ribbon {
        position: absolute;
        top: 10px;
        right: -8px;
        width: auto;
        transform: rotate(45deg) translateZ(16px);
        transform-origin: center;
        pointer-events: none;
        z-index: 18;
        text-align: center;
      }
      .cc-tier-ribbon__inner {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.24rem;
        min-width: 0;
        width: max-content;
        padding: 0.28rem 0.62rem 0.24rem;
        border-radius: 0.34rem;
        border: 1px solid rgba(255,255,255,0.52);
        letter-spacing: 0.1em;
        font-size: 0.67rem;
        font-weight: 900;
        text-transform: uppercase;
        text-shadow: 0 1px 0 rgba(0,0,0,0.55), 0 0 8px rgba(0,0,0,0.25);
        white-space: nowrap;
      }
      .cc-tier-ribbon--free .cc-tier-ribbon__inner {
        color: #2af07b;
        background: transparent;
        border-color: transparent;
        font-size: 0.8rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        -webkit-text-stroke: 0.55px rgba(255, 255, 255, 0.96);
        text-shadow:
          0 1px 0 rgba(255,255,255,0.88),
          0 4px 10px rgba(0,0,0,0.96),
          0 8px 18px rgba(0,0,0,0.9),
          0 12px 26px rgba(0,0,0,0.82),
          0 16px 34px rgba(0,0,0,0.7),
          0 0 12px rgba(52, 244, 138, 0.34);
        box-shadow: none;
      }
      .cc-tier-ribbon--premium .cc-tier-ribbon__inner,
      .cc-tier-ribbon--gold .cc-tier-ribbon__inner {
        color: #2b1400;
        border-color: rgba(255, 235, 158, 0.95);
        background: linear-gradient(180deg, #fff9dc 0%, #f4d87a 36%, #cc9a27 70%, #a46f08 100%);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.9),
          inset 0 -2px 0 rgba(90, 53, 0, 0.72),
          0 0 0 1px rgba(255, 222, 112, 0.84),
          0 10px 18px rgba(144, 95, 5, 0.45),
          0 0 24px rgba(255, 202, 70, 0.55);
      }
      .cc-tier-ribbon--gold .cc-tier-ribbon__inner {
        padding-left: 0.56rem;
        padding-right: 0.58rem;
      }
      .cc-tier-crown {
        display: inline-block;
        font-size: 0.65rem;
        line-height: 1;
        color: #5b2e00;
        text-shadow: 0 1px 0 rgba(255, 245, 186, 0.75);
      }
      .cc-card-media .card-type-badge.card-type-badge--category {
        top: 0.5rem;
        left: 0.56rem;
        right: auto;
        bottom: auto;
        transform: none;
        min-width: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        backdrop-filter: none;
        padding: 0;
        line-height: 1;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        font-style: normal;
        font-family: "Palatino Linotype", "Book Antiqua", "Garamond", serif;
        font-size: 0.7rem;
        font-weight: 500;
        color: #ffe7ad;
        -webkit-text-stroke: 0.22px rgba(255, 251, 236, 0.92);
        text-shadow:
          0 1px 0 rgba(255, 255, 255, 0.42),
          0 1px 0 rgba(89, 54, 0, 0.68),
          0 3px 7px rgba(0, 0, 0, 0.9),
          0 6px 14px rgba(0, 0, 0, 0.78),
          0 0 8px rgba(255, 206, 77, 0.5);
        filter:
          drop-shadow(0 1px 0 rgba(255, 248, 224, 0.72))
          drop-shadow(0 3px 8px rgba(0, 0, 0, 0.88));
      }
      .card-type-badge.card-type-badge--news {
        top: auto;
        left: 0.55rem;
        bottom: 0.42rem;
        transform: none;
        min-width: 0;
        text-align: left;
        justify-content: flex-start;
        letter-spacing: 0.015em;
        text-transform: none;
        font-style: italic;
        font-family: "Segoe Script", "Lucida Handwriting", "Bradley Hand", "Brush Script MT", cursive;
        font-size: 0.82rem;
        font-weight: 700;
        background: linear-gradient(180deg, #ff4a4a 0%, #d91515 100%);
        border-radius: 0.42rem;
        padding: 0.08rem 0.38rem;
        color: #ffffff;
        -webkit-text-stroke: 0.45px rgba(255, 255, 255, 0.92);
        text-shadow:
          0 1px 0 rgba(255,255,255,0.45),
          0 2px 6px rgba(0,0,0,0.78),
          0 0 10px rgba(0,0,0,0.35);
      }
      .cc-ranking-strip {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 1.42rem;
        min-height: 7.8rem;
        border-left: none;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 30;
        pointer-events: none;
      }
      .cc-ranking-strip__text {
        writing-mode: vertical-rl;
        text-orientation: mixed;
        transform: rotate(180deg);
        font-size: 0.56rem;
        line-height: 1;
        letter-spacing: 0.08em;
        color: #ffe6a0;
        font-weight: 500;
        font-family: "Palatino Linotype", "Book Antiqua", "Garamond", serif;
        -webkit-text-stroke: 0.2px #000;
        text-shadow: 0 0 8px rgba(255, 217, 102, 0.4);
        white-space: nowrap;
      }
      .cc-hit-stamp {
        position: absolute;
        left: 50%;
        top: 52%;
        transform: translate(-50%, -50%) rotate(-24deg) translateZ(32px);
        z-index: 16;
        pointer-events: none;
        min-width: 11.5rem;
        padding: 0.44rem 0.86rem 0.5rem;
        border-radius: 0.62rem;
        border: 2px solid rgba(255, 236, 236, 0.96);
        background:
          linear-gradient(180deg, rgba(220, 20, 20, 0.3), rgba(130, 0, 0, 0.2)),
          repeating-linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.06) 0 7px,
            rgba(255, 255, 255, 0) 7px 14px
          );
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.3),
          inset 0 -1px 0 rgba(88, 0, 0, 0.5),
          0 0 0 1px rgba(110, 0, 0, 0.52),
          0 8px 24px rgba(0, 0, 0, 0.42),
          0 0 28px rgba(255, 42, 42, 0.34);
        text-align: center;
        color: #ffecec;
        text-transform: uppercase;
      }
      .cc-hit-stamp__line {
        display: block;
        font-size: 0.5rem;
        letter-spacing: 0.2em;
        font-weight: 800;
        opacity: 0.9;
      }
      .cc-hit-stamp__value {
        display: block;
        margin-top: 0.08rem;
        font-size: 1.02rem;
        letter-spacing: 0.12em;
        font-weight: 900;
        line-height: 1;
        text-shadow:
          1px 1px 0 rgba(88, 0, 0, 0.82),
          -1px -1px 0 rgba(255, 255, 255, 0.22),
          0 0 10px rgba(255, 90, 90, 0.45);
      }
      .cc-card3d .cc-card-media-frame {
        position: relative;
        flex: 0 0 auto;
        width: 100%;
        aspect-ratio: 15 / 8;
        min-height: 0 !important;
        max-height: none !important;
        overflow: hidden;
      }
      .cc-card3d .cc-card-media-frame > img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        display: block;
      }
      .cc-card3d[data-cc-card-root="1"] {
        contain: layout paint;
      }
      .cc-card3d[data-cc-card-root="1"] .cc-card-media-frame {
        position: relative !important;
        flex: 0 0 auto !important;
        width: 100% !important;
        aspect-ratio: 15 / 8 !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: hidden !important;
      }
      .cc-card3d[data-cc-card-root="1"] .cc-card-media-frame > img {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        object-position: center !important;
        display: block !important;
      }
      .cc-card3d .ball-3d {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.86rem;
        height: 1.86rem;
        border-radius: 999px;
        font-size: 0.79rem;
        font-weight: 800;
        color: #0c0900;
        -webkit-text-stroke: 0.58px rgba(0, 0, 0, 0.98);
        paint-order: stroke fill;
        text-shadow:
          0 1px 0 rgba(0, 0, 0, 0.88),
          0 0 1px rgba(0, 0, 0, 0.92);
        background:
          radial-gradient(circle at 28% 24%, rgba(255, 255, 255, 0.78) 0 18%, rgba(255, 255, 255, 0.14) 34%, rgba(255, 255, 255, 0) 56%),
          radial-gradient(circle at 48% 76%, rgba(255, 245, 194, 0.66) 0 30%, rgba(240, 186, 56, 0.36) 54%, rgba(96, 61, 5, 0.92) 100%),
          linear-gradient(170deg, #fff7d0 0%, #ffd66d 32%, #d9a129 66%, #7b4a00 100%);
        border: 1px solid rgba(255, 226, 142, 0.95);
        box-shadow:
          inset 0 2px 2px rgba(255, 255, 255, 0.78),
          inset 0 -8px 14px rgba(40, 25, 2, 0.62),
          inset 0 0 10px rgba(255, 245, 199, 0.28),
          calc(var(--edge-right-a) * 24px) calc(var(--edge-bottom-a) * 22px) 14px rgba(5, 7, 15, 0.48),
          calc(var(--edge-right-a) * 10px) calc(var(--edge-bottom-a) * 9px) 0 rgba(8, 12, 24, 0.4),
          0 10px 16px rgba(4, 8, 18, 0.62),
          0 2px 0 rgba(9, 12, 22, 0.55),
          0 0 12px rgba(255, 212, 102, 0.84),
          0 0 28px rgba(255, 212, 102, 0.4);
        transform: translateZ(26px) translateY(-1px);
        transform-style: preserve-3d;
      }
      .cc-card3d:hover .ball-3d,
      .cc-card3d.is-hovered .ball-3d {
        transform: translateZ(28px) translateY(-2px);
      }
      .cc-card3d.cc-card-tone-alg-stat .ball-3d {
        background:
          radial-gradient(circle at 28% 24%, rgba(255, 255, 255, 0.54) 0 18%, rgba(255, 255, 255, 0.08) 34%, rgba(255, 255, 255, 0) 56%),
          radial-gradient(circle at 48% 76%, rgba(206, 183, 124, 0.44) 0 30%, rgba(169, 140, 83, 0.28) 54%, rgba(74, 57, 25, 0.88) 100%),
          linear-gradient(170deg, #f4ebd1 0%, #decba0 32%, #ae8f54 66%, #62461d 100%);
        border: 1px solid rgba(235, 216, 172, 0.9);
        box-shadow:
          inset 0 2px 2px rgba(255, 255, 255, 0.44),
          inset 0 -8px 14px rgba(45, 31, 8, 0.58),
          inset 0 0 10px rgba(245, 229, 188, 0.22),
          calc(var(--edge-right-a) * 24px) calc(var(--edge-bottom-a) * 22px) 14px rgba(5, 7, 15, 0.48),
          calc(var(--edge-right-a) * 10px) calc(var(--edge-bottom-a) * 9px) 0 rgba(8, 12, 24, 0.4),
          0 10px 16px rgba(4, 8, 18, 0.62),
          0 2px 0 rgba(9, 12, 22, 0.55),
          0 0 8px rgba(219, 186, 115, 0.36),
          0 0 16px rgba(219, 186, 115, 0.18);
      }
      .cc-card3d .ball-3d::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        background:
          radial-gradient(circle at 30% 22%, rgba(255, 255, 255, 0.24) 0 12%, rgba(255, 255, 255, 0.03) 28%, rgba(255, 255, 255, 0) 46%),
          radial-gradient(circle at 54% 84%, rgba(99, 57, 0, 0.34) 0 26%, rgba(99, 57, 0, 0) 56%);
      }
      .cc-card3d .ball-3d::after {
        content: '';
        position: absolute;
        left: 22%;
        top: 18%;
        width: 28%;
        height: 28%;
        border-radius: 999px;
        pointer-events: none;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0) 70%);
        filter: blur(0.45px);
        opacity: 0.22;
      }
    `;
    document.head.appendChild(style);
  },

  ensureCardSizing() {
    if (this._cardSizingReady) return;
    this._cardSizingReady = true;
    const root = document?.documentElement;
    if (!root) return;
    root.style.setProperty('--card-min', `${this.CARD_SIZE.minPx}px`);
    root.style.setProperty('--card-max', `${this.CARD_SIZE.maxPx}px`);
  },

  getCardSizing() {
    this.ensureCardSizing();
    const minPx = this.CARD_SIZE.minPx;
    const maxPx = this.CARD_SIZE.maxPx;
    const fluidWidth = this.CARD_SIZE.fluidWidth;
    return {
      minPx,
      maxPx,
      fluidWidth,
      min: `${minPx}px`,
      max: `${maxPx}px`,
      clamp: `clamp(${minPx}px, ${fluidWidth}, ${maxPx}px)`
    };
  },

  applyFeatures(area) {
    const cards = area.querySelectorAll('[data-card-id]');
    cards.forEach((card) => {
      const features = (card.dataset.features || '').split(',').map((item) => item.trim()).filter(Boolean);
      if (features.includes('draws-latest')) {
        this.applyDrawsLatest(card);
      }
    });
  },

  ensureGlobalCardTip() {
    if (this._globalTipReady && this._globalTipEl) return this._globalTipEl;
    this._globalTipReady = true;
    let el = document.getElementById('cc-global-card-tip');
    if (!el) {
      el = document.createElement('aside');
      el.id = 'cc-global-card-tip';
      el.className = 'cc-global-card-tip';
      document.body.appendChild(el);
    }
    this._globalTipEl = el;
    const hide = () => this.hideGlobalCardTip();
    window.addEventListener('scroll', hide, { passive: true });
    window.addEventListener('resize', hide, { passive: true });
    return el;
  },

  showGlobalCardTip(card, payload = {}) {
    const el = this.ensureGlobalCardTip();
    if (!el || !card) return;
    const tone = String(payload.tone || '').trim();
    const title = String(payload.title || '').trim();
    const line = String(payload.line || '').trim();
    const recent = String(payload.recent || '').trim();
    const hits = String(payload.hits || '').trim();
    const cta = String(payload.cta || '').trim();
    el.className = `cc-global-card-tip${tone ? ` cc-global-card-tip--${tone}` : ''}`;
    el.innerHTML =
      `<span class="cc-global-card-tip__title">${this.escapeHtml(title)}</span>` +
      `<span class="cc-global-card-tip__line">${this.escapeHtml(line)}</span>` +
      (recent ? `<span class="cc-global-card-tip__recent"><strong>RECENTE</strong>${this.escapeHtml(recent)}</span>` : '') +
      (hits ? `<span class="cc-global-card-tip__hits">${this.escapeHtml(hits)}</span>` : '') +
      (cta ? `<span class="cc-global-card-tip__hits">${this.escapeHtml(cta)}</span>` : '');

    const rect = card.getBoundingClientRect();
    const margin = 14;
    const safe = this.getGlobalTipSafeArea(12);
    const safeWidth = Math.max(260, safe.right - safe.left);
    const width = Math.min(544, Math.max(260, Math.min(window.innerWidth - 24, safeWidth)));
    el.style.width = `${Math.round(width)}px`;
    const safeHeight = Math.max(140, safe.bottom - safe.top);
    el.style.maxHeight = `${Math.round(safeHeight)}px`;
    el.style.overflowY = 'hidden';
    el.style.overflowX = 'hidden';
    const naturalH = Math.max(150, Math.round(el.getBoundingClientRect().height || 180));
    const panelH = Math.min(naturalH, safeHeight);

    const rightCandidate = rect.right + margin;
    const leftCandidate = rect.left - width - margin;
    const canPlaceRight = rightCandidate + width <= safe.right;
    const canPlaceLeft = leftCandidate >= safe.left;
    let left = rightCandidate;
    let side = 'right';
    if (canPlaceRight) {
      left = rightCandidate;
      side = 'right';
    } else if (canPlaceLeft) {
      left = leftCandidate;
      side = 'left';
    } else {
      const centered = rect.left + (rect.width / 2) - (width / 2);
      left = centered;
      side = centered >= rect.left ? 'right' : 'left';
    }
    left = Math.max(safe.left, Math.min(left, safe.right - width));

    let top = rect.top + (rect.height / 2) - (panelH / 2);
    top = Math.max(safe.top, Math.min(top, safe.bottom - panelH));

    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
    el.dataset.side = side;
    el.classList.add('is-visible');
  },

  getGlobalTipSafeArea(baseMargin = 12) {
    const docEl = document.documentElement;
    const cs = window.getComputedStyle(docEl);
    const toPx = (value) => {
      const n = Number.parseFloat(String(value || '').replace('px', ''));
      return Number.isFinite(n) ? n : 0;
    };

    let left = baseMargin + toPx(cs.getPropertyValue('--ad-reserve-left'));
    let right = window.innerWidth - baseMargin - toPx(cs.getPropertyValue('--ad-reserve-right'));
    let top = baseMargin + toPx(cs.getPropertyValue('--fixed-header-offset'));
    let bottom = window.innerHeight - baseMargin - toPx(cs.getPropertyValue('--ad-reserve-bottom'));

    const blockers = document.querySelectorAll([
      '.ad-rail',
      '.bottom-ad',
      '.cc-consent-banner',
      '.ad-policy-fixed',
      '.cc-footer-version-fixed',
      '.announcement-banner',
      '#announcement-banner'
    ].join(','));

    blockers.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
      const r = node.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;

      const sticksTop = r.top <= baseMargin + 4;
      const sticksBottom = r.bottom >= window.innerHeight - (baseMargin + 4);
      const sticksLeft = r.left <= baseMargin + 4;
      const sticksRight = r.right >= window.innerWidth - (baseMargin + 4);

      if (sticksTop && r.bottom > top) top = Math.max(top, r.bottom + 8);
      if (sticksBottom && r.top < bottom) bottom = Math.min(bottom, r.top - 8);
      if (sticksLeft && r.right > left) left = Math.max(left, r.right + 8);
      if (sticksRight && r.left < right) right = Math.min(right, r.left - 8);
    });

    if (right - left < 260) {
      left = baseMargin;
      right = window.innerWidth - baseMargin;
    }
    if (bottom - top < 140) {
      top = baseMargin;
      bottom = window.innerHeight - baseMargin;
    }
    return { left, right, top, bottom };
  },

  formatPositiveHitsLine(exactHits) {
    if (!exactHits || typeof exactHits !== 'object') return '';
    const templates = [
      'ha centrato {k} numeri {times}',
      'ha beccato {k} numeri {times}',
      'ha pescato {k} numeri {times}',
      'ha portato a casa {k} numeri {times}',
      'ha messo a segno {k} numeri {times}',
      'ha piazzato {k} numeri {times}',
      'ha colpito {k} numeri {times}',
      'ha registrato {k} numeri {times}',
      'ha fatto segnare {k} numeri {times}',
      'ha totalizzato {k} numeri {times}',
      'ha agganciato {k} numeri {times}',
      'ha conquistato {k} numeri {times}',
      'ha centrato il livello {k} {times}',
      'si e distinto con {k} numeri {times}',
      'si e fatto notare con {k} numeri {times}',
      'ha chiuso con {k} numeri {times}',
      'ha confermato {k} numeri {times}',
      'ha mostrato {k} numeri {times}',
      'ha sfoderato {k} numeri {times}',
      'ha espresso {k} numeri {times}'
    ];
    const parts = [];
    const used = new Set();
    [6, 5, 4, 3, 2].forEach((k) => {
      const val = Number.parseInt(String(exactHits[k] ?? ''), 10);
      if (!Number.isFinite(val) || val <= 0) return;
      const times = val === 1 ? '1 volta' : `${val} volte`;
      const available = templates
        .map((tpl, idx) => ({ tpl, idx }))
        .filter((entry) => !used.has(entry.idx));
      const pool = available.length ? available : templates.map((tpl, idx) => ({ tpl, idx }));
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      used.add(chosen.idx);
      parts.push(chosen.tpl.replace('{k}', String(k)).replace('{times}', times));
    });
    if (!parts.length) return '';
    if (parts.length === 1) {
      return `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)}`;
    }
    return `Risultati migliori: ${parts.join(' · ')}`;
  },

  extractRowHitCount(row) {
    if (!row || typeof row !== 'object') return 0;
    let hits = 0;
    for (let i = 1; i <= 6; i += 1) {
      const value = String(row[`N${i}`] || '').trim();
      if (value.startsWith('[') && value.endsWith(']')) hits += 1;
    }
    return hits;
  },

  extractRowSequence(row) {
    const raw = Number.parseInt(String(row?.['NR. SEQUENZIALE'] || row?.SEQ || row?.seq || '').trim(), 10);
    return Number.isFinite(raw) ? raw : NaN;
  },

  formatRecentHistoricalHitLine(historicalRows, latestArchiveSeq) {
    const rows = Array.isArray(historicalRows) ? historicalRows : [];
    if (!rows.length) return '';

    let best = null;
    let maxSeq = Number.isFinite(latestArchiveSeq) ? Number(latestArchiveSeq) : Number.NaN;

    rows.forEach((row, idx) => {
      const hits = this.extractRowHitCount(row);
      const seq = this.extractRowSequence(row);
      if (Number.isFinite(seq) && (!Number.isFinite(maxSeq) || seq > maxSeq)) maxSeq = seq;
      if (hits < 2) return;
      if (!best) {
        best = { row, hits, seq, idx };
        return;
      }
      if (Number.isFinite(seq) && Number.isFinite(best.seq)) {
        if (seq > best.seq) best = { row, hits, seq, idx };
        return;
      }
      if (Number.isFinite(seq) && !Number.isFinite(best.seq)) {
        best = { row, hits, seq, idx };
        return;
      }
      if (!Number.isFinite(seq) && !Number.isFinite(best.seq) && idx > best.idx) {
        best = { row, hits, seq, idx };
      }
    });

    if (!best) return '';

    const hitDate = String(best.row?.DATA || best.row?.Data || best.row?.data || '').trim();
    const hasDate = Boolean(this.parseItalianDate(hitDate));
    const drawsAgo = (Number.isFinite(maxSeq) && Number.isFinite(best.seq))
      ? Math.max(0, maxSeq - best.seq)
      : NaN;
    const isRecent = Number.isFinite(drawsAgo) ? drawsAgo <= 12 : hasDate;
    if (!isRecent) return '';

    const datePart = hasDate ? `il ${hitDate}` : '';
    const agoPart = Number.isFinite(drawsAgo)
      ? (drawsAgo === 0 ? 'nell ultimo concorso' : `${drawsAgo} concorsi fa`)
      : '';
    const whenPart = [datePart, agoPart].filter(Boolean).join(' · ');
    const templates = [
      `Ultimo segnale forte: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `L ultima volta: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Picco recente: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Riscontro reale: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Segnale operativo: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Ultimo centro: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Riferimento recente: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Storico vicino: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Conferma passata: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Memoria utile: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Traccia concreta: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Segnale dall archivio: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Ultimo riscontro in positivo: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Rientro storico: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Conferma sul campo: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Dallo storico emerge che ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Fatto recente: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Punto di riferimento: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Ultima impronta utile: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Rilevazione concreta: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Nel passato vicino ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Segnale da non ignorare: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Ultimo indizio reale: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Punto di controllo storico: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Registro recente: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Conferma pratica: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Finestra recente favorevole: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Dati reali recenti: ha indovinato ${best.hits} numeri ${whenPart}`.trim(),
      `Ultimo passaggio utile: ha indovinato ${best.hits} numeri ${whenPart}`.trim()
    ].map((line) => line.replace(/\s+/g, ' ').trim());
    return this.pickTemplateNoRepeat('tip_recent_real_hit', templates);
  },

  normalizePathKey(value) {
    let raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    raw = raw.replace(/\\/g, '/');
    raw = raw.replace(/^https?:\/\/[^/]+/i, '');
    raw = raw.split('#')[0].split('?')[0];
    raw = raw.replace(/\/index\.html?$/i, '/');
    raw = raw.replace(/\/card\.json$/i, '/');
    raw = raw.replace(/\/+$/, '/');
    raw = raw.replace(/^\.\/+/, '');
    return raw;
  },

  resolveAlgorithmKeyCandidates(algorithm) {
    const out = new Set();
    const id = String(algorithm?.id || '').trim().toLowerCase();
    const title = String(algorithm?.title || '').trim().toLowerCase();
    const page = this.normalizePathKey(algorithm?.page || '');
    if (id) out.add(`id:${id}`);
    if (title) out.add(`title:${title}`);
    if (page) out.add(`page:${page}`);
    return Array.from(out);
  },

  async loadManifestCards() {
    if (window.CC_REPO && typeof window.CC_REPO.loadCardsByManifest === 'function') {
      return window.CC_REPO.loadCardsByManifest('data/modules-manifest.json');
    }
    const res = await fetch('data/modules-manifest.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`manifest_http_${res.status}`);
    const manifest = await res.json();
    const entries = Array.isArray(manifest?.cards) ? manifest.cards : (Array.isArray(manifest) ? manifest : []);
    if (!entries.length) return [];
    if (entries.every((entry) => typeof entry === 'string')) {
      const cards = await Promise.all(entries.map(async (entry) => {
        const url = resolveWithBase(String(entry || '').trim());
        if (!url) return null;
        try {
          const cardRes = await fetch(url, { cache: 'no-store' });
          if (!cardRes.ok) return null;
          return await cardRes.json();
        } catch (_) {
          return null;
        }
      }));
      return cards.filter(Boolean);
    }
    return entries.filter((entry) => entry && typeof entry === 'object');
  },

  async getRankingPositionMap() {
    if (this._rankingPositionCache instanceof Map) return this._rankingPositionCache;
    if (this._rankingPositionPromise) return this._rankingPositionPromise;
    this._rankingPositionPromise = (async () => {
      const map = new Map();
      try {
        const modules = await this.loadManifestCards();

        const candidates = (Array.isArray(modules) ? modules : []).filter((m) => {
          if (!m || m.isActive === false) return false;
          return String(m?.page || '').toLowerCase().includes('/algoritmi/algs/');
        });

        const scored = [];
        for (const item of candidates) {
          const keys = this.resolveAlgorithmKeyCandidates(item);
          if (!keys.length) continue;
          let score = Number.isFinite(item?.rankingValue) ? Number(item.rankingValue) : Number.NaN;
          if (!Number.isFinite(score)) {
            score = await this.computeRankingForAlgorithm(item);
          }
          if (!Number.isFinite(score)) continue;
          scored.push({ keys, score });
        }

        scored.sort((a, b) => b.score - a.score);
        scored.forEach((row, idx) => {
          row.keys.forEach((k) => map.set(k, idx + 1));
        });
      } catch (_) {
        // no-op fallback
      }
      this._rankingPositionCache = map;
      return map;
    })();
    return this._rankingPositionPromise;
  },

  async getRankingPositionForAlgorithm(algorithm) {
    const keys = this.resolveAlgorithmKeyCandidates(algorithm);
    if (!keys.length) return null;
    const map = await this.getRankingPositionMap();
    for (const k of keys) {
      const pos = map.get(k);
      if (Number.isFinite(pos) && pos > 0) return pos;
    }
    return null;
  },

  ensureMinTipPhrases(templates, minCount = 30) {
    const base = Array.isArray(templates)
      ? templates.map((t) => String(t || '').trim()).filter(Boolean)
      : [];
    if (!base.length) return [];
    if (base.length >= minCount) return base;

    const variants = new Set(base);
    const intros = [
      'Da notare: {t}',
      'In sintesi: {t}',
      'In breve: {t}',
      'Vale ricordare che {t}',
      'Dettaglio utile: {t}',
      'Segnale da considerare: {t}',
      'Punto chiave: {t}',
      'Da tenere presente: {t}',
      'Informazione importante: {t}',
      'Lettura rapida: {t}',
      'Messaggio principale: {t}',
      'Elemento utile: {t}',
      'Indicazione pratica: {t}',
      'Panoramica veloce: {t}',
      'Osservazione utile: {t}',
      'Per orientarti meglio: {t}',
      'Nota operativa: {t}',
      'Indicazione chiara: {t}',
      'In modo semplice: {t}',
      'A colpo d occhio: {t}'
    ];
    const endings = [
      '',
      ' con dati aggiornati',
      ' in questa fase',
      ' secondo i dati disponibili',
      ' nel quadro attuale',
      ' con riferimento all ultimo aggiornamento'
    ];

    for (const intro of intros) {
      for (const phrase of base) {
        for (const ending of endings) {
          if (variants.size >= minCount) break;
          const built = intro.replace('{t}', phrase).trim() + ending;
          variants.add(built.replace(/\s+/g, ' ').trim());
        }
        if (variants.size >= minCount) break;
      }
      if (variants.size >= minCount) break;
    }

    return Array.from(variants);
  },

  pickTemplateNoRepeat(categoryKey, templates) {
    if (!Array.isArray(templates) || !templates.length) return '';
    const expanded = this.ensureMinTipPhrases(templates, 30);
    if (!expanded.length) return '';
    if (!this._tipTemplateHistory || typeof this._tipTemplateHistory !== 'object') {
      this._tipTemplateHistory = {};
    }
    const lastIdx = Number.isInteger(this._tipTemplateHistory[categoryKey])
      ? this._tipTemplateHistory[categoryKey]
      : -1;
    let idx = Math.floor(Math.random() * expanded.length);
    if (expanded.length > 1 && idx === lastIdx) {
      idx = (idx + 1 + Math.floor(Math.random() * (expanded.length - 1))) % expanded.length;
    }
    this._tipTemplateHistory[categoryKey] = idx;
    return expanded[idx];
  },

  formatRankingPerformanceLine(rankingPosition, rankingText, rankingValue) {
    const templatesWithPos = [
      'E al posto #{pos} nella classifica degli algoritmi con {points} punti',
      'Si trova in posizione #{pos} tra gli algoritmi con {points} punti',
      'Corre al #{pos} posto della classifica con {points} punti',
      'Occupa il posto #{pos} nella classifica degli algoritmi con {points} punti',
      'Tiene la posizione #{pos} in classifica con {points} punti',
      'Firma il #{pos} posto in classifica con {points} punti',
      'E piazzato al #{pos} posto con {points} punti',
      'E stabile al #{pos} posto tra gli algoritmi con {points} punti',
      'Viaggia al #{pos} posto in classifica con {points} punti',
      'Consolida il #{pos} posto in classifica con {points} punti',
      'Presidia il #{pos} posto della classifica con {points} punti',
      'Sta al #{pos} posto nel confronto algoritmi con {points} punti',
      'Tiene il ritmo da posto #{pos} con {points} punti',
      'Marcia al #{pos} posto della classifica con {points} punti',
      'Rimane al #{pos} posto in classifica con {points} punti',
      'Si conferma al #{pos} posto con {points} punti',
      'Cresce fino al #{pos} posto con {points} punti',
      'Guadagna visibilita: posto #{pos} con {points} punti',
      'Segna il posto #{pos} in classifica con {points} punti',
      'Si colloca al #{pos} posto della classifica con {points} punti'
    ];
    const templatesPodium = [
      'E {podiumLabel}: posto #{pos} con {points} punti',
      'Sale {podiumLabel} al posto #{pos} con {points} punti',
      'Resta {podiumLabel}, posizione #{pos}, con {points} punti',
      'Firma {podiumLabel} al #{pos} posto con {points} punti',
      'Conquista {podiumLabel}: posto #{pos} con {points} punti',
      'Tiene {podiumLabel} con il posto #{pos} e {points} punti',
      'Difende {podiumLabel}: posizione #{pos} con {points} punti',
      'Conferma {podiumLabel} al #{pos} posto con {points} punti',
      'Rimane in area {podiumLabel}: #{pos} posto con {points} punti',
      'Si prende {podiumLabel} con posizione #{pos} e {points} punti',
      'Si fa strada {podiumLabel} al posto #{pos} con {points} punti',
      'Si mette in vetrina {podiumLabel}: #{pos} posto con {points} punti',
      'Raccoglie un piazzamento {podiumLabel} (#{pos}) con {points} punti',
      'Tiene saldo {podiumLabel}, posizione #{pos}, con {points} punti',
      'E in corsa {podiumLabel}: posto #{pos} con {points} punti',
      'Conferma un passo {podiumLabel} al #{pos} posto con {points} punti',
      'Brilla {podiumLabel} con il posto #{pos} e {points} punti',
      'Resta stabilmente {podiumLabel}: #{pos} posto con {points} punti',
      'Si impone {podiumLabel} al posto #{pos} con {points} punti',
      'Mantiene {podiumLabel} con posizione #{pos} e {points} punti'
    ];
    const templatesNoPos = [
      'Posizione in classifica n.d., punteggio {points} punti',
      'Posto attuale n.d. in classifica, con {points} punti',
      'Classifica in aggiornamento (posto n.d.), {points} punti',
      'Piazzamento n.d. con punteggio {points} punti',
      'Posto non disponibile ora, classifica a {points} punti'
    ];
    const points = String(rankingText || '').trim();
    if (rankingPosition && points) {
      if (rankingPosition <= 3) {
        const podiumLabel = rankingPosition === 1 ? 'prima in classifica' : 'nel podio';
        const tpl = this.pickTemplateNoRepeat('ranking_podium', templatesPodium);
        return tpl
          .replace('{podiumLabel}', podiumLabel)
          .replace('{pos}', String(rankingPosition))
          .replace('{points}', points);
      }
      const tpl = this.pickTemplateNoRepeat('ranking_regular', templatesWithPos);
      return tpl.replace('{pos}', String(rankingPosition)).replace('{points}', points);
    }
    if (Number.isFinite(rankingValue) && points) {
      const tpl = templatesNoPos[Math.floor(Math.random() * templatesNoPos.length)];
      return tpl.replace('{points}', points);
    }
    return 'Profilo in crescita con segnali promettenti';
  },

  formatPerformanceTipTitle(rankingPosition, rankingText, rankingValue, hitCount) {
    const pos = Number.isFinite(rankingPosition) && rankingPosition > 0 ? Number(rankingPosition) : null;
    const points = String(rankingText || '').trim();
    const hits = Number.isFinite(hitCount) && hitCount > 0 ? Number(hitCount) : 0;

    const podiumHot = [
      'Prima fascia assoluta: {label}, {points} punti e ha indovinato {hit} numeri di recente',
      'Andamento molto alto: {label}, {points} punti, ultimo concorso con {hit} numeri indovinati',
      'Prestazione in evidenza: {label} con {points} punti e {hit} numeri indovinati di recente',
      'Profilo guida: {label}, {points} punti, con {hit} numeri indovinati nell ultimo controllo',
      'Stato di forma brillante: {label}, {points} punti e {hit} numeri indovinati di recente',
      'Segnale forte: {label} con {points} punti e {hit} numeri indovinati poco fa',
      'Profilo di riferimento: {label}, {points} punti, {hit} numeri indovinati in un concorso vicino',
      'Rendimento molto alto: {label} a {points} punti con {hit} numeri indovinati di recente',
      'Profilo molto caldo: {label}, {points} punti, ultimo passaggio con {hit} numeri indovinati',
      'Fase molto positiva: {label} con {points} punti e {hit} numeri indovinati in concorsi ravvicinati'
    ];
    const podium = [
      'Fascia alta confermata: {label} con {points} punti',
      'Stabilita da vertice: {label}, {points} punti',
      'Tra i migliori in assoluto: {label} con {points} punti',
      'Qualita costante: {label}, {points} punti in classifica',
      'Performance di riferimento: {label} con {points} punti',
      'Rendimento robusto: {label}, {points} punti',
      'Profilo da prima fascia: {label} con {points} punti',
      'Precisione consolidata: {label}, {points} punti',
      'Andatura da alta classifica: {label} con {points} punti',
      'Presenza forte: {label}, {points} punti'
    ];
    const top10Hot = [
      'Ottimo slancio: posto #{pos}, {points} punti e {hit} numeri indovinati di recente',
      'Tra i piu affidabili ora: posto #{pos}, {points} punti, con {hit} numeri indovinati',
      'Passo concreto: posto #{pos} con {points} punti e {hit} numeri indovinati',
      'Andamento in crescita: posto #{pos}, {points} punti, ultimo concorso con {hit} numeri indovinati',
      'Prestazione convincente: posto #{pos}, {points} punti e {hit} numeri indovinati',
      'Risultato importante: posto #{pos}, {points} punti, {hit} numeri indovinati in concorsi vicini',
      'Rendimento solido: posto #{pos}, {points} punti, {hit} numeri indovinati nell ultimo concorso',
      'Fase positiva: posto #{pos}, {points} punti e {hit} numeri indovinati',
      'Profilo molto competitivo: posto #{pos}, {points} punti, {hit} numeri indovinati',
      'Quadro favorevole: posto #{pos}, {points} punti e {hit} numeri indovinati poco fa'
    ];
    const top10 = [
      'Buona tenuta: posto #{pos} con {points} punti',
      'Zona alta confermata: posto #{pos}, {points} punti',
      'Profilo affidabile: posto #{pos} con {points} punti',
      'Progressione chiara: posto #{pos}, {points} punti',
      'Regolarita utile: posto #{pos} con {points} punti',
      'Classifica favorevole: posto #{pos}, {points} punti',
      'Andamento solido: posto #{pos} con {points} punti',
      'Prestazione consistente: posto #{pos}, {points} punti',
      'Posizionamento interessante: posto #{pos} con {points} punti',
      'Segnali buoni: posto #{pos}, {points} punti'
    ];
    const regularHot = [
      'Segnali vivaci: posto #{pos}, {points} punti e {hit} numeri indovinati di recente',
      'Spinta attiva: posto #{pos} con {points} punti, {hit} numeri indovinati in concorsi vicini',
      'Buon segnale: posto #{pos}, {points} punti e {hit} numeri indovinati',
      'Profilo in crescita: posto #{pos} con {points} punti, ultimo concorso con {hit} numeri indovinati',
      'Andamento utile: posto #{pos}, {points} punti e {hit} numeri indovinati',
      'Dati incoraggianti: posto #{pos} con {points} punti, {hit} numeri indovinati di recente',
      'Passo in miglioramento: posto #{pos}, {points} punti e {hit} numeri indovinati',
      'Crescita concreta: posto #{pos} con {points} punti, {hit} numeri indovinati',
      'Fase interessante: posto #{pos}, {points} punti e {hit} numeri indovinati in concorsi ravvicinati',
      'Evoluzione positiva: posto #{pos} con {points} punti, {hit} numeri indovinati poco fa'
    ];
    const generic = [
      'Posto {posLabel} in classifica: segnali operativi in sviluppo',
      'Posto {posLabel}: profilo da monitorare con attenzione',
      'Piazzamento {posLabel}: potenziale interessante nel breve',
      'Posizione {posLabel}: traccia tecnica promettente',
      'Classifica {posLabel}: andamento da seguire da vicino',
      'Posto {posLabel}: parametri utili in consolidamento',
      'Piazzamento {posLabel}: quadro in evoluzione positiva',
      'Posizione {posLabel}: segnale strategico da approfondire',
      'Classifica {posLabel}: indicazioni incoraggianti in arrivo',
      'Posto {posLabel}: profilo in progressione'
    ];

    const label = pos === 1 ? 'prima in classifica' : (pos && pos <= 3 ? `nel podio (posto #${pos})` : `al posto #${pos || '--'}`);
    const posLabel = pos ? `#${pos}` : 'n.d.';
    let pool = generic;
    let category = 'tip_title_generic';
    if (pos && pos <= 3) {
      pool = hits >= 2 ? podiumHot : podium;
      category = hits >= 2 ? 'tip_title_podium_hot' : 'tip_title_podium';
    } else if (pos && pos <= 10) {
      pool = hits >= 2 ? top10Hot : top10;
      category = hits >= 2 ? 'tip_title_top10_hot' : 'tip_title_top10';
    } else if (pos) {
      pool = hits >= 2 ? regularHot : top10;
      category = hits >= 2 ? 'tip_title_regular_hot' : 'tip_title_regular';
    }

    const tpl = this.pickTemplateNoRepeat(category, pool);
    return String(tpl || 'Profilo in osservazione')
      .replace('{label}', label)
      .replace('{pos}', String(pos || '--'))
      .replace('{posLabel}', posLabel)
      .replace('{points}', points || '--')
      .replace('{hit}', String(hits || 0));
  },

  resolvePrebuiltTipField(algorithm, key) {
    if (!algorithm || !key) return '';
    const direct = String(algorithm?.[key] ?? '').trim();
    if (direct) return direct;
    const tip = algorithm?.tip || algorithm?.tooltip || algorithm?.cardTip || algorithm?.card_tip;
    const nested = String(tip?.[key] ?? '').trim();
    if (nested) return nested;
    const ui = algorithm?.ui || algorithm?.render || algorithm?.display;
    const uiNested = String(ui?.cardTip?.[key] ?? ui?.tip?.[key] ?? '').trim();
    if (uiNested) return uiNested;
    return '';
  },

  compactTipText(value, maxLen = 140) {
    const text = String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/\$[A-Z0-9]+/g, '')
      .trim();
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return `${text.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
  },

  resolveCardDestinationLabel(path) {
    const p = String(path || '').toLowerCase();
    if (p.includes('/storico-estrazioni')) return 'all archivio delle ultime estrazioni';
    if (p.includes('/ranking')) return 'alla classifica degli algoritmi';
    if (p.includes('/laboratorio-tecnico')) return 'al Laboratorio Tecnico';
    if (p.includes('/algoritmi/algs/')) return 'alla scheda completa di questo algoritmo';
    if (p.includes('/algoritmi/')) return 'alla sezione algoritmi';
    if (p.includes('/stato-sito')) return 'alla dashboard stato sito';
    if (p.includes('/archivio') || p.includes('/storico')) return 'alla sezione archivio';
    return 'alla sezione dedicata';
  },

  buildGenericCardTipPayload(algorithm, cardHref, visualTone) {
    const destinationLabel = this.resolveCardDestinationLabel(cardHref || algorithm?.page || '');
    const summary = this.compactTipText(
      algorithm?.subtitle || algorithm?.narrativeSummary || algorithm?.description || '',
      150
    );
    const title = this.resolvePrebuiltTipField(algorithm, 'tipTitle') || 'Cosa trovi in questa card';
    const line = this.resolvePrebuiltTipField(algorithm, 'rankingLine')
      || `Questa card ti porta ${destinationLabel}`;
    const hits = this.resolvePrebuiltTipField(algorithm, 'hitsLine') || summary;
    const cta = this.resolvePrebuiltTipField(algorithm, 'tipCta') || 'Clicca sulla "card" per aprire la sezione';
    return {
      tone: visualTone,
      title,
      line,
      recent: '',
      hits,
      cta
    };
  },

  hideGlobalCardTip() {
    if (!this._globalTipEl) return;
    this._globalTipEl.classList.remove('is-visible');
  },

  async buildAlgorithmCard(algorithm, options = {}) {
    if (!algorithm || algorithm.view !== true) return null;
    this.ensureComponentStyles();
    this.ensureCardSizing();
    const size = this.getCardSizing();
    const card = this.buildComponentCard({
      tag: 'a'
    });
    const imageUrl = this.resolveCardImage(algorithm);
    const imageFallbackUrl = this.resolveCardBackupImage();
    const active = options.forceActive ? true : (algorithm.isActive !== false);
    const isAlgorithmModule = String(algorithm?.page || '').toLowerCase().includes('/algoritmi/algs/');
    const noDataShow = isAlgorithmModule ? (algorithm?.no_data_show !== false) : false;
    const typeLabel = this.resolveCardType(algorithm);
    const typeBadgeMarkup = this.buildTypeBadgeMarkup(typeLabel);
    const showNewsBadge = this.hasNewsBadge(algorithm);
    const newsBadgeMarkup = showNewsBadge ? '<span class="card-type-badge card-type-badge--news">Novità</span>' : '';
    const accessTier = this.resolveAccessTier(algorithm);
    const accessBadge = this.buildAccessBadgeMarkup(accessTier);
    const needsDrawTemplate = this.hasDrawTemplateTokens(algorithm);
    const latestDraw = needsDrawTemplate ? await this.getLatestDrawData() : null;
    const titleTpl = this.renderDrawTemplate(algorithm.title || 'Algoritmo', latestDraw);
    const subtitleTpl = this.renderDrawTemplate(algorithm.subtitle || '', latestDraw);
    const summaryTpl = this.renderDrawTemplate(algorithm.narrativeSummary || '', latestDraw);
    const mediaScaleRaw = Number.parseFloat(String(algorithm?.mediaScale ?? '1'));
    const requestedMediaScale = Number.isFinite(mediaScaleRaw) && mediaScaleRaw > 0 ? mediaScaleRaw : 1;
    const showSubtitle = Boolean(algorithm?.showSubtitle === true) && Boolean(subtitleTpl.text);
    const subtitleHtml = showSubtitle ? subtitleTpl.html : '';
    const descriptionTpl = summaryTpl.text
      ? summaryTpl
      : (subtitleTpl.text ? subtitleTpl : { text: 'Descrizione in arrivo', html: 'Descrizione in arrivo', hasBalls: false });
    const usesOutData = isAlgorithmModule && algorithm?.usesOutData !== false;
    const [metricsRows, historicalRows, latestArchiveSeq] = usesOutData
      ? await Promise.all([
        this.readCsvRows(this.resolveMetricsUrl(algorithm)),
        this.readCsvRows(this.resolveHistoricalUrl(algorithm)),
        this.getLatestArchiveSeq()
      ])
      : [null, null, null];

    const info = this.extractProposalInfo(metricsRows || []);
    const latestHistoricalDate = this.extractLatestHistoricalDate(historicalRows || []);
    const trainingDateFromMetrics = this.extractTrainingDateFromMetrics(metricsRows || []);
    const resolvedTrainingDate = latestHistoricalDate || trainingDateFromMetrics || null;
    const dateLabel = resolvedTrainingDate || 'NO DATA';
    const noDataDate = !resolvedTrainingDate;
    const proposalNumbers = this.normalizeProposalNumbers(info.proposal);
    const proposalHas6 = proposalNumbers.length === 6;
    const hasTrainingSignals = Boolean(resolvedTrainingDate) || proposalHas6;
    const hideNoDataDate = noDataDate && (!noDataShow || hasTrainingSignals);
    const rankingValue = Number.isFinite(algorithm?.rankingValue)
      ? Number(algorithm.rankingValue)
      : this.computeRankingValue(metricsRows || [], historicalRows || []);
    const rankingText = this.formatRankingValue(rankingValue);
    const exactHits = this.extractExactHitCounts(metricsRows || [], historicalRows || []);
    const rankingPosRaw = Number.parseInt(
      String(algorithm?.rankingPosition ?? algorithm?.rankPosition ?? algorithm?.rank ?? algorithm?.position ?? ''),
      10
    );
    let rankingPosition = Number.isFinite(rankingPosRaw) && rankingPosRaw > 0 ? rankingPosRaw : null;
    if (!rankingPosition && active && isAlgorithmModule) {
      const derivedRankingPosition = await this.getRankingPositionForAlgorithm(algorithm);
      if (Number.isFinite(derivedRankingPosition) && derivedRankingPosition > 0) {
        rankingPosition = derivedRankingPosition;
      }
    }
    const showRanking = active && isAlgorithmModule;
    const archiveAvailable = Array.isArray(historicalRows) && historicalRows.length > 0;
    const nextSeqValid = Number.isFinite(info.nextSeq);
    const isUpdated = Number.isFinite(latestArchiveSeq) && nextSeqValid && info.nextSeq > latestArchiveSeq;
    const hitCountRaw = Number.parseInt(String(algorithm?.hits?.count ?? ''), 10);
    const hitCount = Number.isFinite(hitCountRaw) && hitCountRaw > 0 ? hitCountRaw : 0;
    const hasHitStamp = Boolean(algorithm?.hits?.enabled === true) && hitCount > 0;
    const cardFamily = this.resolveTelemetryCardType(algorithm);
    const cardTypeClass = cardFamily === 'paper' ? 'cc-card-paper' : 'cc-card-action';
    const visualTone = this.resolveCardVisualTone(algorithm);
    const pageId = String(document?.body?.getAttribute('data-page-id') || '').toLowerCase();
    const showPerformanceTip = active && isAlgorithmModule && pageId === 'home';
    const showGenericTip = active && !isAlgorithmModule && pageId === 'home';

    const proposalGlowByTone = (() => {
      if (visualTone === 'alg-stat') {
        return 'text-black border-cyan-100/85 bg-cyan-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-2px_6px_rgba(8,51,68,0.28)]';
      }
      if (visualTone === 'alg-neural') {
        return 'text-white border-violet-200/85 bg-violet-500/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-2px_6px_rgba(46,16,101,0.32)]';
      }
      if (visualTone === 'alg-hybrid') {
        return 'text-black border-emerald-100/85 bg-emerald-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-2px_6px_rgba(6,78,59,0.28)]';
      }
      return 'text-black border-amber-100/85 bg-amber-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-2px_6px_rgba(120,53,15,0.28)]';
    })();

    let proposalText = '(NO DATA)';
    let proposalHtml = '(NO DATA)';
    let proposalHasBalls = false;
    let proposalClass = 'text-rose-300 border-rose-300/55 bg-rose-300/8';
    if (proposalHas6) {
      if (!Number.isFinite(latestArchiveSeq) || !nextSeqValid || isUpdated) {
        proposalText = proposalNumbers.join(' ');
        proposalHtml = proposalNumbers
          .map((value) => `<span class="ball-3d">${this.escapeHtml(value)}</span>`)
          .join('');
        proposalHasBalls = true;
        proposalClass = proposalGlowByTone;
      } else {
        proposalText = '(NO UPD)';
        proposalHtml = '(NO UPD)';
        proposalClass = 'text-amber-300 border-amber-300/60 bg-amber-300/10 shadow-[0_0_12px_rgba(251,191,36,0.22)]';
      }
    } else if (!archiveAvailable && !hasTrainingSignals) {
      proposalText = '(NO DATA)';
      proposalHtml = '(NO DATA)';
    } else {
      proposalText = '(NO UPD)';
      proposalHtml = '(NO UPD)';
      proposalClass = 'text-amber-300 border-amber-300/60 bg-amber-300/10 shadow-[0_0_12px_rgba(251,191,36,0.22)]';
    }
    const isNoDataProposal = proposalText === '(NO DATA)';
    const hideNoDataProposal = isNoDataProposal && !noDataShow;
    const hoverClass = '';
    card.className = `cc-card cc-card3d ${cardTypeClass} cc-card-tone-${visualTone} card-3d algorithm-card group relative flex min-h-[330px] flex-col overflow-hidden rounded-2xl border border-white/10 transition${hoverClass}${active ? ' is-active' : ' is-inactive bg-black/70 border-white/5'}`;
    card.dataset.cardFamily = cardFamily;
    card.dataset.cardTone = visualTone;
    card.style.minWidth = size.min;
    card.style.maxWidth = size.max;
    card.style.width = size.clamp;
    card.href = active ? (resolveWithBase(algorithm.page || '#') || '#') : '#';

    const cardId = this.resolveCardId(algorithm);
    const cardType = this.resolveTelemetryCardType(algorithm);
    card.dataset.cardId = cardId;
    card.dataset.cardType = cardType;
    card.dataset.destinationType = this.resolveDestinationType(card.href);
    card.dataset.sourceBlock = String(options.sourceBlock || algorithm?.macroGroup || 'catalog');
    card.dataset.ccCardRoot = '1';
    const mediaScale = this.resolveCardMediaScale(cardId, requestedMediaScale);

    if (!active) {
      card.setAttribute('aria-disabled', 'true');
      card.setAttribute('tabindex', '-1');
      card.dataset.cardInteractive = '0';
      card.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
        }
      });
    } else {
      card.dataset.cardInteractive = '1';
    }

    const comingSoonOverlay = active ? '' : '<div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/45"><span class="select-none whitespace-nowrap text-[clamp(0.68rem,2.1vw,1.9rem)] font-semibold uppercase tracking-[clamp(0.16em,0.8vw,0.5em)] text-neon/60 rotate-[-60deg] [text-shadow:0_0_18px_rgba(255,217,102,0.65),0_0_32px_rgba(0,0,0,0.85)]">coming soon</span></div>';
    const hitStampOverlay = hasHitStamp
      ? `<div class="cc-hit-stamp" aria-label="Ultimo concorso: ${hitCount} hit"><span class="cc-hit-stamp__line">Ultimo concorso</span><span class="cc-hit-stamp__value">${hitCount} HIT</span></div>`
      : '';
    const prebuiltTipTitle = this.resolvePrebuiltTipField(algorithm, 'tipTitle');
    const prebuiltRankingLine = this.resolvePrebuiltTipField(algorithm, 'rankingLine');
    const prebuiltHitsLine = this.resolvePrebuiltTipField(algorithm, 'hitsLine');
    const prebuiltTipCta = this.resolvePrebuiltTipField(algorithm, 'tipCta');
    const tipTitle = prebuiltTipTitle || this.formatPerformanceTipTitle(rankingPosition, rankingText, rankingValue, hitCount);
    const rankingLine = prebuiltRankingLine || this.formatRankingPerformanceLine(rankingPosition, rankingText, rankingValue);
    const recentHitLine = this.formatRecentHistoricalHitLine(historicalRows || [], latestArchiveSeq);
    const hitsLine = prebuiltHitsLine || this.formatPositiveHitsLine(exactHits);
    const overlayHtml = `${comingSoonOverlay}${hitStampOverlay}`;
    const mediaHtml = `
      <div class="cc-card-media cc-card-media-frame algorithm-card__media algorithm-card__media--third relative overflow-hidden" style="position:relative;width:100%;aspect-ratio:15/8;min-height:0;max-height:none;overflow:hidden;">
        <img class="h-full w-full object-cover" src="${imageUrl}" alt="Anteprima di ${algorithm.title}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block;transform:scale(${mediaScale.toFixed(3)});transform-origin:center center;">
        ${typeBadgeMarkup}
        ${newsBadgeMarkup}
        <span class="card-date-badge${noDataDate && !hideNoDataDate ? ' is-no-data' : ''}${hideNoDataDate ? ' hidden' : ''}" data-date-badge>${hideNoDataDate ? '' : dateLabel}</span>
        ${accessBadge}
      </div>
    `;
    const bodyHtml = `
      <div class="cc-card-body algorithm-card__body flex flex-1 flex-col gap-1.5 px-4 pt-2.5 pb-10">
        <span class="text-[10px] uppercase tracking-[0.22em] text-neon/90">${algorithm.macroGroup || 'algoritmo'}</span>
        <h3 class="text-[0.98rem] font-semibold leading-tight ${active ? 'group-hover:text-neon' : ''}${titleTpl.hasBalls ? ' has-balls flex flex-wrap items-center gap-1' : ''}">${titleTpl.html}</h3>
        ${subtitleHtml ? `<p class="text-[0.66rem] font-medium leading-[1.15] text-ash${subtitleTpl.hasBalls ? ' has-balls flex flex-wrap items-center gap-1' : ''}">${subtitleHtml}</p>` : ''}
        <p class="algorithm-card__desc text-[0.74rem] leading-[1.25] text-ash${descriptionTpl.hasBalls ? ' has-balls flex flex-wrap items-center gap-1' : ''}">${descriptionTpl.html}</p>
      </div>
    `;
    const footerHtml = `
      ${showRanking ? `<span class="cc-ranking-strip" aria-label="Ranking algoritmo"><span class="cc-ranking-strip__text">${rankingText}</span></span>` : ''}
      <div class="cc-card-proposal absolute bottom-2 left-3 right-3 w-auto border px-2 py-[0.24rem] text-[0.64rem] font-semibold tracking-[0.04em] overflow-hidden text-ellipsis shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_10px_rgba(0,0,0,0.35)] ${proposalHasBalls ? 'has-balls flex flex-wrap items-center justify-center gap-1 rounded-2xl' : 'rounded-full whitespace-nowrap'} ${proposalClass}${hideNoDataProposal ? ' hidden' : ''}" style="font-size:clamp(0.42rem,0.68vw,0.64rem);text-align:center;" data-proposal-box>${hideNoDataProposal ? '' : proposalHtml}</div>
    `;

    this.mountCardSlots(card, {
      overlay: overlayHtml,
      media: mediaHtml,
      body: bodyHtml,
      footer: footerHtml
    });

    this.bindCardImageFallback(card, imageFallbackUrl);
    this.fitProposalBadge(card);
    if (showPerformanceTip || showGenericTip) {
      const tipPayload = showPerformanceTip ? {
        tone: visualTone,
        title: tipTitle,
        line: rankingLine,
        recent: recentHitLine,
        hits: hitsLine,
        cta: prebuiltTipCta || 'Clicca sulla "card" e scopri cosa lo rende speciale'
      } : this.buildGenericCardTipPayload(algorithm, card.href, visualTone);
      card.addEventListener('mouseenter', () => this.showGlobalCardTip(card, tipPayload));
      card.addEventListener('mouseleave', () => this.hideGlobalCardTip());
      card.addEventListener('focus', () => this.showGlobalCardTip(card, tipPayload));
      card.addEventListener('blur', () => this.hideGlobalCardTip());
    }
    if (active) this.bindTelemetry(card, algorithm);
    return card;
  },

  bindTelemetry(card, algorithm) {
    const telemetry = window.CC_TELEMETRY;
    if (!telemetry || typeof telemetry.track !== 'function') return;
    const cardId = String(card?.dataset?.cardId || this.resolveCardId(algorithm));
    const cardType = String(card?.dataset?.cardType || this.resolveTelemetryCardType(algorithm));
    const sourceBlock = String(card?.dataset?.sourceBlock || algorithm?.macroGroup || 'catalog');
    const ctaType = cardType === 'paper' ? 'open_study' : 'open_module';
    const destinationType = String(card?.dataset?.destinationType || this.resolveDestinationType(card?.href || ''));
    let impressionEmitted = false;
    const common = () => ({
      card_id: cardId,
      card_type: cardType,
      source_block: sourceBlock
    });

    telemetry.observeImpression(card, 'card_impression', () => ({
      ...(impressionEmitted = true, {}),
      ...common(),
      card_position: this.resolveCardPosition(card)
    }), {
      dedupKey: `card_impression:${cardId}`
    });

    if (cardType === 'paper') {
      telemetry.observeImpression(card, 'paper_card_impression', () => ({
        ...common(),
        paper_id: this.resolvePaperId(algorithm),
        card_position: this.resolveCardPosition(card)
      }), {
        dedupKey: `paper_card_impression:${cardId}`
      });
    }

    let clickLock = false;
    card.addEventListener('click', () => {
      if (clickLock) return;
      clickLock = true;
      window.setTimeout(() => { clickLock = false; }, 320);
      if (!impressionEmitted) {
        impressionEmitted = true;
        telemetry.track('card_impression', {
          ...common(),
          card_position: this.resolveCardPosition(card)
        }, {
          element: card,
          oncePerSession: true,
          dedupKey: `card_impression:${cardId}`
        });
        if (cardType === 'paper') {
          telemetry.track('paper_card_impression', {
            ...common(),
            paper_id: this.resolvePaperId(algorithm),
            card_position: this.resolveCardPosition(card)
          }, {
            element: card,
            oncePerSession: true,
            dedupKey: `paper_card_impression:${cardId}`
          });
        }
      }
      telemetry.track('card_click', {
        ...common(),
        card_position: this.resolveCardPosition(card),
        cta_type: ctaType,
        destination_type: destinationType
      }, { element: card });

      if (cardType === 'paper') {
        telemetry.track('paper_card_click', {
          ...common(),
          paper_id: this.resolvePaperId(algorithm),
          card_position: this.resolveCardPosition(card),
          cta_type: ctaType,
          destination_type: destinationType
        }, { element: card });
      }
    }, { passive: true });
  },

  resolveCardPosition(card) {
    if (!card || !card.parentElement) return -1;
    return Array.from(card.parentElement.children).indexOf(card) + 1;
  },

  buildComponentCard(config = {}) {
    const builder = window.CC_COMPONENTS;
    if (builder && typeof builder.build === 'function' && builder.has('card')) {
      return builder.build('card', config);
    }
    return document.createElement(String(config.tag || 'div'));
  },

  mountCardSlots(card, slots = {}) {
    const builder = window.CC_COMPONENTS;
    if (builder && typeof builder.build === 'function' && builder.has('card')) {
      const built = builder.build('card', {
        tag: card.tagName.toLowerCase(),
        className: card.className,
        attrs: Array.from(card.attributes).reduce((acc, attr) => {
          if (!attr || !attr.name) return acc;
          if (attr.name === 'class' || attr.name === 'style') return acc;
          if (attr.name.startsWith('data-')) return acc;
          acc[attr.name] = attr.value;
          return acc;
        }, {}),
        dataset: { ...card.dataset },
        style: {
          minWidth: card.style.minWidth,
          maxWidth: card.style.maxWidth,
          width: card.style.width
        },
        slots
      });
      if (built) {
        card.innerHTML = '';
        while (built.firstChild) card.appendChild(built.firstChild);
        return;
      }
    }
    const html = `${slots.overlay || ''}${slots.media || ''}${slots.body || ''}${slots.footer || ''}`;
    card.innerHTML = html;
  },

  resolveCardId(algorithm) {
    const explicit = String(algorithm?.id || '').trim();
    if (explicit) return explicit.toLowerCase();
    const page = String(algorithm?.page || '').trim();
    if (page) return page.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
    const title = String(algorithm?.title || 'card').trim();
    return title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  },

  resolveCardMediaScale(cardId, requestedScale) {
    const id = String(cardId || '').trim().toLowerCase();
    const scale = Number.isFinite(requestedScale) && requestedScale > 0 ? requestedScale : 1;
    // Hard fallback for assets with strong inner padding.
    if (id === 'storico-estrazioni') return Math.max(scale, 1.2);
    return scale;
  },

  resolvePaperId(algorithm) {
    return this.resolveCardId(algorithm);
  },

  resolveTelemetryCardType(algorithm) {
    const page = String(algorithm?.page || '').toLowerCase();
    if (page.includes('/algoritmi/algs/')) return 'paper';
    if (page.includes('/algoritmi/spotlight/')) return 'paper';
    return 'action';
  },

  resolveDestinationType(href) {
    const value = String(href || '');
    if (!value || value === '#') return 'none';
    if (/^https?:\/\//i.test(value) && !value.includes(window.location.host)) return 'external';
    if (value.includes('/algoritmi/algs/')) return 'paper';
    if (value.includes('/algoritmi/')) return 'data_section';
    if (value.includes('/pages/')) return 'data_section';
    return 'internal';
  },

  fitProposalBadge(card) {
    const badge = card?.querySelector('[data-proposal-box]');
    if (!badge) return;
    if (badge.classList.contains('hidden')) return;
    const max = 0.64;
    const min = 0.38;
    if (badge.clientWidth <= 1) {
      if (badge.dataset.fitDeferred !== '1') {
        badge.dataset.fitDeferred = '1';
        window.requestAnimationFrame(() => this.fitProposalBadge(card));
      }
      return;
    }
    let size = max;
    badge.style.fontSize = `${size}rem`;
    while (size > min && badge.scrollWidth > badge.clientWidth + 1) {
      size -= 0.02;
      badge.style.fontSize = `${size.toFixed(2)}rem`;
    }
  },


  resolveAccessTier(card) {
    const raw = String(card?.accessTier || card?.tier || 'off').trim().toLowerCase();
    if (raw === 'free' || raw === 'premium' || raw === 'gold') return raw;
    return 'off';
  },

  buildAccessBadgeMarkup(tier) {
    if (!tier || tier === 'off') return '';
    const label = tier.toUpperCase();
    const crown = tier === 'gold' ? '<span class="cc-tier-crown" aria-hidden="true">&#9819;</span>' : '';
    return `<span class="cc-tier-ribbon cc-tier-ribbon--${tier}" aria-label="Piano ${label}"><span class="cc-tier-ribbon__inner">${crown}${label}</span></span>`;
  },


  buildTypeBadgeMarkup(typeLabel) {
    const label = String(typeLabel || '').trim().toUpperCase();
    if (!label) return '';
    return `<span class="card-type-badge card-type-badge--category" aria-label="Tipologia ${label}">${label}</span>`;
  },

  hasNewsBadge(card) {
    return Boolean(card && (card.hasNews || card.featured || (Array.isArray(card.news) && card.news.length > 0)));
  },

  normalizeCardTypeToken(rawValue) {
    const raw = String(rawValue || '').trim().toLowerCase();
    if (!raw) return '';
    const aliases = {
      menu: 'MENU',
      spotlight: 'MENU',
      dashboard: 'MENU',
      home: 'MENU',
      navigazione: 'MENU',
      nav: 'MENU',
      algoritmi: 'ALGORITMI',
      algoritmo: 'ALGORITMI',
      algs: 'ALGORITMI',
      algorithm: 'ALGORITMI',
      algorithms: 'ALGORITMI',
      info: 'INFO',
      standard: 'INFO',
      pagina: 'INFO',
      page: 'INFO',
      archivi: 'ARCHIVI',
      archivio: 'ARCHIVI',
      storico: 'ARCHIVI',
      draws: 'ARCHIVI',
      history: 'ARCHIVI',
      utility: 'UTILITY',
      utilita: 'UTILITY',
      tool: 'UTILITY',
      tools: 'UTILITY',
      stato: 'STATO',
      status: 'STATO',
      monitor: 'STATO',
      controllo: 'STATO',
      admin: 'STATO'
    };
    return aliases[raw] || '';
  },

  resolveCardType(card) {
    const direct = this.normalizeCardTypeToken(card?.type);
    if (direct) return direct;
    const macro = this.normalizeCardTypeToken(card?.macroGroup);
    if (macro) return macro;
    const id = String(card?.id || '').toLowerCase();
    const page = String(card?.page || card?.cardBase || '').toLowerCase();
    if (page.includes('/algoritmi/algs/') || id.startsWith('classic-') || id.startsWith('ml-') || id.startsWith('ai-')) return 'ALGORITMI';
    if (page.includes('/algoritmi/spotlight/') || id.includes('spotlight') || page.includes('/home')) return 'MENU';
    if (page.includes('/storico') || id.includes('storico') || id.includes('archivio') || id.includes('draw')) return 'ARCHIVI';
    if (page.includes('/admin') || id.includes('monitor') || id.includes('status') || id.includes('stato')) return 'STATO';
    return 'INFO';
  },

  resolveCardVisualTone(card) {
    const explicitCategory = String(card?.visualCategory || card?.category || '').trim().toLowerCase();
    if (explicitCategory === 'statistici' || explicitCategory === 'statistica' || explicitCategory === 'logici' || explicitCategory === 'logico') {
      return 'alg-stat';
    }
    if (explicitCategory === 'neurali' || explicitCategory === 'neurale' || explicitCategory === 'neural') {
      return 'alg-neural';
    }
    if (explicitCategory === 'ibridi' || explicitCategory === 'ibrido' || explicitCategory === 'hybrid' || explicitCategory === 'custom') {
      return 'alg-hybrid';
    }
    const type = this.resolveCardType(card);
    const macro = String(card?.macroGroup || '').trim().toLowerCase();
    const id = String(card?.id || '').trim().toLowerCase();
    const page = String(card?.page || card?.cardBase || '').toLowerCase();
    const isAlgorithmLike = type === 'ALGORITMI' || page.includes('/algoritmi/algs/') || page.includes('/algoritmi/spotlight/');
    if (isAlgorithmLike) {
      if (macro.includes('stat')) return 'alg-stat';
      if (macro.includes('ibrid') || /(arc90|paradox)/.test(id)) return 'alg-hybrid';
      if (macro.includes('neur') || /(nn|ai|ml|lightgbm|pcn|rdp|pvx|mase|genetic|super6|superenalottoai|sequence|helix)/.test(id)) return 'alg-neural';
      return 'alg-core';
    }
    if (type === 'MENU') return 'menu';
    if (type === 'ARCHIVI') return 'archivi';
    if (type === 'STATO') return 'stato';
    return 'info';
  },

  resolveCardImage(card) {
    const imageValue = String(card?.image || '').trim();
    if (!imageValue) return resolveWithBase('img/img.webp');
    if (imageValue.startsWith('http://') || imageValue.startsWith('https://') || imageValue.startsWith('/')) {
      return this.appendCacheBuster(imageValue, card.imageVersion);
    }
    if (card.cardBase) {
      return this.appendCacheBuster(resolveWithBase(this.joinCardPath(card.cardBase, imageValue)), card.imageVersion);
    }
    if (card.page) {
      return this.appendCacheBuster(resolveWithBase(this.joinCardPath(card.page, imageValue)), card.imageVersion);
    }
    return this.appendCacheBuster(resolveWithBase(imageValue), card.imageVersion);
  },

  resolveCardBackupImage() {
    return resolveWithBase('img/img_backup.webp');
  },

  joinCardPath(basePath, fileName) {
    const normalized = String(basePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    const imagePath = String(fileName || '').replace(/^\/+/, '');
    if (!normalized) return imagePath;
    if (normalized.endsWith('/')) return `${normalized}${imagePath}`;
    return `${normalized}/${imagePath}`;
  },

  appendCacheBuster(url, version) {
    if (!version) return url;
    const joiner = url.includes('?') ? '&' : '?';
    return `${url}${joiner}v=${version}`;
  },

  bindCardImageFallback(cardEl, fallbackUrl) {
    const imageEl = cardEl?.querySelector('img');
    if (!imageEl) return;
    imageEl.addEventListener('error', () => {
      if (imageEl.dataset.fallbackApplied === '2') return;
      if (imageEl.dataset.fallbackApplied !== '1') {
        imageEl.dataset.fallbackApplied = '1';
        imageEl.src = fallbackUrl;
        cardEl?.classList?.add('cc-card-image-fallback');
        return;
      }
      imageEl.dataset.fallbackApplied = '2';
      const svg = encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'>
          <defs>
            <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
              <stop offset='0%' stop-color='#22305f'/>
              <stop offset='58%' stop-color='#101936'/>
              <stop offset='100%' stop-color='#090f22'/>
            </linearGradient>
          </defs>
          <rect width='640' height='360' fill='url(#g)'/>
          <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#ffe7a3' font-size='24' font-family='Segoe UI, Arial'>Preview non disponibile</text>
        </svg>`
      );
      imageEl.src = `data:image/svg+xml;charset=utf-8,${svg}`;
      cardEl?.classList?.add('cc-card-image-fallback');
    });
  },

  async getLatestArchiveSeq() {
    if (this._latestArchiveSeqPromise) return this._latestArchiveSeqPromise;
    this._latestArchiveSeqPromise = (async () => {
      try {
        const response = await fetch(resolveWithBase('archives/draws/draws.csv'), { cache: 'no-store' });
        if (!response.ok) return null;
        const raw = await response.text();
        const rows = this.parseCsvRows(raw);
        if (!rows.length) return null;
        const last = rows[rows.length - 1];
        const seq = Number.parseInt(String(last['NR. SEQUENZIALE'] || '').trim(), 10);
        return Number.isFinite(seq) ? seq : null;
      } catch (error) {
        return null;
      }
    })();
    return this._latestArchiveSeqPromise;
  },

  async getLatestDrawData() {
    if (this._latestDrawDataPromise) return this._latestDrawDataPromise;
    this._latestDrawDataPromise = (async () => {
      try {
        const response = await fetch(resolveWithBase('archives/draws/draws.csv'), { cache: 'no-store' });
        if (!response.ok) return null;
        const raw = await response.text();
        const rows = this.parseCsvRows(raw);
        if (!rows.length) return null;
        const last = rows[rows.length - 1] || {};
        const seq = Number.parseInt(String(last['NR. SEQUENZIALE'] || '').trim(), 10);
        const date = String(last['DATA'] || '').trim();
        const numbers = [];
        for (let i = 1; i <= 6; i += 1) {
          const val = String(last[`N${i}`] || '').trim();
          const n = Number.parseInt(val.replace(/[^\d]/g, ''), 10);
          numbers.push(Number.isFinite(n) && n >= 1 && n <= 90 ? String(n).padStart(2, '0') : '');
        }
        return {
          seq: Number.isFinite(seq) ? seq : null,
          date: date || null,
          numbers
        };
      } catch (error) {
        return null;
      }
    })();
    return this._latestDrawDataPromise;
  },

  hasDrawTemplateTokens(algorithm) {
    const text = `${algorithm?.title || ''} ${algorithm?.subtitle || ''} ${algorithm?.narrativeSummary || ''}`;
    return /\$D|\$SEQ|\$N[1-6]\b/i.test(String(text));
  },

  applyDrawTemplate(value, draw) {
    const source = String(value || '');
    if (!source) return '';
    if (!/\$D|\$SEQ|\$N[1-6]\b/i.test(source)) return source;
    const date = draw?.date || 'NO DATA';
    const seq = Number.isFinite(draw?.seq) ? String(draw.seq) : 'NO DATA';
    return source.replace(/\$D|\$SEQ|\$N[1-6]\b/gi, (token) => {
      const up = token.toUpperCase();
      if (up === '$D') return date;
      if (up === '$SEQ') return seq;
      const m = up.match(/^\$N([1-6])$/);
      if (!m) return token;
      const idx = Number.parseInt(m[1], 10) - 1;
      return draw?.numbers?.[idx] || 'NO DATA';
    });
  },

  renderDrawTemplate(value, draw) {
    const source = String(value || '');
    if (!source) return { text: '', html: '', hasBalls: false };
    if (!/\$D|\$SEQ|\$N[1-6]\b/i.test(source)) {
      const safe = this.escapeHtml(source);
      return { text: source, html: safe, hasBalls: false };
    }
    const date = draw?.date || 'NO DATA';
    const seq = Number.isFinite(draw?.seq) ? String(draw.seq) : 'NO DATA';
    let hasBalls = false;
    let textOut = '';
    let htmlOut = '';
    let index = 0;
    const tokenRe = /\$D|\$SEQ|\$N[1-6]\b/gi;
    for (let m = tokenRe.exec(source); m; m = tokenRe.exec(source)) {
      const chunk = source.slice(index, m.index);
      if (chunk) {
        textOut += chunk;
        htmlOut += this.escapeHtml(chunk);
      }
      const token = m[0].toUpperCase();
      if (token === '$D') {
        textOut += date;
        htmlOut += this.escapeHtml(date);
      } else if (token === '$SEQ') {
        textOut += seq;
        htmlOut += this.escapeHtml(seq);
      } else {
        const mm = token.match(/^\$N([1-6])$/);
        const idx = mm ? Number.parseInt(mm[1], 10) - 1 : -1;
        const num = draw?.numbers?.[idx] || 'NO DATA';
        textOut += num;
        htmlOut += `<span class="ball-3d">${this.escapeHtml(num)}</span>`;
        hasBalls = true;
      }
      index = tokenRe.lastIndex;
    }
    const tail = source.slice(index);
    if (tail) {
      textOut += tail;
      htmlOut += this.escapeHtml(tail);
    }
    return { text: textOut, html: htmlOut, hasBalls };
  },

  escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  async readCsvRows(url) {
    if (!url) return null;
    if (this._csvRowsCache.has(url)) return this._csvRowsCache.get(url);
    const loadPromise = (async () => {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) return null;
        const raw = await response.text();
        return this.parseCsvRows(raw);
      } catch (error) {
        return null;
      }
    })();
    this._csvRowsCache.set(url, loadPromise);
    try {
      return await loadPromise;
    } catch (error) {
      this._csvRowsCache.delete(url);
      return null;
    }
  },

  parseCsvRows(raw) {
    const lines = String(raw || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
    if (!lines.length) return [];
    const delimiter = this.detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map((x) => this.stripQuotes(x.trim()));
    return lines.slice(1).map((line) => {
      const parts = line.split(delimiter).map((x) => this.stripQuotes(x.trim()));
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx] ?? '';
      });
      return row;
    });
  },

  stripQuotes(value) {
    const v = String(value || '').trim();
    if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) {
      return v.slice(1, -1).replace(/""/g, '"');
    }
    return v;
  },

  resolveMetricsUrl(algorithm) {
    const page = String(algorithm?.page || '').trim();
    if (!page) return null;
    let metricsPath = page;
    if (/\.html?$/i.test(metricsPath)) {
      metricsPath = metricsPath.replace(/[^/]+$/i, 'out/metrics-db.csv');
    } else {
      metricsPath = metricsPath.replace(/\/?$/, '/out/metrics-db.csv');
    }
    return resolveWithBase(metricsPath);
  },

  resolveHistoricalUrl(algorithm) {
    const page = String(algorithm?.page || '').trim();
    if (!page) return null;
    let historicalPath = page;
    if (/\.html?$/i.test(historicalPath)) {
      historicalPath = historicalPath.replace(/[^/]+$/i, 'out/historical-db.csv');
    } else {
      historicalPath = historicalPath.replace(/\/?$/, '/out/historical-db.csv');
    }
    return resolveWithBase(historicalPath);
  },

  parseItalianDate(value) {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    const day = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const year = Number.parseInt(match[3], 10);
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const ts = Date.UTC(year, month - 1, day);
    const date = new Date(ts);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return { ts, label: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}` };
  },

  extractLatestHistoricalDate(rows) {
    let best = null;
    (rows || []).forEach((row) => {
      const parsed = this.parseItalianDate(row?.DATA || row?.Data || row?.data);
      if (!parsed) return;
      if (!best || parsed.ts > best.ts) best = parsed;
    });
    return best ? best.label : null;
  },

  extractProposalInfo(rows) {
    const map = new Map(
      (rows || []).map((row) => [
        String(row.METRICA || '').trim().toLowerCase(),
        { value: String(row.VALORE || '').trim(), note: String(row.NOTE || '').trim() }
      ])
    );
    const next = map.get('concorso successivo stimato');
    const pick = map.get('sestina proposta (prossimo concorso)');
    const nextSeq = Number.parseInt(String(next?.value || '').trim(), 10);
    let proposal = String(pick?.value || '').trim();
    if (!proposal && next?.note) {
      const match = next.note.match(/sestina proposta:\s*(.+)$/i);
      if (match) proposal = String(match[1] || '').trim();
    }
    return { nextSeq: Number.isFinite(nextSeq) ? nextSeq : null, proposal: proposal || null };
  },
  extractTrainingDateFromMetrics(rows) {
    const metrics = Array.isArray(rows) ? rows : [];
    const candidates = [];
    metrics.forEach((row) => {
      const metric = String(row?.METRICA || '').trim().toLowerCase();
      const value = String(row?.VALORE || '').trim();
      const note = String(row?.NOTE || '').trim();
      if (metric === 'ultimo concorso calcolato' || metric === 'concorso successivo stimato' || metric === 'sestina proposta (prossimo concorso)') {
        candidates.push(value, note);
      }
    });
    for (const text of candidates) {
      const match = String(text).match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (!match) continue;
      const parsed = this.parseItalianDate(match[1]);
      if (parsed && parsed.label) return parsed.label;
    }
    return null;
  },

  normalizeProposalNumbers(rawProposal) {
    const tokens = String(rawProposal || '')
      .split(/[\s,;|]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const numbers = [];
    for (const token of tokens) {
      const n = Number.parseInt(token.replace(/[^\d]/g, ''), 10);
      if (!Number.isFinite(n)) continue;
      if (n < 1 || n > 90) continue;
      numbers.push(String(n).padStart(2, '0'));
      if (numbers.length === 6) break;
    }
    return numbers;
  },

  computeRankingValue(metricsRows, historicalRows) {
    const exact = this.extractExactHitCounts(metricsRows, historicalRows);
    if (!exact) return NaN;
    let total = 0;
    for (let k = 0; k <= 6; k += 1) {
      const count = Number.isFinite(exact[k]) ? exact[k] : 0;
      total += count * (this._rankingPayouts[k] || 0);
    }
    return total;
  },

  async computeRankingForAlgorithm(algorithm) {
    const page = String(algorithm?.page || '').trim();
    if (!page) return NaN;
    const key = page.toLowerCase();
    if (this._rankingCache.has(key)) return this._rankingCache.get(key);
    try {
      const metricsUrl = this.resolveMetricsUrl(algorithm);
      const historicalUrl = this.resolveHistoricalUrl(algorithm);
      const [metricsRows, historicalRows] = await Promise.all([
        this.readCsvRows(metricsUrl),
        this.readCsvRows(historicalUrl)
      ]);
      const score = this.computeRankingValue(metricsRows || [], historicalRows || []);
      this._rankingCache.set(key, score);
      return score;
    } catch (_) {
      this._rankingCache.set(key, NaN);
      return NaN;
    }
  },

  extractExactHitCounts(metricsRows, historicalRows) {
    const out = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const byMetric = new Map(
      (metricsRows || []).map((row) => [
        String(row.METRICA || '').trim().toLowerCase(),
        Number.parseInt(String(row.VALORE || '').replace(/[^\d-]/g, ''), 10)
      ])
    );
    let hasExact = false;
    for (let k = 2; k <= 6; k += 1) {
      const v = byMetric.get(`con ${k} hit`);
      if (Number.isFinite(v)) {
        out[k] = Math.max(0, v);
        hasExact = true;
      }
    }
    if (hasExact) {
      // Try to derive "Con 1 hit" and "Con 0 hit" from historical rows when available.
      const fromHist = this.extractExactHitsFromHistorical(historicalRows);
      if (fromHist.total > 0) {
        out[1] = fromHist[1];
        out[0] = fromHist[0];
      }
      return out;
    }
    const fromHist = this.extractExactHitsFromHistorical(historicalRows);
    if (fromHist.total > 0) {
      for (let k = 0; k <= 6; k += 1) out[k] = fromHist[k];
      return out;
    }
    return null;
  },

  extractExactHitsFromHistorical(rows) {
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, total: 0 };
    (rows || []).forEach((row) => {
      let h = 0;
      for (let i = 1; i <= 6; i += 1) {
        const val = String(row[`N${i}`] || '').trim();
        if (val.startsWith('[') && val.endsWith(']')) h += 1;
      }
      if (h >= 0 && h <= 6) {
        counts[h] += 1;
        counts.total += 1;
      }
    });
    return counts;
  },

  formatRankingValue(value) {
    if (!Number.isFinite(value)) return '--';
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  },

  enableDepth(root = document) {
    this.ensureComponentStyles();
    const host = root && root.querySelectorAll ? root : document;
    const cards = host.querySelectorAll('.card-3d');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canRunDepth = !prefersReducedMotion;

    cards.forEach((card) => {
      if (card.dataset.depthBound === '1') return;
      card.dataset.depthBound = '1';
      let rect = null;
      let raf = 0;
      let pending = null;

      const updatePerspectiveEdges = (angleX, angleY) => {
        const nx = Math.max(-1, Math.min(1, angleX / 12));
        const ny = Math.max(-1, Math.min(1, angleY / 12));

        const edgeLeft = (0.14 + Math.max(0, -ny) * 0.36 + Math.max(0, -nx) * 0.05).toFixed(3);
        const edgeRight = (0.14 + Math.max(0, ny) * 0.36 + Math.max(0, -nx) * 0.04).toFixed(3);
        const edgeTop = (0.16 + Math.max(0, -nx) * 0.38).toFixed(3);
        const edgeBottom = (0.18 + Math.max(0, nx) * 0.42 + Math.abs(ny) * 0.06).toFixed(3);

        const spread = (5 + Math.abs(ny) * 6).toFixed(2);
        const spreadTop = (4 + Math.max(0, -nx) * 5).toFixed(2);
        const spreadBottom = (6 + Math.max(0, nx) * 7).toFixed(2);
        const edgeLeftW = `${(2 + Math.max(0, -ny) * 4 + Math.max(0, -nx) * 2).toFixed(2)}px`;
        const edgeRightW = `${(2 + Math.max(0, ny) * 4 + Math.max(0, -nx) * 2).toFixed(2)}px`;
        const edgeTopW = `${(2 + Math.max(0, -nx) * 4).toFixed(2)}px`;
        const edgeBottomW = `${(3 + Math.max(0, nx) * 5 + Math.abs(ny) * 2).toFixed(2)}px`;

        card.style.setProperty('--edge-left-a', edgeLeft);
        card.style.setProperty('--edge-right-a', edgeRight);
        card.style.setProperty('--edge-top-a', edgeTop);
        card.style.setProperty('--edge-bottom-a', edgeBottom);
        card.style.setProperty('--edge-spread', `${spread}%`);
        card.style.setProperty('--edge-spread-top', `${spreadTop}%`);
        card.style.setProperty('--edge-spread-bottom', `${spreadBottom}%`);
        card.style.setProperty('--edge-left-w', edgeLeftW);
        card.style.setProperty('--edge-right-w', edgeRightW);
        card.style.setProperty('--edge-top-w', edgeTopW);
        card.style.setProperty('--edge-bottom-w', edgeBottomW);
      };

      const reset = () => {
        card.style.removeProperty('--card-rotate-x');
        card.style.removeProperty('--card-rotate-y');
        card.style.removeProperty('--card-glow-x');
        card.style.removeProperty('--card-glow-y');
        card.style.removeProperty('--card-wobble-x');
        card.style.removeProperty('--card-wobble-y');
        card.style.removeProperty('--card-lift');
        card.style.removeProperty('--card-z');
        updatePerspectiveEdges(0, 0);
      };

      if (!canRunDepth) {
        reset();
        card.classList.remove('is-hovered', 'is-grabbed', 'is-selected');
        return;
      }

      const queueTiltAt = (clientX, clientY) => {
        if (!rect) rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        pending = { x: clientX, y: clientY };
        if (raf) return;
        raf = window.requestAnimationFrame(() => {
          raf = 0;
          if (!pending) return;
          const x = Math.min(Math.max((pending.x - rect.left) / rect.width, 0), 1);
          const y = Math.min(Math.max((pending.y - rect.top) / rect.height, 0), 1);
          card.style.setProperty('--card-glow-x', `${(x * 100).toFixed(1)}%`);
          card.style.setProperty('--card-glow-y', `${(y * 100).toFixed(1)}%`);

          const dx = x * 2 - 1;
          const dy = y * 2 - 1;
          const tiltTokenRaw = getComputedStyle(card).getPropertyValue('--card-tilt-max').trim();
          const tiltToken = Number.parseFloat(tiltTokenRaw);
          const baseTilt = Number.isFinite(tiltToken) ? tiltToken : 20;
          const maxTilt = Math.max(12, baseTilt);
          // Amplify edge/corner response so the card visibly "leans" toward cursor direction.
          const driveX = Math.sign(dx) * Math.pow(Math.abs(dx), 0.72);
          const driveY = Math.sign(dy) * Math.pow(Math.abs(dy), 0.72);
          const rotateX = -maxTilt * driveY;
          const rotateY = maxTilt * driveX;
          card.style.setProperty('--card-rotate-x', `${rotateX.toFixed(2)}deg`);
          card.style.setProperty('--card-rotate-y', `${rotateY.toFixed(2)}deg`);
          updatePerspectiveEdges(rotateX, rotateY);
        });
      };

      const onMove = (event) => {
        if (event.pointerType === 'touch') return;
        queueTiltAt(event.clientX, event.clientY);
      };

      const onEnter = (event) => {
        rect = card.getBoundingClientRect();
        card.classList.add('is-hovered');
        card.style.setProperty('--card-lift', '-9px');
        card.style.setProperty('--card-z', '10px');
        card.style.setProperty('--card-wobble-x', '0deg');
        card.style.setProperty('--card-wobble-y', '0deg');
        if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
          queueTiltAt(event.clientX, event.clientY);
        }
      };

      const onLeave = () => {
        card.classList.remove('is-hovered');
        card.classList.remove('is-grabbed');
        rect = null;
        pending = null;
        if (raf) {
          window.cancelAnimationFrame(raf);
          raf = 0;
        }
        reset();
      };

      card.addEventListener('pointerenter', onEnter, { passive: true });
      card.addEventListener('pointermove', onMove, { passive: true });
      card.addEventListener('pointerleave', onLeave, { passive: true });
      card.addEventListener('pointercancel', onLeave, { passive: true });
      card.addEventListener('pointerdown', () => card.classList.add('is-grabbed'));
      card.addEventListener('pointerup', () => card.classList.remove('is-grabbed'));
      card.addEventListener('focus', () => card.classList.add('is-selected'));
      card.addEventListener('blur', () => card.classList.remove('is-selected'));
      card.addEventListener('click', () => {
        card.classList.add('is-selected');
        window.setTimeout(() => card.classList.remove('is-selected'), 220);
      });

      reset();
    });
  },

  async applyDrawsLatest(card) {
    try {
      const draw = await this.getLatestDrawData();
      if (!draw) return;
      const drawDate = draw.date || '';
      const numbers = Array.isArray(draw.numbers) ? draw.numbers : [];

      const updated = card.querySelector('[data-card-updated]');
      if (updated) {
        if (drawDate) {
          updated.textContent = drawDate;
          updated.hidden = false;
        } else {
          updated.textContent = '';
          updated.hidden = true;
        }
      }

      const numbersRow = card.querySelector('[data-card-numbers]');
      if (numbersRow) {
        numbersRow.hidden = false;
        numbersRow.innerHTML = numbers
          .map((value) => `<span class="ball-3d">${value}</span>`)
          .join('');
      }
    } catch (error) {
      // no-op
    }
  },

  detectDelimiter(line) {
    const semi = (line.match(/;/g) || []).length;
    const comma = (line.match(/,/g) || []).length;
    if (semi === 0 && comma === 0) return ',';
    return semi >= comma ? ';' : ',';
  }
};

window.CARDS = CARDS;

(() => {
  let depthObserver = null;
  let depthRebindTimer = 0;

  const shouldActivateDepthRuntime = () => {
    const pageId = String(document.body?.dataset?.pageId || '').toLowerCase();
    if (['home', 'algoritmi', 'algspotlight'].includes(pageId)) return true;
    if (document.querySelector('.card-3d, .cc-card3d, [data-card-id], [data-module-area], [data-algorithms-area]')) return true;
    return false;
  };

  const bindDepth = () => {
    try {
      if (!window.CARDS || typeof window.CARDS.enableDepth !== 'function') return;
      window.CARDS.enableDepth(document);
    } catch (_) {
      // Keep page functional even if depth bootstrap fails.
    }
  };

  const start = () => {
    if (!shouldActivateDepthRuntime()) return;
    bindDepth();
    // News/home cards can be mounted in deferred chunks.
    window.setTimeout(bindDepth, 260);
    window.setTimeout(bindDepth, 1200);
    window.setTimeout(bindDepth, 3000);

    if ('MutationObserver' in window && !depthObserver) {
      const scheduleRebind = () => {
        if (depthRebindTimer) window.clearTimeout(depthRebindTimer);
        depthRebindTimer = window.setTimeout(() => {
          depthRebindTimer = 0;
          bindDepth();
        }, 60);
      };

      depthObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type !== 'childList') continue;
          if ((m.addedNodes && m.addedNodes.length) || (m.removedNodes && m.removedNodes.length)) {
            scheduleRebind();
            return;
          }
        }
      });

      depthObserver.observe(document.body, { childList: true, subtree: true });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

function resolveWithBase(path) {
  if (!path) return path;
  const value = String(path);
  if (value.startsWith('#') || /^https?:\/\//i.test(value) || value.startsWith('file:')) {
    return value;
  }
  const trimmed = value.startsWith('/') ? value.slice(1) : value.replace(/^\.\//, '');
  if (/^https?:$/i.test(String(window.location.protocol || '')) && /^(pages|data|assets|img|archives)\//i.test(trimmed)) {
    return new URL(`/${trimmed}`, window.location.origin).toString();
  }
  const base = window.CC_BASE?.url;
  if (!base) return value;
  return new URL(trimmed, base).toString();
}

