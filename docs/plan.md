# VizChitra Fonts — Execution Plan

## Context

VizChitra's display type uses Cairo with a hand-tuned per-character slant effect we call
**Retalics**. Today it exists as two incompatible prototypes copied between projects:

- `docs/LogoTypeReference.svelte` — a hardcoded per-glyph CSS table (`V -4`, `I +8`, `Z 0`, …) that
  also varies per-glyph `letter-spacing` and `wght`.
- `vizchitra/src/lib/utils/slanted.ts` (quoted in `docs/spec.md`) — an _algorithmic_ rule where slant
  derives from a letter's alphabetical distance from m/n (`a`=0, `l`=+11, `o`=−11, `z`=0).

Neither is tunable, neither is comparable to the other, and the values are trapped in component CSS.
Meanwhile Cairo, IBM Plex Sans and Fira Code are copy-pasted into `static/fonts/` across at least
five sibling repos (`live`, `studio`, `differently`, `ticketing`, `vizchitra`), each with its own
drifting `font.css`.

This repo becomes **fonts.vizchitra.com**, and the work splits into three phases:

1. **Retalics Lab** — a typography lab that produces the design data for a `RETA` axis.
2. **Delivery** — serve the font files, a browser-tested `fonts.css`, and usage docs.
3. **VizChitra Sans** — turn Phase 1's data into a real font with a real `RETA` axis.

**Executed in this order, not phase-number order.** Delivery doesn't depend on VizChitra Sans
existing — it already has to serve Cairo, Plex and Fira Code as they are today — so it ships first,
against Cairo, while the font surgery (the part that genuinely takes iterations: masters, `HVAR`,
kerning-across-axis) happens behind a working pipeline instead of blocking it. The swap to VizChitra
Sans later must be a change to `fonts.css` alone, never a second migration across the sibling repos —
see Decision 17 and Phase 2's delivery section for what that requires.

Only Cairo is modified. **IBM Plex Sans and Fira Code are redistributed as-is** — no surgery, no
renaming, no type testing. They are also served as `unicode-range` subsets built by script for web
performance, published alongside the untouched originals; that is a derived delivery artifact, not a
change to the fonts themselves.

### Findings from inspecting the actual font binaries

Verified with fontTools against `/Users/amitkaps/code/live/static/fonts/`:

| Font                              | Axes (min–**default**–max)                    | kern   | Notable GSUB                                  |
| --------------------------------- | --------------------------------------------- | ------ | --------------------------------------------- |
| Cairo latin (60KB, 255 glyphs)    | `wght` 200–**400**–1000, `slnt` −11–**0**–+11 | yes    | `dnom frac numr rvrn` — **no `calt`**         |
| Cairo latin-ext (29KB, 206)       | same                                          | yes    | `locl rvrn` — no `frac`/`dnom`/`numr`         |
| Plex Sans normal/italic (58/68KB) | `wght` 100–**400**–700, `wdth` 75–**100**–100 | yes    | `ccmp dnom frac liga numr rvrn`               |
| Fira Code (110KB, 2030 glyphs)    | `wght` 300–**300**–700                        | **no** | `calt`, 32×`cvXX`, 10×`ssXX`, `zero`, `onum`… |

### Provenance, and where each font should come from

Every candidate source was checked directly. **There is no version upgrade to make — all three are
already at the latest release.** The work is pinning, documenting, and switching from API subsets to
full fonts. Critically, **each font needs a different source**; there is no single upstream to use.

| Font          | Correct source                                                       | Version   | Glyphs | Why not the obvious alternative                                                                                 |
| ------------- | -------------------------------------------------------------------- | --------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| Cairo         | `google/fonts` `ofl/cairo/Cairo[slnt,wght].ttf`                      | **3.130** | 1956   | Upstream `Gue3bara/Cairo`'s latest _release_ is **v3.116 from 2020** — five years stale                         |
| IBM Plex Sans | `google/fonts` `ofl/ibmplexsans/IBMPlexSans[wdth,wght].ttf` + Italic | **3.201** | 1025   | **IBM's own `@ibm/plex-sans@1.1.0` ships no variable font at all** — only static weights across 130 split files |
| Fira Code     | `tonsky/FiraCode` release **6.2** zip asset                          | 6.002     | 2030   | Google's `ofl/firacode` is stale at **5.002** with 1857 glyphs                                                  |

Notes that cost real time to establish and should not be re-derived:

- **`6.002` in Fira Code's name table _is_ release `6.2`.** The tag/version mapping is
  `6.2 → 6.002`, confirmed against v5.2 → 5.002. The currently vendored file is **byte-identical**
  to upstream 6.2 (SHA-256 `408e876a202f15ea6ee307a70a65cf40ceb222c589a0b17e0a3a371db96dd49f`) and
  is already correct — it is merely renamed to `FiraCode-Variable.woff2`.
- **Fira Code's fonts are only in the release ZIP asset**, not in the repo tree. `distr/` at tag 6.2
  contains just CSS and a specimen, so the fetch script must download and extract
  `Fira_Code_v6.2.zip`.
- Fira Code's legacy family name is **`Fira Code Light`** (typographic family `Fira Code`, subfamily
  `Light`) and `wght` defaults to **300**. This is **upstream's own naming**, verified in both v5.2
  and v6.2 — not a vendoring error, and not fixable without modifying the font. The fix belongs in
  `fonts.css` as an explicit `font-weight`.
- **Cairo's OFL carries no Reserved Font Name** — the copyright line is plain "Copyright 2009 The
  Cairo Project Authors". Renaming to VizChitra Sans is therefore _permitted and simple_, not a
  legal obligation. This materially de-risks Phase 3.
