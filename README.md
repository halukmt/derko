# DERKO Immobilien Website

A modern, multilingual static website for property management with minimal PHP backend for contact forms and security features.

## Table of Contents

- [About](#about)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Testing Your Setup](#testing-your-setup)
  - [Troubleshooting Setup](#troubleshooting-setup)
- [Collaboration](#collaboration)
  - [Branching](#branching)
  - [Pull Requests](#pull-requests)
  - [Commit Messages](#commit-messages)
  - [General Rules](#general-rules)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Development](#development)
  - [Adding New Apartments](#adding-new-apartments)
  - [Show / Hide the Apartments Section](#show--hide-the-apartments-section)
  - [Internationalization](#internationalization)
  - [Image Optimization](#image-optimization)
- [Security](#security)
- [Performance](#performance)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## About

This is a static multilingual website for property management with a minimal PHP backend. The project focuses on performance, security, accessibility, and SEO best practices.

### Key Technologies

- **Frontend:** Bootstrap 5.3 (CDN), Font Awesome, Inter font family
- **Backend:** PHP for email handling, CSRF protection, and CAPTCHA
- **Build:** No build tool required - all assets loaded directly
- **i18n:** JSON-based translations with HTML partials for legal pages

## Features

- 🌍 **Multilingual** - Full i18n support with language switching
- 🔒 **Secure** - CSRF protection, rate limiting, input sanitization, strict CSP
- ⚡ **Fast** - Optimized images (AVIF/WebP), lazy loading, preloading
- ♿ **Accessible** - ARIA labels, semantic HTML, skip links
- 📱 **Responsive** - Mobile-first design with Bootstrap 5
- 🎨 **Dynamic Cards** - Feature and apartment cards rendered from JSON
- 📧 **Contact Form** - Secure form with honeypot, CAPTCHA, and validation
- 🔍 **SEO-Optimized** - JSON-LD structured data, semantic markup

## Getting Started

### Prerequisites

- **PHP 7.4+** (required for local development and backend features)
- **Node.js 14+** (required for build tools and image optimization)
- **Git** (for cloning the repository)

### Initial Setup (First Time)

Follow these steps to set up the project on your local machine:

#### 1. Clone the Repository

```bash
git clone https://github.com/halukmt/derko.git
cd derko
```

#### 2. Install Dependencies

Install Node.js dependencies for image optimization and build tools:

```bash
npm install
```

This installs: `sharp` (image processing), `esbuild` (JS minification), `clean-css-cli` (CSS minification), and `html-minifier-terser` (HTML minification).

#### 3. Create Configuration Files

The project uses local configuration files that are **not tracked in Git** for security reasons:

**a) Create `api/config.local.php`:**
- Copy `api/config.local.example.php` to `api/config.local.php`
- Edit the file and set your email addresses for testing
- Enable `DERKO_DEBUG` for local development

**b) Create `api/weekly_mail_config.php`:**
- Copy `api/weekly_mail_config.example.php` to `api/weekly_mail_config.php`
- Generate a secure random token (use `openssl rand -hex 16` or similar)
- Update the file with your token and admin email addresses

**⚠️ Important:** Never commit these files to version control!

#### 4. (Optional) Enable Debug Mode in .htaccess

For local development, you can enable debug mode globally in `.htaccess` by uncommenting line 2:

```apache
SetEnv DERKO_DEBUG 1
```

**⚠️ Important:** Disable this before deploying to production!

#### 5. Create Log Directory

Create the logs directory if it doesn't exist:

```bash
# Windows (PowerShell)
New-Item -ItemType Directory -Path api\logs -Force

# macOS/Linux
mkdir -p api/logs
```

### Local Development Server

Two modes are available depending on what you need to test:

---

#### Mode 1: `npm run dev` — Quick local dev (PHP built-in server)

> ⚠️ **Important:** Always use `router.php` when starting the PHP built-in server. Without it, language URLs (`/en/wohnungen`) return 404 and the custom error page is not shown.

```bash
npm run dev
```

- **URL:** `http://localhost:8080`
- Pretty URLs and language-prefixed URLs work via `router.php`
- **No** Apache, **no** email sending, **no** security/cache headers
- Requires PHP installed locally
- ✅ Best for: quick JS/CSS/HTML changes

**Or run PHP directly:**

```bash
php -S localhost:8080 router.php
```

---

#### Mode 2: `npm run docker:up` — Strato simulation (Apache + Mailpit)

```bash
npm run docker:up    # start
npm run docker:down  # stop
```

- **Website:** `http://localhost:8081`
- **Mailpit (email UI):** `http://localhost:9000`
- Full Apache + `.htaccess` active: 301 redirects, security headers, cache headers, AVIF/WebP MIME types
- All `mail()` calls are caught by Mailpit — no real emails sent
- Requires Docker Desktop running
- ✅ Best for: email testing, URL redirects, header validation

> **Port note (Windows/Hyper-V):** Ports 7981–8080 are reserved by Hyper-V on Windows. The Docker setup therefore uses port **8081** (web) and **9000** (Mailpit) instead of the more common 8080/8025.

---

**Quick reference:**

| What to test | Command |
|---|---|
| Quick UI changes | `npm run dev` |
| Email, URLs, headers | `npm run docker:up` |
| Production build | `npm run build` |

---

**Alternative (no URL routing or custom 404):** Use a Node.js static server (limited functionality — contact form, pretty URLs and custom 404 won't work):

```bash
npx http-server -p 8080
```

### Testing Your Setup

1. **Homepage loads** - Navigate to `http://localhost:8080`
2. **Language switching works** - Try `?lang=en`, `?lang=de`, etc.
3. **Contact form loads** - Navigate to `/pages/kontakt.html`
4. **CAPTCHA displays** - Check if the CAPTCHA image appears
5. **Form submission** - Fill out and submit the contact form (check your configured email)

### Troubleshooting Setup

| Issue | Solution |
|-------|----------|
| `php` command not found | Install PHP from [php.net](https://www.php.net/downloads) and add to PATH |
| `npm install` fails | Ensure Node.js 14+ is installed. On Windows, may need Visual Studio Build Tools |
| Contact form doesn't send | Verify `api/config.local.php` exists with valid email addresses |
| CAPTCHA doesn't display | Check PHP session configuration, ensure `api/captcha.php` is accessible |
| Permission denied errors | Ensure `api/logs/` directory exists and is writable |

## Collaboration

This repository follows a pull request--based workflow to keep `main`
stable and production-ready.

### Branching

-   Never commit directly to `main`
-   Always create a separate branch from the latest `main`
-   Use a clear and meaningful branch name (e.g. `seo-update`,
    `faq-section`, `header-refactor`)

Example:

``` bash
git checkout main
git pull
git checkout -b seo-update
```

### Pull Requests

-   Open a Pull Request targeting `main`
-   Provide a short and clear description of the change
-   Wait for at least 1 review before merging
-   Merges are done using **Squash & Merge**

### Commit Messages

Use clear and descriptive commit messages.

Good examples:

    Add structured FAQ section
    Fix canonical URL handling
    Refactor navigation component

Avoid vague messages like:

    update
    fix
    changes

### General Rules

-   No direct pushes to `main`
-   No force pushes
-   No sensitive data (API keys, credentials, `.env` files)

The goal is a clean history, stable releases, and professional
collaboration.


## Project Structure

```
├── api/                  # PHP backend endpoints
│   ├── config.php        # Configuration (use environment variables)
│   ├── sendmail.php      # Contact form handler
│   ├── csrf.php          # CSRF token generation
│   └── captcha.php       # CAPTCHA generation
├── assets/
│   ├── css/             # Stylesheets
│   ├── img/             # Images (optimized variants)
│   ├── js/              # JavaScript modules
│   └── data/            # JSON data files
├── components/          # HTML partials (header, footer, etc.)
├── lang/               # i18n JSON files
├── pages/              # HTML pages
├── .htaccess           # Server configuration and security headers
└── index.html          # Main entry point
```

## Configuration

### Environment Variables

Configure the application using environment variables (recommended for production):

```bash
# Email configuration
DERKO_CONTACT_TO="your-email@example.com"
DERKO_CONTACT_FROM="noreply@example.com"

# Security settings
DERKO_CSRF_TTL=600          # CSRF token lifetime in seconds
DERKO_RATE_WINDOW=600       # Rate limit window in seconds
DERKO_RATE_MAX=3            # Max submissions per window

# Debug mode (disable in production!)
DERKO_DEBUG=0
```

### Local Configuration

Alternatively, create `api/config.local.php` for local overrides:

```php
<?php
define('DERKO_CONTACT_TO', 'your-email@example.com');
define('DERKO_CONTACT_FROM', 'noreply@example.com');
define('DERKO_DEBUG', false);
```

**Never commit sensitive configuration to version control!**

## Development

### Adding New Apartments

1. **Add images** to `assets/img/wohnungen/<key>/main.png`
2. **Update translations** in all language files (`lang/*.json`):
   ```json
   "wohnungen": {
     "cards": {
       "w01_example": {
         "title": "Apartment Title",
         "text": "Description...",
         "button": "View Details",
         "alt": "Alt text for image"
       }
     }
   }
   ```
3. **Add entry** to `data-cards` array in `pages/wohnungen.html`:
   ```json
   {"key":"w01_example","img":"/assets/img/wohnungen/w01_example/main.png","alt":"Apartment Example"}
   ```
4. **Refresh** the page (clear cache if needed)

### Show / Hide the Apartments Section

The entire apartments section can be taken offline and brought back with the project
skill `/wohnungen-toggle` (defined in `.claude/skills/wohnungen-toggle/SKILL.md`).
It asks whether apartments should be shown and then applies the change:

| | Visible | Hidden |
|---|---|---|
| Overview page | `pages/wohnungen.html` | `pages/wohnungen_x.html` |
| Detail page | `pages/wohnung-detail.html` | `pages/wohnung-detail_x.html` |
| Nav entry | active | commented out in `components/header.html` |

While hidden, every apartment URL returns a real HTTP 404 — the overview page, all
detail pages, all 9 language variants, and legacy `?id=` links — because Apache's
existing `ErrorDocument 404 /pages/404.html` directive takes over as soon as the
rewrite target is missing. Links that still point at apartments (homepage button,
feature cards, FAQ links, contact form dropdown) therefore land on the 404 page,
which is the intended behavior.

Only those three items change. `.htaccess`, `router.php`, `api/*`, `lang/*` and all
JS files stay untouched.

> **After toggling, do a hard reload** (Ctrl+F5). `components/header.html` is cached
> by the browser, so the nav entry may otherwise still appear. A Docker restart is
> *not* needed — the project directory is mounted into the container.

Verify manually with Docker running:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/wohnungen
```

Or run the automated tests: `npm run test:toggle` (see [Testing](#testing)).

### Internationalization

The site uses a custom i18n system with:

- `data-i18n` - Simple text translation
- `data-i18n-meta` - Meta tag translations
- `data-i18n-html` - HTML content translation

See `assets/js/lang.js` for implementation details.

### Image Optimization

Generate optimized AVIF and WebP variants:

```bash
npm install sharp
node assets/js/optimize-images.js
```

This creates responsive image variants with optimal quality settings.

## Security

### Built-in Security Features

- **CSRF Protection** - Token-based validation for all forms
- **Rate Limiting** - Maximum 3 submissions per 10 minutes per IP
- **Input Sanitization** - Strict validation and filtering
- **Honeypot Field** - Bot detection
- **CAPTCHA** - Human verification
- **Strict CSP** - No inline scripts or styles allowed
- **Security Headers** - X-Frame-Options, HSTS, Referrer-Policy, etc.
- **Disposable Email Blocking** - Prevention of temporary email services

### Debug Mode

**Warning:** Only enable debug mode in development environments!

Enable globally in `.htaccess`:
```
SetEnv DERKO_DEBUG 1
```

Or in `api/config.local.php`:
```php
define('DERKO_DEBUG', true);
```

Debug logs are written to `api/logs/error.log`.

### Email Security Recommendations

Configure SPF, DKIM, and DMARC records for your domain:

- **SPF:** `v=spf1 a mx include:your-provider.com ~all`
- **DKIM:** Enable in your hosting control panel
- **DMARC:** `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`

## Performance

- **Hero Image Preload** - Improved LCP (Largest Contentful Paint)
- **Modern Image Formats** - AVIF/WebP with PNG fallback
- **Lazy Loading** - Deferred loading of off-screen images
- **CDN Resources** - Bootstrap and Font Awesome from CDN
- **Minimal Dependencies** - No build step required

## Deployment

1. **Upload** files to your web server
2. **Configure** environment variables or `api/config.local.php`
3. **Set permissions** - Ensure `api/logs/` is writable
4. **Verify** security headers are active (check `.htaccess`)
5. **Test** contact form functionality
6. **Configure** 404 error page to return proper HTTP status

### Scheduled Tasks

For weekly email reports or health checks, configure cron jobs:

```bash
# Weekly mail (example: Mondays at 07:00)
0 7 * * 1 /usr/bin/php /path/to/api/weekly_mailer.php

# Health check (use your configured token)
0 6 * * * curl -s "https://yourdomain.com/api/contact_form_health.php?token=YOUR_TOKEN"
```

Configure tokens and settings in `api/weekly_mail_config.php`.

**Important:** Keep tokens secure and never commit them to version control.

## Testing

### Automated Tests (Playwright)

```bash
npm test           # full suite (parallel, chromium + firefox)
npm run test:ui    # interactive UI mode
npm run test:toggle # apartments show/hide toggle (isolated, single worker)
```

`test:toggle` runs `tests/e2e/wohnungen-toggle.spec.ts` separately on purpose: that
spec renames page files on disk, which would break every other spec running in
parallel. It is therefore excluded from the default suite via `testIgnore` and uses
its own `tests/playwright.toggle.config.ts`. The original state is always restored
afterwards, even if a test fails.

All tests expect the Docker server at `http://localhost:8081` (`npm run docker:up`).

### Manual Testing

**Test honeypot detection:**
```javascript
const hp = document.querySelector('input[name="company"]');
if (hp) hp.value = 'bot';
// Submit form - should be rejected
```

**Test minimum time validation:**
- Default: 1500ms (configurable in `assets/js/kontakt.js`)
- Submit immediately - should be rejected

**Test CAPTCHA:**
- Use refresh icon to load new CAPTCHA
- Enter incorrect code - should show field error

### Cookie Banner Testing

Remove consent to test banner display:
```javascript
localStorage.removeItem('siteConsent');
location.reload();
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Translations missing | JSON not loaded | Check Network tab in dev tools for 404s |
| Cards not displaying | Invalid JSON in `data-cards` | Validate JSON syntax |
| CSP errors | Inline scripts/styles | Move all code to external files |
| Email not sending | Configuration error | Check `api/config.php` and mail logs |
| Form submission fails | CSRF token expired | Increase `DERKO_CSRF_TTL` or refresh page |

## Contributing

### Workflow

1. **Branch naming:** `feat/<issue-nr>-description` or `fix/<issue-nr>-description`
2. **Commit messages:** Reference issues, e.g., `feat: add feature (refs #123)`
3. **Pull requests:** Use `Fixes #123` to auto-close issues
4. **Testing:** Test all changes locally before submitting PR

### Development Guidelines

- Follow existing code style and patterns
- Add translations for all new text content
- Test in multiple browsers and screen sizes
- Ensure accessibility standards are met
- Update documentation as needed

## License

- “Copyright (c) 2026 DERKO Immobilien. All rights reserved.”
- “No permission is granted to use, modify, or redistribute without written permission.”

---

For detailed technical instructions and AI agent guidelines, see [.github/copilot-instructions.md](.github/copilot-instructions.md).

For questions or feature requests, please open an issue or check the [CHANGELOG](CHANGELOG.md).
