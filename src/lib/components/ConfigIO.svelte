<script lang="ts">
	import { GENERATORS } from '#lib/retalics/generators.ts';
	import { retalics } from '#lib/retalics/store.svelte.ts';

	let draft = $state('');
	let message = $state<{ kind: 'ok' | 'error'; text: string } | null>(null);
	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(retalics.json);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	function load() {
		const error = retalics.import(draft);
		message = error ? { kind: 'error', text: error } : { kind: 'ok', text: 'Config loaded.' };
		if (!error) draft = '';
	}
</script>

<div class="io">
	<div class="presets">
		{#each GENERATORS as gen (gen.id)}
			<button type="button" onclick={() => retalics.apply(gen.run())} title={gen.describe}>
				{gen.label}
			</button>
		{/each}
	</div>

	<p class="status">
		{retalics.tunedCount} glyph{retalics.tunedCount === 1 ? '' : 's'} tuned · saved to this browser
	</p>

	<div class="panes">
		<label>
			<span>Export</span>
			<textarea readonly rows="8" value={retalics.json}></textarea>
			<button type="button" onclick={copy}>{copied ? 'Copied' : 'Copy JSON'}</button>
		</label>

		<label>
			<span>Import</span>
			<textarea rows="8" bind:value={draft} placeholder={'{ "defaultSlant": 0, "glyphSlants": {} }'}
			></textarea>
			<button type="button" onclick={load} disabled={!draft.trim()}>Load JSON</button>
		</label>
	</div>

	{#if message}
		<p class="message" class:error={message.kind === 'error'}>{message.text}</p>
	{/if}
</div>

<style>
	.io {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	button {
		padding: 0.35rem 0.8rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		cursor: pointer;
		font: inherit;
		font-size: 0.85rem;
	}

	button:hover:not(:disabled) {
		background: var(--surface-hover);
	}

	button:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.status {
		margin: 0;
		font-size: 0.78rem;
		color: var(--text-muted);
	}

	.panes {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.78rem;
		color: var(--text-muted);
	}

	textarea {
		width: 100%;
		background: var(--surface-hover);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		padding: 0.5rem;
		resize: vertical;
	}

	.message {
		margin: 0;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.message.error {
		color: #f87171;
	}
</style>
