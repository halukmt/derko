# Changelog
Alle relevanten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [v0.4.0] - 2025-10-07
## [v0.5.0] - 2025-10-07
### Added
- Feature-Card Bild-Unterstützung (komfort.png, zentral.png, fair.png) inkl. neuem `<img data-img-feature>` Element im Template.
- 404 Seite vollständig integriert (Header, Footer, i18n, OG-Meta, Theme Color, Skip-Link).
- Neue Übersetzungs-Keys `notFound.*` (de/en) + Button zurück zur Startseite.
- Illustration `seite_404.png` + Styling-Klasse `.error-404-illustration`.

### Changed
- Navigationslogik vereinfacht: Alle Links jetzt absolute Pfade (`/`, `/pages/...`) statt kontextabhängiger relativer Berechnung.
- Brand-Logo & Startseiten-Link führen immer auf `/` (verhindert fehlerhafte `/pages/index.html` Aufrufe).
- Feature-Card Template erweitert, um optional Bilder vor dem Text zu rendern.

### Fixed
- Verhindert fehlerhafte Requests auf `/pages/index.html` bei 404-Szenarien oder aus Unterseiten.
- 404 liefert keine broken CSS/JS Pfade mehr (Assets über absolute Pfade eingebunden).

### Developer Experience
- Reduzierte Komplexität in `main.js` (entfernte relative Pfadumschaltungen, klarere Link-Setzung).

### Notes
- 404 Illustration aktuell dekorativ (`alt=""`). Optional kann ein lokalisierter `notFound.imageAlt` Key nachgerüstet werden.

### Added
- Verschachtelte Sprachstruktur `lang/<code>/<code>.json` mit Fallback-Erkennung.
- Externe HTML-Partials für Rechtstexte (`lang/de/*.html`, `lang/en/*.html`) via `data-i18n-html`.
- Englische Sprache (JSON + AGB / Imprint / Privacy Partials).
- Dropdown-Sprachumschalter mit dynamischer Flagge & Screenreader-Label.
- Runde SVG-Flaggen (DE/EN) + Styling (`.flag-icon`).
- Typografie-/Layout-Stile für Rechtstexte (`.legal-content`, `container-narrow`).

### Changed
- `lang.js`: erweiterter Sanitizer (Block-Tags), Partial-Loader mit Cache, strukturpräferenzbasierte Lade-Reihenfolge.
- Sprachlade-Strategie reduziert 404-Rauschen durch Kandidaten-Iteration & gespeicherte Präferenz.
- Komponenten-Injection triggert sofortiges Re-Apply der Übersetzungen.
- Sprachlabel im Toggle visuell entfernt (nur Flagge sichtbar, Text bleibt für A11y).

### Fixed
- Verhindert wiederholte 404 beim Laden nicht vorhandener Sprachdateien.
- Fehlertoleranter Umgang mit fehlenden/leerem Partials (Warnung statt Abbruch).

### Security / Hardening
- Sanitizing auch für geladene HTML-Partials angewandt (gleiche Whitelist wie Inline-Übersetzungen).

### Developer Experience
- Großtexte ausgelagert -> bessere Wartbarkeit & Diffbarkeit.

### Migration Notes
- Frühere Root-`de.json` kann entfernt werden, wenn ausschließlich verschachtelte Struktur genutzt wird.
- Weitere Sprachen: Ordner + JSON + Partials + Eintrag im Dropdown genügen.

### Known Follow-Ups (nicht enthalten)
- SEO Prerender der Rechtstexte.
- Aktive Sprache im Dropdown visuell hervorheben (Häkchen / aria-current).


## [v0.3.1] - 2025-10-06
### Added
-

### Changed
-

### Fixed
- Valid PNG icons to resolve manifest error

## [v0.3.0] - 2025-10-06
### Added
-

### Changed
-

### Fixed
- Canonical root URLs, favicon/manifest enhancements, nav cleanup

## [v0.2.1] - 2025-10-06
### Fixed
- Dupliziertes zweites HTML-Dokument aus `index.html` entfernt (verursachte Browser-Warnung: CSP meta outside head).

### Security / Hardening
- Gewährleistet, dass die CSP nur einmal pro Seite im `<head>` definiert ist.

## [v0.2.0] - 2025-10-06
### Added
- Neues Logo (`logo.svg`) und aktualisiertes Favicon
- Brand-Farbsystem mit CSS Custom Properties (Primär-/Dark-Farben, Hover/Active, Fokus-Ring)
- Möglichkeit, begrenzte, sichere HTML-Tags (`<br>`, Formatierung) in Übersetzungen zu verwenden (Sanitizing in `lang.js`)
- Vereinheitlichte Button-Optik (eine Variante für alle `.btn*` Klassen)

### Changed
- Links im Footer an Header-Stil angepasst (einheitliche Farbe, Hover, Gewicht)
- Navigation: AGB & Impressum aus dem Header entfernt (nur noch im Footer)
- Konsistente Button-Größen (auch ehem. `.btn-lg` normalisiert)

### Fixed
- Vermeidung visueller Inkonsistenzen zwischen Outline- und Primary-Buttons
- Bessere Lesbarkeit & Fokus-Indikator für Interaktionen

### Removed
- Separates visuelles Styling für `.btn-outline-primary` (verschmolzen in einheitliche Buttonvariante)

### Security / Hardening
- Sanitizing der HTML-Inhalte aus Sprachdateien verhindert unerlaubtes Markup

### Misc
- Alte Logo/Favicon Dateien als untracked Backups belassen (`logo_OLD.svg`, `favicon_OLD.svg`)

## [v0.1.1] - 2025-10-02
### Added
-

### Changed
-

### Fixed
- Fehler behoben v0.1.1


## [v0.1.0] - 2025-10-01
### Added
- Erste Version, Seitenstruktur angelegt

### Changed
-

### Fixed
-