- Cairo being a Google Fonts _subset_ **is** a real constraint: the vendored file has 255 glyphs
  against the full font's 1956, and the full font carries features the subset dropped
  (`aalt ccmp dlig locl ordn rlig sinf subs sups`). Still **no `calt` even in the full font**, so
  that finding holds.
- Nothing is currently pinned or hash-verified, and copies have drifted: an older **Fira Code v5.2**
  sits in `/Users/amitkaps/code/fonts/raw/`.
- **No `greek-cyrillic` subset is built for any family, on purpose.** Checked directly against the
  cmap: Cairo has 0 Cyrillic codepoints and 1 Greek (π, U+03C0, a math symbol, not script support),
  while IBM Plex Sans and Fira Code both have substantial real coverage (73/192 and 121/240
  Greek/Cyrillic codepoints) — so a `greek-cyrillic` block _could_ be built for the latter two. It
  isn't, because none of the sites this repo serves (`live`, `studio`, `differently`, `ticketing`,
  `vizchitra`) render Cyrillic or Greek text. Google Fonts' own latin/latin-ext/cyrillic/greek split
  is the right shape for a service serving the whole web; copying it here would ship a subset, a
  manifest entry and a CSS block that could never be triggered by anything we actually serve. Group
  by what the pages need, not by convention — see decision 15. `font-src/ranges.py`'s three remaining
  buckets (`latin`, `latin-ext`, `symbols`) are still the same fixed ranges applied to every family;
  `font-src/subset.py` skips emitting any bucket with fewer than 8 codepoints of real coverage
  (why Cairo's `latin-ext` and `symbols` blocks are much smaller than the other two families', not
  omitted). One accepted gap either way: Cairo's lone π was never in any of the three buckets and
  remains unreachable in any served subset despite being in the full 1956-glyph font — not worth a
  special-cased range for one glyph on a Latin display font. If a real Indic-script need shows up
  (e.g. Devanagari for Plex), that is a **different font family** to pin and fetch, not a range to
  add here — none of the three currently pinned fonts contain any Devanagari glyphs at all.

Consequences that shape the plan:

