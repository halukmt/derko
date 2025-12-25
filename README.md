# Debug-Modus & Logging

## Debug-Modus aktivieren/deaktivieren

Das System unterstützt einen zentralen Debug-Modus, der das Logging-Verhalten beeinflusst und zusätzliche Diagnose-Informationen ausgibt.

### Debug-Modus aktivieren

- **Global (empfohlen):**
	- In `.htaccess` setzen:
		```
		SetEnv DERKO_DEBUG 1
		```
	- Alternativ in `api/config.local.php`:
		```php
		define('DERKO_DEBUG', true);
		```
	- Sobald aktiviert, werden zusätzliche Debug-Informationen und Logs (z.B. `api/logs/error.log`) geschrieben. Fehler und sicherheitsrelevante Ereignisse werden ausführlich protokolliert.

- **CAPTCHA-spezifisch:**
	- In `api/captcha.php` kann temporär `$debug = true;` gesetzt werden.
	- Dann wird zusätzlich `api/logs/captcha_debug.log` mit detaillierten CAPTCHA-Diagnosen erstellt.

### Debug-Modus deaktivieren

- In `.htaccess`:
	```
	SetEnv DERKO_DEBUG 0
	```
- Oder in `api/config.local.php`:
	```php
	define('DERKO_DEBUG', false);
	```
- Im deaktivierten Zustand werden nur Fehler und sicherheitsrelevante Ereignisse geloggt (kein Debug-Output).

**Hinweis:**
- Die globale Einstellung überschreibt lokale Werte. Für produktive Umgebungen Debug immer deaktivieren!
- Log-Verzeichnisse: `api/logs/error.log` (global), `api/logs/captcha_debug.log` (nur bei aktiviertem CAPTCHA-Debug).

# Weekly Mailer (CRON)

A script for sending a configurable weekly email (e.g., report, reminder) via PHP mail().

## Configuration
- Edit `api/weekly_mail_config.php` to set:
	- `weekday` (0=Sunday, 1=Monday, ...)
	- `hour` (0-23)
	- `minute` (0-59)
	- `to` (array or string of recipient emails)
	- `from` (sender email)
	- `subject` (mail subject)
	- `body` (mail body)

## Usage
- **Manual test:**
	- Run: `php api/weekly_mailer.php`
	- By default, script runs regardless of time. To enforce schedule, uncomment the `exit("Not scheduled time.");` line in `weekly_mailer.php`.

- **CRON setup (Strato example):**
	- Open Strato CRON settings.
	- Set schedule to match your config (e.g., every Monday at 07:00):
		```
		0 7 * * 1 /usr/bin/php /home/strato/www/youruser/htdocs/api/weekly_mailer.php
		```
	- Adjust path as needed for your Strato webspace.

## Security
- Script is not web-accessible (no routing from public site).
- Only callable via CLI/CRON.
- Config and script must not be writable by web users.

## Troubleshooting
- Check Strato mail logs or error.log for delivery issues.
- Ensure sender address is allowed by Strato (use a domain email).
- For debug, run manually and check output.

---
For more, see comments in `api/weekly_mailer.php` and `api/weekly_mail_config.php`.

**cron-job.org setup (example)**

- **Name:** DERKO weekly mail
- **URL:** `https://www.derko-immobilien.de/api/weekly_mailer_webhook.php?token=b7f9c2e8a3d4f6b1c0e9f2a3b4c5d6e7`
````markdown
**Contact-form healthcheck (cron-job.org)**

You can monitor the actual contact-form send path with a protected healthcheck endpoint.

- **URL:** `https://www.derko-immobilien.de/api/contact_form_health.php?token=<health_token>`
`````markdown
**Contact-form healthcheck (cron-job.org)**

You can monitor the actual contact-form send path with a protected healthcheck endpoint.

- **URL:** `https://www.derko-immobilien.de/api/contact_form_health.php?token=<health_token>`
- **Method:** `GET`
- **Schedule:** choose as needed (hourly/daily). Example daily at 06:00: `0 6 * * *`
- **What it does:** sends a small admin mail to the address configured in `health_to` and writes a log entry. Returns HTTP 200 on success.

Security:
- Use the `health_token` in `api/weekly_mail_config.php`; treat it as a secret.
- Optionally add allowed IPs to `webhook_allowed_ips` if your cron provider publishes them.

If you want, set the cron-job.org job to call the same URL used for the weekly mail webhook, but for clarity we recommend a dedicated healthcheck URL as shown above.
Im Code fest definiert (`main.js` → `renderFeatureCards`). Bilder: `assets/img/allgemein/komfort|zentral|fair.png`.
Für weitere Vorteile: Array in `main.js` erweitern (Icon, Title-Key, Text-Key, Bild).

## Wohnungs-Cards (dynamisch)
Die Seite `pages/wohnungen.html` enthält ein DIV mit:
```html
<div id="wohnung-list" data-cards='[{"key":"w01_derko_apart","img":"/assets/img/wohnungen/w01_derko_apart/main.png","alt":"DERKO Apart"}]'></div>
```

`main.js` liest `data-cards` (JSON Array) und baut für jeden Eintrag eine Card basierend auf Keys in den Sprachdateien:

