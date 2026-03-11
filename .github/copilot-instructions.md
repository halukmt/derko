
# Copilot & AI Agent Instructions for DERKO Immobilien Website

## Project Overview
Static multilingual apartment rental website with minimal PHP backend. 9 languages (DE, EN, PL, HU, SK, CS, IT, BG, RO). Production-ready with strict CSP, AVIF/WebP images, JSON-LD SEO. ~50 source files, no framework, CDN-based Bootstrap 5.3.

## Environment Setup
**Required:** Node.js 14+ (for image optimization & build), PHP 7.4+ (for local dev server & contact form)
**Install dependencies:** `npm install` (installs sharp, esbuild, clean-css-cli, html-minifier-terser, etc.)
**Local development server:** `php -S localhost:8080 -t .` OR `npx http-server -p 8080` (PHP required for contact form testing)
**Note:** PHP may not be in PATH on Windows dev machines. If `php` command fails, install from php.net or use XAMPP/Laragon.

## Build & Optimization
**Production build:** `npm run build` — Creates minified assets in `dist/` folder. Steps: clean → copy files → minify JS (esbuild) → minify CSS (clean-css) → minify HTML (html-minifier-terser).
**Image optimization:** `npm run optimize:images` — Generates AVIF/WebP responsive variants (400/800/1200px) from source PNGs in `assets/img/`. ALWAYS run after adding new apartment images. Use `--force` flag to regenerate existing.
**Individual apartment images:** `npm run optimize:images:allgemein` for general images only.
**Build output:** `dist/` folder (gitignored). Deploy `dist/` contents to production, NOT the source files.

## Project Structure
- **Root:** `index.html`, `.htaccess` (rewrites, security headers), `robots.txt`, `sitemap.xml`
- **api/:** PHP backend – `sendmail.php` (contact form), `csrf.php` (token gen), `captcha.php`, `config.php` (email addresses), `config.local.php` (local overrides, gitignored), `contact_form_health.php` (monitoring)
- **assets/data/:** `apartments.json`, `variants.json` (apartment metadata & image variants)
- **assets/img/:** Images – `allgemein/` (features), `wohnungen/<key>/` (apartment images), `logo/`, `partner/`
- **assets/js/:** `main.js` (components, cards, nav), `lang.js` (i18n engine), `kontakt.js` (form), `optimize-images.js` (build tool), `wohnung-detail.js`, etc.
- **assets/css/:** `style.css` (custom styles, Bootstrap via CDN in HTML)
- **components/:** `header.html`, `footer.html`, `card.html`, `whatsapp-button.html` (injected via fetch in main.js)
- **lang/<code>/:** JSON translation files (`de.json`, `en.json`, etc.) + legal HTML partials (`de.agb.html`, etc.)
- **pages/:** All subpages (`wohnungen.html`, `kontakt.html`, `ueber-uns.html`, `faq.html`, `404.html`, etc.)
- **.well-known/:** `security.txt`

## Configuration Files
- **api/config.php:** Email addresses (`DERKO_CONTACT_TO`, `DERKO_CONTACT_FROM`), rate limits, CSRF TTL. Override via environment variables or `api/config.local.php`.
- **api/config.local.php:** Local overrides (gitignored). **IMPORTANT:** Copy from `config.local.example.php` and fill in real values. NEVER commit this file! Example: `define('DERKO_DEBUG', true);`
- **api/weekly_mail_config.php:** Healthcheck configuration with tokens and admin emails (gitignored). **IMPORTANT:** Copy from `weekly_mail_config.example.php` and generate a secure token. NEVER commit this file!
- **.htaccess:** Security headers (CSP, COOP/COEP/CORP, X-Frame-Options), URL rewrites (pretty URLs), MIME types (AVIF/WebP), cache headers, log file protection. Debug mode via `SetEnv DERKO_DEBUG 1` (commented out by default).
- **package.json:** npm scripts for build/optimization. Dependencies are locked in `package-lock.json`.

## Key Architecture Patterns
**No build step for dev:** Load JS/CSS directly from source. Components fetched at runtime via `main.js`. Production uses minified `dist/`.
**Strict CSP:** No inline scripts/styles. All JS must be external files. Use `setAttribute()` for dynamic attributes.
**i18n:** `data-i18n="key.path"`, `data-i18n-meta="title:key.path"`, `data-i18n-html="key.path"` attrs. Translation engine in `lang.js`. Language detection from `?lang=` param or browser Accept-Language.
**Dynamic cards:** Feature cards (hardcoded in `main.js`), apartment cards (data-driven from `data-cards` JSON in `pages/wohnungen.html` + i18n keys). Card template in `components/card.html`.
**Responsive images:** AVIF/WebP with `<picture>` + `srcset`. Fallback PNG. Generate with `optimize-images.js`.
**Contact form flow:** Client validates → fetches CSRF token (`api/csrf.php`) → submits to `api/sendmail.php` → server validates (CSRF, honeypot, CAPTCHA, rate limit, sanitize) → sends email → returns JSON.

## Security (Critical)
**CSRF:** Token from `api/csrf.php`, validated in `sendmail.php`. 10min TTL (configurable). Fail → 400.
**Rate limiting:** Max 1 submission/60s per IP (configurable). Fail → 429 redirect to `pages/error-rate-limit.html`.
**Honeypot + timing:** Hidden field + 3s minimum form time. Fail → reject silently.
**CAPTCHA:** Simple math challenge. Wrong answer → redirect to `pages/error-captcha.html`.
**Input sanitization:** Strip tags, charset whitelist, length limits, max 2 URLs in message, block disposable email domains (mailinator, trashmail, etc.). See `sendmail.php` for details.
**Headers:** `.htaccess` sets CSP (no unsafe-inline), X-Frame-Options DENY, COOP/COEP/CORP, Referrer-Policy. Test with securityheaders.com.
**Log protection:** `.htaccess` blocks access to `*.log` and `*.local.php` files.
**Session cookies:** Secure, HttpOnly, SameSite=Lax. Harmonized in `sendmail.php`.

