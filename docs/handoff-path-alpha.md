# Handoff — Path α (per-letter anatomy handles on the WOFF outline)

**Status:** Prototype complete and directionally validated. Ready to feed back into the grill-with-docs session for integration planning.
**Date:** 2026-05-27.
**Predecessor:** [`handoff-pipeline-prototype.md`](handoff-pipeline-prototype.md) — the doc that drove the prototype.
**Prototype:** [`adjustable-web-type.prototype.html`](../adjustable-web-type.prototype.html) — `npm run dev`, open `http://127.0.0.1:5173/adjustable-web-type.prototype.html`.

---

## The feature, in one sentence

Picking a font preset should mount the **real WOFF outline** as the starting shape, with **per-letter drag handles** anchored on each glyph that the user can grab to deform individual letters in place — *except* for Rubik Bubbles, which keeps the existing single-axis outline-deform pipeline.

---

## Routing decisions (locked 2026-05-27)

| Preset | Pipeline | Why |
|---|---|---|
| `bubbly` | outline-deform with `bubbliness` axis (existing) | Shape-novelty mood — single global axis is the right gesture; per-letter handles aren't what the user reaches for. |
| `instrumentSerif` | **Path α** — WOFF + per-letter handles | Anatomy-driven; the user needs to grab individual letters. |
| `bitter` | **Path α** | Same. Slab terminals need per-letter serif handles. |
| `sourceSans` | **Path α** | Same. Neutral sans where per-letter precision (bowl width on `o` vs arch width on `n`) matters more than a single global width axis. |
| `ibmPlexMono` | **Path α** | Same. Mono cell stays as a default constraint; the user can opt out per letter. |

**Rule for future presets:** shape-novelty presets → outline-deform with a single mood axis; everything in the readable-text-face family → Path α.

**Path γ (extended outline-deform with multi-axis global sliders) is rejected** as the production target. The prototype confirmed γ feels coarse: dragging a global x-height slider moves every letter together, and the user wanted to grab specific letters. γ may still survive in `lib/sculpt.js` as the engine underneath α (since per-letter handles ultimately call into the same outline deformations), but it's not the user-facing gesture.

---

## Path α handle vocabulary (per preset, per letter)

Every non-bubbly preset exposes the same conceptual handle set, with the differences below. The handle is anchored at a position on the glyph's bounding box; dragging it applies a per-letter transform to that glyph only.

| Preset | Handles per letter | Skip |
|---|---|---|
| `instrumentSerif` | height, width, serifLength, weight | `serifLength` skipped on round-bottom letters: o, c, e, s, g, O, C, S, Q, G |
| `bitter` | height, width, serifLength, weight | Same skip set. Also flip stroke-linejoin to miter at build time to honor slab terminals. |
| `sourceSans` | height, width, weight | — |
| `ibmPlexMono` | height, width, weight | Mono cell is the default starting position; dragging width breaks the cell visually (see *Open questions* below). |

**The height handle adapts its label per letter:**
- `cap-height` for uppercase A–Z
- `ascender` for lowercase ascenders: b, d, f, h, k, l, t
- `x-height` for everything else (lowercase short letters and descenders)

