# -*- coding: utf-8 -*-
"""Przetwarzanie opisów aktów – wspólne dla build.py i podpowiedz_excel.py.

Co tu jest:
  * usun_lacine            – usuwa łacińskie nazwy w nawiasach (Marianna (Marianna) -> Marianna)
  * popraw_miejscowosci    – "ur. w Przytkowice" -> "ur. w Przytkowicach"
  * rozdziel_kaplana       – oddziela zdania o kapłanie (kto zaopatrzył / pochował)
  * wiek_pelne_lata        – "83 lat 1/12" -> "83 lata"
  * rodzina_z_opisu        – ojciec, matka, małżonek wyciągnięci z opisu (heurystyka, do sprawdzenia)
Wynik funkcji heurystycznych zawsze trzeba traktować jako podpowiedź, nie jako pewnik.
"""
from __future__ import annotations

import re
import unicodedata

CAP = "A-ZĄĆĘŁŃÓŚŹŻ"
LOW = "a-ząćęłńóśźż"
SLOWO = rf"[{CAP}][{LOW}{CAP}'’\-]*"


def zloz(s: object) -> str:
    """Małe litery bez polskich znaków (do porównań)."""
    s = str(s).replace("ł", "l").replace("Ł", "L")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", s).strip().lower()


# ---------------------------------------------------------------- łacina w nawiasach

_POLSKIE = re.compile(r"[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]")
_LAC_KONC = re.compile(r"(?:us|um|is|ae|ii|io|em|es|as|os|tas|ia|ma|na|nis|tis|ium|tum|tus)$")
_LAC_FUNK = {
    "non", "vel", "et", "seu", "cum", "in", "sine", "de", "ex", "ad", "sexus", "filius", "filia", "puer",
    "proles", "foetus", "natus", "nata", "vivo", "viva", "mortuus", "mortua", "femini", "feminini",
    "masculini", "illegitimus", "sic", "vulgo", "primo", "secundo", "voto", "uxor", "vidua", "baptisatus",
}


def _to_lacina(tresc: str) -> bool:
    """Czy zawartość nawiasu wygląda na łacinę lub zapis oryginalny (a nie polskie wyjaśnienie)."""
    bez_kw = re.sub(r"\[[^\]]*\]", " ", tresc)
    slowa = re.findall(r"[^\W\d_]+", bez_kw)
    if not slowa:
        return "[" in tresc  # np. "([?])" – znacznik wątpliwości przy łacinie
    if _POLSKIE.search(bez_kw) or len(slowa) > 12:
        return False
    for w in slowa:
        l = w.lower()
        if w[0].isupper() or l in _LAC_FUNK or (len(l) >= 4 and _LAC_KONC.search(l)):
            continue
        return False
    return True


def usun_lacine(tekst: str | None) -> str | None:
    """Usuwa łacińskie nazwy w nawiasach; polskie wyjaśnienia w nawiasach zostają."""
    if not tekst:
        return tekst
    t = re.sub(r"\s*\(([^()]*)\)", lambda m: "" if _to_lacina(m.group(1)) else m.group(0), tekst)
    t = re.sub(r"\s+([,.;:])", r"\1", t)
    return re.sub(r"[ \t]{2,}", " ", t).strip()


# ---------------------------------------------------------------- miejscowości

