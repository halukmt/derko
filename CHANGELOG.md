# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [v2.0.6] - 2026-03-18

### Changed
- **Replace PHP sessions with file-based token store**: Eliminated all PHP session/cookie dependencies from the contact form flow. The CSRF token, CAPTCHA code, and form state are now stored in server-side JSON files (`tmp/tokens/{id}.json`) identified by a 128-bit random token ID passed via form fields and URL parameters. This fundamentally fixes the "Session expired" error on Strato shared hosting where `session.cookie_secure=1` in php.ini prevents HTTP dev servers from setting session cookies.
  - New `api/token_store.php`: shared CRUD helper with file locking, path traversal protection (`^[0-9a-f]{32}$`), and automatic cleanup of expired tokens.
  - `api/csrf.php`: rewritten to create/refresh tokens via token store instead of PHP sessions.
  - `api/captcha.php`: rewritten to store CAPTCHA codes in the token file instead of PHP sessions.
  - `api/sendmail.php`: validates CSRF + CAPTCHA from token file, deletes token after use (single-use).
  - `assets/js/kontakt.js`: passes `token_id` to all API calls; captcha loaded after CSRF fetch via `.finally()`.
  - `pages/kontakt.html`: added `token_id` hidden field.
  - `api/test-helper.php`: reads from token store instead of sessions.
  - `tests/e2e/contact-form.spec.ts`: updated to handle token-based flow with `tid` parameter.

### Security
- Token IDs have 128-bit entropy (same as PHP session IDs), validated with strict hex regex to prevent path traversal.
- Tokens are single-use: deleted after successful submission or security validation failure.
- Token files have a 1-hour TTL with automatic cleanup on new token creation.
- No cookies required: works on HTTP, HTTPS, any hosting configuration, any browser cookie settings.

---

## [v2.0.5] - 2026-03-18

### Fixed
- **Session race condition (captcha vs. CSRF)**: The captcha `<img>` tag had a hardcoded `src="/api/captcha.php"` which caused the browser to request captcha.php during HTML parsing — before the JavaScript CSRF fetch established the PHP session. Both requests arrived at the server without a PHPSESSID cookie, each creating a new session. Whichever response arrived last set the final cookie, discarding the other session's data (csrf_token or captcha_code). Fixed by removing the hardcoded captcha `src` and loading the captcha image via JavaScript only after the `csrf.php` fetch resolves (using `.finally()`). This guarantees the session is always established before captcha.php runs.

---

## [v2.0.4] - 2026-03-18

### Fixed
- **PHP session save path missing in captcha.php**: `captcha.php` was missing the project-local session save path (`tmp/sessions/`) that `csrf.php` and `sendmail.php` already had. Added the same `session.save_path` setup as a defence-in-depth measure.

---

## [v2.0.3] - 2026-03-18

### Fixed
- **PHP session on dev server**: `csrf.php` and `sendmail.php` now set a project-local session save path (`tmp/sessions/`) before `session_start()`. Fixes "session expired" errors on Strato shared hosting where the default `/tmp` save path is inaccessible from subdomain document roots. Falls back to `sys_get_temp_dir()` if the local path cannot be created.

---

## [v2.0.2] - 2026-03-18

### Fixed
- **CTA language prefix**: The "Request offer" button on apartment detail pages now links to the language-prefixed contact URL (e.g. `/it/kontakt?wohnung=...` instead of `/kontakt?wohnung=...`), preserving the active language on navigation. Applies to all non-German language variants on production; localhost retains the legacy `/pages/kontakt.html` path for local PHP router compatibility.

---

## [v2.0.1] - 2026-03-18

