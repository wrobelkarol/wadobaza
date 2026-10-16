# Wadobaza.pl — plan projektu

Statyczna strona z indeksem przetłumaczonych metryk parafialnych (parafie powiatu wadowickiego), w stylu Geneteki, ale tylko z rekordów, które sam tłumaczę. Start: parafia Przytkowice. Bez kont, bez bazy użytkowników, bez backendu.

## 1. Założenia

- **Źródło prawdy:** pliki Excel (.xlsx) z przetłumaczonymi aktami.
- **Hosting:** GitHub Pages (darmowy, dane leżą w repo jako pliki). Bez Supabase i Vercela.
- **Wyszukiwanie:** w całości w przeglądarce użytkownika (JSON + indeks po stronie klienta).
- **Zakres:** parafie powiatu wadowickiego; dokładamy je stopniowo.
- **Później (faza 4):** automatyczne łączenie rekordów w drzewa rodzin. Model danych projektuję tak, żeby to było możliwe.
- **Do CV:** osobne repo `wadobaza` + kafelek na https://wrobelkarol.github.io/ (portfolio już istnieje, statyczne, podfoldery per projekt).

## 2. Architektura

```
Excel (.xlsx)  --build.py-->  dane JSON  -->  strona statyczna (HTML + JS)  -->  GitHub Pages
 (Twoja praca)   (walidacja,   (docs/data/)   (wyszukiwarka w przeglądarce)
                  normalizacja)
```

Planowana struktura repo:

```
wadobaza/
  dane/zrodla.json       # linki do skanów (Excele zostają poza repo)
  skrypty/build.py       # xlsx -> JSON, walidacja, limit roku, raport
  docs/                  # to, co serwuje GitHub Pages
    index.html           # wyszukiwarka
    o-projekcie.html     # o projekcie, zakres bazy (jakie lata są gotowe), źródła, zasady, kontakt
    data/*.json          # wygenerowane dane + manifest.json
    js/ css/
  README.md
  PLAN.md
```

Dodawanie nowych danych: edytuję Excel -> `python skrypty/build.py` -> `git push` -> strona się sama aktualizuje. (Opcjonalnie później GitHub Action, który robi build po pushu.)

## 3. Model danych (wstępny — do potwierdzenia na Twoim Excelu)

Typy aktów: **chrzty/urodzenia**, **małżeństwa**, **zgony**.

Wspólne pola rekordu: `id`, `typ`, `parafia`, `miejscowosc`, `nr_domu`, `rok`, `data`, `nr_aktu`, `uwagi`, `zrodlo` (zespół/sygnatura, nr skanu, link), `tlumacz`, `data_tlumaczenia`.

Osoby w rekordzie (każda jako „wzmianka” z rolą): dziecko, ojciec, matka (z nazwiskiem panieńskim), chrzestni, pan młody, panna młoda, ich rodzice, świadkowie, zmarły, małżonek zmarłego, itd.

Dlaczego tak: gdy każda osoba ma rolę i dane (imię, nazwisko, wiek, zawód, miejscowość), da się później łączyć wzmianki w osoby i rodziny (faza 4) bez przerabiania całej bazy.

## 4. Wyszukiwarka — funkcje

MVP:
- nazwisko, imię, (rok od–do), parafia, typ aktu, miejscowość
- sortowanie po parafii, roku, nazwisku
- widok szczegółów rekordu (osoby, rodzice, chrzestni, źródło)
- adres z parametrami (link do wyniku wyszukiwania można wysłać dalej)
- bez wrażliwości na polskie znaki i wielkość liter (Wróbel = wrobel)

Potem:
- **warianty nazwisk i imion** (Joannes = Jan, Catharina = Katarzyna, końcówki -ska/-ski, pisownia -y/-i, -ow/-ów)
- wyszukiwanie „wg brzmienia” (fonetyczne, jak w Genetece)
- eksport wyników do CSV
- strony parafii z tabelą pokrycia (lata × typ aktu)
- przycisk „zgłoś błąd w rekordzie” (link do GitHub Issue lub mail — bez kont w moim systemie)

## 5. Fazy

| Faza | Zakres | Efekt |
|---|---|---|
| 0 | Ustalenia, przykładowy Excel, pytania | decyzje poniżej |
| 1 | Repo, `build.py` (xlsx -> JSON), prosta wyszukiwarka, Przytkowice, wdrożenie na Pages | działająca strona w sieci |
| 2 | Warianty nazw, wyszukiwanie fonetyczne, strony parafii, eksport, mobile, wygląd | użyteczna „mini-Geneteka” |
| 3 | Kolejne parafie, regularne dosypywanie danych, README/zrzuty ekranu | rozbudowana baza + materiał do CV |
| 4 | Łączenie wzmianek w osoby i rodziny, widok drzewa, eksport GEDCOM | automatyczne drzewa |
| 5 | Kafelek w portfolio, opis w CV | gotowe do pokazania |

Faza 1 + 5 (kafelek) da się zrobić w jednym podejściu, jak dostanę przykładowy Excel.

## 6. Ryzyka / uwagi