_MIEJSCA = {  # mianownik -> miejscownik (na pytanie: w kim/w czym?)
    "Przytkowice": "Przytkowicach", "Wadowice": "Wadowicach", "Brzeźnica": "Brzeźnicy", "Tomice": "Tomicach",
    "Gierałtowice": "Gierałtowicach", "Spytkowice": "Spytkowicach", "Frydrychowice": "Frydrychowicach",
    "Jaroszowice": "Jaroszowicach", "Sosnowice": "Sosnowicach", "Zebrzydowice": "Zebrzydowicach",
    "Sułkowice": "Sułkowicach", "Witanowice": "Witanowicach", "Bulowice": "Bulowicach",
    "Stryszów": "Stryszowie", "Ryczów": "Ryczowie", "Zakrzów": "Zakrzowie", "Roków": "Rokowie",
    "Andrychów": "Andrychowie", "Kraków": "Krakowie", "Choczeń": "Choczni", "Radocza": "Radoczy",
    "Zagórnik": "Zagórniku", "Marcyporęba": "Marcyporębie", "Leńcze": "Leńczach", "Mucharz": "Mucharzu",
    "Lgota": "Lgocie", "Lanckorona": "Lanckoronie", "Kęty": "Kętach", "Oświęcim": "Oświęcimiu",
    "Benczyn": "Benczynie", "Inwałd": "Inwałdzie", "Paszkówka": "Paszkówce", "Pobiedr": "Pobiedrze",
    "Zawadka": "Zawadce", "Grodzisko": "Grodzisku", "Zator": "Zatorze", "Francja": "Francji",
    "Kalwaria Zebrzydowska": "Kalwarii Zebrzydowskiej", "Wielkie Drogi": "Wielkich Drogach",
    "Barwałd Górny": "Barwałdzie Górnym", "Barwałd Dolny": "Barwałdzie Dolnym", "Barwałd Średni": "Barwałdzie Średnim",
    "Gorzeń Górny": "Gorzeniu Górnym", "Gorzeń Dolny": "Gorzeniu Dolnym",
    "Klecza Górna": "Kleczy Górnej", "Klecza Dolna": "Kleczy Dolnej",
}
_JUZ_MIEJSCOWNIK = set(_MIEJSCA.values())
_PRZYM = {  # przymiotnik w mianowniku -> miejscownik
    "Wielkie": "Wielkich", "Małe": "Małych", "Dolne": "Dolnych", "Górne": "Górnych", "Nowe": "Nowych",
    "Stare": "Starych", "Średnie": "Średnich", "Wielka": "Wielkiej", "Mała": "Małej", "Dolna": "Dolnej",
    "Górna": "Górnej", "Nowa": "Nowej", "Stara": "Starej", "Średnia": "Średniej", "Wielki": "Wielkim",
    "Mały": "Małym", "Dolny": "Dolnym", "Górny": "Górnym", "Nowy": "Nowym", "Stary": "Starym", "Średni": "Średnim",
}
_KONCOWKI_RZECZ = [  # (koniec mianownika, koniec miejscownika) – tylko pewne wzorce
    ("ice", "icach"), ("yce", "ycach"), ("cze", "czach"), ("ów", "owie"), ("yn", "ynie"), ("in", "inie"),
    ("ica", "icy"), ("ka", "ce"), ("ga", "dze"), ("cha", "sze"), ("ra", "rze"), ("ła", "le"), ("ia", "ii"),
    ("a", "ie"),
]


def _przym_miejscownik(w: str) -> str | None:
    if w in _PRZYM:
        return _PRZYM[w]
    for k, z in (("skie", "skich"), ("ska", "skiej"), ("ski", "skim"), ("ckie", "ckich"), ("cka", "ckiej"), ("cki", "ckim")):
        if w.endswith(k):
            return w[: -len(k)] + z
    return None


def _rzecz_miejscownik(w: str) -> str:
    for k, z in _KONCOWKI_RZECZ:
        if w.endswith(k) and len(w) > len(k):
            return w[: -len(k)] + z
    return w


def miejscownik(nazwa: str) -> str:
    """Nazwa miejscowości (mianownik) -> miejscownik po 'w'. Formy już odmienione zostają bez zmian."""
    n = nazwa.strip()
    if n in _MIEJSCA:
        return _MIEJSCA[n]
    if n in _JUZ_MIEJSCOWNIK:
        return n
    slowa = n.split()
    if len(slowa) == 1:
        return _rzecz_miejscownik(n)
    wynik = []
    for w in slowa:
        p = _przym_miejscownik(w)
        wynik.append(p if p else _rzecz_miejscownik(w))
    return " ".join(wynik)


_RE_URODZONY = re.compile(
    rf"(\b(?:ur\.|urodzon[aey]?)\s+(?:w|we|na)\s+)(?P<m>[{CAP}][^.,;()\[\]]*?)(?=\s*(?:[.,;(\[]|$))", re.I
)


def popraw_miejscowosci(tekst: str | None) -> str | None:
    """'ur. w Przytkowice' -> 'ur. w Przytkowicach'; 'ur. w Wielkie Drogi' -> 'ur. w Wielkich Drogach'."""
    if not tekst:
        return tekst
    return _RE_URODZONY.sub(lambda m: m.group(1).lower() + miejscownik(m.group("m")), tekst)


