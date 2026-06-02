# Sprint 1 + 2 patch — sculpt-lettering

This fork closes the principle violations and visual-schism issues from the design review of `lizkhoo/sculpt-lettering@653c220`. All changes live in `lib/sculpt.js` (a drop-in single-file build that mirrors `packages/core` at runtime).

> **Product intent:** An exploration toy for non–type-designers — play with letterforms and learn anatomy through handles, not a path to shipping production fonts. See `docs/PRODUCT_INTENT.md`.

To port back to the original repo: each fix below cites the corresponding file in `packages/core/src/`. They are line-for-line transcribable as TS patches.

---

## Sprint 1 — close the principle violations

### 1.1 Tooltip restyled (kept as a library feature)

**Why:** Per direction, the tooltip stays — it provides essential discoverability for first-touch users on third-party embeds. The original heavy dark-pill style fought with the Bezier-control-point vocabulary.

**What changed:**

- Replace the dark `rgba(20,20,20,0.92)` filled pill + white sans label with a thin **cream-fill + accent-border** chip.
- Two text spans: param-name (muted serif-style) and value (accent monospace), inline with a small gap.
- Anchor to the _visible_ point — the control if it's a tangent, the anchor otherwise — instead of always to the displayX.
- Same edge-flip avoidance as the original.

**Files in original repo to patch:**

- `packages/core/src/Wordmark.ts` → `renderTooltip()` (lines ~190–215)

---

### 1.2 `toInteractiveBundle()` returns a self-contained doc

**Why:** PRD §4.6 promises a working interactive embed with zero runtime dependencies. The original returned JS that did `import('https://unpkg.com/@sculpt-lettering/core@0/dist/sculpt-lettering.js')` — a 404. The whole product story was broken on copy-paste.

**What changed:**

- Method is now `async`.
- Returns a complete HTML document string instead of `{html, css, js}` fragments.
- Library source is fetched from `document.currentScript.src` (captured at module-load time) and inlined alongside a serialized state snapshot from `toState()`.
- If the library was loaded inline (not via `<script src>`), consumers can set `Wordmark.LIBRARY_SOURCE` directly before calling.

**Build-time alternative:** A Vite plugin can read `dist/sculpt-lettering.umd.cjs` and emit it as a string constant baked into the module. The runtime path is the demo-friendly version; the build-time path is what a published npm release would ship.

**Files in original repo to patch:**

- `packages/core/src/Wordmark.ts` → `toInteractiveBundle()` (last method)

---

### 1.3 `a`'s `bowlTopTension` symmetry

**Why:** Dragging the tension tangent stretched one side of the top curve only — `tTopOut` scaled with the parameter on the _outgoing_ tangent from A0, but the incoming tangent at A1 used a hard-coded constant `K = 0.5523 * bowlHeight`.

**What changed:**

- Both top-quadrant tangents now scale with `bowlTopTension` (`tTop = bowlWidth * bowlTopTension`, `tH = bowlHeight * bowlTopTension`).
- The two bottom quadrants continue to use the canonical Kappa constant for now — they can be exposed as their own params later if needed.

**Files in original repo to patch:**

- `packages/core/src/glyphs/a.ts` → `construct()` (the bowl path)

---

### 1.4 Layout cache during drag

**Why:** Every `pointermove` was calling `this.layout()` three times (once at the top of `onDragMove`, once inside `refreshTooltip`, once again to compute baselineY) and then `render()` was wiping `innerHTML` on the glyph layer plus the handle layer. On longer wordmarks this caused noticeable lag.

**What changed:**

- `_layoutCache` is set on `pointerdown` and reused throughout the drag.
- The drag state carries `glyphX` and `baselineY` directly so `onDragMove` doesn't need to recompute placement.
- `render()` still wipes innerHTML — a future patch can mutate `path[d]` in place for the active glyph only. This was the cheapest move with the biggest win.

**Files in original repo to patch:**

- `packages/core/src/Wordmark.ts` → `onDragStart`, `onDragMove`, `_layoutCache` field

---

## Sprint 2 — close the alphabet schism

### 2.1 `bounds(params)` on every glyph module

**Why:** `Wordmark.glyphAscent()` was a heuristic that pattern-matched on parameter names (`p.totalHeight ?? p.ascenderRise ? ...`). It misses descenders entirely and has a precedence bug masked by the `||` chain. It also forced the renderer to hard-code `dotExtra = 50` just to leave room for `i`'s dot.

**What changed:**

- New required field on `GlyphModule`: `bounds(params): { minX, maxX, minY, maxY }`.
- Every glyph in the curated set (a, n, h, o, s, i, e, t, r, l, w, d, space) gets an explicit bounds() implementation.
- The monoline factory computes bounds from its normalized vertices including descender extents (g, j, p, q, y have `v > 1`).
- `Wordmark._layout()` returns `maxAscent` (=max `-minY`) and `maxDescent` (=max `maxY`). The viewBox height is `padding + maxAscent + max(maxDescent, 8) + padding` — descenders sit correctly below the baseline; `i`'s dot fits without a special case.
- `glyphAscent()` is gone.

