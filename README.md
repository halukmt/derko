# DERKO Statische Website

Mehrsprachige (DE/EN) statische Website mit komponentenbasiertem Aufbau, strikt ohne Inline-Skripte (CSP-kompatibel) und datengetriebener Card-Generierung.

## Features
- Bootstrap 5.3 (CDN), Font Awesome, Inter Font
- Komponenten (Header, Footer, Cards) via Fetch – kein Build-Tool notwendig
- i18n mit JSON-Struktur + HTML-Partials für Rechtstexte
- Dynamische Feature-Cards & Wohnungs-Cards
- JSON-LD (WebSite & dynamisch generierte Collection/Apartments)
- Strenge Content-Security-Policy (keine inline Skripte nötig)
- Einheitliches Button-/Branding-Design (CSS Custom Properties)
- Barrierefreiheit: Skip-Link, ARIA, Fokus-Ring, semantische Überschriften

## Projektstruktur (Auszug)
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
Einfachen HTTP Server starten (weil Fetch für Komponenten / i18n benötigt wird):

```powershell
npx http-server -p 8080
# oder
python -m http.server 8080
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

## Deployment Hinweise
- `robots.txt` & `sitemap.xml` sind vorhanden (Sitemap verweist in `robots.txt`).
- Empfohlen: Richtigen HTTP 404 Status für `404.html` serverseitig setzen.
- Optional: Lokales Hosten der Fonts für Datenschutz.

## Wartung / Erweiterung ToDos (Potenzial)
- Bildoptimierung (WebP/AVIF Fallbacks)
- Lazy Loading Gallerien / Lightbox
- Detailseiten pro Wohnung (`/pages/wohnung-<slug>.html` + Deep Link Schema.org)
- Lokalisierte Alt-Texte für Apartmentbilder
 - (Neu umgesetzt) Performante Galerie: IntersectionObserver + gestaffeltes Laden, Skript `assets/js/optimize-images.js`

## Schnelles Troubleshooting
| Problem | Ursache | Lösung |
|---------|---------|-------|
| Keine Übersetzungen | JSON nicht geladen | Dev-Tools Network prüfen (Pfad) |
| Karten fehlen | `data-cards` JSON ungültig | JSON validieren (Lint / Konsole) |
| CSP Fehler | Inline Script eingefügt | In externe Datei auslagern |

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
