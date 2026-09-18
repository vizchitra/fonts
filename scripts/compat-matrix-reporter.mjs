// A custom Vitest reporter that turns src/lib/fonts/slant.browser.test.ts's
// own pass/fail assertions into src/lib/fonts/compat-matrix.generated.json —
// the data src/routes/compat/+page.svelte reads for its automated
// chromium/firefox/webkit columns, instead of those being hand-copied from
// whatever the tests currently assert.
//
// Tests opt in by calling src/lib/fonts/matrix-tag.ts's tagMatrix(task, id,
// engine, pass) once for each SLANT_TESTS `id` (+page.svelte) they back. This
// reporter just collects those tags — it does not re-derive pass/fail itself,
// so it can never disagree with the test file's own assertions. Multiple
// tests tagging the same id+engine are ANDed: an id only reads `true` if
// every test backing it passed on every one of the three browser projects.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(
	new URL('../src/lib/fonts/compat-matrix.generated.json', import.meta.url)
);

export default class CompatMatrixReporter {
	#matrix = {};

	onTestCaseResult(testCase) {
		const meta = testCase.meta();
		const id = meta.matrixId;
		const engine = meta.matrixEngine;
		if (!id || !engine) return;

		const row = (this.#matrix[id] ??= {});
		row[engine] = engine in row ? row[engine] && meta.matrixPass : meta.matrixPass;
	}

	async onTestRunEnd() {
		const sortedIds = Object.keys(this.#matrix).sort();
		const sorted = {};
		for (const id of sortedIds) {
			const row = this.#matrix[id];
			sorted[id] = {
				chromium: row.chromium ?? null,
				firefox: row.firefox ?? null,
				webkit: row.webkit ?? null
			};
		}
		await writeFile(OUT, JSON.stringify(sorted, null, '\t') + '\n');
	}
}