**Files in original repo to patch:**

- `packages/core/src/types.ts` → add `bounds` to `GlyphModule`
- All `packages/core/src/glyphs/*.ts` → add a `bounds` function and export
- `packages/core/src/Wordmark.ts` → replace `glyphAscent()` and the `dotExtra = 50` constant

---

### 2.2 Monoline glyphs gain a `curvature` tangent

**Why:** The biggest visual problem flagged in review: type "banana" and the `a`s render as plump Bezier loops while the `b` and `n` from the M9 expanded set render as straight wireframe sticks. Two products in one wordmark. Both PRD §3.3 ("parametric handles, not vector handles") and the M1.v2 principle #4 ("geometric truth, not visual approximation") were violated for 40 of 52 letters.

**What changed:**

- `createMonolineGlyph()` now treats each stroke's normalized polyline as control points for a **Catmull-Rom spline** with adjustable tension.
- New parameter: `curvature` (range 0–1.4, default 0). At 0 the path degenerates to a straight polyline — the v1 visual is preserved. At higher values the spline rounds the polyline into smooth curves.
- New handle: a perpendicular tangent at the midpoint of the first segment of the first stroke. Its arm length scales linearly with `curvature`, and `deltaFromDrag` projects pointer movement onto the perpendicular direction — so dragging away from the segment increases curvature 1:1.
- Marked `isTangent: true` so it picks up the existing pink tangent-handle styling.

**Trade-off acknowledged:** A `curvature`-driven monoline `b` will never read as well as a hand-authored `b` with a real bowl-and-stem parametric model. This is a stopgap that unifies the vocabulary while you author the remaining letters one at a time. The next step is to define a "small monoline glyph that's been promoted to curated" pattern so the migration is gradual.

**Files in original repo to patch:**

- `packages/core/src/glyphs/expandedAlphabet.ts` → replace `toPath`, `construct`, `handles`, `defaultParams`, `paramRanges`

---

### 2.3 `Preset.defaults` block

**Why:** Bubbly only overrode 13 glyphs by name. Type any word containing the auto-generated 40 and they fell back to their authoring defaults (`strokeWeight: 24`) while the curated set was at 28. A visible inconsistency baked into the preset shape itself.

**What changed:**

- New optional field on `Preset`: `defaults` — an object of params applied to any glyph not listed in `glyphParams`.
- `resolvePresetParams()` filters defaults against each target glyph's `defaultParams` keys, so only parameters that glyph actually has get applied.
- Bubbly now sets `strokeWeight: 28`, `xHeight: 140`, `capHeight: 168`, and `curvature: 0.7` as defaults — the whole alphabet picks up the bubbly mood without needing per-glyph entries.

**Files in original repo to patch:**

- `packages/core/src/types.ts` → add `defaults?: Partial<ParamValues>` to `Preset`
- `packages/core/src/Wordmark.ts` → constructor and `setText` resolve via `resolvePresetParams`
- `packages/core/src/presets/bubbly.ts` → add the `defaults` block

---

### 2.4 Incremental `setText()`

**Why:** Original `setText()` threw `Error('construct a new Wordmark')`. The React UI worked around this by recreating the whole Wordmark on every keystroke — meaning typing into the text field threw away every tuned glyph in the wordmark. Users learned to dread the text field.

**What changed:**

- Position-matched diff: for each character index, if `newText[i] === oldText[i]`, the existing `Glyph` instance (with all its tuned params) is reused. Otherwise a fresh `Glyph` is instantiated using the preset.
- Type `hello world`, drag the second `l` into a flourish, then add `!` — the flourish survives.
- Not yet true LCS (which would preserve glyphs across mid-string insertions). Position-match is the 80% solution; LCS is the next refinement.

**Files in original repo to patch:**

- `packages/core/src/Wordmark.ts` → `setText` (was a throw)

---

### 2.5 Public state snapshot: `toState()`

**Why:** The interactive embed already needed to serialize wordmark state; the same code was buried in `toInteractiveBundle`. Promoting it to a public method gives users a real data shape for save/restore without committing to a full `fromJSON` API yet.

**What changed:**

- New `Wordmark.toState()` returns `{ text, tracking, color, padding, glyphs: [{character, params}] }`.
- `toInteractiveBundle()` uses this internally.
- Pairs naturally with a future `Wordmark.fromState(state)` constructor / static method.

**Files in original repo to patch:**

- `packages/core/src/Wordmark.ts` → add `toState()` method

---

## Type-design recommendations batch (2026-05-26)

Implemented from type-design-expert critique (user-approved):

