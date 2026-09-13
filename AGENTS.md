# ObsidianDiscord

Motyw Discorda w schemacie kolorów Obsidian, zbudowany jako nadbudowa na Material Discord (CapnKitten) — ten arkusz jest wciągany przez `@import` na początku pliku motywu.

## Bramki jakości

```sh
uv run ruff format --check tools
uv run ruff check tools
uv run mypy
```

Środowisko: `uv sync` (Python >=3.14, `.venv` + `uv.lock` w repo).

## Twarde reguły

- IMPORTANT: `ObsidianDiscord.theme.css` jest **jedynym źródłem prawdy** dla CSS. `ObsidianDiscordThemeOnline.css` zawiera wyłącznie jeden `@import` i nic więcej. NIE wklejaj do niego reguł motywu: dwie kopie tych samych ~700 linii już raz rozjechały się na miesiące i wysyłały różny wygląd do BetterDiscorda i do przeglądarki.
- `ObsidianDiscordThemeOnline.css` jest **stabilnym adresem publicznym** — tego URL-a nie wolno zmieniać. Siedzi w README, w konfiguracjach BetterDiscorda i w userscripcie. Dzięki tej warstwie plik motywu można swobodnie przemianować: zmienia się wtedy jedna linia aliasu, a nie instalacje użytkowników.
- Nazwa pliku motywu **musi kończyć się na `.theme.css`** — BetterDiscord ładuje z folderu motywów tylko takie pliki.
- Zmiana wyglądu motywu bumpuje `@version` w nagłówku `ObsidianDiscord.theme.css`. `@version` w `ObsidianDiscord.js` jest **niezależny** — to wersja userscriptu, nie motywu.
- `!important` i zahashowane selektory w CSS są tu złożonością konieczną: nadpisujemy cudzy arkusz o wyższej specyficzności. Nie „sprzątaj" ich.
- Kod, komentarze, nazwy plików i commity po angielsku (repo publiczne, README angielski). `AGENTS.md` i dokumenty robocze po polsku.
- `assets/img/`: kebab-case, format WebP.

## Klasy CSS Discorda

Discord używa CSS Modules — selektory typu `members_cbd271` mają hash, który zmienia się przy **każdym** update klienta i łamie motyw.

```sh
# Changes.txt: https://github.com/SyndiShanX/Update-Classes (Raw -> zapisz lokalnie)
python tools/update_classes.py Changes.txt ObsidianDiscord.theme.css
```

`Changes.txt` jest ignorowany przez gita celowo — pobieraj świeży, nie przypinaj kopii.

Przy dotykaniu selektorów preferuj rzeczy odporne na hash: `var(--background-primary)` i podobne tokeny Discorda, `[class*="members"]`, `[aria-label="..."]`. Każdy taki selektor to jedna rzecz mniej do naprawy po następnym update. Przegląd narzędzi i opcji automatyzacji: `knowledge/discord-class-research.md`.

## Mapa

| Ścieżka | Rola |
|---|---|
| `ObsidianDiscord.theme.css` | motyw, źródło prawdy, plik instalowany w BetterDiscord |
| `ObsidianDiscordThemeOnline.css` | publiczny alias `@import`, jedna linia, stabilny URL |
| `ObsidianDiscord.js` | userscript Tampermonkey, pobiera CSS przez alias |
| `tools/update_classes.py` | podmiana zahashowanych klas wg changelistu SyndiShanX |
| `knowledge/discord-class-research.md` | research narzędzi do klas Discorda |
| `assets/img/` | zrzuty ekranu do README |

## Pułapki

- Repo jest serwowane przez GitHub Pages, więc URL-e `mattymroz.github.io/ObsidianDiscord/...` w README i userscripcie są żywe — zmiana nazwy pliku w roocie psuje instalacje użytkowników.
- Userscript pobiera CSS **raz** i przy zmianach DOM tylko doczepia z powrotem swój element `<style>`. Nie przywracaj pobierania przy każdej zmianie URL.
- `.gitignore` ignoruje `.github/*` poza `workflows/`, a `.claude/skills/` i `.agents/skills/` to junctiony generowane przez repo `agents` — nigdy nie commituj ich zawartości.