Key-Konvention:
```
wohnungen.cards.<key>.title
wohnungen.cards.<key>.text
wohnungen.cards.<key>.button
```

### Neue Wohnung hinzufügen – Schritt für Schritt
1. Bilder ablegen, z.B.: `assets/img/wohnungen/w08_beispiel/main.png`
2. Sprachdateien erweitern:
```json
 "wohnungen": {
	"cards": {
		"w08_beispiel": {
			"title": "Wohnung Beispiel",
			"text": "Kurzer Beschreibungstext ...",
			"button": "Details ansehen"
		}
	}
}
```
3. In `pages/wohnungen.html` im `data-cards` Array ergänzen:
```json
{"key":"w08_beispiel","img":"/assets/img/wohnungen/w08_beispiel/main.png","alt":"Wohnung Beispiel"}
```
4. Seite neu laden. (Cache leeren falls Keys nicht sofort erscheinen.)

Fallback: Falls kein `data-cards` gesetzt → eine Legacy-Karte mit Schlüssel `wohnungen.card.*`.

### Barrierefreiheit & Alt-Texte
`alt` wird nun lokalisiert über Schlüssel `wohnungen.cards.<key>.alt` (Fallback zu statischem Wert / "Wohnungsbild").

## JSON-LD
- Startseite: `WebSite` + Publisher Logo.
- Wohnungen: Dynamisch erzeugtes `CollectionPage` + `Apartment` Einträge (Titel, Beschreibung, Zimmer, Fläche, Betten, Parking) + `Offer` (Preis extrahiert) + `BreadcrumbList`.
	- Preis wird aus Text (`price`) normalisiert; zukünftige Erweiterung: mehrere Offers für Saisonpreise.

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
	- CSRF Token Prüfung (`api/csrf.php` + Hidden Field `csrf_token`)
	- Session-Cookie Flags (Secure/HttpOnly/SameSite=Lax) gesetzt vor `session_start()`
	- Sicherheits-Header via `.htaccess` (X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP/CORP/COEP)
	- `/.well-known/security.txt` vorhanden (Kontakt & Policy)

### CSRF Schutz
`api/csrf.php` erzeugt pro Session einen Token (`csrf_token`). Dieser wird beim Laden des Kontaktformulars via JS (Fetch) eingefügt. `sendmail.php` validiert den Token vor Versand. Fehlender/ungültiger Token → 400 Fehler.

### Security Headers
Zentrale `.htaccess` liefert konsistente Header:
- Content-Security-Policy (strikt, kein Inline JS/CSS)
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: geolocation=(), camera=(), microphone=()
- Strict-Transport-Security (Produktiv auf HTTPS)
- Cross-Origin-* (OPENER/EMBEDDER/RESOURCE) vorbereitet für zukünftige Isolation

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

 Konfiguration (Empfänger/Absender) erfolgt zentral in `api/config.php` (optional via Umgebungsvariablen überschreibbar):

```php
<?php
// api/config.php
define('DERKO_CONTACT_TO', getenv('DERKO_CONTACT_TO') ?: 'contact@example.com');
define('DERKO_CONTACT_FROM', getenv('DERKO_CONTACT_FROM') ?: 'no-reply@example.com');
```

`api/sendmail.php` lädt diese Konstanten automatisch und verwendet sie als Absender/Empfänger.

Zentrale Sicherheits-/Rate-Parameter (ebenfalls in `api/config.php`):

```php
// Standardwerte (überschreibbar via Env oder config.local.php)
define('DERKO_CSRF_TTL', 600);       // Sekunden
define('DERKO_RATE_WINDOW', 60);     // Sekunden pro Fenster
define('DERKO_RATE_MAX', 1);         // max. Einsendungen je Fenster
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

## Performance Hinweise
- Hero Bild Preload für verkürzte LCP: `<link rel="preload" as="image" href="/assets/img/allgemein/fair-800.avif" type="image/avif" imagesrcset="/assets/img/allgemein/fair-400.avif 400w, /assets/img/allgemein/fair-800.avif 800w, /assets/img/allgemein/fair-1200.avif 1200w" />`
- AVIF/WebP Varianten via Script `assets/js/optimize-images.js` (Qualität avif=50, webp=78).
- Lazy Loading aller Card-Bilder reduziert initiales Transfer-Volumen.
- Potenzial: Self-Hosting Fonts, kritisches CSS Inline (falls CSP angepasst), HTTP/2 Push ersetzt durch Preload.

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
- Erweiterte Preis-/Verfügbarkeitslogik für Offers (z.B. Mindestnächte, saisonale Raten)
- Lazy Loading Gallerien / Lightbox
- Detailseiten pro Wohnung (`/pages/wohnung-<slug>.html` + Deep Link Schema.org)
- Erweiterte Breadcrumbs für Unterseiten/Detail
- Automatisches Pre-Rendering wichtiger Komponenten bei Build (optional)
- Font Self-Hosting zur weiteren DSGVO-Optimierung
- Performante Galerie: IntersectionObserver + gestaffeltes Laden (Ansatz vorbereitbar)
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