### Fixed
- **Canonical tags**: Replaced hardcoded German canonical URLs with a synchronous inline script that sets the correct language-prefixed canonical at parse time (e.g. `/en/agb` → `https://www.derko-immobilien.de/en/agb`). Fixes "Alternative page with correct canonical tag" and "Discovered — currently not indexed" issues in Google Search Console for all 9 language variants.
- **Internal `/pages/` links**: Replaced legacy `/pages/kontakt.html` and `/pages/wohnungen.html` hrefs with clean URLs (`/kontakt`, `/wohnungen`) in `bestaetigung.html`, `error-rate-limit.html`, `error-session.html`, `error-captcha.html`, and `wohnung-detail.html`. Eliminates "Page with redirect" warnings in Google Search Console.
- **`npm test` script**: Added `--config=tests/playwright.config.ts` so Playwright tests can be run from the project root without changing directories.

---

## [v2.0.0] - 2026-03-13

**First production release.** This version is deployed to `https://www.derko-immobilien.de` via automated GitHub Actions CI/CD.

### Highlights
- Full multilingual website (9 languages) with language-aware URL routing (`/en/`, `/pl/`, `/hu/`, etc.)
- Automated deployment pipeline (dev → `dev.derko-immobilien.de`, main → `derko-immobilien.de`)
- 358 Playwright E2E tests across Chromium and Firefox
- Production-hardened contact form with CSRF, CAPTCHA, rate limiting, and spam protection
- SEO-optimized with clean URLs, canonical tags, hreflang for all 9 languages, and sitemap

### Added
- All features from v1.0.0 through v1.5.2 are included in this production release.
- See individual version entries below for detailed change history.

---

## [v1.5.2] - 2026-03-13

### Added
- **GitHub Actions CI/CD**: Automated deployment workflows for dev and production environments via rsync over SSH (Strato SFTP/SSH).
  - `.github/workflows/deploy-dev.yml`: Triggers on push to `dev`, deploys to `dev/` folder on server.
  - `.github/workflows/deploy-prod.yml`: Triggers on push to `main`, deploys to `dist/` folder on server.
- **Secrets-based config generation**: Both workflows automatically generate `api/config.local.php` and `api/weekly_mail_config.php` from GitHub Secrets before deployment — no more manual FTP uploads for sensitive config files.
  - Secrets used: `DERKO_CONTACT_TO`, `DERKO_CONTACT_FROM`, `DERKO_HEALTH_FROM`, `DERKO_HEALTH_TOKEN`, `DERKO_HEALTH_TO_1`, `DERKO_HEALTH_TO_2`.

### Fixed
- **rsync target path**: Changed absolute `:/dev/` and `:/dist/` to relative `dev/` and `dist/` so rsync resolves paths relative to the SSH home directory (webspace root) instead of the Linux `/dev/` device directory.

---

## [v1.5.1] - 2026-03-13

### Added
- **76 new Playwright E2E tests** in `tests/e2e/lang-navigation.spec.ts` covering language URL navigation (total: 358 tests across all spec files):
  - CSS/JS asset loading on lang-prefixed pages (no 404s)
  - Nav and footer links retain language prefix after navigation
  - Language switcher URL navigation including switch back to German
  - `/bestaetigung` route for all 9 languages
  - Apartment card links with correct language prefix on listing page
- **`/bestaetigung` pretty URL**: Added `RewriteRule ^bestaetigung/?$` to `.htaccess` for language-aware confirmation page routing.

### Fixed
- **Broken CSS/design on language-prefixed pages** (`/en/ueber-uns` etc.): Changed all relative asset paths (`../assets/css/style.css`) to absolute paths (`/assets/css/style.css`) across all 9 page files and `index.html`. Relative paths resolved incorrectly under Apache URL rewriting.
- **Nav and footer links losing language prefix**: Extended `adjustNavLinks()` in `main.js` to scan ALL internal `<a href>` links (not just specific nav IDs), ensuring every internal link gets the active language prefix.
- **Language switcher not updating correctly on Docker/localhost**: Replaced all `isLocal` hostname checks with `usePrettyUrls = !pathname.includes('.html')` — more reliable across Docker and http-server environments.
- **Switching back to German showing old language**: Added `localStorage.setItem('lang', ...)` call BEFORE `window.location.href` navigation in `setupLanguageSwitcher()`. Without this fix, navigating to a German URL (no prefix) still showed the previous language because localStorage hadn't been updated yet.
- **Contact form redirect ignoring language prefix**: `api/sendmail.php` now redirects to `/{lang}/bestaetigung` for non-German submissions instead of always redirecting to `/pages/bestaetigung.html`.
- **Feature card links missing language prefix**: `renderFeatureCards()` in `main.js` now respects the active language prefix for card CTA links.

