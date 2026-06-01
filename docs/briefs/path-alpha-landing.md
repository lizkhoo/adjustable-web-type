# Subagent briefs — landing Path α in `lib/sculpt.js`

Four scoped briefs to take the validated path α prototype (`adjustable-web-type.prototype.html`) and ship it as production code in `lib/sculpt.js` + `adjustable-web-type.html`. Briefs have dependencies in order; spawn 1 first, then 2, then 3 (which can be split further), then 4.

Each brief is self-contained for a fresh agent landing cold. Copy a brief verbatim into the subagent prompt.

**Shared prerequisites** (every brief assumes these have been read):

- `docs/handoff-path-alpha.md` — the spec, including the resolved-questions table.
- `docs/adr/0001-per-preset-pipeline-routing.md` — the decision and implementation notes.
- `CONTEXT.md` — glossary (`preset`, `pipeline`, `outline-deform`, `anatomy-deform`, anatomy handle, mood tuning).
- `docs/ARCHITECTURE.md` — file map of `lib/sculpt.js`.
- `docs/PRODUCT_INTENT.md` — toy framing; what is and isn't in scope.

Shared rules:

- `lib/sculpt.js` is one file. Keep it that way.
- Don't refactor adjacent code while implementing a brief. Bug fix doesn't get a cleanup ride-along.
- No new dependencies. The library already depends on opentype.js for outline loading; that's the limit.
- The path α engine ships with **prototype-grade math** (per-glyph affine + SVG stroke). Production-grade math is Brief 3.

---

## Brief 1 — Land `AnatomyDeformWordmark` end-to-end

