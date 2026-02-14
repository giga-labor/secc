# LCP Log

## 2026-02-14 - step2 render-delay pack

- Source baseline: `docs/lighthouse-home-v3-lcp-tuned-r2.json`
- Source current: `docs/lighthouse-home-v3-lcp-step2.json`
- LCP element selector (baseline): `div.flex > a.cc-card > div.cc-card-media > img.h-full`
- LCP element selector (current): `div.flex > a.cc-card > div.cc-card-media > img.h-full`

Metrics:
- Baseline LCP: `16614.90 ms`
- Current LCP: `16915.54 ms`
- Current CLS: `0.0241`
- Current Performance: `55`
- Current Accessibility: `100`

Breakdown baseline (`r2`):
- TTFB: `452.35 ms`
- Load Delay: `3650.36 ms`
- Load Time: `34.07 ms`
- Render Delay: `12478.12 ms`

Breakdown current (`step2`):
- TTFB: `452.62 ms`
- Load Delay: `4103.73 ms`
- Load Time: `71.38 ms`
- Render Delay: `12287.82 ms`

Delta current - baseline:
- TTFB: `+0.27 ms`
- Load Delay: `+453.37 ms`
- Load Time: `+37.31 ms`
- Render Delay: `-190.30 ms`
- LCP: `+300.64 ms`

Notes:
- Render Delay dropped slightly, but not enough to offset increase in Load Delay.
- LCP element selector is unchanged, so the same critical path still dominates.

## 2026-02-14 - step3 static LCP seed

- Source current: `docs/lighthouse-home-v3-lcp-seed-step3.json`
- LCP element selector: `div.flex > a.cc-card > div.cc-card-media > img.h-full`

Metrics:
- LCP: `17219.54 ms`
- CLS: `0.0016`
- Performance: `57`
- Accessibility: `100`

Breakdown:
- TTFB: `452.47 ms`
- Load Delay: `0 ms`
- Load Time: `0 ms`
- Render Delay: `16767.07 ms`

Notes:
- Seed forces immediate resource fetch (load delay zero), but element paint is still heavily delayed.

## 2026-02-14 - step3b static seed + atomic replace

- Source current: `docs/lighthouse-home-v3-lcp-seed-step3b.json`
- LCP element selector: `div.flex > a.cc-card > div.cc-card-media > img.h-full`

Metrics:
- LCP: `17457.86 ms`
- CLS: `0.0011`
- Performance: `59`
- Accessibility: `100`

Breakdown:
- TTFB: `452.14 ms`
- Load Delay: `0 ms`
- Load Time: `0 ms`
- Render Delay: `17005.71 ms`

Notes:
- Atomic replacement did not reduce render delay on this run.

## 2026-02-14 - step4 gate overrides (home news visibility force)

- Source current: `docs/lighthouse-home-v3-lcp-seed-step4.json`
- LCP element selector: `div.flex > a.cc-card > div.cc-card-media > img.h-full`

Metrics:
- LCP: `17303.65 ms`
- CLS: `0.0016`
- Performance: `55`
- Accessibility: `100`

Breakdown:
- TTFB: `452.24 ms`
- Load Delay: `0 ms`
- Load Time: `0 ms`
- Render Delay: `16851.42 ms`

Notes:
- Forcing news panel visibility and removing main masks did not reduce render delay.

## 2026-02-14 - step4b flatten 3D in home news strip

- Source current: `docs/lighthouse-home-v3-lcp-seed-step4b.json`
- LCP element selector: `div.flex > a.cc-card > div.cc-card-media > img.h-full`

Metrics:
- LCP: `17288.72 ms`
- CLS: `0.0011`
- Performance: `57`
- Accessibility: `100`

Breakdown:
- TTFB: `452.58 ms`
- Load Delay: `0 ms`
- Load Time: `0 ms`
- Render Delay: `16836.14 ms`

Notes:
- Flattening 3D card effects on the news strip gave no material render-delay reduction.

## 2026-02-14 - step5 main-thread relief pack (header/cards deferred enhancements)

- Source current: `docs/lighthouse-home-v3-lcp-step5.json`
- LCP element selector: `div.flex > a.cc-card > div.cc-card-media > img.h-full`

