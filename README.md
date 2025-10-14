# DERKO Immobilien – Website

Moderne, mehrsprachige Website mit statischem Frontend und kleinem PHP-Backend für Mailversand und CAPTCHA. Strikte CSP, keine Inline-Skripte.

## Features
- Bootstrap 5.3 (CDN), Font Awesome, Inter Font
- Komponenten (Header, Footer, Cards) via Fetch – kein Build-Tool notwendig
- i18n mit JSON-Struktur + HTML-Partials für Rechtstexte
- Dynamische Feature-Cards & Wohnungs-Cards
- JSON-LD (WebSite & dynamisch generierte Collection/Apartments)
- Strenge Content-Security-Policy (keine inline Skripte nötig)
- Einheitliches Button-/Branding-Design (CSS Custom Properties)
- Barrierefreiheit: Skip-Link, ARIA, Fokus-Ring, semantische Überschriften

## Projektstruktur
```
assets/
	css/style.css
	js/lang.js        # i18n Loader & Sanitizer
	js/main.js        # Komponenten, Cards, JSON-LD
	img/...           # Bilder & Icons
components/
	header.html
	footer.html
	card.html         # <template> mit Varianten (feature | wohnung)
lang/
	de/de.json
	en/en.json
pages/
	*.html            # Unterseiten (werden unter /pages/ ausgeliefert)
index.html          # Startseite
404.html            # Fehlerseite (noindex)
```

## Lokale Entwicklung
Einfachen HTTP Server starten (weil Fetch für Komponenten / i18n benötigt wird). Für das PHP-Backend (Mail & CAPTCHA) bitte den PHP Built-in Server nutzen:

```powershell
cd C:\zdev\derko
# PHP Built-in Server (empfohlen)
php -S localhost:8080 -t .
# Alternativ, nur statisch (ohne PHP-Endpunkte):
npx http-server -p 8080
```

Aufrufen: http://localhost:8080/

## Internationalisierung (i18n)
Struktur (verschachtelt): `lang/<code>/<code>.json`

Unterstützte Konstrukte:
- `data-i18n` für Plaintext / minimal HTML
- `data-i18n-meta` für `<meta>` Content
- `data-i18n-html` für längere HTML-Bereiche oder ausgelagerte Partials (Dateipfad als Wert)

Beispiel Ausschnitt (`de/de.json`):
```json
{
	"home": { "headline": "Willkommen ..." },
	"wohnungen": {
		"cards": {
			"rahm": { "title": "Wohnung Rahm", "text": "Geräumige Unterkunft ...", "button": "Details ansehen" }
		}
	}
}
```

## Feature-Cards (Startseite)
Im Code fest definiert (`main.js` → `renderFeatureCards`). Bilder: `assets/img/allgemein/komfort|zentral|fair.png`.
Für weitere Vorteile: Array in `main.js` erweitern (Icon, Title-Key, Text-Key, Bild).

## Wohnungs-Cards (dynamisch)
Die Seite `pages/wohnungen.html` enthält ein DIV mit:
```html
<div id="wohnung-list" data-cards='[{"key":"rahm","img":"/assets/img/wohnungen/rahm/main.jpg","alt":"Wohnung Rahm"}]'></div>
```

`main.js` liest `data-cards` (JSON Array) und baut für jeden Eintrag eine Card basierend auf Keys in den Sprachdateien:

Key-Konvention:
```
wohnungen.cards.<key>.title
wohnungen.cards.<key>.text
wohnungen.cards.<key>.button
```

### Neue Wohnung hinzufügen – Schritt für Schritt
1. Bilder ablegen, z.B.: `assets/img/wohnungen/meinobjekt/main.jpg`
2. Sprachdateien erweitern:
```json
"wohnungen": {
	"cards": {
		"meinobjekt": {
			"title": "Wohnung Mein Objekt",
			"text": "Kurzer Beschreibungstext ...",
			"button": "Details ansehen"
		}
	}
}
```
3. In `pages/wohnungen.html` im `data-cards` Array ergänzen:
```json
{"key":"meinobjekt","img":"/assets/img/wohnungen/meinobjekt/main.jpg","alt":"Wohnung Mein Objekt"}
```
4. Seite neu laden. (Cache leeren falls Keys nicht sofort erscheinen.)

