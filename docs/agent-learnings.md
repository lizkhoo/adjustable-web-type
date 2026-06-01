# Agent learnings

## Outline-first dual-pipeline resolution (2026-05-26)

**Problem:** Font presets conflated static `OutlineWordmark` (real woff paths, no handles) with parametric `Wordmark` (handles on internal glyphs). Users expected handles to edit Rubik Bubbles / Bitter outlines.

**Resolution:**

- **`DeformableOutlineWordmark`** — primary path for `createWordmark()` + demo when a reference face is selected. Stores opentype `baseCommands`, rebuilds `pathData` via preset **axes** (`bubbliness`, `serifLength`, `width`).
- **`OutlineWordmark`** — `renderMode: 'outline-static'` / demo **Static compare** toggle only.
- **`Wordmark`** — `renderMode: 'parametric'` / preset `none` (pedagogy + fallback if outline load fails per glyph).
- Demo label **Reference face**; axis range sliders + right-side axis drag handles; mouse-follow maps to primary axis in outline mode.

**Operators (spike):** `bubbliness` = centroid puff scale; `serifLength` = baseline stub segments; `width` = horizontal scale from glyph left.

**Verify:** `npm run dev` → Rubik Bubbles → drag **Bubbliness** slider/handle → outline puffs; **Static compare** on → no handles; **Parametric letters** → anatomy handles return.

## Product intent — letterform toy, not type-design tool (2026-05-26)

**Authoritative framing (user):** This is not intended to be a tool for serious type design. It is a toy for playing with letterforms and introducing non–type-designers to parts of letter anatomy through interaction.

**Encoded in:** `docs/PRODUCT_INTENT.md`; `.cursor/skills/type-design-expert/SKILL.md` (library-specific notes).

**Agent behavior:**

- Target audience: curious learners, not professional type designers.
- Success = tactile discovery, vocabulary via handles/tooltips, delight at extremes.
- Not success = shipping text fonts, full axis systems, professional workflow parity.
- Critiques must separate “missing for a font” from “missing for this toy.” Contrast, kerning, OTF export, etc. are optional polish — not gaps that block the toy’s purpose.
- Type-design expert skill remains useful for anatomy naming and param mapping; recommendations should be framed pedagogically unless the user asks for production work.

## Outline mode default + licensing (2026-05-26)

**User request:** Default to real reference font outlines; disclaimers in docs, library, and exports; UI label "Preset" → "Start with".

**Implemented:** `OutlineWordmark` + opentype.js font loading; preset `fontUrl`/license fields; demo outline default; `docs/THIRD_PARTY_FONTS.md`; export attribution banners.

**Verify:** `npm run dev` → Rubik Bubbles outlines on load → switch fonts → parametric mode via "Parametric letters (no reference font)".

## Outline mode inverted letters (2026-05-26)

**Issue:** Reference font outlines mapped into the preview SVG appeared upside-down (position/layout correct, glyphs mirrored on baseline).

**Root cause:** `opentype.js` `glyph.getPath()` already negates font Y (typographic Y-up → SVG Y-down). `OutlineWordmark._render()` / `toSVG()` also applied `scale(1,-1)`, double-flipping paths. Bounds in `extractOutlineGlyph()` were negated to match that extra flip.

**Fix:** Drop `scale(1,-1)` from outline glyph `<g transform>`; use raw `getBoundingBox()` for `bounds` (`minY: bb.y1`, `maxY: bb.y2`). Keep `toPathData(3)` with default `flipY: false` when passing an integer.

**Verify:** `npm run dev` → default `Hello jazz` → ascenders above baseline, `j` descender below; switch presets (Source Sans 3, Bitter) — letters upright; toggle **Reference outlines** for filled paths (no handles).

## Demo lost handles after outline default (2026-05-26)

**Issue:** After outline mode became the default for font presets, the demo mounted `OutlineWordmark` whenever a starter font was selected. That class has no `makeInteractive()` / `enableMouseFollow()` — handles and mouse-follow were skipped, and parametric toolbar controls were hidden.

**Root cause:** Mode conflation, not a coordinate bug from the Y-flip fix. `isOutlineMode()` returned `currentPreset !== 'none'`, so Rubik Bubbles (etc.) always rendered reference paths instead of parametric `Wordmark`.

**Fix:** Decouple modes in `adjustable-web-type.html`. `referenceOutlinesOn` defaults `false`; font presets drive parametric `Wordmark` + `buildPreset()`. New **Reference outlines** toggle (off by default) opts into `OutlineWordmark` for comparison. `makeInteractive()` and mouse follow run on every parametric mount. Y-flip fix in `lib/sculpt.js` unchanged.

**Verify:** `npm run dev` → load page → 50+ handle circles on `Hello jazz` → drag a handle → toggle **Mouse follow** → letters morph with cursor → toggle **Reference outlines** on → filled font paths, upright, no handles → toggle off → handles return.

Demo `#preset` custom combobox showed `bubbly · Rubik Bubbles`-style labels (preset key + `fontRef`). User-facing labels use `fontRef` only (`Rubik Bubbles`, `Instrument Serif`, …); internal `value` / `data-value` keys unchanged (`bubbly`, `instrumentSerif`, …). `lib/sculpt.js` `fontRef` was already correct.

**Bug source (labels still wrong after docs-only pass):** `PRESET_LABELS` in `adjustable-web-type.html` still held `key · fontRef` strings; `syncPresetPicker()` sets `#preset-trigger-label` from that map on `initPresetPicker()` and every preset change, overwriting any corrected static HTML. Static markup also still had descriptors on hidden `<option>` text and `#preset-listbox` `<li>` nodes (not updated by JS). Fix: align `PRESET_LABELS`, trigger span, options, and list items to font-only labels. Trigger `min-width` reduced from `35ch` to `27ch` (longest: `No preset (glyph defaults)`).

