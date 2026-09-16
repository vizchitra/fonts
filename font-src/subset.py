"""Build the unicode-range-split woff2 subsets the site serves.

    uv run font-src/subset.py

Reads the untouched originals from font-src/upstream/ and writes
static/fonts/v1/. Subsetting is a delivery artifact, not a modification of the
fonts we redistribute - the originals are published alongside, untouched.

`--layout-features='*'` is not optional: fontTools' default feature list drops
every cvXX/ssXX stylistic set (Fira Code has 42 of them). Ligatures survive
regardless, because subset closure follows GSUB substitutions to unencoded
glyphs.
"""

import argparse
import json
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

from ranges import SUBSETS

ROOT = Path(__file__).resolve().parent.parent
UPSTREAM = ROOT / "font-src" / "upstream"
OUT = ROOT / "static" / "fonts" / "v1"

# family key -> (source file, output basename, style)
SOURCES = {
	"cairo": [("Cairo[slnt,wght].ttf", "Cairo-Variable", "normal")],
	"ibm-plex-sans": [
		("IBMPlexSans[wdth,wght].ttf", "IBMPlexSans-Variable", "normal"),
		("IBMPlexSans-Italic[wdth,wght].ttf", "IBMPlexSans-Variable-Italic", "italic"),
	],
	"fira-code": [("FiraCode-VF.woff2", "FiraCode-Variable", "normal")],
}


def build(src: Path, out: Path, unicodes: str, keep_names: bool) -> tuple[int, int, int]:
	args = [
		str(src),
		f"--unicodes={unicodes}",
		"--layout-features=*",
		"--flavor=woff2",
		f"--output-file={out}",
	]
	# Glyph names cost ~6% and are only useful for inspecting a build.
	if keep_names:
		args.append("--glyph-names")
	subset.main(args)
	font = TTFont(out)
	return out.stat().st_size, len(font.getGlyphOrder()), len(font.getBestCmap())


def main() -> int:
	ap = argparse.ArgumentParser()
	ap.add_argument(
		"--debug-names",
		action="store_true",
		help="keep glyph names so the output can be inspected (~6%% larger)",
	)
	args = ap.parse_args()

	OUT.mkdir(parents=True, exist_ok=True)
	# Wipe previous output first: the manifest is fully rewritten every run, but
	# individual .woff2 files were not, so a subset removed from ranges.SUBSETS
	# (e.g. greek-cyrillic) would otherwise linger on disk and keep being
	# served forever after the code stopped generating or referencing it.
	for stale in OUT.glob("*.woff2"):
		stale.unlink()
	manifest: dict[str, list[dict]] = {}

	for key, entries in SOURCES.items():
		for filename, basename, style in entries:
			src = UPSTREAM / key / filename
			if not src.exists():
				print(f"missing {src} - run font-src/fetch.py first")
				return 1

			print(f"\n{basename}  ({style})")
			built = []
			for name, unicodes in SUBSETS.items():
				out = OUT / f"{basename}-{name}.woff2"
				size, glyphs, covered = build(src, out, unicodes, args.debug_names)
				# A font with almost no coverage in this range would cost a request
				# for nothing; leave the block out of the CSS entirely.
				if covered < 8:
					out.unlink()
					print(f"  {name:16} — {covered} codepoints, skipped")
					continue
				print(f"  {name:16} {size / 1024:6.1f}KB  glyphs={glyphs}  cmap={covered}")
				built.append(
					{
						"subset": name,
						"file": out.name,
						"bytes": size,
						"glyphs": glyphs,
						"codepoints": covered,
					}
				)
			manifest.setdefault(key, []).append(
				{"basename": basename, "style": style, "subsets": built}
			)

	(OUT / "manifest.json").write_text(json.dumps(manifest, indent="\t") + "\n")
	total = sum(s["bytes"] for f in manifest.values() for e in f for s in e["subsets"])
	print(f"\nwrote {OUT.relative_to(ROOT)}/  ({total / 1024:.0f}KB across all subsets)")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