### Changed
- `index.html`: All asset paths made absolute; hero CTA button hrefs updated to pretty URLs (`/kontakt`, `/wohnungen`) with IDs for test selectors.

---

## [v1.5.0] - 2026-03-11

### Added
- **Playwright E2E Test Suite**: 282 automated tests across 4 spec files in `tests/e2e/`, covering all URL routes, canonical/hreflang SEO, contact form security, and page rendering for all 9 languages. Run with `npm test` (Chromium + Firefox, ~5-6 min) or `npx playwright test --project=chromium` (~2 min).
  - `routing.spec.ts` — URL routing, language prefixes, 301 redirects, 404 handling
  - `canonical-seo.spec.ts` — Canonical URLs, hreflang tags, sitemap validation, OG tags
  - `contact-form.spec.ts` — Form submission, CSRF, CAPTCHA, rate limiting, Mailpit email delivery
  - `pages.spec.ts` — All pages load, apartment detail titles, language UI, mobile viewport
- **`api/test-helper.php`**: Debug-only endpoint (active only when `DERKO_DEBUG=1`) that exposes the current CAPTCHA code from the PHP session for Playwright CAPTCHA automation. Never active in production.
- **npm test scripts** in `package.json`: `test` (full Playwright run), `test:ui` (interactive UI mode), `test:report` (open last HTML report).
- **`tests/playwright.config.ts`**: Playwright configuration with `baseURL=http://localhost:8081`, 4 parallel workers, `retries: 1` for flaky test resilience, and separate Chromium/Firefox projects.

### Fixed
- **Apartment detail page title overwrite**: Removed `data-i18n="wohnungDetail.headline"` from `<title>` in `pages/wohnung-detail.html`. The attribute caused `applyTranslations()` in `lang.js` to overwrite the dynamic apartment-specific title (set by `wohnung-detail.js`) back to the generic "Wohnung Details" string after `i18n:ready` fired.
- **Apache directory listing in Docker**: Changed `Options Indexes FollowSymLinks` to `Options FollowSymLinks` in `.docker/apache.conf`, disabling directory listing for `/api/` and all other directories — matching Strato production behavior.
- **Mail error logging**: `api/sendmail.php` now checks the return value of `mail()` and writes a log entry on failure instead of silently discarding errors (previously suppressed with `@mail()`).
- **Absolute canonical URLs**: `assets/js/wohnung-detail.js` now sets fully qualified canonical URLs (`https://www.derko-immobilien.de/wohnung/...`) for apartment detail pages.

### Changed
- **`.github/copilot-instructions.md`**: Replaced placeholder "No automated tests" section with full Playwright documentation including all CLI commands, spec file descriptions, workflow guidance, flaky test explanation, and `test-helper.php` production warning.

---