## Preset picker trigger label size (2026-05-26)

**Issue:** Closed trigger showed reference fonts (e.g. Rubik Bubbles) at inherited `row-secondary` `10px`, ~12px cap height — hard to preview.

**Fix:** `.preset-picker__trigger-label` → `font-size: 15px` (`1rem`), `line-height: 1.2`. Trigger button: drop inherited `10px`, `min-height: 22px`, `padding: 1px 0` (aligns with hex swatch). Listbox `.preset-picker__option` → `15px` / `line-height: 1.25`, `padding: 8px 10px`. Secondary toolbar still one row at ~853px (~40px row height).

## Preset picker trigger caret size (2026-05-26)

**Issue:** Closed trigger label at `15px` but caret `▾` in `.preset-picker__trigger-caret` was `8px` mono — visually tiny beside the font preview.

**Fix:** Caret is a `<span>` with unicode `▾` (not pseudo-element). `.preset-picker__trigger-caret` `font-size` `8px` → `11px`; `align-self: center` on flex child. No open-state caret variant (same glyph when listbox open). Trigger `min-height: 22px` unchanged.

## Developer docs typography (2026-05-26)

`#developer-docs` heading used `<em>documentation.</em>` with `.notes h2 em { font-style: italic }` for accent color only; deck paragraph had `font-style: italic` via `.notes .deck`. Both set to `font-style: normal`; accent color on the `<em>` kept. Scoped selectors to `#developer-docs` so future `.notes` reuse won't inherit italic defaults. Deck paragraph font switched from `var(--serif)` (Instrument Serif) to `var(--sans)` (Instrument Sans) — matches body/UI sans stack.

## Preset selection not updating wordmark (2026-05-26)

**Issue:** Choosing a preset updated the combobox label (reference web font in the trigger) but the sculpted SVG in `#stage` stayed on the initial mood — most visibly on `main`, where `buildPreset()` always returned `SculptLettering.presets.bubbly` regardless of `currentPreset`.

**Fix:**

- `buildPreset()` reads `SculptLettering.presets[currentPreset]` and deep-clones `glyphParams` per character.
- Added `Wordmark.setPreset(preset)` — re-applies `resolvePresetParams` to every glyph and re-renders (refreshes mouse-follow rest snapshot when active).
- Demo uses `applyPreset(value)` from the custom combobox and hidden `<select>` change handler; updates the live wordmark via `wm.setPreset()` instead of relying on a synthetic `change` event alone.
- `mount()` disables mouse-follow on the old wordmark before replacing DOM (avoids orphaned `window` listeners).

**Verify:** Default `Hello jazz` → pick IBM Plex Mono → monoline letters (`H`, `j`, `z`) get narrower cell width and zero curvature; pick Bitter → heavier stroke + miter joins on sans presets; flash shows preset name.

## Preset font shapes in demo (2026-05-26)

**Issue:** Preset picker appeared to do little on default text `hello world` — that string uses only curated glyphs (`h e l o w r d` + space). Preset `defaults` (curvature, slant, monoline `width`) apply to auto-generated/monoline letters only; curated letters rely on `glyphParams`. Users expected Rubik Bubbles / Instrument Serif / Plex Mono moods to show up immediately.

**Fixes:**

- `resolvePresetParams()` in `lib/sculpt.js` now merges `defaults` then overlays `glyphParams[ch]` per key (not wholesale replacement).
- `toState()` / `toInteractiveBundle()` now serialize `preset` key and restore it on embed boot so new letters keep the mood.
- Demo default text → `Hello jazz` (curated + monoline mix so curvature/slant/width defaults are visible).
- Docs: Preset shape block adds `fontRef`, clarifies param tuning vs web fonts; handle legend matches renderer (circles not squares).

**Note:** The masthead text input stays UI chrome (`JetBrains Mono`); sculpted output is the SVG in `#stage` below.

**Issue:** In `header.mast > .row-primary > .center`, the text input and “Reset letters” button looked vertically misaligned because `.input-wrap` stacked the input + `.input-hint` in a column while `.center` used `align-items: center`, centering the button against the taller input+hint block.

**Fix:** Added `.center-row` flex row (`align-items: center`, `nowrap`) for input + button; moved `.input-hint` below the row; made `.center` a column. Mobile: avoid `width: 100%` on the input inside `.center-row` (it forced the button to wrap); use `flex: 1 1 160px` + `max-width: 360px` instead.

## Mast `row-secondary` — one row at ~850px (2026-05-26)

**Issue:** At viewport ≤900px, `@media (max-width: 900px)` set `.mast .row-secondary { flex-wrap: wrap }`, so ~853px wide layouts stacked the mouse-follow control on a second row (~82px tall).

**Fix:** Default `flex-wrap: nowrap`; tighter gaps/padding/font sizes; preset `select` `max-width: 9.5rem`; label `white-space: nowrap`; shortened toggle label to “Mouse follow”. Wrap only at `max-width: 640px`. Verified: row height ~38px at 853px width, all four groups on one line.

## Bubbliness operator — bump count along outline (2026-05-26)

**Authoritative reframing (user):** Bubbliness should be the **number of bumps** on each letter. Higher value = more bumps. Lower value = fewer bumps. Not an inflate/deflate scale.

**Final implementation in `lib/sculpt.js`:**

