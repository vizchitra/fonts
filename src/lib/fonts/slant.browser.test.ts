import { page } from 'vite-plus/test/browser/context';
import { beforeAll, describe, expect, test } from 'vite-plus/test';
import { tagMatrix } from './matrix-tag';

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
		/* The bare keyword — what fonts.css shipped BEFORE the migration to a
		   declared range (font-src/css.py, CAIRO_ITALIC). Kept as the
		   historical comparison point; CairoBoth/CairoBothRanged below are
		   what matters for the real, currently-shipped family. */
		@font-face {
			font-family: 'CairoOblique';
			src: url('${FONT}') format('woff2');
			font-weight: 200 1000;
			font-style: oblique;
		}
		/* The same idea with an angle range - -11deg..11deg is the font's
		   actual fvar slnt bounds (min -11, default 0, max 11), and what
		   fonts.css now ships (CAIRO_ITALIC). This is the trap for the BARE
		   keyword specifically: see the test below. */
		@font-face {
			font-family: 'CairoObliqueRange';
			src: url('${FONT}') format('woff2');
			font-weight: 200 1000;
			font-style: oblique -11deg 11deg;
		}
		/* Same family carrying BOTH a normal and a BARE oblique face - the
		   OLD shipped shape, before the migration to a declared range.
		   Unlike CairoOblique above (no normal sibling), this reproduces the
		   face-selection ambiguity bug: see 'against a family with BOTH
		   normal and BARE oblique' below. */
		@font-face {
			font-family: 'CairoBoth';
			src: url('${FONT}') format('woff2');
			font-weight: 200 1000;
			font-style: normal;
		}
		@font-face {
			font-family: 'CairoBoth';
			src: url('${FONT}') format('woff2');
			font-weight: 200 1000;
			font-style: oblique;
		}
		/* The REAL shape fonts.css now ships (font-src/css.py splits normal
		   and oblique into separate @font-face blocks referencing the same
		   file, same family): normal + a RANGED oblique face together, not
		   normal + a bare oblique face like CairoBoth above. */
		@font-face {
			font-family: 'CairoBothRanged';
			src: url('${FONT}') format('woff2');
			font-weight: 200 1000;
			font-style: normal;
		}
		@font-face {
			font-family: 'CairoBothRanged';
			src: url('${FONT}') format('woff2');
			font-weight: 200 1000;
			font-style: oblique -11deg 11deg;
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

// `matrixId`, where present, is the matching src/routes/compat/+page.svelte
// SLANT_TESTS id this technique backs — tagged onto the test below so
// scripts/compat-matrix-reporter.mjs can pick up its verdict. Omitted for
// entries with no corresponding displayed row (e.g. preliminary controls).
const TECHNIQUES = [
	{
		label: 'font-variation-settings at the use site',
		css: "font-family: 'CairoUpright'; font-variation-settings: 'slnt' -11;",
		worksIn: ALL,
		matrixId: 'fvs-use-site',
		note: 'The baseline. What the Retalics Lab does. Works everywhere.'
	},
	{
		label: 'font-style: italic against a bare `oblique` face',
		css: "font-family: 'CairoOblique'; font-style: italic;",
		worksIn: ALL,
		matrixId: 'oblique-range',
		note: 'What fonts.css shipped BEFORE the migration to a declared range - now historical. Correct in all three engines, but real Safari 18.7 does not do it at all (docs/compat.md) - Playwright cannot reproduce that gap.'
	},
	{
		label: 'font-style: oblique (bare, no angle) against a bare `oblique` face',
		css: "font-family: 'CairoOblique'; font-style: oblique;",
		worksIn: ALL,
		matrixId: 'oblique-bare',
		note:
			"CSS Fonts 4's font-style-matching algorithm treats this as an exact match against the " +
			"face's own font-style: oblique descriptor, with no italic-to-oblique fallback step in " +
			'between - one less layer of indirection than `italic`. Whether that difference changes ' +
			'anything on real Safari is untested here; Playwright cannot answer that question.'
	},
	{
		label: 'font-style: oblique 11deg at the use site on a normal face',
		css: "font-family: 'CairoUpright'; font-style: oblique 11deg;",
		worksIn: ['firefox'],
		matrixId: null,
		note: 'Firefox maps the angle onto slnt; Chromium and WebKit ignore it entirely. Do not use.'
	},
	{
		label:
			'font-style: oblique 11deg against a family with BOTH normal and BARE oblique (historical)',
		css: "font-family: 'CairoBoth'; font-style: oblique 11deg;",
		worksIn: ['firefox'],
		matrixId: 'oblique-angle',
		note:
			"CSS Fonts 4: OpenType's slnt axis is positive counter-clockwise, CSS's oblique angle is " +
			"positive clockwise, so `oblique 11deg` SHOULD resolve to 'slnt' -11 - the same target as " +
			'the recommended row, reached via matching instead of an explicit axis value. It does, in ' +
			'Firefox. CairoBoth carries both a normal AND a BARE oblique face under one family, ' +
			"matching fonts.css's OLD structure before the migration to a declared range (unlike " +
			'CairoOblique above, which is oblique-only and made this look like it worked everywhere - ' +
			'a measurement artifact, caught by comparing against the real /compat page: Chromium and ' +
			'WebKit pick the wrong face when a normal sibling ' +
			'exists and render upright, shear +0/-0, not even a partial lean. Do not use.'
	},
	{
		label: 'font-variation-settings as an @font-face DESCRIPTOR',
		css: "font-family: 'CairoDescriptor';",
		worksIn: ['chromium', 'firefox'],
		matrixId: 'fvs-descriptor',
		note: 'What the old hand-written font.css used — and it silently did nothing in WebKit/Safari.'
	}
] as const;

describe('Cairo slant techniques', () => {
	beforeAll(injectFaces);

	test('upright Cairo has no shear — the control', async ({ task }) => {
		expect(Math.abs(await shearOf("font-family: 'CairoUpright';"))).toBeLessThan(0.04);
		tagMatrix(task, 'upright-control', ENGINE, true);
	});

	for (const t of TECHNIQUES) {
		const supported = (t.worksIn as readonly Engine[]).includes(ENGINE);
		test(`${t.label} ${supported ? 'slants' : 'is IGNORED'} in ${ENGINE}`, async ({ task }) => {
			const shear = await shearOf(t.css);
			if (supported) {
				expect(shear).toBeGreaterThan(SLANTED - TOLERANCE);
				expect(shear).toBeLessThan(SLANTED + TOLERANCE);
			} else {
				// Pinned as broken on purpose: if an engine starts honouring this,
				// the test fails and docs/compat.md needs updating.
				expect(Math.abs(shear)).toBeLessThan(0.04);
			}
			if (t.matrixId) tagMatrix(task, t.matrixId, ENGINE, supported);
		});
	}

	test("the BARE oblique keyword against a ranged face is mishandled, even at the font's own true bounds", async ({
		task
	}) => {
		// The trap this whole file exists to document. `oblique -11deg 11deg`
		// is not a mismatched or arbitrary range — it's Cairo's actual fvar
		// slnt bounds. The trap is specifically the BARE keyword: CSS Fonts 4
		// says lack of an angle implies 14deg, which is OUTSIDE this face's
		// declared -11..11 bounds, so the browser falls back to synthesis to
		// reach 14deg on top of the (correctly matched) axis: Chromium stacks
		// a ~0.44 synthetic skew, WebKit prefers synthesis over the axis and
		// lands near the same ~0.44. Only Firefox is correct (~0.194).
		// Correction from an earlier version of this comment: this is NOT
		// "declaring any oblique range breaks it, correct bounds or not" —
		// stating the EXACT angle the range covers (11deg, not bare) resolves
		// correctly in every engine (see the technique below). fonts.css now
		// ships exactly this range (font-src/css.py, CAIRO_ITALIC) precisely
		// because pairing the exact angle with an explicit slnt value covers
		// BOTH this trap and real Safari 18.7's total lack of automatic
		// mapping - see 'oblique-range-combo' on /compat for the reasoning.
		const shear = await shearOf("font-family: 'CairoObliqueRange'; font-style: oblique;");
		const pass = ENGINE === 'firefox';
		if (pass) {
			expect(shear).toBeCloseTo(SLANTED, 1);
		} else {
			expect(Math.abs(shear - SLANTED)).toBeGreaterThan(0.04);
		}
		tagMatrix(task, 'oblique-explicit', ENGINE, pass);
	});

	test('the oblique-range trap is neutralised by font-synthesis: weight', async () => {
		// This is why /compat's "trap" row can look correct on THIS site: html
		// in app.css sets font-synthesis: weight globally, which forbids
		// synthetic oblique. Chromium's failure mode was ENTIRELY a synthetic
		// skew stacked on top of the (correctly mapped) real axis — remove the
		// synthetic half and what's left is correct. WebKit's failure mode
		// turns out to be the same shape: given the choice, it prefers to
		// synthesise over consulting the axis; forbid synthesis and it falls
		// back to the axis, which was correct all along.
		//
		// This does NOT make the BARE keyword safe against the ranged face
		// fonts.css now ships — fonts.css controls the @font-face, not what
		// font-synthesis a consumer sets, and the bare keyword still needs
		// the exact angle stated instead to be reliable (see the technique
		// below). That's exactly why the REQUIRED use-site pattern pairs the
		// exact angle with an explicit slnt value, not the bare keyword.
		const shear = await shearOf(
			"font-family: 'CairoObliqueRange'; font-style: oblique; font-synthesis: weight;"
		);
		expect(shear).toBeGreaterThan(SLANTED - TOLERANCE);
		expect(shear).toBeLessThan(SLANTED + TOLERANCE);
	});

	test('font-synthesis: weight style un-neutralises it, even under an ancestor pin', async ({
		task
	}) => {
		// /compat's trap row needs to demonstrate the danger despite sitting
		// under html's font-synthesis: weight. Two wrong turns first, both
		// disproved against a real browser rather than assumed: `auto` is
		// not a valid font-synthesis value, so the browser drops it
		// silently and the row measured "correct" for the wrong reason.
		// `revert` looked like the fix, but font-synthesis is an INHERITED
		// property, and revert falls back to the inherited value (the
		// ancestor's `weight`) when no lower-origin rule exists — so it
		// re-inherits the very pin it was meant to escape, and the row
		// stays "correct" again, still for the wrong reason (confirm this
		// row's own SLANTED-ish result if `revert` is subbed back in).
		// Stating the actual initial value explicitly is what works.
		const shear = await shearOfNested(
			'font-synthesis: weight;',
			"font-family: 'CairoObliqueRange'; font-style: oblique; font-synthesis: weight style;"
		);
		const pass = ENGINE === 'firefox';
		if (pass) {
			expect(shear).toBeCloseTo(SLANTED, 1);
		} else {
			expect(Math.abs(shear - SLANTED)).toBeGreaterThan(0.04);
		}
		tagMatrix(task, 'oblique-explicit', ENGINE, pass);
	});

	test('stating the EXACT angle a ranged face declares resolves correctly, synthesis or not', async ({
		task
	}) => {
		// The trap above is triggered by the BARE keyword, not by the range
		// itself: `font-style: oblique` with no angle implies CSS's default
		// of 14deg (CSS Fonts 4), which is OUTSIDE this face's declared
		// -11deg..11deg bounds - so the browser falls back to synthesis to
		// reach 14deg, stacking on top of the (correctly matched) axis.
		// State the angle the face actually supports, 11deg, and there is
		// nothing left to fall back to: resolves via the axis alone,
		// correctly, in every engine, whether or not synthesis is allowed.
		// Caught by a real discrepancy between this file and a live check
		// of /compat in an actual Chrome/Safari, not by reasoning about the
		// spec - see 'against a family with BOTH normal and BARE oblique'
		// above for the sibling finding that started this.
		const withSynthesis = await shearOf(
			"font-family: 'CairoObliqueRange'; font-style: oblique 11deg;"
		);
		const synthesisForbidden = await shearOf(
			"font-family: 'CairoObliqueRange'; font-style: oblique 11deg; font-synthesis: weight style;"
		);
		for (const shear of [withSynthesis, synthesisForbidden]) {
			expect(shear).toBeGreaterThan(SLANTED - TOLERANCE);
			expect(shear).toBeLessThan(SLANTED + TOLERANCE);
		}
		tagMatrix(task, 'oblique-range-angle', ENGINE, true);
	});

	test('italic against the ranged face fails too, but not the same way as bare oblique', async ({
		task
	}) => {
		// Completes the matrix: the last untested cell for the ranged face.
		// Per spec (CSS Fonts 4), italic's angle is NOT 14deg like bare
		// oblique's - it's explicitly "unspecified." So this is a DIFFERENT
		// gap, not the same one restated: whatever angle an engine picks for
		// italic isn't guaranteed to fall inside this face's declared bounds
		// either, and it doesn't. Broken in the same two engines as bare
		// oblique, but by a DIFFERENT amount: Chromium ~0.44, the same
		// double-stack shape (axis correctly set to -11, PLUS a synthetic
		// skew on top). WebKit ~0.249 this time, not ~0.44 - that's
		// tan(14deg), a PURE synthetic skew with NO axis contribution at
		// all, a third, genuinely different failure mode. Measured, not
		// assumed to match the sibling row just because both are "the trap."
		const shear = await shearOf("font-family: 'CairoObliqueRange'; font-style: italic;");
		if (ENGINE === 'firefox') {
			expect(shear).toBeCloseTo(SLANTED, 1);
		} else if (ENGINE === 'chromium') {
			expect(Math.abs(shear - SLANTED)).toBeGreaterThan(0.04);
		} else {
			expect(shear).toBeCloseTo(Math.tan((14 * Math.PI) / 180), 1);
		}
		tagMatrix(task, 'italic-vs-range', ENGINE, ENGINE === 'firefox');
	});

	test('oblique 11deg PLUS explicit slnt together, against the ranged face: no interaction', async ({
		task
	}) => {
		// The belt-and-suspenders migration pattern: once fonts.css eventually
		// declares its true slnt range, pair the exact angle with an explicit
		// slnt value the same way the CURRENT recommended row pairs bare
		// oblique with explicit slnt - so whichever half a given engine gets
		// right, the other covers it, and the explicit value is provably safe
		// to delete later once range-matching is trusted everywhere. Measured
		// rather than assumed: the two angles agree here (11deg CSS == 'slnt'
		// -11), unlike the trap's out-of-bounds mismatch, so there's no
		// reason to expect the synthesis-preference bug to reappear - but
		// that reasoning alone has been wrong before this session, so it's
		// checked directly.
		const shear = await shearOf(
			"font-family: 'CairoObliqueRange'; font-style: oblique 11deg; font-variation-settings: 'slnt' -11;"
		);
		expect(shear).toBeGreaterThan(SLANTED - TOLERANCE);
		expect(shear).toBeLessThan(SLANTED + TOLERANCE);
		tagMatrix(task, 'oblique-range-combo', ENGINE, true);
	});

	test('bare oblique PLUS explicit slnt against a bare-oblique face: correct, both halves cover each other', async ({
		task
	}) => {
		// The 'recommended' row on /compat: what fonts.css shipped before the
		// migration to a declared range, and still valid for any face with no
		// declared range. font-style: oblique asks for the mapping; the
		// element's own explicit slnt wins over it either way.
		const shear = await shearOf(
			"font-family: 'CairoOblique'; font-style: oblique; font-variation-settings: 'slnt' -11;"
		);
		expect(shear).toBeGreaterThan(SLANTED - TOLERANCE);
		expect(shear).toBeLessThan(SLANTED + TOLERANCE);
		tagMatrix(task, 'recommended', ENGINE, true);
	});

	test('an explicit slnt at the use site works against the RANGED face too, no font-style at all', async ({
		task
	}) => {
		// /compat's 'fvs-anywhere-B' cell: mechanism-based — an explicit
		// same-element slnt wins regardless of what the face's own font-style
		// descriptor is doing, so it must not matter that this face declares
		// a range. Measured here rather than assumed from the mechanism.
		const shear = await shearOf(
			"font-family: 'CairoObliqueRange'; font-variation-settings: 'slnt' -11;"
		);
		expect(shear).toBeGreaterThan(SLANTED - TOLERANCE);
		expect(shear).toBeLessThan(SLANTED + TOLERANCE);
		tagMatrix(task, 'fvs-anywhere-B', ENGINE, true);
	});

	test('italic PLUS slnt against the shipped-shape family under font-synthesis: weight leans once, not twice', async ({
		task
	}) => {
		// /compat's 'synthesis' row, on the shape fonts.css actually ships
		// (normal + ranged oblique together) and under the site's own global
		// font-synthesis: weight (app.css). Should match the recommended
		// row's lean, not stack a synthesised skew on top of it.
		const shear = await shearOf(
			"font-family: 'CairoBothRanged'; font-style: italic; font-synthesis: weight; font-variation-settings: 'slnt' -11;"
		);
		expect(shear).toBeGreaterThan(SLANTED - TOLERANCE);
		expect(shear).toBeLessThan(SLANTED + TOLERANCE);
		tagMatrix(task, 'synthesis', ENGINE, true);
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

	test('oblique 11deg alone still resolves correctly with a normal sibling face present', async ({
		task
	}) => {
		// The face-selection bug in 'oblique 11deg against a family with BOTH
		// normal and BARE oblique' above is specific to a BARE oblique descriptor competing with a
		// normal sibling - ambiguous, because bare oblique declares no bounds
		// for the matching algorithm to prefer it unambiguously for an angled
		// request. A RANGED oblique descriptor that explicitly covers the
		// requested angle removes that ambiguity: this is the actual shape
		// shipping the migration-path pattern would produce (css.py splits
		// normal and oblique into separate @font-face blocks referencing the
		// same file, same family), not the isolated CairoObliqueRange face
		// used elsewhere in this file. Measured before trusting it, because
		// the isolated-face assumption has been wrong before this session.
		const shear = await shearOf("font-family: 'CairoBothRanged'; font-style: oblique 11deg;");
		expect(shear).toBeGreaterThan(SLANTED - TOLERANCE);
		expect(shear).toBeLessThan(SLANTED + TOLERANCE);
		tagMatrix(task, 'oblique-range-angle', ENGINE, true);
	});

	test('the migration-path combo also resolves correctly with a normal sibling face present', async ({
		task
	}) => {
		const shear = await shearOf(
			"font-family: 'CairoBothRanged'; font-style: oblique 11deg; font-variation-settings: 'slnt' -11;"
		);
		expect(shear).toBeGreaterThan(SLANTED - TOLERANCE);
		expect(shear).toBeLessThan(SLANTED + TOLERANCE);
		tagMatrix(task, 'oblique-range-combo', ENGINE, true);
	});

	test('bare oblique against normal+ranged-oblique together is still the same trap', async ({
		task
	}) => {
		// The normal sibling doesn't change the bare-keyword trap either: same
		// ~0.44 double-stack in Chromium/WebKit as the isolated ranged face
		// (CairoObliqueRange) elsewhere in this file. Confirms the trap and
		// the fix are both about the ANGLE, not about face-selection ambiguity
		// - a normal sibling changes neither.
		const shear = await shearOf("font-family: 'CairoBothRanged'; font-style: oblique;");
		const pass = ENGINE === 'firefox';
		if (pass) {
			expect(shear).toBeCloseTo(SLANTED, 1);
		} else {
			expect(Math.abs(shear - SLANTED)).toBeGreaterThan(0.04);
		}
		tagMatrix(task, 'oblique-explicit', ENGINE, pass);
	});

	test('the font-weight PROPERTY never disturbs an explicit slnt value', async () => {
		const shear = await shearOf(
			"font-family: 'CairoUpright'; font-weight: 700; font-variation-settings: 'slnt' -11;"
		);
		expect(shear).toBeGreaterThan(SLANTED - TOLERANCE);
		expect(shear).toBeLessThan(SLANTED + TOLERANCE);
	});

	test('font-variation-settings wght ALONE, with no ancestor pin, does not block the mapping either', async () => {
		// Contrast with 'a same-element slnt override blocks italic' below,
		// which pins 'slnt' 0 explicitly on the SAME axis the automatic
		// mapping would set - that explicit same-axis value is what wins.
		// Stating a DIFFERENT axis (wght) via font-variation-settings, with
		// no ancestor pin anywhere in the chain, leaves slnt free for the
		// automatic font-style mapping to fill in; measured here rather
		// than assumed from the REPLACES-not-merges framing, which is about
		// inheritance clobbering an ANCESTOR's slnt, not about one axis
		// blocking a different axis's automatic value on the same element.
		// Still prefer the font-weight PROPERTY (row above) for weight in
		// general - it can never interact with this axis at all, so it
		// carries none of this reasoning's risk in a deeper component tree.
		const shear = await shearOf(
			"font-family: 'CairoOblique'; font-style: oblique; font-variation-settings: 'wght' 700;"
		);
		expect(shear).toBeGreaterThan(SLANTED - TOLERANCE);
		expect(shear).toBeLessThan(SLANTED + TOLERANCE);
	});
});

describe('an explicit slnt anywhere in the chain blocks italic', () => {
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

	// The compounding bug: /compat's own `.sample` base class states 'slnt' 0
	// on the SAME element as `.m-oblique`'s `font-style: italic` — no
	// ancestor involved. A same-element explicit value blocks the automatic
	// mapping just as hard as an inherited one, so every /compat row that
	// didn't restate font-variation-settings itself (m-oblique, m-oblique-
	// range, m-descriptor) was upright regardless of the ancestor-pin fix.
	// `font-variation-settings: normal` on those classes releases it.
	test('a same-element slnt override blocks italic, and `normal` releases it', async () => {
		const SAMPLE_EQUIVALENT = "font-variation-settings: 'wght' 600, 'slnt' 0;";
		const withoutRelease = await shearOf(
			`font-family: 'CairoOblique'; ${SAMPLE_EQUIVALENT} font-style: italic;`
		);
		expect(Math.abs(withoutRelease)).toBeLessThan(0.04);

		const withRelease = await shearOf(
			`font-family: 'CairoOblique'; ${SAMPLE_EQUIVALENT} font-style: italic; font-variation-settings: normal;`
		);
		expect(withRelease).toBeGreaterThan(SLANTED - TOLERANCE);
	});

	// Real Safari 18.7 (iPhone XR) does not perform the automatic font-style ->
	// slnt mapping at all, even against a bare `oblique` face with no ancestor
	// pin in the way — confirmed on-device on /compat, not reproducible here
	// since Playwright's WebKit is a different, newer build that does perform
	// it. This is exactly the kind of engine divergence the CSSWG's ongoing
	// "ital"/font-style discussion (see docs/compat.md) is about, and it can't
	// be pinned by a browser test the way the ancestor-pin hazard above can.
	//
	// The fix is to not depend on the automatic mapping as the MECHANISM at
	// all: set font-variation-settings: 'slnt' -11 directly at the use site.
	// This test proves that technique's other advantage over font-style:
	// italic - it is immune to the exact ancestor-pin hazard above, because an
	// element's own explicit declaration always wins over an inherited one,
	// regardless of what ancestor set. Real Safari not implementing the
	// automatic mapping therefore cannot break this: there is no mapping to
	// fail, the axis is set directly.
	test('an explicit slnt at the use site survives an ancestor pin, unlike italic', async () => {
		const shear = await shearOfNested(
			PINNED_ANCESTOR,
			"font-family: 'CairoUpright'; font-variation-settings: 'slnt' -11;"
		);
		expect(shear).toBeGreaterThan(SLANTED - TOLERANCE);
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
