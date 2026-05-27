# Architecture

A map for agents picking up this codebase. For terminology see [CONTEXT.md](../CONTEXT.md); for the rationale behind the major split see [adr/0001-per-preset-pipeline-routing.md](./adr/0001-per-preset-pipeline-routing.md).

> **Note (2026-05-27):** Path α was chosen as the production direction for the four anatomy-driven presets. The new engine class (`AnatomyDeformWordmark`) is not yet in `lib/sculpt.js` — the validated prototype lives in `adjustable-web-type.prototype.html`. The two-pipeline model below describes today's code; once `AnatomyDeformWordmark` lands, the legacy `Wordmark` class is renamed to **`SandboxWordmark`** and retained only as the engine for the `none` preset (a `Wordmark` alias is kept for backward compatibility). See [handoff-path-alpha.md](./handoff-path-alpha.md) and [docs/briefs/path-alpha-landing.md](./briefs/path-alpha-landing.md).

## The two-pipeline model

The library renders a wordmark through one of two engines. The choice is per-preset (locked at preset-definition time, not user-toggled).

```
                     createWordmark(text, opts)
                              │
                  ┌───────────┴───────────┐
                  │                       │
         preset.pipeline =          preset.pipeline =
          "outline-deform"          "anatomy-deform"
                  │                       │
   DeformableOutlineWordmark        AnatomyDeformWordmark
   (lib/sculpt.js:2463)             (new — to land per Brief 1)
                  │                       │
        loads WOFF via                renders hand-authored
        opentype.js;                  Béziers + monoline
        deforms outline               glyphs; per-letter
        with preset.axes              anatomy handles
                  │                       │
                  └───────────┬───────────┘
                              ▼
                     SVG mounted in DOM
```

A third class, `OutlineWordmark` (`lib/sculpt.js:2983`), renders a **static** filled WOFF outline with no handles. It powers the demo's "Reference outlines" toggle for side-by-side comparison and is not part of either primary pipeline.

## File layout

```
adjustable-web-type/
├── adjustable-web-type.html       ← demo + dev docs page; UI wiring; mount()
├── adjustable-web-type.prototype.html ← scratch (not for production; see handoff doc)
├── lib/sculpt.js                  ← entire library, single UMD-ish file (~3.2k LOC)
├── CONTEXT.md                     ← glossary
├── CHANGES.md                     ← sprint log + deferred items
├── docs/
│   ├── ARCHITECTURE.md            ← this file
│   ├── API.md                     ← public surface reference
│   ├── PRODUCT_INTENT.md          ← toy, not a type-design tool
│   ├── THIRD_PARTY_FONTS.md       ← OFL attribution; font-loading
│   ├── snapshot-regression.md     ← manual visual-regression checklist
│   ├── handoff-pipeline-prototype.md ← in-flight prototype handoff
│   ├── agent-learnings.md         ← chronological session journal (long)
│   └── adr/
│       └── 0001-per-preset-pipeline-routing.md
└── package.json                   ← Vite dev only; one runtime dep (opentype.js)
```

## Tour of `lib/sculpt.js`

The single file is laid out top-to-bottom in dependency order. Major sections by line range:

| Lines | Section | Notes |
|---|---|---|
| 30–45 | UMD wrapper, registry | Exposes `SculptLettering` global. `registerGlyph` populates the alphabet registry. |
| 47–90 | `Glyph` instance | One per character in a wordmark. Holds module + tuned `params`. |
| 90–290 | Geometry helpers | `bboxFromPaths`, `clampAperture`, `advanceWithBearings`, `appendSerifStubs`, `makeArchGlyph`. |
| 285–1090 | Curated glyph modules | Hand-authored Bézier glyphs: `a`, `n`, `o`, `s`, `h`, `i`, `e`, `t`, `r`, `l`, `w`, `d`, `b`, `c`, `m`, `g`, space. Each exports `{character, defaultParams, paramRanges, construct, handles, advance, bounds}`. |
| 1093–1241 | Monoline factory | `createMonolineGlyph()` builds the remaining ~30 letters from normalized polyline definitions + Catmull-Rom curvature. Fallback alphabet. |
| 1265–1300 | Outline runtime helpers | `setOpentypeParser`, `outlineAttributionBlock/Html`, disclaimer constants. |
| 1309–1610 | Outline deformation core | Command cloning, dense subpath sampling, `applyBubbliness`, `applyWidthScale`, `buildSerifExtras`, `applyPresetAxesToCommands`, `buildDeformedPathData`, `extractOutlineGlyph`, font cache. |
| 1612–1845 | Preset definitions | The five presets (`bubbly`, `instrumentSerif`, `sourceSans`, `bitter`, `ibmPlexMono`) + their `defaults`, `glyphParams`, `axes`. |
| 1846–1870 | Preset registry + `resolvePresetParams` | Merges `defaults` then overlays `glyphParams[ch]` per key. |
| 1872–2460 | `class Wordmark` (to be renamed `SandboxWordmark` per Brief 1) | **Hand-authored Bézier sandbox.** After path α lands, this serves only the `none` preset. Layout, render, drag, mouse-follow, `setText`, `setPreset`, `toSVG`, `toState`, `toInteractiveBundle`. |
| 2463–2980 | `class DeformableOutlineWordmark` | **Outline-deform pipeline.** Loads WOFF, builds deformed path data per axis change, exposes right-side axis handle, supports mouse-follow mapped to primary axis. |
| 2983–3200 | `class OutlineWordmark` | **Static comparison only.** Filled WOFF paths, no handles. |
| 3210–3237 | `createWordmark()` router + final exports | Dispatches to the right class based on `options.mode` / `presetKey`. Registers glyphs. Returns the public surface. |

## How the demo wires it together

`adjustable-web-type.html` is a single page with inline `<script>`. Key responsibilities:

1. Loads `lib/sculpt.js` and `opentype.js` (CDN, for outline parsing).
2. Custom combobox (preset picker) — hidden `<select>` for accessibility + a styled `<button>`/`<ul>` for the visible UI. Each option renders in its preset's `fontRef` web font.
3. `mount()` — given current text + preset + mode toggles, instantiates the right Wordmark class and replaces `#stage` SVG. Always tears down mouse-follow on the previous instance to avoid orphaned `window` listeners.
4. Toggle controls — "Reference outlines" (static compare), "Mouse follow", "Monoline curvature" (parametric only).
5. Reset, hex color input, Export code (downloads `toInteractiveBundle()` HTML).

## When you change something, where the change lives

| Goal | File / region |
|---|---|
| Tune a preset's mood | `lib/sculpt.js:1612-1845` — edit `defaults` / `glyphParams` / `axes` |
| Add a per-letter handle | The relevant glyph module in `lib/sculpt.js:285-1090` — add to `handles()`, `defaultParams`, `paramRanges` |
| Add a new preset axis (outline-deform) | `applyPresetAxesToCommands` (`lib/sculpt.js:1581`) + the preset's `axes:` block |
| Change which pipeline a preset uses | The preset object + the routing logic in `createWordmark()` (`lib/sculpt.js` near the bottom). See ADR 0001. |
| Wire a new demo control | `adjustable-web-type.html` inline script + `mount()` |
| Add a new glyph | Register in `lib/sculpt.js` near the curated section; export `bounds()` (required since Sprint 2 fix #1) |
