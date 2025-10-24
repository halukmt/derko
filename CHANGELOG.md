Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).


# Changelog
Alle relevanten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.
## [v0.9.1] - 2025-10-21
### Added
- 7 neue Wohnungen aus `bookings.md` integriert und auf der Übersichtsseite sichtbar:
	- `w01_derko_apart`, `w02_derko_apart_2`, `w03_exklusiv`, `w04_exklusiv_2`, `w05_dus_1`, `w06_dus_2`, `w07_dus_3`.
- Vollständige i18n‑Einträge (DE/EN) pro Wohnung (`wohnungen.cards.<key>.*`).
- Kuratierte Galerien in `assets/data/apartments.json` für alle neuen Wohnungen.
- Einträge in `assets/data/variants.json` für neue Wohnungen (ohne -400/-800/-1200 Varianten → `false`).
- Listen‑ und Detailansichten bevorzugen AVIF/WebP (PNG nur Fallback) – ohne neue Größenvarianten zu generieren.

### Changed
- `pages/wohnungen.html`: Kartenliste auf die 7 neuen Wohnungen umgestellt.
- `assets/js/main.js`: Kartenbild‑Rendering über `<picture>`:
	- Mit responsive Srcset, falls `variants.json` für den Key `true` ist.
	- Sonst Basis‑`main.avif` / `main.webp` mit PNG‑Fallback (keine -400/-800/-1200 nötig).
	- Render‑Lock hinzugefügt, um Duplikate durch parallele Events zu verhindern.
- `assets/js/wohnung-detail.js`:
	- Erweitert für die 7 neuen Keys; Galerie bevorzugt AVIF/WebP.
	- URLs in `srcset` und `img` URL‑kodiert (Dateinamen mit Leerzeichen → keine Chrome Warnungen mehr).
	- `data-srcset` → `srcset` wird immer gesetzt, damit AVIF/WebP vor PNG gewählt werden.
- `assets/js/kontakt.js`: Auswahlfeld der Wohnungen (Dropdown) auf neue Keys aktualisiert.

### Fixed
- Doppelte Karten auf `wohnungen.html` (Ursache: mehrere Render‑Triggers) → durch Render‑Lock behoben.
- 404 in der Detail‑Galerie nach Bildlöschungen → kuratierte `apartments.json` lädt nur existierende Dateien.
- Chrome Warnung „Failed parsing 'srcset' attribute value…“ durch URL‑Kodierung der Quellen in der Galerie beseitigt.

### Performance
- Deutlich geringerer Bild‑Transfer durch bevorzugte AVIF/WebP sowohl in Liste als auch Galerie – ohne zusätzliche Größenvarianten.

## [v0.9.0] - 2025-10-13
### Added
- Datenschutz-/Cookie-Banner (informativ, nur essentielle Dienste):
	- Vollbreit am Seitenende ohne untere Lücke (edge-to-edge Hintergrundstreifen).
	- Halbtransparenter Seiten-Backdrop während der Anzeige (Seite dezent abgeblendet).
	- Zwei gleich breite, gestapelte Buttons: „Verstanden“ (Speichern in `localStorage.siteConsent`) und „Datenschutz“ (Navigation zur Policy).
	- i18n-Texte in DE/EN mit Schlüsselpräfix `site.cookie.*`.

### Changed
- Banner-Titel „Wir respektieren Ihre Privatsphäre“ nun fett hervorgehoben.
- Layout/Abstände des Banners konsolidiert (Flex-Layout, konsistente Gaps, responsives Verhalten).

### Fixed
- Haus-Icon im Header (Home-Link) vertikal an Text-Baseline ausgerichtet.

### Documentation
- README überarbeitet (Lokale Entwicklung mit PHP-Server, Security & Privacy, Testhinweise zum Banner, Workflow).

## [v0.8.0] - 2025-10-13
### Added
- Startseiten-Hero modernisiert: Split-Layout mit Titel, Lead, Primär-/Sekundär-CTA, Marken‑Badges und Hero‑Visual; neue i18n‑Keys (`home.hero.*`).
- Selbstgehostetes SVG‑CAPTCHA (`api/captcha.php`) mit Session‑Validierung; UI‑Integration auf `pages/kontakt.html` inkl. Refresh‑Icon.
- Clientseitiger Bot‑Schutz: Honeypot, JS‑Flag, Zeit‑Schwelle, freundliche i18n‑Meldung, Double‑Submit‑Guard.
- Flatpickr‑Datepicker: Lokalisierung, Marken‑Theme, statische Jahresanzeige, synchronisierte Zeiträume.
- Footer‑Ergänzung: Designer‑Credit (TechSulting) und zentrierte Social‑Icons.

### Changed
- Kontaktformular‑UX: Pflichtfeld‑Marker als goldene Icon‑Marke; verbesserte Eingabe‑Ergonomie; Datenschutz‑Link im Rechtshinweis stilistisch konsistent.
- JSON‑LD auf Kontaktseite ausgelagert (externes File), um sichtbare Inline‑Darstellung unter dem Footer zu vermeiden; saubere SEO‑Einbindung.
- CSP: Erforderliche Assets (Bootstrap/Font Awesome/Flatpickr/Google Fonts) freigegeben; `form-action 'self'` beibehalten.

