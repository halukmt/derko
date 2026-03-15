# Detaillierter Implementierungsplan für Issue #75: PageSpeed Improvement

> Dieser Plan basiert auf einer vollständigen Analyse des Quellcodes. Die Maßnahmen sind nach erwarteter Wirkung priorisiert.

---

## Phase 1: Quick Wins — Kritisch, einfach umzusetzen

**Erwartete Verbesserung: +15–25 Punkte Mobile**

### 1.1 `defer` zu Bootstrap JS hinzufügen

_(alle HTML-Seiten, ~13 Dateien)_

- **Problem:** Bootstrap JS Bundle (150 KB) wird auf ALLEN Seiten OHNE `defer` geladen → blockiert HTML-Parser
- **Dateien:** `index.html:104`, `pages/wohnungen.html:76`, `pages/kontakt.html:251`, `pages/wohnung-detail.html:96`, `pages/faq.html:408`, `pages/ueber-uns.html:234`, `pages/agb.html:94`, `pages/datenschutz.html:93`, `pages/impressum.html:98`, `pages/bestaetigung.html:59`, `pages/404.html:55`, `pages/error-rate-limit.html:50`, `pages/error-captcha.html:51`, `pages/error-session.html:49`
- **Fix:** `defer` Attribut zum `<script>` Tag hinzufügen:
  ```html
  <script src="...bootstrap.bundle.min.js" defer integrity="..." crossorigin="anonymous"></script>
  ```
- **Auswirkung:** FCP (First Contentful Paint) verbessert sich um 200–500ms auf Mobile, DOM-Parsing wird nicht mehr blockiert
- **Risiko:** Gering — Bootstrap JS wird für Navbar-Toggling und Modals benötigt, die erst nach Benutzerinteraktion relevant sind. `defer` stellt sicher, dass das Script nach dem Parsing ausgeführt wird
- **Test:** Navbar-Toggler, Modals, Accordion (FAQ-Seite) manuell testen

### 1.2 Gzip/Deflate-Komprimierung in `.htaccess` aktivieren

- **Problem:** KEINE Komprimierung konfiguriert → CSS (38 KB), JS (77 KB), HTML, JSON werden unkomprimiert übertragen
- **Datei:** `.htaccess` (nach Zeile 60, nach dem Cache-Block)
- **Fix:** Folgenden Block hinzufügen:
  ```apache
  <IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css
    AddOutputFilterByType DEFLATE text/javascript application/javascript application/json
    AddOutputFilterByType DEFLATE application/xml application/xhtml+xml
    AddOutputFilterByType DEFLATE font/opentype font/ttf font/eot image/svg+xml
  </IfModule>
  ```
- **Auswirkung:** 60–80% kleinere Downloads für textbasierte Ressourcen (z.B. Bootstrap CSS: 190 KB → ~38 KB, style.css: 38 KB → ~8 KB)
- **Risiko:** Keines — `IfModule` prüft ob mod_deflate verfügbar ist
- **Test:** Mit `curl -H "Accept-Encoding: gzip" -I https://www.derko-immobilien.de/assets/css/style.css` prüfen ob `Content-Encoding: gzip` Header vorhanden

### 1.3 `width` und `height` Attribute auf dynamisch erstellte Bilder setzen

_(CLS-Verbesserung)_

- **Problem:** Feature-Card-Bilder auf der Homepage werden in `main.js` dynamisch erzeugt OHNE `width`/`height` → verursacht Layout-Verschiebungen (CLS)
- **Datei:** `assets/js/main.js` — Funktion die Feature-Cards rendert (~Zeile 190-217)
- **Fix:** `img.width = 800; img.height = 520;` setzen (oder `img.setAttribute('width', '800'); img.setAttribute('height', '520');`)
- **Datei:** `assets/js/main.js` — Funktion die Apartment-Cards rendert (~Zeile 384-407)
- **Fix:** Auch hier `width`/`height` auf die dynamisch erzeugten `<img>` Elemente setzen
- **Auswirkung:** CLS (Cumulative Layout Shift) wird deutlich reduziert → besserer Performance-Score
- **Test:** Chrome DevTools → Lighthouse → CLS-Wert prüfen

---

## Phase 2: Hohe Priorität — Deutlich spürbare Verbesserung

**Erwartete Verbesserung: +10–15 Punkte**

### 2.1 Font Awesome optimieren — nur verwendete Icons laden

- **Problem:** Vollständiges Font Awesome 6.5.2 CSS (75 KB) wird geladen, aber nur ~10-15 Icons werden verwendet
- **Dateien:** Alle HTML-Seiten (z.B. `index.html:47`, `pages/wohnungen.html:33`)
- **Option A (empfohlen):** Font Awesome durch SVG-Icons ersetzen (Bootstrap Icons oder einzelne SVGs)
- **Option B:** Font Awesome CSS durch Tree-Shaken (nur benötigte Icons/CSS) ersetzen
- **Option C (minimal):** Font Awesome mit `media="print" onload="this.media='all'"` asynchron laden + `<noscript>` Fallback
- **Auswirkung:** 75 KB weniger render-blockierendes CSS → FCP um 100–300ms verbessert
- **Risiko:** Mittel — Icons müssen visuell geprüft werden

