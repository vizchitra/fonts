#!/usr/bin/env node
// Captures the exact bundled versions of the three Playwright browsers this
// repo's tests run against (playwright@<version> pinned in package.json),
// replacing the old manual step of running `browser.version()` once by hand
// and pasting the string into +page.svelte / docs/manual.json.
//
// navigator.userAgent can't answer this from inside a test: Chrome UA strings
// are version-frozen, and Playwright's WebKit build number ("26.6", its own
// revision tag) never appears in a WebKit UA string at all. `browser.version()`
// is a Node-side Playwright API, so this runs as a standalone script rather
// than from inside the browser-mode test suite.
import { chromium, firefox, webkit } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const PAGE_OUT = fileURLToPath(
	new URL('../src/lib/fonts/browser-versions.generated.json', import.meta.url)
);
const MANUAL_JSON = fileURLToPath(new URL('../docs/manual.json', import.meta.url));
const MATRIX_JSON = fileURLToPath(
	new URL('../src/lib/fonts/compat-matrix.generated.json', import.meta.url)
);

async function versionOf(launcher) {
	const browser = await launcher.launch();
	try {
		return browser.version();
	} finally {
		await browser.close();
	}
}

async function main() {
	const versions = {
		chromium: await versionOf(chromium),
		firefox: await versionOf(firefox),
		webkit: await versionOf(webkit)
	};
	await writeFile(PAGE_OUT, JSON.stringify(versions, null, '\t') + '\n');
	console.log(`wrote ${PAGE_OUT}`, versions);

	// Also refresh docs/manual.json's automated/playwright_versions fields —
	// the real-device `old`/`new` fields and everything else are read back
	// and rewritten verbatim, never touched by this script.
	const manual = JSON.parse(await readFile(MANUAL_JSON, 'utf8'));
	const matrix = JSON.parse(await readFile(MATRIX_JSON, 'utf8'));

	manual.playwright_versions = versions;
	for (const cell of manual.cells) {
		const row = matrix[cell.id];
		if (!row) continue;
		cell.automated = { chromium: row.chromium, firefox: row.firefox, webkit: row.webkit };
	}

	await writeFile(MANUAL_JSON, JSON.stringify(manual, null, '\t') + '\n');
	console.log(`wrote ${MANUAL_JSON} (automated + playwright_versions refreshed)`);
}

await main();
