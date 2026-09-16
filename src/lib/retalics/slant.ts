import { SLNT_MAX, SLNT_MIN, type RetalicsConfig } from './config';

export type SlantedChar = { char: string; slant: number };

export const clampSlant = (n: number) => Math.min(SLNT_MAX, Math.max(SLNT_MIN, n));

/**
 * Exact-key lookup with a fallback, so unknown characters, punctuation,
 * whitespace and emoji all resolve to something renderable.
 */
export function slantFor(char: string, config: RetalicsConfig): number {
	const value = config.glyphSlants[char];
	return clampSlant(value ?? config.defaultSlant);
}

/**
 * The config-driven replacement for the old `formatSlantedText(text)`, which
 * derived slant from a hardcoded alphabet rule. Splits with `Array.from` so
 * astral characters stay single units rather than surrogate halves.
 */
export function formatSlantedText(text: string, config: RetalicsConfig): SlantedChar[] {
	return Array.from(text, (char) => ({ char, slant: slantFor(char, config) }));
}

/**
 * Groups a string into runs so whitespace can be emitted as plain text between
 * spans. Wrapping every character including spaces would break word wrapping.
 */
export function segments(text: string, config: RetalicsConfig) {
	const out: Array<{ space: true; text: string } | { space: false; chars: SlantedChar[] }> = [];
	for (const char of Array.from(text)) {
		const isSpace = /\s/.test(char);
		const last = out.at(-1);
		if (isSpace) {
			if (last?.space) last.text += char;
			else out.push({ space: true, text: char });
		} else {
			const entry = { char, slant: slantFor(char, config) };
			if (last && !last.space) last.chars.push(entry);
			else out.push({ space: false, chars: [entry] });
		}
	}
	return out;
}