### 2.2 Kritisches CSS extrahieren und inline einbetten

- **Problem:** Gesamtes `style.css` (38 KB) ist render-blockierend, aber nur ~5-10 KB werden für den Above-the-Fold-Bereich benötigt
- **Dateien:** Alle HTML-Seiten + `assets/css/style.css`
- **Fix:**
  1. Kritische Styles (Hero, Navbar, Grundlayout) extrahieren
  2. Als `<style>` inline in `<head>` einbetten
  3. Rest asynchron laden mit `<link rel="preload" as="style" onload="this.rel='stylesheet'">`
- **Hinweis:** Aufgrund der strikten CSP (`style-src 'self' ...` ohne `'unsafe-inline'`) muss entweder:
  - (a) ein CSP-Hash für den Inline-Style-Block berechnet und in die CSP-Policy aufgenommen werden, oder
  - (b) das kritische CSS in eine separate Datei `critical.css` ausgelagert werden
- **Auswirkung:** FCP um 100–200ms verbessert
- **Risiko:** Mittel — CSP-Kompatibilität muss sichergestellt werden

### 2.3 Bootstrap CSS Aufräumung — Ungenutztes CSS entfernen

- **Problem:** Vollständiges Bootstrap 5.3.3 CSS (~190 KB) wird geladen, geschätzt 40-50% ungenutzt
- **Option A (empfohlen, minimal):** PurgeCSS in den Build-Prozess integrieren → `npm install --save-dev purgecss` → Build-Script anpassen, um ungenutztes Bootstrap-CSS zu entfernen
- **Option B (aufwändiger):** Bootstrap Sass Sourcen einbinden und nur benötigte Module importieren
- **Option C (zukunft):** Bootstrap CSS durch eigenes, schlankes CSS ersetzen (Grid + Utilities)
- **Auswirkung:** ~95 KB weniger CSS → FCP um 150–250ms verbessert
- **Risiko:** Hoch — PurgeCSS muss alle dynamisch generierten Klassen berücksichtigen (Feature-Cards, Apartment-Cards, Komponenten). Umfangreiche manuelle Tests nötig

### 2.4 Preconnect für CDN-Domains ergänzen

- **Problem:** Bootstrap CSS/JS und Font Awesome werden von CDNs geladen, aber es gibt keine Preconnect-Hints für diese Domains
- **Dateien:** Alle HTML-Seiten im `<head>`
- **Fix:** Folgende Zeilen VOR den CDN-Links einfügen:
  ```html
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin />
  ```
- **Auswirkung:** DNS-Lookup + TCP-Handshake + TLS-Handshake um je 100–200ms reduziert
- **Risiko:** Keines

---

## Phase 3: Mittlere Priorität — Architekturverbesserungen

**Erwartete Verbesserung: +5–10 Punkte**

### 3.1 Header/Footer Komponenten-Rendering optimieren

- **Problem:** Header und Footer werden per JavaScript `fetch()` zur Laufzeit geladen (`main.js:23-44`) → 2-3 HTTP-Requests nach DOMContentLoaded → Layout-Verschiebung + verzögerte Navigation
- **Option A (empfohlen):** Header/Footer HTML während des Build-Prozesses (`npm run build`) inline in jede HTML-Seite injizieren → kein Runtime-Fetch nötig
- **Option B:** `<link rel="preload" as="fetch" href="/components/header.html">` im `<head>` für früheres Laden
- **Option C:** Server-Side Includes (SSI) mit Apache `mod_include` nutzen
- **Auswirkung:** CLS reduziert, Navigation sofort sichtbar, 2-3 weniger HTTP-Requests
- **Risiko:** Mittel — Build-Prozess muss angepasst werden, i18n-Kompatibilität testen

### 3.2 JavaScript Code-Splitting nach Seite

- **Problem:** Alle Seiten laden dieselben JS-Dateien (main.js 32 KB + lang.js 13 KB = 45 KB), obwohl nicht alle Funktionen auf jeder Seite benötigt werden
- **Fix:** Build-Prozess anpassen: Seitenspezifische Bundles erstellen (z.B. `home.js`, `wohnungen.js`, `kontakt.js`)
- **Beispiel:** `wohnung-detail.js` (17 KB) wird nur auf der Detailseite geladen ✅ — dieses Muster auf andere Seiten übertragen
- **Auswirkung:** 15–25 KB weniger JS pro Seite
- **Risiko:** Mittel — Gemeinsame Abhängigkeiten müssen korrekt gehandhabt werden

### 3.3 Lazy Loading für Below-the-Fold Bilder verifizieren und verbessern

- **Problem:** Feature-Cards auf der Homepage setzen `loading="lazy"` ✅, aber die Wirksamkeit hängt davon ab, ob die Bilder wirklich below-the-fold sind
- **Fix:**
  1. Sicherstellen, dass Hero-Bild KEIN `loading="lazy"` hat (ist aktuell korrekt ✅)
  2. Alle below-the-fold Bilder haben `loading="lazy"`
  3. Partner-Logos und Footer-Bilder ebenfalls lazy-loaden