- Axis: `{ id: 'bubbliness', label: 'Bubbliness', min: 0, max: 1, default: 0 }` (unipolar). At `0` the Rubik Bubbles outline renders as-is; at `1` it has the max bump count rippling along each contour.
- `applyBubbliness(commands, t)` now does normal-displaced sine-wave deformation per subpath:
  1. `splitSubpaths(commands)` splits at every `M`.
  2. `sampleSubpathDense(commands, 16)` evaluates each `Q`/`C` at 16 samples and `L` at ~4, returns `{ points, cumDist, totalLen }` where `totalLen` includes the closing edge so `cum / totalLen` is a clean `[0, 1)` arc-length parameter.
  3. For each sample point `p`, tangent = central difference of neighbours; normal = rotate-CCW; flip the normal if `(p - subpathCentroid) · normal < 0` so it points outward. (Robust across winding order and Y-up vs Y-down conventions — TrueType + opentype.js Y-flip combos break shoelace-based outerSign detection.)
  4. Displacement `amplitude * sin(phase)` where `phase = (cum / totalLen) * bumpCount * 2π`. `bumpCount = round(t * 20)` (1–20 integer bumps), `amplitude = 0.06 * glyphSize * sqrt(t)` (square-root ramp so the very first bump is already visible at `t ≈ 0.05`).
  5. Re-emit as `M / L… / Z` polyline. Beziers are lost (operator is destructive) but at typical render sizes the dense polyline reads as a smooth bumpy outline.
- For inner counters: same outward-from-subpath-centroid orientation pushes bumps INTO the counter, so the stroke ripples on both inner and outer edges — bubbly fonts read as "bumpy on both sides of the stroke."
- Axis call site: `applyPresetAxesToCommands` passes `norm` (== `v` for unipolar `[0,1]`).

**Why prior versions failed:**

- v1 (uniform glyph-centroid scale, `sx = 1 + t*0.12`): scaled outer + inner counters identically, so strokes never thickened; total expansion 12–16% was invisible on already-puffy Rubik Bubbles.
- v2 (per-subpath bipolar inflate/deflate with shoelace-based outerSign): user clarified the metaphor is _bump count_, not _volume_. Replaced.

**Limits:**

- Operator is destructive (Bezier → polyline). Acceptable for this toy; if smooth Beziers are ever required at very small sizes, re-fit the polyline with a Catmull-Rom or de Casteljau least-squares step.
- Layout uses `extractOutlineGlyph().advance` and original bounds, NOT deformed bounds, so high-amplitude bumps near sidebearings can overlap adjacent glyphs. Mitigated by capping amplitude at 6% of glyph size.

**Verify:** Rubik Bubbles preset → **Bubbliness** at `0` → outline matches the unmodified font; drag to `0.5` → ~10 evenly-spaced bumps around each contour; drag to `1` → ~20 bumps, ~6%-of-glyph amplitude, both outer and inner edges ripple. Mouse follow mapped to `bubbliness` sweeps the count smoothly with cursor X.

## Mast `row-secondary` — responsive shrink in one row (2026-05-26)

**Issue:** At ~853px viewport, `row-secondary` overflowed because `.preset-picker__trigger` had a hard `min-width: 38ch` (~295px) and the wrapping `.ctrl:first-child` used `flex-shrink: 0`. With outline-deform mode adding a `BUBBLINESS` slider, total content > container, so the row clipped horizontally instead of fitting on one line.

**Fix in `adjustable-web-type.html`:**

- Preset picker is the only flex item allowed to shrink:
  - `.row-secondary .ctrl:first-child` → `flex: 0 1 auto; min-width: 0`.
  - `.preset-picker` → `flex: 1 1 auto; min-width: 0`.
  - `.preset-picker__trigger` → `flex-basis: 38ch; width: 100%; min-width: 0` (prefers 38ch on wide screens, shrinks on narrow).
  - `.preset-picker__trigger-label` → `overflow: hidden; text-overflow: ellipsis`.
- Dropdown stays readable when trigger shrinks: `.preset-picker__list` → `min-width: max(100%, 38ch); max-width: min(90vw, 480px)`.
- 900px breakpoint adds: `.row-secondary .ctrl { gap: 5px }`, `.axis-controls { gap: 8px }`, `axis-controls input[type=range] { width: 72px }`, `input.hex-input { width: 60px }`.
- 640px breakpoint **no longer wraps** — keeps `nowrap`, just tightens further: `gap: 6px; padding: 8px 12px`; slider `width: 60px`.
- Phantom-divider fix: tagged previously-untagged dividers around `Monoline curvature` (`parametric-only`) and before `Mouse follow` (`not-static-outline`) so they hide in sync with their adjacent ctrls. JS uses `el.hidden = …` so spans work via UA `[hidden]` rule with no script change.

**Verify:** `npm run dev` → 853px viewport in outline-deform mode (Rubik Bubbles default) → REFERENCE FACE / Rubik Bubbles ▾ / HEX / BUBBLINESS / STATIC COMPARE / MOUSE FOLLOW all on one row, no clipping; resize narrower → preset label truncates with ellipsis before any other ctrl shrinks; switch to Parametric letters preset → Monoline curvature ctrl + its divider both reappear; toggle Static compare → Mouse follow ctrl + its divider both hide cleanly (no orphan dividers).

## Preset select clipped in mast (2026-05-26)

**Issue:** `#preset` in `.row-secondary` truncated selected text (e.g. `bubbly · Rubik Bubbles`) — container ~143px. Causes: `select { max-width: 9.5rem }` (added to keep one row at ~850px) plus `.ctrl:first-child { flex-shrink: 1; min-width: 0 }`.

**Fix:** Removed `max-width` cap; set `min-width: 35ch` (longest option: `instrument serif · Instrument Serif`), `width: auto`, `max-width: none` on preset picker trigger. First preset `.ctrl` uses `flex-shrink: 0` so flex layout won't compress it. Row still fits on one line at ~853px; wraps at 640px as before.

## Preset picker font preview (2026-05-26)

