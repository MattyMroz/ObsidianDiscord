"""Build one self-contained stylesheet for the browser userscript.

Why this exists:
    Discord serves style-src 'self' 'unsafe-inline' and img-src 'self' blob: data:.
    Pasted CSS text is therefore allowed, but anything the page has to fetch from
    capnkitten.github.io is not. Loading the theme in a browser leaves Material
    Discord blocked - all four of its stylesheets - and 385 icon images blocked
    with it, which is most of the styling gone.

    Tampermonkey's GM_xmlhttpRequest is not bound by the page policy, so whatever
    the userscript fetches and pastes in does apply. This script assembles that
    payload ahead of time: Material and its sub-imports inlined, every icon SVG
    turned into a data: URI, and the theme appended last so it still overrides.

    Fonts are swapped rather than inlined. Material serves Google Sans from
    capnkitten.github.io, which font-src rejects, and font-src allows no data:
    either - but it does allow fonts.gstatic.com, and both families are published
    on Google Fonts. So the blocked @font-face rules are dropped and Google's own
    are pasted in their place. This matters more than it sounds: Material's
    spacing is measured against those fonts, and falling back to Discord's makes
    elements run wide and overlap.

How to use:
    python scripts/build_browser_css.py

    Writes dist/ObsidianDiscord.theme.css - the same name as the source, because
    it is the same stylesheet with its dependencies folded in. Nothing here is
    committed: the Pages workflow builds it and publishes it at the one public
    URL, over the source copy. Put fixes in ObsidianDiscord.theme.css, the one
    stylesheet this project keeps by hand.

    The build refuses to write a bundle that would fail in a browser or in
    BetterDiscord, so both the pull-request check and the deploy inherit that
    guard from one place.
"""

from __future__ import annotations

import base64
import re
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from update_classes import apply_changes, load_changes

MATERIAL_URL = (
    "https://capnkitten.github.io/BetterDiscord/Themes/Material-Discord/css/source.css"
)
THEME_PATH = Path("ObsidianDiscord.theme.css")

# Same name as the source, one directory down, because this is the same
# stylesheet with everything it depends on folded in. The Pages workflow copies
# it over the source copy in the published site, so there is one public URL and
# one file name for users to know. dist/ is git-ignored; the source file is the
# only stylesheet this repository keeps.
OUTPUT_PATH = Path("dist") / THEME_PATH.name

# BetterDiscord reads @name and @version from a comment at the top of the file,
# so the theme's header is hoisted above Material instead of staying buried
# 22 000 lines down. That is what lets the published file be dropped straight
# into the themes folder as well as fetched by the userscript.
HEADER_RE = re.compile(r"\A\s*/\*\*.*?\*/", re.DOTALL)

# Material's icon layer is left out on purpose.
#
# icons.css adds 473 replacement icons as ::before masks, but hides Discord's own
# icon underneath in only 346 selectors, and it does that by matching the exact
# contents of the SVG path: :has(path[d^="m13.96 5.46 4.58 4.58a1"]) svg.
# Discord changed that path data, so the hiding no longer matches while the masks
# still apply, and every affected icon renders twice - Discord's outline plus
# Material's filled one, offset.
#
# Nothing in this repository can fix that. scripts/update_classes.py rewrites
# hashed class names, and the SyndiShanX changelist it reads does not track SVG
# path data. Dropping the layer keeps Discord's own icons, which is the intent
# anyway, and takes most of the bundle's weight with it. The 7 rules that hide
# originals live inside icons.css too, so removing it leaves no blank slots.
EXCLUDED_IMPORTS = ("icons.css",)

# Material's own @font-face rules point at capnkitten.github.io and are refused by
# font-src. These are the same two families on Google Fonts, which serves them
# from the fonts.gstatic.com that font-src does allow. The stylesheet itself has
# to be fetched at build time and pasted, because style-src does not list
# fonts.googleapis.com either.
# update_classes.py repairs hashed class names in our own theme, which leaves
# Material's carrying whatever it shipped with - 94 stale names at last count. The
# same changelist fixes those too, and the bundle is the only place we are free to
# rewrite someone else's stylesheet.
CHANGELIST_URL = (
    "https://raw.githubusercontent.com/SyndiShanX/Update-Classes/main/Changes.txt"
)