## Testing & Validation

### Automated E2E Tests (Playwright)
**Prerequisites:** Docker running (`npm run docker:up` → http://localhost:8081, Mailpit → http://localhost:9000), `DERKO_DEBUG=1` in `docker-compose.yml` (already set).

```bash
npm test                              # Full run: Chromium + Firefox (~5-6 min, 282 tests)
npx playwright test --project=chromium  # Chromium only (~2 min, 141 tests) — faster for dev
npx playwright test contact-form.spec.ts  # Only one spec file
npx playwright test -g "F-02"         # Filter by test name
npm run test:ui                       # Interactive UI mode
npm run test:report                   # Open last HTML report in browser
```

**Test files** (`tests/e2e/`):
- `routing.spec.ts` — All URL routes, language prefixes, 301 redirects, 404
- `canonical-seo.spec.ts` — Canonical URLs, hreflang, sitemap, OG tags
- `contact-form.spec.ts` — Form submission, CSRF, CAPTCHA, rate limit, Mailpit email delivery
- `pages.spec.ts` — All pages load, header/footer, apartment titles, language UI, mobile

**Workflow:** During development → run only the affected spec. Before PR/merge → `npm test` (full run).

**Flaky tests:** F-08 (Firefox, Mailpit timing) may occasionally need a retry — `retries: 1` is already configured and handles this automatically.

**`api/test-helper.php`** is a debug-only endpoint (only active when `DERKO_DEBUG=1`) used by Playwright to read CAPTCHA codes from the PHP session. Never deploy with `DERKO_DEBUG=1` in production.

### Manual Testing (Visual / Design)
Automated tests do NOT cover these — check manually:
1. **Visual design** — Fonts, colors, spacing, images look correct in all languages
2. **Gallery** — Lightbox opens/closes, swipe on real mobile device
3. **Language switcher** — All 9 languages display correctly, active state correct
4. **Real mobile device** — Safari iOS, not just 375px viewport simulation
5. **CSP:** Browser console shows NO CSP errors after any JS change

## Debugging
**Enable debug mode:** Set `DERKO_DEBUG=1` in `.htaccess` OR `define('DERKO_DEBUG', true);` in `api/config.local.php`. Writes logs to `api/logs/error.log`. Exposes debug info in response headers (X-DERKO-DEBUG) and JSON responses.
**CAPTCHA debug:** In `api/captcha.php`, set `$debug = true;`. Writes to `api/logs/captcha_debug.log`.
**Logs:** `api/logs/error.log` (global), `api/logs/captcha_debug.log` (CAPTCHA only). NOT web-accessible (protected by `.htaccess`).
**Disable debug in production:** Set `DERKO_DEBUG=0` in `.htaccess`.

## Common Workflows
**First-time setup:** (1) Copy `api/config.local.example.php` to `api/config.local.php` and fill in your email addresses. (2) Copy `api/weekly_mail_config.example.php` to `api/weekly_mail_config.php` and generate a secure token (use `openssl rand -hex 16`). (3) Never commit these files to git!
**Add apartment:** (1) Create `assets/img/wohnungen/w##_key/main.png` + detail images. (2) Run `npm run optimize:images`. (3) Add i18n keys to all 9 `lang/<code>/<code>.json` under `wohnungen.cards.w##_key`. (4) Add entry to `data-cards` array in `pages/wohnungen.html`. (5) Test locally.
**Update translations:** Edit `lang/<code>/<code>.json`. No build step needed (loaded dynamically). Clear browser cache if changes don't appear.
**Deploy:** (1) Run `npm run build`. (2) Upload `dist/` contents to production server. (3) Verify `.htaccess` and `api/config.local.php` on server. (4) Test contact form on production.

## Known Issues & Workarounds
- **PHP not in PATH (Windows):** Install PHP from php.net and add to PATH, OR use full path like `C:\php\php.exe -S localhost:8080 -t .`
- **Image optimization fails:** Ensure `npm install` ran successfully (sharp has native dependencies). On Windows, may require Visual Studio Build Tools.
- **Contact form doesn't send:** Check `api/config.local.php` exists with valid email addresses. Check server mail() function works (some shared hosts block it). Enable debug mode, check logs.
- **AVIF not loading:** Old browsers. Verify fallback WebP/PNG in `<picture>` source order.
- **URL rewrite not working locally:** `npx http-server` doesn't support rewrites. Use `php -S` instead OR access pages directly (`/pages/kontakt.html`).

## CI/CD & Deployment
**No GitHub Actions/CI.** Manual deployment. Recommended: Run `npm run build` locally, upload `dist/` via FTP/SFTP to shared host (Strato). Verify environment variables or `api/config.local.php` on server before going live.
**Before deploying:** Run `npm test` (requires Docker). All 282 tests must pass (Chromium + Firefox).

## Critical Files (Read These First)
- `README.md` (debug, weekly mailer, security, SPF/DKIM setup)
- `assets/js/main.js` (component injection, card rendering, nav logic)
- `assets/js/lang.js` (i18n engine, sanitization whitelist)
- `api/sendmail.php` (contact form backend, security layers)
- `api/config.php` (email config, rate limits)
- `.htaccess` (rewrites, security headers, caching)
- `package.json` (build scripts)

**Trust these instructions.** Only search codebase if information is incomplete or contradicts observed behavior. When implementing features, maintain existing patterns (external JS, data-i18n attrs, CSP compliance, i18n keys for all 9 languages).
