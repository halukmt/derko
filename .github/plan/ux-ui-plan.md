# Plan: UX/UI Feedback Einarbeitung (feature/feedback → dev)

## Validierung des Feedbacks

### Feedback-Punkte und ihr Status im Code

| Feedback-Punkt | Validierung | Befund |
|---|---|---|
| Captcha broken | FALSIFIED (Testumgebung) | Captcha-Code korrekt implementiert. Fehlschlag beim Kollegen wegen fehlendem PHP-Server (Sessions nicht verfügbar). ABER: `$debug = true` ist hardcoded in `api/captcha.php:10` → muss in `false` geändert werden |
| Wohnung vorausgewählt (URL-Param) | CONFIRMED | `kontakt.js` hat keine `URLSearchParams`-Logik. `populateApartmentSelect()` setzt keine Vorauswahl |
| Gesamtkarte klickbar | CONFIRMED | `components/card.html`: Nur `<a class="link-button">` ist klickbar, nicht die gesamte Karte |
| CTA „Angebot anfragen" sticky | CONFIRMED | `pages/wohnung-detail.html:81`: Nur normaler inline `<a class="btn">`, kein sticky/fixed-Positioning |
| Formular einspaltig | CONFIRMED | `pages/kontakt.html`: alle Felder mit `col-md-6` (zweispaltig ab md) |
| Ausrufezeichen in Labels | NOT CONFIRMED | Keine `!` in `lang/de/de.json` Formularfeldern. Evtl. Bootstrap-Validation-Indikatoren oder andere Sprachen |
| Hero-Headline generisch | CONFIRMED | `lang/de/de.json:44`: „Willkommen bei DERKO Immobilien" – kein Nutzenversprechen |
| Feature Cards klickbar | CONFIRMED | `index.html`: Cards per JS injiziert, kein Klick-Handler, keine Links |
| Navigation „Startseite" | CONFIRMED | `components/header.html`: Home-Link = Icon + `visually-hidden` Text, kein sichtbares Label |
| Weißraum allgemein | REASONABLE | Nicht direkt messbar ohne visuellen Test, aber strukturell sinnvoll |
| Voice/LLM-Anfrage | NEW FEATURE | Nicht implementiert – Phase 3, Cloud-Aufwand |
| FAQ immer ausgeklappt | UNCONFIRMED | Bitte visuell prüfen |

---

## Agent: Cloud (Copilot)
*Alle Änderungen werden vom Copilot Cloud Agent umgesetzt. PHP-Dateien können bearbeitet werden. Verifikation von CAPTCHA, Sessions und Mail-Versand muss nach dem Merge manuell mit `npm run serve:php` (Docker) geprüft werden.*

### Phase 1 – Quick Wins

**1. Gesamte Wohnungskarte klickbar machen**
- Datei: `components/card.html`
- Änderung: Wrapper-`<div class="card ...">` durch `<a>` ersetzen ODER `cursor:pointer` + JS-Klick-Handler, der auf den Button-href navigiert
- Referenz: `main.js` — `btn.setAttribute('href', ...)` — gleichen href auf die Karte anwenden
- i18n: keine Änderung nötig
- Parallel mit Schritt 2

**2. CTA „Angebot anfragen" sticky auf Detailseite**
- Datei: `pages/wohnung-detail.html`
- Entscheidung: **Sticky-in-Content** (kein Fixed-Bottom, kein Konflikt mit WhatsApp-FAB)
- Änderung: Den bestehenden `<a class="btn" data-i18n="wohnungDetail.cta">` in einen `position: sticky` Container einbetten, der beim Scrollen im sichtbaren Bereich bleibt
- Datei: `assets/css/style.css` — CSS-Klasse `.cta-sticky` mit `position: sticky; top: 72px; z-index: 100`
- Parallel mit Schritt 1

**3. Wohnung im Kontaktformular vorausgewählt (URL-Parameter)**
- Datei: `assets/js/kontakt.js`
- Änderung: Nach `populateApartmentSelect()` einen `URLSearchParams`-Check einbauen, der `?wohnung=<key>` liest und den entsprechenden `<option>` selektiert
- Datei: `pages/wohnung-detail.html` — den CTA-Link auf `/pages/kontakt.html?wohnung=<id>` anpassen; die `id` kommt aus `URLSearchParams('id')` der aktuellen Seite
- Datei: `assets/js/wohnung-detail.js` — prüfen ob `id` schon geparst wird und den Link dynamisch setzen
- *Depends on Step 2 (CTA-Link muss aktualisiert werden)*

**4. Formular einspaltig + Felder größer**
- Datei: `pages/kontakt.html`
- Änderung: `col-md-6` → `col-12` bei allen Formularfeldern
- Eingabefelder mit Bootstrap-Klasse `form-control-lg` versehen
- Parallel mit Schritt 3

### Phase 2 – Mid Effort