**Goal:** picking any of `instrumentSerif`, `bitter`, `sourceSans`, `ibmPlexMono` in `adjustable-web-type.html` mounts a new `AnatomyDeformWordmark` engine that loads the WOFF and exposes per-letter handles on every glyph. `bubbly` continues to route to `DeformableOutlineWordmark` with the bubbliness axis. The four anatomy-deform presets no longer go through `DeformableOutlineWordmark`. Prototype-grade transforms are fine (don't build production math).

**Scope (do):**

1. **Add class `AnatomyDeformWordmark`** to `lib/sculpt.js`, as a sibling of `DeformableOutlineWordmark` (lib/sculpt.js:2463). Not a subclass; not a mode flag. Share WOFF-loading helpers (`extractOutlineGlyph`, font caching, `setOpentypeParser`) — duplicate utility code is fine if extraction is awkward.
2. **Port the prototype's path α logic** from `adjustable-web-type.prototype.html`:
   - The `attachPathAlphaHandles(wm)` function and its support code (search for it in the prototype).
   - `PATH_ALPHA_ANCHORS` table — but move into the class, keyed by character (lowercase + uppercase + descenders).
   - Per-glyph `<g class="alpha-wrap">` wrapping, anchor-derived handle positions, per-glyph affine state (`{ height, width, serifLength, weight, descenderDepth }`).
   - Two transform primitives: `scaleY-base` (pivoted at baseline) and `scaleX-left` (pivoted at glyph's left edge). Weight is an SVG stroke overlay (`paint-order: stroke fill`).
3. **Add `pipeline:` field to every preset** at `lib/sculpt.js:1612-1845`:
   - `bubbly` → `'outline-deform'`
   - `instrumentSerif`, `bitter`, `sourceSans`, `ibmPlexMono` → `'anatomy-deform'`
4. **Add `handles:` array to each anatomy-deform preset.** Values per `docs/handoff-path-alpha.md`:
   - `instrumentSerif`, `bitter`: `['height', 'width', 'serifLength', 'weight']`
   - `sourceSans`, `ibmPlexMono`: `['height', 'width', 'weight']`
5. **Define the round-bottom-skip set** at lib level (constant, not per-preset): `['o', 'c', 'e', 's', 'g', 'O', 'C', 'S', 'Q', 'G']`. `serifLength` is suppressed on these letters even when the preset declares it.
6. **Height-handle label rule** at lib level: `cap-height` for A–Z; `ascender` for `b/d/f/h/k/l/t`; `x-height` for everything else. Surfaced via the handle's `<title>` element.
7. **Update `createWordmark()` router** (near `lib/sculpt.js:3210`) to dispatch on `preset.pipeline`. `outline-deform` → `DeformableOutlineWordmark`; `anatomy-deform` → `AnatomyDeformWordmark`. Preserve the existing `mode === 'outline-static'` short-circuit for the "Reference outlines" toggle.
8. **Public exports:** add `AnatomyDeformWordmark` to the return object at the bottom of `lib/sculpt.js`.
9. **Wire `adjustable-web-type.html` `mount()`** to call `createWordmark()` and trust routing. Drop any preset-key branching in the demo.
10. **Remove the dead `axes:` arrays** from `instrumentSerif`, `bitter`, `sourceSans`, `ibmPlexMono`. Keep `axes:` on `bubbly` only (it still drives the bubbliness slider).
11. **State serialization:** `toState()` on `AnatomyDeformWordmark` emits `{ pipeline: 'anatomy-deform', text, color, padding, glyphs: [{character, handles: {...}}] }`. `fromState()` reads `state.pipeline` before instantiating; legacy bundles without the field default to parametric `Wordmark`. `toInteractiveBundle()` should produce a bundle that boots back into the same engine.
12. **Mouse-follow mapping:** `enableMouseFollow()` on `AnatomyDeformWordmark` maps **cursor X → `weight`** and **cursor Y → `height`**, applied **globally** to every glyph simultaneously (every `weight` and every `height` move together as the cursor sweeps; per-letter dragging is unaffected). Same mapping for all four anatomy-deform presets. Normalize cursor position against the wordmark's bounding rect; clamp to each handle's range. Bubbly is unchanged: X → `bubbliness`, Y unused.
13. **Rename `Wordmark` → `SandboxWordmark`.** The old name is misleading now that the four named-font presets route to `AnatomyDeformWordmark`; the legacy class only serves the `none` preset (hand-authored Bézier sandbox). Touch every occurrence in `lib/sculpt.js` and `adjustable-web-type.html`. Add a backward-compat alias `Wordmark: SandboxWordmark` in the lib's public exports so existing `toInteractiveBundle()` HTML files keep booting. `createWordmark()` routes the `none` preset (or any preset where `preset.pipeline` is missing) to `SandboxWordmark`.

**Scope (do not):**

- Don't add `descenderDepth`, the mono toggle, or per-glyph anchor overrides. Those are Brief 2.
- Don't refactor `DeformableOutlineWordmark`. Just stop routing the four presets to it.
- Don't write a Vite build step. The library stays single-file.
- Don't add automated tests yet.
- Don't try production-grade math (real outline dilation, region-clipped scale, etc.). That's Brief 3.

**Definition of done:**

- `npm run dev` → `http://127.0.0.1:5173/adjustable-web-type.html` → pick `Rubik Bubbles` → bubbliness slider works (no regression).
- Pick `Instrument Serif` → WOFF outline renders; four handles appear on every glyph in the wordmark (height, width, serifLength, weight) except round-bottoms have no serifLength; dragging any handle deforms only that glyph.
- Same for `Bitter`, `Source Sans 3`, `IBM Plex Mono`.
- Pick `Parametric letters (no reference font)` → existing parametric `Wordmark` still mounts (regression).
- "Reference outlines" toggle still works as a static-compare swap.
- "Mouse follow" toggle on an anatomy-deform preset → moving the cursor sweeps every glyph's `weight` (X) and `height` (Y) simultaneously; releasing the toggle freezes the values where the cursor last was. On bubbly, mouse-follow X still maps to `bubbliness` (unchanged).
- `wm.toState()` → `JSON.stringify` → `fromState()` round-trips for each preset; per-letter handle values survive.
- `Export code` button downloads a self-contained HTML; reopening that HTML renders the same wordmark with the same per-letter handle values.
- No console errors; no orphaned `pointermove` listeners after preset changes.

**Verification:** walk through `docs/snapshot-regression.md` once for each preset.

---

## Brief 2 — Per-preset polish

**Prerequisite:** Brief 1 landed (engine in `lib/sculpt.js`, demo routing via `preset.pipeline`).

**Goal:** add the three preset-specific behaviors deferred from Brief 1 — `descenderDepth` handle on descender letters, mono-cell toggle on `ibmPlexMono`, and a per-glyph anchor override map for problem letters.

**Scope (do):**

1. **`descenderDepth` handle** on the five descender letters: `g`, `j`, `p`, `q`, `y`.
   - Anchor: bottom-center, 22px below the glyph bbox.
   - Transform: vertical scale of the below-baseline portion only. Practical implementation for the prototype-grade math: split the glyph's render into two `<g>` layers (above/below baseline), wrap each, scale only the below-baseline wrap on this handle. Pivot at baseline (local y=0).
   - Appears on every anatomy-deform preset (all four).
   - Label in the handle's `<title>`: `descender on '{character}'`.
2. **Mono toggle for `ibmPlexMono`** — a wordmark-level toggle, default ON.
   - Surfaced only when the active preset is `ibmPlexMono`. Other presets never show the toggle.
   - Off relaxes the `monoCell: 92` constraint; the wordmark re-lays out with each letter's actual advance (use `extractOutlineGlyph().advance` directly, bypass `monoAdjustedAdvance`).
   - Live re-layout — toggle without re-mount.
   - Default placement: secondary toolbar row in `adjustable-web-type.html`, near the existing "Mouse follow" toggle. Use the same `aria-pressed` toggle pattern as other controls.
3. **Per-glyph anchor overrides** for letters whose bbox doesn't match anatomy:
   - Required overrides: `f` (height anchor should be at the top of the hook, not bbox top; width anchor should account for the crossbar), `t` (height anchor at crossbar height, not ascender top), `Q` (skip `descenderDepth` even though it has a tail — already in the round-bottom skip set for `serifLength`, but its anchor for `height` should ignore the tail), `J` (height anchor at top of bowl-of-J, not at the very top), capitals with overhangs.
   - Authored as a `lib/sculpt.js`-level constant: `ANATOMY_ANCHOR_OVERRIDES = { f: { height: {x: '50%', y: 'hookTop'}, ... }, ... }`. Override shape TBD by the implementing agent — keep it minimal and only for the letters that actually need it.
   - The default (no override entry) remains bbox-derived.

**Scope (do not):**

- Don't try to detect anatomy points from the outline. Hand-author overrides only.
- Don't add overrides for letters that look fine with bbox-derived anchors. Override list stays short — fewer than 10 entries across all letters.
- Don't change the handle vocabulary per preset; that's locked.

**Definition of done:**

- Type `Hello jazz` with `Instrument Serif` → `j` has a `descenderDepth` handle below baseline; dragging shortens/lengthens just the descender. Same for `g`, `p`, `q`, `y`.
- `ibmPlexMono` → toolbar shows the "Mono cell" toggle; default on; spacing is uniform. Toggle off → letters re-flow to actual advances; turning back on re-snaps to the cell.
- Switch from `ibmPlexMono` to any other preset → mono toggle disappears from the toolbar.
- Type `effort` with `Instrument Serif` → `f` and `t` handle positions feel right (height handle on `t` anchors at the crossbar, not the top of the ascender).
- All Brief 1 functionality still works.

**Verification:** `docs/snapshot-regression.md` again; spot-check overrides on a wordmark that includes the problem letters.

---

## Brief 3 — Progressive handle math upgrades

**Prerequisite:** Brief 1 (and ideally Brief 2) landed. Each handle math upgrade is an **independent sub-brief**; spawn them one at a time in this order. Don't bundle them.

The order is locked: **`weight` → `height` → `serifLength` → `width`.** Reason: `weight` is the most isolated math primitive; `width` is the wormhole. Don't reorder.

### 3a. `weight` — real outline dilation

**Goal:** replace the SVG stroke overlay with true outline dilation (offset path / Minkowski sum). The silhouette grows as if the stroke contrast had thickened, not as if a stroke had been drawn over the fill.

**Scope:**

- Implement a per-glyph offset-path computation on the WOFF `baseCommands`.
- Approximate is fine — use a polyline-sampled offset (sample the outline densely, displace each sample along its outward normal by `weight * k`, re-emit as polyline). The existing `sampleSubpathDense` helper at `lib/sculpt.js:1415` is a starting point.
- Apply `paint-order` stays at `fill` (no stroke).
- Inner counters shrink as the offset grows — that's correct behavior.
- Keep the fall back to the stroke-overlay implementation if the offset math fails for a specific glyph.

**Definition of done:** dragging `weight` on Instrument Serif `a` thickens the strokes from the inside, not by drawing a halo around the fill. Inner counter (the `a`'s hole) shrinks. No stroke artifact.

### 3b. `height` — region-clipped scale

**Goal:** dragging the `height` handle on a lowercase short letter (e.g. `a`, `o`) scales **only** the portion between baseline and x-height. Cap-height, ascender, and descender stay fixed. For uppercase, scale only the cap-height portion (which is already correct because uppercase has no ascender). For ascenders (`b/d/f/h/k/l/t`), scale only the portion above baseline up to x-height OR the full ascender — TBD by the implementing agent (probably the latter, since the label is `ascender`).

**Scope:**

- Path-level region splitting: divide each glyph's outline into baseline-relative bands (descender / x-height / cap-height / ascender) and apply the vertical scale only to the relevant band.
- Requires knowing where the bands are. Get them from preset-level metrics (`xHeight`, `capHeight`, `ascenderRise`) — those constants already exist in glyph defaults; add them at preset-level if needed.

**Definition of done:** drag x-height on `o` → only the `o` height changes. Drag x-height on `b` → the bowl portion of `b` changes; ascender stays at the same y. Drag cap-height on `H` → both stems and the crossbar move but the baseline stays.

### 3c. `serifLength` — anchor-point translation

**Goal:** dragging `serifLength` on `a` translates only the serif endpoint segments. Today's prototype scales the entire glyph horizontally — wrong.

**Scope:**

- Detect serif endpoint segments on each glyph's WOFF outline. Heuristic: short horizontal segments at baseline elevation (within `±strokeWeight/2` of `y=0`) that extend beyond the main stem bbox.
- Translate just those endpoint vertices along the baseline.
- Skip rule (round-bottom letters) stays in effect.

**Definition of done:** drag `serifLength` on `a` → the baseline serif stub stretches/shrinks; the rest of the `a` stays put. Same for `l`, `b`, `i`. Visually distinct from a horizontal scale of the whole glyph.

### 3d. `width` — anatomy-aware partitioning

**Goal:** dragging `width` on `o` scales the bowl/counter horizontally while preserving stem thickness. Today's prototype scales the whole glyph horizontally, which fattens stems.

**Scope:** this is the wormhole. Two practical approaches:

- **a.** Sample stem regions (vertical-segment-dense bands) vs. bowl regions; apply different scale factors. Complex; brittle on heavily slanted faces.
- **b.** Decompose the outline into "left stem / bowl / right stem" bands per glyph using preset-level anatomy metrics (`bowlWidth`, `strokeWeight`); scale only the bowl band. Cleaner but requires authoring per glyph.

Pick whichever is tractable. If neither feels right after a half-day of exploration, document the limitation and leave the prototype's whole-glyph scale in place. Path α was directionally correct already; this is a quality refinement, not a foundational fix.

**Definition of done:** drag `width` on `o` → bowl stretches but stems don't fatten. Compare against the prototype's scale to confirm visual difference.

---

## Brief 5 — Richer Export Code UX

**Prerequisite:** Brief 1 landed (so `toInteractiveBundle()` produces an `AnatomyDeformWordmark`-compatible bundle for the four anatomy-deform presets).

**Goal:** the **Export code** button is the bridge from "user designed a wordmark on the demo site" to "user has the configured library running on their own site for interaction." Today it silently downloads a self-contained HTML file. Make the experience explicit about the contract: the user is exporting _code they will host themselves_ with the current configuration baked in.

**Scope (do):**

1. **Replace the silent download with a modal/dialog** triggered by the Export code button. The dialog shows:
   - A short headline: _"Export your wordmark"_ and a one-line subheading explaining this is interactive code to host on your own site.
   - The library and configuration summary: text, preset, color, mouse-follow state, per-letter handle values count.
   - Two visible export formats, each with a copy-to-clipboard button AND a download-as-file button:
     - **Standalone HTML** (the existing `toInteractiveBundle()` output). Good for iframe embed or hosting as its own page. Filename: `sculpt-{slug}.html`.
     - **Embed snippet** — a `<div id="…"></div>` + `<script src="…/sculpt.js"></script>` + `<script>SculptLettering.createWordmark(...).mount("#…")</script>` block the user can paste into an existing HTML page. References the library by URL (defaults to the user's own host; let them edit the URL inline). The configuration (`text`, `preset`, `color`, per-letter `glyphs` state) is inlined as a JS object literal.
   - Below the snippets, a short usage note: _"Host `sculpt.js` alongside the page, or point to your own CDN. The library expects opentype.js to be loaded before it for outline-deform / anatomy-deform presets."_ Link to `docs/API.md` (once Brief 4 writes it).
2. **Close-on-escape, focus-trap, click-outside-to-dismiss** — standard modal behavior. Reuse the toggle/button styling already in the demo CSS.
3. **CTA label stays "Export code"** (no change). Title attribute: _"Export code to embed this wordmark on your own site."_
4. **Telemetry stub** (optional, no actual reporting): a comment in the click handler noting where an analytics call would go. Don't add an actual analytics dependency.

**Scope (do not):**

- Don't add a CDN dependency or rewrite the export pipeline. The library URL in the embed snippet is a string the user controls; the library bundle still ships from wherever they put it.
- Don't add framework-specific exports (React, Vue, etc.). Vanilla `<script>` + `mount()` is the contract.
- Don't add server-side rendering, build-time generation, or anything that requires a build step.

**Definition of done:**

- Click **Export code** → modal opens with the configuration summary visible.
- Copy the standalone HTML; paste into a file; open it in a browser → wordmark renders with the same state.
- Copy the embed snippet; paste into a separate HTML page that loads `sculpt.js` from a local path; open it → wordmark renders with the same state.
- Modal dismisses via Escape, click-outside, and an explicit close button. Focus returns to the **Export code** button.
- No console errors; existing download flow still available as one of the two formats.

**Verification:** export a wordmark from each of the five presets; round-trip both export formats; confirm per-letter state survives in both cases.

---

## Brief 4 — Cleanup and doc alignment

**Prerequisite:** Briefs 1 and 2 landed; Brief 3 in progress or done.

**Goal:** retire the prototype artifacts and align the docs with shipped code.

**Scope (do):**

1. **Delete `adjustable-web-type.prototype.html`** and its references in docs.
2. **Mark `docs/handoff-pipeline-prototype.md` as superseded** by `docs/handoff-path-alpha.md`. Either delete it or prepend a `> **Superseded by handoff-path-alpha.md** — kept for history.` line.
3. **Update `docs/handoff-path-alpha.md`** to mark itself superseded (or move into an `archive/` folder) once its content has been absorbed by ADR 0001 and the API doc. The handoff doc was a working artifact; the ADR is canonical.
4. **Write `docs/API.md`** — public surface reference covering:
   - `SculptLettering.createWordmark(text, options)` — router; reads `options.preset` and dispatches by `preset.pipeline`.
   - `SculptLettering.Wordmark` (parametric, `none` preset only).
   - `SculptLettering.DeformableOutlineWordmark` (outline-deform, `bubbly`).
   - `SculptLettering.AnatomyDeformWordmark` (anatomy-deform, the four readable-text faces).
   - `SculptLettering.OutlineWordmark` (static compare).
   - `SculptLettering.presets` — shape (`name`, `fontRef`, `fontUrl`, `license`, `attribution`, `pipeline`, `defaults`, `glyphParams`, `axes?`, `handles?`).
   - Public methods on each Wordmark class: `setText`, `setPreset`, `toSVG`, `toState`, `toInteractiveBundle`, `makeInteractive`, `enableMouseFollow`, `resetAll`, `resetGlyph`, `setAxis` (DeformableOutlineWordmark only).
   - State shape including the `pipeline` discriminator.
5. **Refresh `README.md`** to reflect the final state: this is a JS library; the website is demo + configurator + exporter + in-page developer docs. Link to `docs/API.md`.
6. **Refresh `docs/PRODUCT_INTENT.md`** to remove the now-stale "deformable outline as default for font presets" framing in favor of "per-preset pipeline routing." Cross-link to ADR 0001.
7. **Add an entry to `docs/agent-learnings.md`** dated the day path α lands, summarizing what shipped and what's still deferred (production math upgrades).
8. **Update `CHANGES.md`** with a "Path α landing" section listing the engine class, schema additions, and the prototype-grade-vs-production-math distinction.

**Scope (do not):**

- Don't rewrite the chronological journal entries in `docs/agent-learnings.md`. Append-only.
- Don't delete `docs/snapshot-regression.md`; it stays as a manual checklist.
- Don't delete `OutlineWordmark` or the parametric `Wordmark` engine. Both still serve specific modes.

**Definition of done:**

- Repository contains no references to `adjustable-web-type.prototype.html`.
- `docs/API.md` exists; opening it gives an embedding developer everything they need.
- `README.md` first paragraph reads correctly to a fresh visitor as "this is a library + a demo/configurator/exporter site."
- `docs/PRODUCT_INTENT.md` describes the per-preset routing model accurately.
- New `agent-learnings.md` and `CHANGES.md` entries summarize the path-α landing without re-deriving every decision.

**Verification:** open the repo from a fresh terminal; follow the README's "Where to read next" sequence; confirm the docs lead an incoming agent to a correct mental model of the shipped library without needing to read `lib/sculpt.js`.

---

## Brief 7 — Per-letter handle overrides + counter contour

**Prerequisite:** Brief 3 landed (in particular 3b region-clipped height and 3d anatomy-aware width). Brief 7 builds on the path-region partitioning Brief 3 introduces.

**Goal:** the anatomy-deform vocabulary today is preset-uniform — every letter in a preset gets the same handle set (e.g. Instrument Serif → `[height, width, serifLength, weight]` for every letter). Liz wants **letter-specific additions** on top of the preset baseline, so that pedagogical anatomy parameters reach the letters where they actually live:

- **x-height-only scaling** on lowercase letters whose x-height reads independently (a, e, m, n, o, r, s, u, v, w, x, z). Currently `height` on these is labelled "x-height" but the math scales the whole bbox.
- **serifLength on serif fonts** is already in scope of 3c; this brief should confirm it remains letter-aware after that work lands.
- **Counter contour** on letters with an enclosed counter, for non-mono, non-bubble presets (so Instrument Serif, Bitter, Source Sans). Affected letters: `O`, `b`, `d`, `e`, `o`, `p`, `q`, `g`, `a`, `D`, `P`, `Q`, `R` — anything with an enclosed inner region.

**Scope (do):**

1. **Add a per-letter handle override mechanism** to the preset schema:
   - New optional preset field: `letterHandles: { [character]: [...handleIds] }`. When present for a given character, those handle IDs are _added_ to (or replace? see open question) the preset's default `handles:` array for that character only.
   - `anatomyHandleIdsFor(character, presetHandles, letterHandles)` resolves the final per-letter set.
   - Round-bottom skip (`ANATOMY_NO_BASELINE_SERIF`) still applies on top.

2. **Add `counterContour` as a new handle ID** in `AnatomyDeformWordmark`:
   - Anchor: center of the glyph's inner counter (heuristic: centroid of the largest enclosed subpath).
   - Transform: scales the inner subpath(s) horizontally and vertically about the counter's centroid. Outer contour stays put. Implementation depends on Brief 3's path-region splitting — reuse the same band/region machinery.
   - Tooltip label: `counter on '{character}'`.
   - Range: 0.6 to 1.4 (default 1.0). Tighter than `width` because counter changes are visually strong.
   - Mouse-follow: not mapped (the global X/Y mapping already takes weight/height).

3. **Wire counter contour into the three relevant presets** via the new `letterHandles` field:
   - `instrumentSerif`, `bitter`, `sourceSans`: add `counterContour` to `O, b, d, e, o, p, q, g, a, D, P, Q, R`. Skip on `ibmPlexMono` (mono spacing makes counter manipulation visually noisy) and `bubbly` (bubbliness already overrides the counter aesthetic).

4. **Wire x-height-only scaling** for the appropriate lowercase letters via `letterHandles`. The handle ID stays `height` but the override declares it should clip to the x-height band only. The actual region-clipped math comes from Brief 3b — Brief 7 just declares the letter-level intent.

**Scope (do not):**

- Don't introduce a contrast axis, optical sidebearings, or other production-font features. This stays a pedagogy toy.
- Don't add the override to every letter "just because." Each entry needs a pedagogical reason (the letter has a counter worth showing; the letter's x-height is visually distinct).
- Don't touch `Wordmark` (SandboxWordmark) or `DeformableOutlineWordmark`. Letter-level overrides are an anatomy-deform concept.

**Open design question:** does `letterHandles[character]` _add to_ or _replace_ the preset's default handles for that character?

- **Add to (recommended):** simpler mental model — letters get the preset baseline plus their overrides. A letter never has fewer handles than the preset declares.
- **Replace:** more flexible — could declare "this letter gets ONLY these handles" to e.g. hide `serifLength` from `O` (which already happens via the round-bottom skip set, so this case is covered without override).

**Definition of done:**

- `Hello` with Instrument Serif → `e` and `o` each show a `counter on '{char}'` handle. Dragging shrinks/grows the inner counter; outer stroke stays.
- `Hello jazz` with Bitter → `o`, `a` show counter handles; `H`, `l`, `j`, `z` do not.
- IBM Plex Mono → no counter handles on any letter (preset opt-out).
- `toState()`/`fromState()` round-trips the new handle values per-letter.
- Counter contour values survive in exported bundles.
- `aximul` typed in Source Sans → only letters with counters (`a`) show the handle.

**Verification:** walk `docs/snapshot-regression.md` plus a Brief 7 addendum: type `Bodega` in Instrument Serif; counter handles on B, o, d, e; drag each; verify only that letter's counter changes.

---

## Brief 8 — Interaction polish: bubbly axis feel + anatomy node / tooltip / cursor

**Prerequisite:** Brief 3 and Brief 7 have landed. They are currently **uncommitted in the working tree** (`lib/sculpt.js`) — build on top of that state, do not revert it. Read `lib/sculpt.js` first; line numbers in this brief are approximate (the file shifts), so navigate by the named functions/classes called out below.

**Goal:** close six interaction-quality gaps the demo owner hit while testing. Three are on the **bubbly** preset (`DeformableOutlineWordmark`, `pipeline: "outline-deform"`); three are on the **anatomy-deform** presets (`AnatomyDeformWordmark` — Instrument Serif, Bitter, Source Sans, IBM Plex Mono). This is feel/tuning + one real positioning change; it is **not** a new feature axis. Verify every item live with the Playwright MCP browser against `http://127.0.0.1:5173/adjustable-web-type.html` (start `npm run dev` first; the favicon 404 is the only benign console error — everything else should be zero). `browser_evaluate` is the reliable probe; `browser_take_screenshot` works for visual judgement and is required for the bubbliness/amplitude and tooltip items.

### Part A — Bubbly preset (`DeformableOutlineWordmark` / `bubbly`)

**A1 — Center the bubbliness slider (bidirectional).** The `bubbly.axes` `bubbliness` axis is `{ min: 0, max: 1, default: 0 }`, and `applyBubbliness` does `bumpCount = round(t * BUMPS_MAX)` (`BUMPS_MAX = 20`). Default at the far-left min means the slider can only add bubbles, never remove. Change `bubbliness.default` to `0.5` so the slider rests in the middle: left reduces the **synthetic** bumps toward 0, right adds more (up to 20).

- **Important nuance — there is a floor.** Rubik Bubbles' native WOFF outline is already bubbly; `bubbliness` is an _additive_ sine-bump deformer on top of that outline. So `bubbliness = 0` is the raw native font, and "decrease" only removes the synthetic additions down to native — it does **not** smooth the font's inherent bubbles. That is the correct, in-scope behavior. **Do not** attempt to flatten below the native outline.
- Confirm the demo's axis slider initializes its thumb from the axis `default` (via `defaultAxisValuesForPreset`) so it starts centered, and that **Reset** returns it to `0.5` (watch the `syncAxisControls` / `defaultValue` seam noted in `docs/agent-learnings.md`).
- If `0.5 → max` still doesn't add _visibly_ more bubbles than native, raising `BUMPS_MAX` modestly (e.g. 24–28) is in scope; keep it tasteful.

**A2 — Make amplitude noticeable.** `applyBubbliness` sets `amplitude = glyphSize * 0.12 * ampNorm * Math.sqrt(t)` (`ampNorm` ∈ 0..1, axis default 0.5). The owner reports the amplitude slider barely reads. Increase the coefficient (start ~`0.20`–`0.24`, i.e. ~1.6–2×) and tune by eye in the browser so sweeping the **Amplitude** slider min→max is an obvious change in bump height at a normal bubbliness. Keep `ampNorm = 0` still flattening synthetic bumps to nothing. Note: high amplitude × high bubbliness inflates per-glyph polyline length (documented ~500k chars); fine on target hardware, but don't add a new multiplier that makes it pathological.

**A3 — Mouse-follow X→bubbliness, Y→amplitude, actually visible.** The mapping already exists in `DeformableOutlineWordmark._applyMouseFollow` (primary axis = X, secondary = Y; bubbly's secondary is `amplitude`). It reads as broken mostly _because_ of A1: with `bubbliness` resting at min, X-from-center only reaches the top half rightward and nothing leftward. After A1 (rest = 0.5) the X sweep becomes bidirectional. Then:

- Remove or raise the `range * 0.5` halving in `_applyMouseFollow` so traversing the viewport reaches (or nearly reaches) each axis's full min..max; tune `strength`/`clamp` in `enableMouseFollow` to match.
- Verify the right-side axis slider thumbs visibly move as the cursor drives the values (they re-render through `_render`), and that disabling mouse-follow restores the rest snapshot.
- DoD: with mouse-follow on, moving the cursor left↔right is clearly fewer↔more bubbles and up↔down is clearly smaller↔bigger bubbles, across the visible word.

### Part B — Anatomy-deform presets (`AnatomyDeformWordmark`)

**B1 — Control nodes sit ON the letterform edge and track it (DECIDED: on-edge, tracking).** Today `_computeHandlePositions` places each node at a **static, base-bbox** anchor offset ±18u _outside_ the glyph, derived from `g.bounds` (the _undeformed_ bounds) — so nodes float beside the letter and never move as it deforms. Change them to land on the **live deformed outline** and ride the vectors:

- Drive positions from the **deformed** command list, not `g.bounds`. `_resolveGlyphPath(g)` already computes the deformed path (and memoizes it); expose/borrow the deformed command array (or its bounds + edge samples) so `_computeHandlePositions` can find real outline points. Recompute every `_render()` (already called on each drag move) so the node tracks the shape continuously.
- Edge point per handle (drag mechanics unchanged — `width` still drags horizontally, etc.):
  - `width` (ew-resize): rightmost outline point near vertical mid → on the right stroke edge.
  - `height` (ns-resize): topmost outline point near horizontal mid → on the top edge (ascender / cap / x-height as appropriate).
  - `serifLength` (ew-resize): a serif-foot terminal — an outline point near the baseline (y ≈ 0) on the right.
  - `weight` (ew-resize): leftmost outline point near vertical mid → on the left stroke edge (replaces today's left-floating anchor).
  - `descenderDepth` (ns-resize): bottom-most outline point → on the descender terminal.
  - `counterContour` (move/nwse-resize): **stays at the counter centroid** (already interior — `counterCentroid` from Brief 7). Do not move it to the rim.
- Place the **visible** dot centered on the edge point (a ~1-handle-radius nudge outward along the local outward normal is OK so the dot reads as sitting on the rim rather than buried under the fill). Keep the **hit area** generous (current ~18u) so it stays easy to grab even though the visible dot is small and on-edge.
- Honor the existing `ANATOMY_ANCHOR_OVERRIDES` intent where it still makes sense (e.g. `f`/`t`/`J` height anchor), but these were bbox-fraction hacks; on real outline points several may become unnecessary — drop an override only if the on-edge point is clearly better, and say so in the learnings.

**B2 — Minimal, no-box tooltips (DECIDED: minimal).** Replace the white-box + hard-ultramarine-border chip in `AnatomyDeformWordmark._renderTooltip` with the lightest treatment: ultramarine (`--ultramarine #1a2f6e`) **mono** text — label in the page mono face, value bold — on a faint `--paper` underlay (a low-opacity rounded rect or soft halo just for legibility over the glyph), **no border, no chip outline**. Smallest possible visual footprint. Reuse the page's tokens/fonts (`--mono`, `--ultramarine`, `--paper`) so it reads as part of the page, not a separate widget. Keep the existing show/hide + pin-on-drag logic and the fontSize-relative scaling (the viewBox is ~1000u tall, so text must scale up to read after the CSS down-scale). Apply the same treatment to the `DeformableOutlineWordmark` tooltip so bubbly matches.

**B3 — Resize cursor in the hit zone.** The anatomy hit circles set the pointer via the SVG presentation **attribute** `cursor="ns-resize"` etc. (`_renderHandles`), which isn't reliably honored. Emit it in the inline **style** instead — `style="cursor:<x>;touch-action:none"` — so hovering the hit area shows a double-sided arrow indicating the interaction zone:

- `ns-resize` for `height`, `descenderDepth`; `ew-resize` for `width`, `serifLength`, `weight`; `move` (or `nwse-resize`) for `counterContour`.
- Apply the same attribute→inline-style fix to `DeformableOutlineWordmark` (and `SandboxWordmark`) handles, which currently use `cursor="grab"`; the bubbly right-side axis sliders move vertically, so `ns-resize` is appropriate there (or keep `grab`/`grabbing` if that reads better — implementer's call, but it must actually show on hover).
- Check no page-level CSS (`adjustable-web-type.html`) sets a `cursor` on the SVG that overrides these.

**Scope (do not):**

- No new axes, handles, or presets. No contrast/optical features. This is feel + one positioning change.
- Don't touch the per-letter deformation math (Brief 3/7) — B1 only changes where the node is _drawn_ and what point it reads, not how the outline deforms.
- Don't smooth Rubik Bubbles below its native outline (A1 nuance).
- Don't refactor adjacent code for its own sake (shared rule above).

**Definition of done:**

- Bubbly: slider rests centered; left = toward native (fewer synthetic bubbles), right = more. Amplitude slider sweep is an obvious change. Mouse-follow: X = fewer↔more bubbles bidirectionally, Y = smaller↔bigger, both visibly spanning their range; right-side thumbs track; disable restores.
- Anatomy: each node is drawn on the live deformed outline edge (counter node at centroid) and moves continuously as you drag any handle on that glyph; nodes stay grabbable; hovering a hit area shows the correct double-arrow cursor.
- Tooltips are the minimal no-box treatment, coherent with page tokens, in both anatomy and bubbly modes.
- `toState()/fromState()` and export bundles still round-trip (positioning/cursor/tooltip are view-only; no state shape change). Zero console errors beyond the favicon 404.

**Verification:** start `npm run dev`; via Playwright MCP — (bubbly) screenshot the word at bubbliness min / center / max and amplitude min / max to confirm the visual range, and drive a synthetic `mousemove` sweep with mouse-follow on to confirm both axes move; (anatomy) Instrument Serif `Hello jazz`, drag `width`/`height`/`weight`/`serifLength` and confirm each node stays on the moving outline edge, screenshot to confirm on-edge placement and the minimal tooltip, and assert the hit circle's inline `style` carries the resize cursor. Update `docs/agent-learnings.md` with a Brief 8 entry (especially: the bubbliness native-outline floor, the deformed-outline edge-point sourcing, and any `ANATOMY_ANCHOR_OVERRIDES` made redundant).
