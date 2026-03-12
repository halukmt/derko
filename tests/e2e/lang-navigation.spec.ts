/**
 * lang-navigation.spec.ts
 * Tests for language-aware URL navigation fixes (v1.5.1).
 *
 * Covers:
 * - Nav links retain language prefix when navigating between pages
 * - Language switcher navigates to correct URL (including switch back to German)
 * - CSS/JS assets load correctly on language-prefixed URLs
 * - /bestaetigung route resolves correctly (new .htaccess entry)
 * - Contact form redirect respects language prefix
 *
 * Runs against Docker dev server at http://localhost:8081
 */
import { test, expect } from '@playwright/test';

const LANGS = ['en', 'pl', 'hu', 'sk', 'cs', 'it', 'bg', 'ro'] as const;

// ─── Asset loading on language-prefixed pages ───────────────────────────────

test.describe('CSS and JS load correctly on lang-prefixed pages', () => {
  const sampledLangs = ['en', 'pl', 'hu', 'it'] as const;
  const sampledPages = ['ueber-uns', 'datenschutz', 'faq'] as const;

  for (const lang of sampledLangs) {
    for (const slug of sampledPages) {
      test(`ASSET: /${lang}/${slug} loads style.css without 404`, async ({ page }) => {
        const failed: string[] = [];
        page.on('response', res => {
          if (res.url().includes('style.css') && res.status() !== 200) {
            failed.push(`${res.url()} → ${res.status()}`);
          }
        });
        await page.goto(`/${lang}/${slug}`);
        expect(failed).toHaveLength(0);
      });
    }
  }

  test('ASSET: /en/ loads lang.js without 404', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', res => {
      if (res.url().includes('lang.js') && res.status() !== 200) {
        failed.push(`${res.url()} → ${res.status()}`);
      }
    });
    await page.goto('/en/');
    expect(failed).toHaveLength(0);
  });

  test('ASSET: /en/ renders hero headline (JS executed)', async ({ page }) => {
    await page.goto('/en/');
    // Hero title is populated by JS translations — must not be empty
    const hero = page.locator('#hero-title');
    await expect(hero).not.toBeEmpty();
  });
});

// ─── Nav links retain language prefix ───────────────────────────────────────

test.describe('Nav links retain language prefix', () => {
  const spot = [
    { lang: 'en', from: 'ueber-uns', linkId: '#nav-faq',        expected: '/en/faq' },
    { lang: 'pl', from: 'datenschutz', linkId: '#nav-ueberuns', expected: '/pl/ueber-uns' },
    { lang: 'hu', from: 'impressum',  linkId: '#nav-kontakt',   expected: '/hu/kontakt' },
    { lang: 'it', from: 'faq',        linkId: '#nav-wohnungen', expected: '/it/wohnungen' },
  ] as const;

  for (const { lang, from, linkId, expected } of spot) {
    test(`NAV-LANG: /${lang}/${from} → ${linkId} href = ${expected}`, async ({ page }) => {
      await page.goto(`/${lang}/${from}`);
      const link = page.locator(linkId);
      await expect(link).toHaveAttribute('href', expected);
    });
  }

  test('NAV-LANG: footer #ft-impressum retains /en/ prefix on /en/agb', async ({ page }) => {
    await page.goto('/en/agb');
    const link = page.locator('#ft-impressum');
    await expect(link).toHaveAttribute('href', '/en/impressum');
  });

  test('NAV-LANG: footer #ft-privacy retains /pl/ prefix on /pl/kontakt', async ({ page }) => {
    await page.goto('/pl/kontakt');
    const link = page.locator('#ft-privacy');
    await expect(link).toHaveAttribute('href', '/pl/datenschutz');
  });
});

// Helper: open the language dropdown and click the desired language button
async function switchLanguage(page: any, lang: string) {
  // Wait for header component to be injected
  await page.waitForSelector('.nav-link.dropdown-toggle', { timeout: 10_000 });
  // Open the dropdown
  await page.click('.nav-link.dropdown-toggle');
  // Wait for dropdown to appear and click the language button
  await page.waitForSelector(`[data-lang="${lang}"]`, { timeout: 5_000 });
  await page.click(`[data-lang="${lang}"]`);
}

// ─── Language switcher navigates to correct URL ──────────────────────────────

