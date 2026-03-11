/**
 * canonical-seo.spec.ts
 * Tests canonical URLs, hreflang alternates, sitemap, robots.txt and OG-tags.
 *
 * All canonical checks happen AFTER JavaScript has run (lang.js updates them dynamically).
 */
import { test, expect } from '@playwright/test';

const BASE = 'https://www.derko-immobilien.de';
const LANGS = ['de', 'en', 'pl', 'hu', 'sk', 'cs', 'it', 'bg', 'ro'] as const;
// Non-German language codes (these have URL prefix; German uses no prefix)
const LANGS_NON_DE = ['en', 'pl', 'hu', 'sk', 'cs', 'it', 'bg', 'ro'] as const;

// Helper: wait for lang.js to finish and canonical to be set
async function waitForI18n(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => !!(window as any).__i18nReady, { timeout: 8000 });
  // Give DOM update a tick
  await page.waitForTimeout(200);
}

// Helper: get the current canonical href from DOM
async function getCanonical(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    return el ? el.href : '';
  });
}

// Helper: get all hreflang links
async function getHreflangs(page: import('@playwright/test').Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const result: Record<string, string> = {};
    document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]').forEach(el => {
      result[el.hreflang] = el.href;
    });
    return result;
  });
}

// ─── Canonical on standard German pages ─────────────────────────────────────

test.describe('Canonical URLs: German pages', () => {
  const cases: [string, string][] = [
    ['/', `${BASE}/`],
    ['/agb', `${BASE}/agb`],
    ['/datenschutz', `${BASE}/datenschutz`],
    ['/impressum', `${BASE}/impressum`],
    ['/wohnungen', `${BASE}/wohnungen`],
    ['/kontakt', `${BASE}/kontakt`],
    ['/ueber-uns', `${BASE}/ueber-uns`],
    ['/faq', `${BASE}/faq`],
  ];

  for (const [url, expected] of cases) {
    test(`C-DE: ${url} canonical = ${expected}`, async ({ page }) => {
      await page.goto(url);
      await waitForI18n(page);
      const canonical = await getCanonical(page);
      expect(canonical).toBe(expected);
    });
  }
});

// ─── Canonical on language-prefixed pages ────────────────────────────────────

test.describe('Canonical URLs: Language-prefixed pages', () => {
  const cases: [string, string][] = [
    ['/en/agb', `${BASE}/en/agb`],
    ['/en/wohnungen', `${BASE}/en/wohnungen`],
    ['/en/kontakt', `${BASE}/en/kontakt`],
    ['/pl/agb', `${BASE}/pl/agb`],
    ['/hu/wohnungen', `${BASE}/hu/wohnungen`],
    ['/it/faq', `${BASE}/it/faq`],
    // Note: /de/ prefix is NOT supported by the router; German uses no prefix
  ];

  for (const [url, expected] of cases) {
    test(`C-LANG: ${url} canonical = ${expected}`, async ({ page }) => {
      await page.goto(url);
      await waitForI18n(page);
      const canonical = await getCanonical(page);
      expect(canonical).toBe(expected);
    });
  }
});

// ─── Canonical on apartment detail pages ────────────────────────────────────

test.describe('Canonical URLs: Apartment detail pages', () => {
  test('C-03-DE: /wohnung/w01-derko-apart → absolute canonical with slug', async ({ page }) => {
    await page.goto('/wohnung/w01-derko-apart');
    await waitForI18n(page);
    const canonical = await getCanonical(page);
    expect(canonical).toBe(`${BASE}/wohnung/w01-derko-apart`);
  });

  test('C-03-EN: /en/wohnung/w01-derko-apart → absolute canonical with lang+slug', async ({ page }) => {
    await page.goto('/en/wohnung/w01-derko-apart');
    await waitForI18n(page);
    const canonical = await getCanonical(page);
    expect(canonical).toBe(`${BASE}/en/wohnung/w01-derko-apart`);
  });

  test('C-03-ALL: All 7 apartments have slug-specific absolute canonicals', async ({ page }) => {
    const slugs = [
      'w01-derko-apart', 'w02-derko-apart-2', 'w03-exklusiv',
      'w04-exklusiv-2', 'w05-dus-1', 'w06-dus-2', 'w07-dus-3',
    ];
    for (const slug of slugs) {
      await page.goto(`/wohnung/${slug}`);
      await waitForI18n(page);
      const canonical = await getCanonical(page);
      expect(canonical, `Apartment ${slug} should have absolute canonical`).toBe(`${BASE}/wohnung/${slug}`);
    }
  });
});

