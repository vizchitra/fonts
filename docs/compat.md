# Browser compatibility results

Measured, not recalled. `src/lib/fonts/slant.browser.test.ts` runs in real
Chromium, WebKit and Firefox under Vitest browser mode + Playwright, and asserts
this matrix on every `pnpm test`. The `/compat` page remains for eyeballing real
Safari, which Playwright's WebKit is not.

## The bug that started this: iOS Safari backslant

Reported on **Safari 18.7, iPhone XR**: Cairo renders leaning **backwards** when
`slnt` is left to the font's default. Desktop Chrome and Safari are fine, so it
only surfaces on an older device — the automated matrix below cannot catch it.

**Cause.** `font-variation-settings` _replaces_ the inherited value rather than
merging with it. Any rule that sets only `'wght'` silently discards an upright
reset further up the tree, and the axis falls back to whatever the engine
decides — which on old iOS is not upright. The `@font-face`
`font-variation-settings` descriptor cannot fix this either: it measures 0.000
in WebKit (see the table below), so it does nothing on exactly the browsers that
need it.

**Fix — component-level, not a global reset.** Never write
`font-variation-settings: 'wght' N` on its own for a font with a `slnt` axis —
always restate `'slnt'`. `RetalicsText` does this even in `plain` mode, where
omitting it would look harmless. `src/lib/fonts/axis-pinning.test.ts` enforces
this across the codebase. `/compat` carries a permanent side-by-side of the
unpinned and pinned cases so the bug can be re-checked on a real device after
any change.

**A first version of this fix instead pinned `html { font-variation-settings:
'slnt' 0 }` in `app.css`, and it broke `font-style: italic` everywhere, on
every engine — not just old iOS.** `font-variation-settings` replaces the
inherited value rather than merging with it, so that pin was inherited by
every descendant, including ones asking for `font-style: italic` against
Cairo's bare `oblique` face. An inherited **explicit** `slnt` value blocks the
browser's automatic `font-style` → `slnt` mapping, so the shipped italic
technique below silently stopped slanting, on desktop and mobile alike.
Confirmed with a real-browser measurement (`slant.browser.test.ts`, "why
app.css must never pin slnt on an ancestor") before removing it — shear was
exactly `0` in Chromium, WebKit and Firefox with the pin nested above the
italic specimen. The pin is removed; `app.css` only forbids synthesised
oblique now (`font-synthesis: weight`), and `axis-pinning.test.ts` asserts the
pin never comes back. `/compat` carries a matching hazard demo so this stays
checkable on a real device.

This is also why the desktop matrix is necessary but not sufficient, and why the
`/compat` page still exists alongside the automated tests.

## The second real-device finding: real Safari does not do the automatic mapping at all

Checking `/compat` again on the same iPhone XR (Safari 18.7) after the backslant fix landed
surfaced a second, distinct bug: the "SHIPPED" row (`font-style: italic` against the bare
`font-style: oblique` face) rendered **upright**, and so did both halves of the hazard demo —
including the left half, which has no ancestor pin and should be the unambiguous "this works" case.

**Cause.** Real Safari 18.7 does not perform the automatic `font-style` → `slnt` mapping onto a
variable font at all, pin or no pin. This is not the ancestor-pin hazard recurring — it is a
different, simpler failure: there is no automatic mapping happening for this technique to be
blocked. Playwright's bundled WebKit is a newer, different build that does perform the mapping (see
the Results table below, "font-style: italic against a bare `oblique` face" measures correct in all
three engines there), which is exactly the "Playwright's WebKit is not Safari" caveat this file
already carries, now confirmed the hard way rather than just asserted. This is the same class of
cross-engine divergence the CSSWG's ongoing `ital`/`font-style` interaction discussion is about — see
"Still to test" below for the tracked upstream issues.

**Fix.** Stop depending on the automatic mapping as the _mechanism_ for correctness. Set
`font-variation-settings: 'slnt' -11` directly at the use site — the technique this file's Results
table already measured as correct in all three engines with no automatic translation involved, so
there is nothing for any engine's support (or lack of it) to disagree about. It also has a second
advantage discovered alongside the ancestor-pin hazard: an element's own explicit declaration always
wins over an inherited one, so this technique is immune to that hazard too, on every engine,
including real Safari. Confirmed with `slant.browser.test.ts`, "an explicit slnt at the use site
survives an ancestor pin, unlike italic".

