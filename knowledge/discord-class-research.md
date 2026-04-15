# Research: Jak społeczność BetterDiscord radzi sobie z hashowanymi klasami CSS

> Data: 2025-07-26
> Kontekst: ObsidianDiscord theme — research narzędzi i podejść do problemu zmieniających się klas CSS Discorda

---

## 1. Problem

Discord używa CSS Modules — klasy w formacie `componentName_hash6chars` (np. `members_cbd271`, `button_f7e168`). Hashe zmieniają się przy **każdym** update klienta Discord, łamiąc custom CSS themes.

---

## 2. Znalezione narzędzia

### 2.1 `fedeericodl/discord-update-classnames` — GŁÓWNE NARZĘDZIE

| | |
|---|---|
| **URL** | <https://github.com/fedeericodl/discord-update-classnames> |
| **Gwiazdki** | 16 |
| **Język** | TypeScript |
| **Status** | Aktywny (update 4 dni temu), **NOT RELEASED** — używać `@main` |
| **Typ** | **GitHub Action** |

**Jak działa:**

1. Scrapuje Discord Canary client → wyciąga aktualne nazwy klas
2. Porównuje z plikami twoich tematów CSS/SCSS
3. Zamienia stare klasy na nowe
4. **Automatycznie tworzy Pull Request** z proponowanymi zmianami

**Kluczowe features:**

- Automatic Class Name Scraping — codziennie zbiera aktualne klasy
- Smart Class Replacement — zamienia w plikach zachowując custom styling
- Deprecation Warnings — raportuje klasy nieobecne w kliencie
- Automated PRs — tworzenie PR do ręcznego review

**Data branch** (`data` branch w repo):

- `classNamesMap.json` — mapowanie stare→nowe klasy (aktualizowane automatycznie)
- `moduleClassNames.json` — aktualne klasy zorganizowane po module ID
- `buildInfo.json` — hash i timestamp ostatniego canary build

**Przykładowy workflow:**

```yaml
name: Update Discord Class Names
on:
    schedule:
        - cron: "0 0 * * *" # Codziennie
    workflow_dispatch:

jobs:
    update:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v6
            - name: Run Class Name Updater
              uses: fedeericodl/discord-update-classnames@main
              with:
                  files: "ObsidianDiscordAll.theme.css"
                  ignore-class-names: "bd-,vencord-" # Ignoruj klasy BD/Vencord
```

**Inputs:**

| Input | Opis | Required |
|---|---|---|
| `files` | Pliki/foldery do przetwarzania (glob patterns) | Tak |
| `ignore-class-names` | Klasy do ignorowania (BD/Vencord itp.) | Nie |
| `report-outdated` | Fail jeśli znaleziono przestarzałe klasy | Nie |
| `target-branch` | Branch docelowy (domyślnie `classname-updates`) | Nie |
| `pr-title` | Tytuł PR (domyślnie "Class Name Updates") | Nie |

**Outputs:** `version-hash`, `built-at`, `total-class-names`, `changed-class-names`, `failed-changed-class-names`

**Znane ograniczenie:** Jeśli klasa została przeniesiona do innego webpack module, NIE zostanie zaktualizowana (bo module ID się zmienił).

---

### 2.2 `SyndiShanX/Update-Classes` — Centralny changelist społeczności

| | |
|---|---|
| **URL** | <https://github.com/SyndiShanX/Update-Classes> |
| **Gwiazdki** | 36 |
| **Status** | **Aktywnie utrzymywany** — update 5 dni temu |

**Co to jest:** Centralny plik `Changes.txt` z mapowaniem starych→nowych klas. Format: stara klasa w jednej linii, nowa klasa w następnej (bez pustych linii). Używany przez wiele narzędzi jako źródło prawdy.

**Dodatkowe zasoby:**

- **Web tool**: <https://syndishanx.github.io/Website/Update_Classes.html> — wklej swój CSS, dostaniesz zaktualizowany
- `Regex_Changes.txt` — zmiany w formie regex
- Python script + `.exe` do lokalnego użytku

---

### 2.3 `Metro420yt/class-update` — Prostszy GitHub Action

| | |
|---|---|
| **URL** | <https://github.com/Metro420yt/class-update> |
| **Gwiazdki** | 2 |
| **Status** | Na GitHub Marketplace jako "Discord Class Updater" |

Prostszy alternatywny Action — korzysta z `SyndiShanX/Update-Classes/Changes.txt` jako źródła zmian. Inputs: `folder`, `ext` (rozszerzenie pliku), `diff` (URL do changelist).

---

### 2.4 `Saltssaumure/ClassUpdate` — Lokalne narzędzie Python

| | |
|---|---|
| **URL** | <https://github.com/Saltssaumure/ClassUpdate> |
| **Gwiazdki** | 33 |
| **Status** | Archiwalne (Oct 2023 – Jun 2024) |

Lokalny Python script aktualizujący klasy folderowo. Korzysta z changelist SyndiShanX. Inspiracja dla `Metro420yt/class-update`.

---

### 2.5 Powiązane zasoby

| Zasób | URL | Opis |
|---|---|---|
| `itmesarah/classchanges` | <https://github.com/itmesarah/classchanges> | Śledzenie zmian klas (historycznie) |
| `NyxIsBad/discordscripts` | <https://github.com/NyxIsBad/discordscripts> | Sformatowane listy zmian |

---

## 3. Podejścia popularnych tematów

