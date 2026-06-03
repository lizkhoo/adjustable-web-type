# Context — Adjustable Web Type

Glossary of the canonical terms used in this project. Implementation details live in `docs/` and the code; this file is only for shared language.

## Domain terms

### Preset

One of five named starting points the user can pick from the demo picker. Internal keys: `bubbly`, `instrumentSerif`, `sourceSans`, `bitter`, `ibmPlexMono`. A preset references a real open-source font (`fontRef`, `fontUrl`) and declares the **pipeline** it uses plus its tuning data.

> A preset is **not** the rendered output, and **not** a font. It is the bundle of "which engine, which mood, which axis."

### Pipeline

The rendering engine a preset routes to, declared via `preset.pipeline`. Two production pipelines:

- **`outline-deform`** — loads the real WOFF via opentype.js and deforms the outline with one global **preset axis** slider. No per-letter handles. Used by `bubbly`.
- **`anatomy-deform`** — loads the real WOFF AND exposes per-letter **anatomy handles** anchored on each glyph's bounding box. Dragging a handle bakes a per-glyph deformation into the outline commands (real polyline offset for `weight`, region-clipped vertical scale for `height`, serif-foot translation for `serifLength`, anatomy-aware counter widening for `width`). Used by the four readable-text-face presets. Shipped as the `AnatomyDeformWordmark` class (`lib/sculpt.js`).

A third engine, `SandboxWordmark` (the hand-authored Bézier glyphs + monoline factory; renamed from `Wordmark` to reflect its narrowed role), survives only as the fallback for the `none` preset ("no reference font"). It is _not_ used by any named-font preset. A `Wordmark` alias is retained in the public exports for backward compatibility with previously-generated `toInteractiveBundle()` HTML files.

### Preset axis

A single deformation control attached to a preset in **outline-deform** mode. Exposed in the UI as a global slider plus a right-side drag handle. Operates on the whole wordmark, not per-letter. Today only `bubbly` uses this (axis: `bubbliness`, number of sine-wave bumps per outline contour).

### Anatomy handle

A per-letter drag handle exposed in **anatomy-deform** mode. Each handle is anchored on a glyph's bounding box and bound to a single anatomy concept on that single glyph. The four concepts:

- **`height`** — vertical scale of the glyph pivoted at baseline. Label adapts per letter category: _cap-height_ for A–Z, _ascender_ for b/d/f/h/k/l/t, _x-height_ otherwise.
- **`width`** — horizontal scale pivoted at the glyph's left edge.
- **`serifLength`** — horizontal scale anchored at the bottom-right, used to extend baseline serifs. Skipped on round-bottom letters (o, c, e, s, g, O, C, S, Q, G) and on sans/mono presets that don't have serifs.
- **`weight`** — silhouette dilation via SVG stroke overlay (prototype) or true outline offset (production target).

Anatomy handles are the vocabulary by which non-type-designers discover letterform parts (see `docs/PRODUCT_INTENT.md`).

> The two pipelines deliberately use different handle vocabularies: outline-deform shows preset axes only, anatomy-deform shows per-letter anatomy handles only. There is no global "preset axis" slider on an anatomy-deform preset; per-letter dragging is the gesture.

### Mood tuning

A preset's `defaults` and `glyphParams` blocks (lib/sculpt.js around the preset definitions). `defaults` applies to every auto-generated/monoline glyph; `glyphParams` overrides per character. Once path α lands, mood tuning matters only for the `none` preset's `SandboxWordmark` output — named-font presets don't render hand-authored Béziers anymore.

### Handle behavior — click vs mouse-follow

The user-facing toggle for **how** the handles respond to input. Two modes:

- **Click-drag** (default) — the user grabs a specific handle on a specific glyph with `pointerdown` and drags. Per-letter precision.
- **Mouse-follow** — the wordmark continuously responds to cursor position without a click. On **outline-deform** (`bubbly`), cursor X maps to the primary preset axis (`bubbliness`). On **anatomy-deform** (the four readable-text presets), cursor X maps globally to every glyph's `weight` and cursor Y maps globally to every glyph's `height`. Per-glyph `width` / `serifLength` / `descenderDepth` remain click-drag only.

Mouse-follow is a "sweep" gesture for tactile play; click-drag is per-letter precision. The two modes are mutually exclusive — toggling mouse-follow on freezes any pointer-capture from click-drag.

### Reference outline

The real WOFF outline of a preset's font, loaded via opentype.js. Available in three modes:

- **deformed** in outline-deform pipeline (default for outline presets)
- **static** via the "Reference outlines" toggle (filled paths, no handles, for side-by-side comparison)
- **deformed in place** in the anatomy-deform pipeline — the WOFF outline is the starting shape and per-letter handles bake transforms into it.

### Starting point

UI-facing label for **preset** in the demo picker. The picker trigger reads "Reference face" but the option labels use each preset's `fontRef` (e.g. "Rubik Bubbles"). "Starting point" is the user-spoken term; "preset" is the code term.

## Pipeline-by-preset

Ratified 2026-05-27 with the path α prototype. The classification rule: **shape-novelty presets → `outline-deform`; everything in the readable-text-face family → `anatomy-deform`**. See [adr/0001](docs/adr/0001-per-preset-pipeline-routing.md) and [handoff-path-alpha.md](docs/handoff-path-alpha.md).

| Preset key        | `fontRef`        | `pipeline`       |
| ----------------- | ---------------- | ---------------- |
| `bubbly`          | Rubik Bubbles    | `outline-deform` |
| `instrumentSerif` | Instrument Serif | `anatomy-deform` |
| `bitter`          | Bitter           | `anatomy-deform` |
| `sourceSans`      | Source Sans 3    | `anatomy-deform` |
| `ibmPlexMono`     | IBM Plex Mono    | `anatomy-deform` |
