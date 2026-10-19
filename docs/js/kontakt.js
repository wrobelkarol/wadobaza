/* Wadobaza – formularz kontaktu i zgłoszeń błędów. */
(function () {
  'use strict';

  // Adres funkcji, która wysyła e-mail przez Resend (np. https://…/api/zglos).
  // Dopóki jest pusty, formularz informuje, że wysyłanie jeszcze nie działa.
  // Klucza API Resend NIE wpisujemy tutaj – strona jest publiczna; klucz trzyma funkcja po stronie serwera.
  var ENDPOINT = '';

  var W = window.Wadobaza;
  var form = document.getElementById('formularz-kontakt');
  var status = document.getElementById('status');
  var przycisk = document.getElementById('wyslij');
  var id = new URLSearchParams(location.search).get('id') || '';
  var opisAktu = '';

  function pokazStatus(tekst, rodzaj) {
    status.textContent = tekst;
    status.className = 'status' + (rodzaj ? ' status-' + rodzaj : '');
  }

  if (!ENDPOINT) {
    document.getElementById('nieaktywny').hidden = false;
    przycisk.disabled = true;
  }

  // Zgłoszenie z konkretnego aktu: pokaż, którego dotyczy
  if (id) {
    document.getElementById('tytul').textContent = 'Zgłoś błąd w akcie';
    form.elements.akt_id.value = id;
    form.elements.typ.value = 'blad';
    var akt = document.getElementById('akt');
    akt.hidden = false;
    akt.textContent = 'Dotyczy aktu: ' + id;
    W.loadManifest().then(function (m) {
      return Promise.all(m.zbiory.map(function (z) { return W.loadJson('data/' + z.plik); }));
    }).then(function (zbiory) {
      var r = null;
      zbiory.some(function (z) { r = z.rekordy.filter(function (x) { return x.id === id; })[0] || null; return !!r; });
      if (!r) { return; }
      var kto = [r.imie, r.nazwisko].filter(Boolean).join(' ');
      opisAktu = (W.TYPY[r.typ] || r.typ) + ' ' + r.rok + (r.nr != null ? ', akt nr ' + r.nr : '') +
        (kto ? ' – ' + kto : '') + ' (parafia ' + r.parafia + ')';
      akt.textContent = 'Dotyczy aktu: ' + opisAktu + '. ';
      var link = document.createElement('a');
      link.href = './?id=' + encodeURIComponent(id);
      link.textContent = 'Zobacz akt';
      akt.appendChild(link);
    }).catch(function () { /* zostaje sam identyfikator aktu */ });
  } else {
    form.elements.typ.value = 'inne';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) { return; }
    if (form.elements.www.value) {  // bot wypełnił pole-pułapkę – udajemy sukces
      form.reset();
      pokazStatus('Dziękuję, wiadomość została wysłana.', 'ok');
      return;
    }
    if (!ENDPOINT) {
      pokazStatus('Wysyłanie formularza zostanie uruchomione wkrótce.', 'blad');
      return;
    }
    var dane = {
      typ: form.elements.typ.value,
      tresc: form.elements.tresc.value.trim(),
      imie: form.elements.imie.value.trim(),
      email: form.elements.email.value.trim(),
      akt_id: form.elements.akt_id.value,
      akt_opis: opisAktu,
      strona: location.href
    };
    przycisk.disabled = true;
    pokazStatus('Wysyłam…');
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dane)
    }).then(function (odp) {
      if (!odp.ok) { throw new Error(String(odp.status)); }
      form.reset();
      if (id) { form.elements.akt_id.value = id; form.elements.typ.value = 'blad'; }
      pokazStatus('Dziękuję, wiadomość została wysłana.', 'ok');
    }).catch(function () {
      pokazStatus('Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę.', 'blad');
    }).then(function () { przycisk.disabled = false; });
  });
})();