### Fixed
- CAPTCHA‑Refresh‑Button als perfekte, runde Icon‑Schaltfläche; Icon bleibt auf Hover/Focus/Active weiß; keine Deformation neben dem Bild.
- Bot‑Hinweis wird nur bei echten Bot‑Signalen gezeigt (keine Störung bei normalen Validierungsfehlern).
- Verhindert sichtbares JSON‑LD unter dem Footer.

### Security / Hardening
- Serverseitige CAPTCHA‑Prüfung und Invalidierung; zusätzliche serverseitige Bot‑Heuristiken (Honeypot, Zeit‑Schwelle).

### Accessibility
- Startseite mit genau einem H1; Hero‑Bild dekorativ (`alt=""`); konsistente Fokus‑Stati.

## [v0.7.0] - 2025-10-11
### Added
- Serverseitiger Mail‑Endpunkt `api/sendmail.php` (PHP, Strato‑kompatibel) für das Kontaktformular.
	- Empfänger/Absender konfigurierbar (zentral, ohne hart codierte Adressen).
	- Betreffformat: `Thema - Name - Anfrage-ID: DDMMYYHHMM`.
	- Sendet Kopie an den Absender (Reply‑To auf Absender‑E‑Mail).
- Bestätigungsseite `pages/bestaetigung.html` mit Header, Footer, Breadcrumb.
- Neue i18n‑Keys `confirmation.headline|description|message` (de/en).

### Changed
- `pages/kontakt.html`: Formular `action` auf `../api/sendmail.php` umgestellt; CSP `form-action 'self'`.
- Link „Datenschutzerklärung“ im Hinweis ist jetzt stilistisch an andere Links angeglichen (Klasse `.inline-link`) und öffnet in neuem Tab.
- Pflichtfelder vereinheitlicht und dynamisches Ein-/Ausblenden der Buchungsfelder (topic=booking).

### Fixed
- Detailseite: Unbekannte Apartment‑IDs leiten auf die dedizierte `404.html` weiter (statt Inline‑Warnung).

### Notes
- Für beste Zustellbarkeit Absender‑Domain (SPF/DMARC) prüfen. Optionaler Umstieg auf SMTP/PHPMailer möglich.

## [v0.6.3] - 2025-10-10
### Added
- Neuer Link-/Button-Typ `.link-button` (ohne Hintergrund) mit Markenfarbe, Fokus-Ring, Chevron-Pfeil rechts und dezenter Hover-Animation.
- Haus-Icon am Anfang des Breadcrumbs auf der Detailseite (`pages/wohnung-detail.html`) inkl. zugänglichem Label (`data-i18n="navigation.home"`).

### Changed
- CTA „Details ansehen“ in Wohnungs-Karten (Template `components/card.html` via `main.js`) auf `.link-button` umgestellt.
- Galerie-Toggle „Weitere Bilder anzeigen“ auf der Detailseite (`assets/js/wohnung-detail.js`) auf `.link-button` umgestellt.
- Breadcrumb-Styling an `.link-button` angeglichen: Großbuchstaben, Markenfarben, Hover/Active-Zustände, normaler Schriftschnitt (nicht fett).

### Fixed
- Pfeil-Unterstreichung entfernt (Underline nur auf dem Text), Pfeil übernimmt stets die Textfarbe (inkl. Hover/Active) und bewegt sich leicht nach rechts bei Hover/Focus.

### Notes
- `.link-button` nutzt eine Masken-basierte Chevron-Grafik, skaliert zur Schriftgröße und ist bewusst dezent (font-size ~0.85rem) gehalten.

## [v0.6.2] - 2025-10-08
### Added
- Apartment Detail Seite (`pages/wohnung-detail.html`) mit dynamischer Befüllung über `wohnung-detail.js` (Query `?id=`).
- Kuratiertes Bild-Mapping `assets/data/apartments.json` (verhindert 404 durch Muster-Raten).
- Responsive Mehrformat-Galerie: AVIF & WebP Varianten (400 / 800 / 1200) via `sharp`-Script `assets/js/optimize-images.js`.
- Lazy Loading & IntersectionObserver für Galerie-Bilder (gestaffeltes Rendern, INITIAL_LIMIT + "Weitere Bilder" Toggle).
- JSON-LD Einzelobjekt (`Apartment`) für Detailseite mit dynamisch generierter Bildliste.
- Hero-Bild Preload (mit `imagesrcset` / `imagesizes`) & `fetchpriority="high"` zur LCP-Verbesserung.
- Skip-Link auch auf Detailseite.

