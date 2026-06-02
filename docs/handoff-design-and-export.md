# Handoff — path-α close-out: design polish + export end-user validation

**Created:** 2026-06-01 · **Status:** active roadmap for the final two phases.

This doc hands off the last stretch of path α. The engine work is done; what
remains is **polish** (judgement calls best made in Claude Design) and a
**real end-user export test**. It is a spec to _follow_, paired with a runnable
workflow at `.claude/workflows/design-and-export.js`.

---

## Where the project stands

All implementation briefs in `docs/briefs/path-alpha-landing.md` have landed:

| Brief | What                                                              | State              |
| ----- | ----------------------------------------------------------------- | ------------------ |
| 1     | `AnatomyDeformWordmark` + per-preset pipeline routing             | ✅ committed       |
| 2     | Per-preset polish (descenderDepth, mono toggle, anchor overrides) | ✅ committed       |
| 3a–3d | Handle math (weight / height / serifLength / width)               | ✅ committed       |
| 5     | Richer Export Code UX (standalone + embed)                        | ✅ committed       |
| 7     | Per-letter handle overrides + counter contour                     | ✅ committed       |
| 8     | Interaction polish (bubbly axes, on-edge nodes, tooltip, cursor)  | ✅ committed       |
| 9     | Code-review fixes (node tracking + counter correctness)           | ✅ committed       |
| 10    | Code-review cleanup (dedup, sampling, detector, dead code)        | ✅ committed       |
| 4     | Cleanup + doc alignment (`docs/API.md`, README, retire prototype) | ⏳ in working tree |

Plus a post-brief change: **`weight` switched from offset-path dilation to a
round-joined stroke overlay** so letters can go boldly heavy and bleed into
their neighbors (range 0→160). See `docs/agent-learnings.md` for the rationale.

> **Prerequisite for everything below:** Brief 4 must be **committed** and the
> working tree clean. The design review reads the docs in their final state, and
> the export phase writes new files. Confirm with `git status` first.

**Shared-branch etiquette:** work happens on
`cursor/font-starter-recommendations-ab18`, sometimes with more than one agent
in the tree. Before committing/pushing, `git fetch` and confirm a fast-forward;
never force-push; don't touch other agents' worktrees under `.claude/worktrees/`.

---

## Phase A — Brief 4 (cleanup + doc alignment) — _owner: brief-4 agent_

The closing housekeeping brief. DoD (verbatim targets): no references to
`adjustable-web-type.prototype.html` remain; `docs/API.md` exists and covers the
public surface; README reads as "library + demo/configurator/exporter site";
`docs/PRODUCT_INTENT.md` describes per-preset routing; new `agent-learnings.md`
and `CHANGES.md` entries summarize the path-α landing. **Verify these before
starting Phase B** — they are the inputs the doc review grades.

---

## Phase B — Design & content polish — _owner: Claude Design (or the workflow)_

Goal: comment on UI and content polish across the **demo website** and the
**documentation**. This is commentary/recommendations, not a code rewrite —
route concrete dev changes to a code agent; keep visual/copy judgement calls in
Claude Design.

**Anchor on product intent** (`docs/PRODUCT_INTENT.md`): a _toy_ for
non-type-designers to discover letter anatomy through interaction — success is
tactile play, vocabulary via handles/tooltips, and delight at extremes. Do not
grade it as a professional type tool.

**Rubric (the four review dimensions — also encoded in the workflow):**

1. **Demo UI / visual polish** — `adjustable-web-type.html` served via
   `npm run dev`. Visual hierarchy, spacing/rhythm, control affordances,
   handle + tooltip legibility at display scale, the Export Code modal layout,
   edge/empty states, responsiveness. Screenshot the extremes (heavy weight,
   max counter, bubbly).
2. **Demo content / microcopy** — button/label wording, tooltip anatomy labels,
   instructional copy, the in-page developer-docs section, export-modal
   explanatory text. Tone for a curious non-expert; flag jargon and gaps.
3. **Documentation** — `README.md`, `docs/API.md`, `docs/PRODUCT_INTENT.md`,
   `docs/ARCHITECTURE.md`, `docs/adr/`. Clarity, completeness, and **accuracy vs
   `lib/sculpt.js`** (spot-check API claims against the code). Does the README
   onboard a fresh visitor to the right mental model?
4. **Accessibility & interaction UX** — keyboard operability, ARIA/roles on the
   custom preset picker + toggles, focus visibility, contrast, touch-action /
   pointer affordances, discoverability of per-letter handles.

**Deliverable:** located, severity-tagged findings, each tagged
`claude-design` (visual/copy call) or `code-fix` (concrete dev change).

---

## Phase C — Export end-user validation — _owner: code agent / the workflow_

Goal: prove the library's export works the way a **library consumer** uses it,
and leave a new example page behind.

The Export Code modal emits two formats:

- **Standalone bundle** — `wm.toInteractiveBundle()`, sculpt.js inlined; opens
  and runs on its own.
- **Embed snippet** — a `<div id>` + `<script src="<your-host>/sculpt.js">`
  (URL configurable, default `./sculpt.js`) + a boot script
  `SculptLettering.<Engine>.fromState(state).then(wm => wm.mount('#id'))`.
  Anatomy faces use `AnatomyDeformWordmark`; bubbly (outline-deform) also needs
  opentype.js + `setOpentypeParser`. **This is the realistic end-user path.**

**Steps:**

1. Configure a representative wordmark per engine in the demo (an anatomy preset
   with a few handles moved incl. heavy weight; the bubbly preset).
2. Copy the **embed snippet** for each and assemble a new
   `examples/end-user-embed.html` that hosts `sculpt.js` at a real relative URL
   (and opentype.js for bubbly) — a clean page a developer could open directly.
3. Serve it and verify with Playwright: renders identically to the demo,
   handles are present and **dragging one mutates the letterform**, console is
   clean (favicon 404 only). Smoke-test the standalone bundle too.
4. Report parity / interactivity / console cleanliness / created path / gaps.

**Deliverable:** `examples/end-user-embed.html` (committed) + a pass/fail report.
Only add files under `examples/`; don't modify `lib/sculpt.js` or the demo.

---

## Running the workflow

`.claude/workflows/design-and-export.js` operationalizes Phases B + C:
parallel reviewers → export validation → a synthesized, prioritized report that
tags each item `claude-design` vs `code-fix`.

```
Workflow({ name: "design-and-export" })
```

Phase B can instead be performed directly in **Claude Design** using the rubric
above — the workflow is the automated equivalent, not a replacement for a
human-driven design pass. Phase C is the automated final gate either way.

**Definition of done for the close-out:** Brief 4 committed; design-review
commentary produced and triaged; `examples/end-user-embed.html` renders with
parity + working handles + clean console; report shows no blocker/high code
issues outstanding.
