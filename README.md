# VizChitra Fonts

Typography lab and font pipeline for **VizChitra Sans** — a Cairo derivative with a
custom `RETA` axis for the per-character slant effect we call _Retalics_.

[github.com/vizchitra/fonts](https://github.com/vizchitra/fonts), deployed to
`fonts.vizchitra.com` as the `fonts` Worker on the `vizchitra` Cloudflare account.
See [`docs/plan.md`](docs/plan.md) for the three-phase plan and
[`docs/spec.md`](docs/spec.md) for the original brief.

```sh
pnpm install
pnpm dev          # the Retalics Lab at /
```

Five commands are the whole web interface: `dev`, `build`, `check`, `test`, `deploy`.
`pnpm check` and `pnpm test` must pass before committing.

`pnpm test` runs two projects: fast node unit tests, and **real-browser tests in
Chromium, WebKit and Firefox** via Playwright (`*.browser.test.ts`). The browser
ones screenshot type specimens and measure rendered shear, because the font
questions this project cares about cannot be answered any other way — see
[`docs/compat.md`](docs/compat.md). First run needs
`pnpm exec playwright install chromium webkit firefox`.

## Deploying

Work goes through a PR. Merging to `main` runs CI and deploys to
`fonts.vizchitra.com` as the `fonts` Worker on the `vizchitra` Cloudflare account.

Nothing account-specific is committed — this repo is public. `wrangler.jsonc`
carries no `account_id`; CI supplies `CLOUDFLARE_ACCOUNT_ID` and
`CLOUDFLARE_API_TOKEN` from the `production` environment secrets. A one-off local
deploy therefore needs the account passed explicitly:

```sh
CLOUDFLARE_ACCOUNT_ID=<vizchitra account id> pnpm deploy
```

Font files are served from versioned, immutable paths with `_headers` supplying
`Access-Control-Allow-Origin`. Without that header a cross-origin `@font-face`
silently fails, so nothing else could use these fonts. A font revision ships as
`/v2/`; bytes under an existing version never change.

## Fonts

Font work runs on Python via **uv** (managed by mise — see `.mise.toml`). Never
conda, never system Python.

```sh
uv run font-src/fetch.py     # download upstream originals, verify hashes
uv run font-src/subset.py    # build the unicode-range split woff2 subsets
uv run font-src/css.py       # regenerate src/lib/styles/fonts.css
```

Sources are pinned in [`fonts.lock.json`](fonts.lock.json). Each family comes
from a **different** upstream, for reasons worth not rediscovering:

| Family        | Source                        | Version                                                   |
| ------------- | ----------------------------- | --------------------------------------------------------- |
| Cairo         | `google/fonts`                | 3.130 — upstream Gue3bara's last release is v3.116 (2020) |
| IBM Plex Sans | `google/fonts`                | 3.201 — IBM's own npm package ships no variable font      |
| Fira Code     | `tonsky/FiraCode` release ZIP | 6.2 — Google's build is stale at 5.002                    |

Only Cairo is ever modified. Plex and Fira Code are redistributed as-is; the
subsets served to browsers are a derived delivery artifact, built alongside the
untouched originals.

Three things that look like bugs and are not:

- Cairo's italic `@font-face` uses the **bare `oblique` keyword with no angle
  range**. Adding a range breaks it in two of three engines — Chromium stacks a
  synthetic skew on the real axis, WebKit drops the axis entirely. Measured, and
  pinned by `src/lib/fonts/slant.browser.test.ts`.

- Fira Code's family name really is `Fira Code Light` and its `wght` axis
  defaults to **300**. That is upstream's naming — anything using it sets an
  explicit `font-weight` (see `app.css`), rather than patching the font.
- `--layout-features='*'` in `font-src/subset.py` is load-bearing: fontTools'
  default drops all 42 `cvXX`/`ssXX` stylistic sets. Ligatures survive either
  way, via GSUB closure.