`font-style: italic` is kept as a semantic hint (useful to assistive technology and print
stylesheets) but is no longer the thing consumers should rely on for correct rendering — `/compat`'s
table and hazard demo were both updated to say so explicitly, and to demonstrate the explicit-`slnt`
technique surviving the same pinned-ancestor hazard that defeats `font-style: italic`.

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

**Read this table as "the technique in isolation," not "what actually
renders on the page."** Every row is measured on a specimen with no ancestor
CSS around it, and only in the three engines this repo's test suite can drive.
That is precisely why the `font-style: oblique` + `font-style: italic` row
below can measure 0.194/0.193/0.194 here and _still_ render upright both under
an `html`-level `slnt` pin (see the section above) and, separately, on real
Safari with no pin at all (see "The second real-device finding" above) —
neither is a property this table can see: one is an ancestor, the other is an
engine this table's tooling cannot reach. If a technique that measures fine
here ever looks broken on the actual page or a real device, suspect one of
those two, not this table.

| Technique                                                       | Chromium |    WebKit | Firefox | Verdict                               |
| --------------------------------------------------------------- | -------: | --------: | ------: | ------------------------------------- |
| `font-variation-settings: 'slnt' -11` at use site               |    0.194 |     0.193 |   0.194 | ✅ **recommended**                    |
| `@font-face { font-style: oblique }` + `font-style: italic`     |    0.194 |     0.193 |   0.194 | ⚠️ correct here, fails on real Safari |
| `@font-face { font-style: oblique 0deg 11deg }` + `italic`      |    0.444 |     0.249 |   0.194 | ❌ broken in 2 of 3                   |
| …same, plus `font-synthesis: none`                              |    0.194 |     0.193 |   0.194 | ✅ but needs use-site CSS             |
| `font-style: oblique 11deg` at use site, normal face            |    0.000 |     0.000 |   0.194 | ❌ ignored outside Firefox            |
| `@font-face { font-variation-settings: 'slnt' -11 }` descriptor |    0.194 | **0.000** |   0.194 | ❌ silently dead in WebKit            |
| `font-style: italic` on a normal-only face                      |    0.249 |     0.249 |   0.249 | synthetic skew, no axis               |
| `italic` + `slnt -11` on a normal-only face                     |    0.444 |     0.249 |   0.249 | ❌ double-slant                       |
| GPOS kerning toggles via `font-kerning`                         |       ✅ |        ✅ |      ✅ |                                       |
| `slnt` changes advance width                                    |       no |        no |      no | why pixels are needed                 |

## Decision

**Consumers must set `font-variation-settings: 'slnt' -11` explicitly at the use site for italic
Cairo — do not rely on `font-style: italic` alone.** See "The second real-device finding" above:
real Safari 18.7 does not perform the automatic `font-style` → `slnt` mapping this relies on at all,
confirmed on an iPhone XR. `font-style: italic` can still be written alongside it as a harmless
semantic hint, but the explicit `font-variation-settings` value is what makes rendering correct, on
every engine, unconditionally.

The paragraphs below are a separate, still-valid decision about the `@font-face` **descriptor**
`font-src/css.py` emits — they answer "what should the face declare," not "what should a consumer
write." Both decisions apply at once: a bare `oblique` descriptor at the face level, and an explicit
`slnt` value at every use site.

**Ship `font-style: oblique` — the bare keyword, no angle range.** It is the only
`@font-face`-level technique that is correct in all three engines with no extra
CSS at the use site. This is what `font-src/css.py` emits.

Do not "improve" it into an angle range. `oblique 0deg 11deg` looks more precise
and is wrong twice over:

- **Chromium stacks** a 14° synthetic skew on top of the real axis — 0.194 + 0.249
  = 0.444, more than double the intended lean.
- **WebKit discards** the axis and synthesises instead, landing on a flat 0.249.