- **Slant sliders clamp to ±11.** Negative = forward/italic lean (Cairo's italic uses `slnt -11`).
- **Cairo has no `calt`.** The contextual-alternates toggle is inert on Cairo. Ship it wired
  correctly and labelled inert — it is plumbing for VizChitra Sans, which may add one.
- **Cairo has real GPOS kerning**, so the `font-kerning` toggle does real work.
- **Feature availability differs per subset** — a toggle can work in latin and not latin-ext.
- **Fira Code's default weight is 300, not 400.** Unset `font-weight` renders Light. `fonts.css`
  must set an explicit default. This is a live bug risk in the current copy-pasted setup.
- **Fira Code has no kerning** (monospace) — expected, but means no kern toggle applies to it.

### Subsetting: measured, not assumed

The concern that subsetting would strip Fira Code's ligatures was tested directly. **It does not.**
Fira Code's 86 ligatures are _unencoded_ glyphs reached through `calt` substitution, and fontTools
follows GSUB closure automatically, so all 86 survive a subset that contains no unicode range for
them. Two things do need care:

- fontTools' **default `--layout-features` list silently drops the 42 `cvXX`/`ssXX` stylistic sets**
  (alternate `a`, slashed zero, and so on). `--layout-features='*'` retains them.
- A ligature whose input characters straddled two unicode-range files would break, because the
  browser picks a font per character. **Verified safe:** all 28 ligature component characters are
  ASCII, max `U+007E ~`, so every ligature sits inside the `latin` block.

Splitting by `unicode-range` across several `@font-face` blocks — the pattern `font.css` already
uses for latin / latin-ext — is therefore strictly better than either a single subset or the full
font. Measured on Fira Code with `--layout-features='*'`:

| File                                                   | Size       | Ligatures | `cv`/`ss` | Loaded                 |
| ------------------------------------------------------ | ---------- | --------- | --------- | ---------------------- |
| **latin**                                              | **41.5KB** | **86/86** | **42**    | always                 |
| latin-ext                                              | 12.6KB     | —         | 10        | on demand              |
| symbols (arrows, math, box-drawing, blocks, geometric) | 10.9KB     | 4         | 2         | on demand              |
| **total coverage**                                     | **65.0KB** |           |           | vs 110.4KB unsubsetted |

No `greek-cyrillic` row: dropped for every family, not just Fira Code — see the provenance note
above on why a subset that can never be triggered by anything we actually serve isn't shipped just
because Google Fonts' own convention includes it.

A typical page downloads **41.5KB instead of 110.4KB — 62% less — while losing nothing**: `latin`
alone already covers everything a Latin-script page needs, `latin-ext` and `symbols` stay available
on demand, and all three together still total less than the single unsplit font. Figures are from
`static/fonts/v1/manifest.json` as built by `font-src/subset.py`; the same measurement for all three
families, including a same-basis unsplit-woff2 comparison, is on the `/catalogue` page.

### Toolchain status

Node 24.21 and pnpm 12.4.2 are installed and managed by **mise** (`~/.config/mise/config.toml`),
which also manages **uv 0.12.15**. Python work uses **uv**, not conda and not system Python.

This matters concretely: the system `python3` is **3.9** with a stray user-site `fontTools 4.60.2`
in `~/Library/Python/3.9/`, and **`fontmake`, `gftools`, `ttx` and `pyftsubset` are not on PATH**.
Relying on that ambient install is how the build becomes unreproducible. All font scripting runs
through `uv` with dependencies declared in `pyproject.toml` and locked in `uv.lock`; ad-hoc commands
use `uv run --with 'fonttools[woff]' --with brotli`. Use fontTools' own woff2 support via `brotli`
rather than the Homebrew `woff2_compress` CLI that
`/Users/amitkaps/code/fonts/README.md` documents — that 2021 conda workflow is superseded.

### The limitation that justifies Phase 3

Wrapping every character in a `<span>` **breaks GPOS kerning across those spans** — a browser cannot
kern a pair that straddles an element boundary. So in the Retalics prototype, kerning is effectively
off no matter what the toggle says. This is not a bug to paper over with JS spacing (the spec forbids
that); it is the core argument for a real `RETA` axis, which would slant glyphs _inside_ the shaping
run and keep kerning intact. The lab must surface this caveat, and Phase 3's acceptance test is
precisely that `RETA=1` matches the span prototype **while preserving kerning**.

### Decisions taken

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Table authoritative, algorithm as preset.** `RetalicsConfig { defaultSlant, glyphSlants }` is the editable source of truth, seeded from LogoType. The m/n-distance rule becomes a _generator_, so rule-based and hand-tuned can be compared.                                                                                                                                 |
| 2   | **Slant and sidebearing, not weight.** Per-glyph `wght` from LogoType is still not modelled — weight stays global. Sidebearing **is** added to `RetalicsConfig` per the structural methodology (decision 18): kerning and calt must not compensate for a spacing problem slant/sidebearing should own. Supersedes the original "slant only" scope.                             |
| 3   | **Case-sensitive glyph keys.** `'V'` and `'v'` tune independently; uppercase seeded, lowercase at default.                                                                                                                                                                                                                                                                     |
| 4   | **Export + import JSON, persist to localStorage.** Tuning sessions must survive a reload and feed Phase 3.                                                                                                                                                                                                                                                                     |
| 5   | **Scaffold by copying local `/code/base`** into the repo root, preserving git history.                                                                                                                                                                                                                                                                                         |
| 6   | **Lab at `/`; the prototypes absorbed, then kept in `docs/` as annotated `*Reference` files.**                                                                                                                                                                                                                                                                                 |
| 7   | **Phase 3 = binary surgery with fontTools**, not a source build.                                                                                                                                                                                                                                                                                                               |
| 8   | **Verify Cairo's OFL Reserved Font Name, rename, ship OFL + attribution.**                                                                                                                                                                                                                                                                                                     |
| 9   | **Phase 2 = versioned immutable URLs + CORS + published `fonts.css`.**                                                                                                                                                                                                                                                                                                         |
| 10  | **Ship variable TTF _and_ baked static instances** for Figma, with an install guide.                                                                                                                                                                                                                                                                                           |
| 11  | **Browser quirks established empirically** — automated in Chromium/WebKit/Firefox via Vitest browser mode + Playwright, with `/compat` kept for real Safari. Done early, in Phase 1.                                                                                                                                                                                           |
| 12  | **Fonts fetched from official sources against a pinned, hash-verified manifest**; built artifacts still committed. Each font has its _own_ source — see the provenance table.                                                                                                                                                                                                  |
| 13  | **Phase 3 operates on the full unsubsetted Cairo VF** from `google/fonts`; we do our own subsetting.                                                                                                                                                                                                                                                                           |
| 14  | **Plex Sans comes from Google's variable build**, documented as such, because IBM ships no variable font.                                                                                                                                                                                                                                                                      |
| 15  | **Serve `unicode-range`-split subsets** (latin / latin-ext / symbols) built with `--layout-features='*'`, and publish the untouched full fonts as downloads. No `greek-cyrillic` bucket: group by what the sites we serve actually need, not by Google Fonts' convention — see the provenance note.                                                                            |
| 16  | **Python via uv**, managed by mise. Never conda, never system Python.                                                                                                                                                                                                                                                                                                          |
| 17  | **Phase 2 (Delivery) executes before Phase 3 (VizChitra Sans).** Delivery ships against Cairo now; `fonts.css` exposes the display family only through a CSS custom property, never a hardcoded `font-family`, so swapping to VizChitra Sans later is a one-line change in this repo, not a second migration across `live`, `studio`, `differently`, `ticketing`, `vizchitra`. |
| 18  | **Tune by structural class, not by individual letter.** A new `structuralClass` generator seeds `glyphSlants`/sidebearings by group (Stems, Diagonals, Rounds, Bowls, Curves, Lowercase core, Ascenders, Descenders, Narrow, Wide — see 1.8); per-glyph editing still overrides the group value for exceptions. Does not replace decision 1, extends it.                       |
| 19  | **Basic Latin (`A–Z`, `a–z`, 52 glyphs) first.** Latin Extended, Arabic and symbols are deferred until the structural rule is validated; Latin Extended is expected to mostly inherit its base letter's value later (`é`←`e`, `ñ`←`n`), not be tuned from scratch.                                                                                                             |
| 20  | **Tuning order is glyph slant → sidebearings → kerning → contextual alternates**, each gating the next. Kerning never compensates for a slant/sidebearing problem; calt is never used as a substitute for a shape that genuinely needs to change.                                                                                                                              |
| 21  | **A glyph editor is out of scope until the Lab's rule is validated.** fontTools binary surgery encodes a validated design; discovering whether the design works happens in the Lab, not in an outline editor.                                                                                                                                                                  |

---

# Phase 1 — Retalics Lab

Goal: produce a tunable, exportable `RetalicsConfig` and the visual tooling to judge it. Cairo only.
Explicitly **not** implementing a `RETA` axis.

## 1.1 Scaffold from `base`

Copy the local `/Users/amitkaps/code/base` working tree into the repo root, preserving this repo's
git history (`fe2cd81` stays the root commit).

- Copy: `src/app.css`, `src/app.html`, `src/app.d.ts`, `src/routes/+layout.svelte`,
  `src/routes/+layout.ts`, `package.json`, `tsconfig.json`, `vite.config.ts`, `wrangler.jsonc`,
  `.node-version`, `.vscode/`, `.github/`, `src/lib/assets/favicon.svg`.
- **Do not copy** base's demo content: `src/content/`, `src/lib/docs.ts`, `src/lib/docs.test.ts`,
  `src/routes/[slug]/`. Strip the `docs` import and nav loop from `+layout.svelte`.
- Merge base's `.gitignore` into the existing one. Rename the package to `vizchitra-fonts`.
- Keep the `#lib` / `#lib/*` import aliases from `package.json` `imports`; use them throughout.
- Stack as-is: SvelteKit 3 RC, Svelte 5 runes, Vite+, plain CSS (no Tailwind), pnpm 12, Node 24.

Verify the scaffold boots (`pnpm install && pnpm dev`) before writing any lab code.

## 1.2 Pin the fonts properly — do this now, not in Phase 2

Establish provenance from the start so even Phase 1's Cairo is a known quantity:

- **`.mise.toml`** in the repo root pinning `node`, `pnpm`, `python` and `uv`, plus a
  `pyproject.toml` + `uv.lock` for the font tooling (`fonttools[woff]`, `brotli`). No conda, no
  system Python — see the toolchain note above for why.
- **`fonts.lock.json`** — for each file: family, source repo, exact release tag / version, source
  URL, and SHA-256.
- **`font-src/fetch.py`**, run via `uv run` — downloads from the per-font sources in the
  provenance table and verifies hashes, failing loudly on mismatch. Note Fira Code requires
  downloading and extracting the release **ZIP asset**, not a raw repo file.
- Output is committed to `static/fonts/` so the site builds offline and deploys are reproducible —
  the manifest documents provenance, it does not become a build-time network dependency.

Seed the lockfile with the known-good Fira Code hash
(`408e876a202f15ea6ee307a70a65cf40ceb222c589a0b17e0a3a371db96dd49f`) so the first run proves the
verification path works against a file we have already confirmed.

`src/lib/styles/fonts.css` is then **generated** by `font-src/css.py` from the built subsets, rather
than hand-written, so its `@font-face` blocks cannot drift from the files that exist. Import it from
`+layout.svelte` and add `--font-display: 'Cairo'` to the `@layer base` tokens in `app.css`.

## 1.3 Retalics data layer — `src/lib/retalics/`

Pure and UI-free. This is the part that must survive into Phase 3, so it carries no view state.

**`config.ts`**

```ts
export type RetalicsConfig = {
	defaultSlant: number;
	glyphSlants: Record<string, number>;
};
export const SLNT_MIN = -11,
	SLNT_MAX = 11; // measured from the font
export const WGHT_MIN = 200,
	WGHT_MAX = 1000;
```

Plus `SEED_CONFIG` carrying the LogoType values (`V -4, I 8, Z 0, C 2, H 7, T -6, R -8, A 0`) with
`defaultSlant: 0`, and `GLYPH_GROUPS` — the inspection set (A–Z, a–z, 0–9, punctuation, symbols) as
ordered named groups for the grid.

**`slant.ts`** — the refactor of `formatSlantedText()`, now config-driven:

```ts
export function slantFor(char: string, config: RetalicsConfig): number;
export function formatSlantedText(
	text: string,
	config: RetalicsConfig
): { char: string; slant: number }[];
```

Exact-key lookup falling back to `config.defaultSlant`, so unknown characters, emoji, whitespace and
punctuation never throw. Clamp to ±11. Split with `Array.from()` (not `.split('')`) so astral
characters survive as single units.

**`generators.ts`** — named `RetalicsConfig`-producing functions so rule vs hand-tuning can be
compared. Port `getLetterDistance` from `vizchitra/src/lib/utils/slanted.ts` verbatim as the
`mnDistance` generator, preserving its exact sawtooth, plus `flat(n)` and `alternating(n)`. Applying
a generator overwrites the table, which stays editable afterwards.

**`store.svelte.ts`** — Svelte 5 `$state` holding the live config, with `reset()`,
`setGlyph(char, value)`, `applyGenerator(fn)`, `toJSON()`, `fromJSON(text)` (validated — reject
malformed input with a message, never crash), and `$effect` localStorage persistence keyed
`vizchitra.retalics.v1`. Guard reads for SSR.

## 1.4 Typography state — `src/lib/typography/state.svelte.ts`

A separate `$state` object, deliberately distinct from `RetalicsConfig` because it is _view_ state
and must not leak into exported font data: `wght`, `slnt`, `tracking` (em), `fontSize` (px),
`lineHeight`, `kerning`, `calt`, `retalicsEnabled`, `text`.

Default text — a pangram with dense pair coverage:
`VIZCHITRA — The quick brown fox jumps over the lazy dog. AVAST, Wavy Type 2026!`

## 1.5 Rendering — `src/lib/components/RetalicsText.svelte`

One component, three modes, so comparison is guaranteed apples-to-apples:

- `mode="plain"` — raw text node, `font-variation-settings: 'wght' W`.
- `mode="slnt"` — raw text node, `'wght' W, 'slnt' S`.
- `mode="retalics"` — one `<span class="retalics-glyph" style="--letter-slant: N">` per character.

Rules, per spec: `font-variation-settings: 'slnt' var(--letter-slant)` only — **no CSS transform or
skew**. Tracking via `letter-spacing`; kerning via `font-kerning`; calt via `font-feature-settings`.
All applied on the container and inherited, so tracking stays independent of Retalics. Emit
whitespace as plain text between spans so wrapping and word-breaking behave normally. Keep the DOM
flat — no wrapper-per-word, no nesting.

## 1.6 UI — `src/routes/+page.svelte` + components

Large preview dominant, controls compact, testing below. Minimal chrome, no animations. Reuse base's
`app.css` tokens (`--bg`, `--border`, `--text-muted`, `--radius`) rather than a second palette.

- **`Controls.svelte`** — sliders for `wght` (200–1000), `slnt` (−11…11), tracking, size, line
  height; toggles for kerning, calt, Retalics. Each shows its numeric value. The calt toggle carries
  an inline note that Cairo exposes no `calt` (it has `dnom/frac/numr/rvrn`). The kerning toggle
  shows the span/kerning caveat whenever Retalics is on.
- **Preview** — a `<textarea>` bound to `state.text` paired with the live render (more predictable
  input handling than `contenteditable`).
- **Comparison rows** (inlined in `+page.svelte`, not a separate component) — three stacked rows on
  identical text/size/weight/tracking, labelled _Cairo_ / _Cairo + global slnt_ / _Retalics_, using
  the same component in its three modes.
- **`PairGrid.svelte`** — the spec's pairs (`AV VA AW WA AY YA To Ta Te Ty Yo Wa Wo LT RT RA TA FA
PA`) as a `const` in the data layer, plus an input for arbitrary pairs. Each cell renders the pair
  in Retalics and plain mode side by side.
- **`GlyphGrid.svelte`** — `GLYPH_SET` grouped; each cell shows the glyph at preview size, its slant
  value, and a compact number input writing back via `setGlyph`. Cells still at `defaultSlant` are
  de-emphasised so tuned glyphs stand out.
- **`ConfigIO.svelte`** — generator presets, copy-JSON, paste-to-import, reset-to-seed.

## 1.7 Absorb the prototypes, then keep them as annotated references

The live values must exist in exactly one place — decision 1 — so `SEED_CONFIG` becomes the only
source of slant data and `RetalicsText.svelte` the only renderer. But the prototypes are **not**
deleted, for two reasons discovered during execution:

- `sample/` was never committed, so git history would not have preserved anything.
- `LogoType.svelte` is the **only** record of the per-glyph `letter-spacing` and `wght` values, which
  decision 2 deliberately excludes from `RetalicsConfig`. Deleting it would lose real design data.

Only **`docs/LogoTypeReference.svelte`** is kept as a file, annotated with what was extracted, what
superseded it, and what was deliberately left behind. It survives because two open goals depend on
it: setting the logo — duotone included — in the font itself rather than in spans, and serving as the
kerning target for VIZCHITRA when Phase 3 checks that kerning survives at `RETA=1`.

The other two did not need files. The algorithmic prototype is quoted as a snippet in `docs/spec.md`,
since its rule already lives in `generators.ts` under test. The old hand-written `font.css` is
superseded by the generated `fonts.css`, and its one irreplaceable part — the Cairo italic
`font-variation-settings` descriptor — became a **live test** at
`src/routes/compat/descriptor-test.css` instead of a dead reference.

`docs/**` is excluded from `vp fmt` and outside `tsconfig`'s `include`, so nothing builds or lints
the reference file.

## 1.8 Retalics methodology — tune by structure, not by letter

Refines 1.3 and 1.6 above with a design methodology, arrived at after the initial per-glyph seed
values proved too sparse to generalize from. Applies before any font-binary work starts.

**Scope: Basic Latin first.** `A–Z` + `a–z` only — 52 glyphs. Latin Extended, Arabic and symbols are
deliberately deferred; see the inheritance note below and the open question it creates.

**Classify before tuning.** 52 independent sliders don't generalize; groups by shared structural
behavior do. This becomes a new **generator** (alongside `mnDistance`/`flat`/`alternating` in
`generators.ts`), not a replacement for per-glyph editing — decision 1 still holds: a group value
seeds every glyph in that group, then individual glyphs stay editable for exceptions (the seed data
already needs this: `V -4` and `A 0` are both "Diagonals" but tune differently).

```ts
export type StructuralGroup = { name: string; glyphs: string[] };
export const STRUCTURAL_GROUPS: StructuralGroup[] = [
	{ name: 'Stems', glyphs: [...'HEFLIT'] },
	{ name: 'Diagonals', glyphs: [...'AVWXYKMN'] },
	{ name: 'Rounds', glyphs: [...'OCGQ'] },
	{ name: 'Bowls', glyphs: [...'BDPR'] },
	{ name: 'Curves', glyphs: [...'SUJ'] },
	{ name: 'Lowercase core', glyphs: [...'aeo'] },
	{ name: 'Ascenders', glyphs: [...'bdfhkl'] },
	{ name: 'Descenders', glyphs: [...'gjpqy'] },
	{ name: 'Narrow', glyphs: [...'itr'] },
	{ name: 'Wide', glyphs: [...'mw'] }
];
```

This is distinct from `GLYPH_GROUPS` in 1.3, which groups by Unicode category (Uppercase / Lowercase
/ Numerals / …) purely to organize the `GlyphGrid` display. `STRUCTURAL_GROUPS` groups by shape, for
tuning — a letter appears in exactly one display group but its structural group is the thing that
predicts how it should slant.

**Tune in this order — glyph slant → sidebearings → kerning → contextual alternates** — and don't
skip ahead to fix a problem the earlier step should have owned:

- Don't use kerning to compensate for bad glyph slant or sidebearings — a per-pair kerning value that
  is only needed because e.g. `V`'s slant is wrong will break the moment the slant is corrected.
- Don't reach for a contextual alternate unless the glyph's outline genuinely needs to differ in
  context (e.g. `f` colliding with an ascender) — never as a stand-in for a spacing fix.

Sidebearing and calt are **not yet in `RetalicsConfig` or the Lab UI** — today's config only carries
`glyphSlants`. Extending the schema and controls for sidebearings and calt overrides is part of this
phase, not deferred to Phase 3; Phase 3 only encodes what Phase 1 has already validated.

**Test progressively**, and don't move to the next scale until the current one looks right:
individual glyphs → pairs (`TEST_PAIRS`) → words → sentences → paragraphs. A slant that reads fine on
a single glyph can still misbehave in a pair or at paragraph density — that's what the later stages
are for catching.

**Lab UI, inspired by Inter Lab.** The existing `Controls`/`PairGrid`/`GlyphGrid` (1.6) already cover
`wght`, `slnt`, tracking, size, line height, kerning and calt toggles, plus per-glyph editing and
common-pair testing — this item is about closing the two gaps above (sidebearing and calt-override
controls), not a rebuild.

**Treat the current per-letter values as experimental data**, not a final design. The Lab's job is to
discover the rule (which structural groups need what, and by how much); Phase 3 encodes the rule that
survives testing, not whatever the sliders happened to say first.

**A glyph editor is out of scope until the rule is validated.** fontTools binary surgery (Phase 3)
encodes a validated design into a variable axis; it is not the tool for discovering whether the
design works. If Phase 1 testing eventually shows the axis needs actual outline changes beyond what
scaling `slnt`/sidebearing deltas can express, that is new work, tracked as an open question below —
not something to reach for early.

**Latin Extended can inherit later, mostly.** Once Basic Latin is validated, `é` can default to `e`'s
group value, `ñ` to `n`'s, etc., with per-glyph overrides only where the diacritic or a different
optical weight genuinely needs one. Not designed now — flagged as an open question below so it isn't
forgotten once Basic Latin looks done.

## Phase 1 verification

`pnpm dev`, then in the browser, in order:

1. **Arbitrary text** — mixed scripts, digits, emoji; nothing throws, unknowns fall back.
2. **Spaces and punctuation** — words wrap normally, no stray gaps from span emission.
3. **Repeated letters** — `AAA`, `OOO` all get the same slant.
4. **Tracking independent** — changing tracking with Retalics off and on moves spacing identically;
   slant values unchanged.
5. **Kerning toggles** — in `plain` mode `AV`/`To` visibly tighten. Confirm the documented caveat:
   in Retalics mode the toggle has no effect and the UI says so.
6. **calt toggles** — attribute flips in devtools; no visual change; inert label shown.
7. **Global `slnt` vs Retalics independent** — each works with the other off; they compose.
8. **Comparison** — all three rows share identical text, size, weight, tracking.
9. **Config round-trip** — tune, export, reload (persistence holds), reset, re-import, identical
   render. Paste malformed JSON → clean error, no crash.
10. **Structural generator seeds by group, not by letter** — applying it sets every glyph in a group
    (e.g. all of `AVWXYKMN`) to that group's value; editing one glyph afterwards leaves its siblings
    untouched.
11. **Progressive testing holds at each scale** — a tuned glyph set that looks right individually
    still reads correctly as pairs (`TEST_PAIRS`), words, sentences and full paragraphs. Regressions
    found at a later scale are fixed at the scale they belong to (slant/sidebearing), not papered
    over with kerning or calt.

Then `pnpm check` and `pnpm test` must pass, per base's `AGENTS.md`.

---

# Phase 2 — fonts.vizchitra.com

Goal: one place that serves the font files, a browser-tested `fonts.css`, and the docs for consuming
them. Executed **before** Phase 3, against **Cairo** as the display face — VizChitra Sans does not
exist yet — plus **IBM Plex Sans** and **Fira Code** unmodified. When Phase 3 finishes, Cairo is
replaced by VizChitra Sans in `fonts.css` alone; see the indirection requirement in 2.1.

**Delivery format for all three families** is the `unicode-range` split measured above: `latin`,
`latin-ext` and `symbols` `@font-face` blocks pointing at separate woff2 files, all built with
`--layout-features='*'`. No `greek-cyrillic` block — none of the sites this repo serves render
Cyrillic or Greek text, so that range is omitted rather than shipped as dead weight; see the
provenance note and decision 15. The browser downloads only the blocks a page actually needs, so a
typical page pays 41.5KB for Fira Code rather than 110.4KB while full Latin-script coverage remains
available.

This is how "unmodified" is honoured without a payload regression: the **untouched upstream files are
published as downloads** — that is what we redistribute _as the font_, and what Figma and archival
use — while the web is served derived subsets that are documented, reproducible from
`font-src/`, and provably lossless for ligatures and stylistic sets.

Neither Plex nor Fira Code is renamed or re-versioned. Fira Code's `Fira Code Light` legacy name and
300 default stay intact; the default weight is corrected in `fonts.css` with an explicit
`font-weight`, never by touching the font.

## 2.1 Delivery

Extend the same SvelteKit/Cloudflare Worker to serve `/<version>/fonts/*.woff2` with:

- `Access-Control-Allow-Origin` — fonts are CORS-restricted unlike images, so this is required for
  `vizchitra.com` to use them at all. This is the single most likely thing to break.
- `Cache-Control: public, max-age=31536000, immutable` on versioned paths.
- `Content-Type: font/woff2`.
- Versioned paths (`/v1/…`) so a future VizChitra Sans revision cannot silently change rendering on
  every consuming site.

Publish a canonical `fonts.css` at a stable URL that consumers link directly.

**The display family must be indirected through a CSS custom property** (e.g. `--font-display:
'Cairo', sans-serif;`), never hardcoded as `font-family: 'Cairo'` at call sites — in `fonts.css`
itself and in every consumer that adopts it. This repo already does this in `src/app.css`
(`--font-display`). The whole point: when Phase 3 ships VizChitra Sans, the swap is one line in
`fonts.css` — `--font-display: 'VizChitra Sans', 'Cairo', sans-serif;` — not a second round of edits
across `live`, `studio`, `differently`, `ticketing` and `vizchitra`. If any consumer skips the custom
property and names `'Cairo'` directly, migrating them is quietly back on the critical path.

## 2.2 Browser quirks — largely DONE in Phase 1

This was pulled forward, because `fonts.css` could not be written honestly without it. The slant
question is now settled and automated:

- **`src/lib/fonts/slant.browser.test.ts`** runs in real Chromium, WebKit and Firefox under Vitest
  browser mode + Playwright. It screenshots a specimen and measures the **shear of the rendered ink**
  — necessary because `slnt` barely moves advance widths (Cairo's `I` shifts 248 → 249 per 1000,
  identically for −11 and +11), so no metric-based check can see it.
- **Result:** ship `font-style: oblique`, the bare keyword. An angle range is wrong in two of three
  engines. The old hand-written CSS's `font-variation-settings` descriptor measures **0.000 in
  WebKit** — Cairo italic never worked in Safari. Full matrix in `docs/compat.md`.
- **`/compat`** remains for the one thing that cannot be automated: real Safari, which Playwright's
  WebKit is not.

Still to check, by the same method where possible:

- `font-weight` range descriptors and Fira Code's **300 default** rendering Light when unset.
- `font-stretch: 75% 100%` vs `font-variation-settings: 'wdth'` for Plex.
- `font-feature-settings` vs `font-variant-*` precedence.
- `font-kerning` interaction with `letter-spacing`.
- Whether a custom axis (`RETA`) is honoured through `font-variation-settings` in every engine.
- Lazy loading: a latin-only page should fetch only the `latin` subset; adding a box-drawing
  character should pull `symbols` and nothing else.

`fonts.css` is generated from `font-src/css.py` and written **from recorded results**, never from
best-practice memory.

## 2.3 Docs

- **Catalogue** — a specimen page per family with axes, features and file sizes.
- **Use on the web** — copy-paste `fonts.css` link or self-host; the CSS custom properties to use.
- **Use in Figma** — Figma cannot load webfonts from a URL. Document downloading the `.ttf`s,
  installing locally, the Figma font-helper requirement, and that **static instances are the
  reliable path** because Figma's variable-font support is uneven.
- **Migration** — replace the drifted `font.css` copies in `live`, `studio`, `differently`,
  `ticketing` and `vizchitra` with the canonical one.

If the lab is no longer the right homepage once the catalogue exists, move it to `/lab` at this
point and make the catalogue `/`.

## Phase 2 verification

- Load `fonts.css` cross-origin from a different origin and confirm fonts render — the CORS check.
- Confirm cache headers and that a `/v2/` path can coexist with `/v1/`.
- Run `/compat` in real Safari, Chrome and Firefox; every shipped technique passes or has a
  documented workaround.
- `uv run font-src/fetch.py` reproduces the committed bytes and every hash in `fonts.lock.json`
  verifies.
- Fira Code renders at the intended weight, not Light, with the `fonts.css` default applied.
- **Ligatures survive the split**: type `=>`, `!==`, `<$>`, `~~>` in a Fira Code sample and confirm
  they form. Confirm a stylistic set (e.g. `ss01` alternate `a`, `zero` slashed zero) still applies.
- **Lazy loading works**: in devtools, a latin-only page fetches only the `latin` file; adding a
  box-drawing character triggers the `symbols` fetch and nothing else.
- Install the `.ttf`s and confirm VizChitra Sans appears in Figma with the expected weights.

---

# Phase 3 — VizChitra Sans

Goal: turn Phase 1's exported config into a real font with a real `RETA` axis, built reproducibly
from Cairo by script. **Cairo only** — Plex and Fira Code are never modified.

## 3.1 Licensing first

**Already established:** Cairo's `OFL.txt` carries **no Reserved Font Name** — the copyright reads
plainly "Copyright 2009 The Cairo Project Authors". Renaming to VizChitra Sans is permitted and
straightforward; there is no RFN blocker to design around.

Remaining work is documentation, not investigation: record the finding in `docs/licensing.md` with
the OFL text and a clear derivation notice, retain the original copyright string in the name table
as OFL requires, and avoid any wording that implies endorsement by the Cairo authors. Confirm the
same for Plex and Fira Code (both OFL) since Phase 2 redistributes them unmodified.

## 3.2 Build pipeline — `font-src/`

A **uv-managed** Python project (`pyproject.toml` + `uv.lock`; `fonttools[woff]` + `brotli`), with a
`build.py` that is the single reproducible entry point, invoked as `uv run`, plus a pnpm script
wrapper so it runs alongside the web build. Outputs land in `static/fonts/v1/`.

**Input is the full unsubsetted Cairo variable TTF** from the `google/fonts` `ofl/cairo` directory —
pinned in `fonts.lock.json` with its `METADATA.pb` version — _not_ the 255-glyph API subset currently
vendored. We subset ourselves, after adding RETA, so the Latin-only glyph set is our documented
decision rather than one inherited from Google's API. Second input: the `retalics.json` exported from
the Phase 1 lab.

Steps:

1. **Rename** — rewrite name IDs 1/2/3/4/6/16/17, `fvar` instance names, and STAT entries to
   VizChitra Sans, with a fresh vendor ID and version. Note the Fira Code precedent: legacy name ID 1
   conventionally carries the _default instance_, so with `wght` defaulting to 400 this should read
   `VizChitra Sans`, but verify rather than assume.
2. **Synthesize the `RETA` axis.** Cairo's `slnt` deltas are already per-glyph and independent, which
   is what makes this tractable: for each glyph, scale its existing `slnt` delta by
   `config.glyphSlants[glyph] / 11` and register the result as a new `gvar` region pinned to
   `RETA=1`. Add `RETA` (0–**0**–1) to `fvar` and describe it in `STAT`.
   **Risk to confront early:** this remaps existing masters rather than drawing new outlines, and
   composite glyphs plus `HVAR` advance deltas need explicit handling. Validate on a handful of
   glyphs before running the full set.
   **Sidebearings ride the same axis only if Phase 1 shows they're simple deltas** (decision 2/18) —
   fold them into the `HVAR`/`gvar` region alongside slant if so; otherwise this step splits into two
   and the open question about a second axis (see Open questions) gets answered here, not guessed at.
3. **Kerning across RETA** — confirm GPOS survives and decide whether kern values need variation at
   `RETA=1`. This is the whole point of the axis, so it is a gate, not a nicety. Per decision 20,
   Phase 1 should have already ruled out using kerning to paper over slant/sidebearing problems, so
   this step should find real kerning issues, not disguised earlier-phase bugs.
4. **Subset** the full font into the same `unicode-range` split used for the other families
   (latin / latin-ext / symbols), dropping Cairo's Arabic, via `fontTools.subset` as a library call
   with `--layout-features='*'` so nothing is silently lost. Because we start from the full 1956-glyph
   font, the ranges are a parameter we can widen later — including re-adding Arabic.
5. **Export**: `.woff2` for the web, variable `.ttf`, and baked static instances at the weights
   actually used, for Figma.

## 3.3 Close the loop with the lab

Add a lab mode that loads the built VizChitra Sans and renders `RETA=1` **as plain text with no
spans**, beside the span prototype at the same config.

## Phase 3 verification

- `RETA=1` is visually identical to the span prototype at the same config — the axis reproduces the
  design.
- **Kerning is preserved at `RETA=1`** where the span prototype loses it. Compare `AV`, `To`, `Wa`.
- `RETA=0` is byte-for-byte visually identical to plain Cairo — the axis is non-destructive.
- `wght` and `slnt` still work independently, and compose with `RETA`.
- `fontTools` validation passes; the font installs cleanly on macOS and loads in Figma.
- `build.py` is deterministic: two runs from the same inputs produce identical output.

---

## Open questions (not blocking Phase 1)

- **`type.vizchitra.com` for typography guidelines** — worth deciding in Phase 2 whether guidelines
  live on a separate subdomain or as a section of `fonts.vizchitra.com`. My inclination is one
  domain with a `/guidelines` section until there is enough content to justify splitting, since two
  subdomains means two deploys and a navigation seam for what is one body of knowledge.
- Whether VizChitra Sans should add a `calt` feature of its own, once the lab shows whether
  contextual alternates are useful.
- Whether `RETA` ends up continuous (0–1) or a discrete on/off — Phase 1 should answer this.
- ~~Whether a Greek/Cyrillic split for Fira Code is worth publishing at all~~ — **resolved**: omitted
  for all three families, not published for any of them. See decision 15 and the provenance note.
- Whether real Devanagari support is worth adding for IBM Plex Sans. None of the three currently
  pinned fonts contain any Devanagari glyphs — this would mean pinning and fetching **IBM Plex Sans
  Devanagari**, a genuinely separate font family in the Plex superfamily, through the same
  provenance pipeline as the other three, not a subsetting change. Not pursued now; revisit if a real
  Devanagari-content page shows up.
- Whether Cairo's Arabic coverage should eventually be re-added to VizChitra Sans. We now build from
  the full 1956-glyph font, so this is a ranges parameter rather than a rebuild.
- **Latin Extended inheritance rules** (decision 19) — which accented letters can simply inherit
  their base letter's structural-group value (`é`←`e`) versus needing their own override because
  the diacritic changes the optical weight. Not designed; deferred until Basic Latin is validated.
- **Whether the `RETA` axis needs to carry sidebearing deltas alongside slant**, or whether a second
  axis (or a fixed, non-variable sidebearing adjustment) is cleaner. Phase 1's sidebearing tuning
  (decision 2/18) will answer whether the values are simple enough to fold into one axis.
- **Whether a glyph editor phase is needed at all** (decision 21) — only answerable once Phase 1
  testing shows whether `slnt`-region scaling and sidebearing deltas can express the validated design,
  or whether some glyphs need outline changes no variable axis can express.

## Out of scope

Renaming, re-versioning or otherwise altering IBM Plex Sans and Fira Code — subsetting for delivery
is a derived build artifact alongside the untouched originals, not a modification of the fonts we
redistribute. Also out of scope: type testing for those two families; a full source-based font build
from Cairo's `.glyphs`/UFO; changes to the sibling repos beyond the Phase 2 migration doc.
