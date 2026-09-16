<h1>Use these fonts</h1>
<p class="lede">
	Cairo, IBM Plex Sans and Fira Code, served as a versioned, unicode-range-split
	<code>fonts.css</code> from <code>fonts.vizchitra.com</code> — CORS-enabled, cache-forever, and
	reproducible from this repo's <code>font-src/</code>. Only Cairo is ever modified; Plex and Fira
	Code are redistributed exactly as upstream ships them. Full specimen, axes and file sizes are in
	the <a href="/catalogue">catalogue</a>.
</p>

<h2>On the web</h2>
<p>Link the canonical stylesheet directly — no build step, no self-hosting required:</p>
<pre><code>&lt;link rel="stylesheet" href="https://fonts.vizchitra.com/v1/fonts.css"&gt;</code
	></pre>
<p>
	Or self-host by downloading <a href="/fonts/v1/fonts.css">fonts.css</a> and the
	<code>.woff2</code> files it references from <a href="/fonts/v1/manifest.json">manifest.json</a>
	— everything under <code>/v1/</code> is versioned and immutable, so it's safe to vendor and cache
	indefinitely. A future <code>/v2/</code> will coexist with <code>/v1/</code> rather than replace it.
</p>

<h3>Reference by CSS custom property, not by name</h3>
<p>
	Each family is exposed as a custom property so the underlying font can change without touching
	every call site — this is how Cairo will be swapped for VizChitra Sans later without a second
	round of edits across every consuming site:
</p>
<pre><code
		>{`:root {
  --font-sans: 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'Fira Code', ui-monospace, monospace;
  --font-display: 'Cairo', var(--font-sans);
}

body { font-family: var(--font-sans); }
h1, h2 { font-family: var(--font-display); }
code, pre { font-family: var(--font-mono); }`}</code
	></pre>
<p>
	Never write <code>font-family: 'Cairo'</code> (or <code>'IBM Plex Sans'</code>,
	<code>'Fira Code'</code>) directly at a call site — always through the custom property, even
	though it resolves to the same family today.
</p>

<h3>Cairo's italic needs one extra line</h3>
<p>
	Cairo has no italic masters — its italic <i>is</i> the <code>slnt</code> axis — and real Safari
	does not reliably perform the automatic <code>font-style</code> → <code>slnt</code> mapping this
	depends on (version-dependent; see <a href="/compat">/compat</a> for the full matrix). Pair
	<code>font-style</code> with an explicit axis value rather than relying on
	<code>font-style: italic</code> alone:
</p>
<pre><code
		>{`.italic {
  font-style: oblique;
  font-variation-settings: 'slnt' -11;
}`}</code
	></pre>
<p>
	<code>font-style: oblique</code> stays for semantics and forward-compatibility; the explicit
	<code>slnt</code> value is what makes it render correctly on every engine and version today.
</p>

<h3>Fira Code: weight and ligatures</h3>
<p>
	Fira Code's own upstream family name is "Fira Code Light" and its <code>wght</code> axis defaults
	to 300 internally — but <code>fonts.css</code> declares
	<code>font-weight: 300 700</code> as a range, so leaving <code>font-weight</code> unset resolves
	to CSS's own initial value (400), not the font's internal default. Set it explicitly anyway if you
	want a specific weight. Every one of its 86 code ligatures is powered by <code>calt</code>, which
	is on by default — if you need to turn ligatures off, use
	<code>font-variant-ligatures: no-contextual</code> or
	<code>font-feature-settings: 'calt' 0</code> (the second wins if both are set on the same
	element); <code>font-variant-ligatures: no-common-ligatures</code> does nothing here, since that
	maps to <code>liga</code>/<code>clig</code>, which Fira Code doesn't use.
</p>

<h2>In Figma</h2>
<p class="stub">
	Not yet needed: Cairo, IBM Plex Sans and Fira Code are all already available directly from Google
	Fonts inside Figma today, so there is nothing this repo needs to document until
	<b>VizChitra Sans</b> exists (Phase 3) and needs a custom install path — static instances, the Figma
	font-helper, and so on. This section is a placeholder for that.
</p>

<style>
	.lede {
		color: var(--text-muted);
		max-width: 46rem;
	}

	h2 {
		margin-top: 2.5rem;
	}

	h3 {
		margin-top: 1.5rem;
	}

	pre {
		background: var(--surface-hover);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem;
		overflow-x: auto;
		font-family: var(--font-mono);
		font-size: 0.9rem;
	}

	.stub {
		color: var(--text-muted);
		border: 1px dashed var(--border);
		border-radius: var(--radius);
		padding: 1rem;
	}
</style>
