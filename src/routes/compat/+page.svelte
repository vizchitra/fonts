<script lang="ts">
	import './descriptor-test.css';

	// Techniques for slanting Cairo, which has no italic masters. Judged by eye:
	// slnt barely changes advance widths (Cairo's 'I' moves 248 -> 249 units per
	// 1000), so no width measurement can detect slant. The upright control sits
	// beside each row precisely so a failure looks like "nothing happened".
	//
	// `browsers.chromium/safari/firefox` are MEASURED, from
	// slant.browser.test.ts, which runs these exact techniques through real
	// engines on every `pnpm test` — docs/compat.md has the numbers. `ios` is
	// NOT measured the same way: Playwright's WebKit is not an iPhone, so the
	// safari and ios columns CAN diverge, and for the 'oblique-range' row they
	// do — confirmed on a real iPhone XR (Safari 18.7), not just reasoned.
	// Where a row's `ios` value is still an unconfirmed extrapolation from the
	// safari column rather than an on-device result, it is rendered with the
	// same `?`/dashed styling either way — check this file's row-level
	// `expect` text for which case applies before trusting either.
	type Verdict = { chromium: boolean; safari: boolean; firefox: boolean; ios: boolean };

	const SLANT_TESTS: {
		id: string;
		title: string;
		css: string;
		expect: string;
		klass: string;
		browsers: Verdict;
	}[] = [
		{
			id: 'fvs-use-site',
			title: "font-variation-settings: 'slnt' -11 at the use site — RECOMMENDED",
			css: "font-variation-settings: 'slnt' -11",
			expect:
				'Leans forward. This sets the axis directly — no automatic font-style mapping involved, ' +
				'so nothing to disagree about across engines or versions. Confirmed on real Safari 18.7, ' +
				'iPhone XR, immune to the ancestor-pin hazard below (unlike the row underneath). If this ' +
				'fails, nothing else here matters.',
			klass: 'm-usesite',
			browsers: { chromium: true, safari: true, firefox: true, ios: true }
		},
		{
			id: 'oblique-range',
			title: 'font-style: italic against a bare `oblique` face — DO NOT RELY ON ALONE',
			css: 'font-style: italic  (face declares: font-style: oblique)',
			expect:
				'Leans ~11deg in Chromium, current WebKit and Firefox — but confirmed UPRIGHT on real ' +
				'Safari 18.7 (iPhone XR): it does not perform this automatic font-style -> slnt mapping ' +
				'at all, even with no ancestor pin in the way. Playwright’s WebKit is a different, ' +
				'newer build and does not reproduce this — this is a real engine you can only catch by ' +
				'hand, not in this repo’s automated matrix. font-style: italic is fine as a semantic ' +
				'hint; do not depend on it for correct rendering. Use the row above instead.',
			klass: 'm-oblique',
			browsers: { chromium: true, safari: true, firefox: true, ios: false }
		},
		{
			id: 'oblique-explicit',
			title: 'font-style: italic against an oblique ANGLE RANGE — the trap',
			css: 'font-style: italic; font-synthesis: weight style  (face declares: font-style: oblique 0deg 11deg)',
			expect:
				"Should lean the SAME as the row above. Chromium leans roughly twice as far (a synthetic skew stacked on the real axis); WebKit leans a flat 14deg (it prefers synthesis over the axis). Only Firefox is correct. font-synthesis is forced back to weight+style here — this site's own font-synthesis: weight would otherwise neutralise the trap, which is real but conditional on a consumer NOT setting that rule.",
			klass: 'm-oblique-range',
			browsers: { chromium: false, safari: false, firefox: true, ios: false }
		},
		{
			id: 'fvs-descriptor',
			title: 'font-variation-settings as an @font-face DESCRIPTOR',
			css: "@font-face { font-variation-settings: 'slnt' -11 }",
			expect:
				'The old hand-written font.css relied on this. Measured DEAD in WebKit — upright, no lean at all — so Cairo italic was silently broken in Safari all along.',
			klass: 'm-descriptor',
			browsers: { chromium: true, safari: false, firefox: true, ios: false }
		},
		{
			id: 'synthesis',
			title: 'Faux-oblique synthesis on top of a real axis',
			css: "font-style: italic  +  font-variation-settings: 'slnt' -11",
			expect:
				'Should look the SAME as the first row. If it leans noticeably further, the engine is synthesising a skew on top of the real axis — fix with font-synthesis: none.',
			klass: 'm-synthesis',
			browsers: { chromium: true, safari: true, firefox: true, ios: true }
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
	The middle half is expected to look upright, unlike the left — this is the exact bug an earlier
	version of the iOS fix reintroduced by pinning <code>slnt</code> on <code>html</code>. If
	<code>app.css</code> ever adds such a pin back, this middle half is how it would show up. Both use
	a bare specimen with no <code>font-variation-settings</code> of their own — not
	<code>.sample .m-oblique</code>, which now states <code>font-variation-settings: normal</code> on
	itself and so is deliberately immune to any ancestor, this one included.
	<br /><br />
	<b>On real Safari 18.7 (iPhone XR), the left half shows upright too</b> — not because of the
	ancestor pin, but because that engine does not perform the automatic
	<code>font-style</code> → <code>slnt</code> mapping at all, pin or no pin. The left and middle
	halves become visually indistinguishable there, which is itself the argument against relying on
	<code>font-style: italic</code>: you cannot tell "blocked by an ancestor" apart from "this engine
	never supported it" by eye. The right half sidesteps the whole question — it sets
	<code>font-variation-settings: 'slnt' -11</code> directly, so there is no automatic mapping to be blocked
	or unsupported, and it leans correctly under the very same pinned ancestor, on every engine including
	real Safari.
</p>
<div class="rows">
	<section>
		<h3>
			Left: italic, no ancestor pin. Middle: same, under a pinned ancestor — stays upright. Right:
			explicit slnt, under the SAME pinned ancestor — leans correctly regardless
		</h3>
		<code class="css"
			>font-style: italic &nbsp;vs&nbsp; (ancestor: font-variation-settings: 'slnt' 0) font-style:
			italic &nbsp;vs&nbsp; (same ancestor) font-variation-settings: 'slnt' -11</code
		>
		<div class="specimen">
			<div class="half">
				<span class="tag">no ancestor pin — correct only where italic is supported</span>
				<div class="hazard-specimen">VIZCHITRA</div>
			</div>
			<div class="half slnt-pinned-ancestor">
				<span class="tag">nested under a slnt-pinned ancestor — broken on purpose</span>
				<div class="hazard-specimen">VIZCHITRA</div>
			</div>
			<div class="half slnt-pinned-ancestor">
				<span class="tag">same pinned ancestor — explicit slnt stays immune</span>
				<div class="hazard-specimen-explicit">VIZCHITRA</div>
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
			<ul class="verdicts">
				<li class:pass={t.browsers.chromium}>{t.browsers.chromium ? '✓' : '✗'} Chromium</li>
				<li class:pass={t.browsers.safari}>{t.browsers.safari ? '✓' : '✗'} Safari</li>
				<li class:pass={t.browsers.firefox}>{t.browsers.firefox ? '✓' : '✗'} Firefox</li>
				<li class:pass={t.browsers.ios} class="expected" title="Expected, not device-confirmed">
					{t.browsers.ios ? '✓' : '✗'} iOS
				</li>
			</ul>
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

	/* Deliberately bare — no font-variation-settings of its own, unlike
	   .sample. This isolates the ancestor's effect. .m-oblique (used in the
	   table below) states `font-variation-settings: normal` on itself and so
	   would stay correct here too, which is the whole reason it needed its
	   own class rather than reusing this one. */
	.hazard-specimen {
		font-family: 'Cairo', var(--font-sans);
		font-size: 2.6rem;
		line-height: 1.2;
		font-style: italic;
	}

	/* The recommended technique: sets the axis directly, so there is no
	   automatic font-style -> slnt mapping for an ancestor pin (or a real
	   Safari that never implemented the mapping at all) to interfere with. */
	.hazard-specimen-explicit {
		font-family: 'Cairo', var(--font-sans);
		font-size: 2.6rem;
		line-height: 1.2;
		font-variation-settings: 'slnt' -11;
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

	.verdicts {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		padding: 0;
		margin: 0.6rem 0 0;
	}

	.verdicts li {
		border: 1px solid var(--border);
		border-left: 3px solid #f87171;
		border-radius: var(--radius);
		padding: 0.25rem 0.55rem;
		font-size: 0.72rem;
		color: var(--text-muted);
	}

	.verdicts li.pass {
		border-left-color: #4ade80;
	}

	/* Reasoned, not device-confirmed — see the comment on SLANT_TESTS. */
	.verdicts li.expected {
		border-left-style: dashed;
		font-style: italic;
	}

	/* One technique per class, so nothing leaks between rows. */
	.m-usesite {
		font-variation-settings:
			'wght' 600,
			'slnt' -11;
	}

	/* .sample states 'slnt' 0 on THIS SAME element (not an ancestor), and an
	   explicit same-element value beats font-style's automatic mapping even
	   more directly than an inherited one does. `normal` releases it — the
	   font-variation-settings initial value, meaning "no CSS-level override,
	   let font-style/the @font-face descriptor decide" — so the technique
	   below is actually being tested, not silently pinned upright regardless
	   of what it does. */
	.m-oblique {
		font-style: italic;
		font-variation-settings: normal;
	}

	.m-oblique-range {
		font-family: 'CairoObliqueRangeTest', var(--font-sans);
		font-style: italic;
		font-variation-settings: normal;
		/* html sets font-synthesis: weight globally, which happens to
		   neutralise this exact trap (slant.browser.test.ts, "the
		   oblique-range trap is neutralised by font-synthesis: weight") —
		   forbidding synthesis removes the synthetic skew Chromium and
		   WebKit stack on top of the axis, leaving the correct angle. This
		   row needs to re-enable synthesis to demonstrate the danger a
		   consumer sees if they adopt the range face WITHOUT also setting
		   font-synthesis correctly, which fonts.css cannot enforce for them.
		   Getting there took three wrong turns, each confirmed wrong with a
		   real browser rather than assumed. (1) `auto` is not a valid
		   font-synthesis value, so the browser silently drops it and does
		   nothing. (2) `revert` is NOT "ignore all author CSS" —
		   font-synthesis is an inherited property, and revert falls back to
		   the INHERITED value when no lower-origin rule exists, which is
		   exactly html's `weight` again. (3) the full initial value,
		   `weight style small-caps position`, got the whole declaration
		   dropped by the dev server's CSS pipeline for Chromium/WebKit
		   specifically (confirmed via document.styleSheets in each engine)
		   — `position` is a newer Level 4 keyword, and whatever browser-
		   target logic strips unsupported values dropped the entire
		   shorthand rather than degrading it. `weight style` is the
		   original, universally-supported two-value form and survives
		   everywhere; we don't need small-caps/position for this demo
		   anyway. */
		font-synthesis: weight style;
	}

	.m-descriptor {
		/* Relies on the @font-face descriptor in the block below — which an
		   explicit CSS-level 'slnt' would override if left in place. */
		font-family: 'CairoDescriptorTest', var(--font-sans);
		font-variation-settings: normal;
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