- **Dane osobowe:** rekordy świeże mogą dotyczyć osób żyjących lub ich bliskich. Decyzja: publikuję tylko akty z roku **1945 i wcześniejsze**, dla wszystkich rodzajów aktów. Regułę egzekwuje `build.py` (parametr `--max-rok`): młodszy rekord nie trafia do JSON.
- **Dane są publiczne i do pobrania:** na stronie statycznej nie da się ich ukryć — każdy może pobrać pliki JSON. Jeśli zależy Ci na ochronie włożonej pracy, wybieramy licencję (np. CC BY-NC z obowiązkiem podania źródła) i wpisujemy ją w stopce.
- **Źródła skanów:** linki do skanów (szukajwarchiwach.pl, FamilySearch, archiwum diecezjalne) są ok; samych skanów nie publikuję bez zgody właściciela.
- **GitHub Pages z darmowym kontem wymaga publicznego repo.** Repo będzie więc publiczne (ok dla portfolio).
- **Rozmiar:** do kilkudziesięciu tysięcy rekordów wszystko ładuje się w przeglądarce (JSON po gzip to ~1–2 MB). Powyżej — dzielę dane na pliki per parafia/typ i ładuję na żądanie.
- **Folder jest w OneDrive** (pulpit = `OneDrive\Pulpit`): sam `.git` i `node_modules` potrafią tam sprawiać kłopoty z synchronizacją; jeśli się pojawią, przenosimy projekt poza OneDrive.

## 7. Decyzje (16.10.2026)

| Temat | Decyzja |
|---|---|
| Układ Excela | docelowy (screen z 16.10): Liczba porządkowa, Zgonu, Pogrzebu, Numer domu, opis aktu, Imię nazwisko, Mama, Tata, Małżonek, Religia, Płeć, Wiek zmarłego, Przyczyna zgonu, Data urodzenia, Uwagi (opcjonalnie: Skan). Skrypt rozpoznaje kolumny po nagłówkach, więc działa też ze starszym układem. W 1 = tylko znacznik wyznania/płci; zielona kolumna „sprawdzone” jest ignorowana |
| Zakres lat | akty do 1945 włącznie; na start zgony Przytkowic 1881–1941 |
| Źródło skanów | Skanoteka (`skanoteka.genealodzy.pl`, parametr `plik=NNN.JPG` wskazuje zdjęcie); link do zdjęcia z kolumny „Skan”, bez niej do 1. zdjęcia księgi. Własne skany: odnośnik do osobnej podstrony w katalogu |
| Skala na start | 4 pliki: 1890, 1891, 1939, 1941 (212 aktów) – wszystko ładuje się naraz. Pliki 1892–1938 są jeszcze nietłumaczone |
| Daty | osobne kolumny: data zgonu (bywa niewidoczna na skanie) i data pogrzebu. Wiek „50 lat 2/12” = ok. 50 lat i 2 miesiące; data urodzenia tylko gdy podana w akcie |
| Repo | publiczne, tylko pliki JSON (Excele zostają lokalnie, `*.xlsx` jest w `.gitignore`) |
| Licencja danych | CC BY-NC 4.0 (stopka + strona „O projekcie”) |
| Wygląd | tabelaryczny, w stylu Geneteki, ale czysty i czytelny na telefonie |
| Technologia | zwykły HTML + CSS + JS bez budowania (pod CV, nie „programistyczne”) |
| Domena | na start adres githubowy (`wrobelkarol.github.io/wadobaza`); `wadobaza.pl` do rozważenia później |

## 8. Stan realizacji

**Faza 1 – wdrożona 17.10.2026:** https://wrobelkarol.github.io/wadobaza/ (repo: https://github.com/wrobelkarol/wadobaza,
GitHub Pages z folderu `docs`, gałąź `main`). Szczegóły:
- [x] `skrypty/build.py`: Excel -> JSON, rozpoznawanie kolumn po nagłówkach, limit roku, raport jakości
      (np. daty pogrzebu cofające się w czasie, rekordy bez rozpoznanego nazwiska)
- [x] wyszukiwarka: nazwisko, imię, lata, parafia, rodzaj aktu, płeć, nr domu, tekst; odmiana nazwisk;
      sortowanie po każdej kolumnie; szczegóły aktu; link do pojedynczego aktu; adres z parametrami
- [x] strona „O projekcie” z zestawieniem zakresu bazy
- [x] repozytorium na GitHubie + GitHub Pages
- [x] tabela jak w Excelu: Mama, Tata, Małżonek, osobno data zgonu i pogrzebu; nazwisko w opisie aktu (np. po mężu) osobno
- [ ] kafelek w portfolio `wrobelkarol.github.io` (czeka na zgodę na zmianę w tamtym repo)
- [ ] linki do skanów w `dane/zrodla.json`: jest szablon dla 1941 (id=5557, sygn. 5500); brak dla 1890, 1891, 1939
- [ ] kolumna „Skan” w Excelu (numer zdjęcia), żeby akt linkował do konkretnego zdjęcia
- [ ] ustalić konwencję: kolumna „Imię nazwisko” – kobiety pod nazwiskiem panieńskim?

**Test na wszystkich plikach (tylko lokalnie, nie publikowane):** 2081 rekordów z lat 1890–1941, nazwisko
rozpoznane w 98% (37 rekordów to głównie mężatki i dzieci nieślubne w starszym stylu opisu — i tak są
znajdowane wyszukiwaniem w opisie).

## 9. Uwagi do przyszłych faz

- **Faza 4 (drzewa)** wymaga w Excelu osobnych kolumn: imię, nazwisko, ojciec, matka, małżonek itd.
  Obecny opis aktu w jednej komórce wystarcza do wyszukiwania, ale nie do bezpiecznego łączenia osób.
  Po ustaleniu docelowego układu Excela rozszerzę `build.py` o rekordy „osób” z rolami.
- **Uwagi tłumacza** (kolumny za „Przyczyną zgonu”) są domyślnie publikowane jako „Uwagi tłumacza”.
  Jeśli mają zostać prywatne: `python skrypty/build.py --bez-uwag`.
- **Wyszukiwanie fonetyczne** i słownik imion łacińskich (Joannes = Jan) — faza 2.
