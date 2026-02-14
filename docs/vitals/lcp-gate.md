# LCP Gate Hunt

Date: `2026-02-14`

Method: static code audit on current home CSS/JS before step4.

Gate found on: `.tab-panel`  
Property: `display: none` by default, visible only through `.tab-panel.is-active` and runtime `panel.hidden` toggling in `assets/js/header.js`.

Additional gate candidate on ancestor: `main.content-fade` and `main.content-fade > .content-box`  
Property: `mask-image`/`-webkit-mask-image` gradients in `assets/css/header.css` that can delay or clip initial paint in above-the-fold area.

Action taken in step4:
- Force pre-paint visibility for `section[data-tab-panel="home-news"]` and `[data-module-area]` on home.
- Remove masks on `main.content-fade` and `.content-box` on home for the measurement run.

Runtime probe (Playwright, mobile viewport):
- First seed card image visible in viewport at ~`242 ms` from DOMContentLoaded.
- Runtime card replacing seed visible by ~`518 ms`.
- `panelHiddenAttr=false`, `display=block`, `visibility=visible`, `opacity=1` during early samples.

Conclusion:
- No sustained visibility gate found on the News panel at runtime.
- Remaining LCP delay is dominated by late paint attribution under throttled Lighthouse conditions (likely main-thread/long-task pressure).
