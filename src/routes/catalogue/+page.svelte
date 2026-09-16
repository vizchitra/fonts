<script lang="ts">
	import manifest from '../../../static/fonts/v1/manifest.json';
	import lock from '../../../fonts.lock.json';

	const KB = (bytes: number) => (bytes / 1024).toFixed(1);

	type FamilyMeta = {
		key: string;
		displayName: string;
		axes: Record<string, [number, number, number]>;
		fullGlyphs: number;
		fullFontKB: number;
		features: string;
	};

	type ManifestVariant = {
		basename: string;
		style: string;
		subsets: { subset: string; file: string; bytes: number; glyphs: number; codepoints: number }[];
	};

	// fullFontKB is a single woff2 with every glyph and no unicode-range split -
	// i.e. what shipping "the whole font, once" would cost. Measured directly
	// with fontTools against the pinned upstream file (fonts.lock.json), the
	// same way Fira Code's 110KB figure in docs/plan.md was measured, so all
	// three families are compared on the same basis.
	type Axes = Record<string, [number, number, number]>;
	const lockFonts = lock.fonts as unknown as Record<string, { axes: Axes; glyphs: number }>;

	const FAMILIES: FamilyMeta[] = [
		{
			key: 'cairo',
			displayName: 'Cairo',
			axes: lockFonts.cairo.axes,
			fullGlyphs: lockFonts.cairo.glyphs,
			fullFontKB: 173.3,
			features:
				'Real GPOS kerning. No calt at all — the Retalics Lab’s contextual-alternates ' +
				'toggle is wired but inert on this font. GSUB carries only dnom/frac/numr/rvrn.'
		},
		{
			key: 'ibm-plex-sans',
			displayName: 'IBM Plex Sans',
			axes: lockFonts['ibm-plex-sans'].axes,
			fullGlyphs: lockFonts['ibm-plex-sans'].glyphs,
			fullFontKB: 224.2,
			features:
				'Real GPOS kerning and real ligatures via liga (unlike Cairo). GSUB carries ' +
				'ccmp/dnom/frac/liga/numr/rvrn. Ships normal and italic masters.'
		},
		{
			key: 'fira-code',
			displayName: 'Fira Code',
			axes: lockFonts['fira-code'].axes,
			fullGlyphs: lockFonts['fira-code'].glyphs,
			fullFontKB: 110.4,
			features:
				'No kerning — expected for a monospace font. calt powers all 86 ligatures plus 32 ' +
				'cvXX and 10 ssXX stylistic sets; all survive subsetting (verified in docs/plan.md) ' +
				'because GSUB closure follows calt to its unencoded glyphs regardless of unicode-range. ' +
				'Legacy family name is "Fira Code Light" and wght defaults to 300 — upstream’s own ' +
				'naming, corrected here with an explicit font-weight rather than by touching the font.'
		}
	];

	function axisLabel([min, def, max]: [number, number, number]) {
		return min === max ? `${min}` : `${min}–${def}–${max}`;
	}
</script>

<h1>Catalogue</h1>
<p class="lede">
	Axes, features and measured file sizes for every family this site serves. Only Cairo is ever
	modified; IBM Plex Sans and Fira Code are redistributed unmodified — what's below is the delivery
	format, not a change to the fonts themselves. Untouched originals are published alongside these
	subsets for download; see <a href="/fonts/v1/manifest.json">manifest.json</a> and
	<a href="/fonts/v1/fonts.css">fonts.css</a>.
</p>

{#each FAMILIES as family (family.key)}
	{@const variants = (manifest as Record<string, ManifestVariant[]>)[family.key]}
	<section class="family">
		<h2>{family.displayName}</h2>
		<p
			class="specimen"
			style:font-family="'{family.displayName}', var(--font-sans)"
			style:font-weight={family.axes.wght?.[1] ?? 400}
		>
			The quick brown fox jumps over the lazy dog — 0123456789
		</p>

		<dl class="meta">
			<dt>Axes</dt>
			<dd>
				{Object.entries(family.axes)
					.map(([tag, range]) => `${tag} ${axisLabel(range)}`)
					.join(' · ')}
			</dd>
			<dt>Full font</dt>
			<dd>{family.fullGlyphs} glyphs, {family.fullFontKB.toFixed(1)}KB as a single woff2</dd>
			<dt>Features</dt>
			<dd>{family.features}</dd>
		</dl>

		{#each variants as variant (variant.basename)}
			{@const total = variant.subsets.reduce((sum, s) => sum + s.bytes, 0)}
			{#if variants.length > 1}
				<h3>
					{variant.style === 'italic' ? `${family.displayName} italic` : family.displayName}
				</h3>
			{/if}
			<table>
				<thead>
					<tr>
						<th>Subset</th>
						<th>Size</th>
						<th>Glyphs</th>
						<th>Codepoints</th>
						<th>Loaded</th>
					</tr>
				</thead>
				<tbody>
					{#each variant.subsets as sub (sub.subset)}
						<tr>
							<td>{sub.subset}</td>
							<td>{KB(sub.bytes)}KB</td>
							<td>{sub.glyphs}</td>
							<td>{sub.codepoints}</td>
							<td>{sub.subset === 'latin' ? 'always' : 'on demand'}</td>
						</tr>
					{/each}
					<tr class="total">
						<td>total coverage</td>
						<td>{KB(total)}KB</td>
						<td colspan="3">vs {family.fullFontKB.toFixed(1)}KB unsplit</td>
					</tr>
				</tbody>
			</table>
		{/each}
	</section>
{/each}

<style>
	.lede {
		color: var(--text-muted);
		max-width: 46rem;
	}

	.family {
		margin-top: 2.5rem;
	}

	.specimen {
		font-size: 1.8rem;
		line-height: 1.3;
		margin: 0.5rem 0 1rem;
	}

	.meta {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.35rem 1rem;
		margin: 1rem 0;
	}

	.meta dt {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.meta dd {
		margin: 0;
	}

	tr.total td {
		color: var(--text-muted);
		font-style: italic;
	}
</style>