# ---------------------------------------------------------------- kapłan

_SKROTY = {"ur", "ks", "św", "ok", "nr", "zm", "tzw", "dr", "ob", "np", "zw", "wg", "tj"}
_RE_KAPLAN = re.compile(r"\b(?:zaopatrzy[łl]\w*|pochowa[łl]\w*|wpisa[łl]em|proboszcz|wikariusz|administrator|kapłan|ks\.)", re.I)


def podziel_zdania(tekst: str) -> list[str]:
    """Dzieli tekst na zdania, nie rozcinając inicjałów (H. Holubars) ani skrótów (ur. w)."""
    czesci: list[str] = []
    start = 0
    for m in re.finditer(rf"[.!?](?=\s+[{CAP}\[])", tekst):
        przed = re.search(r"(\S+)$", tekst[: m.start()])
        tok = przed.group(1) if przed else ""
        if (len(tok) == 1 and tok.isupper()) or tok.lower().strip("([") in _SKROTY:
            continue
        czesci.append(tekst[start: m.end()].strip())
        start = m.end()
    czesci.append(tekst[start:].strip())
    return [c for c in czesci if c]


def rozdziel_kaplana(tekst: str | None) -> tuple[str | None, str | None]:
    """-> (reszta, kapłan). Zdania z informacją o kapłanie (zaopatrzył, pochował, proboszcz…) idą do 'kapłan'."""
    if not tekst:
        return None, None
    reszta, kaplan = [], []
    for z in podziel_zdania(tekst):
        (kaplan if _RE_KAPLAN.search(z) else reszta).append(z)
    return (" ".join(reszta) or None), (" ".join(kaplan) or None)


# ---------------------------------------------------------------- wiek

def _rok_lata(n: int) -> str:
    if n == 1:
        return "rok"
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return "lata"
    return "lat"


def wiek_pelne_lata(tekst: str | None) -> str | None:
    """'83 lat 1/12' -> '83 lata'; '50 lat 11/12' -> '50 lat'. Wiek w dniach/miesiącach zostaje bez zmian."""
    if not tekst:
        return tekst
    m = re.match(r"\s*(\d+)(?:[.,]\d+)?\s*(?:lat|lata|rok|roku|l\.?)(?![a-ząćęłńóśźż])", tekst, re.I)
    if not m:
        return tekst.strip()
    n = int(m.group(1))
    return f"{n} {_rok_lata(n)}"


# ---------------------------------------------------------------- imiona