Fallback: Falls kein `data-cards` gesetzt → eine Legacy-Karte mit Schlüssel `wohnungen.card.*`.

### Barrierefreiheit & Alt-Texte
`alt` aus `data-cards` wird direkt genutzt. Für lokalisierte Alt-Texte könnte `data-i18n` Konzept erweitert werden (aktuell nicht nötig).

## JSON-LD
- Startseite: `WebSite` + Publisher Logo.
- Wohnungen: Dynamisch erzeugtes `CollectionPage` + `Apartment` Einträge (Titel & Beschreibung lokalisiert).

## Sicherheit
- CSP ohne `unsafe-inline` / Hash: alle Skripte extern oder dynamisch DOM-generiert.
- Sanitizing in `lang.js` Whitelist (Tags & Attribute) für Übersetzungen und HTML-Partials.
- Kontaktformular zusätzliche Schutzschicht (Server):
	- IP-Rate-Limit: max 3 Einsendungen / 10 Minuten (429 bei Überschreitung)
	- Honeypot + Mindestzeit + CAPTCHA (bereits vorhanden)
	- Eingabefeld-Sanitizing (Strip Tags, Zeichensatz-Whitelist, Längenbegrenzung)
	- Limitierte Anzahl URLs in Nachricht (max 2) zur Spam-Eindämmung
	- Blockierung einfacher Wegwerf-Domains (mailinator, trashmail, tempmail, 10minutemail)
	- Zufällige Antwort-Verzögerung (80–220 ms) gegen Timing-Angriffe
	- Header-Säuberung (CRLF Removal) in `safe_header()`

### SPF / DKIM Empfehlung
- SPF-Record Beispiel (Strato, nur Mailserver + Webserver):
	`v=spf1 a mx include:strato.com ~all`
- DKIM: Über Strato-Panel aktivieren (Schlüsselpaar + DNS TXT). Sicherstellen, dass Selector im DNS korrekt hinterlegt ist.
- DMARC für Analyse/Policy:
	`_dmarc.derko-immobilien.de TXT "v=DMARC1; p=none; rua=mailto:dmarc@derko-immobilien.de"`
	Nach Auswertung später p=quarantine oder p=reject setzen.

Zustellbarkeit testen:
1. Testmail an Mail-Tester oder Gmail senden.
2. Header prüfen (Authentication-Results: SPF=pass DKIM=pass DMARC=pass).
3. Bei Problemen: DNS TTL, korrekte Absenderadresse (`FROM` Domain) und keine HTML-Injection sicherstellen.

## Navigation
- Alle Links absolut (`/`, `/pages/...`) → robust bei 404 & Deep Links.
- Aktive Seite wird nach Komponenten-Load + i18n markiert.

## Cards Template
`components/card.html` enthält `<template id="card-template">` mit Varianten:
```html
<div class="card" data-variant="feature"> ... </div>
<div class="card d-none" data-variant="wohnung"> ... </div>
```
JS klont immer die passende Variante.

## E-Mail-Versand
Produktiver Versand ohne Drittanbieter via `api/sendmail.php` (Strato‑kompatibel über `mail()`):

- Formular: `pages/kontakt.html` → `action="../api/sendmail.php"`, Methode POST
- Pflichtfelder: Name, E‑Mail, Telefon, Thema, Nachricht, Datenschutz; bei Thema=booking zusätzlich: Von/Bis/Wohnung/Personen
- Betreffschema: `Thema - Name - Anfrage-ID: DDMMYYHHMM`
- Versand: 1) an Betreiber, 2) Bestätigung an Absender (Reply‑To = Absender)
- Weiterleitung nach Erfolg: `/pages/bestaetigung.html`

Konfiguration (Empfänger/Absender) in `api/sendmail.php`:

```php
$TO   = 'social@techsulting.de';      // Zieladresse
$FROM = 'kontakt@derko-immobilien.de';// Absender (Domain‑Adresse)
```

Hinweise Zustellbarkeit:
- FROM sollte zu deiner Domain gehören (SPF/DMARC prüfen).
- Bei Bedarf später SMTP/PHPMailer einsetzen (gleiches Endpoint, anderer Versandweg).

