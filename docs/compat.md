# Browser compatibility results

Measured, not recalled. `src/lib/fonts/slant.browser.test.ts` runs in real
Chromium, WebKit and Firefox under Vitest browser mode + Playwright, and asserts
this matrix on every `pnpm test`. The `/compat` page remains for eyeballing real
Safari, which Playwright's WebKit is not.

## Why this needed measuring

Cairo has no italic masters. Its "italic" is just `slnt -11`, so every way of
asking for italic Cairo reaches the same axis by a different route — and the
routes are not equivalent.

It also cannot be checked by measuring text. `slnt` barely moves advance widths:
Cairo's `I` goes from 248 to 249 units per 1000 and `A`, `O`, `V`, `W` do not
move at all, identically for `slnt -11` and `+11`, so the change does not even
carry a sign. The tests therefore **screenshot a specimen and measure the shear
of its ink** — how far the top of a glyph sits right of its bottom, over the
height between them. Correct is `tan(11°) = 0.194`.

## Results

Shear measured on a 200px `I`. Correct = **0.194**. Synthetic skew is 14° = 0.249.

| Technique                                                       |  Chromium |    WebKit |   Firefox | Verdict                    |
| --------------------------------------------------------------- | --------: | --------: | --------: | -------------------------- |
| `font-variation-settings: 'slnt' -11` at use site               |     0.194 |     0.193 |     0.194 | ✅ works everywhere        |
| **`@font-face { font-style: oblique }` + `font-style: italic`** | **0.194** | **0.193** | **0.194** | ✅ **shipped**             |
| `@font-face { font-style: oblique 0deg 11deg }` + `italic`      |     0.444 |     0.249 |     0.194 | ❌ broken in 2 of 3        |
| …same, plus `font-synthesis: none`                              |     0.194 |     0.193 |     0.194 | ✅ but needs use-site CSS  |
| `font-style: oblique 11deg` at use site, normal face            |     0.000 |     0.000 |     0.194 | ❌ ignored outside Firefox |
| `@font-face { font-variation-settings: 'slnt' -11 }` descriptor |     0.194 | **0.000** |     0.194 | ❌ silently dead in WebKit |
| `font-style: italic` on a normal-only face                      |     0.249 |     0.249 |     0.249 | synthetic skew, no axis    |
| `italic` + `slnt -11` on a normal-only face                     |     0.444 |     0.249 |     0.249 | ❌ double-slant            |
| GPOS kerning toggles via `font-kerning`                         |        ✅ |        ✅ |        ✅ |                            |
| `slnt` changes advance width                                    |        no |        no |        no | why pixels are needed      |

## Decision

**Ship `font-style: oblique` — the bare keyword, no angle range.** It is the only
`@font-face`-level technique that is correct in all three engines with no extra
CSS at the use site. This is what `font-src/css.py` emits.

Do not "improve" it into an angle range. `oblique 0deg 11deg` looks more precise
and is wrong twice over:

- **Chromium stacks** a 14° synthetic skew on top of the real axis — 0.194 + 0.249
  = 0.444, more than double the intended lean.
- **WebKit discards** the axis and synthesises instead, landing on a flat 0.249.

Two findings worth carrying into Phase 2 and 3:

1. **The old hand-written `font.css` was broken in Safari all along.** Its Cairo
   italic used a `font-variation-settings` `@font-face` descriptor, which measures
   0.000 in WebKit — the text simply never leaned. It is preserved as a live test
   rather than a reference file.
2. **Never put `font-style: italic` on a family with no italic face.** Every
   engine synthesises a 14° skew, and Chromium adds it to whatever the axis is
   already doing. `font-synthesis: none` suppresses it.

## Caveats

- **Playwright's WebKit is not Safari**, and is certainly not old Safari. This
  matrix pins cross-engine behaviour and catches regressions; it does not settle
  "does Safari 15 do this". Use `/compat` in a real browser for that, and record
  the Safari version tested.
- Measurements are from one 200px glyph on one platform. Antialiasing makes the
  last digit noise; the tolerances in the test are set accordingly.

## Still to test

- `font-weight` range descriptors, and Fira Code's 300 default rendering Light
  when weight is unset.
- `font-stretch: 75% 100%` vs `font-variation-settings: 'wdth'` for Plex.
- `font-feature-settings` vs `font-variant-*` precedence.
- Whether a custom axis (`RETA`) is honoured, once Phase 2 produces one.
- Lazy loading: a latin-only page should fetch only the `latin` subset, and
  adding a box-drawing character should pull `symbols` and nothing else.
