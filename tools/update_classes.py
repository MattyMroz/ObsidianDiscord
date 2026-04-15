"""Update Discord CSS class hashes using SyndiShanX Changes.txt.

What this does:
    Discord regularly changes CSS class name hashes (e.g. authBox_b83a05 -> authBox__921c5).
    SyndiShanX maintains a Changes.txt file with all old->new mappings.
    This script applies those mappings to our CSS theme file.

How to use:
    1. Download Changes.txt from:
       https://github.com/SyndiShanX/Update-Classes/blob/main/Changes.txt
       (click Raw -> Save As -> put in this repo root or wherever)

    2. Run:
       python tools/update_classes.py Changes.txt ObsidianDiscordAll.theme.css

    3. Check the diff, test in Discord, commit.

Source:
    - SyndiShanX/Update-Classes: https://github.com/SyndiShanX/Update-Classes
    - Web tool (does the same thing): https://syndishanx.github.io/Update-Classes/
"""

from __future__ import annotations

import sys
from pathlib import Path


def load_changes(changes_path: Path) -> list[tuple[str, str]]:
    """Load Changes.txt as pairs of (old_class, new_class)."""
    text = changes_path.read_text(encoding="utf-8")
    lines = [line for line in text.splitlines() if line.strip()]

    pairs: list[tuple[str, str]] = []
    for i in range(0, len(lines) - 1, 2):
        old = lines[i].strip()
        new = lines[i + 1].strip()
        if old and new and old != new:
            pairs.append((old, new))
    return pairs


def apply_changes(css: str, pairs: list[tuple[str, str]]) -> tuple[str, list[str]]:
    """Apply all class name replacements sequentially.

    Returns (updated_css, list_of_change_descriptions).
    """
    log: list[str] = []
    for old, new in pairs:
        if old in css:
            count = css.count(old)
            css = css.replace(old, new)
            log.append(f"  {old} -> {new} ({count}x)")
    return css, log


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: python tools/update_classes.py <Changes.txt> <theme.css>")
        print("Example: python tools/update_classes.py Changes.txt ObsidianDiscordAll.theme.css")
        sys.exit(1)

    changes_path = Path(sys.argv[1])
    css_path = Path(sys.argv[2])

    if not changes_path.exists():
        print(f"ERROR: {changes_path} not found")
        sys.exit(1)
    if not css_path.exists():
        print(f"ERROR: {css_path} not found")
        sys.exit(1)

    print(f"Loading {changes_path}...")
    pairs = load_changes(changes_path)
    print(f"Loaded {len(pairs)} change pairs.")

    print(f"\nProcessing: {css_path}")
    original = css_path.read_text(encoding="utf-8")
    updated, log = apply_changes(original, pairs)

    if log:
        print(f"Applied {len(log)} changes:")
        for entry in log:
            print(entry)
        css_path.write_text(updated, encoding="utf-8")
        print(f"\nSaved: {css_path}")
    else:
        print("No changes needed — CSS is already up to date.")


if __name__ == "__main__":
    main()
