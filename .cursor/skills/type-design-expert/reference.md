# Type Design Expert — Reference

## Variable-font axis vocabulary

| OpenType axis | Tag | Maps to in parametric SVG type |
|---------------|-----|--------------------------------|
| Weight | wght | `strokeWeight` (uniform only here) |
| Width | wdth | `width`, `bowlWidth`, `archWidth` |
| Slant | slnt | `slant` |
| Optical size | opsz | not implemented — would scale overshoot/counter detail |
| Grade | GRAD | subtle weight without width change — not implemented |

## Anatomy glossary (compact)

- **Aperture** — opening into counter (a, e, c, s)
- **Bowl** — curved stroke enclosing counter
- **Counter** — enclosed negative space
- **Ear** — small stroke on g (monoline only here)
- **Finial / terminal** — stroke ending
- **Link / crossbar** — horizontal join (e, t, f, H)
- **Shoulder** — curve from stem into bowl (n, h, m)
- **Spur** — small projection at serif base
- **Stem** — primary vertical stroke
- **Tittle** — dot on i/j (`dotGap`)
- **Vertex** — corner where strokes meet (monoline W, V)

## Optical corrections type designers expect

Often missing in pure geometric parametric systems:

- Overshoot at cap/x-height/baseline
- Stem thickening at joins (ink traps inverse)
- Horizontal vs vertical stroke weight balance (contrast)
- Round vs flat sidebearings per letter
- Diagonal stroke compensation

When critiquing, note which corrections are absent vs intentionally deferred.

## Legibility red flags at extremes

- `aperture` → 0: counter closes, a/e/c become blobs
- `bowlTopTension` / `curvature` max: pinched or inflated curves, uneven grey
- `strokeWeight` max + narrow `width`: counters fill in
- `slant` extreme: verticals shear, spacing rhythm breaks
- `mouseFollow` + `tangentOnly: false`: all params slam to clamps
