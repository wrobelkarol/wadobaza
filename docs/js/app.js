/* Wadobaza – wyszukiwarka aktów. Cała logika działa w przeglądarce na plikach JSON. */
(function () {
  'use strict';

  var W = window.Wadobaza;
  var KOLUMNY = 11; // liczba kolumn tabeli (do colspan wiersza ze szczegółami)
  // hasła słowniczka wykrywane w treści aktu (początek wyrazu bez polskich znaków: kmieciu, komornika…)
  var POJECIA = [
    { id: 'kmiec', nazwa: 'kmieć', rdzen: 'kmie' },
    { id: 'zagrodnik', nazwa: 'zagrodnik', rdzen: 'zagrodni' },
    { id: 'komornik', nazwa: 'komornik', rdzen: 'komorni' },
    { id: 'sluzacy', nazwa: 'służący', rdzen: 'sluzac' },
    { id: 'posiadacz-dobr', nazwa: 'posiadacz dóbr', rdzen: 'posiadacz' },
    { id: 'posiadacz-dobr', nazwa: 'posiadacz dóbr', rdzen: 'possessor' },
    { id: 'dominus', nazwa: 'Pan (D.)', rdzen: 'dominus' },
    { id: 'nieslubne', nazwa: 'nieślubne dziecko', rdzen: 'nieslub' },
    { id: 'zapalenie', nazwa: 'zapalenie', rdzen: 'zapaleni' },
    { id: 'starosc', nazwa: 'starość', rdzen: 'starosc' },
    { id: 'starosc', nazwa: 'starość', rdzen: 'uwiad' },
    { id: 'ciezki-porod', nazwa: 'ciężki poród', rdzen: 'porod' },
    { id: 'ciezki-porod', nazwa: 'ciężki poród', rdzen: 'wpisalem' },  // formuła „Wpisałem ja…” (inscripsi)
    { id: 'zabkowanie', nazwa: 'ząbkowanie', rdzen: 'zabkowa' },
    { id: 'paraliz', nazwa: 'paraliż', rdzen: 'parali' }
  ];

  /* ------------------------------------------------------------ tekst */

  // małe litery bez polskich znaków; długość tekstu się nie zmienia (potrzebne do podświetlania)
  function fold(s) {
    s = String(s == null ? '' : s);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i).toLowerCase();
      if (c.length !== 1) { out += s.charAt(i); continue; }
      if (c === 'ł') { out += 'l'; continue; }
      var d = c.normalize('NFD');
      out += d.charAt(0);
    }
    return out;
  }
  function tokens(s) { return fold(s).match(/[a-z0-9]+/g) || []; }

  // końcówki odmiany: Kukuła ~ Kukuły ~ Kukułą; Gnojek ~ Gnojka
  function rdzen(q) {
    if (q.length >= 5 && /(ek|ec)$/.test(q)) { return q.slice(0, -2); }
    return q.length >= 4 ? q.slice(0, -1) : q;
  }
  function pasuje(t, q) {
    if (t === q) { return true; }
    if (q.length <= 3) { return t.indexOf(q) === 0 && t.length <= q.length + 3; }
    var s = rdzen(q);
    return t.indexOf(s) === 0 && t.length - s.length <= 5;
  }
  // 0 = brak, 1 = po rdzeniu, 2 = dokładnie; wszystkie szukane wyrazy muszą pasować
  function dopasowanie(szukane, wyrazy, dokladnie) {
    if (!szukane.length) { return 0; }
    var suma = 0;
    for (var i = 0; i < szukane.length; i++) {
      var q = szukane[i], m = 0;
      for (var j = 0; j < wyrazy.length; j++) {
        var t = wyrazy[j];
        if (t === q) { m = 2; break; }
        if (!dokladnie && m < 1 && pasuje(t, q)) { m = 1; }
      }
      if (!m) { return 0; }
      suma += m;
    }
    return suma / szukane.length;
  }

  /* ------------------------------------------------------------ stan i adres */

  var PARAMETRY = ['n', 'i', 'od', 'do', 'p', 't', 'pl', 'd', 'q', 'sz', 'dk', 's', 'o', 'str', 'pp', 'id'];
  var stan = { n: '', i: '', od: '', do: '', p: '', t: '', pl: '', d: '', q: '', sz: '1', dk: '', s: '', o: 'asc', str: 1, pp: 50, id: '' };

  function wczytajStanZAdresu() {
    var par = new URLSearchParams(location.search);
    PARAMETRY.forEach(function (k) { if (par.has(k)) { stan[k] = par.get(k); } });
    stan.str = Math.max(1, parseInt(stan.str, 10) || 1);
    stan.pp = [25, 50, 100].indexOf(parseInt(stan.pp, 10)) >= 0 ? parseInt(stan.pp, 10) : 50;
    if (stan.o !== 'desc') { stan.o = 'asc'; }
  }
  function zapiszStanDoAdresu() {
    var par = new URLSearchParams();
    PARAMETRY.forEach(function (k) {
      var v = stan[k];
      if (k === 'sz') { if (v !== '1') { par.set('sz', '0'); } return; }
      if (k === 'o') { if (stan.s && v === 'desc') { par.set('o', 'desc'); } return; }
      if (k === 'str') { if (v > 1) { par.set('str', v); } return; }
      if (k === 'pp') { if (v !== 50) { par.set('pp', v); } return; }
      if (v !== '' && v != null) { par.set(k, v); }
    });
    var qs = par.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* np. file:// */ }
  }

  /* ------------------------------------------------------------ dane */

  var manifest = null;
  var rekordy = [];
  var wynik = [];

  function przygotuj(r, zbior) {
    r._pid = zbior.parafia_id;
    r._n = tokens(r.nazwisko).concat(tokens(r.nazwisko_w_akcie));
    r._i = tokens(r.imie);
    r._rodz = tokens(r.matka).concat(tokens(r.ojciec), tokens(r.malzonek), tokens(r.imie_ojca), tokens(r.imie_matki), tokens(r.nazwisko_matki));
    r._opis = tokens(r.opis);
    r._calosc = r._opis.concat(r._rodz, tokens(r.przyczyna), tokens(r.dodatkowe), tokens(r.kaplan), tokens(r.imie), tokens(r.nazwisko));
    return r;
  }

  function filtruj() {
    var qn = tokens(stan.n), qi = tokens(stan.i), qt = tokens(stan.q);
    var szerzej = stan.sz === '1', dokladnie = stan.dk === '1';
    var od = parseInt(stan.od, 10), doo = parseInt(stan.do, 10);
    var dom = fold(stan.d).trim();
    var out = [];
    for (var k = 0; k < rekordy.length; k++) {
      var r = rekordy[k];
      if (stan.id) { if (r.id !== stan.id) { continue; } out.push(r); r._wynik = 0; continue; }
      if (stan.p && r._pid !== stan.p) { continue; }
      if (stan.t && r.typ !== stan.t) { continue; }
      if (stan.pl && r.plec !== stan.pl) { continue; }
      if (!isNaN(od) && r.rok < od) { continue; }
      if (!isNaN(doo) && r.rok > doo) { continue; }
      if (dom && fold(r.dom) !== dom) { continue; }
      var punkty = 0;
      if (qn.length) {
        var a = dopasowanie(qn, r._n, dokladnie);
        if (a) { punkty += a * 2; }
        else if (szerzej && dopasowanie(qn, r._rodz, dokladnie)) { punkty += 1.5; }  // mama, tata, małżonek
        else if (szerzej && dopasowanie(qn, r._opis, dokladnie)) { punkty += 1; }
        else { continue; }
      }
      if (qi.length) {
        var b = dopasowanie(qi, r._i, dokladnie);
        if (b) { punkty += b; }
        else if (szerzej && dopasowanie(qi, r._rodz, dokladnie)) { punkty += 0.75; }
        else if (szerzej && dopasowanie(qi, r._opis, dokladnie)) { punkty += 0.5; }
        else { continue; }
      }
      if (qt.length && !dopasowanie(qt, r._calosc, dokladnie)) { continue; }
      r._wynik = punkty;
      out.push(r);
    }
    return out;
  }

  /* ------------------------------------------------------------ sortowanie */

  var kolator = new Intl.Collator('pl', { numeric: true, sensitivity: 'base' });
  var WARTOSCI = {
    parafia: function (r) { return r.parafia; },
    rok: function (r) { return r.rok; },
    nr: function (r) { return r.nr; },
    data_zgonu: function (r) { return r.data_zgonu || null; },
    data_pogrzebu: function (r) { return r.data_pogrzebu || null; },
    nazwisko: function (r) { return r.nazwisko || null; },
    imie: function (r) { return r.imie || null; },
    imie_ojca: function (r) { return r.imie_ojca || null; },
    imie_matki: function (r) { return r.imie_matki || null; },
    nazwisko_matki: function (r) { return r.nazwisko_matki || null; },
    dodatkowe: function (r) { return r.dodatkowe || null; }
  };
  function porownaj(a, b) {
    if (typeof a === 'number' && typeof b === 'number') { return a - b; }
    return kolator.compare(String(a), String(b));
  }
  function domyslnie(a, b) {
    return porownaj(a.rok, b.rok) || porownaj(a.nr == null ? 1e9 : a.nr, b.nr == null ? 1e9 : b.nr);
  }
  function sortuj(lista) {
    var klucz = stan.s;
    var czyNazwa = tokens(stan.n).length || tokens(stan.i).length;
    if (!klucz && czyNazwa) {
      lista.sort(function (a, b) { return (b._wynik - a._wynik) || domyslnie(a, b); });
      return;
    }
    if (!klucz) { lista.sort(domyslnie); return; }
    var wart = WARTOSCI[klucz] || WARTOSCI.rok;
    var kier = stan.o === 'desc' ? -1 : 1;
    lista.sort(function (a, b) {
      var x = wart(a), y = wart(b);
      if (x == null && y == null) { return domyslnie(a, b); }
      if (x == null) { return 1; }   // puste zawsze na końcu
      if (y == null) { return -1; }
      return (porownaj(x, y) * kier) || domyslnie(a, b);
    });
  }

  /* ------------------------------------------------------------ rysowanie */

  function el(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') { e.className = attrs[k]; }
        else if (k === 'text') { e.textContent = attrs[k]; }
        else { e.setAttribute(k, attrs[k]); }
      });
    }
    var dzieci = Array.prototype.slice.call(arguments, 2);
    dzieci.forEach(function dodaj(c) {
      if (c == null || c === false) { return; }
      if (Array.isArray(c)) { c.forEach(dodaj); return; }
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  // tekst z podświetlonymi wyrazami pasującymi do zapytania
  function podswietl(tekst, szukane) {
    var frag = document.createDocumentFragment();
    if (!tekst) { return frag; }
    if (!szukane.length) { frag.appendChild(document.createTextNode(tekst)); return frag; }
    var f = fold(tekst), re = /[a-z0-9]+/g, m, od = 0;
    var dokladnie = stan.dk === '1';
    while ((m = re.exec(f))) {
      var trafia = szukane.some(function (q) { return dokladnie ? m[0] === q : pasuje(m[0], q); });
      if (!trafia) { continue; }
      if (m.index > od) { frag.appendChild(document.createTextNode(tekst.slice(od, m.index))); }
      frag.appendChild(el('mark', null, tekst.slice(m.index, m.index + m[0].length)));
      od = m.index + m[0].length;
    }
    if (od < tekst.length) { frag.appendChild(document.createTextNode(tekst.slice(od))); }
    return frag;
  }

  function komorka(klasa, zawartosc, pusty) {
    var td = el('td', { class: klasa + (zawartosc ? '' : ' brak') });
    if (zawartosc) { td.appendChild(typeof zawartosc === 'string' ? document.createTextNode(zawartosc) : zawartosc); }
    else { td.appendChild(document.createTextNode('—')); if (pusty) { td.title = pusty; } }
    return td;
  }

  // Link do skanu: szablon z dane/zrodla.json z numerem zdjęcia z Excela (kolumna „Skan”) albo zdjęciem domyślnym.
  function zrodlo(r) {
    var wpis = (manifest.zrodla || {})[r._pid + '/' + r.typ + '/' + r.rok];
    var typNazwa = r.typ === 'zgony' ? 'księga zgonów' : 'księga';
    var opis = typNazwa + ' ' + r.rok + ', parafia ' + r.parafia;
    if (r.skan && /^https?:\/\//i.test(r.skan)) {  // pełny link do skanu wpisany w Excelu (kolumna „Skan”)
      return el('a', { href: r.skan, target: '_blank', rel: 'noopener noreferrer' }, 'Zobacz skan tego aktu – ' + opis);
    }
    if (wpis && wpis.url) {
      var konkretny = !!r.skan;
      var plik = r.skan || wpis.plik_domyslny || '001.JPG';
      var href = wpis.url.replace('{plik}', encodeURIComponent(plik));
      var tekst = konkretny ? 'Zobacz skan tego aktu (zdjęcie ' + plik.replace(/\.[^.]+$/, '') + ')' : 'Zobacz księgę w Skanotece';
      return el('a', { href: href, target: '_blank', rel: 'noopener noreferrer' }, tekst + ' – ' + opis);
    }
    return document.createTextNode('Źródło: ' + opis + ' (Skanoteka; link do skanu pojawi się wkrótce)');
  }

  function szczegoly(r, szukane) {
    var fakty = [];
    // Pola w kolejności i pod nazwami kolumn z Excela; puste pokazujemy jako „—”, żeby widać było, czego brakuje.
    function fakt(etykieta, wartosc, zawsze, klasa) {
      if (!wartosc && !zawsze) { return; }
      wartosc = wartosc ? String(wartosc) : '';
      // każda wartość zaczyna się wielką literą (Żeńska, Katolickie, Ur. w Przytkowicach…)
      wartosc = wartosc.charAt(0).toUpperCase() + wartosc.slice(1);
      var dd = el('dd', { text: wartosc || '—' });
      if (klasa && wartosc) { dd.className = klasa; }
      fakty.push(el('div', null, el('dt', { text: etykieta }), dd));
    }
    var auto = !!r.rodzice_auto;
    var matka = r.matka || [r.imie_matki, r.nazwisko_matki].filter(Boolean).join(' ');
    var ojciec = r.ojciec || r.imie_ojca || '';
    function zOpisu(w) { return w && auto ? w + ' (wstępnie z opisu)' : w; }
    var imieNazwisko = [r.imie, r.nazwisko].filter(Boolean).join(' ');
    if (imieNazwisko && r.nazwisko_auto) { imieNazwisko += ' (nazwisko ojca z opisu – wstępnie)'; }
    if (imieNazwisko && r.nazwisko_wg_rodzica) { imieNazwisko += ' (nazwisko z opisu rodziców)'; }
    // numeracja aktów zaczyna się od 1 w każdym roku księgi, stąd rok w etykiecie
    fakt('Numer aktu w roku ' + r.rok, r.nr != null ? String(r.nr) : '', true);
    fakt('Data zgonu', W.formatData(r.data_zgonu) || 'niewidoczna na skanie', true);
    fakt('Data pogrzebu', W.formatData(r.data_pogrzebu), true);
    fakt('Data ślubu', W.formatData(r.data_slubu), true);
    fakt('Data narodzin', W.formatData(r.data_ur), true);
    fakt('Numer domu', r.dom, true);
    fakt('Imię nazwisko', imieNazwisko, true, r.nazwisko_auto ? 'auto' : '');
    fakt('Matka', zOpisu(matka), true, auto ? 'auto' : '');
    fakt('Ojciec', zOpisu(ojciec), true, auto ? 'auto' : '');
    fakt('Małżonek', zOpisu(r.malzonek), true, auto ? 'auto' : '');
    fakt('Wyznanie', r.religia === 'kat' ? 'katolickie' : (r.religia === 'inna' ? 'inne' : ''), true);
    fakt('Płeć', r.plec === 'K' ? 'żeńska' : (r.plec === 'M' ? 'męska' : ''), true);
    fakt('Wiek zmarłego', r.wiek, true);
    fakt('Przyczyna zgonu', r.przyczyna, true);
    fakt('Uwagi', r.dodatkowe, true);
    fakt('Kapłan', r.kaplan, true);
    fakt('Nazwisko w opisie aktu', r.nazwisko_w_akcie);
    fakt('Parafia', r.parafia);

    var link = location.origin + location.pathname + '?id=' + encodeURIComponent(r.id);
    var kopiuj = el('button', { type: 'button' }, 'Skopiuj link do tego aktu');
    kopiuj.addEventListener('click', function () {
      var gotowe = function () { kopiuj.textContent = 'Skopiowano ✓'; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(gotowe, function () { window.prompt('Skopiuj link:', link); });
      } else { window.prompt('Skopiuj link:', link); }
    });
    var blad = el('a', { href: 'kontakt.html?id=' + encodeURIComponent(r.id) }, 'Zgłoś błąd w tym akcie');
    // Słowniczek: ogólny link + bezpośrednie odnośniki do pojęć, które padają w tym akcie
    var pojecia = POJECIA.filter(function (p, i) {
      var pierwsze = POJECIA.findIndex(function (x) { return x.id === p.id && r._calosc.some(function (t) { return t.indexOf(x.rdzen) === 0; }); });
      return pierwsze === i;  // każde hasło raz, nawet gdy pasuje kilka form (starość / uwiąd)
    });
    var slownik = el('span', null, el('a', { href: 'slowniczek.html' }, 'Słowniczek'),
      pojecia.length ? [' (w tym akcie: '].concat(pojecia.map(function (p, i) {
        return [i ? ', ' : '', el('a', { href: 'slowniczek.html#' + p.id }, p.nazwa)];
      }), [')']) : null);

    return el('td', { colspan: String(KOLUMNY) },
      el('p', { class: 'opis-aktu' }, podswietl(r.opis, szukane)),
      el('dl', { class: 'fakty' }, fakty),
      el('div', { class: 'akcje' }, el('span', null, zrodlo(r)), kopiuj, blad, slownik)
    );
  }

  function wiersz(r, szukane, otwarty) {
    var nazwisko = r.nazwisko ? podswietl(r.nazwisko, szukane) : null;
    if (nazwisko && r.nazwisko_wg_rodzica) {
      nazwisko = el('span', { title: 'Nazwisko z opisu rodziców – w akcie brak nazwiska przy dziecku' }, nazwisko, el('span', { class: 'wzgl' }, ' (wg rodzica)'));
    }
    var przycisk = el('button', { type: 'button', class: 'rozwin', 'aria-expanded': otwarty ? 'true' : 'false', 'aria-label': 'Pokaż szczegóły aktu' });
    // imię/nazwisko rodziców wyciągnięte z opisu są oznaczone kursywą (jeszcze niesprawdzone)
    var klasaRodz = r.rodzice_auto ? ' auto' : '';
    var podpowiedz = r.rodzice_auto ? 'Wstępnie wyciągnięte z opisu aktu – do sprawdzenia' : '';
    function rodz(klasa, wartosc) {
      var td = komorka(klasa + klasaRodz + ' c-sr', wartosc);
      if (wartosc && podpowiedz) { td.title = podpowiedz; }
      return td;
    }
    var dod = r.dodatkowe ? el('div', { class: 'dod', title: r.dodatkowe }, r.dodatkowe) : null;
    // nazwisko wzięte z opisu (nazwisko ojca przy zamężnej kobiecie, nazwisko z rodziców) – kursywą, do sprawdzenia
    var tdNazwisko = komorka('nazwisko' + (r.nazwisko_auto || r.nazwisko_wg_rodzica ? ' auto' : ''), nazwisko);
    if (r.nazwisko_auto) { tdNazwisko.title = 'Nazwisko ojca z opisu aktu – wstępnie, do sprawdzenia'; }
    var tr = el('tr', { class: 'wiersz' },
      el('td', null, przycisk),
      komorka('liczba', String(r.rok)),
      komorka('data c-sr', W.formatData(r.data_zgonu), 'data zgonu niewidoczna na skanie'),
      komorka('data', W.formatData(r.data_pogrzebu), 'brak daty pogrzebu'),
      komorka('', r.imie ? podswietl(r.imie, szukane) : null),
      tdNazwisko,
      rodz('', r.imie_ojca),
      rodz('', r.imie_matki),
      rodz('', r.nazwisko_matki),
      komorka('c-duze', r.parafia),
      komorka('c-dod', dod)
    );
    var det = el('tr', { class: 'szczegoly' });
    det.hidden = !otwarty;
    if (otwarty) { det.appendChild(szczegoly(r, szukane)); }
    var przelacz = function () {
      var otw = det.hidden;
      if (otw && !det.firstChild) { det.appendChild(szczegoly(r, szukane)); }
      det.hidden = !otw;
      przycisk.setAttribute('aria-expanded', otw ? 'true' : 'false');
    };
    przycisk.addEventListener('click', przelacz);
    tr.addEventListener('click', function (e) { if (!e.target.closest('a, button, mark')) { przelacz(); } });
    return [tr, det];
  }

  var dom = {};

  function rysuj() {
    var szukane = tokens(stan.n).concat(tokens(stan.i), tokens(stan.q));
    var razem = wynik.length;
    var stron = Math.max(1, Math.ceil(razem / stan.pp));
    if (stan.str > stron) { stan.str = stron; }
    var start = (stan.str - 1) * stan.pp;
    var strona = wynik.slice(start, start + stan.pp);

    dom.licznik.textContent = razem === 0 ? 'Brak wyników'
      : 'Znaleziono ' + razem + ' ' + W.liczebnik(razem, 'akt', 'akty', 'aktów');

    var frag = document.createDocumentFragment();
    strona.forEach(function (r) {
      wiersz(r, szukane, !!stan.id).forEach(function (tr) { frag.appendChild(tr); });
    });
    dom.wiersze.textContent = '';
    dom.wiersze.appendChild(frag);
    dom.tabela.hidden = razem === 0;

    dom.brak.hidden = razem !== 0;
    if (razem === 0) {
      dom.brak.textContent = '';
      dom.brak.appendChild(document.createTextNode(
        'Nic nie znaleziono. Spróbuj bez końcówki lub bez polskich znaków, zaznacz szukanie wśród rodziców i małżonków, ' +
        'rozszerz zakres lat albo wyczyść pozostałe pola. W bazie są tylko akty, które już przetłumaczyłem.'));
    } else if (stan.id) {
      dom.brak.hidden = false;
      dom.brak.textContent = '';
      var wszystkie = el('a', { href: location.pathname }, 'Pokaż wszystkie akty');
      dom.brak.appendChild(document.createTextNode('Widok pojedynczego aktu. '));
      dom.brak.appendChild(wszystkie);
    }

    // nagłówki: sortowanie
    var aktywny = stan.s || (tokens(stan.n).length || tokens(stan.i).length ? '' : 'rok');
    dom.naglowki.forEach(function (th) {
      var jest = th.getAttribute('data-sort') === aktywny;
      th.setAttribute('aria-sort', jest ? (stan.o === 'desc' ? 'descending' : 'ascending') : 'none');
    });

    dom.strony.hidden = stron <= 1;
    dom.stronaInfo.textContent = 'Strona ' + stan.str + ' z ' + stron;
    dom.poprzednia.disabled = stan.str <= 1;
    dom.nastepna.disabled = stan.str >= stron;
  }

  function szukaj(zachowajStrone) {
    if (!zachowajStrone) { stan.str = 1; }
    wynik = filtruj();
    sortuj(wynik);
    zapiszStanDoAdresu();
    rysuj();
  }

  /* ------------------------------------------------------------ formularz */

  function odczytajFormularz() {
    var f = dom.formularz.elements;
    ['n', 'i', 'od', 'do', 'p', 't', 'pl', 'd', 'q'].forEach(function (k) { stan[k] = (f[k].value || '').trim(); });
    stan.sz = f.sz.checked ? '1' : '0';
    stan.dk = f.dk.checked ? '1' : '';
    stan.id = '';
  }
  function wypelnijFormularz() {
    var f = dom.formularz.elements;
    ['n', 'i', 'od', 'do', 'p', 't', 'pl', 'd', 'q'].forEach(function (k) { f[k].value = stan[k]; });
    f.sz.checked = stan.sz !== '0';
    f.dk.checked = stan.dk === '1';
    dom.naStronie.value = String(stan.pp);
    // ukryte kryteria nie mogą działać po cichu – gdy któreś jest ustawione, pokaż je
    if (stan.t || stan.pl || stan.d || stan.q) { document.getElementById('wiecej').open = true; }
  }
  function opoznij(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  function wypelnijListy() {
    var parafie = {}, typy = {};
    manifest.zbiory.forEach(function (z) { parafie[z.parafia_id] = z.parafia; typy[z.typ] = true; });
    var sp = dom.formularz.elements.p, st = dom.formularz.elements.t;
    Object.keys(parafie).sort(function (a, b) { return kolator.compare(parafie[a], parafie[b]); })
      .forEach(function (id) { sp.appendChild(el('option', { value: id }, parafie[id])); });
    Object.keys(typy).forEach(function (t) { st.appendChild(el('option', { value: t }, W.TYPY[t] || t)); });
  }

  function opisBazy() {
    var lacznie = rekordy.length;
    var czesci = manifest.zbiory.map(function (z) {
      return z.parafia + ' – ' + (W.TYPY[z.typ] || z.typ).toLowerCase() + ' ' + W.skrocLata(z.lata);
    });
    return 'W bazie: ' + lacznie + ' ' + W.liczebnik(lacznie, 'akt', 'akty', 'aktów') + ' (' + czesci.join('; ') + '). Baza stale rośnie.';
  }

  function powiaz() {
    var opozniony = opoznij(function () { odczytajFormularz(); szukaj(false); }, 180);
    dom.formularz.addEventListener('input', opozniony);
    dom.formularz.addEventListener('change', opozniony);
    dom.formularz.addEventListener('submit', function (e) { e.preventDefault(); odczytajFormularz(); szukaj(false); dom.wyniki.focus({ preventScroll: false }); });
    dom.formularz.addEventListener('reset', function () {
      setTimeout(function () {
        stan.n = stan.i = stan.od = stan.do = stan.p = stan.t = stan.pl = stan.d = stan.q = stan.id = '';
        stan.sz = '1'; stan.dk = ''; stan.s = ''; stan.o = 'asc';
        wypelnijFormularz();
        dom.formularz.elements.sz.checked = true;
        szukaj(false);
      }, 0);
    });
    dom.naglowki.forEach(function (th) {
      th.querySelector('button').addEventListener('click', function () {
        var k = th.getAttribute('data-sort');
        var biezacy = stan.s || (tokens(stan.n).length || tokens(stan.i).length ? '' : 'rok');
        if (biezacy === k) { stan.o = stan.o === 'asc' ? 'desc' : 'asc'; } else { stan.s = k; stan.o = 'asc'; }
        stan.s = k;
        szukaj(false);
      });
    });
    dom.naStronie.addEventListener('change', function () { stan.pp = parseInt(dom.naStronie.value, 10); szukaj(false); });
    dom.poprzednia.addEventListener('click', function () { stan.str--; zapiszStanDoAdresu(); rysuj(); dom.wyniki.scrollIntoView(); });
    dom.nastepna.addEventListener('click', function () { stan.str++; zapiszStanDoAdresu(); rysuj(); dom.wyniki.scrollIntoView(); });
  }

  /* ------------------------------------------------------------ start */

  function blad(tekst) {
    dom.stan.textContent = '';
    dom.stan.appendChild(document.createTextNode(tekst));
    dom.licznik.textContent = 'Nie udało się wczytać danych';
  }

  function start() {
    dom = {
      formularz: document.getElementById('formularz'),
      stan: document.getElementById('stan-bazy'),
      wyniki: document.getElementById('wyniki'),
      licznik: document.getElementById('wyniki-naglowek'),
      brak: document.getElementById('brak-wynikow'),
      tabela: document.getElementById('tabela'),
      wiersze: document.getElementById('wiersze'),
      naglowki: Array.prototype.slice.call(document.querySelectorAll('#tabela thead th[data-sort]')),
      strony: document.getElementById('strony'),
      stronaInfo: document.getElementById('strona-info'),
      poprzednia: document.getElementById('poprzednia'),
      nastepna: document.getElementById('nastepna'),
      naStronie: document.getElementById('na-stronie')
    };
    dom.tabela.hidden = true;

    W.loadManifest().then(function (m) {
      manifest = m;
      var licencja = document.getElementById('licencja');
      if (m.licencja) { licencja.textContent = m.licencja.nazwa; licencja.href = m.licencja.url; }
      return Promise.all(m.zbiory.map(function (z) {
        return W.loadJson('data/' + z.plik).then(function (d) {
          return d.rekordy.map(function (r) { return przygotuj(r, z); });
        });
      }));
    }).then(function (grupy) {
      rekordy = [].concat.apply([], grupy);
      wypelnijListy();
      wczytajStanZAdresu();
      wypelnijFormularz();
      powiaz();
      dom.stan.textContent = opisBazy();
      szukaj(true);
    }).catch(function (e) {
      blad('Nie udało się wczytać danych (' + e.message + '). Jeśli otwierasz stronę z dysku, uruchom ją przez serwer: python -m http.server -d docs');
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', start); } else { start(); }
})();
