import { SEED_CONFIG, type RetalicsConfig } from './config';
import { clampSlant } from './slant';

const KEY = 'vizchitra.retalics.v1';

const browser = typeof localStorage !== 'undefined';

function parse(text: string): RetalicsConfig {
	const raw: unknown = JSON.parse(text);
	if (typeof raw !== 'object' || raw === null) throw new Error('Expected a JSON object');

	const { defaultSlant, glyphSlants } = raw as Record<string, unknown>;
	if (typeof defaultSlant !== 'number' || !Number.isFinite(defaultSlant))
		throw new Error('`defaultSlant` must be a number');
	if (typeof glyphSlants !== 'object' || glyphSlants === null)
		throw new Error('`glyphSlants` must be an object');

	const entries = Object.entries(glyphSlants as Record<string, unknown>);
	for (const [char, value] of entries) {
		if (typeof value !== 'number' || !Number.isFinite(value))
			throw new Error(`Slant for "${char}" must be a number`);
	}

	return {
		defaultSlant: clampSlant(defaultSlant),
		glyphSlants: Object.fromEntries(entries.map(([c, v]) => [c, clampSlant(v as number)]))
	};
}

function load(): RetalicsConfig {
	if (!browser) return structuredClone(SEED_CONFIG);
	try {
		const stored = localStorage.getItem(KEY);
		return stored ? parse(stored) : structuredClone(SEED_CONFIG);
	} catch {
		// Private windows, blocked site data, or a config written by an older
		// version. Falling back is always better than an unusable lab.
		return structuredClone(SEED_CONFIG);
	}
}

class RetalicsStore {
	config = $state<RetalicsConfig>(load());

	constructor() {
		$effect.root(() => {
			$effect(() => {
				const serialized = JSON.stringify(this.config);
				if (!browser) return;
				try {
					localStorage.setItem(KEY, serialized);
				} catch {
					// Storage full or unavailable — tuning still works this session.
				}
			});
		});
	}

	setGlyph(char: string, value: number) {
		this.config.glyphSlants[char] = clampSlant(value);
	}

	clearGlyph(char: string) {
		delete this.config.glyphSlants[char];
	}

	apply(next: RetalicsConfig) {
		this.config = next;
	}

	reset() {
		this.config = structuredClone(SEED_CONFIG);
	}

	get json() {
		return JSON.stringify(this.config, null, 2);
	}

	/** Returns an error message, or null on success. */
	import(text: string): string | null {
		try {
			this.config = parse(text);
			return null;
		} catch (error) {
			return error instanceof Error ? error.message : 'Invalid JSON';
		}
	}

	get tunedCount() {
		return Object.values(this.config.glyphSlants).filter((v) => v !== this.config.defaultSlant)
			.length;
	}
}

export const retalics = new RetalicsStore();
