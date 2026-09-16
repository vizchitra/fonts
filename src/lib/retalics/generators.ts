import { GLYPH_GROUPS, SEED_CONFIG, type RetalicsConfig } from './config';
import { clampSlant } from './slant';

/**
 * Ported verbatim from the original vizchitra `slanted.ts`, sawtooth and all:
 * slant is the letter's alphabetical distance from the m/n midpoint, so 'a'=0,
 * 'l'=+11, 'o'=-11, 'z'=0. Kept exactly as it was so the rule-based prototype
 * can be compared against the hand-tuned table rather than replaced by it.
 */
export function getLetterDistance(char: string): number {
	const startCode = 'a'.charCodeAt(0);
	const endCode = 'z'.charCodeAt(0);
	const leftMidpointCode = 'm'.charCodeAt(0);
	const rightMidpointCode = 'n'.charCodeAt(0);

	const currentCode = char.toLowerCase().charCodeAt(0);

	if (currentCode === leftMidpointCode || currentCode === rightMidpointCode) return 0;
	if (currentCode < leftMidpointCode && currentCode >= startCode) return currentCode - startCode;
	if (currentCode > rightMidpointCode && currentCode <= endCode)
		return (endCode - currentCode) * -1;
	return 0;
}

const letters = () =>
	GLYPH_GROUPS.filter((g) => g.name === 'Uppercase' || g.name === 'Lowercase').flatMap(
		(g) => g.glyphs
	);

export type Generator = { id: string; label: string; describe: string; run: () => RetalicsConfig };

export const GENERATORS: Generator[] = [
	{
		id: 'seed',
		label: 'LogoType seed',
		describe: 'The hand-tuned values from the original VizChitra logo.',
		run: () => structuredClone(SEED_CONFIG)
	},
	{
		id: 'mn-distance',
		label: 'm/n distance',
		describe: 'Slant by alphabetical distance from m/n — the original algorithmic rule.',
		run: () => ({
			defaultSlant: 0,
			glyphSlants: Object.fromEntries(letters().map((c) => [c, clampSlant(getLetterDistance(c))]))
		})
	},
	{
		id: 'flat',
		label: 'Flat −4',
		describe: 'Every glyph at the same slant — a control for judging the others against.',
		run: () => ({ defaultSlant: -4, glyphSlants: {} })
	},
	{
		id: 'alternating',
		label: 'Alternating ±6',
		describe: 'Zig-zag by position in the alphabet, to test how much variation reads as noise.',
		run: () => ({
			defaultSlant: 0,
			glyphSlants: Object.fromEntries(letters().map((c, i) => [c, i % 2 === 0 ? 6 : -6]))
		})
	},
	{
		id: 'reset',
		label: 'Zero',
		describe: 'Clear the table entirely.',
		run: () => ({ defaultSlant: 0, glyphSlants: {} })
	}
];
