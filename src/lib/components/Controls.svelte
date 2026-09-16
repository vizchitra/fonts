<script lang="ts">
	import { SLNT_MAX, SLNT_MIN, WGHT_MAX, WGHT_MIN } from '#lib/retalics/config.ts';
	import { typography as t } from '#lib/typography/state.svelte.ts';
</script>

<div class="controls">
	<label>
		<span>Weight <b>{t.wght}</b></span>
		<input type="range" min={WGHT_MIN} max={WGHT_MAX} step="10" bind:value={t.wght} />
	</label>

	<label>
		<span>Global slant <b>{t.slnt}</b></span>
		<input type="range" min={SLNT_MIN} max={SLNT_MAX} step="0.5" bind:value={t.slnt} />
	</label>

	<label>
		<span>Tracking <b>{t.tracking.toFixed(3)}em</b></span>
		<input type="range" min="-0.1" max="0.3" step="0.005" bind:value={t.tracking} />
	</label>

	<label>
		<span>Size <b>{t.fontSize}px</b></span>
		<input type="range" min="16" max="200" step="1" bind:value={t.fontSize} />
	</label>

	<label>
		<span>Line height <b>{t.lineHeight.toFixed(2)}</b></span>
		<input type="range" min="0.8" max="2" step="0.05" bind:value={t.lineHeight} />
	</label>

	<div class="toggles">
		<label class="check">
			<input type="checkbox" bind:checked={t.retalicsEnabled} />
			<span>Retalics</span>
		</label>

		<label class="check">
			<input type="checkbox" bind:checked={t.kerning} />
			<span>Kerning</span>
		</label>

		<label class="check">
			<input type="checkbox" bind:checked={t.calt} />
			<span>Contextual alternates</span>
		</label>
	</div>

	<p class="note">
		<b>calt is inert on Cairo.</b> The font exposes only
		<code>dnom frac numr rvrn</code> — no <code>calt</code> — so this toggle changes nothing today. It
		is wired correctly as plumbing for VizChitra Sans.
	</p>

	{#if t.retalicsEnabled}
		<p class="note warn">
			<b>Kerning is off while Retalics is on</b>, whatever the toggle says. Each glyph sits in its
			own <code>&lt;span&gt;</code>, and browsers cannot kern across element boundaries. Cairo does
			have real GPOS kerning — compare in the Original row below. This is the argument for a real
			<code>RETA</code> axis.
		</p>
	{/if}
</div>

<style>
	.controls {
		display: grid;
		gap: 0.75rem 1.5rem;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	label b {
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}

	input[type='range'] {
		width: 100%;
		accent-color: var(--accent);
	}

	.toggles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1rem;
		align-items: center;
	}

	.check {
		flex-direction: row;
		align-items: center;
		gap: 0.4rem;
		cursor: pointer;
	}

	.note {
		grid-column: 1 / -1;
		margin: 0;
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--text-muted);
		padding: 0.5rem 0.7rem;
		border-left: 2px solid var(--border);
	}

	.note.warn {
		border-left-color: var(--accent);
	}
</style>
