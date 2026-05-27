# Product intent

**Adjustable Web Type is a toy, not a professional type-design tool.**

It lets curious learners — people who are not type designers — play with letterforms and discover parts of anatomy through direct manipulation. Success is tactile exploration, vocabulary built from handles and tooltips, and delight at parametric extremes. It is not a path to shipping text fonts, full axis systems, or studio-grade workflows.

## Primary experience (outline-first)

The default library path loads **real open-source reference font outlines** (via opentype.js) and lets users **deform** them with preset-specific axes (e.g. bubbliness on Rubik Bubbles, serif length on Instrument Serif / Bitter). Drag handles on those axes and optional mouse-follow map to the loaded paths — not to a separate hand-drawn alphabet.

A **static reference-outline** mode remains for side-by-side comparison (no handles). **Parametric letters** (no reference font) are a fallback and pedagogy mode: hand-authored + monoline glyphs with per-letter anatomy handles.

## Audience

- Non–type-designers, students, and curious makers
- Developers embedding a playful wordmark demo
- Agents helping improve interaction, pedagogy, and discoverability

**Not the primary audience:** type designers evaluating production font quality, OpenType feature completeness, or professional kerning/contrast systems.

## What success looks like

- Selecting a reference face and seeing **that font’s outline**, then morphing it with clear axes
- Dragging axis handles (or mouse-follow) and seeing immediate, legible feedback
- Learning terms via tooltips and experimentation
- Fun at extremes without breaking the toy’s purpose
- Export as a shareable embed or curiosity artifact, not as a font source file

## What is explicitly out of scope

- Shipping a complete text font or variable-font product
- Full contrast axes, pair kerning, optical sidebearing systems, ink traps, OTF/TTF export
- Per-anchor editing of every outline point (vector-font-editor scope)
- Professional QA bars (hinting, cross-platform rendering parity, large multilingual coverage)

## Guidance for agents and reviewers

When reviewing or extending this project:

1. **Prioritize outline deformation + preset axes** for font presets; keep parametric `Wordmark` for `none` preset and fallback glyphs.
2. **Distinguish gaps:** “Missing for a font” ≠ “Missing for this toy.”
3. **Type-design expertise still applies** for naming anatomy, mapping params to design language, and spotting when extremes confuse learners.
4. **Do not refactor toward a full font editor** unless the user explicitly changes this intent.

## Related docs

- `docs/agent-learnings.md` — session notes and implementation history
- `docs/THIRD_PARTY_FONTS.md` — OFL attribution for reference faces
- `.cursor/skills/type-design-expert/SKILL.md` — critique skill with library-specific framing
