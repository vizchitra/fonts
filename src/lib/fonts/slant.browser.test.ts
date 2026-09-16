import { page } from 'vite-plus/test/browser/context';
import { beforeAll, describe, expect, test } from 'vite-plus/test';

/**
 * Cairo has no italic masters — its italic IS the `slnt` axis — so every way of
 * asking for italic Cairo reaches the same axis by a different route, and they
 * are emphatically NOT equally supported. This file is the compat matrix: each
 * technique declares which engines honour it, and the test fails if that ever
 * changes in either direction.
 *
 * These cannot be checked by measuring text. `slnt` barely moves advance widths
 * (Cairo's 'I' goes 248 -> 249 units per 1000, identically for -11 and +11, so
 * it does not even carry a sign). Each specimen is screenshotted instead and the
 * SHEAR of its ink measured directly — how far the top of the glyph sits to the
 * right of the bottom, as a fraction of height.
 *
 * Caveat that must not be forgotten: Playwright's WebKit is NOT Safari, and
 * certainly not old Safari. This pins cross-engine behaviour and catches
 * regressions; the /compat page stays for checking real Safari by hand.
 */

const FONT = '/fonts/v1/Cairo-Variable-latin.woff2';

/** tan(11deg) ~= 0.194: a fully slanted glyph shears ~19% of its height. */
const SLANTED = Math.tan((11 * Math.PI) / 180);
const TOLERANCE = 0.06;

type Engine = 'chromium' | 'firefox' | 'webkit';

const ua = navigator.userAgent;
const ENGINE: Engine = ua.includes('Firefox')
	? 'firefox'
	: ua.includes('Chrome')
		? 'chromium'
		: 'webkit';

const ALL: Engine[] = ['chromium', 'firefox', 'webkit'];

function injectFaces() {
	const style = document.createElement('style');
	style.textContent = `
		@font-face {
			font-family: 'CairoUpright';
			src: url('${FONT}') format('woff2');
			font-weight: 200 1000;
			font-style: normal;
		}
		/* The bare keyword — what fonts.css ships. */
		@font-face {
			font-family: 'CairoOblique';
			src: url('${FONT}') format('woff2');
			font-weight: 200 1000;
			font-style: oblique;
		}
		/* The same idea with an angle range, which is the trap. */
		@font-face {
			font-family: 'CairoObliqueRange';
			src: url('${FONT}') format('woff2');
			font-weight: 200 1000;
			font-style: oblique 0deg 11deg;
		}
		@font-face {
			font-family: 'CairoDescriptor';
			src: url('${FONT}') format('woff2');
			font-weight: 200 1000;
			font-style: normal;
			font-variation-settings: 'slnt' -11;
		}
	`;
	document.head.appendChild(style);
}

function specimen(css: string) {
	const el = document.createElement('div');
	// A plain uppercase I: flat terminals on a vertical stem, so its ink shears
	// cleanly. Black on white keeps thresholding trivial.
	el.textContent = 'I';
	el.style.cssText = `
		position: fixed; top: 40px; left: 40px; z-index: 9999;
		width: 200px; height: 260px; background: #fff; color: #000;
		font-size: 200px; line-height: 1.1; font-kerning: none;
		${css}
	`;
	document.body.appendChild(el);
	return el;
}

/**
 * Same as specimen(), but wrapped in an ancestor carrying its own CSS — to
 * reproduce app.css's `html { font-variation-settings: 'slnt' 0 }` reset and
 * check whether it blocks the automatic font-style -> slnt mapping for a
 * descendant that asks for italic without restating font-variation-settings.
 */
function nestedSpecimen(ancestorCss: string, css: string) {
	const wrapper = document.createElement('div');
	wrapper.style.cssText = ancestorCss;
	const el = document.createElement('div');
	el.textContent = 'I';
	el.style.cssText = `
		position: fixed; top: 40px; left: 40px; z-index: 9999;
		width: 200px; height: 260px; background: #fff; color: #000;
		font-size: 200px; line-height: 1.1; font-kerning: none;
		${css}
	`;
	wrapper.appendChild(el);
	document.body.appendChild(wrapper);
	return el;
}

