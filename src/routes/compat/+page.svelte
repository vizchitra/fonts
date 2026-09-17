<script lang="ts">
	import './descriptor-test.css';
	import chromiumLogo from '#lib/assets/browsers/chromium.svg';
	import firefoxLogo from '#lib/assets/browsers/firefox.svg';
	import safariLogo from '#lib/assets/browsers/safari.svg';
	import webkitLogo from '#lib/assets/browsers/webkit.svg';

	// Techniques for slanting Cairo, which has no italic masters. Judged by eye:
	// slnt barely changes advance widths (Cairo's 'I' moves 248 -> 249 units per
	// 1000), so no width measurement can detect slant. The upright control sits
	// beside each row precisely so a failure looks like "nothing happened".
	//
	// `chromium`/`firefox`/`webkit` are MEASURED, from slant.browser.test.ts,
	// which runs these exact techniques through real engines on every
	// `pnpm test` — docs/compat.md has the numbers. `webkit` is Playwright's
	// bundled build, which is NOT real Safari and is certainly not old real
	// Safari — that gap is the entire reason `safariOld`/`safariNew` exist as
	// separate, real-device fields.
	//
	// Each is `null` (genuinely untested/unknown — rendered as a neutral `?`,
	// never a tick or cross) or a real claim carrying its own device/version
	// label plus a `confirmed` flag:
	//   - `confirmed: true`  — this exact CSS was checked on that exact device,
	//     by hand. Rendered as a solid tick/cross.
	//   - `confirmed: false` — reasoned, not separately device-checked (e.g.
	//     "this sets the axis directly, so no font-style-matching support gap
	//     can apply, on any device or version"). Rendered as a dashed,
	//     italicised tick/cross — visually distinct from a real device check,
	//     on purpose, so the two are never confused at a glance.
	// Always read the row's own `expect` text before trusting either.
	type RealSafari = { pass: boolean; device: string; version: string; confirmed: boolean } | null;
	type Verdict = {
		chromium: boolean;
		firefox: boolean;
		webkit: boolean;
		safariOld: RealSafari;
		safariNew: RealSafari;
	};

	// Two real devices back the confirmed:true entries below:
	//   - "iPhone XR" / "Safari 18.7" — old, the device the original backslant
	//     bug was reported on.
	//   - "macOS desktop" / "Safari 27.0" (build 20625.1.29.18.28) — new.
	// Reused as literals per-row rather than named constants so each row's
	// data is self-contained and greppable on its own.
	const SLANT_TESTS: {
		id: string;
		title: string;
		css: string;
		expect: string;
		klass: string;
		browsers: Verdict;
	}[] = [
		{
			id: 'recommended',
			title: "font-style: oblique + font-variation-settings: 'slnt' -11 — RECOMMENDED",
			css: "font-style: oblique; font-variation-settings: 'slnt' -11  (face declares: font-style: oblique)",
			expect:
				'Leans correctly everywhere, by construction: font-style: oblique is the semantically ' +
				'correct, spec-preferred way to ask for this (CSS Fonts 4 font-style-matching) and is ' +
				'future-proof as engines converge — confirmed already fixed between Safari 18.7 and ' +
				'27.0 (see the two rows below). The explicit slnt value is what makes it deterministic ' +
				'today, on every version, without waiting for old Safari to disappear from the field: ' +
				"an element's own explicit font-variation-settings always wins over any automatic " +
				'mapping, so whichever half an engine honours, the other covers it.',
			klass: 'm-recommended',
			browsers: {
				chromium: true,
				firefox: true,
				webkit: true,
				safariOld: { pass: true, device: 'iPhone XR', version: 'Safari 18.7', confirmed: false },
				safariNew: { pass: true, device: 'macOS desktop', version: 'Safari 27.0', confirmed: false }
			}
		},
		{
			id: 'fvs-use-site',
			title: "font-variation-settings: 'slnt' -11 alone — the deterministic ingredient",
			css: "font-variation-settings: 'slnt' -11",
			expect:
				'Leans forward. This sets the axis directly — no automatic font-style mapping involved, ' +
				'so nothing to disagree about across engines or versions, and immune to the ' +
				'ancestor-pin hazard below (unlike the two rows underneath). It is one half of the ' +
				'recommended pattern above, not a replacement for font-style: pairing it with ' +
				'font-style: oblique keeps the semantic layer without giving up determinism.',
			klass: 'm-usesite',
			browsers: {
				chromium: true,
				firefox: true,
				webkit: true,
				safariOld: { pass: true, device: 'iPhone XR', version: 'Safari 18.7', confirmed: false },
				safariNew: { pass: true, device: 'macOS desktop', version: 'Safari 27.0', confirmed: false }
			}
		},
		{
			id: 'oblique-bare',
			title: 'font-style: oblique alone (bare, no italic) — version-dependent',
			css: 'font-style: oblique  (face declares: font-style: oblique)',
			expect:
				'Per the CSS Fonts 4 font-style-matching algorithm, this is an exact match against the ' +
				"face's own font-style: oblique descriptor — no italic-to-oblique fallback step, one " +
				'less layer of indirection than the row below. Leans ~11deg in Chromium, current ' +
				'WebKit and Firefox. On real devices this is confirmed version-dependent, not a ' +
				'permanent Safari limitation: broken on Safari 18.7 (iPhone XR), fixed by Safari 27.0 ' +
				'(macOS desktop) — the exact version this changed in is unknown, only these two ' +
				'endpoints are confirmed. Pair with explicit slnt (the row above) for determinism on ' +
				'anything between those two.',
			klass: 'm-oblique-bare',
			browsers: {
				chromium: true,
				firefox: true,
				webkit: true,
				safariOld: { pass: false, device: 'iPhone XR', version: 'Safari 18.7', confirmed: true },
				safariNew: { pass: true, device: 'macOS desktop', version: 'Safari 27.0', confirmed: true }
			}
		},
		{
			id: 'oblique-range',
			title: 'font-style: italic against a bare `oblique` face — version-dependent',
			css: 'font-style: italic  (face declares: font-style: oblique)',
			expect:
				'Leans ~11deg in Chromium, current WebKit and Firefox — but confirmed UPRIGHT on real ' +
				'Safari 18.7 (iPhone XR): it does not perform this automatic font-style -> slnt mapping ' +
				'at all, even with no ancestor pin in the way. Not separately re-tested on Safari 27.0 ' +
				'— probably fixed alongside the bare-oblique row above, since both reach the same ' +
				'underlying axis-mapping capability just via a different matching path, but that is a ' +
				'guess, not a measurement, so it is left unconfirmed here rather than assumed. Playwright’s ' +
				'WebKit is a different, newer build and reproduces neither gap — this is a real engine ' +
				'divergence you can only catch by hand. font-style: italic is fine as a semantic hint; ' +
				'pair it with explicit slnt (or prefer bare oblique, one layer less indirect) for ' +
				'determinism.',
			klass: 'm-oblique',
			browsers: {
				chromium: true,
				firefox: true,
				webkit: true,
				safariOld: { pass: false, device: 'iPhone XR', version: 'Safari 18.7', confirmed: true },
				safariNew: null
			}
		},
		{
			id: 'oblique-explicit',
			title:
				"font-style: oblique (BARE) against the font's TRUE -11deg..11deg range — still the trap",
			css: 'font-style: oblique; font-synthesis: weight style  (face declares: font-style: oblique -11deg 11deg)',
			expect:
				"-11deg..11deg is not an arbitrary or mismatched range — it's Cairo's actual fvar slnt " +
				'bounds (min -11, default 0, max 11). The trap is specifically the BARE keyword: CSS ' +
				"Fonts 4 says lack of an angle implies 14deg, which is OUTSIDE this face's declared " +
				'bounds, so Chromium and WebKit fall back to synthesis to reach 14deg on top of the ' +
				'(correctly matched) axis — Chromium leans roughly twice as far, WebKit prefers ' +
				'synthesis over the axis outright and lands near the same overshoot. Only Firefox is ' +
				'correct. Correction to an earlier version of this row: this is NOT "declaring ANY ' +
				'oblique range breaks it, correct bounds or not" — state the EXACT angle the range ' +
				'covers instead of the bare keyword, and it resolves correctly everywhere (the row ' +
				'below). fonts.css still ships the bare keyword against a range-FREE face regardless: ' +
				'that stays correct with no extra use-site discipline required, where a ranged face ' +
				'would require every consumer to know and state the exact angle. font-synthesis is ' +
				"forced back to weight+style here — this site's own font-synthesis: weight would " +
				'otherwise neutralise the trap by accident. Not re-tested on a real device.',
			klass: 'm-oblique-range',
			browsers: {
				chromium: false,
				firefox: true,
				webkit: false,
				safariOld: null,
				safariNew: null
			}
		},
		{
			id: 'oblique-range-angle',
			title:
				"font-style: oblique 11deg against the font's TRUE range — the real end state, and it works",
			css: 'font-style: oblique 11deg  (face declares: font-style: oblique -11deg 11deg)',
			expect:
				'This is the combination the trap row above is actually missing, and the genuine ' +
				'spec-ideal end state: a face that declares its true slnt bounds, and a use site that ' +
				'asks for a specific point inside them. Unlike the bare keyword, 11deg IS within this ' +
				"face's declared range, so there is nothing for the engine to fall back to synthesis " +
				'for — resolves via the axis alone, correctly, in Chromium, Firefox and Playwright ' +
				'WebKit, whether or not font-synthesis allows style synthesis. fonts.css does not ship ' +
				'this yet: it requires every consumer to discover and state the exact angle rather than ' +
				'just writing font-style: oblique, and it has not been checked on real Safari. Kept as ' +
				'a documented possibility for when Cairo (or a successor) is ready to declare its axis ' +
				'range properly, not a recommendation to adopt today.',
			klass: 'm-oblique-range-angle',
			browsers: {
				chromium: true,
				firefox: true,
				webkit: true,
				safariOld: null,
				safariNew: null
			}
		},
		{
			id: 'oblique-range-combo',
			title: 'oblique 11deg + explicit slnt -11 against the TRUE range — the migration path',
			css: "font-style: oblique 11deg; font-variation-settings: 'slnt' -11  (face declares: font-style: oblique -11deg 11deg)",
			expect:
				'The belt-and-suspenders version of the row above, for when fonts.css eventually ships ' +
				'a ranged face: pair the exact angle with an explicit slnt value, same shape as the ' +
				'CURRENT recommended row pairing bare oblique with explicit slnt. Whichever half a given ' +
				"engine gets right, the other covers it — and because an element's own explicit " +
				'font-variation-settings always wins over font-style-matching, the slnt half is provably ' +
				'safe to delete later, once range-matching is trusted across every target engine and ' +
				'version. Measured with no interaction or synthesis surprise: leans correctly in ' +
				'Chromium, Firefox and Playwright WebKit, identically to the row above. Not a migration ' +
				'to make today — fonts.css still ships the bare-oblique, range-free face.',
			klass: 'm-oblique-range-combo',
			browsers: {
				chromium: true,
				firefox: true,
				webkit: true,
				safariOld: null,
				safariNew: null
			}
		},
		{
			id: 'oblique-angle',
			title: 'font-style: oblique 11deg against the shipped family — do not use',
			css: 'font-style: oblique 11deg  (family declares BOTH font-style: normal and font-style: oblique faces, like fonts.css)',
			expect:
				"CSS Fonts 4: OpenType's slnt axis is positive counter-clockwise, CSS's oblique angle " +
				"is positive clockwise — so stating the angle here SHOULD target 'slnt' -11, the same " +
				'destination as the recommended row, via font-style-matching alone, no ' +
				'font-variation-settings needed. It does, in Firefox. It does NOT in Chromium or ' +
				'WebKit: caught first as a false pass in an isolated test that only declared the ' +
				'oblique face with no normal sibling; re-measured against a family carrying both, ' +
				'the way fonts.css actually ships Cairo, and both engines pick the wrong face and ' +
				'render upright — not a partial lean, no lean at all. Confirmed live on this page: ' +
				'the matrix cell below reproduces it. Stick with the recommended row above.',
			klass: 'm-oblique-angle',
			browsers: {
				chromium: false,
				firefox: true,
				webkit: false,
				safariOld: null,
				safariNew: null
			}
		},
		{
			id: 'fvs-descriptor',
			title: 'HISTORICAL, DO NOT USE — font-variation-settings as an @font-face DESCRIPTOR',
			css: "@font-face { font-variation-settings: 'slnt' -11 }",
			expect:
				'Not a live recommendation — kept as a regression guard. The old hand-written font.css ' +
				'relied on this. Measured DEAD in WebKit — upright, no lean at all — so Cairo italic was ' +
				'silently broken in Safari all along, the whole time that file was live. Demoted out of ' +
				"the Quick matrix above: it's not a viable alternative worth comparing side by side with " +
				'the working techniques, just a documented reason not to reintroduce it. Not separately ' +
				'device-confirmed in isolation from the original backslant bug report; not re-tested here.',
			klass: 'm-descriptor',
			browsers: {
				chromium: true,
				firefox: true,
				webkit: false,
				safariOld: null,
				safariNew: null
			}
		},
		{
			id: 'synthesis',
			title: 'Faux-oblique synthesis on top of a real axis',
			css: "font-style: italic  +  font-variation-settings: 'slnt' -11",
			expect:
				'Should look the SAME as the recommended row above. If it leans noticeably further, the ' +
				'engine is synthesising a skew on top of the real axis — fix with font-synthesis: none.',
			klass: 'm-synthesis',
			browsers: {
				chromium: true,
				firefox: true,
				webkit: true,
				safariOld: { pass: true, device: 'iPhone XR', version: 'Safari 18.7', confirmed: false },
				safariNew: { pass: true, device: 'macOS desktop', version: 'Safari 27.0', confirmed: false }
			}
		}
	];

	function find(id: string) {
		const t = SLANT_TESTS.find((x) => x.id === id);
		if (!t) throw new Error(`no SLANT_TESTS entry '${id}'`);
		return t.browsers;
	}

	// Trivial: nothing requests a slant, so every family should stay upright,
	// on every engine and version. Included for completeness, not because it's
	// interesting on its own.
	const UPRIGHT_CONTROL: Verdict = {
		chromium: true,
		firefox: true,
		webkit: true,
		safariOld: { pass: true, device: 'iPhone XR', version: 'Safari 18.7', confirmed: false },
		safariNew: { pass: true, device: 'macOS desktop', version: 'Safari 27.0', confirmed: false }
	};

	// Mechanism-based, like fvs-use-site: an explicit same-element slnt value
	// always wins regardless of what the face's own font-style descriptor is
	// doing, so this is true independent of the descriptor being tested. Not a
	// combination separately exercised by slant.browser.test.ts, hence its own
	// entry rather than a find() reference.
	const EXPLICIT_SLNT_ANYWHERE: Verdict = {
		chromium: true,
		firefox: true,
		webkit: true,
		safariOld: { pass: true, device: 'iPhone XR', version: 'Safari 18.7', confirmed: false },
		safariNew: { pass: true, device: 'macOS desktop', version: 'Safari 27.0', confirmed: false }
	};

	// Rows = what the @font-face declares. Columns = what's set at the use
	// site. Cells reference the detailed SLANT_TESTS entry below wherever one
	// exists, so there is exactly one source of truth per claim; `null` means
	// genuinely untested/not meaningful for that combination, not "assumed
	// fine" — left blank rather than guessed at.
	const MATRIX_COLS = [
		{ id: 'none', label: '(nothing set)' },
		{ id: 'italic', label: 'font-style: italic' },
		{ id: 'oblique', label: 'font-style: oblique' },
		{ id: 'obliqueAngle', label: 'font-style: oblique 11deg' },
		{ id: 'slnt', label: "font-variation-settings: 'slnt' -11" },
		{ id: 'combo', label: "oblique + 'slnt' -11" }
	] as const;

	// The use-site CSS each column actually applies, for the overlap-diff
	// glyph. 'none' is deliberately empty — that's the point of that column.
	const MATRIX_COL_CSS: Record<(typeof MATRIX_COLS)[number]['id'], string> = {
		none: '',
		italic: 'font-style: italic;',
		oblique: 'font-style: oblique;',
		obliqueAngle: 'font-style: oblique 11deg;',
		slnt: "font-variation-settings: 'slnt' -11;",
		combo: "font-style: oblique; font-variation-settings: 'slnt' -11;"
	};

	type MatrixCell = { verdict: Verdict; extraCss?: string } | null;

	const MATRIX_ROWS: {
		id: string;
		label: string;
		family: string;
		cells: Record<(typeof MATRIX_COLS)[number]['id'], MatrixCell>;
	}[] = [
		{
			id: 'oblique-bare-face',
			label: '@font-face { font-style: oblique } — shipped by fonts.css',
			family: 'Cairo',
			cells: {
				none: { verdict: UPRIGHT_CONTROL },
				italic: { verdict: find('oblique-range') },
				oblique: { verdict: find('oblique-bare') },
				obliqueAngle: { verdict: find('oblique-angle') },
				slnt: { verdict: find('fvs-use-site') },
				combo: { verdict: find('recommended') }
			}
		},
		{
			id: 'oblique-range-face',
			label: "@font-face { font-style: oblique -11deg 11deg } — the trap, the font's real bounds",
			family: 'CairoObliqueRangeTest',
			cells: {
				none: { verdict: UPRIGHT_CONTROL },
				italic: null,
				// This site's own app.css sets font-synthesis: weight globally,
				// which neutralises the trap by accident (docs/compat.md, "the
				// oblique-range trap is neutralised by font-synthesis: weight").
				// Without restating font-synthesis: weight style here too, this
				// cell would render as a false pass, contradicting its own
				// verdict badges below. Matches the css field on the
				// 'oblique-explicit' SLANT_TESTS entry exactly.
				oblique: { verdict: find('oblique-explicit'), extraCss: 'font-synthesis: weight style;' },
				// Passes without needing the font-synthesis override the row
				// above needs — matches 'oblique-range-angle' exactly, measured
				// with and without style synthesis allowed (slant.browser.test.ts).
				obliqueAngle: { verdict: find('oblique-range-angle') },
				// Mechanism-based, like EXPLICIT_SLNT_ANYWHERE below: setting the
				// axis directly bypasses font-style-matching entirely, so it can't
				// care which @font-face block is active. Same reasoning, not a
				// separately-exercised browser test.
				slnt: { verdict: EXPLICIT_SLNT_ANYWHERE },
				combo: { verdict: find('oblique-range-combo') }
			}
		}
	];

	// 'control' is a property of the COLUMN (the "(nothing set)" column is
	// always the trivial upright case), not something inferrable from the
	// Verdict shape alone — pass the column id in explicitly rather than
	// guessing from which fields happen to be true.
	function matrixStatus(
		v: Verdict | null
	): 'control' | 'pass' | 'version-dependent' | 'broken' | null {
		if (v === null) return null;
		// Reference equality on purpose: UPRIGHT_CONTROL marks the trivial
		// "nothing should happen" cells specifically. Row 3's own "(nothing
		// set)" cell is a real, meaningful test (find('fvs-descriptor')), not
		// this constant, and must be classified normally, not shortcut here.
		if (v === UPRIGHT_CONTROL) return 'control';
		const automatedPass = v.chromium && v.firefox && v.webkit;
		const realFail = (v.safariOld && !v.safariOld.pass) || (v.safariNew && !v.safariNew.pass);
		const realPassOrUnknown =
			(v.safariOld === null || v.safariOld.pass) && (v.safariNew === null || v.safariNew.pass);
		if (automatedPass && realPassOrUnknown) return 'pass';
		if (automatedPass && realFail) return 'version-dependent';
		return 'broken';
	}

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

