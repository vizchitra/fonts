/**
 * Retalics design data. Pure and UI-free: this is the part that has to survive
 * into the font build, so it carries no view state.
 */

export type RetalicsConfig = {
	defaultSlant: number;
	glyphSlants: Record<string, number>;
};

/** Measured from Cairo[slnt,wght].ttf, not guessed. */
export const SLNT_MIN = -11;
export const SLNT_MAX = 11;
export const WGHT_MIN = 200;
export const WGHT_MAX = 1000;

/**
 * The hand-tuned values from the original LogoType component, which until now
 * lived only as hardcoded CSS. Keys are case-sensitive: a font treats 'V' and
 * 'v' as separate glyphs with genuinely different slant tolerances, so only the
 * uppercase the logo actually used is seeded here.
 */
export const SEED_CONFIG: RetalicsConfig = {
	defaultSlant: 0,
	glyphSlants: { V: -4, I: 8, Z: 0, C: 2, H: 7, T: -6, R: -8, A: 0 }
};

export type GlyphGroup = { name: string; glyphs: string[] };

const range = (from: string, to: string) =>
	Array.from({ length: to.codePointAt(0)! - from.codePointAt(0)! + 1 }, (_, i) =>
		String.fromCodePoint(from.codePointAt(0)! + i)
	);

export const GLYPH_GROUPS: GlyphGroup[] = [
	{ name: 'Uppercase', glyphs: range('A', 'Z') },
	{ name: 'Lowercase', glyphs: range('a', 'z') },
	{ name: 'Numerals', glyphs: range('0', '9') },
	{ name: 'Punctuation', glyphs: Array.from('.,;:!?\'"‘’“”·…') },
	{ name: 'Symbols', glyphs: Array.from('&@#%*+-–—=/\\|()[]{}<>$€₹') }
];

/** Pairs worth inspecting for slant interaction, spacing and rhythm. */
export const TEST_PAIRS = [
	'AV',
	'VA',
	'AW',
	'WA',
	'AY',
	'YA',
	'To',
	'Ta',
	'Te',
	'Ty',
	'Yo',
	'Wa',
	'Wo',
	'LT',
	'RT',
	'RA',
	'TA',
	'FA',
	'PA'
];

export const DEFAULT_TEXT =
	'VIZCHITRA — The quick brown fox jumps over the lazy dog. AVAST, Wavy Type 2026!';
