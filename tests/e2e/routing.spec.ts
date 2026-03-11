/**
 * routing.spec.ts
 * Tests URL routing: language prefixes, clean URLs, redirects, 404 handling.
 *
 * Runs against Docker dev server at http://localhost:8081
 */
import { test, expect } from '@playwright/test';

const LANGS = ['en', 'pl', 'hu', 'sk', 'cs', 'it', 'bg', 'ro'] as const;

const PAGES = [
  'wohnungen',
  'kontakt',
  'ueber-uns',
  'faq',
  'impressum',
  'agb',
  'datenschutz',
] as const;

// ─── German (default) routes ───────────────────────────────────────────────

test.describe('German default routes', () => {
  test('R-01: GET / → 200', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
  });

  for (const slug of PAGES) {
    test(`R-DE: /${slug} → 200`, async ({ page }) => {
      const res = await page.goto(`/${slug}`);
      expect(res?.status()).toBe(200);
    });
  }
});

// ─── Language-prefixed routes (all 8 non-German languages) ─────────────────

test.describe('Language-prefixed routes', () => {
  for (const lang of LANGS) {
    test(`R-02: /${lang}/ → 200`, async ({ page }) => {
      const res = await page.goto(`/${lang}/`);
      expect(res?.status()).toBe(200);
    });
  }

  // Key check: /en/agb and other language+page combos must work
  const spot: Array<[string, string]> = [
    ['en', 'agb'],
    ['en', 'wohnungen'],
    ['en', 'kontakt'],
    ['en', 'datenschutz'],
    ['en', 'impressum'],
    ['en', 'ueber-uns'],
    ['en', 'faq'],
    ['pl', 'agb'],
    ['pl', 'wohnungen'],
    ['hu', 'kontakt'],
    ['it', 'faq'],
    ['ro', 'wohnungen'],
    ['bg', 'datenschutz'],
    ['sk', 'impressum'],
    ['cs', 'ueber-uns'],
  ];

  for (const [lang, slug] of spot) {
    test(`R-LANG: /${lang}/${slug} → 200`, async ({ page }) => {
      const res = await page.goto(`/${lang}/${slug}`);
      expect(res?.status()).toBe(200);
    });
  }
});

// ─── Apartment detail routes ────────────────────────────────────────────────

const APARTMENTS = [
  'w01-derko-apart',
  'w02-derko-apart-2',
  'w03-exklusiv',
  'w04-exklusiv-2',
  'w05-dus-1',
  'w06-dus-2',
  'w07-dus-3',
] as const;

test.describe('Apartment detail routes', () => {
  for (const slug of APARTMENTS) {
    test(`R-APT-DE: /wohnung/${slug} → 200`, async ({ page }) => {
      const res = await page.goto(`/wohnung/${slug}`);
      expect(res?.status()).toBe(200);
    });

    test(`R-APT-EN: /en/wohnung/${slug} → 200`, async ({ page }) => {
      const res = await page.goto(`/en/wohnung/${slug}`);
      expect(res?.status()).toBe(200);
    });
  }

  test('R-APT-404: /wohnung/nonexistent → redirects or shows 404', async ({ page }) => {
    // Invalid slug → wohnung-detail.js redirects to /404.html via JS
    await page.goto('/wohnung/nonexistent-apartment');
    // Either 404 status OR the page contains 404-related content after JS redirect
    const title = await page.title();
    const url = page.url();
    const is404 =
      url.includes('404') ||
      title.toLowerCase().includes('404') ||
      title.toLowerCase().includes('not found') ||
      (await page.locator('[data-i18n="notFound.description"]').count()) > 0;
    expect(is404).toBe(true);
  });
});

// ─── Redirects ──────────────────────────────────────────────────────────────

test.describe('Legacy redirects', () => {
  test('R-08: /pages/agb.html → 301 to /agb', async ({ request }) => {
    const res = await request.get('/pages/agb.html', { maxRedirects: 0 });
    expect([301, 302]).toContain(res.status());
    const location = res.headers()['location'] ?? '';
    expect(location).toContain('/agb');
  });

  test('R-08b: /pages/wohnungen.html → redirects to /wohnungen', async ({ request }) => {
    const res = await request.get('/pages/wohnungen.html', { maxRedirects: 0 });
    expect([301, 302]).toContain(res.status());
  });

  test('R-09: /wohnung?id=w01_derko_apart → 301 to /wohnung/w01-derko-apart', async ({ request }) => {
    const res = await request.get('/wohnung?id=w01_derko_apart', { maxRedirects: 0 });
    expect([301, 302]).toContain(res.status());
    const location = res.headers()['location'] ?? '';
    expect(location).toContain('w01-derko-apart');
  });
});

// ─── 404 handling ───────────────────────────────────────────────────────────

test.describe('404 handling', () => {
  test('R-13: /nonexistent-page → 404 with custom page', async ({ page }) => {
    const res = await page.goto('/nonexistent-page-xyz');
    expect(res?.status()).toBe(404);
    // Should show custom 404 page, not Apache default
    const body = await page.content();
    // Apache default 404 contains "Apache" in body; ours should not
    expect(body).not.toContain('<address>Apache');
  });
});

// ─── Active navigation highlighting ─────────────────────────────────────────

test.describe('Active nav link', () => {
  test('R-14: /en/wohnungen → Wohnungen nav link has active class', async ({ page }) => {
    await page.goto('/en/wohnungen');
    // Wait for i18n + components to load
    await page.waitForSelector('#site-header', { state: 'attached' });
    await page.waitForTimeout(800);
    const navLink = page.locator('#nav-wohnungen');
    await expect(navLink).toHaveClass(/active/);
  });

  test('R-14b: /kontakt → Kontakt nav link has active class', async ({ page }) => {
    await page.goto('/kontakt');
    await page.waitForSelector('#site-header', { state: 'attached' });
    await page.waitForTimeout(800);
    const navLink = page.locator('#nav-kontakt');
    await expect(navLink).toHaveClass(/active/);
  });
});

// ─── Security: direct API access ────────────────────────────────────────────

test.describe('Security: API endpoints', () => {
  test('S-09: GET /api/sendmail.php → 405 (only POST allowed)', async ({ request }) => {
    const res = await request.get('/api/sendmail.php');
    expect(res.status()).toBe(405);
  });

  test('S-14: /api/ directory listing → 403', async ({ request }) => {
    const res = await request.get('/api/');
    expect([403, 404]).toContain(res.status());
  });
});