async function shearOfEl(el: HTMLElement, root: HTMLElement = el): Promise<number> {
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
		const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

		const rows: { y: number; centre: number }[] = [];
		for (let y = 0; y < height; y++) {
			let min = -1;
			let max = -1;
			for (let x = 0; x < width; x++) {
				if (data[(y * width + x) * 4] < 128) {
					if (min === -1) min = x;
					max = x;
				}
			}
			if (min !== -1) rows.push({ y, centre: (min + max) / 2 });
		}
		expect(rows.length).toBeGreaterThan(20);

		// Top fifth against bottom fifth, skipping the antialiased extremes.
		const band = Math.max(1, Math.floor(rows.length / 5));
		const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
		const top = rows.slice(0, band);
		const bottom = rows.slice(-band);
		const dx = mean(top.map((r) => r.centre)) - mean(bottom.map((r) => r.centre));
		const dy = mean(bottom.map((r) => r.y)) - mean(top.map((r) => r.y));
		return dx / dy;
	} finally {
		root.remove();
	}
}

/** Horizontal offset between the ink's top and bottom, over their vertical gap. */
function shearOf(css: string): Promise<number> {
	return shearOfEl(specimen(css));
}

/** Same, with the specimen nested inside an ancestor carrying its own CSS. */
function shearOfNested(ancestorCss: string, css: string): Promise<number> {
	const el = nestedSpecimen(ancestorCss, css);
	return shearOfEl(el, el.parentElement as HTMLElement);
}

const TECHNIQUES = [
	{
		label: 'font-variation-settings at the use site',
		css: "font-family: 'CairoUpright'; font-variation-settings: 'slnt' -11;",
		worksIn: ALL,
		note: 'The baseline. What the Retalics Lab does. Works everywhere.'
	},
	{
		label: 'font-style: italic against a bare `oblique` face',
		css: "font-family: 'CairoOblique'; font-style: italic;",
		worksIn: ALL,
		note: 'What the generated fonts.css ships. Correct in all three engines.'
	},
	{
		label: 'font-style: oblique 11deg at the use site on a normal face',
		css: "font-family: 'CairoUpright'; font-style: oblique 11deg;",
		worksIn: ['firefox'],
		note: 'Firefox maps the angle onto slnt; Chromium and WebKit ignore it entirely. Do not use.'
	},
	{
		label: 'font-variation-settings as an @font-face DESCRIPTOR',
		css: "font-family: 'CairoDescriptor';",
		worksIn: ['chromium', 'firefox'],
		note: 'What the old hand-written font.css used — and it silently did nothing in WebKit/Safari.'
	}
] as const;