GOOGLE_FONTS_CSS = "https://fonts.googleapis.com/css2?family="
GOOGLE_FONT_URLS = (
    f"{GOOGLE_FONTS_CSS}Google+Sans+Code:ital,wght@0,300..800;1,300..800&display=swap",
    f"{GOOGLE_FONTS_CSS}Google+Sans+Flex:opsz,wght@6..144,1..1000&display=swap",
)

# Google Fonts serves woff2 only to browsers it recognises, and older formats to
# everything else.
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
)

IMPORT_RE = re.compile(r"""@import\s+url\(\s*(['"]?)([^'")]+)\1\s*\)\s*;""")
FONT_FACE_RE = re.compile(r"@font-face\s*\{[^}]*\}")
SVG_URL_RE = re.compile(r"""url\(\s*(['"]?)(https://[^'")]+\.svg)\1\s*\)""")


def fetch(url: str) -> bytes:
    """Download a URL and return its raw bytes, retrying when Pages throttles us."""
    # GitHub Pages answers 503 when a run of requests arrives with no gap, which a
    # few hundred icon files reliably triggers. Space them out and back off.
    request = urllib.request.Request(url, headers={"User-Agent": BROWSER_UA})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                data: bytes = response.read()
        except urllib.error.HTTPError as error:
            if error.code not in {429, 503} or attempt == 4:
                raise
            time.sleep(2**attempt)
        else:
            time.sleep(0.2)
            return data
    msg = f"unreachable retry loop for {url}"
    raise RuntimeError(msg)


def fetch_text(url: str) -> str:
    """Download a URL and decode it as UTF-8."""
    return fetch(url).decode("utf-8", errors="replace")


def inline_imports(css: str, base_url: str, depth: int = 0) -> str:
    """Replace every @import statement with the stylesheet it points at."""
    if depth >= 4:
        return css

    for match in list(IMPORT_RE.finditer(css)):
        target = urllib.parse.urljoin(base_url, match.group(2))
        if target.endswith(EXCLUDED_IMPORTS):
            print(f"  skipping {target}")
            css = css.replace(match.group(0), f"/* skipped {target} */", 1)
            continue
        imported = inline_imports(fetch_text(target), target, depth + 1)
        header = f"/* inlined from {target} */\n"
        css = css.replace(match.group(0), header + imported, 1)
    return css


def refresh_classes(css: str) -> tuple[str, int, int]:
    """Rewrite Material's stale hashed class names using the SyndiShanX changelist."""
    with tempfile.TemporaryDirectory() as directory:
        changelist = Path(directory) / "Changes.txt"
        changelist.write_bytes(fetch(CHANGELIST_URL))
        pairs = load_changes(changelist)

    css, log = apply_changes(css, pairs)
    return css, len(pairs), len(log)


def swap_fonts(css: str) -> tuple[str, int, int]:
    """Drop the @font-face rules font-src blocks and paste Google's in instead."""
    blocked = [face for face in FONT_FACE_RE.findall(css) if "capnkitten" in face]
    for face in blocked:
        css = css.replace(face, "", 1)

    served = "".join(f"/* {url} */\n{fetch_text(url)}\n" for url in GOOGLE_FONT_URLS)
    replacement = len(FONT_FACE_RE.findall(served))
    return served + "\n" + css, len(blocked), replacement


def inline_svgs(css: str) -> tuple[str, int]:
    """Replace remote SVG URLs with data: URIs and report how many were inlined."""
    urls = {match.group(2) for match in SVG_URL_RE.finditer(css)}
    for url in sorted(urls):
        encoded = base64.b64encode(fetch(url)).decode("ascii")
        css = css.replace(url, f"data:image/svg+xml;base64,{encoded}")
    return css, len(urls)


MIN_BYTES = 400_000
THEME_MARKER = "/* ObsidianDiscord.theme.css */"