## [v1.4.2] - 2026-03-11
### Added
- Docker-based local development environment mirroring the Strato Apache/PHP 8.2 production stack ([#71](https://github.com/halukmt/derko/pull/71), closes [#70](https://github.com/halukmt/derko/issues/70)):
  - `.docker/Dockerfile`: `php:8.2-apache` image with `mod_rewrite`, `mod_headers`, `mod_expires`, GD extension (captcha), and msmtp for email relay.
  - `.docker/apache.conf`: `AllowOverride All` so `.htaccess` rules are fully active during development.
  - `.docker/php.ini`: sendmail path set to msmtp, `display_errors On` for local debugging.
  - `.docker/msmtprc`: relays all `mail()` calls to Mailpit on port 1025 (gitignored).
  - `docker-compose.yml`: `web` service on port `8081:80`, `mailpit` (axllent/mailpit) UI on port `9000:8025`.
- npm scripts `docker:up` and `docker:down` in `package.json` (replaces previous `serve:php` script).

### Fixed
- Session cookies failing on localhost: replaced hardcoded `$cookieDomain = '.derko-immobilien.de'` with `DERKO_COOKIE_DOMAIN` environment variable in `api/sendmail.php`, `api/csrf.php`, and `api/captcha.php`. Docker sets this to an empty string so cookies work without a real domain.
- Docker GD extension build: added `libpng-dev`, `libjpeg-dev`, and `libfreetype6-dev` native libraries before `docker-php-ext-install gd`.
- Docker port conflicts on Windows with Hyper-V: ports 7981–8080 are reserved by Hyper-V; changed web port from `8080` to `8081` and Mailpit UI from `8025` to `9000`.

### Changed
- `README.md`: Added Docker quick-start instructions, both `npm run docker:up` and `php -S` dev modes documented with Mailpit email testing info.
- `.gitignore`: Added `.docker/msmtprc` to prevent the mail relay config from being committed.

## [v1.4.1] - 2026-03-06
### Added
- UX/UI feedback analysis and implementation plan in `.github/plan/ux-ui-plan.md` covering 11 actionable improvements across frontend and backend.
- `serve:php` npm script: starts a PHP 8.2 dev server via Docker (`npm run serve:php`) for local testing of sessions, CAPTCHA and contact form.

## [v1.4.0] - 2026-02-14
### Added
- Added example templates for local/private configuration: `api/config.local.example.php` and `api/weekly_mail_config.example.php`.
- Documentation: Expanded Getting Started instructions in `README.md` for local setup (including config templates and debug guidance).

### Changed
- Git hygiene: Extended `.gitignore` to exclude local/private configuration files and runtime artifacts (logs, lockfiles, rate store).
- Server config: Disabled `DERKO_DEBUG` by default in `.htaccess` (now commented out).
- Developer docs: Updated `.github/copilot-instructions.md` to document the new config template workflow.

### Security
- Removed sensitive configuration files from version control (`api/config.local.php`, `api/weekly_mail_config.php`).

## [v1.3.0] - 2026-01-27
### Added
- New FAQ page at `/faq` with an i18n-ready accordion layout and SEO metadata (canonical + hreflang).
- Structured data: automatic `FAQPage` JSON-LD generation from the translated FAQ content via `assets/js/faq.js`.

### Changed
- Routing/SEO: Added pretty URL routing and canonical redirect rules for the FAQ page in `.htaccess`.
- Navigation: Added "FAQ" and reordered navigation to surface it before "Angebot".
- Sitemap: Added the FAQ page.
- i18n: Updated translations for the new FAQ content across supported locales.
- PR: https://github.com/halukmt/derko/pull/62

### Fixed
- i18n: Corrected bed count from 7 to 8 across multiple language files.

## [v1.2.0] - 2026-01-27
### Changed
- i18n: Removed the hard-coded “from 25 EUR / day” price claim from the Home “Fair” feature text across locales (de, en, pl, hu, ro, bg, cs, sk).

## [v1.1.0] - 2026-01-09
### Added
- WhatsApp Floating Action Button: Added a persistent WhatsApp contact button to all pages, positioned bottom-right and always visible (floating, scrolls with viewport).
- New HTML component `components/whatsapp-button.html` for modular WhatsApp button markup.
- JavaScript logic in `assets/js/whatsapp-fab.js` for dynamic injection of the WhatsApp button on every page.

### Changed
- CSS: Unified and refactored `.wa-fab` styles for container alignment and responsive positioning. Button now aligns with main content container on all screen sizes.
- CSS: Ensured WhatsApp button icon is always white and visually consistent.
- CSS: Adjusted z-index so the cookie banner overlays the WhatsApp button when visible.

### Fixed
- Fixed CSP violation by removing all inline styles from WhatsApp button markup and moving all styling to CSS.
- Fixed responsive alignment issues for WhatsApp button between mobile and desktop breakpoints.
- Fixed duplicate and conflicting `.wa-fab` CSS blocks in `style.css`.

### Security
- WhatsApp button implementation respects strict CSP and accessibility requirements (ARIA, i18n, visually hidden text).

## [v1.0.7] - 2025-12-25
### Added
- New friendly error page for invalid/expired CAPTCHA: `pages/error-captcha.html` (shown on browser POST fallback, no more cryptic JSON for users).
- i18n: Added/updated `error.captcha` keys (title/message) in all language JSON files for consistent multilingual error display.

### Changed
- `api/sendmail.php`: Now detects browser POSTs and redirects to `/pages/error-captcha.html` on CAPTCHA failure (instead of returning JSON). AJAX requests still receive JSON as before.
- Improved error handling and user experience for contact form failures (CAPTCHA/session/rate-limit) in both JS and non-JS scenarios.

### Fixed
- Ensured all error pages and i18n keys are present and correct in all supported languages (de, en, pl, hu, it, ro, sk, cs, bg).

### Security
- No sensitive error details are exposed to end users; all error responses are now user-friendly and localized.

## [v1.0.6] - 2025-12-24
### Changed
- Updated marketing copy and SEO-oriented texts in all language JSON files (`home.hero.lead`, `home.features.zentral.text`, `home.features.fair.text`, and selected meta descriptions) to consistently emphasize worker apartments near Düsseldorf Airport and Exhibition Centre, including transparent pricing from 25 EUR per day.

## [v1.0.5] - 2025-12-15
### Added
- `api/contact_form_health.php`: token-protected healthcheck endpoint that exercises the server-side contact-mail path and returns HTTP 200 on success.
- Local, append-only `api/contact_form_health.log` to record attempts, successes and failures (visible via FTP for easy troubleshooting).
- New health configuration entries in `api/weekly_mail_config.php`: `health_token`, `health_to` (supports multiple recipients), `health_subject` and `health_body`.

### Changed
- Removed experimental weekly-mailer artifacts: `api/weekly_mailer.php` and `api/weekly_mailer_webhook.php` and cleaned related webhook configuration from `api/weekly_mail_config.php`.
- `contact_form_health.php` now implements a lockfile to avoid duplicate runs (returns 429 when retriggered within the lock window) and writes concise local logs for visibility.
- README updated to document the contact-form healthcheck and recommended `cron-job.org` setup; obsolete weekly-mailer documentation removed.

### Fixed
- Improved healthcheck logging and error handling: failures now write a descriptive entry to the local log and to `error_log()` for host-level diagnostics.

### Security
- Healthcheck endpoint is protected by a long `health_token` and optionally respects an IP allowlist when configured.

## [v1.0.4] - 2025-12-14
### Changed
- Improved debug environment detection: now supports .htaccess SetEnv, config.local.php, and multiple PHP env sources for robust debug toggling.
- Debug headers and diagnostic logging are now only emitted when DERKO_DEBUG is enabled, reducing log noise in production.
- Logging logic now attempts multiple paths and reports write status for easier diagnostics on shared hosting.

### Fixed
- CSRF failures are now always logged to error.log, regardless of debug mode, ensuring all security-relevant errors are documented.
- Fixed issue where error.log was not updated due to PHP file status caching or environment propagation issues on Strato/Apache shared hosting.

### Security
- Hardened CSRF/session error logging: always records reason, session state, and minimal context for every CSRF failure.
- Ensured that successful contact form submissions do not create log entries, keeping error.log focused on real issues.

## [v1.0.3] - 2025-12-14
### Added
- Added `privacyKeyword` and updated `privacyConsent` in all language JSONs for robust i18n privacy policy linking in the contact form ([see discussion](https://github.com/halukmt/derko/issues/)).
- Czech (cs.json) language file brought up to date with all missing keys from German (de.json), with correct translations.

### Changed
- kontakt.js: Privacy policy link logic now uses i18n `privacyKeyword` for all languages and always links to the central privacy page (datenschutz.html or /datenschutz).
- All language JSONs: Consent texts aligned to ensure the privacy keyword is present and linkable in every language.

### Fixed
- Fixed missing privacy policy link in non-German languages on the contact form.
- Fixed structural inconsistencies in cs.json and other language files for i18n completeness.


## [v1.0.2] - 2025-12-14
### Changed
- All legal and footer links now consistently use .html endings (e.g., impressum.html, agb.html, datenschutz.html, kontakt.html) for compatibility in both local development and production environments.
- Removed canonical URL rewrites in JS for legal/footer links; now direct .html links are used everywhere for clarity and reliability.
- Updated privacy policy link in contact form to use datenschutz.html for local/prod compatibility.
- Navigation and footer link logic unified for consistent behavior across environments.

### Fixed
- Fixed 404 errors when opening legal/footer links locally (php -S) by standardizing on .html URLs.
- Resolved confusion between canonical and .html URLs in navigation and footer.

## [v1.0.1] - 2025-11-23
### Changed
- Footer: Code and structure updated for clarity and maintainability. All legal and contact links now use i18n keys and absolute routes. Social media links are accessible and use ARIA labels. No functional changes, but improved markup and internationalization consistency.

## [v1.0.0] - 2025-10-24

First public launch of the DERKO Immobilien website with security hardening, full multilingual support, and production-ready contact flow.

### Highlights
- Security and robustness
  - Strict Content Security Policy (CSP); removed inline scripts and extracted JS.
  - Unified 404 page and hardened error handling.
  - CSRF protection with session tokens and refresh on form load.
  - CAPTCHA + honeypot + rate limiting for contact form.
  - Sanitizer preserves safe attributes (aria-*, data-*), preventing XSS while keeping accessibility.
- Privacy‑friendly email protection
  - Removed public mailto links; added JS click‑to‑reveal using obfuscated spans.
  - i18n label for the reveal button: `legal.revealEmail`.
- Full multilingual rollout (parity with `de.json`)
  - Locales: German (de), English (en), Polish (pl), Hungarian (hu), Slovak (sk), Czech (cs), Italian (it), Bulgarian (bg), Romanian (ro).
  - Each locale includes: UI translations (JSON) and legal pages (Impressum, Datenschutz/Privacy, AGB/Terms).
  - Language switcher with flags; selection persists; backend emails localized (user in selected language, operator in German).
- UX and accessibility
  - Improved form validations and ARIA labeling.
  - Responsive layout, consistent spacing, and mobile navigation refinements.
  - Cache busting for critical assets; removed duplicate renders.
- Backend/API
  - `api/sendmail.php` supports multi‑language templates; Accept‑Language + POST override; safe defaults.
  - Centralized configuration for email; guards for missing configs.

### Added
- Obfuscated, click‑to‑reveal email components across pages.
- New locale folders: `lang/pl`, `lang/hu`, `lang/sk`, `lang/cs`, `lang/it`, `lang/bg`, `lang/ro` with complete translations.
- Romanian: completed Privacy (ro.datenschutz.html) and Terms (ro.agb.html).

### Changed
- Extracted inline JS to dedicated files for CSP compliance.
- Navigation with flag‑based language switcher; footer links internationalized.
- Legal content moved to per‑locale HTML partials referenced from locale JSON.

### Fixed
- Resolved duplicate trailing JSON stub in `lang/cs/cs.json` causing parse errors.
- Addressed minor layout issues and ensured consistent apartment details across locales.

### Security
- Strict CSP, CSRF, CAPTCHA, and email obfuscation to reduce spam and automated scraping.

### Notes
- Robots and sitemap: `robots.txt` present; `sitemap.xml` expected at site root (ensure it is generated/deployed if applicable).
- Deployment recommendation: build or sync only the production assets and purge removed files on the server.

## [v0.9.2] - 2025-10-24
### Added
- E-Mail-Obfuskation für rechtlich erforderliche Kontaktadresse:
	- Neues Skript `assets/js/email-reveal.js` wandelt zur Laufzeit `<span class="obf-email" data-user data-domain>` in klickbare `mailto:`-Links um.
	- Funktioniert ohne Inline-JS und reagiert auf `i18n:ready`/`i18n:changed` (Partials nachgeladen).
- Wrapper-Seiten für Rechtstexte eingebunden (nutzen weiterhin i18n-Partials):
	- `pages/impressum.html`, `pages/datenschutz.html` laden Inhalte über `data-i18n-html` (`lang/<code>/*.html`).

### Changed
- Footer- und Navigationslinks auf „schöne“ absolute Routen umgestellt (sprach-/seitenkontext‑robust):
	- Footer (`components/footer.html`): `/impressum`, `/agb`, `/datenschutz`, `/kontakt`.
	- Header/Navigation (`assets/js/main.js`): Link-Setzung vereinheitlicht auf Pretty-URLs.
	- Cookie-Banner „Datenschutz“-Button leitet jetzt auf `/datenschutz`.
- 404-Handling konsolidiert:
	- Benutzerdefinierte 404-Seite lebt unter `pages/404.html` (i18n, keine Inline-Skripte, absolute Assets).
	- `.htaccess` nutzt `ErrorDocument 404 /pages/404.html` und schließt die Datei von Rewrites aus.

### Removed
- Veraltete Root-Fehlerseite `404.html` entfernt (es existiert nur noch `pages/404.html`).

### Notes / Dev
- Lokale Dev-Server ohne Apache/.htaccess zeigen weiterhin Dateiendungen und keine benutzerdefinierte 404.
	Für realitätsnahe Tests lokal Apache nutzen (oder PHP Built-in mit Router), auf dem Hoster greift `.htaccess`.

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

[v2.0.6]: https://github.com/halukmt/derko/compare/v2.0.5...v2.0.6
[v2.0.0]: https://github.com/halukmt/derko/compare/v1.5.2...v2.0.0
[v1.5.2]: https://github.com/halukmt/derko/compare/v1.5.1...v1.5.2
[v1.5.1]: https://github.com/halukmt/derko/compare/v1.5.0...v1.5.1
[v1.5.0]: https://github.com/halukmt/derko/compare/v1.4.2...v1.5.0
[v1.4.2]: https://github.com/halukmt/derko/compare/v1.4.1...v1.4.2
[v1.3.0]: https://github.com/halukmt/derko/compare/v1.2.0...v1.3.0
[v1.2.0]: https://github.com/halukmt/derko/compare/v1.1.0...v1.2.0
[v1.1.0]: https://github.com/halukmt/derko/compare/v1.0.7...v1.1.0
[v1.0.7]: https://github.com/halukmt/derko/compare/v1.0.6...v1.0.7
[v1.0.6]: https://github.com/halukmt/derko/compare/v1.0.5...v1.0.6
[v1.0.5]: https://github.com/halukmt/derko/compare/v1.0.4...v1.0.5
[v1.0.4]: https://github.com/halukmt/derko/compare/v1.0.3...v1.0.4
[v1.0.3]: https://github.com/halukmt/derko/compare/v1.0.2...v1.0.3
[v1.0.2]: https://github.com/halukmt/derko/compare/v1.0.1...v1.0.2
[v1.0.1]: https://github.com/halukmt/derko/compare/v1.0.0...v1.0.1
[v1.0.0]: https://github.com/halukmt/derko/releases/tag/v1.0.0