Metrics:
- LCP: `17539.29 ms`
- CLS: `0.0016`
- Performance: `53`
- Accessibility: `100`

Breakdown:
- TTFB: `453.90 ms`
- Load Delay: `0 ms`
- Load Time: `0 ms`
- Render Delay: `17085.40 ms`

Instrumentation sample (`performance.measure`, Playwright run):
- `cc:header:critical-tabs`: `7.2 ms`
- `cc:header:deferred-enhancements`: `2.0 ms`
- `cc:cards:depth:flush`: `0.7 ms`
- `cc:cards:depth:now`: `0.5 ms`
- `cc:header:glass-enhancements`: `0.5 ms`

Notes:
- Defer/progressive-enhancement changes did not reduce Lighthouse render delay in this run.

## 2026-02-14 - step6 fix1 (orchestrator defer after 2 RAF)

- Source current: `docs/lighthouse-home-v3-lcp-step6-fix1.json`
- LCP element selector: `div.flex > a.cc-card > div.cc-card-media > img.h-full`

Metrics:
- LCP: `18873.32 ms`
- CLS: `0.0016`
- Performance: `58`

Breakdown:
- TTFB: `452.20 ms`
- Load Delay: `0 ms`
- Load Time: `0 ms`
- Render Delay: `18421.13 ms`

Notes:
- Variant A worsened LCP/render delay on this run.

## 2026-02-14 - step6 fix1a (2 RAF + setTimeout 0)

- Source current: `docs/lighthouse-home-v3-lcp-step6-fix1a-timeout0.json`
- LCP element selector: `div.flex > a.cc-card > div.cc-card-media > img.h-full`

Metrics:
- LCP: `19015.90 ms`
- Render Delay: `18563.69 ms`
- Load Delay: `0 ms`
- Performance: `58`

Notes:
- Worse than fix1 (2 RAF only) and worse than `r2`.

## 2026-02-14 - step6 fix1b (2 RAF + idle bounded 1500ms)

- Source current: `docs/lighthouse-home-v3-lcp-step6-fix1b-idle.json`
- LCP element selector: `div.flex > a.cc-card > div.cc-card-media > img.h-full`

Metrics:
- LCP: `19324.49 ms`
- Render Delay: `18871.95 ms`
- Load Delay: `0 ms`
- Performance: `63`

Notes:
- Most delayed start; LCP/render delay worsen further.

## 2026-02-14 - step8 fix2 (internal chunking on home news mount)

- Source current: `docs/lighthouse-home-v3-lcp-step8-fix2.json`
- LCP element selector: `div.flex > a.cc-card > div.cc-card-media > img.h-full`

Metrics:
- LCP: `18268.25 ms`
- Render Delay: `17815.62 ms`
- Load Delay: `0 ms`
- Performance: `56`
- CLS: `0.0011`

Delta:
- vs `r2` Render Delay: `+5337.50 ms`
- vs `r2` LCP: `+1653.34 ms`

Notes:
- First chunking attempt did not improve LCP/render delay in Lighthouse mobile.

## 2026-02-14 - v4 above-the-fold static (step1 no runtime hook)

- Source current: `docs/lighthouse-home-v4-abovefold.json`
- LCP element selector: `figure.cc-abovefold-featured > a.cc-card > div.cc-card-media > img`

Metrics:
- LCP: `18921.13 ms`
- CLS: `0.0016`
- Performance: `56`
- Accessibility: `98`

Breakdown:
- TTFB: `452.39 ms`
- Load Delay: `0 ms`
- Load Time: `0 ms`
- Render Delay: `18468.75 ms`

Notes:
- LCP target successfully moved from runtime news card to static above-the-fold featured image.
- Runtime branch state still shows high render delay; timing worsened vs `r2`.

## 2026-02-14 - v4 abovefold clean baseline

- Source current: `docs/lighthouse-home-v4-abovefold-clean.json`
- LCP element selector: `figure.cc-abovefold-featured > a.cc-card > div.cc-card-media > img`