**Handle anchor positions** (on each glyph's rendered bounding box):
- `height` — top-center, 18px above the glyph
- `width` — right-middle, 18px to the right
- `weight` — left-middle, 18px to the left
- `serifLength` — bottom-right, 12–14px below-right of the glyph

Each handle has a `<title>` element so hovering reveals which axis on which letter (e.g. "x-height on 'a'").

---

## How the prototype implements it (and what changes for production)

The prototype mounts `SculptLettering.DeformableOutlineWordmark` (so the WOFF outline is the starting shape), then attaches an SVG overlay layer with per-glyph circles wired to drag events. Each drag updates the per-glyph SVG `transform` or stroke attributes — *the underlying path data is never modified*.

| Handle | Prototype implementation | Production target |
|---|---|---|
| `height` | `scale(1, sy)` on a wrapper `<g>`, pivoted at local y=0 (baseline). Scales the entire glyph including any ascender/cap-height portion. | Region-clipped scale: scale only the portion of the outline between baseline and x-height (or baseline and cap-height for uppercase). Ascender and cap-height should stay fixed when x-height is dragged. Requires path-level region splitting. |
| `width` | `scale(sx, 1)`, pivoted at local x = bbox.x (glyph's left edge). Scales bowls *and* stems uniformly. | Anatomy-aware partitioning: scale only the bowl/counter regions, preserve stem thickness. Requires identifying stem vs. bowl on the outline. |
| `serifLength` | Same `scaleX-left` transform as `width`, just anchored at the bottom-right of the bbox. Visually stretches the glyph rather than just the serifs. | Translate only the serif endpoint anchors along the baseline. Requires identifying serif anchor points on each glyph's outline. |
| `weight` | SVG `stroke="<color>" stroke-width="<v>" paint-order="stroke fill"` applied to the glyph's `<path>`. Widens the silhouette by adding a stroke under the fill. | True outline dilation (offset path / Minkowski sum) that honors stem-contrast in the source font. Requires real path offset math. |

The prototype's transforms are "directionally correct" — the gesture model and the per-letter routing are validated. The math underneath each handle is the production work.

---

## Integration plan — what needs to change in `lib/sculpt.js`

The prototype does *not* modify `lib/sculpt.js`. To ship Path α for real:

1. **New engine class** (or extension of `DeformableOutlineWordmark`) that combines:
   - WOFF outline loading (existing in `DeformableOutlineWordmark._loadGlyphs`)
   - Per-glyph `baseCommands` (existing — these are the bezier command streams the lib already extracts from the WOFF)
   - Per-letter handle layer rendering (analogous to `Wordmark`'s `handleLayer`, but with handles bound to per-glyph anchor positions on the real outline)
   - Per-letter deformation functions for each handle (path-level math per the production table above)

2. **Preset schema addition.** Add a `pipeline` field to each preset:
   ```js
   {
     name: 'instrumentSerif',
     fontRef: '...',
     fontUrl: '...',
     license: '...',
     pipeline: 'alpha',   // NEW — 'outline-deform' | 'alpha'
     defaults: { ... },
     glyphParams: { ... },
     axes: [ ... ],       // Only used when pipeline === 'outline-deform'
   }
   ```
   Bubbly stays `pipeline: 'outline-deform'`; the other four become `pipeline: 'alpha'`. This is the "respect the preset's declared pipeline" decision from the original handoff.

3. **Handle vocabulary as preset config.** The `ALPHA_HANDLES_BY_PRESET` table in the prototype should move into each preset's definition in `lib/sculpt.js` — e.g. `alphaHandles: ['height', 'width', 'serifLength', 'weight']` per preset. The skip rules for round-bottom letters can be a shared lib-level rule.

4. **Per-glyph anchor map.** The prototype computes anchor positions from each glyph's bounding box at render time. Production should do the same as a default, but allow per-glyph overrides for cases where the bbox isn't anatomically meaningful (e.g. `f`'s top should be the top of the hook, not the top of the bbox if the bbox extends above the hook for the bar).

5. **Decide what `Wordmark` (hand-authored Bezier registry) becomes.** Options:
   - Delete it (and the glyph modules). Production has no need for hand-authored Beziers if every preset routes through Path α.
   - Keep it as the engine for a `none`/"no reference font" preset, for users who want a parametric playground without a WOFF.
   - Keep it as a fallback when a WOFF outline fails to load.

   Recommend: **keep as fallback only**, drive it from a single internal preset called `none`. Remove the public `glyphParams` overlay machinery from named presets since they no longer need it.

6. **Deprecate Path γ axes from named presets.** The `axes: [{ id: 'serifLength', ... }, ...]` arrays on `instrumentSerif`/`bitter`/`sourceSans`/`ibmPlexMono` are dead once those presets route through α. Keep `axes` on `bubbly` only (for `bubbliness`).

---

## Open questions — resolved in the grill-with-docs session (2026-05-27)

1. **Mono width tension.** ✅ **Wordmark-level "mono" toggle, shown only on `ibmPlexMono`.** Default on (cell constraint enforced; width handle still works under it, visually). Toggling off relaxes the cell globally so the user opts out explicitly. Other presets never see this toggle.

2. **Descender depth.** ✅ **Yes — add a `descenderDepth` handle on the five descender letters** (`g`, `j`, `p`, `q`, `y`). Anchored bottom-center, scales only the below-baseline portion. Same affine-transform primitive as the other handles. Surfaces *descender* as a teaching concept.

3. **Per-glyph anchor authoring.** ✅ **Bbox-derived by default + per-glyph hand-authored overrides** for problem letters (`f`, `t`, capitals with overhangs, etc.). Keep the override list short. **No programmatic outline sampling** — too brittle for a toy.

4. **Color of weight.** ✅ **Stays tied to fill** (same as `wm.color`). The silhouette grows uniformly. Can untie later if a use case appears.

5. **Reset granularity.** ✅ **Wordmark-level only.** One button, snaps every letter back to defaults. Per-letter and per-handle reset deferred — the toy's audience doesn't need three reset scopes.

6. **State serialization.** ✅ **`toState()` adds a `pipeline: 'anatomy-deform'` discriminator + per-letter handle values** (`glyphs: [{character, handles: {height, width, serifLength, weight, descenderDepth}}]`). `fromState()` reads the discriminator before instantiating. Legacy bundles without a pipeline field default to the parametric `Wordmark` (the only engine that previously produced state).

---

## What the grilling session confirmed (2026-05-27)

- **`pipeline:` field value for path α:** `'anatomy-deform'` (mirrors `'outline-deform'`; avoids the codename `alpha` and the loaded term `parametric`).
- **Engine class name:** **`AnatomyDeformWordmark`** — new sibling class in `lib/sculpt.js`, alongside `DeformableOutlineWordmark`. Shares WOFF-loading helpers. Not a subclass; not a mode flag on `DeformableOutlineWordmark`.
- **Production scope:** **Direct to α.** No path γ stepping stone. γ is rejected as the user-facing gesture; nothing to gain by building it first.
- **Math depth on first landing:** **Ship the prototype math** (per-glyph affine transforms + SVG stroke for `weight`). Refine each handle's math progressively as separate follow-ups, in order: `weight` → `height` → `serifLength` → `width`.

---

## Files touched by the prototype session

- `adjustable-web-type.prototype.html` — the throwaway prototype page. Source of truth for the gesture model; delete or absorb after production lands α.
- `docs/handoff-pipeline-prototype.md` — the input to the session (routing decisions, two-paths framing). Now superseded for the architectural question by this document.
- `docs/handoff-path-alpha.md` — this document. The output to feed back to the grill-with-docs session.

`lib/sculpt.js` was **not modified** during this prototype session. All Path α logic lives in the prototype HTML.