// ─── Hreflang alternates ─────────────────────────────────────────────────────

test.describe('Hreflang alternates', () => {
  test('C-04: /agb has hreflang for all 9 languages + x-default', async ({ page }) => {
    await page.goto('/agb');
    await waitForI18n(page);
    const hreflangs = await getHreflangs(page);

    for (const lang of LANGS) {
      expect(hreflangs[lang], `hreflang="${lang}" should exist`).toBeTruthy();
    }
    expect(hreflangs['x-default'], 'hreflang="x-default" should exist').toBeTruthy();
  });

  test('C-05: x-default points to German (no-prefix) URL', async ({ page }) => {
    await page.goto('/agb');
    await waitForI18n(page);
    const hreflangs = await getHreflangs(page);
    expect(hreflangs['x-default']).toBe(`${BASE}/agb`);
  });

  test('C-04b: /en/kontakt has all hreflang variants', async ({ page }) => {
    await page.goto('/en/kontakt');
    await waitForI18n(page);
    const hreflangs = await getHreflangs(page);
    for (const lang of LANGS) {
      expect(hreflangs[lang], `hreflang="${lang}" should exist`).toBeTruthy();
    }
    expect(hreflangs['en']).toBe(`${BASE}/en/kontakt`);
    expect(hreflangs['de']).toBe(`${BASE}/kontakt`);
  });

  test('C-04c: Apartment detail has hreflang for all languages', async ({ page }) => {
    await page.goto('/wohnung/w01-derko-apart');
    await waitForI18n(page);
    const hreflangs = await getHreflangs(page);
    for (const lang of LANGS) {
      expect(hreflangs[lang], `hreflang="${lang}" on apartment detail`).toBeTruthy();
    }
    expect(hreflangs['en']).toBe(`${BASE}/en/wohnung/w01-derko-apart`);
  });
});

// ─── OG-Tags ─────────────────────────────────────────────────────────────────

test.describe('Open Graph meta tags', () => {
  const pages = [
    { url: '/', name: 'Homepage' },
    { url: '/wohnungen', name: 'Wohnungen' },
    { url: '/kontakt', name: 'Kontakt' },
    { url: '/en/agb', name: 'AGB EN' },
    { url: '/wohnung/w01-derko-apart', name: 'Apartment detail' },
  ];

  for (const { url, name } of pages) {
    test(`C-10: ${name} (${url}) has og:title and og:description`, async ({ page }) => {
      await page.goto(url);
      await waitForI18n(page);

      const ogTitle = await page.evaluate(() =>
        document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content ?? ''
      );
      const ogDesc = await page.evaluate(() =>
        document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content ?? ''
      );
      expect(ogTitle, `og:title should not be empty on ${url}`).toBeTruthy();
      expect(ogDesc, `og:description should not be empty on ${url}`).toBeTruthy();
    });
  }
});

// ─── Sitemap & robots ────────────────────────────────────────────────────────

test.describe('Sitemap and robots.txt', () => {
  test('C-07: sitemap.xml is valid XML and accessible', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('<?xml');
    expect(text).toContain('<urlset');
    expect(text).toContain('derko-immobilien.de');
  });

  test('C-08: sitemap contains all non-German language variants of /wohnungen', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    const text = await res.text();
    // German version uses /wohnungen (no prefix)
    expect(text, 'Sitemap should contain /wohnungen').toContain('/wohnungen');
    // Non-German versions use /{lang}/wohnungen
    for (const lang of LANGS_NON_DE) {
      expect(text, `Sitemap should contain /${lang}/wohnungen`).toContain(`/${lang}/wohnungen`);
    }
  });

  test('C-08b: sitemap contains apartment detail URLs', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    const text = await res.text();
    // At least w01 should be in sitemap
    expect(text).toContain('w01-derko-apart');
  });

  test('C-09: robots.txt accessible and contains sitemap reference', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text.toLowerCase()).toContain('sitemap');
    expect(text).toContain('derko-immobilien.de');
  });
});

// ─── Security headers ────────────────────────────────────────────────────────

test.describe('Security headers', () => {
  test('S-11: Response includes X-Frame-Options: DENY', async ({ request }) => {
    const res = await request.get('/');
    const xfo = res.headers()['x-frame-options'] ?? '';
    expect(xfo.toUpperCase()).toBe('DENY');
  });

  test('S-11b: Response includes X-Content-Type-Options: nosniff', async ({ request }) => {
    const res = await request.get('/');
    const xcto = res.headers()['x-content-type-options'] ?? '';
    expect(xcto.toLowerCase()).toContain('nosniff');
  });
});