Native `<select>` / `<option>` cannot reliably render each option in its reference typeface across browsers. Replaced visible control with a custom combobox: hidden `#preset` `<select>` keeps values + `change` handler; `#preset-trigger` button shows the closed label in the preset's `fontRef` family; `#preset-listbox` options use per-preset `font-family` via CSS `data-value` selectors. Google Fonts link extended with Rubik Bubbles, Source Sans 3, Bitter, IBM Plex Mono (Instrument Serif already loaded). "No preset" uses UI mono (`--mono`). Keyboard: trigger opens with Enter/Space/Arrow keys; listbox Arrow/Home/End + Enter/Space; Escape closes; click-outside closes. `min-width: 35ch` preserved on trigger.

## Design critique — adjustable-web-type.html (2026-05-26)

Main view reviewed at `http://127.0.0.1:5173/adjustable-web-type.html`. Key issues: no `<h1>` (brand is plain text in masthead); demo + dev docs share one scroll with weak section boundary; footer handle legend is inaccurate — positional anchors render as **filled circles**, not squares (squares only appear at tangent anchor points); toggle buttons expose only "on"/"off" to assistive tech; input silently strips non `[A-Za-z ]` chars; Reset reverts to glyph defaults not preset (undocumented in UI). Footer mixes user onboarding copy with dev file links at equal weight.

**Implemented (same session):** All critique items applied in `adjustable-web-type.html` — h1 + trimmed masthead, input hint + filter flash, reset label/title/flash, preset label, footer split (`.footer-hints` / `.footer-dev`), sentence-case legend copy (circles not squares), `.notes` border-top, toggle off-state contrast + `aria-pressed`, main/section ARIA landmarks, API list `no-num` class (numbered only under Install & mount), page title updated.

## Stage actions — Export code download (2026-05-26)

Demo page stage footer: **Export code** button (`#export-code`, `btn ghost`) calls `wm.toInteractiveBundle()` and downloads a self-contained HTML file via Blob + anchor (`sculpt-{slug}.html`). Bundle includes full `toState()` snapshot: text, color, tracking, padding, per-glyph params, and active modes (e.g. mouse-follow). Replaces prior **Copy SVG** clipboard flow (`wm.toSVG()`). Hover uses primary darker blue (`--ultramarine-dark` fill/border, `--paper-2` text) — same tokens as `button.btn.solid:hover`, scoped to `#export-code` so masthead ghost buttons keep grey hover.

## Preview blank after Export code strings (2026-05-26)

`buildExportCode()` in `adjustable-web-type.html` included a literal `'</script>'` inside the page's own `<script>` block (`'<script src="lib/sculpt.js"></script>'`). HTML parsers close the script at that token even inside a JS string, so bootstrap never reached `mount()` and `#stage` stayed empty. Fix: escape as `'<\/script>'` (same pattern already used for the closing tag in that helper).

## UI palette (2026-05-26)

Demo + docs page (`adjustable-web-type.html`) use only black (`#0a0a0b`), white, cool greyscale (`#f6f7f9` … `#525860`), and dark ultramarine highlight (`#1a2f6e`). Matching handle/tooltip colors live in `lib/sculpt.js`.

## Default wordmark color (2026-05-26)

Demo wordmark stroke defaults to `#2a2ae5` (hex input, swatch, `currentColor`, `Wordmark` bootstrap, docs code sample). `SculptLettering.Wordmark` library fallback when `color` is omitted: `#2a2ae5` (was `#1a1a1a`). UI chrome `--black` stays `#0a0a0b`.

## /build — dev server + hot reload (2026-05-26)

Run `npm run dev` (Vite on port 5173). Open `http://127.0.0.1:5173/adjustable-web-type.html` in the Cursor browser — saves to HTML/CSS/JS trigger live full reload. Entry file is `adjustable-web-type.html` (not `index.html`); `package.json` exists so `detect-project.sh` should classify as `web`.

## Open-source font starters for sculpt-lettering (2026-05-21)

Users asked for five popular OFL/Google Fonts starter categories: fun/bubbly, elegant curved serif, neutral utilitarian sans, rectangular/slab serif, monospaced.

### Recommended defaults (one per slot)

