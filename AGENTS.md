# Working on this repo

`vizchitra-fonts` builds fonts.vizchitra.com in three phases — Retalics Lab,
VizChitra Sans (a real `RETA` axis), then Delivery. **Only Cairo is ever
modified.** IBM Plex Sans and Fira Code are served unmodified, as-is. Read
`docs/plan.md` before starting substantial work — it has the decisions,
findings from the actual font binaries, and the phase order (Delivery ships
before VizChitra Sans exists; they're independent).

## Stack

SvelteKit 3 RC, Svelte 5 runes, Vite+ (`vite-plus`), Cloudflare Workers
(`wrangler`), pnpm 12, Node 24. No Tailwind — plain CSS with tokens in
`src/app.css`.

## Before committing

- `pnpm check` (typecheck + Svelte diagnostics) and `pnpm test` (Vitest,
  including real Chromium/WebKit/Firefox via Playwright) must pass.
- After a dependency bump, `pnpm build` too.
- CI runs inside `mcr.microsoft.com/playwright:v<version>-noble` so the
  installed browsers match the pinned `playwright` devDependency exactly —
  keep the Dockerfile tag and `package.json`'s `playwright` version in sync
  when bumping either.

## Measured, not recalled

This is the operating principle for anything touching font rendering,
`font-variation-settings`, `font-style`, or `font-synthesis`. Variable-font
CSS behavior across engines is full of non-obvious, non-spec-intuitive
gotchas (see `docs/compat.md`) — don't reason from CSS-spec memory alone.

- `src/lib/fonts/slant.browser.test.ts` measures real pixel shear in real
  Chromium, WebKit and Firefox. It is the source of truth for what each
  engine actually does, not what it's supposed to do.
- `/compat` (`src/routes/compat/+page.svelte`) exists because Playwright's
  WebKit is not Safari, and is certainly not old Safari. Real-device bugs
  (e.g. the iOS Safari backslant) surfaced there, not in CI. When changing
  anything under `src/lib/fonts/` or `src/app.css`, check `/compat` on a
  real device before considering the change done — the automated matrix is
  necessary but not sufficient.
- `font-variation-settings` **replaces** the inherited value, it does not
  merge with it. A rule that sets only one axis silently discards whatever
  an ancestor (or the same element's own `.sample`-style base class) set for
  every other axis. This has caused three separate real bugs in this repo;
  read `docs/compat.md` for the full history before adding a new
  `font-variation-settings` rule anywhere.
- If a fix changes cross-engine behavior, verify it with a direct
  measurement (the browser test suite, or `getComputedStyle` /
  `document.styleSheets` inspection against a real running page) — not by
  re-reading the CSS spec and assuming. This project has caught wrong
  assumptions this way more than once (`font-synthesis: auto` is invalid
  CSS and silently dropped; `revert` on an inherited property falls back to
  the inherited value, not the initial value).

## Docs are the record, not a summary

- `docs/plan.md` — phases, decisions, and why they were made.
- `docs/compat.md` — the measured cross-engine matrix and the bugs behind
  it. Update this when a technique's behavior changes or a new one is
  tested; it's read as history, not just current state.
- `docs/spec.md` — the original Retalics Lab brief.

## Workflow

- Work on a branch, open a PR, let CI run `pnpm check`/`pnpm test`. Auto-merge
  (squash) is enabled at the repo level — enable it per-PR with
  `gh pr merge --squash --auto --delete-branch` rather than merging by hand.
- Don't push or open a PR for exploratory fixes until asked — verify locally
  (dev server, `/compat`, the browser test suite) first.