### Changed
- Vereinheitlichter Head (Favicons, Manifest, Preconnect, Fonts) zwischen Index- und Detailseite.
- Alle Asset-Pfade auf absolute Varianten (`/assets/...`) um Layoutdrift & Pfadprobleme zu vermeiden.
- Breadcrumb Styling konsistent (Divider ›, Farben gem. Brand, Unterstreichung nur Hover/Focus).
- Meta-Detail-Liste neu als flexibles, mehrspaltiges Responsive Layout (größere Icons, zentrierte Ausrichtung, einheitliche Abstände).
- Globale i18n-Funktion `translateKey` exportiert, damit Detailskript Keys auflösen kann.

### Fixed
- Horizontaler Layout-Versatz (Scrollbar / Font-Ladeeffekte) durch dauerhafte Scrollbar-Reserve & vereinheitlichte Ressourcenreihenfolge minimiert.
- Fehlende Übersetzungen auf der Detailseite (fehlendes `translateKey`) behoben.
- Unnötiger PNG Hero Preload ersetzt durch formatbewussten Preload (verhindert Lighthouse Warnung "preloaded but not used").

### Performance
- Reduzierter Erst-Download für Bilder durch moderne Formate & abgestufte Größen.
- Eager Hero + verzögerte restliche Galerie reduziert LCP & TBT.
- Kein 404-Rauschen mehr durch spekulative Dateinamen.

### Developer Experience
- Bildoptimierung reproduzierbar über `npm run optimize:images` / `npm run optimize:images:force`.
- Galerie-Rendering klar strukturiert (Build-Funktionen: `detectVariants`, `buildPictureElement`, `renderImages`, `buildJSONLD`).
- Diagnose-/Layout-Debug Code hinzugefügt und anschließend entfernt (sauberer Produktionszustand).

### Security / Hardening
- Strikte CSP unverändert eingehalten (keine Inline-Skripte ergänzt, Preload via DOM API eingefügt).

### Notes / Follow-Ups
- Optional: Lightbox / Keyboard Navigation für Galerie.
- Dynamische OG / Meta Description je Apartment (aktuell generisch via Übersetzungstitel + Text möglich).
- Potenzielles Purging von unbenutzten Bootstrap CSS Klassen zur weiteren Performance-Verbesserung.

## [v0.6.1] - 2025-10-08
### Added
- Social Media Icons (Instagram, Facebook) im Footer mit zugänglichen Labels & sicheren externen Links (`rel="noopener noreferrer external"`).
- `sameAs` Verweise (Instagram, Facebook) im `WebSite.publisher` JSON-LD zur SEO-Anreicherung (Knowledge Panel / Entity Linking).

### Styling
- Runde, fokusierbare Icon-Buttons (`.social-links .social-link`) mit Hover-, Focus- & Active-State.

### i18n
- Neue Keys `footer.instagram`, `footer.facebook` (versteckte Beschriftung für Screenreader / SEO semantisch korrekt).

### Notes
- Optionaler nächster Schritt: Wiederverwendung des `sameAs` Blocks auf Unterseiten oder Umstellung aller relativen JSON-LD URLs auf absolute Domain-URLs.

## [v0.6.0] - 2025-10-08a
### Added
- Dynamische mehrfache Wohnungs-Cards über `data-cards` Attribut in `pages/wohnungen.html` (Schlüsselstruktur `wohnungen.cards.<key>.*`).
- Automatische JSON-LD Generierung für alle Apartments (Schema.org `CollectionPage` + `Apartment` Einträge) nach erfolgreicher Übersetzungsanwendung.
- Sitemap mit absoluten URLs & Metadaten (`lastmod`, `changefreq`, `priority`).

### Changed
- `main.js` refaktoriert: klarere Abschnittskommentare, modularisierte Card-Render-Funktionen, vereinheitlichte Pfadlogik, entfernte Legacy-Einzelkarten-Implementierung (Fallback bleibt falls kein `data-cards`).
- README stark erweitert (Architektur, Adding Apartments Guide, Sicherheit, i18n Details, vorhandene `robots.txt` / `sitemap.xml`).
- `sitemap.xml` bereinigt (Entfernung `/index.html` Duplikat, Domain `https://www.derko-immobilien.de`).

### Removed
- Platzhalterkarte `beispiel` aus Sprachdateien und `wohnungen.html` entfernt.

### Fixed
- CSP-Verstöße beseitigt: Inline-Skripte auf `wohnungen.html` entfernt (Konfiguration jetzt über `data-cards`, JSON-LD dynamisch erzeugt).
- Doppelter Request /404 → `/pages/index.html` weiterhin verhindert durch absolute Navigation (Regression ausgeschlossen nach Refactor).

### Developer Experience
- Übersichtlichere Dokumentation & klarer Erweiterungspfad für neue Wohnungen.
- Kommentar- und Strukturvereinheitlichung im Kernskript reduziert kognitive Last.

### Notes
- Alt-Texte aktuell statisch im `data-cards` JSON; Lokalisierung möglich durch zukünftige Keys `wohnungen.cards.<key>.imageAlt`.
- Mögliche Follow-Ups: Detailseiten pro Apartment, automatischer Sitemap-Generator, erweiterte JSON-LD (Bilder, Ausstattungen), Versioniertes Asset-Caching.

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

## [v0.4.0] - 2025-10-07
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