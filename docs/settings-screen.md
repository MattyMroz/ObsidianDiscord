# Ekran ustawień: co naprawiono i czym to zmierzono

Dokument istnieje z jednego powodu: **wartości w sekcji `SETTINGS` motywu nie są wybrane na oko**. Każda została zmierzona w otwartym Discordzie, część po tym, jak wersja „na oko" okazała się błędna. Kto będzie tu grzebał później, dostaje razem z liczbami metodę, którą można je sprawdzić ponownie, i listę pułapek, które kosztowały tu najwięcej czasu.

## Metoda pomiaru

Nie ma tu zgadywania po zrzucie ekranu. Discord jest sterowany przez Chrome DevTools Protocol w **zalogowanym** Edge, a każda zmiana jest odczytywana z `getBoundingClientRect()` i `getComputedStyle()`.

Schemat jednego cyklu:

1. wstrzyknąć kandydata jako osobny `<style id="try">` (nie ruszając motywu w repo),
2. odczytać liczby sondą, nie okiem,
3. porównać z tym samym pomiarem na **czystym** Discordzie (bez motywu) — inaczej nie wiadomo, czy naprawiamy własną regresję, czy zachowanie Discorda,
4. dopiero po akceptacji wpisać wartość do motywu, przebudować bundle i zmierzyć jeszcze raz **z gotowego bundle**, z wyłączonym `<style id="try">`.

Krok 4 nie jest formalnością: dwa razy zdarzyło się, że reguła działała jako wstrzyknięty eksperyment, a w motywie celowała w klasę, której w danym układzie DOM nie ma.

### Pułapki, które fałszują pomiar

- **Karty w tle są zamrażane.** Edge wstrzymuje `requestAnimationFrame` i timery w niewidocznej karcie, więc przejścia CSS nie postępują, a `getComputedStyle` zwraca wartość początkową — czyta się to jako „reguła nie działa", gdy działa. Karta do pomiarów musi być na wierzchu, a przeglądarka uruchomiona bez usypiania kart.
- **Nie wstrzykiwać `* { transition: none }`.** Zaklinowało renderer Discorda na kilka minut. Wyłączanie przejść zawężać do jednego selektora.
- **Ekran ustawień ma dwa układy.** Discord przeskakuje między nimi zależnie od momentu, w którym arkusz wszedł na stronę (nie od szerokości okna — sweep 900–1920 px nic nie zmieniał). Wstrzyknięcie **przed** otwarciem ustawień daje inny padding paska i inne pozycje niż wstrzyknięcie **po**. Każdą poprawkę paska trzeba sprawdzić w obu, bo kandydat, który zeruje rozjazd w jednym, potrafi zrobić rozjazd w drugim.
- **`theme-dark` nie jest na `html`.** Zmienne motywu (`--main-color`, `--card-color-active`, ...) są definiowane w bloku `.theme-dark`, a ta klasa siedzi na wielu elementach w środku drzewa. Pytanie o zmienną na `document.documentElement` zwraca pustkę i wygląda jak „zmiennych nie ma".
- `/settings/account` przekierowuje na `/channels/@me` — ustawienia otwiera się kliknięciem zębatki (`aria-label="Ustawienia użytkownika"`), nie adresem URL.

## Co obowiązuje w pasku ustawień

Liczby po prawej są zmierzone na gotowym bundle, nie na eksperymencie.