_LAC = {  # (rdzeń łaciński, płeć) -> polskie imię w mianowniku
    ("joann", "M"): "Jan", ("joseph", "M"): "Józef", ("petr", "M"): "Piotr", ("francisc", "M"): "Franciszek",
    ("casimir", "M"): "Kazimierz", ("adalbert", "M"): "Wojciech", ("thom", "M"): "Tomasz", ("michael", "M"): "Michał",
    ("andre", "M"): "Andrzej", ("stanisla", "M"): "Stanisław", ("simon", "M"): "Szymon", ("mathi", "M"): "Maciej",
    ("vincenti", "M"): "Wincenty", ("jacob", "M"): "Jakub", ("martin", "M"): "Marcin", ("laurenti", "M"): "Wawrzyniec",
    ("paul", "M"): "Paweł", ("stephan", "M"): "Stefan", ("adam", "M"): "Adam", ("mieczisla", "M"): "Mieczysław",
    ("valentin", "M"): "Walenty", ("luc", "M"): "Łukasz", ("hyacinth", "M"): "Jacek", ("ignati", "M"): "Ignacy",
    ("antoni", "M"): "Antoni", ("carol", "M"): "Karol", ("ludovic", "M"): "Ludwik", ("ladisla", "M"): "Władysław",
    ("julian", "M"): "Julian", ("eugeni", "M"): "Eugeniusz", ("felix", "M"): "Feliks", ("felic", "M"): "Feliks",
    ("alexandr", "M"): "Aleksander", ("georgi", "M"): "Jerzy", ("gregori", "M"): "Grzegorz", ("nicola", "M"): "Mikołaj",
    ("blasi", "M"): "Błażej", ("benedict", "M"): "Benedykt", ("dominic", "M"): "Dominik", ("august", "M"): "August",
    ("leon", "M"): "Leon", ("ferdinand", "M"): "Ferdynand", ("hieronym", "M"): "Hieronim", ("matthae", "M"): "Mateusz",
    ("matthe", "M"): "Mateusz", ("bartholome", "M"): "Bartłomiej", ("sebastian", "M"): "Sebastian", ("jan", "M"): "Jan",
    ("catharin", "K"): "Katarzyna", ("ann", "K"): "Anna", ("mariann", "K"): "Marianna", ("mari", "K"): "Maria",
    ("regin", "K"): "Regina", ("agn", "K"): "Agnieszka", ("agnet", "K"): "Agnieszka", ("sophi", "K"): "Zofia",
    ("magdalen", "K"): "Magdalena", ("helen", "K"): "Helena", ("thecl", "K"): "Tekla", ("victori", "K"): "Wiktoria",
    ("salome", "K"): "Salomea", ("eva", "K"): "Ewa", ("evae", "K"): "Ewa", ("francisc", "K"): "Franciszka",
    ("joseph", "K"): "Józefa", ("bronislav", "K"): "Bronisława", ("stanislav", "K"): "Stanisława",
    ("carolin", "K"): "Karolina", ("rosali", "K"): "Rozalia", ("apolloni", "K"): "Apolonia", ("antonin", "K"): "Antonina",
    ("susann", "K"): "Zuzanna", ("juli", "K"): "Julia", ("ludovic", "K"): "Ludwika", ("vitalin", "K"): "Witalina",
    ("agath", "K"): "Agata", ("ladislav", "K"): "Władysława", ("eugeni", "K"): "Eugenia", ("stephani", "K"): "Stefania",
    ("barbar", "K"): "Barbara", ("elisabeth", "K"): "Elżbieta", ("ursul", "K"): "Urszula", ("theres", "K"): "Teresa",
    ("clar", "K"): "Klara", ("cecili", "K"): "Cecylia", ("paulin", "K"): "Paulina", ("emili", "K"): "Emilia",
    ("constanti", "K"): "Konstancja", ("valeri", "K"): "Waleria", ("joann", "K"): "Joanna", ("apolon", "K"): "Apolonia",
}
_LAC_KONC_IMION = ("ae", "as", "es", "is", "us", "um", "em", "am", "os", "ii", "o", "i", "a", "e")


def _rdzen_lac(lac: str) -> str:
    w = zloz(re.split(r"[\s,]", lac.strip())[0]) if lac and lac.strip() else ""
    if w in ("eva", "evae"):
        return w
    for k in _LAC_KONC_IMION:
        if w.endswith(k) and len(w) - len(k) >= 3:
            return w[: -len(k)]
    return w


_WYJATKI_MESKIE = {
    "Franciszka": "Franciszek", "Marka": "Marek", "Jacka": "Jacek", "Pawła": "Paweł", "Wawrzyńca": "Wawrzyniec",
    "Walentego": "Walenty", "Wincentego": "Wincenty", "Ignacego": "Ignacy", "Jerzego": "Jerzy",
    "Antoniego": "Antoni", "Konstantego": "Konstanty", "Kuby": "Kuba", "Bartłomieja": "Bartłomiej", "Błażeja": "Błażej",
    "Aleksandra": "Aleksander", "Walerego": "Walery", "Mikołaja": "Mikołaj",
}


def plec_z_formy(slowo: str) -> str | None:
    """Dopełniacz imienia: -a / -ego = mężczyzna, -y / -i = kobieta."""
    if slowo.endswith(("ego", "a")):
        return "M"
    if slowo.endswith(("y", "i")):
        return "K"
    return None


def _mianownik_z_dopelniacza(slowo: str, plec: str | None) -> str:
    if plec == "K":
        return slowo[:-1] + "a" if slowo.endswith(("y", "i")) else slowo
    if plec == "M":
        if slowo in _WYJATKI_MESKIE:
            return _WYJATKI_MESKIE[slowo]
        if slowo.endswith("iego"):
            return slowo[:-4] + "i"
        if slowo.endswith("ego"):
            return slowo[:-3] + "y"
        if slowo.endswith("szka"):
            return slowo[:-4] + "szek"
        if slowo.endswith("a"):
            return slowo[:-1]
    return slowo