describe('Cairo slant techniques', () => {
	beforeAll(injectFaces);

	test('upright Cairo has no shear — the control', async () => {
		expect(Math.abs(await shearOf("font-family: 'CairoUpright';"))).toBeLessThan(0.04);
	});

	for (const t of TECHNIQUES) {
		const supported = (t.worksIn as readonly Engine[]).includes(ENGINE);
		test(`${t.label} ${supported ? 'slants' : 'is IGNORED'} in ${ENGINE}`, async () => {
			const shear = await shearOf(t.css);
			if (supported) {
				expect(shear).toBeGreaterThan(SLANTED - TOLERANCE);
				expect(shear).toBeLessThan(SLANTED + TOLERANCE);
			} else {
				// Pinned as broken on purpose: if an engine starts honouring this,
				// the test fails and docs/compat.md needs updating.
				expect(Math.abs(shear)).toBeLessThan(0.04);
			}
		});
	}

	test('an oblique ANGLE RANGE is mishandled by Chromium and WebKit', async () => {
		// The trap this whole file exists to document. `oblique 0deg 11deg` looks
		// more precise than the bare keyword and is wrong in two of three engines:
		// Chromium stacks a 14deg synthetic skew on top of the real axis (~0.44),
		// WebKit drops the axis and synthesises instead (~0.25). Only Firefox is
		// correct. Do not "improve" fonts.css into a range.
		const shear = await shearOf("font-family: 'CairoObliqueRange'; font-style: italic;");
		if (ENGINE === 'firefox') {
			expect(shear).toBeCloseTo(SLANTED, 1);
		} else {
			// Chromium lands near 0.44, WebKit near 0.25, correct is 0.194.
			expect(Math.abs(shear - SLANTED)).toBeGreaterThan(0.04);
		}
	});

	test('asking for italic on a normal-declared face double-slants in every engine', async () => {
		// font-style: italic on a family with no italic face makes the engine
		// synthesise a skew, which then stacks on top of the real axis: ~0.44
		// instead of ~0.19. This is why fonts.css declares an oblique-range face
		// rather than leaning an upright one, and why font-synthesis matters.
		const shear = await shearOf(
			"font-family: 'CairoUpright'; font-style: italic; font-variation-settings: 'slnt' -11;"
		);
		expect(shear).toBeGreaterThan(SLANTED * 1.8);
	});

	test('font-synthesis: none prevents that double-slant', async () => {
		const shear = await shearOf(
			"font-family: 'CairoUpright'; font-style: italic; font-synthesis: none; font-variation-settings: 'slnt' -11;"
		);
		expect(shear).toBeLessThan(SLANTED + TOLERANCE);
	});
});

describe('why app.css must never pin slnt on an ancestor', () => {
	beforeAll(injectFaces);

	// app.css used to pin `html { font-variation-settings: 'slnt' 0 }` to fix
	// the iOS Safari backslant (docs/compat.md), and it silently broke italic
	// everywhere, on every engine, not just old iOS. Confirmed here, and kept
	// as a permanent trap: font-variation-settings REPLACES the inherited
	// value rather than merging, so an ancestor's EXPLICIT 'slnt' 0 blocks the
	// automatic font-style -> slnt mapping that `font-style: italic` against
	// the bare `oblique` face relies on. If this test ever starts failing
	// because some engine changed that precedence, it's safe news, not a bug
	// — but do not use it as license to bring the ancestor pin back; the
	// correct fix stays component-level (axis-pinning.test.ts).
	const PINNED_ANCESTOR = "font-variation-settings: 'slnt' 0;";

	test('an ancestor pinning slnt blocks font-style: italic from ever slanting', async () => {
		const shear = await shearOfNested(
			PINNED_ANCESTOR,
			"font-family: 'CairoOblique'; font-style: italic;"
		);
		expect(Math.abs(shear)).toBeLessThan(0.04);
	});
});

describe('Cairo metrics', () => {
	beforeAll(injectFaces);

	function widthOf(text: string, css: string) {
		const el = document.createElement('span');
		el.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-size:200px;font-family:'CairoUpright';${css}`;
		el.textContent = text;
		document.body.appendChild(el);
		const w = el.getBoundingClientRect().width;
		el.remove();
		return w;
	}

	test('GPOS kerning is active and font-kerning can turn it off', async () => {
		await document.fonts.ready;
		expect(
			Math.abs(widthOf('AVAWAY', 'font-kerning: normal') - widthOf('AVAWAY', 'font-kerning: none'))
		).toBeGreaterThan(0.5);
	});

	test('slnt does not meaningfully change advance width', async () => {
		// Recorded because it is the reason every test above needs pixels.
		await document.fonts.ready;
		const upright = widthOf('Hamburgefonstiv', '');
		const slanted = widthOf('Hamburgefonstiv', "font-variation-settings: 'slnt' -11");
		expect(Math.abs(upright - slanted)).toBeLessThan(upright * 0.01);
	});
});
