# Changelog
Alle relevanten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [0.2.1] - 2025-10-06
### Fixed
- Dupliziertes zweites HTML-Dokument aus `index.html` entfernt (verursachte Browser-Warnung: CSP meta outside head).

### Security / Hardening
- Gewährleistet, dass die CSP nur einmal pro Seite im `<head>` definiert ist.

## [1.0.0] - 2025-10-01
### Added
- Erste Version, Seitenstruktur angelegt

### Changed
-

### Fixed
-

## [0.2.0] - 2025-10-06
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