| element                            | stan Discorda / poprzedni           | obowiązuje                                                   | dlaczego tak                                                                                                                            |
| ---------------------------------- | ----------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| szukajka w pasku                   | promień 18 px (`--card-radius-big`) | `--card-radius` = 8 px                                       | przy wysokości 37,6 px osiemnastka jest pełną pigułką i nie pasuje do pozycji obok, które mają 8 px                                     |
| podpozycja (`item_e4d939`)         | wysokość 20 px, padding 0           | padding `5px 10px`, wysokość 30 px                           | Discord nie daje tym wierszom paddingu, więc podświetlenie hover i zaznaczenia było o połowę niższe niż w pozycjach nadrzędnych (40 px) |
| lista podpozycji (`subnav_e4d939`) | `gap: 16px`, skok 46 px             | `gap: 4px`, skok 34 px                                       | cztery krótkie etykiety zajmowały wysokość sześciu                                                                                      |
| hover pozycji nawigacji            | `--menu-item-hover`                 | `rgba(255,255,255,0.05)`                                     | token jest o jeden krok jasności od tła paska: zmierzone 30,32,36 na 30,32,36, czyli hover, którego nie widać                           |
| pozycja zaznaczona                 | `--card-color-active`               | `--menu-item-select` (0.1)                                   | ten sam problem: 33,34,39 na 30,32,36                                                                                                   |
| narożnik na styku z panelem        | prześwit tła `rgb(14,15,17)`        | `border-start-start-radius: 0`, `border-end-start-radius: 0` | `content_e9e3ed` ma 18 px promienia na **wszystkich** narożnikach i `overflow: hidden`, a pasek przylega do niego płaską krawędzią      |

Poza paskiem, w tej samej serii:

| element                                    | było                     | jest               | dlaczego                                                                                                          |
| ------------------------------------------ | ------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| tekst w zwykłej szukajce (`editor__25bec`) | 6 px od krawędzi         | 12 px              | pasek ma promień 16 px, który te 6 px zjada — tekst czytał się jako przyklejony do łuku                           |
| ikony górnego paska                        | glif zbity 2,5 px w lewo | bez `margin-right` | relikt wersji 1.2.x; wrapper 24x24 z sekcji „HEADER BAR ICON SIZING" dodatkowo **zwężał** ikony i został usunięty |

## Fałszywe tropy, obalone pomiarem

Zapisane, żeby nikt nie „naprawiał" ich po raz drugi:

- **Ikony górnego paska nigdy nie różniły się rozmiarem.** Czysty Discord daje wszystkie cztery jako `svg` 20x20 w wyśrodkowanym wrapperze 32x32, offset (6,6). Winowajcą przesunięcia był `margin-right: 5px` na svg, nie rozmiar.
- **Podświetlenie aktywnej pozycji nie wychodziło poza pasek** — zmierzony `overflowRight` to −16,4 px. Teoria o `scrollbar-gutter: stable` była zmyślona.
- **`standardSidebarView`, `contentRegion`, `sidebarRegion` nie istnieją** w otwartym ekranie ustawień: 0 wystąpień. Reguły, które w nie celują, pochodzą z Materiala, nie z tego motywu (`git log -S` pusty). Discord daje `sidebar__409aa` obok `content_e9e3ed`.
- **Cała sekcja nawigacji była martwa przez literówkę**: selektory celowały w `item_calf372`, a klasa nazywa się `item_caf372` (19 elementów w DOM).

## Nierozwiązane

Rozjazd **12,2 px** między szerokością szukajki a szerokością pozycji listy. Winowajca jest znany: reguła Materiala `.fixedContent__409aa { margin-inline-end: var(--space-12) }` dokleja 12 px do górnej, nieprzewijanej części paska (profil + szukajka), której lista pod nią nie ma. A/B w tym samym stanie: czysty Discord 276,7 / 276,7 (rozjazd 0), z motywem 264 / 276,2.

Kandydat `margin-inline-end: 0` naprawia układ „arkusz wszedł przed otwarciem ustawień" (12,2 → 0,2 px), ale w drugim układzie robi rozjazd −11,8 px w drugą stronę. Dlatego **nie jest wpisany do motywu**. Potrzebne jest zaczepienie rozróżniające oba układy albo dosunięcie listy, nie górnej części.

## Jak to sprawdzić ponownie

1. Uruchomić przeglądarkę z debugowaniem i wyłączonym usypianiem kart, zalogować się w Discordzie.
2. Wstrzyknąć bundle jako tekst (`GM_xmlhttpRequest` w userscripcie robi to samo; w teście wystarczy dodać `<style>` z zawartością pliku).
3. Otworzyć ustawienia kliknięciem zębatki.
4. Odczytać `getBoundingClientRect()` i `getComputedStyle()` na elementach z tabel powyżej i porównać z kolumną „obowiązuje".
5. Różnica znaczy, że albo Discord zmienił hashe klas (patrz `AGENTS.md`, sekcja o klasach), albo ktoś zmienił wartość bez pomiaru.