def verify(bundle: str, theme: str) -> None:
    """Refuse a bundle a browser would reject, or one built from a stale theme.

    These ran as shell in two workflows and had to agree with each other. Here
    they run on every build instead, so a broken bundle never reaches the deploy
    step and never reaches a reviewer either.
    """
    failures = []

    # The published file is installed by hand as well as fetched, and
    # BetterDiscord ignores a theme whose metadata is not at the top.
    if "@name" not in bundle[:600]:
        failures.append("no @name in the first 600 chars; BetterDiscord needs it there")

    size = len(bundle.encode("utf-8"))
    if size < MIN_BYTES:
        failures.append(f"{size} bytes, expected at least {MIN_BYTES}")

    # The whole reason this file exists: nothing in it may need fetching.
    if "@import" in bundle:
        failures.append("an @import survived; the page would block it")
    if re.search(r"url\(\s*.?https://capnkitten", bundle):
        failures.append("a capnkitten URL survived; img-src blocks it")

    # And it has to be this theme, not a stale copy of it.
    markers = bundle.count(THEME_MARKER)
    if markers != 1:
        failures.append(f"found {markers} theme markers, expected exactly 1")

    version = next(
        (line.strip() for line in theme.splitlines() if "@version" in line),
        "",
    )
    if not version:
        failures.append(f"{THEME_PATH} carries no @version line")
    elif version not in bundle:
        failures.append(f"does not carry {version!r} from the theme")

    if failures:
        for failure in failures:
            print(f"ERROR: {failure}")
        sys.exit(1)

    print(f"  guard passed: {size} bytes, no fetches, carries {version}")


def main() -> None:
    """Assemble Material plus the theme into one stylesheet the page may inline."""
    if not THEME_PATH.exists():
        print(f"ERROR: {THEME_PATH} not found; run from the repository root")
        sys.exit(1)

    print(f"Fetching {MATERIAL_URL}")
    material = inline_imports(fetch_text(MATERIAL_URL), MATERIAL_URL)
    print(f"  Material with sub-imports: {len(material)} chars")

    material, count = inline_svgs(material)
    print(f"  inlined {count} icon files as data: URIs -> {len(material)} chars")

    material, pairs, renamed = refresh_classes(material)
    print(f"  changelist has {pairs} pairs, {renamed} of Material's names were stale")

    material, dropped, added = swap_fonts(material)
    print(f"  dropped {dropped} blocked @font-face, pasted {added} from Google")

    # The theme imports Material itself. That import is now redundant, and left in
    # place the page would try to fetch it and get blocked.
    source = THEME_PATH.read_text(encoding="utf-8")
    theme = IMPORT_RE.sub("", source)

    # The header moves to the top of the output and out of the appended copy, so
    # the file carries exactly one @name and one @version, both where a theme
    # loader looks for them.
    header_match = HEADER_RE.match(theme)
    if header_match is None:
        print(f"ERROR: {THEME_PATH} does not start with a /** ... */ header")
        sys.exit(1)
    header = header_match.group(0).strip()
    theme = theme[header_match.end() :].lstrip()

    bundle = (
        header + "\n\n"
        "/*\n"
        " * GENERATED by scripts/build_browser_css.py - do not edit, do not commit.\n"
        " *\n"
        " * This is ObsidianDiscord.theme.css with everything it depends on folded\n"
        " * in: Material Discord and its sub-imports inlined, icons turned into\n"
        " * data: URIs and fonts repointed at hosts Discord's CSP permits. Same\n"
        " * stylesheet, no fetches. Put fixes in the source file; this one is\n"
        " * rebuilt from scratch on every deploy.\n"
        " */\n\n" + material + f"\n\n{THEME_MARKER}\n\n" + theme
    )
    verify(bundle, source)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        bundle,
        encoding="utf-8",
        # Without this the file picks up CRLF on Windows and LF on the runner, so
        # the mixed-line-ending hook and every rebuild would fight each other.
        newline="\n",
    )
    size = OUTPUT_PATH.stat().st_size
    print(f"\nWrote {OUTPUT_PATH}: {round(size / 1024)} KB")


if __name__ == "__main__":
    main()
