# Handoff — per-preset pipeline prototype

**Status:** Draft. The grilling session that produced this is still in progress; bring findings back to that session before any production change to `lib/sculpt.js`.

**Prototype:** [`adjustable-web-type.prototype.html`](../adjustable-web-type.prototype.html) — run `npm run dev` and open `http://127.0.0.1:5173/adjustable-web-type.prototype.html`. The page mounts whichever pipeline each preset declares in its `PRESET_PIPELINES` map (top of the page's inline script). A **Pipeline override** segmented control lets you force the same preset through the other pipeline for direct comparison. The state panel under the toolbar shows declared vs. active pipeline and which controls each pipeline surfaces.

**Routing decisions from the grilling session (2026-05-26):**

| Preset | Pipeline | Reason |
|---|---|---|
| `bubbly` | outline-deform | Shape-novelty mood; the joke *is* the outline. |
| `instrumentSerif` | parametric | Anatomy-driven; serif/x-height/bowl handles are the point. |
| `bitter` | parametric | Anatomy-driven (slab terminals = serif anatomy). Use parametric `serifLength` per glyph + `strokeJoin: miter`. |
| `sourceSans` | parametric | Anatomy-driven; per-letter `archWidth`/`bowlWidth`/`xHeight` handles beat a single global `width` axis. |
| `ibmPlexMono` | parametric | Anatomy-driven; `monoCell` constraint + per-glyph proportions are the interesting tunables. |

**Classification rule for future presets:** shape-novelty presets are outline-deform; everything in the readable-text-face family is parametric.

**Handle vocabulary decision (locked):** the two pipelines deliberately diverge.
- outline-deform shows **preset axes only** (global slider + right-side axis handle).
- parametric shows **per-letter anatomy handles only** — no global "preset axis" slider equivalent. If a wordmark-level tuning gesture is wanted later it's a separate design question, not part of this prototype.

**What the prototype should validate:**

1. Does the parametric Instrument Serif read as Instrument Serif when handles render against the existing `defaults` + `glyphParams`? If not, what calibration gaps stand out?
2. Same for Bitter (slab terminals via `serifLength` glyph params + miter joins).
3. Same for Source Sans and IBM Plex Mono. For mono, confirm the `monoCell: 92` + `monoAdjustedAdvance()` layout still works through parametric `Wordmark`.
4. Are there anatomy handles that *should* exist on serif/sans/mono glyphs but don't (e.g. `contrast`, `terminalAngle`, `slabWidth`)? List them — don't add them yet.

**Finding from the prototype (2026-05-26) — bring to the grilling session:**

The answer to question 1 is **no — and the gap is architectural, not calibration.** Today's parametric `Wordmark` builds glyphs from a hand-authored Bezier registry (`lib/sculpt.js` glyph modules) and overlays the preset's `defaults` + `glyphParams`. **The WOFF outline of the reference face never participates in the starting shape.** Picking `instrumentSerif` and forcing parametric in the prototype produces a generic monoline-with-serifs that doesn't look like Instrument Serif because Instrument Serif isn't the source — the hand-authored Bezier registry is.

The expectation from the grilling session is: the parametric pipeline should **start from the WOFF outline** of the reference face, then expose per-letter anatomy handles (x-height, bowl width, serif length, …) that deform it from there. The prototype now renders a static `OutlineWordmark` next to the parametric output so the gap is visually obvious.

That pipeline does not exist yet. It is not just a re-tune of the existing `Wordmark`; it's a new engine that combines `DeformableOutlineWordmark`'s WOFF-loading + per-glyph `baseCommands` with `Wordmark`'s per-letter handle topology — but the handles need to bind to anchor points on the real outline rather than to slots on a hand-authored Bezier template.

**Open architectural questions to resolve:**

1. Does the parametric pipeline get rebuilt on top of WOFF outlines (new engine), or do we go the other direction and calibrate the hand-authored glyph registry per-preset so it *visually* matches the WOFF?
2. If new engine: what's the handle vocabulary, and how does each handle map to a deformation of the WOFF outline?
3. What does the hand-authored Bezier registry become? Pure fallback for `none`-style "no reference font"? Or deleted?

**Owner's decision (2026-05-26):** can't answer in the abstract. Need to *see* both candidate paths on the problematic presets (`instrumentSerif`, `bitter`, `sourceSans`, `ibmPlexMono`) before committing. Build both prototypes below, then bring them back to the grilling session for the call.

---

## Two paths to prototype side-by-side

Both prototypes should live under `adjustable-web-type.prototype.html` (or branch into separate pages) so the comparison is direct. **Bubbly is out of scope** — its pipeline is settled (outline-deform with `bubbliness` axis).

### Path γ — extended outline-deform (cheaper)

Stay in `DeformableOutlineWordmark`. Add anatomy-aware axes for each of the four parametric presets so the user has *multiple* global sliders per preset, not one.

Target axis set per preset:

| Preset | Axes to expose |
|---|---|
| `instrumentSerif` | `serifLength` (exists), `xHeight`, `weight`, `width` |
| `bitter` | `serifLength` (exists, miter), `xHeight`, `weight`, `width` |
| `sourceSans` | `width` (exists), `xHeight`, `weight` |
| `ibmPlexMono` | `width` (exists), `xHeight`, `weight` |

What each axis means as a deformation of the WOFF:
- `xHeight` — vertical scale of the portion of each glyph's outline below cap-height (or below ascender baseline for ascenders). Anchors at baseline; cap-height stays fixed.
- `weight` — outline dilation (offset path) by `t * k` units along the local normal. Approximate; doesn't honor stem-contrast.
- `width` — already implemented (horizontal scale from glyph left).
- `serifLength` — already implemented (baseline stubs).

What the user sees: 2–4 global sliders + right-side axis handles. The picked font's real outline. No per-letter handles.

### Path α — WOFF + per-letter anatomy handles (more expensive; minimal proof)

A new engine that loads the WOFF AND exposes per-letter drag handles bound to anchor points on each glyph's real outline. Don't build it for the whole alphabet yet — build a **minimal proof on one preset, three letters**:

- Preset: `instrumentSerif` (richest anatomy vocabulary).
- Letters: `a`, `o`, `l` (covers bowl + x-height + serif/ascender).
- Anchors per letter (authored by hand into the prototype, not detected):

| Letter | Anchor | Handle binds to |
|---|---|---|
| `a` | top of x-height curve | `xHeight` — scale outline below this point |
| `a` | rightmost bowl point | `bowlWidth` — scale outline horizontally from stem |
| `a` | baseline serif endpoint | `serifLength` — translate endpoint along baseline |
| `o` | top of bowl | `xHeight` |
| `o` | rightmost bowl point | `bowlWidth` |
| `l` | top of ascender | `ascenderHeight` |
| `l` | baseline serif endpoint | `serifLength` |

Other letters in the wordmark fall back to undeformed WOFF. This is enough to show what α *feels* like without committing to author 26+ anchor maps.

What the user sees: real Instrument Serif outline. Dragging the `a`'s x-height handle squishes the actual `a` they're looking at. Other letters in the wordmark sit there undeformed.

---

## What to bring back to the grilling session

1. Two working prototype pages (γ for all four parametric presets, α for `instrumentSerif` × {a, o, l}).
2. A short note for each on what felt good and what felt bad. Where does γ feel cramped (axes-only without per-letter precision)? Where does α feel brittle (one preset's anchor map doesn't transfer)?
3. An estimate of α's full build cost (per-preset × per-letter anchor authoring, plus the outline-deformation primitives) so we can weigh it against γ's "good enough" answer.
4. Resume the grilling session with concrete A/B material in hand. Do not merge prototype branches to main.


## The decision driving this prototype

Picking a font preset (one of `bubbly`, `instrumentSerif`, `sourceSans`, `bitter`, `ibmPlexMono`) should route to **one of two rendering pipelines** based on the preset's character — not a single pipeline applied to all five.

| Pipeline | Engine | What the user sees | Handles |
|---|---|---|---|
| **outline-deform** | `DeformableOutlineWordmark` (lib/sculpt.js:2463) | The real WOFF outline, deformed by one preset-level axis | Preset axis only (e.g. `bubbliness`) |
| **parametric** | `Wordmark` (lib/sculpt.js:1872) | Hand-authored Bézier glyphs tuned to the font's mood | Per-letter anatomy handles (xHeight, bowlWidth, serifLength, etc.) |

Today both engines exist, but **all five font presets route to outline-deform**, with parametric hidden behind the `none` preset. The user's intent is that **each preset declares its own pipeline**. The library should respect that declaration when mounting.

All five presets are now classified (see routing table at the top of this doc). Bubbly stays outline-deform; the other four are parametric. The classification rule is "shape-novelty → outline; anatomy-driven → parametric."

## What "previous behavior was scrubbed" actually means

The current state was reached by these moves (from `docs/agent-learnings.md`):

1. Parametric `Wordmark` shipped first, with per-letter anatomy handles. Presets were `defaults` + `glyphParams` tuning that biased the parametric letters toward each font's mood.
2. User asked for "real font outlines as the default" → `OutlineWordmark` (static, no handles) was added.
3. To restore handles in outline mode, `DeformableOutlineWordmark` was added with preset-level axes (`bubbliness`, `serifLength`, `width`).
4. Demo switched so any font preset mounts `DeformableOutlineWordmark`. Parametric is reachable only via the `none` preset.

The "scrubbed" sensation is the cumulative effect of step 4: anatomy handles still exist in code, but they vanish from the UI as soon as the user picks a named font.

## What to prototype in the other session

Build a **light, throwaway prototype** that demonstrates the per-preset routing — *don't* refactor `lib/sculpt.js` yet. Suggested scope:

1. A copy of `adjustable-web-type.html` (e.g. `adjustable-web-type.prototype.html`) where the preset picker mounts:
   - `DeformableOutlineWordmark` for `bubbly`
   - Parametric `Wordmark` (with `instrumentSerif`'s existing `defaults` + `glyphParams`) for `instrumentSerif`
2. Verify the parametric `Wordmark` path actually shows the Instrument Serif mood with anatomy handles — i.e. x-height handle on `a`, bowl width handle on `o`, serif length handle on letters that declare it (`a`, `e`, `l`, `b`, `c`, `m`, `g`).
3. Note any anatomy handle that *should* exist for serif fonts but doesn't (e.g. is there a `width` handle per letter? a `contrast` axis? a `terminal` handle?).
4. Try the other three presets (`bitter`, `sourceSans`, `ibmPlexMono`) on **both** pipelines and form an opinion about which fits each.

What to bring back to the grilling session:
- Which pipeline each of the three undecided presets should use, and why
- Per-letter anatomy controls that feel missing for serif/sans/mono moods (calibration gaps)
- Whether the `defaults` block on each preset still feels right or needs re-tuning when the user actually sees parametric output

## What NOT to do in the prototype

- Don't delete `DeformableOutlineWordmark` or `OutlineWordmark`. The decision to keep both pipelines is settled.
- Don't change the public preset shape (`name`, `fontRef`, `fontUrl`, `license`, `defaults`, `glyphParams`, `axes`). Add a new field if needed (e.g. `pipeline: 'outline' | 'parametric'`) rather than re-keying existing data.
- Don't refactor `Wordmark` / `DeformableOutlineWordmark` internals — pick one of each, mount them side by side, observe.
- Don't write tests yet. The decision tree is still being walked.

## Files to read before starting

- `docs/PRODUCT_INTENT.md` — toy, not a type-design tool. Constrains scope.
- `docs/THIRD_PARTY_FONTS.md` — OFL attribution and the runtime font-loading model.
- `docs/agent-learnings.md` — every prior pivot, especially the entries dated 2026-05-26.
- `CHANGES.md` — sprint 1+2 fixes and the deferred list.
- `lib/sculpt.js:1846` — preset definitions (the five presets + their `defaults`/`glyphParams`/`axes`).
- `lib/sculpt.js:1872` — parametric `Wordmark`.
- `lib/sculpt.js:2463` — `DeformableOutlineWordmark`.
- `adjustable-web-type.html` — the demo; preset picker + mode toggles.

## When the prototype is done

Update this file's **"Still open"** list with answers, attach screenshots or a brief diff, and resume the main grilling session. Do not merge any prototype changes to `main`.
