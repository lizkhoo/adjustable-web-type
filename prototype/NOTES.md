# Prototype notes — per-letter bubbliness / amplitude

**Status:** throwaway prototype, awaiting a verdict. Delete this folder once the
winner is folded into `lib/sculpt.js`.

## Question

Today the Rubik Bubbles face (`DeformableOutlineWordmark`) exposes `bubbliness`
and `amplitude` as **two global axis sliders** — every letter shares one value.
We want them **per-letter**, with control attached to each glyph, so one letter
can be wildly bubbly while its neighbour stays calm. What should that control
look and feel like?

## How to run

Dev server (`npm run dev`), then:
`http://127.0.0.1:5173/prototype/per-letter-bubbles.html`
Switch models with the floating bar, the `←`/`→` keys, or `?variant=A|B|C`.

The prototype fakes the layout (each letter is its own one-glyph wordmark) but
the deformation is real. The real rebuild would instead carry per-glyph axis
state inside a single wordmark.

## The three interaction models

- **A — Orbiting twin nodes.** Two dots flank each letter (filled = bubbliness,
  hollow = amplitude); drag vertically to set the value. Spatial, matches the
  existing anatomy-handle vocabulary, but adds 2 nodes × N letters of clutter.
- **B — Docked mini-sliders.** Two labelled `b`/`a` sliders under each letter.
  Most legible and discoverable; least "tactile", and eats vertical space.
- **C — Drag-on-the-glyph.** No chrome at rest; press a letter and drag —
  x = bubbliness, y = amplitude, with a crosshair while dragging. Most
  delightful/direct, lowest discoverability (needs a hint or onboarding).

## Verdict

> _TBD — Liz to pick a winner (or a hybrid, e.g. C's gesture + B's readout)._
> Once chosen, fold into `lib/sculpt.js` as real per-glyph axis state and
> delete `prototype/`.
