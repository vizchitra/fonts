// A custom Vitest reporter that turns src/lib/fonts/slant.browser.test.ts's
// own pass/fail assertions into results/automated.json — the automated half
// of what /compat displays (src/lib/fonts/compat-results.ts joins it to the
// hand-edited results/manual.json by cell id).
//
// Tests opt in by calling src/lib/fonts/matrix-tag.ts's tagMatrix(task, id,
// engine, pass) once for each /compat cell id they back. This reporter just
// collects those tags — it does not re-derive pass/fail itself, so it can
// never disagree with the test file's own assertions. Multiple tests tagging
// the same id+engine are ANDed: an id only reads `true` if every test backing
// it passed on every one of the three browser projects.
//
// It also records the exact bundled versions of the three Playwright browsers
// (`browser.version()`, a Node-side API — navigator.userAgent can't answer
// this from inside a test: Chrome UA strings are version-frozen and
// Playwright's WebKit build number never appears in a WebKit UA at all).
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const OUT = fileURLToPath(new URL('../results/automated.json', import.meta.url));

const ENGINES = ['chromium', 'firefox', 'webkit'];

async function versionOf(launcher) {
	const browser = await launcher.launch();
	try {
		return browser.version();
	} finally {
		await browser.close();
	}
}

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

	async onTestRunEnd(testModules, _unhandledErrors, reason) {
		// Only a complete, green run may overwrite the committed file: a
		// row is only whole if all three engines reported it, and a failing
		// test never tags, so a failed or filtered run would otherwise write
		// a matrix that mixes fresh cells with gaps. A -t filter (or a stray
		// .skip/.only) marks the other tests skipped, and an id backed by
		// several tests would then be ANDed over only some of them. Leave
		// the file alone in all of those cases.
		const rows = Object.entries(this.#matrix).sort(([a], [b]) => a.localeCompare(b));
		const complete = rows.length > 0 && rows.every(([, r]) => ENGINES.every((e) => e in r));
		const skipped = testModules.some((m) => m.children.allTests('skipped').next().done === false);
		if (reason !== 'passed' || skipped || !complete) {
			console.warn(
				'compat-matrix: partial, filtered or failed run — leaving results/automated.json untouched'
			);
			return;
		}
		const cells = Object.fromEntries(
			rows.map(([id, r]) => [id, Object.fromEntries(ENGINES.map((e) => [e, r[e]]))])
		);
		const playwright_versions = {
			chromium: await versionOf(chromium),
			firefox: await versionOf(firefox),
			webkit: await versionOf(webkit)
		};
		await writeFile(OUT, JSON.stringify({ playwright_versions, cells }, null, '\t') + '\n');
	}
}
