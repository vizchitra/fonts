import { describe, expect, test } from 'vite-plus/test';
import { SEED_CONFIG, SLNT_MAX, SLNT_MIN, type RetalicsConfig } from './config';
import { formatSlantedText, segments, slantFor } from './slant';
import { getLetterDistance } from './generators';

const config: RetalicsConfig = { defaultSlant: 2, glyphSlants: { V: -4, I: 8 } };

describe('slantFor', () => {
	test('uses the tuned value when the glyph is in the table', () => {
		expect(slantFor('V', config)).toBe(-4);
		expect(slantFor('I', config)).toBe(8);
	});

	test('falls back to defaultSlant for untuned and unknown characters', () => {
		for (const char of ['Q', ' ', '.', '€', '日', '🎉']) {
			expect(slantFor(char, config)).toBe(2);
		}
	});

	test('is case-sensitive, because a font treats V and v as separate glyphs', () => {
		expect(slantFor('v', config)).toBe(config.defaultSlant);
		expect(slantFor('v', config)).not.toBe(slantFor('V', config));
	});

	test('clamps to the axis range measured from the font', () => {
		const wild = { defaultSlant: 0, glyphSlants: { A: 999, B: -999 } };
		expect(slantFor('A', wild)).toBe(SLNT_MAX);
		expect(slantFor('B', wild)).toBe(SLNT_MIN);
	});
});

describe('formatSlantedText', () => {
	test('repeated letters all resolve to the same slant', () => {
		const slants = formatSlantedText('VVV', config).map((c) => c.slant);
		expect(slants).toStrictEqual([-4, -4, -4]);
	});

	test('keeps astral characters whole rather than splitting surrogate pairs', () => {
		const out = formatSlantedText('A🎉B', config);
		expect(out.map((c) => c.char)).toStrictEqual(['A', '🎉', 'B']);
	});

	test('empty input produces no output', () => {
		expect(formatSlantedText('', config)).toStrictEqual([]);
	});
});

describe('segments', () => {
	test('whitespace is separated out so word wrapping still works', () => {
		const out = segments('AV IZ', config);
		expect(out.map((s) => s.space)).toStrictEqual([false, true, false]);
	});

	test('runs of whitespace collapse into a single segment', () => {
		const out = segments('A  B', config);
		expect(out).toHaveLength(3);
		expect(out[1]).toStrictEqual({ space: true, text: '  ' });
	});

	test('round-trips the original text exactly', () => {
		const text = 'VIZCHITRA — Wavy Type 2026!';
		const rebuilt = segments(text, config)
			.map((s) => (s.space ? s.text : s.chars.map((c) => c.char).join('')))
			.join('');
		expect(rebuilt).toBe(text);
	});
});

describe('getLetterDistance', () => {
	// Ported verbatim from the original prototype; these assertions pin the
	// sawtooth so a future refactor cannot quietly change the design rule.
	test('is zero at the m/n midpoint and at both ends', () => {
		expect(getLetterDistance('m')).toBe(0);
		expect(getLetterDistance('n')).toBe(0);
		expect(getLetterDistance('a')).toBe(0);
		// 'z' yields -0, since the branch computes (endCode - 122) * -1. Harmless
		// in CSS, but recorded here so the verbatim port is not "tidied" into 0.
		expect(getLetterDistance('z')).toBe(-0);
	});

	test('rises towards l and falls towards o', () => {
		expect(getLetterDistance('l')).toBe(11);
		expect(getLetterDistance('o')).toBe(-11);
	});

	test('ignores case, unlike the table', () => {
		expect(getLetterDistance('L')).toBe(getLetterDistance('l'));
	});

	test('non-letters return zero', () => {
		expect(getLetterDistance('5')).toBe(0);
		expect(getLetterDistance('!')).toBe(0);
	});
});

describe('SEED_CONFIG', () => {
	test('carries the LogoType values and stays inside the axis range', () => {
		expect(SEED_CONFIG.glyphSlants).toMatchObject({ V: -4, I: 8, Z: 0, T: -6, R: -8 });
		for (const value of Object.values(SEED_CONFIG.glyphSlants)) {
			expect(value).toBeGreaterThanOrEqual(SLNT_MIN);
			expect(value).toBeLessThanOrEqual(SLNT_MAX);
		}
	});
});
