# Handoff: "Downloads stopped working"

**Status:** Open — diagnosed, not fixed. Could **not** reproduce in headless Chromium on current `main`.
**Owner of this brief:** investigation done via Playwright against the running dev server.
**Goal for the subagent:** reproduce in a real browser, confirm root cause, ship a fix + a verification.

---

## Symptom (as reported)

User reports the export **downloads stopped working**. No further detail yet on browser,
exact button, or failure shape (button does nothing vs. empty file vs. browser-blocked vs.
console error). **Gathering that is step 1.**

## What "downloads" means in this app

There are exactly two download buttons, both inside the **Export code** modal
(`adjustable-web-type.html`):

- `#export-html-download` — "Download .html" → standalone bundle (`exportCachedHtml`, ~1.7 MB)
- `#export-embed-download` — "Download .html" → embed snippet wrapped in a minimal page (~2 KB)

Both call one helper: `downloadText(filename, text)` (`adjustable-web-type.html:1931`).

Flow: click **Export code** (`#export-code`, handler at `:2615`) → `await wm.toInteractiveBundle()`
builds the bundle → caches to `exportCachedHtml` → fills the textareas → `openExportModal()`.
The download buttons then Blob-ify the cached string and trigger an `<a download>` click.

## What I verified WORKS (current `main`, headless Chromium, dev server on :5173)

- Page loads; wordmark renders (SVG, 12 paths).
- **Export code** opens the modal for **all six presets** (`bubbly`, `instrumentSerif`,
  `sourceSans`, `bitter`, `ibmPlexMono`, `none`) — bundle builds, length ~1.73–1.76 MB, no throw.
- Both **Download .html** buttons produced files on disk (`sculpt-disco-pickle.html`,
  `sculpt-disco-pickle-embed.html`).
- Only console error is a missing `favicon.ico` (harmless 404).

**Conclusion: not a universal/hard break.** The bug is environment- or timing-dependent, or
needs a specific state/browser the headless run didn't hit.

---

## Candidate root causes (ranked)

### 1. Deferred `URL.revokeObjectURL` races the download (MOST LIKELY) — `downloadText` @ `:1931`

```js
a.click();
setTimeout(() => {
  URL.revokeObjectURL(url);
  a.remove();
}, 0);
```

This was **last changed in commit `96dceee`** (swapped a synchronous revoke for `setTimeout(…, 0)`).
The standalone bundle is ~1.7 MB. With a `0 ms` timeout, Chrome can revoke the blob URL before it
has finished reading the blob to start the download → the download **silently cancels**. This is
machine-speed- and load-dependent, which fits "works sometimes / stopped working" and explains why
headless Chromium (fast, idle) didn't hit it. The code comment even admits the race exists; `0 ms`
is a weak guard.
**Try:** bump the timeout to ~1000–5000 ms, or revoke on `window`'s next `focus`/`requestIdleCallback`,
or skip revoke entirely (minor leak, page is short-lived). Test specifically the **large** standalone
file, not just the 2 KB embed.

### 2. Browser blocks the SECOND programmatic download — only if firing both buttons quickly

Chrome shows "site is trying to download multiple files" and blocks the 2nd. Long-standing behavior,
not a regression, but worth ruling out if the user clicks both in sequence.

### 3. Silent early-return masks an empty/failed build — `:2587`

```js
exportHtmlDownload: if (!exportCachedHtml) return; // no user feedback
```

If `wm.toInteractiveBundle()` ever returns null/empty for the user's state, the button does **nothing
with no message**. The build itself is wrapped in try/catch at `:2620` that flashes "Export failed —
see console" — confirm the user is NOT seeing that flash (would mean the modal never opened, a
different bug in `toInteractiveBundle`).

### 4. Recently-merged `sculpt.js` export-bundle change — regression candidate to bisect

The branch consolidation into `main` pulled a ~45-line `lib/sculpt.js` change to the export **bundle
builders** (attribution tooltip: `OUTLINE_ATTRIBUTION_CSS`, `outlineAttributionHtml`, and the two
bundle HTML templates). I verified bundles still build for all presets, but if the user's failure is
"downloaded file is broken/blank when opened" rather than "no file appears", inspect the generated
bundle's HTML/CSS, not the download mechanism.

### 5. Environment: user's browser download settings / disk / extension

Popup or download blocking, "ask where to save" + dismissed dialog, an ad/privacy extension
intercepting blob URLs, full disk. Rule out by trying a different browser & a guest profile.

---

## Reproduction protocol (do this first)

1. **Get specifics from the user:** which browser + version? Which button? What exactly happens —
   no file at all, a file that's empty/corrupt, a "multiple files" prompt, or a console error?
   Does the **Export code modal even open**, or do they see a red "Export failed" flash?
2. `npm run dev` (a server may already be on :5173 — `strictPort` means a 2nd `dev` will error;
   reuse the running one) → open `http://127.0.0.1:5173/adjustable-web-type.html`.
3. Reproduce in the **same browser the user uses**, DevTools open, Console + Network tabs visible.
   Click **Export code**, then each **Download .html**. Watch for: the download appearing in the
   downloads shelf, any console error, the Network entry for the blob.
4. If it works in your normal browser, throttle CPU (DevTools Performance → 6× slowdown) and retry —
   this surfaces the candidate-#1 revoke race on large blobs.

## Fix guidance

- If candidate #1 confirmed: make revoke robust (longer delay / idle callback / no revoke) and
  add a lightweight guard so a failed/empty build flashes a message instead of silently no-op'ing
  (`:2587`).
- Keep the fix in `adjustable-web-type.html` unless the failure is a broken **generated** bundle,
  in which case fix the builder in `lib/sculpt.js`.

## Acceptance criteria

- Both **Download .html** buttons reliably save a file in Chrome, Firefox, and Safari, including
  under CPU throttling, for the **largest** state (standalone bundle, `bubbly`).
- Opening each downloaded file in a fresh tab renders the wordmark correctly.
- No silent no-op: if a download can't be produced, the user sees a flash message.
- Add a note to `docs/snapshot-regression.md` covering the download smoke check.

## Key file references

| What                                                    | Location                                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `downloadText()` helper (suspect #1)                    | `adjustable-web-type.html:1931`                                              |
| Standalone download handler (silent early-return)       | `adjustable-web-type.html:2586`                                              |
| Embed download handler                                  | `adjustable-web-type.html:2592`                                              |
| Export-code button → build + open modal                 | `adjustable-web-type.html:2615`                                              |
| Bundle build (`toInteractiveBundle`) call site          | `adjustable-web-type.html:2626`                                              |
| Export bundle builders + attribution (recently changed) | `lib/sculpt.js` (search `OUTLINE_ATTRIBUTION_CSS`, `outlineAttributionHtml`) |
| Last change to `downloadText`                           | commit `96dceee`                                                             |