### 3.1 CapnKitten — Material Discord (inspiracja ObsidianDiscord)

**Podejście: 100% MANUALNE**

- Folder `.github` NIE istnieje (404)
- Jedyny workflow: `pages-build-deployment` (GitHub Pages)
- Commity typu "Class update", "Class changes and refactoring" — ręcznie, co kilka dni/tygodni
- Brak jakiejkolwiek automatyzacji czy CI/CD dla klas

### 3.2 ClearVision v6 (427 stars, SCSS, 1.8k forków)

**Podejście: SCSS + lib/selectors + manual**

- Używa **SCSS** z build systemem (npm)
- Ma dedykowany folder `lib/selectors/` do zarządzania selektorami
- Manualne aktualizacje klas przez kontrybutorów
- `.github` istnieje ale bez automatyzacji scrapingu klas

### 3.3 Midnight (1.3k stars, CSS, 484 forki) — Najpopularniejszy theme

**Podejście: GitHub Actions + community PRs**

- Ma `.github/` directory z workflow'ami
- `github-actions[bot]` jest kontrybutorem → pewna automatyzacja istnieje
- CSS z build scriptem (npm run dev)
- Bardzo aktywny (commit 18h temu)

---

## 4. Stabilne selektory w Discord

### 4.1 CSS Custom Properties — NAJBARDZIEJ STABILNE

Discord eksponuje **setki** CSS custom properties na `:root` i `.theme-dark`/`.theme-light`/`.theme-amoled`/`.theme-darker`. Te **NIE zmieniają się** z hash updates:

```css
/* Stabilne — semantyczne tokeny */
--background-primary
--background-secondary
--background-tertiary
--text-normal
--text-muted
--brand-500
--header-primary
--interactive-active
--channels-default
/* ...setki innych */
```

**Rekomendacja:** Wszędzie gdzie to możliwe, używaj `var(--background-primary)` zamiast bezpośredniego targetowania hashowanych klas.

Pełna lista: <https://docs.betterdiscord.app/discord/variables>

### 4.2 Theme class selectors — STABILNE

```css
.theme-dark { }
.theme-light { }
.theme-amoled { }
.theme-darker { }
```

### 4.3 Selektory alternatywne (z BD docs "Working With Selectors")

Atrybutowe selektory mogą być **bardziej odporne** na zmiany klas:

- `[class*="members"]` — partial match, przeżyje zmianę hasha
- `[class^="sidebar"]` — starts with
- `[aria-label="..."]` — accessibility attributes (stabilne)
- `[data-list-id]`, `[data-tab-id]` — data attributes
- `:nth-child()`, `:nth-of-type` — stabilna struktura DOM

**Uwaga z BD docs:** Discord działa na Chrome 108 (nie bleeding edge). `:has()` jest wspierany.

Dokumentacja BD: <https://docs.betterdiscord.app/themes/tutorials/selectors>

---

## 5. Wnioski i rekomendacje dla ObsidianDiscord

### Opcja A — REKOMENDOWANA: GitHub Action `discord-update-classnames`

1. Dodaj workflow `.github/workflows/update-classnames.yml`
2. Codziennie o 00:00 scrapuje Discord Canary
3. Auto-tworzy PR z zamianami klas
4. Ty reviewujesz i mergujesz

**Nakład pracy**: ~15 min setup, potem zero maintenance
**Ryzyko**: Narzędzie jeszcze oficjalnie nie released (ale aktywnie rozwijane)

### Opcja B — Pragmatyczna: SyndiShanX web tool

1. Po każdym dużym update Discorda → wklej swój CSS na <https://syndishanx.github.io/Website/Update_Classes.html>
2. Skopiuj zaktualizowany output
3. Porównaj i zastąp

**Nakład pracy**: ~5-10 min per Discord update
**Wada**: Ręczna praca, łatwo zapomnieć

### Opcja C — Architektoniczna: Pivot na CSS custom properties

1. Stopniowo zamieniaj hashowane klasy na `var(--discord-token)` gdzie to możliwe
2. Używaj `[class*="..."]` partial match selectors dla elementów bez CSS vars
3. Minimalizuj zależność od hashowanych klas

**Nakład pracy**: Duży jednorazowy refactor
**Gain**: Drastycznie mniej breaków przy Discord updates

### Rekomendowany plan: A + C hybrydowo

1. **Natychmiast:** Setup `discord-update-classnames` GitHub Action
2. **Stopniowo:** Przy każdej aktualizacji klas, zamieniaj hardcoded selektory na CSS vars/partial match gdzie to możliwe
3. **Docelowo:** Minimalna zależność od hashowanych klas → Action potrzebny coraz rzadziej

---

## 6. Ekosystem narzędzi — podsumowanie

```text
SyndiShanX/Update-Classes (Changes.txt)  ← ŹRÓDŁO PRAWDY
    │
    ├── syndishanx.github.io (web tool)
    ├── Saltssaumure/ClassUpdate (Python, local)
    ├── Metro420yt/class-update (GitHub Action, simple)
    └── fedeericodl/discord-update-classnames (GitHub Action, advanced, own scraping)
         └── data branch (classNamesMap.json) ← NIEZALEŻNE OD SyndiShanX
```

`fedeericodl` jest jedynym narzędziem, które **samodzielnie scrapuje** Discord Canary client — reszta bazuje na ręcznie utrzymywanym changelist SyndiShanX. To czyni `discord-update-classnames` najsolidniejszym długoterminowym rozwiązaniem.
