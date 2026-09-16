<script lang="ts">
	import './descriptor-test.css';

	// Techniques for slanting Cairo, which has no italic masters. Judged by eye:
	// slnt barely changes advance widths (Cairo's 'I' moves 248 -> 249 units per
	// 1000), so no width measurement can detect slant. The upright control sits
	// beside each row precisely so a failure looks like "nothing happened".
	const SLANT_TESTS = [
		{
			id: 'fvs-use-site',
			title: 'font-variation-settings at the use site',
			css: "font-variation-settings: 'slnt' -11",
			expect: 'Leans forward. This is the baseline — if this fails, nothing else matters.',
			klass: 'm-usesite'
		},
		{
			id: 'oblique-range',
			title: 'font-style: italic against a bare `oblique` face — SHIPPED',
			css: 'font-style: italic  (face declares: font-style: oblique)',
			expect:
				'Leans ~11deg. Verified correct in Chromium, WebKit and Firefox. This is what fonts.css ships.',
			klass: 'm-oblique'
		},
		{
			id: 'oblique-explicit',
			title: 'font-style: italic against an oblique ANGLE RANGE — the trap',
			css: 'font-style: italic  (face declares: font-style: oblique 0deg 11deg)',
			expect:
				'Should lean the SAME as the row above. Chromium leans roughly twice as far (it stacks a synthetic skew on the real axis); WebKit leans a flat 14deg (it drops the axis). Only Firefox is correct.',
			klass: 'm-oblique-range'
		},
		{
			id: 'fvs-descriptor',
			title: 'font-variation-settings as an @font-face DESCRIPTOR',
			css: "@font-face { font-variation-settings: 'slnt' -11 }",
			expect:
				'The old hand-written font.css relied on this. Measured DEAD in WebKit — upright, no lean at all — so Cairo italic was silently broken in Safari all along.',
			klass: 'm-descriptor'
		},
		{
			id: 'synthesis',
			title: 'Faux-oblique synthesis on top of a real axis',
			css: "font-style: italic  +  font-variation-settings: 'slnt' -11",
			expect:
				'Should look the SAME as the first row. If it leans noticeably further, the engine is synthesising a skew on top of the real axis — fix with font-synthesis: none.',
			klass: 'm-synthesis'
		}
	];

	// These do change metrics, so the page checks them itself.
	let auto = $state<{ label: string; detail: string; pass: boolean }[]>([]);

	function measure(text: string, style: string) {
		const el = document.createElement('span');
		el.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-size:200px;font-family:Cairo;${style}`;
		el.textContent = text;
		document.body.appendChild(el);
		const width = el.getBoundingClientRect().width;
		el.remove();
		return width;
	}

	$effect(() => {
		void document.fonts.ready.then(() => {
			const kernOn = measure('AVAWAY', 'font-kerning:normal');
			const kernOff = measure('AVAWAY', 'font-kerning:none');
			const upright = measure('Hamburgefonstiv', '');
			const slanted = measure('Hamburgefonstiv', "font-variation-settings:'slnt' -11");

			auto = [
				{
					label: 'GPOS kerning is active',
					detail: `AVAWAY: ${kernOn.toFixed(1)}px kerned vs ${kernOff.toFixed(1)}px unkerned`,
					pass: Math.abs(kernOn - kernOff) > 0.5
				},
				{
					label: 'slnt does NOT meaningfully change advance width',
					detail: `${upright.toFixed(1)}px upright vs ${slanted.toFixed(1)}px slanted — which is why the rows above need eyes, not measurement`,
					pass: Math.abs(upright - slanted) < upright * 0.01
				}
			];
		});
	});
</script>

<h1>Browser compatibility matrix</h1>
<p class="lede">
	These are already asserted in Chromium, WebKit and Firefox by
	<code>src/lib/fonts/slant.browser.test.ts</code>, which measures rendered shear on every
	<code>pnpm test</code>; results are in <code>docs/compat.md</code>. This page exists for the one
	thing that cannot automate: <b>real Safari</b>, which Playwright's WebKit is not. Cairo has no
	italic masters — its italic is the <code>slnt</code> axis — so every row is a different way of asking
	for the same lean.
</p>

<h2>The iOS Safari backslant</h2>
<p class="hint">
	The original bug, and the reason this page exists. Reported on <b>Safari 18.7, iPhone XR</b>:
	Cairo renders leaning <i>backwards</i> when <code>slnt</code> is left to the font's default. Desktop
	engines look fine, so this only shows up on an actual old device.
</p>
<p class="hint">
	The cause is that <code>font-variation-settings</code> <b>replaces</b> the inherited value rather
	than merging with it — so declaring only <code>'wght'</code> silently discards any upright reset.
	The <code>@font-face</code> descriptor cannot save you here: it is measurably inert in WebKit.
</p>

<div class="rows">
	<section>
		<h3>Left: axis unpinned — Right: <code>'slnt' 0</code> stated</h3>
		<code class="css">font-variation-settings: 'wght' 600 &nbsp;vs&nbsp; 'wght' 600, 'slnt' 0</code>
		<div class="specimen">
			<div class="half">
				<span class="tag">unpinned — backslants on old iOS</span>
				<div class="sample m-unpinned">VIZCHITRA</div>
			</div>
			<div class="half">
				<span class="tag">pinned — correct everywhere</span>
				<div class="sample m-pinned">VIZCHITRA</div>
			</div>
		</div>
		<p class="expect">
			These must look identical. If the left one leans back, this device has the bug. The fix is
			component-level, not a global reset: any rule that states <code>'wght'</code> via
			<code>font-variation-settings</code> must also state <code>'slnt'</code>
			(<code>src/lib/fonts/axis-pinning.test.ts</code> enforces this for this repo's own code). An
			earlier version of this fix instead pinned <code>'slnt' 0</code> on <code>html</code> in
			<code>app.css</code> — that broke <code>font-style: italic</code> everywhere, on every engine,
			because an ancestor's explicit <code>slnt</code> blocks the browser's automatic mapping from
			<code>font-style</code> onto the axis. The section below re-checks that on this device.
		</p>
	</section>
</div>

<h2>Hazard demo: an ancestor pin kills italic (deliberately broken — not our CSS)</h2>
<p class="hint">
	The right half is expected to look upright, unlike the left — this is the exact bug an earlier
	version of the iOS fix reintroduced by pinning <code>slnt</code> on <code>html</code>. If
	<code>app.css</code> ever adds such a pin back, this right half is how it would show up.
</p>
<div class="rows">
	<section>
		<h3>
			Left: italic, no ancestor pin — SHIPPED. Right: same, under a pinned ancestor — stays upright
		</h3>
		<code class="css"
			>font-style: italic &nbsp;vs&nbsp; (ancestor: font-variation-settings: 'slnt' 0) font-style:
			italic</code
		>
		<div class="specimen">
			<div class="half">
				<span class="tag">no ancestor pin — correct</span>
				<div class="sample m-oblique">VIZCHITRA</div>
			</div>
			<div class="half slnt-pinned-ancestor">
				<span class="tag">nested under a slnt-pinned ancestor — broken on purpose</span>
				<div class="sample m-oblique">VIZCHITRA</div>
			</div>
		</div>
	</section>
</div>

<h2>Slant techniques — judge by eye</h2>
<p class="hint">
	Each row shows the technique on the left and an untouched upright control on the right. <b
		>A failure looks like the two halves matching.</b
	>
</p>

<div class="rows">
	{#each SLANT_TESTS as t (t.id)}
		<section>
			<h3>{t.title}</h3>
			<code class="css">{t.css}</code>
			<div class="specimen">
				<div class="half">
					<span class="tag">technique</span>
					<div class="sample {t.klass}">Hamburgefonstiv</div>
				</div>
				<div class="half">
					<span class="tag">upright control</span>
					<div class="sample">Hamburgefonstiv</div>
				</div>
			</div>
			<p class="expect">{t.expect}</p>
		</section>
	{/each}
</div>

<h2>Self-checking</h2>
<p class="hint">These change measurable metrics, so the page tests them itself.</p>
<ul class="auto">
	{#each auto as row (row.label)}
		<li class:pass={row.pass}>
			<b>{row.pass ? 'PASS' : 'FAIL'}</b>
			<span>{row.label}</span>
			<em>{row.detail}</em>
		</li>
	{:else}
		<li><span>Measuring…</span></li>
	{/each}
</ul>

<style>
	.lede,
	.hint {
		color: var(--text-muted);
		font-size: 0.9rem;
		max-width: 48rem;
	}

	.hint {
		font-size: 0.82rem;
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	section {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.9rem 1rem 1rem;
	}

	h3 {
		margin: 0 0 0.3rem;
		font-size: 0.95rem;
	}

	.css {
		display: block;
		font-size: 0.75rem;
		color: var(--text-muted);
		background: none;
		padding: 0;
		margin-bottom: 0.6rem;
	}

	.specimen {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.75rem;
	}

	.half {
		border: 1px dashed var(--border);
		border-radius: var(--radius);
		padding: 0.5rem 0.7rem;
		overflow: hidden;
	}

	/* Reproduces the exact hazard: an ancestor stating 'slnt' explicitly. This
	   must never live in app.css — it is only here to prove, on this device,
	   that the pattern is still broken if anyone reintroduces it. */
	.slnt-pinned-ancestor {
		font-variation-settings: 'slnt' 0;
	}

	.tag {
		display: block;
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		margin-bottom: 0.2rem;
	}

	.sample {
		font-family: 'Cairo', var(--font-sans);
		font-size: 2.6rem;
		line-height: 1.2;
		/* 'slnt' 0 is stated, not omitted — see the backslant section above. */
		font-variation-settings:
			'wght' 600,
			'slnt' 0;
	}

	/* The iOS Safari backslant demo. Deliberately omits slnt, which is the bug. */
	.m-unpinned {
		font-variation-settings: 'wght' 600;
	}

	.m-pinned {
		font-variation-settings:
			'wght' 600,
			'slnt' 0;
	}

	.expect {
		margin: 0.6rem 0 0;
		font-size: 0.78rem;
		color: var(--text-muted);
	}

	/* One technique per class, so nothing leaks between rows. */
	.m-usesite {
		font-variation-settings:
			'wght' 600,
			'slnt' -11;
	}

	.m-oblique {
		font-style: italic;
	}

	.m-oblique-range {
		font-family: 'CairoObliqueRangeTest', var(--font-sans);
		font-style: italic;
	}

	.m-descriptor {
		/* Relies on the @font-face descriptor in the block below. */
		font-family: 'CairoDescriptorTest', var(--font-sans);
	}

	.m-synthesis {
		font-style: italic;
		font-variation-settings:
			'wght' 600,
			'slnt' -11;
	}

	.auto {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.auto li {
		display: grid;
		grid-template-columns: 3.5rem 1fr;
		gap: 0.2rem 0.6rem;
		border: 1px solid var(--border);
		border-left: 3px solid #f87171;
		border-radius: var(--radius);
		padding: 0.5rem 0.7rem;
		font-size: 0.85rem;
	}

	.auto li.pass {
		border-left-color: #4ade80;
	}

	.auto b {
		font-size: 0.7rem;
		letter-spacing: 0.06em;
	}

	.auto em {
		grid-column: 2;
		font-style: normal;
		font-size: 0.75rem;
		color: var(--text-muted);
	}
</style>
