# Agent learnings

## Preset picker labels — font names only (2026-05-26)

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

## Preset select clipped in mast (2026-05-26)

**Issue:** `#preset` in `.row-secondary` truncated selected text (e.g. `bubbly · Rubik Bubbles`) — container ~143px. Causes: `select { max-width: 9.5rem }` (added to keep one row at ~850px) plus `.ctrl:first-child { flex-shrink: 1; min-width: 0 }`.

**Fix:** Removed `max-width` cap; set `min-width: 35ch` (longest option: `instrument serif · Instrument Serif`), `width: auto`, `max-width: none` on preset picker trigger. First preset `.ctrl` uses `flex-shrink: 0` so flex layout won't compress it. Row still fits on one line at ~853px; wraps at 640px as before.

## Preset picker font preview (2026-05-26)

Native `<select>` / `<option>` cannot reliably render each option in its reference typeface across browsers. Replaced visible control with a custom combobox: hidden `#preset` `<select>` keeps values + `change` handler; `#preset-trigger` button shows the closed label in the preset's `fontRef` family; `#preset-listbox` options use per-preset `font-family` via CSS `data-value` selectors. Google Fonts link extended with Rubik Bubbles, Source Sans 3, Bitter, IBM Plex Mono (Instrument Serif already loaded). "No preset" uses UI mono (`--mono`). Keyboard: trigger opens with Enter/Space/Arrow keys; listbox Arrow/Home/End + Enter/Space; Escape closes; click-outside closes. `min-width: 35ch` preserved on trigger.

## Design critique — adjustable-web-type.html (2026-05-26)

Main view reviewed at `http://127.0.0.1:5173/adjustable-web-type.html`. Key issues: no `<h1>` (brand is plain text in masthead); demo + dev docs share one scroll with weak section boundary; footer handle legend is inaccurate — positional anchors render as **filled circles**, not squares (squares only appear at tangent anchor points); toggle buttons expose only "on"/"off" to assistive tech; input silently strips non `[A-Za-z ]` chars; Reset reverts to glyph defaults not preset (undocumented in UI). Footer mixes user onboarding copy with dev file links at equal weight.

**Implemented (same session):** All critique items applied in `adjustable-web-type.html` — h1 + trimmed masthead (`v0.2` only), input hint + filter flash, reset label/title/flash, preset label, footer split (`.footer-hints` / `.footer-dev`), sentence-case legend copy (circles not squares), `.notes` border-top, toggle off-state contrast + `aria-pressed`, main/section ARIA landmarks, API list `no-num` class (numbered only under Install & mount), page title updated.

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

| Slot | Primary pick | Why | License / delivery |
|------|--------------|-----|-------------------|
| Fun / bubbly | [**Rubik Bubbles**](https://fonts.google.com/specimen/Rubik+Bubbles) | Inflated, rounded letterforms; unmistakably bubbly display face | SIL OFL 1.1, Google Fonts |
| Elegant curved serif | [**Instrument Serif**](https://fonts.google.com/specimen/Instrument+Serif) | Soft curves, refined contrast; already used in demo UI chrome | SIL OFL 1.1, Google Fonts |
| Neutral utilitarian sans | [**Source Sans 3**](https://fonts.google.com/specimen/Source+Sans+3) | Adobe’s neutral workhorse; clear, utilitarian, strong readability | SIL OFL 1.1, Google Fonts |
| Rectangular / slab serif | [**Bitter**](https://fonts.google.com/specimen/Bitter) | Contemporary slab with rectangular serifs; designed for screen readability | SIL OFL 1.1, Google Fonts |
| Monospaced | [**IBM Plex Mono**](https://fonts.google.com/specimen/IBM+Plex+Mono) | Neutral, engineered mono; distinct from sans while staying utilitarian | SIL OFL 1.1, Google Fonts |

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

| Preset key | Font reference | Mood tuning |
|------------|----------------|-------------|
| `bubbly` | Rubik Bubbles | Heavy stroke, high curvature, round bowls |
| `instrumentSerif` | Instrument Serif | Lighter stroke, high tension, slight slant |
| `sourceSans` | Source Sans 3 | Neutral defaults, zero curvature |
| `bitter` | Bitter | Heavy stroke, low tension (rectangular slabs) |
| `ibmPlexMono` | IBM Plex Mono | Uniform `width: 92` cell, compact proportions |

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
