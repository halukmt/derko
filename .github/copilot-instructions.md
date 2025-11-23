# Copilot & AI Agent Instructions for DERKO Immobilien Website

## Project Overview
- **Type:** Static multilingual website with minimal PHP backend (mail, CAPTCHA)
- **Frontend:** Bootstrap 5.3 (CDN), Font Awesome, Inter font, no build tool required
- **Backend:** PHP endpoints for contact form, CSRF, CAPTCHA (see `api/`)
- **i18n:** JSON files per language in `lang/`, HTML partials for legal pages
- **Components:** HTML partials in `components/` loaded via JS fetch
- **Data:** Apartment/variant data in `assets/data/*.json`

## Key Patterns & Conventions
- **No build step:** All JS/CSS is loaded directly; components are fetched at runtime
- **Strict CSP:** No inline scripts/styles; all JS must be in external files
- **i18n:** Use `data-i18n`, `data-i18n-meta`, `data-i18n-html` attributes; see `assets/js/lang.js`
- **Cards:** Feature and apartment cards are rendered dynamically from JSON and i18n keys (see `main.js`)
- **Image handling:** Responsive AVIF/WebP/PNG with `srcset`; optimize with `assets/js/optimize-images.js`
- **Security:**
  - CSRF tokens via `api/csrf.php` (see `sendmail.php` for validation)
  - Rate limiting, honeypot, CAPTCHA, and header sanitization in `api/sendmail.php`
  - Security headers set via `.htaccess`
- **Contact form:**
  - POST to `api/sendmail.php`, config in `api/config.php`
  - Required fields: name, email, phone, topic, message, privacy consent
  - Booking topic requires extra fields (dates, apartment, persons)

## Developer Workflow
- **Local dev:**
  - Start PHP server: `php -S localhost:8080 -t .`
  - Or static: `npx http-server -p 8080`
- **Image optimization:** `node assets/js/optimize-images.js` (requires `sharp`)
- **Branch naming:** `feat/<nr>-desc`, `fix/<nr>-desc`
- **Commits:** Reference issues, e.g. `feat: add X (refs #123)`
- **PRs:** Use `Fixes #123` to auto-close issues

## Adding Apartments
1. Add images to `assets/img/wohnungen/<key>/`
2. Add i18n keys to all language JSONs under `wohnungen.cards.<key>`
3. Add entry to `data-cards` array in `pages/wohnungen.html`

## Accessibility & SEO
- Use ARIA, skip links, semantic headings
- All images must have localized alt texts via i18n keys
- JSON-LD for SEO in main and apartment pages
- Hreflang/canonical tags for all main pages

## Testing & Troubleshooting
- Test contact form with honeypot, minimum time, CAPTCHA
- Use browser dev tools to debug i18n and card loading
- CSP errors: ensure all scripts/styles are external

## Key Files/Dirs
- `assets/js/main.js`, `assets/js/lang.js`, `assets/js/optimize-images.js`
- `api/sendmail.php`, `api/csrf.php`, `api/config.php`
- `components/`, `lang/`, `pages/`, `assets/data/`

---
For more, see `README.md` and comments in key JS/PHP files. Update this file if project conventions change.
