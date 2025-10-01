# Monteurzimmer.Immo – Statische Webseite

Diese statische Seite wurde gemäß Best Practices (2024–2025) erstellt.

Inhalt:
- Bootstrap 5.3 via CDN, Font Awesome, Google Fonts (Hinweis: Für DSGVO idealerweise lokal hosten)
- Responsives Layout, ARIA, Frontend-Validierung für Formulare
- i18n: Inhalte aus `lang/de.json`
- Komponenten: `components/header.html`, `components/footer.html`, `components/card.html`
- SEO: Titel/Description, Open Graph, Sitemap, robots.txt, JSON-LD strukturierte Daten
- Sicherheit: CSP, X-Content-Type-Options, X-Frame-Options in Meta (Server-Header bevorzugt)

Ordnerstruktur siehe Projektbaum. Öffnen Sie `index.html` mit einem lokalen Server, damit Fetch für Komponenten und Sprache funktioniert.

Optionaler lokaler Server (PowerShell):

```powershell
# Python 3
python -m http.server 8080
# oder Node.js (falls installiert)
npx http-server -p 8080
```

Dann im Browser: http://localhost:8080/
