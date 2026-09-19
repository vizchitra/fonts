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

const ENGINES = ['chromium', 'firefox', 'webkit'];

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

	async onTestRunEnd(_testModules, _unhandledErrors, reason) {
		// Only a complete, green run may overwrite the committed file: a
		// row is only whole if all three engines reported it, and a failing
		// test never tags, so a failed or filtered run would otherwise write
		// a matrix that mixes fresh cells with gaps. Leave the file alone.
		const rows = Object.entries(this.#matrix).sort(([a], [b]) => a.localeCompare(b));
		const complete = rows.length > 0 && rows.every(([, r]) => ENGINES.every((e) => e in r));
		if (reason !== 'passed' || !complete) {
			console.warn(
				'compat-matrix: partial or failed run — leaving compat-matrix.generated.json untouched'
			);
			return;
		}
		const ordered = Object.fromEntries(
			rows.map(([id, r]) => [id, Object.fromEntries(ENGINES.map((e) => [e, r[e]]))])
		);
		await writeFile(OUT, JSON.stringify(ordered, null, '\t') + '\n');
	}
}
