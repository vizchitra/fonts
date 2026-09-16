import { beforeAll, describe, expect, test } from 'vite-plus/test';

/**
 * Phase 2 §2.2's other still-open check: does the unicode-range split
 * (latin/latin-ext/symbols) actually make the browser fetch only the subset
 * files a page needs, per docs/plan.md 2.1? `fonts.css` is already generated
 * with the split; this confirms the BROWSER honours it rather than fetching
 * every block eagerly.
 *
 * Measured via the Resource Timing API rather than the DevTools network
 * panel, since this needs to run headlessly in CI. `performance.getEntries`
 * only ever grows within a page, so each check filters for the specific file
 * it cares about instead of asserting on the full entry list.
 *
 * No SvelteKit plugin runs under Vitest (vite.config.ts), so the app's own
 * `fonts.css` is never loaded here — this fetches the actual generated file
 * (served from static/fonts/v1/ via publicDir) and injects it, so the test
 * exercises the real shipped subsetting, not a hand-rolled duplicate of it.
 *
 * `document.fonts.ready` is NOT enough to synchronise on in every engine:
 * measured directly, real WebKit resolves it before the subset file's fetch
 * even appears in the resource timing buffer, whereas Chromium and Firefox
 * both already have the entry by then. Poll instead of trusting one signal.
 */

async function injectRealFontsCss() {
	const css = await (await fetch('/fonts/v1/fonts.css')).text();
	const style = document.createElement('style');
	style.textContent = css;
	document.head.appendChild(style);
}

function fetchedWoff2Files(): string[] {
	return performance
		.getEntriesByType('resource')
		.map((e) => e.name)
		.filter((name) => name.endsWith('.woff2'))
		.map((name) => name.split('/').pop()!);
}

async function waitUntilFetched(file: string, timeoutMs = 2000): Promise<void> {
	const start = Date.now();
	while (!fetchedWoff2Files().includes(file)) {
		if (Date.now() - start > timeoutMs) {
			throw new Error(`${file} was not fetched within ${timeoutMs}ms`);
		}
		await new Promise((r) => setTimeout(r, 20));
	}
}

describe('fonts.css lazy-loads only the unicode-range subsets a page actually uses', () => {
	beforeAll(injectRealFontsCss);

	test('a latin-only page fetches the latin subset and nothing else', async () => {
		const el = document.createElement('div');
		el.style.cssText = "position:absolute; visibility:hidden; font-family: 'Cairo';";
		el.textContent = 'Hamburgefonstiv';
		document.body.appendChild(el);
		await document.fonts.ready;
		await waitUntilFetched('Cairo-Variable-latin.woff2');

		const fetched = fetchedWoff2Files();
		expect(fetched.some((f) => f === 'Cairo-Variable-latin.woff2')).toBe(true);
		expect(fetched.some((f) => f === 'Cairo-Variable-latin-ext.woff2')).toBe(false);
		expect(fetched.some((f) => f === 'Cairo-Variable-symbols.woff2')).toBe(false);

		el.remove();
	});

	test('adding a box-drawing character pulls the symbols subset, and only that one', async () => {
		// U+2500 BOX DRAWINGS LIGHT HORIZONTAL — inside the symbols
		// unicode-range (U+2500-257F) declared in fonts.css, not latin or
		// latin-ext.
		const el = document.createElement('div');
		el.style.cssText = "position:absolute; visibility:hidden; font-family: 'Cairo';";
		el.textContent = '─';
		document.body.appendChild(el);
		await document.fonts.ready;
		await waitUntilFetched('Cairo-Variable-symbols.woff2');

		const fetched = fetchedWoff2Files();
		expect(fetched.some((f) => f === 'Cairo-Variable-symbols.woff2')).toBe(true);
		expect(fetched.some((f) => f === 'Cairo-Variable-latin-ext.woff2')).toBe(false);

		el.remove();
	});
});
