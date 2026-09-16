import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vite-plus/test';

/**
 * Guards the iOS Safari backslant bug (docs/compat.md).
 *
 * `font-variation-settings` REPLACES the inherited value rather than merging
 * with it, so a rule declaring only 'wght' silently discards the `'slnt' 0`
 * reset in app.css. On older iOS Safari the axis then falls back to something
 * that is not upright and Cairo leans backwards.
 *
 * No browser test can catch this: desktop WebKit renders it upright, and
 * Playwright's WebKit is not an old iPhone. So the rule is enforced at the
 * source level instead — if you set 'wght', you must also state 'slnt'.
 */

const ROOT = new URL('../../..', import.meta.url).pathname;

// This route deliberately renders the broken case side by side with the fixed
// one, so that the bug can be re-checked on a real device.
const DEMONSTRATES_THE_BUG = 'src/routes/compat/';

function sourceFiles(dir: string, acc: string[] = []): string[] {
	for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
		const rel = `${dir}/${entry.name}`;
		if (entry.isDirectory()) sourceFiles(rel, acc);
		else if (/\.(svelte|css|ts)$/.test(entry.name)) acc.push(rel);
	}
	return acc;
}

/** Every font-variation-settings value in a file, with its line number. */
function declarations(source: string) {
	// A declaration value ends at ';' or '}', but `${wght}` in a Svelte template
	// literal contains a '}' that would truncate the match. Blank the
	// interpolations first, keeping the text length so line numbers stay right.
	const text = source.replace(/\$\{[^{}]*\}/g, (m) => '_'.repeat(m.length));

	const out: { line: number; value: string }[] = [];
	const re = /font-variation-settings\s*:\s*([^;}]*)/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		out.push({ line: text.slice(0, m.index).split('\n').length, value: m[1] });
	}
	return out;
}

describe('slnt is never left unpinned', () => {
	test('any font-variation-settings setting wght also states slnt', () => {
		const offenders: string[] = [];

		for (const file of sourceFiles('src')) {
			if (file.includes(DEMONSTRATES_THE_BUG)) continue;
			const text = readFileSync(join(ROOT, file), 'utf8');
			for (const { line, value } of declarations(text)) {
				const flat = value.replace(/\s+/g, ' ').trim();
				// A var() indirection carries whatever the custom property holds,
				// so it is checked where that property is defined, not here.
				if (flat.includes('var(--letter-slant)')) continue;
				if (flat.includes('wght') && !flat.includes('slnt')) {
					offenders.push(`${file}:${line} — ${flat}`);
				}
			}
		}

		expect(offenders).toStrictEqual([]);
	});

	test('app.css pins the axis upright and forbids synthesised oblique', () => {
		const css = readFileSync(join(ROOT, 'src/app.css'), 'utf8');
		expect(css).toMatch(/font-variation-settings:\s*'slnt'\s*0/);
		expect(css).toMatch(/font-synthesis:\s*weight/);
	});
});
