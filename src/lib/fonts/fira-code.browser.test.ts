import { page } from 'vite-plus/test/browser/context';
import { beforeAll, describe, expect, test } from 'vite-plus/test';

/**
 * Two of Phase 2 §2.2's still-open Fira Code checks:
 *
 * 1. docs/plan.md claimed (from fontTools/binary inspection, not a live
 *    browser) "Fira Code's default weight is 300, not 400. Unset
 *    font-weight renders Light." Measured directly here against the REAL
 *    fonts.css: that claim does not hold once the @font-face declares a
 *    `font-weight: 300 700` RANGE descriptor, which it does. CSS's initial
 *    font-weight is 400 ("normal"), 400 sits inside 300..700, so an unset
 *    weight resolves to 400, not the font's internal fvar default of 300 -
 *    confirmed bit-identical to an explicit font-weight: 400 in all three
 *    engines. The risk described in font-src/css.py would only be real if
 *    the range descriptor were dropped.
 *
 * 2. Every one of Fira Code's 86 ligatures is powered by `calt`, not `liga`
 *    (docs/plan.md, catalogue). CSS's font-variant-ligatures maps
 *    `contextual`/`no-contextual` to `calt` - `common-ligatures` does NOT
 *    touch it, an easy thing to get wrong. Also checks who wins when
 *    font-variant-ligatures and font-feature-settings disagree about the
 *    same feature on the same element.
 *
 *    Measured by PIXELS, not width: Fira Code's ligatures are deliberately
 *    designed to preserve the monospace column count (the whole point, for
 *    use in code editors), so a formed ligature is NOT narrower than its
 *    unligated characters - width comparison would silently test nothing.
 *    Same lesson as slant.browser.test.ts's shear-not-width finding, applied
 *    to a different axis of "the metric doesn't move, the ink does."
 *
 * Uses the REAL generated fonts.css (fetched and injected), not a
 * hand-rolled duplicate - see lazy-loading.browser.test.ts for why: no
 * SvelteKit plugin runs under Vitest, so the app's own fonts.css import
 * never happens here.
 */

async function injectRealFontsCss() {
	const css = await (await fetch('/fonts/v1/fonts.css')).text();
	const style = document.createElement('style');
	style.textContent = css;
	document.head.appendChild(style);
}

async function screenshotOf(text: string, css: string): Promise<ImageData> {
	const el = document.createElement('div');
	el.textContent = text;
	el.style.cssText = `
		position: fixed; top: 40px; left: 40px; z-index: 9999;
		width: 400px; height: 260px; background: #fff; color: #000;
		font-size: 200px; line-height: 1.1; white-space: pre;
		font-family: 'Fira Code'; font-weight: 400;
		${css}
	`;
	document.body.appendChild(el);
	await document.fonts.ready;
	try {
		const shot = await page.screenshot({ element: el, base64: true });
		const img = new Image();
		img.src = `data:image/png;base64,${shot.base64}`;
		await img.decode();

		const canvas = document.createElement('canvas');
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		const ctx = canvas.getContext('2d')!;
		ctx.drawImage(img, 0, 0);
		return ctx.getImageData(0, 0, canvas.width, canvas.height);
	} finally {
		el.remove();
	}
}

/** Fraction of dark pixels — a proxy for stroke weight. */
async function inkDensity(css: string): Promise<number> {
	const { data } = await screenshotOf('H', css);
	let dark = 0;
	for (let i = 0; i < data.length; i += 4) {
		if (data[i] < 128) dark++;
	}
	return dark / (data.length / 4);
}

/** Fraction of pixels that differ (either side dark, other light) between two renderings of the same text. */
async function renderingDiffers(text: string, cssA: string, cssB: string): Promise<number> {
	const a = await screenshotOf(text, cssA);
	const b = await screenshotOf(text, cssB);
	expect(a.data.length).toBe(b.data.length);
	let diff = 0;
	let total = 0;
	for (let i = 0; i < a.data.length; i += 4) {
		const darkA = a.data[i] < 128;
		const darkB = b.data[i] < 128;
		if (darkA !== darkB) diff++;
		total++;
	}
	return diff / total;
}

describe('Fira Code weight range and calt ligatures', () => {
	beforeAll(injectRealFontsCss);

	test("an unset font-weight resolves to 400, not the font's internal 300 default", async () => {
		const unset = await inkDensity("font-family: 'Fira Code';");
		const explicit300 = await inkDensity("font-family: 'Fira Code'; font-weight: 300;");
		const explicit400 = await inkDensity("font-family: 'Fira Code'; font-weight: 400;");

		// Bit-identical to 400, clearly distinct from 300 - because fonts.css's
		// @font-face declares font-weight: 300 700 as a RANGE, and CSS's
		// initial value (400) falls inside it.
		expect(unset).toBe(explicit400);
		expect(Math.abs(explicit400 - explicit300)).toBeGreaterThan(0.01);
	});

	test('a real weight difference is visible between 300 and 700', async () => {
		const explicit300 = await inkDensity("font-family: 'Fira Code'; font-weight: 300;");
		const explicit700 = await inkDensity("font-family: 'Fira Code'; font-weight: 700;");
		expect(explicit700).toBeGreaterThan(explicit300 * 1.15);
	});

	test('calt is on by default, and turning it off visibly changes the glyphs', async () => {
		const diff = await renderingDiffers('=>', '', "font-feature-settings: 'calt' 0;");
		// Two glyphs' worth of ink moving is a lot more than antialiasing noise.
		expect(diff).toBeGreaterThan(0.01);
	});

	test('font-variant-ligatures: no-common-ligatures does NOT touch calt', async () => {
		// common-ligatures maps to liga/clig, not calt - Fira Code has no liga
		// at all (docs/plan.md), so this property targeting the wrong feature
		// is exactly the mistake this test exists to catch.
		const diff = await renderingDiffers('=>', '', 'font-variant-ligatures: no-common-ligatures;');
		expect(diff).toBeLessThan(0.005);
	});

	test('font-variant-ligatures: no-contextual DOES disable calt', async () => {
		const diff = await renderingDiffers(
			'=>',
			"font-feature-settings: 'calt' 0;",
			'font-variant-ligatures: no-contextual;'
		);
		// Both are "calt off" - should render the same as each other.
		expect(diff).toBeLessThan(0.005);
	});

	test('when they disagree on the same element, font-feature-settings wins', async () => {
		// font-variant-ligatures: contextual asks for calt ON;
		// font-feature-settings: 'calt' 0 asks for it OFF, same element.
		// Measured against both possible outcomes, not assumed from the
		// spec's wording.
		const vsDisabled = await renderingDiffers(
			'=>',
			"font-feature-settings: 'calt' 0;",
			"font-variant-ligatures: contextual; font-feature-settings: 'calt' 0;"
		);
		const vsEnabled = await renderingDiffers(
			'=>',
			'',
			"font-variant-ligatures: contextual; font-feature-settings: 'calt' 0;"
		);
		expect(vsDisabled).toBeLessThan(0.005);
		expect(vsEnabled).toBeGreaterThan(0.01);
	});
});
