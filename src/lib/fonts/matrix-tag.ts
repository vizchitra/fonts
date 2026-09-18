/**
 * One-line bridge between a browser test's own assertion and the /compat
 * page's displayed matrix. Call once per test that backs a specific
 * SLANT_TESTS `id` (src/routes/compat/+page.svelte), passing the exact same
 * boolean the test's own expect() is checking — this does not change what
 * the test asserts, it just records that verdict as machine-readable
 * metadata. scripts/compat-matrix-reporter.mjs reads `task.meta` off every
 * test case and writes src/lib/fonts/compat-matrix.generated.json from it,
 * so the page reads real test results instead of a hand-copied boolean.
 *
 * Some SLANT_TESTS ids are backed by more than one test (e.g. a technique
 * confirmed both in isolation and against the family's real sibling face) —
 * call this once per test, tagging the same id each time. The reporter ANDs
 * repeated taggings of the same id+engine, so the id only reads "true" if
 * every test backing it passed.
 *
 * Generic rather than typed against Vitest's own TaskMeta: that interface is
 * an intentionally empty declaration-merge point, and 'vitest' itself isn't a
 * directly resolvable module in this project's pnpm layout (only
 * 'vite-plus/test', which re-exports it, is a dependency) — augmenting it
 * from here isn't possible. Inferring T from the call site and casting inside
 * the function avoids TypeScript's "no properties in common" weak-type check
 * that a separately-declared meta interface would otherwise trip.
 *
 * `engine` is passed explicitly (each call site already computes it from
 * navigator.userAgent as `ENGINE`) rather than left for the reporter to guess
 * from Vitest's browser-instance project name — that name's exact shape
 * (`browser (chromium)` vs. something else) isn't part of any documented,
 * stable contract, and getting it wrong would silently mislabel results.
 */
export function tagMatrix<T extends { meta: object }>(
	task: T,
	id: string,
	engine: 'chromium' | 'firefox' | 'webkit',
	pass: boolean
) {
	const meta = task.meta as Record<string, unknown>;
	meta.matrixId = id;
	meta.matrixEngine = engine;
	meta.matrixPass = pass;
}
