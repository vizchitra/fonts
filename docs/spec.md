Build a Svelte-based typography playground for developing and visually testing the **VizChitra Retalics** concept.

Context:

- The current display font is based on Cairo.
- Cairo already provides a variable `slnt` axis.
- We currently prototype Retalics by wrapping every character in a `<span>` and assigning an individual `slnt` value.
- Example: V may use `-4`, I `+8`, Z `0`, etc.
- The eventual goal is to move this behavior into a custom variable-font axis called `RETA`, but DO NOT implement the font-level RETA axis yet.
- This phase is purely a visual/design experimentation tool.

Primary goal:
Create a lab similar in spirit to the Inter Font Lab:
https://rsms.me/inter/lab/

The Lab should allow us to experiment with:

1. Global slant
2. Per-character slant
3. Tracking
4. Kerning
5. Contextual alternates
6. Weight
7. Font size
8. Test strings and individual glyph/pair inspection

Important distinction:

- `slnt` controls the normal global variable-font slant.
- Per-character slant is currently our Retalics prototype.
- Tracking is global spacing and should use CSS `letter-spacing`.
- Kerning is pair-specific spacing and should remain a font/OpenType concern where possible.
- Contextual alternates (`calt`) should change glyph forms based on context, not merely compensate for bad spacing.
- Do not conflate tracking, kerning, contextual alternates, and Retalics.

UI:

Create a clean typography lab with:

A. Main editable text area

- Large editable text.
- Allow arbitrary text input.
- Default to a useful pangram/sample containing varied letter pairs.
- Changes should update immediately.

B. Global controls

- Weight (`wght`)
- Slant (`slnt`)
- Tracking
- Font size
- Line height
- Toggle kerning
- Toggle contextual alternates

C. Retalics controls
Provide a way to enable/disable the current per-character Retalics prototype.

Provide editable slant values per character/glyph.

Example:

V -4
I 8
Z 0
C 2
H 7
T -6
R -8
A 0

Do NOT hard-code these values into individual Svelte components.

Create a reusable data structure/function for the Retalics values.

Unknown characters should gracefully fall back to a default value.

D. Pair testing

Create a dedicated section for testing common pairs.

Include pairs such as:

AV
VA
AW
WA
AY
YA
To
Ta
Te
Ty
Yo
Wa
Wo
LT
RT
RA
TA
FA
PA

Allow arbitrary pairs to be entered.

The purpose is to visually inspect:

- slant interaction
- spacing
- kerning
- tracking
- overall rhythm

E. Glyph testing

Create a glyph grid containing the supported Latin alphabet, numerals, punctuation, and relevant symbols.

Each glyph should show:

- glyph
- current Retalics/slant value
- ability to adjust its value

This will help us discover which glyphs want different slant behavior.

F. Comparison mode

Provide an easy way to compare:

1. Original Cairo
2. Cairo with global `slnt`
3. Current per-character Retalics prototype

The comparison should use identical text, size, weight, tracking, etc.

Technical implementation:

Use the existing `formatSlantedText()` architecture where appropriate, but refactor it so the Retalics behavior is configurable.

Do not create unnecessary DOM complexity.

Where Retalics is enabled, individual glyphs can be represented as spans:

<span class="retalics-glyph" style="--letter-slant: ...">...</span>

Use:

font-variation-settings: 'slnt' var(--letter-slant);

Do not use CSS transforms/skew for the prototype.

For normal text, use the font's native variable axes.

For tracking use:

letter-spacing

For kerning use:

font-kerning: normal / none

For contextual alternates use:

font-feature-settings: "calt" 1;

or the appropriate CSS OpenType property.

Do not attempt to fake kerning with arbitrary JavaScript spacing unless explicitly necessary for an experimental mode.

Architecture:

Create a clear separation between:

- Typography controls/state
- Retalics configuration
- Text rendering
- Glyph testing
- Pair testing

The Retalics configuration should eventually be portable to a font-engineering workflow.

For example:

type RetalicsConfig = {
defaultSlant: number;
glyphSlants: Record<string, number>;
};

Keep the design data separate from the UI.

Future direction:

Eventually this prototype will inform a real Cairo-derived font called **VizChitra Sans**.

The intended font architecture will likely be:

VizChitra Sans

- `wght` — weight
- `slnt` — conventional global slant
- `RETA` — custom Retalics axis

The current per-character slant values are therefore experimental design data. Do not assume that the final `RETA` axis will simply reproduce today's values.

The Lab should help us discover:

- which glyphs need stronger/weaker slant
- which glyph pairs need kerning changes
- whether some glyphs need actual alternate forms
- whether contextual alternates are useful
- whether Retalics should eventually be a single discrete state or a continuous axis
- how Retalics interacts with different weights and global slant values

Design:

Keep the interface minimal and typography-focused. Prioritize the large text preview over UI decoration.

Use a layout inspired by professional font labs:

- large preview
- compact controls
- specimen/pair testing below
- glyph inspection section
- clear Original vs Retalics comparison

Do not add unnecessary animations or visual effects.

Deliverable:

A working Svelte page/component integrated into the existing project, using the existing font setup and utilities where possible.

Before finishing:

- Verify arbitrary text works.
- Verify spaces and punctuation behave correctly.
- Verify repeated letters behave correctly.
- Verify tracking works independently of Retalics.
- Verify kerning can be toggled.
- Verify contextual alternates can be toggled.
- Verify global `slnt` and per-character Retalics can be used independently.
- Verify unknown characters don't break rendering.
- Keep the implementation clean enough that the current prototype can later be replaced by a real `RETA` variable-font axis.

For basic rsveltekit repo setup

- Use base.amitkaps.com
- https://github.com/amitkaps/base
- available locally in /code/base

Reference files:

The prototypes this spec was written against. Only one survives as a file:
`LogoTypeReference.svelte`, the original logotype. It is reference only — not
imported, not built, not kept up to date — and carries a header comment saying
what was extracted from it and what superseded it.

It is kept because it is the source of the seed slant values (V -4, I 8, Z 0,
C 2, H 7, T -6, R -8, A 0) **and** the only record of the per-glyph
letter-spacing and per-glyph weight that the lab deliberately does not model.
Two open goals depend on it: setting the logo — duotone included — in the font
itself rather than in spans, and serving as the kerning target for VIZCHITRA.

The hand-written `font.css` copy-pasted across the VizChitra sites is gone,
superseded by the generated `src/lib/styles/fonts.css`. Its one irreplaceable
part, the Cairo italic block using a `font-variation-settings` @font-face
descriptor, lives on as a live test in `src/routes/compat/descriptor-test.css`.
That technique turned out to be **completely inert in WebKit**, so Cairo italic
never rendered in Safari at all; see `compat.md`.

The second prototype, the competing _algorithmic_ one from the vizchitra site,
does not need its own file — it was roughly this:

```svelte
<span {...rest} class={['font-display', colorClasses[color]]}>
	{#if letters.length}
		{#each letters as l}
			<span class="slanted" style="--letter-slant: {l.slant}">{l.letter}</span>
		{/each}
	{/if}
</span>
```

where `letters` came from `formatSlantedText(textContent)` in
`vizchitra/src/lib/utils/slanted.ts`, which derived slant from a letter's
alphabetical distance from the m/n midpoint (a=0, l=+11, o=−11, z=0) rather
than from a hand-tuned table. That rule survives as the `mnDistance` generator
in `src/lib/retalics/generators.ts`, ported verbatim and pinned by tests.

See `plan.md` for how each of these was resolved.
