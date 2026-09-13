# ObsidianDiscord

Motyw Discorda w schemacie kolorów Obsidian, zbudowany jako nadbudowa na Material Discord (CapnKitten) — ten arkusz jest wciągany przez `@import` na początku pliku motywu.

## Bramki jakości

```sh
prek run --all-files                      # cała bramka
prek run --hook-stage manual --all-files  # czy któryś hook nie jest martwy
uv run mypy                               # hook pre-push, nie łapie go run --all-files
```

Po klonie: `uv sync`, `git config --local core.autocrlf false`, `prek install`.
Bez `autocrlf false` hook `mixed-line-ending` wpada w pętlę z `.gitattributes`.

CI (`.github/workflows/ci.yml`) powtarza bramkę plus dwa strażniki aliasu — to jedyna
warstwa, której nie da się ominąć przez `--no-verify`.

## Twarde reguły

- IMPORTANT: `ObsidianDiscord.theme.css` jest **jedynym źródłem prawdy** dla CSS. `ObsidianDiscordThemeOnline.css` zawiera wyłącznie jeden `@import` i nic więcej. NIE wklejaj do niego reguł motywu: dwie kopie tych samych ~700 linii już raz rozjechały się na miesiące i wysyłały różny wygląd do BetterDiscorda i do przeglądarki.
- `ObsidianDiscordThemeOnline.css` jest **stabilnym adresem publicznym** — tego URL-a nie wolno zmieniać. Siedzi w README, w konfiguracjach BetterDiscorda i w userscripcie. Dzięki tej warstwie plik motywu można swobodnie przemianować: zmienia się wtedy jedna linia aliasu, a nie instalacje użytkowników.
- Nazwa pliku motywu **musi kończyć się na `.theme.css`** — BetterDiscord ładuje z folderu motywów tylko takie pliki.
- Zmiana wyglądu motywu bumpuje `@version` w nagłówku `ObsidianDiscord.theme.css`. `@version` w `ObsidianDiscord.js` jest **niezależny** — to wersja userscriptu, nie motywu.
- `!important` i zahashowane selektory w CSS są tu złożonością konieczną: nadpisujemy cudzy arkusz o wyższej specyficzności. Nie „sprzątaj" ich.
- Kod, komentarze, nazwy plików i commity po angielsku (repo publiczne, README angielski). `AGENTS.md` i dokumenty robocze po polsku. Pliki źródłowe (`.css`, `.js`, `.py`) muszą być **czysto ASCII** — pilnuje tego hook `ascii-only`.
- `assets/img/`: kebab-case, format WebP.
- Commity: Conventional Commits ze **obowiązkowym scope**, wymuszane przez hook `commit-msg` i workflow `pr-title.yml`. Dozwolone scope: `theme`, `userscript`, `scripts`, `assets`, `docs`, `git`, `hooks`, `ci`. Lista żyje w dwóch miejscach (`.pre-commit-config.yaml` i `pr-title.yml`) — `pre-commit` nie umie dzielić konfiguracji między plikami, więc przy zmianie popraw oba.

## Klasy CSS Discorda

Discord używa CSS Modules — selektory typu `members_cbd271` mają hash, który zmienia się przy **każdym** update klienta i łamie motyw.

Robi to za nas `.github/workflows/update-classes.yml`: codziennie pobiera changelist SyndiShanX i przy zmianach **commituje naprawę wprost na `main`**. Bez PR-a celowo — motyw z martwymi selektorami jest zepsuty do chwili naprawy, więc czekanie na review przywraca dokładnie ten problem, który ten automat usuwa.

Rolę recenzenta pełni strażnik w tym samym workflow: odrzuca przebieg, jeśli podmiana ruszyła nagłówek, którykolwiek `@import` albo liczbę bloków reguł. Zmiana nazw klas nie może zrobić żadnej z tych rzeczy. `@version` nie jest bumpowany — naprawa hashy przywraca zamierzony wygląd, nie tworzy nowego.

Ręcznie, gdy potrzebny jest przebieg poza harmonogramem:

```sh
# Changes.txt: https://github.com/SyndiShanX/Update-Classes (Raw -> zapisz lokalnie)
python scripts/update_classes.py Changes.txt ObsidianDiscord.theme.css
```

`Changes.txt` jest ignorowany przez gita celowo — pobieraj świeży, nie przypinaj kopii.

Przy dotykaniu selektorów preferuj rzeczy odporne na hash: `var(--background-primary)` i podobne tokeny Discorda, `[class*="members"]`, `[aria-label="..."]`. Każdy taki selektor to jedna rzecz mniej do naprawy po następnym update. Przegląd narzędzi i opcji automatyzacji: `docs/discord-class-research.md`.

## Mapa

| Ścieżka                                | Rola                                                   |
| -------------------------------------- | ------------------------------------------------------ |
| `ObsidianDiscord.theme.css`            | motyw, źródło prawdy, plik instalowany w BetterDiscord |
| `ObsidianDiscordThemeOnline.css`       | publiczny alias `@import`, jedna linia, stabilny URL   |
| `ObsidianDiscord.js`                   | userscript Tampermonkey, pobiera CSS przez alias       |
| `scripts/update_classes.py`            | podmiana zahashowanych klas wg changelistu SyndiShanX  |
| `docs/discord-class-research.md`       | research narzędzi do klas Discorda                     |
| `assets/img/`                          | zrzuty ekranu do README                                |
| `.pre-commit-config.yaml`              | bramka `prek`, oparta na `agents/presets/hooks`        |
| `biome.json`                           | formatter i linter CSS/JS, trzy reguły świadomie off   |
| `.github/workflows/ci.yml`             | bramka serwerowa + strażnicy aliasu i sufiksu motywu   |
| `.github/workflows/update-classes.yml` | codzienna auto-naprawa klas, commit na `main`          |

## Pułapki

- Repo jest serwowane przez GitHub Pages, więc URL-e `mattymroz.github.io/ObsidianDiscord/...` w README i userscripcie są żywe — zmiana nazwy pliku w roocie psuje instalacje użytkowników.
- Userscript pobiera CSS **raz** i przy zmianach DOM tylko doczepia z powrotem swój element `<style>`. Nie przywracaj pobierania przy każdej zmianie URL.
- `.claude/skills/` i `.agents/skills/` to junctiony generowane przez repo `agents` — nigdy nie commituj ich zawartości.
- Tworzenie PR-a przez Actions wymaga **dwóch** rzeczy: `permissions: pull-requests: write` w workflow **oraz** przełącznika repo `can_approve_pull_request_reviews`. Samo `permissions` daje `GitHub Actions is not permitted to create or approve pull requests`. Stan sprawdzisz przez `gh api repos/MattyMroz/ObsidianDiscord/actions/permissions/workflow`.