## Datenschutz-/Cookie-Banner (TTDSG)
- Informativ (keine Analytics; nur essentielle Dienste):
	- PHP Session-Cookie für CAPTCHA auf der Kontaktseite
	- `localStorage` für Sprachpräferenz und Banner-Einwilligung
- Banner: Vollbreite, dimmender Backdrop, gestapelte gleich breite Buttons
	- „Verstanden“: setzt `localStorage.siteConsent`
	- „Datenschutz“: öffnet die Datenschutzseite
- Texte über i18n (`site.cookie.*`) gepflegt.

Banner erneut anzeigen (lokal testen):
```js
localStorage.removeItem('siteConsent'); location.reload();
```

## Deployment Hinweise
- `robots.txt` & `sitemap.xml` sind vorhanden (Sitemap verweist in `robots.txt`).
- Empfohlen: Richtigen HTTP 404 Status für `404.html` serverseitig setzen.
- Optional: Lokales Hosten der Fonts für Datenschutz.

Sicherheit & CSP:
- Keine Dritt‑Domains nötig; `form-action 'self'` bleibt erhalten.
- Serverseitige Header‑Injection vorbeugt (`\r\n` entfernt), Minimal‑Validierung vorhanden.

Bestätigungsseite:
- `pages/bestaetigung.html` zeigt lokalisierte Meldung (`confirmation.message`) und ist wie die Detailseite aufgebaut (Header, Footer, Breadcrumb).

Testfälle (Server):
1. Thema=Booking: Alle Felder ausfüllen → Redirect auf Bestätigungsseite; Betreiber‑Mail + Bestätigungsmail an Absender; Betreff mit korrekter Anfrage-ID.
2. Thema=Other: Booking‑Felder ausgeblendet/disabled → E‑Mail enthält nur befüllte Felder.
3. Validierung: ungültige E‑Mail bzw. fehlende Pflichtfelder → 400 (bei direktem POST sichtbar).
4. Reply‑To: Antwort auf Betreiber‑Mail geht an Absender.



## Testing-Hinweise
- Honeypot auslösen: in der Konsole das versteckte Feld befüllen und absenden
```js
const hp = document.querySelector('input[name="company"]'); if (hp) hp.value = 'bot';
```
- Mindestzeit: Standard 1500 ms (anpassbar in `assets/js/kontakt.js`)
- CAPTCHA: Refresh-Icon lädt neues Bild; falscher Code → Feld-Fehler

## Wartung / Erweiterung ToDos (Potenzial)
- Bildoptimierung (WebP/AVIF Fallbacks)
- Lazy Loading Gallerien / Lightbox
- Detailseiten pro Wohnung (`/pages/wohnung-<slug>.html` + Deep Link Schema.org)
- Lokalisierte Alt-Texte für Apartmentbilder
 - (Neu umgesetzt) Performante Galerie: IntersectionObserver + gestaffeltes Laden, Skript `assets/js/optimize-images.js`
	- (Neu) Formular-Härtung: Rate-Limit, Sanitizing, URL/Disposable-Domain-Checks implementiert

## Schnelles Troubleshooting
| Problem | Ursache | Lösung |
|---------|---------|-------|
| Keine Übersetzungen | JSON nicht geladen | Dev-Tools Network prüfen (Pfad) |
| Karten fehlen | `data-cards` JSON ungültig | JSON validieren (Lint / Konsole) |
| CSP Fehler | Inline Script eingefügt | In externe Datei auslagern |

## Workflow
- Branches: `feat/<nr>-kurz`, `fix/<nr>-kurz`
- Commits referenzieren Issues: „feat: … (refs #123)“
- PR-Text mit „Fixes #123“ schließt Issues automatisch
- GitHub Projects: Issues/PRs verknüpfen

## Lokale Commands (Beispiele)
```powershell
npx http-server -p 8080
# Bilder optimieren (benötigt: npm install sharp)
node assets/js/optimize-images.js
git add .
git commit -m "feat: update"
git tag vX.Y.Z
git push origin main --tags
```

## Lizenz / Rechtliches
Interne Nutzung. (Optional: Lizenzblock ergänzen)

---
Fragen oder Erweiterungswünsche: Siehe Changelog / Issues.
