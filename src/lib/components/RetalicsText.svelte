<script lang="ts">
	import type { RetalicsConfig } from '#lib/retalics/config.ts';
	import { segments } from '#lib/retalics/slant.ts';

	type Mode = 'plain' | 'slnt' | 'retalics';

	interface Props {
		text: string;
		mode?: Mode;
		config: RetalicsConfig;
		wght: number;
		slnt?: number;
		tracking?: number;
		fontSize?: number;
		lineHeight?: number;
		kerning?: boolean;
		calt?: boolean;
	}

	let {
		text,
		mode = 'retalics',
		config,
		wght,
		slnt = 0,
		tracking = 0,
		fontSize,
		lineHeight,
		kerning = true,
		calt = true
	}: Props = $props();

	// Retalics wraps each glyph in its own span, which is the whole point of the
	// prototype and also its fatal flaw: the browser cannot kern across element
	// boundaries, so GPOS kerning is dead here regardless of the toggle. That is
	// the argument for a real RETA axis, so it is surfaced in the UI, not hidden.
	let parts = $derived(mode === 'retalics' ? segments(text, config) : []);

	// font-variation-settings is not additive: a value on the span REPLACES the
	// inherited one, so each glyph must restate the weight or it snaps back to
	// the font default. The weight rides along as a custom property.
	let style = $derived(
		[
			`--wght: ${wght}`,
			`font-variation-settings: 'wght' ${wght}${mode === 'slnt' ? `, 'slnt' ${slnt}` : ''}`,
			`letter-spacing: ${tracking}em`,
			`font-kerning: ${kerning ? 'normal' : 'none'}`,
			`font-feature-settings: 'calt' ${calt ? 1 : 0}`,
			fontSize ? `font-size: ${fontSize}px` : '',
			lineHeight ? `line-height: ${lineHeight}` : ''
		]
			.filter(Boolean)
			.join('; ')
	);
</script>

<div class="retalics-text" {style}>
	{#if mode === 'retalics'}
		{#each parts as part, i (i)}
			{#if part.space}{part.text}{:else}{#each part.chars as c, j (j)}<span
						class="retalics-glyph"
						style="--letter-slant: {c.slant + slnt}">{c.char}</span
					>{/each}{/if}
		{/each}
	{:else}
		{text}
	{/if}
</div>

<style>
	.retalics-text {
		font-family: var(--font-display);
		/* Prototype rule: vary the real font axis. Never transform/skew. */
		font-optical-sizing: auto;
		overflow-wrap: anywhere;
	}

	.retalics-glyph {
		font-variation-settings:
			'wght' var(--wght),
			'slnt' var(--letter-slant);
	}
</style>
