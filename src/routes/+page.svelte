<script lang="ts">
	import ConfigIO from '#lib/components/ConfigIO.svelte';
	import Controls from '#lib/components/Controls.svelte';
	import GlyphGrid from '#lib/components/GlyphGrid.svelte';
	import PairGrid from '#lib/components/PairGrid.svelte';
	import RetalicsText from '#lib/components/RetalicsText.svelte';
	import { retalics } from '#lib/retalics/store.svelte.ts';
	import { typography as t } from '#lib/typography/state.svelte.ts';

	const COMPARISON = [
		{ mode: 'plain', label: 'Cairo', hint: 'native axes, kerning intact' },
		{ mode: 'slnt', label: 'Cairo + global slnt', hint: 'one slant for every glyph' },
		{ mode: 'retalics', label: 'Retalics', hint: 'per-glyph slant, kerning lost to spans' }
	] as const;
</script>

<h1>Retalics Lab</h1>
<p class="lede">
	Tuning per-glyph slant for VizChitra Sans. Cairo's <code>slnt</code> axis runs −11…+11; these
	values become the design data for a future <code>RETA</code> axis.
</p>

<section class="preview">
	<RetalicsText
		text={t.text}
		mode={t.retalicsEnabled ? 'retalics' : 'slnt'}
		config={retalics.config}
		wght={t.wght}
		slnt={t.slnt}
		tracking={t.tracking}
		fontSize={t.fontSize}
		lineHeight={t.lineHeight}
		kerning={t.kerning}
		calt={t.calt}
	/>
</section>

<textarea class="editor" bind:value={t.text} rows="2" aria-label="Preview text"></textarea>

<Controls />

<h2>Comparison</h2>
<p class="hint">Identical text, size, weight and tracking — only the slant treatment differs.</p>
<div class="rows">
	{#each COMPARISON as row (row.mode)}
		<div class="row">
			<div class="label">{row.label}<span>{row.hint}</span></div>
			<RetalicsText
				text={t.text}
				mode={row.mode}
				config={retalics.config}
				wght={t.wght}
				slnt={t.slnt}
				tracking={t.tracking}
				fontSize={Math.min(t.fontSize, 56)}
				lineHeight={t.lineHeight}
				kerning={t.kerning}
				calt={t.calt}
			/>
		</div>
	{/each}
</div>

<h2>Pairs</h2>
<p class="hint">Plain Cairo (dimmed) beside Retalics, to judge slant interaction and rhythm.</p>
<PairGrid />

<h2>Glyphs</h2>
<p class="hint">
	Tuned glyphs are highlighted. Edit a value to discover which letters want more or less slant.
</p>
<GlyphGrid />

<h2>Config</h2>
<p class="hint">This JSON is the input to the Phase 2 font build.</p>
<ConfigIO />

<style>
	.lede,
	.hint {
		color: var(--text-muted);
		font-size: 0.9rem;
		max-width: 46rem;
	}

	.hint {
		margin-top: -0.4rem;
		font-size: 0.82rem;
	}

	.preview {
		padding: 1.5rem 0 1rem;
		min-height: 6rem;
	}

	.editor {
		width: 100%;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		padding: 0.6rem;
		margin-bottom: 1rem;
		resize: vertical;
	}

	.editor:focus {
		outline: none;
		color: var(--text);
		border-color: var(--accent);
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.row {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.75rem 1rem 1rem;
		overflow: hidden;
	}

	.label {
		display: flex;
		gap: 0.6rem;
		align-items: baseline;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		margin-bottom: 0.5rem;
	}

	.label span {
		text-transform: none;
		letter-spacing: 0;
		opacity: 0.7;
	}
</style>
