/* Wspólne funkcje strony: wczytanie manifestu, formatowanie dat i lat. */
(function () {
  'use strict';

  var TYPY = {
    zgony: 'Zgony',
    urodzenia: 'Urodzenia i chrzty',
    malzenstwa: 'Małżeństwa'
  };

  function loadJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) { throw new Error(url + ': ' + r.status); }
      return r.json();
    });
  }

  function loadManifest() {
    return loadJson('data/manifest.json');
  }

  /* '1941-06-07' -> '7.6.1941'; '1928' -> '1928'; brak -> '' */
  function formatData(iso) {
    if (!iso) { return ''; }
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (m) { return (+m[3]) + '.' + (+m[2]) + '.' + m[1]; }
    var mr = /^(\d{4})-(\d{2})$/.exec(iso);  // znany tylko miesiąc i rok
    return mr ? (+mr[2]) + '.' + mr[1] : String(iso);
  }

  /* [1881,1882,1883,1890] -> '1881–1883, 1890' */
  function skrocLata(lata) {
    var a = lata.slice().sort(function (x, y) { return x - y; });
    var out = [];
    for (var i = 0; i < a.length; i++) {
      var j = i;
      while (j + 1 < a.length && a[j + 1] === a[j] + 1) { j++; }
      out.push(j > i ? a[i] + '–' + a[j] : String(a[i]));
      i = j;
    }
    return out.join(', ');
  }

  function liczebnik(n, jeden, kilka, wiele) {
    var d = n % 10, dd = n % 100;
    if (n === 1) { return jeden; }
    if (d >= 2 && d <= 4 && !(dd >= 12 && dd <= 14)) { return kilka; }
    return wiele;
  }

  window.Wadobaza = {
    TYPY: TYPY,
    loadJson: loadJson,
    loadManifest: loadManifest,
    formatData: formatData,
    skrocLata: skrocLata,
    liczebnik: liczebnik
  };
})();