| Slot                     | Primary pick                                                               | Why                                                                        | License / delivery        |
| ------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------- |
| Fun / bubbly             | [**Rubik Bubbles**](https://fonts.google.com/specimen/Rubik+Bubbles)       | Inflated, rounded letterforms; unmistakably bubbly display face            | SIL OFL 1.1, Google Fonts |
| Elegant curved serif     | [**Instrument Serif**](https://fonts.google.com/specimen/Instrument+Serif) | Soft curves, refined contrast; already used in demo UI chrome              | SIL OFL 1.1, Google Fonts |
| Neutral utilitarian sans | [**Source Sans 3**](https://fonts.google.com/specimen/Source+Sans+3)       | Adobe’s neutral workhorse; clear, utilitarian, strong readability          | SIL OFL 1.1, Google Fonts |
| Rectangular / slab serif | [**Bitter**](https://fonts.google.com/specimen/Bitter)                     | Contemporary slab with rectangular serifs; designed for screen readability | SIL OFL 1.1, Google Fonts |
| Monospaced               | [**IBM Plex Mono**](https://fonts.google.com/specimen/IBM+Plex+Mono)       | Neutral, engineered mono; distinct from sans while staying utilitarian     | SIL OFL 1.1, Google Fonts |

### Strong alternates

- **Bubbly:** Fredoka, Baloo 2, Nunito
- **Elegant serif:** Cormorant, Fraunces, Lora
- **Neutral sans:** Inter, IBM Plex Sans, Noto Sans
- **Slab:** Roboto Slab, Zilla Slab, Arvo
- **Monospaced:** JetBrains Mono, Source Code Pro, Roboto Mono

### Implementation notes (when adding a font picker)

- Prefer Google Fonts CSS2 URLs or self-hosted WOFF2 for embed demos; all above are web-ready.
- Map each font to a **preset** (`defaults` + selective `glyphParams`), not to raw SVG outlines — sculpt-lettering tunes parameters, fonts are mood references.
- Demo chrome uses Instrument Serif / Instrument Sans / JetBrains Mono; font starters are separate from sculpted glyph presets.

### Presets implemented (2026-05-26)

All five font-starter slots are now exposed as `SculptLettering.presets` and in the demo preset picker:

| Preset key        | Font reference   | Mood tuning                                   |
| ----------------- | ---------------- | --------------------------------------------- |
| `bubbly`          | Rubik Bubbles    | Heavy stroke, high curvature, round bowls     |
| `instrumentSerif` | Instrument Serif | Lighter stroke, high tension, slight slant    |
| `sourceSans`      | Source Sans 3    | Neutral defaults, zero curvature              |
| `bitter`          | Bitter           | Heavy stroke, low tension (rectangular slabs) |
| `ibmPlexMono`     | IBM Plex Mono    | Uniform `width: 92` cell, compact proportions |

## Type-design-expert skill + library critique (2026-05-26)

**Skill path:** `.cursor/skills/type-design-expert/SKILL.md` — invoke for letterform critique, param-to-design mapping, preset/legibility review. Extended glossary in `reference.md`.

**Critique summary for future agents:**

- **Two-tier alphabet:** 13 curated Bézier glyphs (a,n,o,s,h,i,e,t,r,l,w,d,space) vs 40+ monoline factory glyphs (A–Z + b,c,f,g,j,k,m,p,q,u,v,x,y,z) — monoline uses `curvature` Catmull-Rom as stopgap; texture mismatch persists at low curvature.
- **Rendering model:** Uniform SVG stroke (`strokeWeight`), round caps — no contrast axis, serifs as stroke joins, or filled outlines; exploration-first, not production text.
- **Strong params:** x-height/cap-height, bowl proportions, aperture, tension handles, terminals (foot/curl/arm), preset `defaults` block for cross-alphabet mood.
- **Missing type-design controls:** contrast/thin-stroke axis, overshoot, optical sidebearings, pair kerning, serif/spur params, independent vertical vs horizontal scale on curated glyphs.
- **Spacing:** Word-level `tracking` only; per-glyph `advance()` is param-derived, not optically tuned — extreme bowl width + fixed tracking causes rhythm gaps.

## Type-design critique refresh (2026-05-26)

Post–Sprint 1+2: `a` top bowl uses symmetric `bowlTopTension` but bottom quadrants still use fixed κ (0.5523); `e` bottom arc uses fixed κ, not a side-tension param. Five presets (`bubbly` … `ibmPlexMono`) + `resolvePresetParams` per-key merge are live; demo default `Hello jazz` shows monoline `curvature`/`slant` beside curated letters. `mouseFollow` with `tangentOnly: false` can stack every handle delta and slam clamps — legibility risk at display sizes. Monoline `curvature` narrows the two-tier texture gap but does not replace hand-authored bowls (e.g. `b`, `m`).

## Type-design recommendations implemented (2026-05-26)

User-approved critique batch landed in `lib/sculpt.js` + demo docs:

- **P0:** `bowlBottomTension` on `a`; `bowlSideTension` on `e`; `clampAperture()` in `geom()` for `a`/`e`; `enableMouseFollow` default `tangentOnly: true` (demo passes same).
- **P1:** Hand-authored `b`, `c`, `m`, `g` (removed from monoline `EXTRA_LOWERCASE_DEFS`); `CURATED_KEYS` extended; `resetAll`/`resetGlyph` use `resolvePresetParams`; `leftBearing`/`rightBearing` + `advanceWithBearings()`; `ibmPlexMono.monoCell` + `monoAdjustedAdvance()` in layout.
- **P2:** `strokeJoin: 'miter'` on `sourceSans`/`bitter` presets; `capOvershoot` on `h` (arch), `l`, `t`; manual snapshot checklist in `docs/snapshot-regression.md`.
- **serifLength:** Preset `defaults` on `instrumentSerif` (8) and `bitter` (10); glyph overrides; `appendSerifStubs()` in `construct()` for curated letters that declare the param.

**Test:** Preset Instrument Serif or Bitter → `Hello jazz` → drag `serifLength` on `a` if handle visible (non-zero preset value) → Reset restores preset not module defaults.

## Merge conflict resolution (2026-05-26)

Merged `origin/main` into `cursor/font-starter-recommendations-ab18`: add/add on `docs/agent-learnings.md` — combined branch session notes + main’s font-starter doc + branch “Presets implemented” table (no conflicting intent).

## Doc page layout — source link in masthead (2026-05-26)

Demo/docs page (`adjustable-web-type.html`): removed `CHANGES.md` from the footer dev-links strip; moved `lib/sculpt.js` link into the masthead `.left` block beside the site title (`.site-source`, same mono/uppercase/hover styling as the old `.footer-dev` links). Footer now shows handle hints only; `.footer-dev` CSS removed.

## Doc page — GitHub source button (2026-05-26)

Removed masthead `.site-source` text link. `#developer-docs` first sprint block now has a primary `.btn.solid` anchor above **Install & mount**, linking to `https://github.com/lizkhoo/adjustable-web-type/blob/main/lib/sculpt.js` (`target="_blank"`). Button styles generalized from `button.btn` to `.btn` with `a.btn { display: inline-block; text-decoration: none; }`.

## Removed meaningless v0.2 label (2026-05-26)

Masthead `v0.2` / `.site-meta` removed from `adjustable-web-type.html`. It was a hardcoded demo badge with no `package.json` version, git tag, or library constant behind it — not a real release number.

## Implementation evaluation pass (2026-05-26)

End-to-end smoke test against `http://127.0.0.1:5173/adjustable-web-type.html` via CDP. All flows from `docs/snapshot-regression.md` exercised; zero runtime errors across a full preset/axis sweep.

**Verified working**

- Default load: `DeformableOutlineWordmark` with `bubbly` preset, `Hello jazz` text, 10 filled glyph paths (fill `#2a2ae5`), 1 axis handle (bubbliness, range 0–1).
- All 5 font presets (`bubbly`, `instrumentSerif`, `sourceSans`, `bitter`, `ibmPlexMono`) load OFL outlines from `@fontsource` WOFF via jsDelivr, mount with the correct primary axis handle, and re-render on preset change. `none` preset switches to parametric `Wordmark` with 14 paths, 52 anatomy handles, 13 tangent square anchors.
- Axis sliders + right-side drag handles wire through `setAxis()`. Path-data delta from `min`→`max`: bubbliness ≈ +524k chars (destructive Bezier→polyline as documented), serifLength ≈ +1–2k chars (extra `M/L` serif stubs), width ≈ +1–1.4k chars (per-glyph horizontal scale).
- `Static compare` toggle swaps to `OutlineWordmark`, hides handles (handleCount → 0). Toggling back restores deformable handles.
- `Mouse follow` toggle: parametric mode defaults `tangentOnly: true`; outline mode maps cursor X to the first preset axis. Path data changes after a synthetic `mousemove`.
- Curvature toggle re-mounts with overridden `defaults.curvature = 0` and back.
- Handle drag via `PointerEvent` mutates target glyph's path (validated against `capHeight` on glyph 0).
- `setText` incremental: `Hi` (2 glyphs) → `Hi there` (8 glyphs) with no full remount.
- Input filter: `!` stripped, empty text falls back to `Hello jazz`.
- `Reset letters` button reverts to preset defaults in all three modes.
- Hex color input + swatch update `wm.color` and re-render; works for stroke (parametric) and fill (outline).
- Export bundle (`toInteractiveBundle()`):
  - Parametric (`none` preset): 894KB, **0 external script srcs** (DOM-parsed), 2 inline scripts (lib + boot). Sprint 1.2's "no CDN" promise holds.
  - Deformable outline: 920KB, 1 external script src — `cdn.jsdelivr.net/.../opentype.js@1.3.4/opentype.min.js`. The fontsource WOFF for the active preset is still fetched at runtime by `loadFontForPreset()`. Documented dependency, not a regression.
  - Both bundles boot in a fresh tab from a blob URL and render the expected SVG (10 paths, mode/preset attributes preserved).

**Notes / minor smells (not bugs)**

- `applyColor()` calls `wm._render()` (underscore-prefixed). Only public surface for color repaint; consider a `setColor()` shim.
- `syncAxisControls()` sets `range.value` but no `defaultValue` attribute — `input.defaultValue` is the empty string, which equals min when re-assigned. Not user-visible unless a script reads `defaultValue`.
- Bubbliness at high `t` generates ≈500k+ chars of polyline per glyph; renders fine on M-series Mac but worth profiling on lower-end devices.
- MCP browser screenshot timed out repeatedly during this session; CDP `Runtime.evaluate` was used to inspect DOM/state instead. Not a project issue.

**How to re-run** Open `http://127.0.0.1:5173/adjustable-web-type.html`, then drive each control from `docs/snapshot-regression.md`. For programmatic verification, the CDP probes used in this evaluation live in chat history under [Evaluate adjustable web type](this-session).

## ERR_CONNECTION_REFUSED on :5173 (2026-05-26)

`ERR_CONNECTION_REFUSED` / curl failure on `http://127.0.0.1:5173/` means nothing is listening on that port — usually Vite was never started or the dev process exited. Fix: from repo root run `npm install` (if needed) then `npm run dev`; keep that terminal open. Entry URL: `http://127.0.0.1:5173/adjustable-web-type.html` (root HTML file, no custom `base` in `vite.config.js`).

## Brief 3a + 3b landed — weight dilation + region-clipped height (2026-05-30)

**Shipped.** Two of the four locked handle-math upgrades (`weight → height → serifLength → width`) are now production-grade in `AnatomyDeformWordmark`:

- **3a `weight`** — `dilateOutline(commands, delta)` replaces the SVG stroke halo. Densely samples each contour, displaces samples along the outward normal of the filled region, re-emits a polyline. Rotation sense keyed off the largest-area (outer) contour so positive delta grows the silhouette; counters (opposite winding) shrink automatically. Stroke-overlay fallback kept for degenerate glyphs.
- **3b `height`** — `bandScaleY(commands, f, bandTopY)` scales only the band between baseline (y=0) and the x-height line, pinned at baseline. Lowercase clips to x-height; uppercase clips to cap-height. Applied path-level in `_resolveGlyphPath` (replaces the old whole-glyph CSS scale in `_transformFor`). Height runs _before_ weight dilation so stroke contrast stays uniform.

**Non-obvious gotcha — overshoot.** Round letters (`o e c O…`) optically overshoot the x-height/cap line by ~1–2.5% so they don't read short. If the band top sits exactly at the x-height metric (derived from flat-topped `x`), the overshoot sliver of an `o` falls _outside_ the scaled band and pins — the `o` shrinks but leaves a stuck nub at the top. Fix: pad the band metrics by 3% (`OVERSHOOT = 1.03`) so round-letter overshoot stays inside the band. Caught only by browser-testing real fonts, not synthetic-glyph unit tests. The band machinery (and this overshoot pad) will be reused by 3c/3d and Brief 7's counter contour.

**Metrics source.** `getAnatomyBandMetrics(presetKey, fontSize)` derives x-height/cap-height empirically from the bounding boxes of `x` and `H` (top = `-bounds.minY`), not the OS/2 table — robust for any loaded WOFF. Cached per preset+fontSize.

**Verification.** Pure-math unit tests (extracted the shipped functions, ran in node) + a headless-Chrome harness against real fonts: `b` ascender top pins at -740 while height halves; `o` top scales -516→-258 (whole glyph); `H` cap grows 1.5×; all four anatomy presets render with zero console errors and `toState()` round-trips the height change. Still TODO: 3c (`serifLength` anchor translation), 3d (`width` partitioning).

## Brief 3 complete + Brief 7 landed — per-letter handles + counter contour (2026-05-31)

**Correction to the 2026-05-30 entry above:** the "Still TODO: 3c, 3d" note is stale. Both shipped (3c `serifLength` foot-translation `fed8459`, 3d `width` counter-widening `6092782`). All four Brief 3 handle-math upgrades (`weight → height → serifLength → width`) are production-grade in `AnatomyDeformWordmark`. Verified live via Playwright MCP: each handle mutates exactly its own glyph, correct axis/direction, no neighbor bleed.

**Brief 7 shipped.** Per-letter handle overrides + counter contour on `AnatomyDeformWordmark`:

- **`letterHandles` preset field** (`{ [char]: [...handleIds] }`) — _add-to_ semantics (recommended option from the brief): a letter gets the preset baseline plus its overrides. Resolved in `anatomyHandleIdsFor(character, presetHandles, letterHandles)`, now with a `seen` Set so a repeated/duplicate id (incl. `descenderDepth`) is harmless. New `presetLetterHandles` getter threads it to the two call sites (`_defaultHandleStateFor`, `_computeHandlePositions`).
- **`counterContour` handle** — scales a glyph's enclosed counter about its centroid (range 0.6–1.4, default 1, drag dx/100). Anchor: `counter` → centroid of the largest opposite-wound subpath, cached on the glyph (`g._counterCentroid`, derived from immutable `baseCommands`). Tooltip `counter on '{char}'`, cursor `nwse-resize`. Applied in `_resolveGlyphPath` after width, before serif/weight; memo key extended to include `counter`.
- **Geometry helpers** (near `anatomyWidth`): `counterSubpathIndices` (same winding/area gate as `anatomyWidth.hasCounter`, so the two agree on what a counter is), `counterCentroid`, `counterScale`.
- **Wired into** `instrumentSerif`, `bitter`, `sourceSans` via shared `COUNTER_CONTOUR_LETTER_HANDLES`. Opt-out on `ibmPlexMono` (mono) and `bubbly` (bubbliness owns the counter aesthetic) — no `letterHandles` field.

**Non-obvious gotcha — counters burst the outline at the grow extreme.** On a round letter whose counter is already ~70% of the glyph (`o`, `O`), scaling the counter ×1.4 pushes it _past_ the outer contour top/bottom — the white hole pokes outside the stroke and it stops reading as the letter (caught visually via Playwright screenshot; the bbox-height grew +140 where it should have stayed flat). Fix: `counterScale` caps growth (s>1 only) per glyph so the scaled counter stays a minimum stroke (`COUNTER_STROKE_FLOOR_FRAC = 0.06` of the smaller outer dimension) inside the outer contour. The handle keeps its 0.6–1.4 feel; on a big-counter letter the grow saturates gracefully (stroke thins, ring never breaks), while small-counter letters (`P`, `e` bowl, `a`) still grow fully. Shrink is never capped. Unit/bbox tests miss this — only a real-font render shows the burst.

**Letter-list decision — `B` added beyond the brief's enumeration.** The brief's enumerated counter-letter list omits `B`, but its own verification step expects a counter handle on B ("type Bodega … counter handles on B, o, d, e") and its stated criterion is "anything with an enclosed inner region" (B has two counters). Treated the omission as an oversight and included `B`. Documented inline at `ANATOMY_COUNTER_LETTERS`.

**Verification (Playwright MCP, real fonts).** Handle presence per DoD: instrumentSerif `Hello`→[e,o]; bitter `Hello jazz`→[e,o,a] (H/l/j/z none); ibmPlexMono→none; sourceSans `aximul`→[a]; bubbly→none. Behavior: counter drag on `o` changes only that glyph, outer width held (dw=0 — distinct from `width`'s +504), capped grow keeps bbox flat. `g` carries both `counterContour` + `descenderDepth`. `toState()/fromState()` round-trips per-letter counter values (B:0.7, o:1.3, g:0.8); `toSVG()` differs with counter set (survives export). Reset restores. Zero console errors. **Test-timing note:** the demo's "Reset letters" re-render is async — allow ~250ms before asserting restoration (200ms flaked a false negative).

## Brief 8 landed — bubbly axis feel + anatomy on-edge nodes / minimal tooltip / inline cursor (2026-05-31)

Six interaction-polish items, all in `lib/sculpt.js`, verified live via Playwright MCP. View-only changes — no state shape change, no deformation-math change.

**A1 — bubbliness slider centered (the native-outline floor).** `bubbly.axes` `bubbliness.default` 0→**0.5** so the slider rests mid; left removes synthetic bumps toward native, right adds more. **Key nuance baked into the comment:** Rubik Bubbles' WOFF is _already_ bubbly; `applyBubbliness` is an _additive_ sine-bump deformer, so `bubbliness=0` = raw native font and "decrease" only strips the synthetic additions down to native — it never smooths the font's inherent bubbles. That's the floor; do not flatten below it. Slider thumb inits from `defaultAxisValuesForPreset` (→0.5) and `resetAxes()` returns it to 0.5 (verified: slider value 0.5 on load + after Reset). Bumped `BUMPS_MAX` 20→**24** so 0.5→max adds visibly more bumps over native.

**A2 — amplitude coefficient.** `applyBubbliness` amplitude `glyphSize * 0.12 → * 0.22` (~1.8×). Sweeping Amplitude min→max is now an obvious bump-height change; `ampNorm=0` still flattens synthetic bumps to nothing (verified by screenshots: amp-min reads as native, amp-max is dramatic). Didn't go higher to avoid the documented ~500k-char polyline blowup at high amplitude × high bubbliness.

**A3 — mouse-follow reaches full range.** Dropped the `range * 0.5` halving in `DeformableOutlineWordmark._applyMouseFollow` so `delta/span ∈ [-1,1]` maps across the _whole_ axis range from rest. Retuned `enableMouseFollow` defaults: `strength` 0.4→**0.7**, `clamp` 220→**200** (a normal viewport sweep now hits the clamp). Verified: cursor far-left→far-right drives bubbliness min↔max (right-side SVG axis thumb cy 92→12, full 80u travel), far-top→far-bottom drives amplitude min↔max (cy 144→64); disable restores the rest snapshot (back to 0.5/0.5). Note: the "right-side slider thumbs" that track are the _SVG axis handles_ (`circle[data-axis-handle]`, cy encodes the value), not the HTML range inputs — the HTML sliders only re-sync on `syncAxisControls`.

**B1 — anatomy nodes on the LIVE deformed edge (the heavy item).** Sourced real outline points from the deformed command list, not `g.bounds`:

- Threaded the deformed `cmds` array out of `_resolveGlyphPath` — added `cmds` to every `result`/`strokeFallback`/early-return object (it already memoises per handle-state, so this is free). The no-math early return exposes `g.baseCommands`; the weight branch exposes the _dilated_ outline so the weight/left node tracks the thickened silhouette.
- New `_deformedEdgePoints(g)` splits those cmds into subpaths, `sampleSubpathDense(sp, 12)` into a point cloud, and picks extrema: `right`/`left` = rightmost/leftmost point whose y is within the central third of the height (`vBand = 0.34·spanY`) → the stroke edge _at mid-height_ (so on a serif `H` the width node sits on the bare stem edge x≈457, not the wider serif foot x≈527 — anatomically right); `top` = topmost point within the central third of the width; `bottom` = global bottom-most; `foot` = rightmost point within `±0.12·spanY` of the baseline `y=0` (serif terminal). Cached on the glyph keyed by the same path-state scalars as the path memo.
- `_computeHandlePositions` anchor branches now read these edge points (+ an 8u outward NUDGE so the dot reads on the rim, not buried) with bbox fallbacks if sampling degenerates. `counterContour` is untouched — stays at `counterCentroid` (interior, per the brief).
- **`ANATOMY_ANCHOR_OVERRIDES` made partly redundant:** the `f`/`t`/`J` **`height.yFrac`** drops (which pulled the floating node down a bbox fraction) are now dead — the real top-edge point supplies y directly. I kept the **`xFrac`** override as an optional nudge along the top edge (still useful to bias the `f` height node toward the body / `f`'s `width.xFrac` toward the stem), but every `yFrac` entry in that table is now ignored by the on-edge path. Left the table in place (the xFrac intent still reads), but a future cleanup could strip the `yFrac` keys.
- **Verified by drag-tracking, not just a screenshot:** dragging glyph-0 `width` moved the deformed right edge +613.2u and the node +613.2u (node = edge + 8u nudge, exactly); dragging `height` moved the top edge +432u and the node +432u in lockstep. The node rides the moving edge continuously (recomputed each `_render`, which fires on every drag move). Screenshot confirms dots sit on the rims.

**B2 — minimal no-box tooltip.** Replaced the white-box + ultramarine-border chip in _both_ `AnatomyDeformWordmark._renderTooltip` and `DeformableOutlineWordmark._renderTooltip` with: a faint `--paper` (#f6f7f9, fill-opacity 0.82) rounded underlay, **no stroke**, and `--mono` text in `--ultramarine` (#1a2f6e) — label normal, value bold(700). Kept the fontSize-relative scale in the anatomy one (viewBox ~1000u tall → `scale = max(1.5, fontSize/167)` so text reads after the CSS down-scale) and the show/hide + pin-on-drag logic. Tighter padding (4x/3y) so the footprint hugs the text. Verified in both modes.

**B3 — resize cursor via inline `style`, not the SVG attribute.** The SVG `cursor="…"` _presentation attribute_ isn't reliably honored; emit `style="cursor:<x>;touch-action:none"` instead. Anatomy hit circles (`circle[data-hit-area]`): `ns-resize` height/descenderDepth, `ew-resize` width/serifLength/weight, `nwse-resize` counterContour. Bubbly axis hit circles (`circle[data-axis-handle]`) and SandboxWordmark handles: vertical sliders → `ns-resize` / `grab`. Verified the inline `style` string carries the cursor and the `cursor` attribute is null. No page CSS sets a `cursor` on the stage SVG/handles (the `adjustable-web-type.html` `cursor:` rules are all on buttons/controls).

**Tuning constants landed:** `BUMPS_MAX = 24`, amplitude coeff `0.22`, mouse-follow `strength 0.7` / `clamp 200` (and removed the `*0.5` range halving), node NUDGE `8u`, edge-band fractions `vBand/hBand = 0.34·span`, foot tolerance `0.12·spanY`. Zero console errors beyond the favicon 404 throughout.
