# Agent learnings

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