- **Auswirkung:** Weniger initial geladene Bytes, schnellerer LCP
- **Risiko:** Gering

### 3.4 sizes-Attribut zu responsive Bildern hinzufügen

- **Problem:** Hero-Bild hat `imagesizes` im Preload-Link ✅, aber die `<picture>`/`<source>` Elemente haben kein `sizes` Attribut → Browser wählt möglicherweise zu große Bilder aus
- **Dateien:** `index.html:82-89` (Hero-Bild), `assets/js/main.js` (Feature-Cards)
- **Fix:** `sizes="(max-width: 768px) 100vw, (max-width: 992px) 50vw, 33vw"` zu `<source>` und `<img>` Elementen hinzufügen
- **Auswirkung:** Korrekte Bildgröße wird geladen → weniger Bytes auf Mobilgeräten
- **Risiko:** Gering

---

## Phase 4: Feintuning — Optionale Optimierungen

**Erwartete Verbesserung: +2–5 Punkte**

### 4.1 Brotli-Komprimierung aktivieren

_(falls vom Server unterstützt)_

- **Datei:** `.htaccess`
- **Fix:** `<IfModule mod_brotli.c>` Block hinzufügen (10–20% bessere Komprimierung als Gzip)
- **Auswirkung:** Marginal besser als Gzip allein
- **Risiko:** Keines — Fallback auf Gzip wenn Brotli nicht verfügbar

### 4.2 `fetchpriority` für LCP-Bilder auf allen Seiten setzen

- **Problem:** Nur Homepage Hero hat `fetchpriority="high"` ✅ — andere Seiten nicht
- **Fix:** Auf der Wohnungen-Seite und Detail-Seite das jeweils wichtigste Bild mit `fetchpriority="high"` markieren
- **Auswirkung:** LCP-Bild wird früher geladen
- **Risiko:** Keines

### 4.3 Google Fonts optional self-hosten

- **Problem:** Google Fonts CSS wird extern geladen (eigener HTTP-Request + Font-Download)
- **Fix:** Font-Dateien (Inter WOFF2) herunterladen und selbst hosten → ein externer Request weniger, Cookie-frei, besseres Caching
- **Auswirkung:** 200–400ms weniger Latenz für Font-Laden
- **Risiko:** Gering — muss bei Font-Updates manuell aktualisiert werden

### 4.4 JSON-LD und Meta-Tags optimieren

- **Problem:** JSON-LD Blöcke im `<head>` sind nicht minifiziert (20+ Zeilen pro Seite)
- **Fix:** JSON-LD in eine Zeile komprimieren oder ans Ende von `<body>` verschieben
- **Auswirkung:** Minimal — HTML wird etwas kleiner
- **Risiko:** Keines

### 4.5 Preload-Hints für Hero-Bilder auf allen Seiten

- **Problem:** Nur `index.html` hat einen Preload-Link für das Hero-Bild ✅
- **Fix:** Auf `wohnungen.html`, `ueber-uns.html` etc. ebenfalls Preload-Links für das wichtigste Bild setzen
- **Auswirkung:** LCP um 50-150ms verbessert
- **Risiko:** Keines

---

## Zusammenfassung und erwartete Ergebnisse

| Phase | Maßnahmen | Geschätzte Score-Verbesserung (Mobile) | Aufwand |
|-------|-----------|----------------------------------------|---------|
| 1 | Quick Wins (defer, gzip, width/height) | +15–25 Punkte | 1–2 Stunden |
| 2 | CSS-Optimierung (Font Awesome, Critical CSS, PurgeCSS, Preconnect) | +10–15 Punkte | 4–8 Stunden |
| 3 | Architektur (Inline-Komponenten, Code-Splitting, sizes) | +5–10 Punkte | 8–16 Stunden |
| 4 | Feintuning (Brotli, fetchpriority, Self-Hosted Fonts) | +2–5 Punkte | 2–4 Stunden |

**Ziel nach Phase 1+2:** 80–90 (Mobile), 95+ (Desktop)
**Ziel nach Phase 3+4:** 90+ (Mobile), 95+ (Desktop) ✅

## Empfohlene Reihenfolge der Umsetzung

1. **Phase 1 zuerst** — größte Wirkung bei geringstem Aufwand
2. **Phase 2.4 (Preconnect)** — trivial, sofort umsetzbar
3. **Phase 2.1 (Font Awesome)** — zweitgrößte Wirkung
4. **Phase 2.2–2.3 (CSS)** — erfordert Planung wegen CSP
5. **Phase 3+4** — nach Bedarf, basierend auf verbleibendem Score-Gap

## Validierung nach jeder Phase

- [ ] Google PageSpeed Insights erneut testen (Mobile + Desktop)
- [ ] Chrome DevTools → Lighthouse lokal ausführen
- [ ] Browser-Konsole auf CSP-Fehler prüfen
- [ ] Playwright E2E Tests ausführen (`npm test`)
- [ ] Manueller visueller Test auf echtem Mobilgerät
