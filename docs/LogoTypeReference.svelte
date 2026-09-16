<!--
	REFERENCE ONLY — not imported, not built, not maintained.

	The original VizChitra logotype, and the origin of the Retalics idea: every
	letter wrapped in a span with its own hand-tuned `slnt`. Kept because it is
	the primary source for design data the lab does NOT model.

	Extracted into the lab:
	  - the per-glyph SLANT values -> SEED_CONFIG in src/lib/retalics/config.ts
	    (V -4, I 8, Z 0, C 2, H 7, T -6, R -8, A 0)

	Deliberately NOT extracted, and recorded nowhere else in the repo:
	  - per-glyph LETTER-SPACING (I -0.18rem, R -0.1rem, C -0.1rem, H -0.08rem,
	    Z -0.025rem, V +0.16rem). RetalicsConfig is slant-only by decision, so
	    tracking stays a separate global CSS concern and is not conflated with
	    Retalics. If per-pair spacing ever turns out to matter, start here.
	  - per-glyph WEIGHT (V/I/Z at 750, the rest at 400). That is a two-tone
	    styling choice specific to the logo, not a Retalics property.

	Note the `slnt` values sit inside Cairo's real axis range of -11..+11, and
	that positive values here lean backwards — Cairo's italic uses slnt -11.

	KEEP THIS FILE. Two open goals depend on it:

	1. Setting the logo in the font itself. Ideally VIZCHITRA — duotone and all —
	   is typed, not hand-assembled from spans. The duotone (V/I/Z at wght 750
	   against 400) might become another axis, a contextual alternate, or a
	   stylistic set; that is undecided. Whatever the mechanism, this file is the
	   target it has to reproduce.

	2. Kerning. The per-glyph letter-spacing above is the only record of how
	   VIZCHITRA is meant to fit together. When Phase 2 checks whether kerning
	   survives at RETA=1, these are the pairs that have to look right.

	See docs/spec.md and docs/plan.md. Live version: src/lib/components/RetalicsText.svelte
-->

<script>
	/**
	/** @typedef {Object} Props
	 * @property {string} [classes]
	 * @property {string} [yearClasses]
	 * @property {number|null} [year] - year to show (e.g. 2025). Set to `null`/omit to hide.
	 */

	/** @type {Props} */
	let { classes = '', yearClasses = 'text-[#D46637]', year = 2025 } = $props();
</script>

<span class="viz-logo-type {classes}">
	<span class="V1">V</span><span class="I1">I</span><span class="Z1">Z</span><span class="C2"
		>C</span
	><span class="H2">H</span><span class="I2">I</span><span class="T2">T</span><span class="R2"
		>R</span
	><span class="A2">A</span>

	{#if year}
		<span class="year font-bold {yearClasses}">{year}</span>
	{/if}
</span>

<style>
	.viz-logo-type {
		font-family: var(--font-display);
		font-optical-sizing: auto;
		max-width: 10ch;
	}

	.V1 {
		font-variation-settings:
			'slnt' -4,
			'wght' 750;
		letter-spacing: 0.16rem;
	}

	.I1 {
		font-variation-settings:
			'slnt' 8,
			'wght' 750;
		letter-spacing: 0rem;
	}

	.Z1 {
		font-variation-settings:
			'slnt' 0,
			'wght' 750;
		letter-spacing: -0.025rem;
	}

	.C2 {
		font-variation-settings:
			'slnt' 2,
			'wght' 400;
		letter-spacing: -0.1rem;
	}

	.H2 {
		font-variation-settings:
			'slnt' 7,
			'wght' 400;
		letter-spacing: -0.08rem;
	}

	.I2 {
		font-variation-settings:
			'slnt' 8,
			'wght' 400;
		letter-spacing: -0.18rem;
	}

	.T2 {
		font-variation-settings:
			'slnt' -6,
			'wght' 400;
		letter-spacing: -0.1rem;
	}

	.R2 {
		font-variation-settings:
			'slnt' -8,
			'wght' 400;
		letter-spacing: -0.1rem;
	}

	.A2 {
		font-variation-settings:
			'slnt' 0,
			'wght' 400;
		letter-spacing: 0rem;
	}
	.year {
		font-variation-settings: 'slnt' 8;
	}
</style>
