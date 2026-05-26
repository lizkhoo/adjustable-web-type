# Agent learnings

## Design critique — adjustable-web-type.html (2026-05-26)

Main view reviewed at `http://127.0.0.1:5173/adjustable-web-type.html`. Key issues: no `<h1>` (brand is plain text in masthead); demo + dev docs share one scroll with weak section boundary; footer handle legend is inaccurate — positional anchors render as **filled circles**, not squares (squares only appear at tangent anchor points); toggle buttons expose only "on"/"off" to assistive tech; input silently strips non `[A-Za-z ]` chars; Reset reverts to glyph defaults not preset (undocumented in UI). Footer mixes user onboarding copy with dev file links at equal weight.

**Implemented (same session):** All critique items applied in `adjustable-web-type.html` — h1 + trimmed masthead (`v0.2` only), input hint + filter flash, reset label/title/flash, preset label, footer split (`.footer-hints` / `.footer-dev`), sentence-case legend copy (circles not squares), `.notes` border-top, toggle off-state contrast + `aria-pressed`, main/section ARIA landmarks, API list `no-num` class (numbered only under Install & mount), page title updated.

## Stage actions — Copy SVG only (2026-05-26)

Demo page stage footer: single **Copy SVG** button (`#copy-svg`, `btn ghost`) calls `wm.toSVG()` → clipboard. Removed `#open-embed` / Preview UI and embed-code copy helper; `toInteractiveBundle()` remains in `lib/sculpt.js` for API/docs use.

## Preview blank after Export code strings (2026-05-26)

`buildExportCode()` in `adjustable-web-type.html` included a literal `'</script>'` inside the page's own `<script>` block (`'<script src="lib/sculpt.js"></script>'`). HTML parsers close the script at that token even inside a JS string, so bootstrap never reached `mount()` and `#stage` stayed empty. Fix: escape as `'<\/script>'` (same pattern already used for the closing tag in that helper).

## UI palette (2026-05-26)

Demo + docs page (`adjustable-web-type.html`) use only black (`#0a0a0b`), white, cool greyscale (`#f6f7f9` … `#525860`), and dark ultramarine highlight (`#1a2f6e`). Matching handle/tooltip colors live in `lib/sculpt.js`.

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
