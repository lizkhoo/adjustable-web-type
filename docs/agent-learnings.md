# Agent learnings

## Open-source font starters for sculpt-lettering (2026-05-21)

Users asked for four popular OFL/Google Fonts starter categories: fun/bubbly, elegant curved serif, neutral utilitarian sans, slab serif.

### Recommended defaults (one per slot)

| Slot | Primary pick | Why | License / delivery |
|------|--------------|-----|-------------------|
| Fun / bubbly | [**Rubik Bubbles**](https://fonts.google.com/specimen/Rubik+Bubbles) | Inflated, rounded letterforms; unmistakably bubbly display face | SIL OFL 1.1, Google Fonts |
| Elegant curved serif | [**Instrument Serif**](https://fonts.google.com/specimen/Instrument+Serif) | Soft curves, refined contrast; already used in demo UI chrome | SIL OFL 1.1, Google Fonts |
| Neutral utilitarian sans | **Inter** | Designed for UI density and neutrality; ubiquitous reference for “default sans” | SIL OFL 1.1, Google Fonts |
| Slab serif | **Roboto Slab** | Strong rectangular serifs, familiar workhorse, good weight range | Apache 2.0, Google Fonts |

### Strong alternates

- **Bubbly:** Fredoka, Baloo 2, Nunito
- **Elegant serif:** Cormorant, Fraunces, Lora
- **Neutral sans:** Source Sans 3, IBM Plex Sans, Noto Sans
- **Slab:** Zilla Slab, Bitter, Arvo

### Implementation notes (when adding a font picker)

- Prefer Google Fonts CSS2 URLs or self-hosted WOFF2 for embed demos; all above are web-ready.
- Map each font to a **preset** (`defaults` + selective `glyphParams`), not to raw SVG outlines — sculpt-lettering tunes parameters, fonts are mood references.
- Demo already uses Instrument Serif / Instrument Sans / JetBrains Mono for chrome, not for sculpted glyphs.