<div class="tldr">
	<h2>TL;DR</h2>
	<p class="tldr-lead">
		<b>Summary:</b>
		<b
			>ship <code>font-style: oblique</code> + explicit
			<code>font-variation-settings: 'slnt' -11</code></b
		>
		(the recommended row below) — it is correct everywhere today, with no per-use-site angle to get right.
		The theoretically "purer" end state — a face that declares its true <code>slnt</code> range, matched
		with an exact angle at the use site — also measures correct in every automated engine, but fonts.css
		does not ship it: it demands every consumer discover and state the exact angle, and it has not been
		checked on real Safari.
	</p>
	<ul>
		<li>
			<code>font-style: oblique</code> is the semantically correct, spec-preferred way to ask for
			Cairo's italic — Cairo has no italic masters, this <b>is</b> the axis, matched via
			<a href="https://drafts.csswg.org/css-fonts-4/#font-style-matching"
				>CSS Fonts 4's font-style-matching algorithm</a
			>.
		</li>
		<li>
			Confirmed correct on Chromium, Firefox, Playwright's WebKit, and real desktop
			<b>Safari 27.0</b>.
		</li>
		<li>
			Confirmed <b>broken</b> on real, older iOS Safari (<b>18.7, iPhone XR</b>) — the automatic
			mapping does not happen there at all, for either <code>oblique</code> or
			<code>italic</code>.
		</li>
		<li>
			For deterministic correctness across every version, pair it with an explicit
			<code>font-variation-settings: 'slnt' -11</code>. That is the recommended pattern below.
		</li>
		<li>
			Stating the exact angle instead — <code>font-style: oblique 11deg</code> — is tempting (CSS's
			angle sign is the opposite of OpenType's <code>slnt</code> axis, so <code>11deg</code> here
			targets <code>'slnt' -11</code>, no <code>font-variation-settings</code> needed) but
			<b>do not use it</b>: against the shipped family, which carries both a normal and an oblique
			face, Chromium and WebKit pick the wrong one and render upright. Only Firefox honours it. See
			the trap row below.
		</li>
		<li>
			Declaring an oblique <b>angle range</b> in <code>@font-face</code> (e.g.
			<code>font-style: oblique -11deg 11deg</code>) breaks the <b>bare</b>
			<code>font-style: oblique</code> keyword in Chromium and WebKit, even at the font's own true
			<code>slnt</code> bounds — CSS's implied default angle for "no angle stated" is 14deg, outside
			this face's ±11deg range, so the browser falls back to synthesis on top of the axis.
			Correction to an earlier version of this page: it is <b>not</b> "any range breaks it
			regardless" — stating the exact angle the range covers (<code>oblique 11deg</code>, not bare)
			resolves correctly in every engine. fonts.css still ships the bare keyword against a
			range-free face, because that needs no such per-use-site angle discipline. See both rows
			below.
		</li>
		<li>
			Change weight with the <code>font-weight</code> <b>property</b>
			(<code>font-weight: 700</code>), not by stating <code>'wght'</code> through
			<code>font-variation-settings</code>. Measured: a lone <code>'wght'</code> value alone doesn't
			break <code>slnt</code> either, in a flat, unpinned case — but the property can never interact
			with <code>slnt</code> at all, in any component tree, so it carries none of the font-variation-settings-replaces-not-merges
			risk (the "second real-device finding" below) by construction.
		</li>
	</ul>
	<p class="tldr-note">
		Independently corroborated: Safari has lagged on this exact CSS Fonts 4 behaviour since at least
		2020 — see <a href="https://arrowtype.github.io/vf-slnt-test/index.html"
			>ArrowType's vf-slnt-test</a
		>, a community test suite (last run November 2022) that found Safari passing almost nothing
		except <code>font-variation-settings</code> itself against variable fonts, across three years of
		retests. Its recommendation to fall back to <code>transform: skew()</code> is for fonts
		<i>missing</i> the requested axis value entirely — a different, spec-acknowledged ambiguous case
		— not this one: Cairo has a real <code>slnt</code> axis and <code>font-style: oblique</code>
		matches it directly.
	</p>