test.describe('Language switcher URL navigation', () => {
  test('SWITCH: / → click EN → URL becomes /en/', async ({ page }) => {
    await page.goto('/');
    await switchLanguage(page, 'en');
    await expect(page).toHaveURL('/en/');
  });

  test('SWITCH: /ueber-uns → click PL → URL becomes /pl/ueber-uns', async ({ page }) => {
    await page.goto('/ueber-uns');
    await switchLanguage(page, 'pl');
    await expect(page).toHaveURL('/pl/ueber-uns');
  });

  test('SWITCH: /en/ueber-uns → click IT → URL becomes /it/ueber-uns', async ({ page }) => {
    await page.goto('/en/ueber-uns');
    await switchLanguage(page, 'it');
    await expect(page).toHaveURL('/it/ueber-uns');
  });

  test('SWITCH: /it/ueber-uns → click DE → URL becomes /ueber-uns', async ({ page }) => {
    await page.goto('/it/ueber-uns');
    await switchLanguage(page, 'de');
    await expect(page).toHaveURL('/ueber-uns');
  });

  test('SWITCH: /hu/datenschutz → click DE → page renders in German', async ({ page }) => {
    await page.goto('/hu/datenschutz');
    await switchLanguage(page, 'de');
    await expect(page).toHaveURL('/datenschutz');
    // Nav "Über uns" link should exist in German
    const navLink = page.locator('#nav-ueberuns');
    await expect(navLink).toBeVisible();
    // Page title should be in German (not Hungarian)
    const title = await page.title();
    expect(title).not.toMatch(/adatv/i); // Hungarian "adatvédelem" pattern
  });

  test('SWITCH: /en/wohnung/w01-derko-apart → click PL → URL becomes /pl/wohnung/w01-derko-apart', async ({ page }) => {
    await page.goto('/en/wohnung/w01-derko-apart');
    await switchLanguage(page, 'pl');
    await expect(page).toHaveURL('/pl/wohnung/w01-derko-apart');
  });
});

// ─── /bestaetigung route ─────────────────────────────────────────────────────

test.describe('/bestaetigung route', () => {
  test('ROUTE: /bestaetigung → 200', async ({ page }) => {
    const res = await page.goto('/bestaetigung');
    expect(res?.status()).toBe(200);
  });

  for (const lang of LANGS) {
    test(`ROUTE: /${lang}/bestaetigung → 200`, async ({ page }) => {
      const res = await page.goto(`/${lang}/bestaetigung`);
      expect(res?.status()).toBe(200);
    });
  }
});

// ─── Apartment card links have language prefix ───────────────────────────────

test.describe('Apartment card links have correct language prefix', () => {
  test('CARD-LANG: /en/wohnungen → card links start with /en/wohnung/', async ({ page }) => {
    await page.goto('/en/wohnungen');
    // Wait for cards to render (cards are in #wohnung-list)
    await page.waitForSelector('#wohnung-list a[href*="/wohnung/"]', { timeout: 10_000 });
    const hrefs = await page.$$eval(
      '#wohnung-list a[href*="/wohnung/"]',
      (links) => links.map(a => (a as HTMLAnchorElement).getAttribute('href') ?? '')
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toMatch(/^\/en\/wohnung\//);
    }
  });

  test('CARD-LANG: /pl/wohnungen → card links start with /pl/wohnung/', async ({ page }) => {
    await page.goto('/pl/wohnungen');
    await page.waitForSelector('#wohnung-list a[href*="/wohnung/"]', { timeout: 10_000 });
    const hrefs = await page.$$eval(
      '#wohnung-list a[href*="/wohnung/"]',
      (links) => links.map(a => (a as HTMLAnchorElement).getAttribute('href') ?? '')
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toMatch(/^\/pl\/wohnung\//);
    }
  });

  test('CARD-LANG: /wohnungen (German) → card links start with /wohnung/ (no prefix)', async ({ page }) => {
    await page.goto('/wohnungen');
    await page.waitForSelector('#wohnung-list a[href*="/wohnung/"]', { timeout: 10_000 });
    const hrefs = await page.$$eval(
      '#wohnung-list a[href*="/wohnung/"]',
      (links) => links.map(a => (a as HTMLAnchorElement).getAttribute('href') ?? '')
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      // Should NOT have a language prefix
      expect(href).not.toMatch(/^\/(en|pl|hu|sk|cs|it|bg|ro)\/wohnung\//);
    }
  });
});
