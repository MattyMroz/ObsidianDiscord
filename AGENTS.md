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

CI (`.github/workflows/ci.yml`) powtarza bramkę plus strażnika jednego arkusza — to jedyna
warstwa, której nie da się ominąć przez `--no-verify`.

## Twarde reguły

- IMPORTANT: repo trzyma **dokładnie jeden plik CSS**: `ObsidianDiscord.theme.css`. Pilnuje tego strażnik w `ci.yml` (`git ls-files '*.css'` musi zwrócić jedną ścieżkę i musi to być ta nazwa). Nie dodawaj drugiego arkusza — projekt miał kiedyś trzy i nikt nie wiedział, który obowiązuje.
- Nazwa pliku motywu **musi kończyć się na `.theme.css`** — BetterDiscord ładuje z folderu motywów tylko takie pliki. Dlatego jedyny plik CSS jest jednocześnie plikiem instalacyjnym i celem `@import` z README.
- `ObsidianDiscordBrowser.css` jest **wyjściem builda i nie jest w repo** — `.gitignore` go blokuje, `scripts/build_browser_css.py` go składa, a `pages.yml` buduje i publikuje na Pages. Lokalnie służy tylko do testów. Nigdy go nie commituj i nie edytuj: każdy build nadpisuje go od zera, poprawki idą do pliku motywu.
- Strażniki bundle (rozmiar, zero `@import`, zero pobrań z capnkitten, dokładnie jedna kopia motywu, zgodny `@version`) siedzą w `verify()` w `build_browser_css.py`, nie w YAML-u. Build sam odmawia zapisu złego pliku, więc PR i deploy dziedziczą tę samą kontrolę. Dodając regułę, dodaj ją tam.
- Zmiana wyglądu motywu bumpuje `@version` w nagłówku `ObsidianDiscord.theme.css`. `@version` w `ObsidianDiscord.js` jest **niezależny** — to wersja userscriptu, nie motywu.
- `!important` i zahashowane selektory w CSS są tu złożonością konieczną: nadpisujemy cudzy arkusz o wyższej specyficzności. Nie „sprzątaj" ich.
- Kod, komentarze, nazwy plików i commity po angielsku (repo publiczne, README angielski). `AGENTS.md` i dokumenty robocze po polsku. Pliki źródłowe (`.css`, `.js`, `.py`) muszą być **czysto ASCII** — pilnuje tego hook `ascii-only`.
- `assets/img/`: kebab-case, format WebP.
- Commity: Conventional Commits ze **obowiązkowym scope**, wymuszane przez hook `commit-msg` i workflow `pr-title.yml`. Dozwolone scope: `theme`, `userscript`, `scripts`, `assets`, `docs`, `git`, `hooks`, `ci`. Lista żyje w dwóch miejscach (`.pre-commit-config.yaml` i `pr-title.yml`) — `pre-commit` nie umie dzielić konfiguracji między plikami, więc przy zmianie popraw oba.

## Klasy CSS Discorda

Discord używa CSS Modules — selektory typu `members_cbd271` mają hash, który zmienia się przy **każdym** update klienta i łamie motyw.

Robi to za nas `.github/workflows/update-classes.yml`: codziennie pobiera changelist SyndiShanX i przy zmianach **commituje naprawę wprost na `main`**. Bez PR-a celowo — motyw z martwymi selektorami jest zepsuty do chwili naprawy, więc czekanie na review przywraca dokładnie ten problem, który ten automat usuwa.

Rolę recenzenta pełni strażnik w tym samym workflow: odrzuca przebieg, jeśli podmiana ruszyła nagłówek, którykolwiek `@import` albo liczbę bloków reguł. Zmiana nazw klas nie może zrobić żadnej z tych rzeczy. `@version` nie jest bumpowany — naprawa hashy przywraca zamierzony wygląd, nie tworzy nowego.

Po commicie ten workflow **wywołuje `pages.yml`** (`uses:` z `ref: main`), żeby publikowany bundle powstał z naprawionego motywu. Nie da się tego zostawić triggerowi `push`: push wykonany tokenem `GITHUB_TOKEN` nie uruchamia kolejnych workflowów, więc bez tego wywołania przeglądarka zostawałaby na martwych hashach do następnego ludzkiego pusha.

Ręcznie, gdy potrzebny jest przebieg poza harmonogramem:

```sh
# Changes.txt: https://github.com/SyndiShanX/Update-Classes (Raw -> zapisz lokalnie)
python scripts/update_classes.py Changes.txt ObsidianDiscord.theme.css
```

