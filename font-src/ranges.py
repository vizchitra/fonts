"""Unicode ranges for the served subsets.

Split so the browser fetches only what a page needs. The latin block must stay
self-contained: Fira Code's ligatures are unencoded glyphs reached through calt,
and a ligature whose input characters straddled two files would not form, since
the browser picks a font per character. All 28 ligature components are ASCII.
"""

# Matches Google Fonts' own latin / latin-ext split, which the existing
# font.css across the VizChitra sites already uses.
LATIN = (
	"U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,"
	"U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,"
	"U+2212,U+2215,U+FEFF,U+FFFD"
)

LATIN_EXT = (
	"U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,"
	"U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,"
	"U+2113,U+2C60-2C7F,U+A720-A7FF"
)

# Arrows, math operators, box drawing, block elements, geometric shapes,
# dingbats. Matters for a code font: terminal output and README trees.
SYMBOLS = "U+2190-21FF,U+2200-22FF,U+2500-257F,U+2580-259F,U+25A0-25FF,U+2700-27BF"

# No greek-cyrillic bucket: this is not a Google-Fonts-style catch-all for the
# whole web, it is a fixed set of known sites (live, studio, differently,
# ticketing, vizchitra), and none of them render Cyrillic or Greek text.
# IBM Plex Sans and Fira Code both have substantial real coverage (measured:
# see docs/plan.md), so this was previously built and shipped as dead weight -
# a manifest entry and CSS block that could never be triggered by anything we
# actually serve. Group by what pages need, not by convention. If a real need
# shows up, add the range back with the same measured-coverage discipline.
SUBSETS = {
	"latin": LATIN,
	"latin-ext": LATIN_EXT,
	"symbols": SYMBOLS,
}

# CSS unicode-range needs spaces after commas and no U+ escaping issues.
def css_range(name: str) -> str:
	return ", ".join(SUBSETS[name].split(","))