def imie_mianownik(slowa: list[str], lac: str | None, plec: str | None, dopelniacz: bool = True) -> str:
    """Imię z formy odmienionej do mianownika: najpierw przez łacińską formę z nawiasu, potem regułami."""
    if lac and plec:
        pol = _LAC.get((_rdzen_lac(lac), plec))
        if pol:
            return pol
    if dopelniacz:
        return " ".join(_mianownik_z_dopelniacza(s, plec) for s in slowa)
    return " ".join(slowa)


# ---------------------------------------------------------------- nazwiska

def zbierz_znane_nazwiska(teksty: list[str]) -> set[str]:
    """Nazwiska w mianowniku, które na pewno występują w danych: 'z domu X' oraz nazwiska zmarłych."""
    znane: set[str] = set()
    for t in teksty:
        for m in re.finditer(rf"\bz\s+domu\s+({SLOWO})", t):
            znane.add(m.group(1))
        m = re.match(rf"\s*{SLOWO}(?:\s+{SLOWO})?\s*(?:\([^)]*\))?\s*({SLOWO})\s*[,.\[]", t)
        if m:
            znane.add(m.group(1))
    return znane


def nazwisko_mianownik(g: str, znane: set[str]) -> str:
    """Nazwisko z opisu (często w dopełniaczu: Kukuły, Żaka, Cichonia) -> mianownik. Najpierw dopasowanie do znanych."""
    if g in znane:
        return g
    kand: list[str] = []
    if g.endswith("iego"):
        kand += [g[:-4] + "i"]
    if g.endswith("ego"):
        kand += [g[:-3] + "y", g[:-3] + "i"]
    if g.endswith(("y", "i")):
        kand.append(g[:-1] + "a")
    if g.endswith("a"):
        kand.append(g[:-1])
        if g.endswith("nia"):
            kand.append(g[:-3] + "ń")
        if g.endswith("ka"):
            kand.append(g[:-2] + "ek")
        if g.endswith("ca"):
            kand.append(g[:-2] + "ec")
    for k in kand:
        if k in znane:
            return k
    # brak w znanych: bezpieczne reguły domyślne
    if g.endswith("iego"):
        return g[:-4] + "i"
    if g.endswith(("y", "i")) and not g.endswith(("ski", "cki", "dzki", "ny", "wy")):
        return g[:-1] + "a"
    if g.endswith("ka") and len(g) > 3:
        # Żaka -> Żak, Michalika -> Michalik (samogłoska przed -ka), ale Gnojka -> Gnojek, Bębenka -> Bębenek
        return g[:-1] if g[-3] in "aeiouyąęó" else g[:-2] + "ek"
    return g


def nazwisko_panienskie(opis: str) -> str | None:
    """Nazwisko panieńskie zmarłej, gdy opis podaje je wprost ('..., z domu Cęcek') przed wzmianką o rodzicach."""
    m = _RE_KLUCZ_RODZICE.search(opis)
    glowa = opis[: m.start()] if m else opis
    z = re.search(rf"\bz\s+domu\s+({SLOWO})", glowa)
    return z.group(1) if z else None


# ---------------------------------------------------------------- rodzina z opisu

