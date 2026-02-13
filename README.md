# DERKO Immobilien Website

A modern, multilingual static website for property management with minimal PHP backend for contact forms and security features.

## Table of Contents

- [About](#about)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Development](#development)
  - [Adding New Apartments](#adding-new-apartments)
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

- PHP 7.4+ (for local development and backend features)
- Node.js 14+ (optional, for image optimization)

### Local Development

Start a local PHP server:

```bash
php -S localhost:8080 -t .
```

Or use a static server (limited functionality):

```bash
npx http-server -p 8080
```

Visit `http://localhost:8080` in your browser.

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

For internal use. (License to be determined)

---

For detailed technical instructions and AI agent guidelines, see [.github/copilot-instructions.md](.github/copilot-instructions.md).

For questions or feature requests, please open an issue or check the [CHANGELOG](CHANGELOG.md).
