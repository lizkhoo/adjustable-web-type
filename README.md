# Adjustable Web Type

A small in-browser toy for playing with letterforms. Pick one of five open-source reference fonts, drag the handles, watch the wordmark respond. Built for curious learners and developers embedding playful demos — not for shipping production type.

> See `docs/PRODUCT_INTENT.md` for the full statement of intent. The short version: tactile exploration, vocabulary built from handles and tooltips, delight at parametric extremes. Not a path to OTF/TTF export.

## Run it

```bash
npm install
npm run dev
# open http://127.0.0.1:5173/adjustable-web-type.html
```

The library is one file at `lib/sculpt.js` (~3.2k LOC, UMD-ish). The demo is `adjustable-web-type.html`. There is no build step beyond Vite dev tooling.

## Where to read next

For incoming agents and returning humans:

1. **[`docs/PRODUCT_INTENT.md`](docs/PRODUCT_INTENT.md)** — what this project is and isn't. Read first.
2. **[`CONTEXT.md`](CONTEXT.md)** — glossary of canonical terms (preset, pipeline, anatomy handle, preset axis, mood tuning). Disambiguates fuzzy language before you touch code.
3. **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** — file-by-file map of `lib/sculpt.js` and the demo page; the two-pipeline model (outline-deform vs parametric).
4. **[`docs/adr/`](docs/adr/)** — Architecture Decision Records. Read before changing the shape of the public API or the pipeline model. The current ADR (0001) is marked **provisional** pending the in-flight prototype comparison.
5. **[`docs/handoff-pipeline-prototype.md`](docs/handoff-pipeline-prototype.md)** — the in-flight prototype that will resolve the parametric-engine question. If you start work on the engine, read this first.
6. **[`docs/snapshot-regression.md`](docs/snapshot-regression.md)** — manual visual-regression checklist. Run after any change to outline deformation or the parametric param engine.
7. **[`docs/THIRD_PARTY_FONTS.md`](docs/THIRD_PARTY_FONTS.md)** — OFL attribution and the runtime font-loading model.
8. **[`docs/agent-learnings.md`](docs/agent-learnings.md)** — chronological session journal. Useful when "why does it work this way?" doesn't have an ADR yet.
9. **[`CHANGES.md`](CHANGES.md)** — sprint-by-sprint patch log + deferred items.

## What the demo does

Pick a **starting point** (`Rubik Bubbles`, `Instrument Serif`, `Source Sans 3`, `Bitter`, `IBM Plex Mono`, or `Parametric letters`). Type a word. Drag the handles. Hit **Export code** to download a self-contained interactive HTML bundle (no CDN dependencies for the parametric path; one CDN dep — opentype.js — for the outline path).

## License

The library and demo are this repository's own code (see the file headers). Reference font outlines are loaded at runtime from open-source faces under SIL OFL 1.1 — see `docs/THIRD_PARTY_FONTS.md` for attribution. **Prototype use only**; do not redistribute exported outlines as a substitute for licensing the original fonts.