Metrics:
- LCP: `18721.30 ms`
- TTFB: `452.25 ms`
- Load Delay: `0 ms`
- Load Time: `0 ms`
- Render Delay: `18269.05 ms`
- CLS: `0.0016`

## 2026-02-14 - v4 abovefold cheap-paint (V4-A)

- Source current: `docs/lighthouse-home-v4-abovefold-cheappaint.json`
- LCP element selector: `figure.cc-abovefold-featured > a.cc-card > div.cc-card-media > img`

Metrics:
- LCP: `18475.61 ms`
- TTFB: `452.20 ms`
- Load Delay: `0 ms`
- Load Time: `0 ms`
- Render Delay: `18023.42 ms`
- CLS: `0.0016`

Notes:
- Small improvement vs v4 clean (`~ -246 ms` render delay), not enough.

## 2026-02-14 - v4 abovefold lite image (V4-C)

- Source current: `docs/lighthouse-home-v4-abovefold-liteimg.json`
- LCP element selector: `figure.cc-abovefold-featured > a.cc-card > div.cc-card-media > img`

Metrics:
- LCP: `18705.95 ms`
- TTFB: `452.29 ms`
- Load Delay: `0 ms`
- Load Time: `0 ms`
- Render Delay: `18253.66 ms`
- CLS: `0.0016`

Notes:
- Lighter 640x360 image does not materially reduce render delay.

## 2026-02-14 - v4.3 freeze abovefold + g5 chunk news

- Source current: `docs/lighthouse-home-v4-freeze-chunk.json`
- LCP element selector: `figure.cc-abovefold-featured > a.cc-card > div.cc-card-media > img`

Metrics:
- LCP: `18965.65 ms`
- TTFB: `452.09 ms`
- Load Delay: `0 ms`
- Load Time: `0 ms`
- Render Delay: `18513.56 ms`
- CLS: `0.0016`

Delta vs `v4-abovefold-clean`:
- LCP: `+244.35 ms`
- Render Delay: `+244.51 ms`

## 2026-02-14 - v4 diag skip news runtime (temporary)

- Source current: `docs/lighthouse-home-v4-diag-skip-news.json`
- Runtime tweak: skipped only `news_cards` render path (diagnostic flag)
- LCP element selector: `figure.cc-abovefold-featured > a.cc-card > div.cc-card-media > img`

Metrics:
- LCP: `17774.70 ms`
- Render Delay: `17322.32 ms`
- Load Delay: `0 ms`

Delta vs `v4-abovefold-clean`:
- LCP: `-946.59 ms`
- Render Delay: `-946.73 ms`

Notes:
- Confirms news runtime path contributes materially to LCP render-delay contention.

## 2026-02-14 - v4.5 news-lite two-phase (initialLimit=1, rest deferred)

- Source current: `docs/lighthouse-home-v4-news-lite.json`
- LCP element selector: `figure.cc-abovefold-featured > a.cc-card > div.cc-card-media > img`

Metrics:
- LCP: `18326.68 ms`
- Render Delay: `17874.25 ms`
- Load Delay: `0 ms`
- Performance: `55`
- CLS: `0.0016`

Delta vs `v4-abovefold-clean`:
- LCP: `-394.62 ms`
- Render Delay: `-394.79 ms`

Runtime perception sample (Playwright):
- First runtime news card visible: `~453 ms`
- News count after 3s: `4`

## 2026-02-14 - v4.6 h1-lcp (text-priority abovefold)

- Source current: `docs/lighthouse-home-v4-h1-lcp-r2.json`
- LCP element selector: `section#cc-abovefold > div.cc-abovefold-inner > div.cc-abovefold-copy > h1#cc-abovefold-title`

Metrics:
- LCP: `17750.72 ms`
- TTFB: `453.62 ms`
- Load Delay: `0 ms`
- Load Time: `0 ms`
- Render Delay: `17297.10 ms`
- Performance: `50`
- CLS: `0.0016`

Delta vs `v4-abovefold-clean`:
- LCP: `-970.58 ms`
- Render Delay: `-971.95 ms`

Notes:
- LCP target moved from featured image to above-the-fold H1.
- Featured image was downscaled on mobile to remove image dominance in LCP candidacy.