**5. Hero-Headline erneuern (alle 9 Sprachen)**
- Scope: `lang/de/de.json`, `lang/en/en.json`, `lang/pl/pl.json`, `lang/hu/hu.json`, `lang/sk/sk.json`, `lang/cs/cs.json`, `lang/it/it.json`, `lang/bg/bg.json`, `lang/ro/ro.json`
- Key: `home.headline` (aktuell: „Willkommen bei DERKO Immobilien")
- Alle 9 Sprachen müssen synchron geändert werden

**Vorgeschlagene Texte (`home.headline`):**

| Sprache | Neu |
|---|---|
| DE | Auf Montage? Bei DERKO sind Sie gut untergebracht. |
| EN | Away for work? DERKO has a home for you. |
| PL | Na delegacji? U DERKO jesteś dobrze zadbany. |
| HU | Munkán vagy? A DERKO-nál jó kezekben van. |
| SK | Na montáži? U DERKO ste dobre postarané. |
| CS | Na montáži? U DERKO jste v dobrých rukou. |
| IT | In trasferta? Con DERKO sei a casa. |
| BG | На монтаж? При DERKO сте добре настанени. |
| RO | La lucru în altă localitate? La DERKO ești bine cazat. |

**6. Feature Cards klickbar machen**
- Entscheidung: Feature Cards mit Links zu `/pages/wohnungen.html` versehen
- Dateien: `assets/js/main.js` — Klick-Handler oder Link-Wrapper beim Rendern der Feature Cards hinzufügen

**7. Navigation Home-Label sichtbar**
- Datei: `components/header.html`
- Änderung: `<span class="visually-hidden" data-nav-label>` → Klasse `visually-hidden` entfernen, damit der Text sichtbar wird
- i18n-Key prüfen der tatsächlich gerendert wird

**8. Weißraum / Padding**
- Datei: `assets/css/style.css`
- Änderung: Sektions-Padding erhöhen, Textblock-Margins vergrößern

### Phase 3 – Backend Fixes

**9. Captcha Debug-Modus deaktivieren**
- Datei: `api/captcha.php`
- Änderung: Zeile 10: `$debug = true;` → `$debug = false;`
- Anmerkung: Das Captcha ist technisch korrekt implementiert. Das gemeldete „Broken"-Problem entstand durch fehlenden PHP-Server beim Test. Trotzdem muss der Debug-Modus vor Deploy auf `false` gesetzt werden.
- Verifikation: Kontaktformular auf einem PHP-Server aufrufen, CAPTCHA-Bild erscheint und Eingabe wird validiert

**10. CTA-Link Backend-Durchreichung prüfen**
- Sicherstellen, dass `?wohnung=<key>` korrekt sanitiert wird (kein Inject-Risiko)
- Datei: `api/sendmail.php` — bestehende Sanitierung greift, da Wohnungskey nur aus einer vordefinierten Liste stammt (client-side select)

### Phase 4 – Advanced Features

**11. Voice/LLM-Anfrage MVP**
- Neue Datei: `assets/js/voice-input.js`
- Neue API: `api/voice-process.php` (Transkription → LLM-Extraktion → Formularbefüllung)
- Integration: Web Speech API für Mobilgeräte, Whisper-API als Fallback
- Externe Abhängigkeit: OpenAI/Whisper API-Key in `api/config.local.php`
- CSP-Anpassung in `.htaccess` für externe API-Calls nötig
- *Zuerst Web-MVP, dann optional Telefonkanal*

---

## Relevante Dateien

| Datei | Änderung |
|---|---|
| `components/card.html` | Gesamtkarte klickbar (Phase 1) |
| `assets/js/main.js` | Card-href auf Karten-Wrapper anwenden + Feature Cards klickbar |
| `pages/wohnung-detail.html` | CTA sticky + Link mit ?wohnung-Param |
| `assets/js/wohnung-detail.js` | Wohnungs-ID für CTA-Link auslesen |
| `assets/js/kontakt.js` | URLSearchParams → Wohnung vorausgewählt |
| `pages/kontakt.html` | col-12 + form-control-lg |
| `components/header.html` | Home-Label sichtbar |
| `assets/css/style.css` | Sticky CTA CSS + Weißraum |
| `lang/*/xx.json` (9 Dateien) | Hero-Headline alle Sprachen |
| `api/captcha.php` | Debug-Flag auf false |

---

## Verifikation

1. **Lokal (npx http-server):** Wohnungskarten klickbar? Feature Cards klickbar? Sticky CTA sichtbar? Formular einspaltig? Nav-Label sichtbar?
2. **URL-Param:** Von `/pages/wohnung-detail.html?id=w01_derko_apart` → CTA → Kontaktformular → Wohnung vorausgewählt?
3. **PHP-Server:** CAPTCHA ladet und Eingabe wird korrekt validiert? Debug-Log nicht mehr beschrieben?
4. **i18n:** Alle 9 Sprachen laden Hero-Headline korrekt? Browser-Konsole zeigt keine fehlenden Keys?
5. **CSP:** Browser-Konsole zeigt keine CSP-Fehler nach allen Änderungen?
6. **Build:** `npm run build` läuft fehlerfrei durch, `dist/` enthält alle geänderten Dateien?

---

## Offene Fragen / Entscheidungen

1. **Hero-Headline DE**: Vorgeschlagener Text „Auf Montage? Bei DERKO sind Sie gut untergebracht." — bitte abnehmen, dann alle 9 Sprachen umsetzen.

---

## Out of Scope (dieses PRs)
- Verfügbarkeits-Synchronisation (erfordert externes Buchungssystem)
- Telefon-Voice-Agent (Twilio/Placetel)
- FAQ-Chatbot / agentische FAQ
- „Über uns" redaktioneller Inhalt
- Problem-Section für Handwerker auf Startseite
