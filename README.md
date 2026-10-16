# Wadobaza

Indeks przetłumaczonych metryk parafialnych parafii powiatu wadowickiego.
Strona statyczna (HTML + CSS + JS), bez serwera i bez kont użytkowników – wyszukiwanie działa w przeglądarce na plikach JSON.

Na start: **Przytkowice, zgony**. Baza rośnie razem z tłumaczeniami.

Strona: https://wrobelkarol.github.io/wadobaza/

## Jak działa

```
Excel (.xlsx)  --skrypty/build.py-->  docs/data/*.json  -->  docs/ (strona)  -->  GitHub Pages
 (lokalnie)      sprawdzenie, limit       dane publiczne        wyszukiwarka
                 roku, raport
```

Pliki Excel zostają na dysku autora (`*.xlsx` jest w `.gitignore`). W repozytorium są tylko wygenerowane pliki JSON.

## Podgląd lokalny

```bash
python -m http.server 8123 --directory docs
```

Strona będzie pod adresem http://localhost:8123.

## Dodawanie nowych danych

1. Skopiuj `skrypty/zrodla.przyklad.txt` jako `skrypty/zrodla.txt` i wpisz ścieżki do Excelów lub folderów
   (struktura: `<Parafia>/<Zgony>/<rok>/plik.xlsx`).
2. Uruchom skrypt (wymaga Pythona 3.10+ i `pip install openpyxl`):

   ```bash
   python skrypty/build.py
   ```

   Skrypt pokaże raport: liczbę rekordów, ostrzeżenia o podejrzanych datach i rekordy bez rozpoznanego nazwiska.
   Przydatne opcje: `--sucho` (tylko raport), `--szczegoly` (pełna lista), `--max-rok 1945`, `--bez-uwag`.
3. Sprawdź stronę lokalnie, potem `git add`, `git commit`, `git push`.

Linki do skanów (Skanoteka) wpisuje się w `dane/zrodla.json` (klucz `parafia/rodzaj/rok`, w adresie `{plik}`
zastępuje numer zdjęcia). Jeśli w Excelu jest kolumna `Skan` z numerem zdjęcia (np. `2`), akt linkuje do tego zdjęcia.

Skrypt rozpoznaje kolumny po nagłówkach: Liczba porządkowa, Zgonu, Pogrzebu, Numer domu, opis aktu,
Imię nazwisko, Mama, Tata, Małżonek, Religia, Płeć, Wiek zmarłego, Przyczyna zgonu, Data urodzenia, Uwagi, Skan.
Działa też ze starszym układem (bez Mama/Tata/Małżonek).

## Zasady publikacji

- Publikowane są tylko akty z roku 1945 i wcześniejsze (limit egzekwuje `build.py`).
- Dane: licencja [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.pl) – © Karol Wróbel.
- Tłumaczenia mogą zawierać błędy; zawsze warto sprawdzić skan.

Plan i stan prac: [PLAN.md](PLAN.md).
