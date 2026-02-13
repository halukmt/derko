
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
- **api/config.local.php:** Local overrides (gitignored). Create this file for dev email addresses or debug mode. Example: `define('DERKO_DEBUG', true);`
- **.htaccess:** Security headers (CSP, COOP/COEP/CORP, X-Frame-Options), URL rewrites (pretty URLs), MIME types (AVIF/WebP), cache headers, log file protection. Debug mode: `SetEnv DERKO_DEBUG 1`.
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
**No automated tests.** Manual validation steps:
1. **Contact form:** Fill, submit, check email delivery. Test honeypot (instant submit), CAPTCHA (wrong answer), rate limit (multiple submits). Verify CSRF token fetch in browser DevTools Network tab.
2. **i18n:** Change language via `?lang=de`, check all 9 languages load correctly. Inspect console for missing keys.
3. **Cards:** Verify apartment cards render on `/wohnungen`. Check images load (AVIF → WebP → PNG fallback). Inspect JSON-LD in page source.
4. **CSP:** Open browser console, check NO CSP errors. If errors, ensure no inline scripts/styles.
5. **Responsive images:** Network tab → verify AVIF loads in Chrome/Edge, WebP in Firefox, PNG fallback in old browsers.
6. **Build:** Run `npm run build`, verify `dist/` contains minified files. Serve `dist/` locally, test all pages.

## Debugging
**Enable debug mode:** Set `DERKO_DEBUG=1` in `.htaccess` OR `define('DERKO_DEBUG', true);` in `api/config.local.php`. Writes logs to `api/logs/error.log`. Exposes debug info in response headers (X-DERKO-DEBUG) and JSON responses.
**CAPTCHA debug:** In `api/captcha.php`, set `$debug = true;`. Writes to `api/logs/captcha_debug.log`.
**Logs:** `api/logs/error.log` (global), `api/logs/captcha_debug.log` (CAPTCHA only). NOT web-accessible (protected by `.htaccess`).
**Disable debug in production:** Set `DERKO_DEBUG=0` in `.htaccess`.

## Common Workflows
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

## Critical Files (Read These First)
- `README.md` (debug, weekly mailer, security, SPF/DKIM setup)
- `assets/js/main.js` (component injection, card rendering, nav logic)
- `assets/js/lang.js` (i18n engine, sanitization whitelist)
- `api/sendmail.php` (contact form backend, security layers)
- `api/config.php` (email config, rate limits)
- `.htaccess` (rewrites, security headers, caching)
- `package.json` (build scripts)

**Trust these instructions.** Only search codebase if information is incomplete or contradicts observed behavior. When implementing features, maintain existing patterns (external JS, data-i18n attrs, CSP compliance, i18n keys for all 9 languages).
