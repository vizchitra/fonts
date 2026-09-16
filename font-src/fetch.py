"""Download every upstream font pinned in fonts.lock.json and verify its hash.

    uv run font-src/fetch.py [--update-hashes]

Downloads land in font-src/upstream/, which is gitignored: these are the
untouched originals that font-src/subset.py builds from and that Phase 3
publishes as downloads.
"""

import argparse
import hashlib
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCK = ROOT / "fonts.lock.json"
DEST = ROOT / "font-src" / "upstream"


def sha256(path: Path) -> str:
	h = hashlib.sha256()
	with path.open("rb") as fh:
		for chunk in iter(lambda: fh.read(1 << 20), b""):
			h.update(chunk)
	return h.hexdigest()


def download(url: str, dest: Path) -> None:
	dest.parent.mkdir(parents=True, exist_ok=True)
	req = urllib.request.Request(url, headers={"User-Agent": "vizchitra-fonts"})
	with urllib.request.urlopen(req) as resp, dest.open("wb") as out:
		out.write(resp.read())


def main() -> int:
	ap = argparse.ArgumentParser()
	ap.add_argument(
		"--update-hashes",
		action="store_true",
		help="rewrite fonts.lock.json with the hashes just downloaded",
	)
	args = ap.parse_args()

	lock = json.loads(LOCK.read_text())
	failures: list[str] = []
	changed = False

	for key, font in lock["fonts"].items():
		print(f"\n{font['family']} {font['version']}  ({font['source']})")
		for entry in font["files"]:
			dest = DEST / key / entry["dest"]
			if not dest.exists():
				print(f"  fetching {entry['dest']}")
				download(entry["url"], dest)
			digest = sha256(dest)
			expected = entry.get("sha256")

			if expected is None:
				entry["sha256"] = digest
				changed = True
				print(f"  recorded {entry['dest']}  {digest[:16]}…")
			elif digest == expected:
				print(f"  ok       {entry['dest']}  {digest[:16]}…")
			elif args.update_hashes:
				entry["sha256"] = digest
				changed = True
				print(f"  UPDATED  {entry['dest']}  {digest[:16]}…")
			else:
				failures.append(f"{entry['dest']}: expected {expected}, got {digest}")
				print(f"  MISMATCH {entry['dest']}")

			for member, out_name in (entry.get("extract") or {}).items():
				with zipfile.ZipFile(dest) as zf:
					(DEST / key / out_name).write_bytes(zf.read(member))
				print(f"  extract  {out_name}")

	if changed:
		LOCK.write_text(json.dumps(lock, indent="\t") + "\n")
		print("\nfonts.lock.json updated")

	if failures:
		print("\nHASH VERIFICATION FAILED:", file=sys.stderr)
		for f in failures:
			print(f"  {f}", file=sys.stderr)
		return 1

	print(f"\nAll files verified into {DEST.relative_to(ROOT)}/")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
