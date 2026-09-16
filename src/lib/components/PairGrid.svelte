<script lang="ts">
	import RetalicsText from './RetalicsText.svelte';
	import { TEST_PAIRS } from '#lib/retalics/config.ts';
	import { retalics } from '#lib/retalics/store.svelte.ts';
	import { typography as t } from '#lib/typography/state.svelte.ts';

	let extra = $state<string[]>([]);
	let draft = $state('');

	let pairs = $derived([...TEST_PAIRS, ...extra]);

	function add(event: SubmitEvent) {
		event.preventDefault();
		const value = draft.trim();
		if (value && !pairs.includes(value)) extra.push(value);
		draft = '';
	}
</script>

<form onsubmit={add}>
	<input bind:value={draft} placeholder="Add a pair, e.g. Rz" aria-label="Add a pair" />
	<button type="submit">Add</button>
</form>

<div class="grid">
	{#each pairs as pair (pair)}
		<div class="cell">
			<div class="row">
				<RetalicsText
					text={pair}
					mode="plain"
					config={retalics.config}
					wght={t.wght}
					tracking={t.tracking}
					fontSize={44}
					kerning={t.kerning}
					calt={t.calt}
				/>
				<RetalicsText
					text={pair}
					mode="retalics"
					config={retalics.config}
					wght={t.wght}
					slnt={t.slnt}
					tracking={t.tracking}
					fontSize={44}
					kerning={t.kerning}
					calt={t.calt}
				/>
			</div>
			<code>{pair}</code>
		</div>
	{/each}
</div>

<style>
	form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.9rem;
	}

	form input {
		flex: 0 1 14rem;
		padding: 0.4rem 0.6rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		font: inherit;
	}

	form button {
		padding: 0.4rem 0.9rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		cursor: pointer;
		font: inherit;
	}

	form button:hover {
		background: var(--surface-hover);
	}

	.grid {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
	}

	.cell {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.5rem;
	}

	.row {
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
		justify-content: center;
	}

	/* Left is plain Cairo, right is Retalics — the difference is the point. */
	.row :global(> :first-child) {
		opacity: 0.45;
	}

	code {
		display: block;
		text-align: center;
		margin-top: 0.3rem;
		font-size: 0.7rem;
		color: var(--text-muted);
		background: none;
		padding: 0;
	}
</style>