</div>

{#snippet badge(logo: string, label: string, pass: boolean | null, confirmed: boolean)}
	<li
		class="b-badge"
		class:pass={pass === true}
		class:fail={pass === false}
		class:unknown={pass === null}
		class:reasoned={pass !== null && !confirmed}
		title="{label}: {pass === null ? 'untested on a real device' : pass ? 'pass' : 'fail'}{pass ===
		null
			? ''
			: confirmed
				? ' (confirmed on device)'
				: ' (reasoned, not separately device-confirmed)'}"
	>
		<img class="logo" src={logo} alt={label} />
	</li>
{/snippet}

{#snippet realSafari(r: RealSafari, fallbackLabel: string)}
	{#if r === null}
		{@render badge(safariLogo, fallbackLabel, null, false)}
	{:else}
		{@render badge(safariLogo, r.version, r.pass, r.confirmed)}
	{/if}
{/snippet}

{#snippet verdictBadges(v: Verdict)}
	<ul class="verdicts">
		{@render badge(chromiumLogo, 'Chromium', v.chromium, true)}
		{@render badge(firefoxLogo, 'Firefox', v.firefox, true)}
		{@render badge(webkitLogo, 'WebKit (Playwright)', v.webkit, true)}
		{@render realSafari(v.safariOld, 'Safari (old)')}
		{@render realSafari(v.safariNew, 'Safari (new)')}
	</ul>
{/snippet}

{#snippet overlapGlyph(family: string, testCss: string)}
	<div class="overlap">
		<span
			class="ov-control"
			style="font-family: '{family}', var(--font-sans); font-variation-settings: 'slnt' -11;"
			>VizChitra</span
		>
		<span class="ov-test" style="font-family: '{family}', var(--font-sans); {testCss}"
			>VizChitra</span
		>
	</div>
{/snippet}

<h2>Quick matrix</h2>
<p class="hint">
	Rows are what the <code>@font-face</code> declares; columns are what's set at the use site. Each
	populated cell overlays two renderings of the same glyphs: <b class="ov-control-label">pink</b> is
	the always-correct control (<code>font-variation-settings: 'slnt' -11</code> directly, on the same
	family), <b class="ov-test-label">the other colour</b> is the technique being tested. Aligned, the
	two colours screen together into a pale blend — <b>visible pink is a failure</b>, not a subtle
	one. Blank cells are untested or not a meaningful combination for that face, not "assumed fine."
	Full detail — why each populated cell is what it is — is in "Slant techniques" below.
</p>
<div class="matrix-wrap">
	<!-- Transposed for reading ease: 5 use-site settings read better as rows
	     (a short vertical list) than as 5 columns needing horizontal scroll,
	     with the 3 @font-face variants across the top instead. The underlying
	     data (MATRIX_ROWS = face variants, MATRIX_COLS = use-site settings)
	     is unchanged; only the render order is swapped. -->
	<table class="matrix">
		<thead>
			<tr>
				<th></th>
				{#each MATRIX_ROWS as face (face.id)}
					<th>{face.label}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each MATRIX_COLS as useSite (useSite.id)}
				<tr>
					<th scope="row">{useSite.label}</th>
					{#each MATRIX_ROWS as face (face.id)}
						{@const cell = face.cells[useSite.id]}
						{@const status = matrixStatus(cell?.verdict ?? null)}
						<td class="status-{status ?? 'blank'}">
							{#if cell === null}
								<span class="blank-cell">—</span>
							{:else}
								{@render overlapGlyph(
									face.family,
									MATRIX_COL_CSS[useSite.id] + (cell.extraCss ?? '')
								)}
								{#if status === 'control'}
									<p class="control-note">
										trivial — nothing here requests a slant, not a meaningful test
									</p>
								{:else}
									{@render verdictBadges(cell.verdict)}
								{/if}
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<ul class="legend">
	<li><span class="b-badge pass"></span> pass</li>
	<li><span class="b-badge fail"></span> fail</li>
	<li>
		<span class="b-badge pass reasoned"></span> pass, reasoned — not separately device-confirmed
	</li>
	<li><span class="b-badge unknown"></span> untested on a real device</li>
	<li class="legend-note">Hover a badge for the exact device/version/confirmation status.</li>
</ul>

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
			<code>font-style</code> onto the axis. The "Hazard demo" section further down re-checks that on
			this device.
		</p>
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
			{@render verdictBadges(t.browsers)}
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
	<code>font-style</code> → <code>slnt</code> mapping at all, pin or no pin (fixed by Safari 27.0 —
	see the TL;DR above). The left and middle halves become visually indistinguishable there, which is
	itself the case for pairing <code>font-style</code> with an explicit value rather than relying on
	the mapping alone: you cannot tell "blocked by an ancestor" apart from "this version never
	supported it" by eye. The right half sidesteps the whole question — it sets
	<code>font-variation-settings: 'slnt' -11</code> directly, so there is no automatic mapping to be
	blocked or unsupported, and it leans correctly under the very same pinned ancestor, on every
	engine and version including old real Safari. This is the deterministic half of the recommended
	pattern above, not a reason to drop <code>font-style</code> entirely.
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

	.tldr {
		max-width: 48rem;
		margin: 1rem 0 2rem;
		padding: 0.9rem 1.1rem;
		border: 1px solid var(--border);
		border-left: 3px solid var(--accent);
		border-radius: var(--radius);
		background: var(--surface-hover);
	}

	.tldr h2 {
		margin: 0 0 0.5rem;
		padding-bottom: 0;
		border-bottom: none;
		font-size: 1rem;
	}

	.tldr-lead {
		margin: 0 0 0.8rem;
		padding-bottom: 0.7rem;
		border-bottom: 1px dashed var(--border);
		font-size: 0.9rem;
	}

	.tldr ul {
		margin: 0;
		padding-left: 1.2rem;
		font-size: 0.88rem;
	}

	.tldr li {
		margin: 0.4rem 0;
	}

	.tldr-note {
		margin: 0.9rem 0 0;
		padding-top: 0.7rem;
		border-top: 1px dashed var(--border);
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	/* The overlap-diff glyph: two renderings of the same text, stacked exactly
	   on top of each other. isolation:isolate scopes mix-blend-mode to just
	   these two spans so it doesn't affect anything else on the page. Where
	   the technique under test (cyan) renders identically to the always-
	   correct control (pink), screen-blending the two produces a pale colour
	   with no pink visible on its own — a slant that's missing, wrong, or
	   shaped differently shows up as an uncovered pink fringe. */
	.overlap {
		position: relative;
		isolation: isolate;
		height: 2.6rem;
		font-size: 2rem;
		line-height: 1;
		margin-bottom: 0.5rem;
	}

	.overlap span {
		position: absolute;
		top: 0;
		left: 0;
		white-space: nowrap;
		mix-blend-mode: screen;
	}

	.ov-control,
	.ov-control-label {
		color: #f472b6;
	}

	.ov-test,
	.ov-test-label {
		color: #22d3ee;
	}

	.matrix-wrap {
		overflow-x: auto;
	}

	table.matrix {
		display: table;
		min-width: 100%;
	}

	table.matrix th,
	table.matrix td {
		vertical-align: top;
	}

	table.matrix td {
		min-width: 12.5rem;
		border-left-width: 3px;
	}

	td.status-pass {
		border-left-color: #4ade80;
	}

	td.status-version-dependent {
		border-left-color: #fbbf24;
	}

	td.status-broken {
		border-left-color: #f87171;
	}

	td.status-control {
		border-left-color: var(--border);
	}

	td.status-blank {
		border-left-color: var(--border);
	}

	.blank-cell {
		color: var(--text-muted);
	}

	.control-note {
		margin: 0;
		font-size: 0.72rem;
		font-style: italic;
		color: var(--text-muted);
	}

	table.matrix .verdicts {
		flex-wrap: nowrap;
		gap: 0.3rem;
	}

	.legend {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem 1.2rem;
		padding: 0.75rem 0 1.5rem;
		margin: 0;
		font-size: 0.78rem;
		color: var(--text-muted);
	}

	.legend li {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.legend .b-badge {
		width: 1.2rem;
		height: 1.2rem;
		border-width: 2px;
	}

	.legend-note {
		font-style: italic;
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

	/* Circular logo badge with a coloured ring: green pass, red fail, grey
	   dashed for genuinely untested. A dashed (vs solid) ring marks "reasoned,
	   not separately device-confirmed" either way — see the legend. Full
	   detail (device, version, confirmed-or-not) is in the title tooltip,
	   not repeated as text in every cell now that this is a compact grid. */
	.b-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.9rem;
		height: 1.9rem;
		padding: 0.2rem;
		border-radius: 50%;
		border: 2px solid #f87171;
		background: var(--surface-hover);
	}

	.b-badge.pass {
		border-color: #4ade80;
	}

	.b-badge.unknown {
		border-color: var(--border);
		border-style: dashed;
	}

	.b-badge.reasoned {
		border-style: dashed;
	}

	.logo {
		width: 1.15rem;
		height: 1.15rem;
		flex: none;
	}

	/* One technique per class, so nothing leaks between rows. */

	/* The recommended pattern: font-style for semantics, explicit slnt for
	   determinism. The explicit value always wins on the same element, so
	   this measures correctly regardless of whether a given engine performs
	   the font-style -> slnt mapping at all. */
	.m-recommended {
		font-style: oblique;
		font-variation-settings:
			'wght' 600,
			'slnt' -11;
	}

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

	.m-oblique-bare {
		font-style: oblique;
		font-variation-settings: normal;
	}

	/* Uses the site's real 'Cairo' family (font-family inherited from .sample,
	   which carries both a normal and an oblique face, same as fonts.css) —
	   Chromium and WebKit pick the wrong face for an explicit angle and stay
	   upright; only Firefox honours it (slant.browser.test.ts). Do not use. */
	.m-oblique-angle {
		font-style: oblique 11deg;
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

	/* The real end state: a specific angle, within the face's declared
	   bounds, against the ranged face — resolves via the axis alone, no
	   font-synthesis override needed (slant.browser.test.ts measured this
	   correct with or without style synthesis allowed, unlike the bare
	   keyword above). */
	.m-oblique-range-angle {
		font-family: 'CairoObliqueRangeTest', var(--font-sans);
		font-style: oblique 11deg;
		font-variation-settings: normal;
	}

	/* The migration-path pairing: exact angle + explicit slnt together, so
	   the slnt half can be deleted later once range-matching is trusted
	   everywhere (slant.browser.test.ts confirms no interaction). */
	.m-oblique-range-combo {
		font-family: 'CairoObliqueRangeTest', var(--font-sans);
		font-style: oblique 11deg;
		font-variation-settings: 'slnt' -11;
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