**The angle-range trap is conditional, not absolute — and that's an argument for the
bare keyword, not against the trap being real.** `font-synthesis: weight` (which
`app.css` sets globally, for unrelated reasons — to stop synthetic bold-italic
elsewhere) happens to neutralise Chromium's and WebKit's failure modes here: both
turn out to be synthesis-shaped (Chromium stacks a synthetic skew; WebKit prefers
synthesis over consulting the axis), so forbidding synthesis removes exactly the
broken part and both measure correctly by accident. Confirmed with
`slant.browser.test.ts`, "the oblique-range trap is neutralised by
font-synthesis: weight". This does **not** make the angle-range technique safe to
ship — `fonts.css` controls the `@font-face`, not what `font-synthesis` a consumer
sets, so a consumer who adopts the range form without independently getting
`font-synthesis` right still hits the double-slant. The bare `oblique` keyword needs
no such cooperation: it measures correctly with or without any `font-synthesis`
rule anywhere. That is the sharper, complete reason to prefer it, not just "broken
in 2 of 3 engines."

Reproducing the trap on `/compat` itself (which inherits `app.css`'s
`font-synthesis: weight`) took three wrong turns, each disproved against a real
browser rather than assumed — recorded in the row's own CSS comment in
`+page.svelte` as a durable warning: `font-synthesis: auto` is not a valid value
and is silently dropped; `revert` does not mean "ignore all author CSS" — since
`font-synthesis` is an _inherited_ property, `revert` falls back to the inherited
value (the very ancestor pin it was meant to escape) when no lower-origin rule
exists; and the full Level 4 initial value
(`weight style small-caps position`) got the whole declaration dropped by the dev
server's CSS pipeline for Chromium/WebKit specifically, because `position` isn't
broadly supported and whatever browser-targeting logic strips it dropped the
entire shorthand rather than degrading gracefully. `font-synthesis: weight style` —
the original, universally-supported two-value form — is what actually works.

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

- **Whether `font-style: oblique` (bare, no italic) succeeds on real Safari where `italic` fails.**
  Per [CSS Fonts 4's font-style-matching algorithm](https://drafts.csswg.org/css-fonts-4/#font-style-matching),
  `italic` and `oblique` are matched differently: `italic` goes through an italic-to-oblique fallback
  step, while a bare `oblique` value matches a face's own `font-style: oblique` descriptor directly —
  one less layer of indirection. Whether that difference matters on real Safari, or whether it fails
  to map any `font-style` value onto `slnt` at all regardless of keyword, is genuinely unknown; added
  as its own `/compat` row (`oblique-bare`) with an honest "untested" verdict rather than a guess.
  Playwright measures it identically to `italic` in all three engines, so it can't answer this either.
  If `oblique` alone turns out to work, that's the simpler, spec-literal fix — no explicit
  `font-variation-settings` needed at every use site — rather than bypassing font-style matching.
- **Whether real Safari ever adds the automatic `font-style` → `slnt` mapping.** Real, findable bug
  reports exist for this exact gap — Chromium
  [Issue 1064756](https://bugs.chromium.org/p/chromium/issues/detail?id=1064756), WebKit
  [Bug 209565](https://bugs.webkit.org/show_bug.cgi?id=209565) — plus an active CSSWG mailing-list
  thread on clarifying the `ital`/`font-style` interaction for variable fonts, so this is a live area
  of spec and engine work, not a permanently stuck gap. No confirmed fix-landed version for real
  Safari as of this writing. Practically this doesn't block anything: `slant.browser.test.ts` already
  encodes the explicit-`slnt` technique as the one nothing here depends on the mapping for, so there
  is nothing to "wait and revert" even if some future Safari starts supporting it.
- `font-weight` range descriptors, and Fira Code's 300 default rendering Light
  when weight is unset.
- `font-stretch: 75% 100%` vs `font-variation-settings: 'wdth'` for Plex.
- `font-feature-settings` vs `font-variant-*` precedence.
- Whether a custom axis (`RETA`) is honoured, once Phase 2 produces one.
- Lazy loading: a latin-only page should fetch only the `latin` subset, and
  adding a box-drawing character should pull `symbols` and nothing else.