_RE_KLUCZ_RODZICE = re.compile(r"\b(?:syn|córka|córką|synem|dziecko)\b")
_RE_PRZEDROSTEK = re.compile(r"\s*(?:(?:nie)?ślubn\w+\s+|prawowit\w+\s+)*")
_RE_I = re.compile(r"\s*,?\s*i\s+")
_DODATKI_OSOBY = (
    rf"(?:\s+zwan\w+\s+\([^)]*\)\s+{SLOWO})?"
    rf"(?:\s*,\s*(?P<zaw>[{LOW}][^,.;()\[\]]*?)\s*,)?(?:\s+z\s+domu\s+(?P<pan>{SLOWO}))?"
)
_RE_OSOBA = re.compile(
    rf"(?P<imie>{SLOWO}(?:\s+{SLOWO})?)\s*\((?P<lac>[^)]*)\)(?:\s+(?P<nazw>{SLOWO}))?" + _DODATKI_OSOBY
)
_RE_OSOBA_BEZ = re.compile(rf"(?P<imie>{SLOWO})(?:\s+(?P<nazw>{SLOWO}))?" + _DODATKI_OSOBY)
_MALZONEK = [  # (wzorzec przed osobą, płeć małżonka, odmiana imienia: dopełniacz czy miejscownik)
    (re.compile(r"\b(?:żona|żoną)\b[^.]{0,80}?\bmęża\s+(?:swojego\s+|swego\s+)?"), "M", True),
    (re.compile(r"\bmąż\b[^.]{0,80}?\bżony\s+(?:swojej\s+)?"), "K", True),
    (re.compile(r"\bwdowa\s+po\s+(?:swoim\s+)?(?:zmarłym\s+)?(?:mężu\s+)?"), "M", False),
    (re.compile(r"\bwdowiec\s+po\s+(?:swojej\s+)?(?:zmarłej\s+)?(?:żonie\s+)?"), "K", False),
]
_RE_ZAMEZNA = re.compile(r"\b(?:żona|żoną|wdowa|mężatka)\b")


def kobieta_zamezna(opis: str) -> bool:
    return bool(_RE_ZAMEZNA.search(opis))


def _osoba(opis: str, poz: int):
    return _RE_OSOBA.match(opis, poz) or _RE_OSOBA_BEZ.match(opis, poz)


def rodzina_z_opisu(opis: str, nazwisko_zmarlego: str | None, plec_zmarlego: str | None, znane: set[str]) -> dict:
    """Ojciec, matka i małżonek z opisu (z łacińskimi nawiasami lub bez). Klucze wyniku:
    imie_ojca, nazwisko_ojca, imie_matki, nazwisko_matki, malzonek."""
    wynik: dict = {}
    m = _RE_KLUCZ_RODZICE.search(opis)
    if m:
        poz = _RE_PRZEDROSTEK.match(opis, m.end()).end()
        osoby = []
        p = _osoba(opis, poz)
        if p:
            osoby.append(p)
            i = _RE_I.match(opis, p.end())
            if i:
                p2 = _osoba(opis, i.end())
                if p2:
                    osoby.append(p2)
        for kolej, o in enumerate(osoby):
            slowa = o["imie"].split()
            lac = o.groupdict().get("lac")
            plec = plec_z_formy(slowa[0])
            if plec is None:
                plec = "M" if kolej == 0 and len(osoby) == 2 else ("K" if kolej == 1 else None)
            imie = imie_mianownik(slowa, lac, plec)
            if plec == "M" and "imie_ojca" not in wynik:
                wynik["imie_ojca"] = imie
                if o["nazw"]:
                    wynik["nazwisko_ojca"] = nazwisko_mianownik(o["nazw"], znane)
            elif plec == "K" and "imie_matki" not in wynik:
                wynik["imie_matki"] = imie
                nazwisko = o["pan"] or o["nazw"]
                if nazwisko:
                    wynik["nazwisko_matki"] = nazwisko_mianownik(nazwisko, znane) if not o["pan"] else nazwisko
    for wzorzec, plec_malz, dopelniacz in _MALZONEK:
        mm = wzorzec.search(opis)
        if not mm:
            continue
        o = _osoba(opis, mm.end())
        if not o:
            continue
        slowa = o["imie"].split()
        imie = imie_mianownik(slowa, o.groupdict().get("lac"), plec_malz, dopelniacz)
        if plec_malz == "M":
            nazw = nazwisko_zmarlego or (nazwisko_mianownik(o["nazw"], znane) if o["nazw"] else None)
        else:
            nazw = o["pan"]
        wynik["malzonek"] = f"{imie} {nazw}".strip() if nazw else imie
        break
    return wynik


def dodatkowe_z_opisu(opis: str) -> str | None:
    """Reszta opisu od 'ur. w ...' (miejsce urodzenia, zaopatrzenie, kapłan)."""
    m = re.search(r"\bur\.\s+(?:w|we|na)\b", opis)
    return opis[m.start():].strip() if m else None