`Changes.txt` jest ignorowany przez gita celowo — pobieraj świeży, nie przypinaj kopii.

Przy dotykaniu selektorów preferuj rzeczy odporne na hash: `var(--background-primary)` i podobne tokeny Discorda, `[class*="members"]`, `[aria-label="..."]`. Każdy taki selektor to jedna rzecz mniej do naprawy po następnym update. Przegląd narzędzi i opcji automatyzacji: `docs/discord-class-research.md`.

## Przeglądarka i CSP

Discord wysyła `style-src 'self' 'unsafe-inline' ...` i `font-src 'self' https://fonts.gstatic.com ...`. Wklejony tekst CSS przechodzi, **pobranie czegokolwiek z `capnkitten.github.io` nie** — więc w przeglądarce sam motyw znaczy motyw bez Materiala. `GM_xmlhttpRequest` polityki strony nie podlega, dlatego userscript pobiera gotowy bundle i wkleja go jako tekst.

Co robi build i dlaczego:

- wciąga Materiala z podimportami, zamienia SVG na `data:` URI (`img-src` dopuszcza `data:`);
- **pomija `icons.css`** — ukrywa oryginalne ikony Discorda przez dopasowanie dokładnych danych `path`, Discord te dane zmienił, więc maski lądowały na niezakrytych ikonach i każda rysowała się dwa razy. `update_classes.py` tego nie naprawi: changelist nie zapisuje `path`;
- **podmienia `@font-face`** z capnkitten na te z `fonts.gstatic.com` (Google Sans Code i Google Sans Flex są na Google Fonts). `font-src` nie dopuszcza ani `data:`, ani capnkitten. To nie kosmetyka — Material wymierza layout pod te kroje, bez nich elementy robią się szersze i tekst nachodzi na tekst;
- stosuje changelist SyndiShanX także do Materiala — `update_classes.py` naprawia tylko nasz motyw, a bundle to jedyne miejsce, gdzie wolno nam przepisać cudzy arkusz.

## Mapa

| Ścieżka                                | Rola                                                             |
| -------------------------------------- | ---------------------------------------------------------------- |
| `ObsidianDiscord.theme.css`            | **jedyny plik CSS**: źródło prawdy, instalka BetterDiscorda      |
| `ObsidianDiscord.js`                   | userscript Tampermonkey, pobiera opublikowany bundle             |
| `scripts/build_browser_css.py`         | składa bundle obok CSP i sam go weryfikuje (`verify()`)          |
| `scripts/update_classes.py`            | podmiana zahashowanych klas wg changelistu SyndiShanX            |
| `docs/discord-class-research.md`       | research narzędzi do klas Discorda                               |
| `docs/settings-screen.md`              | zapis pracy nad ekranem ustawień i metoda pomiaru w przeglądarce |
| `assets/img/`                          | zrzuty ekranu do README                                          |
| `.pre-commit-config.yaml`              | bramka `prek`, oparta na `agents/presets/hooks`                  |
| `biome.json`                           | formatter i linter CSS/JS, trzy reguły świadomie off             |
| `.github/workflows/ci.yml`             | bramka serwerowa, strażnik jednego arkusza, build bundle na PR   |
| `.github/workflows/pages.yml`          | build bundle + deploy Pages; publikuje motyw i bundle            |
| `.github/workflows/update-classes.yml` | codzienna auto-naprawa klas, commit na `main`, potem deploy      |

## Pułapki

- Pages **nie serwuje już brancha** — stroną jest artefakt z `pages.yml` (Jekyll na checkoucie + dorzucony bundle), a `build_type` repo stoi na `workflow`. URL-e `mattymroz.github.io/ObsidianDiscord/...` są żywe, więc zmiana nazwy pliku w roocie nadal psuje instalacje użytkowników. Jeśli bundle zniknie z Pages, sprawdź najpierw ostatni przebieg `pages.yml`, nie repo.
- Userscript pobiera CSS **raz** i przy zmianach DOM tylko doczepia z powrotem swój element `<style>`. Nie przywracaj pobierania przy każdej zmianie URL.
- `.claude/skills/` i `.agents/skills/` to junctiony generowane przez repo `agents` — nigdy nie commituj ich zawartości.
- Tworzenie PR-a przez Actions wymaga **dwóch** rzeczy: `permissions: pull-requests: write` w workflow **oraz** przełącznika repo `can_approve_pull_request_reviews`. Samo `permissions` daje `GitHub Actions is not permitted to create or approve pull requests`. Stan sprawdzisz przez `gh api repos/MattyMroz/ObsidianDiscord/actions/permissions/workflow`.
