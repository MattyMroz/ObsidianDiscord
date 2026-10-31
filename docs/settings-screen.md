# Ekran ustawień: co naprawiono i czym to zmierzono

Dokument istnieje z jednego powodu: **wartości w sekcji `SETTINGS` motywu nie są wybrane na oko**. Każda została zmierzona w otwartym Discordzie, część po tym, jak wersja „na oko" okazała się błędna. Kto będzie tu grzebał później, dostaje razem z liczbami metodę, którą można je sprawdzić ponownie, i listę pułapek, które kosztowały tu najwięcej czasu.

## Metoda pomiaru

Nie ma tu zgadywania po zrzucie ekranu. Discord jest sterowany przez Chrome DevTools Protocol w **zalogowanym** Edge, a każda zmiana jest odczytywana z `getBoundingClientRect()` i `getComputedStyle()`.

Schemat jednego cyklu:

1. dopisać kandydata do adoptowanego arkusza motywu przez `insertRule` (nie ruszając motywu w repo); osobny `<style>` przegrywa z arkuszami, które Discord doładuje po nim,
2. odczytać liczby sondą, nie okiem,
3. porównać z tym samym pomiarem na **czystym** Discordzie (bez motywu) — inaczej nie wiadomo, czy naprawiamy własną regresję, czy zachowanie Discorda,
4. dopiero po akceptacji wpisać wartość do motywu, przebudować bundle i zmierzyć jeszcze raz **z gotowego bundle**, po przeładowaniu strony, bez reguł dopisanych w kroku 1.

Krok 4 nie jest formalnością: dwa razy zdarzyło się, że reguła działała jako wstrzyknięty eksperyment, a w motywie celowała w klasę, której w danym układzie DOM nie ma.

### Pułapki, które fałszują pomiar

- **Karty w tle są zamrażane.** Edge wstrzymuje `requestAnimationFrame` i timery w niewidocznej karcie, więc przejścia CSS nie postępują, a `getComputedStyle` zwraca wartość początkową — czyta się to jako „reguła nie działa", gdy działa. Karta do pomiarów musi być na wierzchu, a przeglądarka uruchomiona bez usypiania kart.
- **Nie wstrzykiwać `* { transition: none }`.** Zaklinowało renderer Discorda na kilka minut. Wyłączanie przejść zawężać do jednego selektora.
- **„Dwa układy” ekranu ustawień to była kolejność arkuszy, nie Discord.** Dopóki motyw siedział w `<style>`, arkusz ustawień doładowany przez Discorda lądował raz przed nim, raz za nim, zależnie od momentu wstrzyknięcia, i przy równej specyficzności wygrywał z Materialem albo przegrywał. Od userscriptu 5.0 motyw jest w `document.adoptedStyleSheets`, zawsze za arkuszami strony, i układ jest jeden. Pomiar zrobiony na motywie wstrzykniętym przez `<style>` jest niewiarygodny.
- **`theme-dark` nie jest na `html`.** Zmienne motywu (`--main-color`, `--card-color-active`, ...) są definiowane w bloku `.theme-dark`, a ta klasa siedzi na wielu elementach w środku drzewa. Pytanie o zmienną na `document.documentElement` zwraca pustkę i wygląda jak „zmiennych nie ma".
- `/settings/account` przekierowuje na `/channels/@me` — ustawienia otwiera się kliknięciem zębatki (`aria-label="Ustawienia użytkownika"`), nie adresem URL.

## Co obowiązuje w pasku ustawień

Liczby po prawej są zmierzone na gotowym bundle, nie na eksperymencie.

| element                            | stan Discorda / poprzedni                                    | obowiązuje                                                   | dlaczego tak                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| szukajka w pasku                   | promień 18 px (`--card-radius-big`)                          | `--card-radius` = 8 px                                       | przy wysokości 37,6 px osiemnastka jest pełną pigułką i nie pasuje do pozycji obok, które mają 8 px                                     |
| pozycja z zawiniętą etykietą       | sztywne 40 px z Materiala, tekst wchodzi na następną pozycję | `min-height: 40px`, 60 px przy dwóch liniach                 | Discord daje takiej pozycji 56 px; dotyczy „Uprawnienia do wiadomości” i każdej pozycji z odznaką NOWE                                  |
| podpozycja (`item_e4d939`)         | wysokość 20 px, padding 0                                    | padding `5px 10px`, wysokość 30 px                           | Discord nie daje tym wierszom paddingu, więc podświetlenie hover i zaznaczenia było o połowę niższe niż w pozycjach nadrzędnych (40 px) |
| lista podpozycji (`subnav_e4d939`) | `gap: 16px`, skok 46 px                                      | `gap: 4px`, skok 34 px                                       | cztery krótkie etykiety zajmowały wysokość sześciu                                                                                      |
| hover pozycji nawigacji            | `--menu-item-hover`                                          | `rgba(255,255,255,0.05)`                                     | token jest o jeden krok jasności od tła paska: zmierzone 30,32,36 na 30,32,36, czyli hover, którego nie widać                           |
| pozycja zaznaczona                 | `--card-color-active`                                        | `--menu-item-select` (0.1)                                   | ten sam problem: 33,34,39 na 30,32,36                                                                                                   |
| narożnik na styku z panelem        | prześwit tła `rgb(14,15,17)`                                 | `border-start-start-radius: 0`, `border-end-start-radius: 0` | `content_e9e3ed` ma 18 px promienia na **wszystkich** narożnikach i `overflow: hidden`, a pasek przylega do niego płaską krawędzią      |

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

## Rozjazd szukajki i listy (rozwiązany)

Szukajka i pozycje listy kończą się w tym samym miejscu: 228 / 228 px, tak jak w czystym Discordzie (220 / 220). Przez kilka wersji motyw miał tu rozjazd o 12 px, raz w jedną, raz w drugą stronę. Przyczyną była kolejność arkuszy z pułapki wyżej. Material odsuwa obie części paska o 12 px od prawej krawędzi: górną (profil i szukajkę) marginesem `.fixedContent__409aa`, listę paddingiem `.navScroller__409aa`. Gdy arkusz ustawień Discorda wchodził za motywem, jedna z tych reguł przegrywała. Obejście w motywie, czyli `[class*="sidebar__409aa"] > * { margin-inline-end: 12px }`, wyrównywało jeden układ i psuło drugi. Przy stałej kolejności dokładało drugie 12 px do listy, więc zostało usunięte.

## Jak to sprawdzić ponownie

1. Uruchomić przeglądarkę z debugowaniem i wyłączonym usypianiem kart, zalogować się w Discordzie.
2. Wstrzyknąć bundle tak samo jak userscript: `new CSSStyleSheet()` + `replaceSync(tekst)` dopisany do `document.adoptedStyleSheets`. Nie przez `<style>`: Discord dokleja leniwie ładowane arkusze za nim i wynik pomiaru zależy wtedy od tego, co zdążyło się załadować.
3. Otworzyć ustawienia kliknięciem zębatki.
4. Odczytać `getBoundingClientRect()` i `getComputedStyle()` na elementach z tabel powyżej i porównać z kolumną „obowiązuje".
5. Różnica znaczy, że albo Discord zmienił hashe klas (patrz `AGENTS.md`, sekcja o klasach), albo ktoś zmienił wartość bez pomiaru.