| Priority | Item                                                                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | `a` `bowlBottomTension`; `e` `bowlSideTension`; `clampAperture()` on `a`/`e`; mouse-follow default `tangentOnly: true`                                                                   |
| P1       | Curated `b`, `c`, `m`, `g`; preset-aware `resetAll`/`resetGlyph`; `leftBearing`/`rightBearing` + `advanceWithBearings()`; IBM Plex partial mono via `monoCell` + `monoAdjustedAdvance()` |
| P2       | `strokeJoin: 'miter'` on `sourceSans` / `bitter`; `capOvershoot` on `h`/`l`/`t`; regression snapshots documented in `docs/snapshot-regression.md` (manual export)                        |
| User     | `serifLength` on `instrumentSerif` / `bitter` presets (defaults + glyph overrides); stubs in `construct()` for `a`, `e`, `b`, `c`, `m`, `g`, `l`                                         |

**Test in demo:** `npm run dev` → `adjustable-web-type.html` → text `Hello jazz` → presets Instrument Serif / Bitter (serif stubs) → IBM Plex Mono (rhythm) → mouse follow (tangent-only) → Reset letters (preset defaults).

---

## Deferred — pick up next

1. **Hand-author the remaining monoline letters** (not b/c/m/g) with the same Bezier+tangent vocabulary the curated 12 use. The `curvature` tangent is a stopgap; a real parametric `b` will always read better. Author one at a time as needed.
2. **True LCS in `setText`** for mid-string insertion stability.
3. **Snapshot tests** of `toSVG()` at default params, one per glyph. Would have caught the CDN-URL regression; will catch future drift.
4. **In-place DOM mutation during drag** — mutate `path[d]` and `circle[cx/cy]` on the active glyph instead of `innerHTML` wiping the whole layer.
5. **Filled vs stroked aesthetic** — still stroked-uniform for v1. Worth revisiting when authoring a `sharp` preset.

---

## Files in this fork

- `lib/sculpt.js` — single-file improved library (UMD-ish, ~1.1k LOC), drop-in replacement for `@sculpt-lettering/core`.
- `adjustable-web-type.html` — demo page exercising every change: type any word, drag handles, hit **Export code** to download a self-contained interactive HTML bundle.
- `CHANGES.md` — this file.

To run: `npm run dev` and open `http://127.0.0.1:5173/adjustable-web-type.html`, or open the HTML file directly. No package install required beyond dev tooling. The **Export code** button proves Sprint 1.2 by downloading a freshly-generated self-contained HTML document — the embed runs entirely from inlined source, no network.

### Demo export CTA (2026-05-26)

Stage footer **Export code** button (`#export-code`) calls `Wordmark.toInteractiveBundle()` and triggers a file download (`sculpt-{text-slug}.html`). The bundle inlines `lib/sculpt.js` and embeds the current `toState()` snapshot (text, color, tracking, padding, tuned glyph params, mouse-follow mode). Replaces the prior Copy SVG clipboard action.

---

## Path α landing (Briefs 1–10, 2026-05-27 → 2026-06-01)

Picking a font preset now mounts the **real WOFF outline** as the starting shape. The four readable-text faces expose **per-letter anatomy handles**; Rubik Bubbles keeps its single global axis. See [docs/adr/0001-per-preset-pipeline-routing.md](docs/adr/0001-per-preset-pipeline-routing.md) for the decision and [docs/API.md](docs/API.md) for the public surface.

**New engine class.** `AnatomyDeformWordmark` (sibling of `DeformableOutlineWordmark`, shares WOFF-loading helpers) — WOFF outline + per-letter anatomy handles, each baking a deformation into the glyph's outline commands. The legacy hand-authored `Wordmark` was renamed `SandboxWordmark` (a `Wordmark` export alias is kept so previously-generated `toInteractiveBundle()` HTML still deserializes); it now serves only the `none` preset.

**Schema additions.**

- `preset.pipeline`: `"outline-deform"` (bubbly) | `"anatomy-deform"` (the four faces). The `createWordmark()` router dispatches on it (plus `renderMode: "outline-static"` for the static-compare engine).
- `preset.handles`: per-letter handle vocabulary for anatomy-deform presets (`height`, `width`, `serifLength`, `weight`); `descenderDepth` added on descender letters and `counterContour` on countered glyphs (runtime-detected, gated by `preset.counterContour`).
- `toState()` emits a discriminator (`pipeline: "anatomy-deform"` / `renderMode: "outline"`) + per-letter `handles` (or `axisValues`) so the matching static `fromState()` rehydrates.
- `axes` retained on `bubbly` only (dead on the anatomy-deform presets).

**Prototype-grade vs production math.** First landing (Brief 1) ported the prototype's per-glyph affine transforms + SVG stroke as-is. Briefs 3a–3d then replaced each handle with production-grade outline math: `weight` real polyline offset (later switched to a clean stroke overlay for bold/bleed), `height` region-clipped vertical scale, `serifLength` serif-foot translation, `width` anatomy-aware counter widening that preserves stem thickness. Brief 7 added per-letter overrides + the counter-contour handle; Briefs 8–10 were interaction polish and code-review fixes/cleanup.

**Cleanup (Brief 4).** Retired the throwaway prototype page; aligned `README.md`, `PRODUCT_INTENT.md`, `ARCHITECTURE.md`, `CONTEXT.md`, ADR 0001, and the handoff docs with the shipped code; wrote `docs/API.md`.
