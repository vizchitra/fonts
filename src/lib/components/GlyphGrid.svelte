<script lang="ts">
	import { GLYPH_GROUPS, SLNT_MAX, SLNT_MIN } from '#lib/retalics/config.ts';
	import { retalics } from '#lib/retalics/store.svelte.ts';
	import { typography as t } from '#lib/typography/state.svelte.ts';

	let config = $derived(retalics.config);
</script>

<div class="groups">
	{#each GLYPH_GROUPS as group (group.name)}
		<section>
			<h3>{group.name}</h3>
			<div class="grid">
				{#each group.glyphs as glyph (glyph)}
					{@const tuned = glyph in config.glyphSlants}
					{@const value = config.glyphSlants[glyph] ?? config.defaultSlant}
					<div class="cell" class:tuned>
						<span class="glyph" style="--letter-slant: {value}; --wght: {t.wght}">{glyph}</span>
						<input
							type="number"
							min={SLNT_MIN}
							max={SLNT_MAX}
							step="1"
							{value}
							oninput={(e) => retalics.setGlyph(glyph, e.currentTarget.valueAsNumber || 0)}
						/>
						{#if tuned}
							<button type="button" onclick={() => retalics.clearGlyph(glyph)} title="Reset">
								×
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>

<style>
	.groups {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	h3 {
		margin: 0 0 0.5rem;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
	}

	.grid {
		display: grid;
		gap: 0.35rem;
		grid-template-columns: repeat(auto-fill, minmax(4rem, 1fr));
	}

	.cell {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.4rem 0.2rem 0.3rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		/* Untuned glyphs recede so the tuned ones are scannable at a glance. */
		opacity: 0.55;
	}

	.cell.tuned {
		opacity: 1;
		border-color: var(--accent);
	}

	.glyph {
		font-family: var(--font-display);
		font-size: 1.9rem;
		line-height: 1.1;
		font-variation-settings:
			'wght' var(--wght),
			'slnt' var(--letter-slant);
	}

	input {
		width: 100%;
		background: transparent;
		border: 0;
		border-top: 1px solid var(--border);
		color: var(--text-muted);
		font: inherit;
		font-size: 0.72rem;
		text-align: center;
		padding: 0.15rem 0;
	}

	input:focus {
		outline: none;
		color: var(--text);
	}

	button {
		position: absolute;
		top: 0.1rem;
		right: 0.2rem;
		background: none;
		border: 0;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 0.85rem;
		line-height: 1;
		padding: 0.1rem;
	}

	button:hover {
		color: var(--text);
	}
</style>
