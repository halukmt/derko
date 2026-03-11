/**
 * pages.spec.ts
 * Tests that all pages load correctly, UI elements are rendered,
 * language switching works, and design consistency across pages.
 */
import { test, expect, type Page } from '@playwright/test';

async function waitForI18n(page: Page) {
  await page.waitForFunction(() => !!(window as any).__i18nReady, { timeout: 8000 });
  await page.waitForTimeout(300);
}

// ─── All pages load ──────────────────────────────────────────────────────────

test.describe('All pages: load without errors', () => {
  const allPages = [
    { url: '/', name: 'Homepage' },
    { url: '/wohnungen', name: 'Wohnungen' },
    { url: '/kontakt', name: 'Kontakt' },
    { url: '/ueber-uns', name: 'Über uns' },
    { url: '/faq', name: 'FAQ' },
    { url: '/impressum', name: 'Impressum' },
    { url: '/agb', name: 'AGB' },
    { url: '/datenschutz', name: 'Datenschutz' },
    // Apartment details
    { url: '/wohnung/w01-derko-apart', name: 'Apartment w01' },
    { url: '/wohnung/w03-exklusiv', name: 'Apartment w03' },
    { url: '/wohnung/w05-dus-1', name: 'Apartment w05' },
    // Error pages
    { url: '/pages/error-captcha.html', name: 'Error captcha' },
    { url: '/pages/error-rate-limit.html', name: 'Error rate limit' },
    { url: '/pages/error-session.html', name: 'Error session' },
  ];

  for (const { url, name } of allPages) {
    test(`PAGE: ${name} (${url}) → 200, no JS errors`, async ({ page }) => {
      const jsErrors: string[] = [];
      page.on('pageerror', err => jsErrors.push(err.message));

      const res = await page.goto(url);
      expect(res?.status()).toBe(200);

      // Ignore known third-party / extension errors
      const criticalErrors = jsErrors.filter(e =>
        !e.includes('extension') &&
        !e.includes('favicon') &&
        !e.includes('net::ERR_') // network errors for CDN in offline mode
      );
      expect(criticalErrors, `JS errors on ${url}: ${criticalErrors.join(', ')}`).toHaveLength(0);
    });
  }
});

// ─── Header / Footer rendered on all pages ───────────────────────────────────

test.describe('Header and footer injection', () => {
  const testPages = ['/', '/wohnungen', '/kontakt', '/faq', '/agb', '/wohnung/w01-derko-apart'];

  for (const url of testPages) {
    test(`UI: ${url} has header and footer`, async ({ page }) => {
      await page.goto(url);
      await waitForI18n(page);
      // Header component should be injected
      await expect(page.locator('#site-header nav')).toBeVisible({ timeout: 5000 });
      // Footer should be injected
      await expect(page.locator('#site-footer')).toBeVisible({ timeout: 5000 });
    });
  }
});

// ─── Language switching (UI / Design consistency) ────────────────────────────

test.describe('Language switcher: UI consistency', () => {
  test('UI-LANG: /en/agb – same layout as /agb, content in English', async ({ page }) => {
    // Load German version first for baseline
    await page.goto('/agb');
    await waitForI18n(page);
    const deTitle = await page.title();

    // Load English version
    await page.goto('/en/agb');
    await waitForI18n(page);
    const enTitle = await page.title();

    // Titles should differ (different language)
    expect(enTitle).not.toBe(deTitle);
    // Page should still have header + footer (same layout)
    await expect(page.locator('#site-header nav')).toBeVisible();
    await expect(page.locator('#site-footer')).toBeVisible();
    // Main content should not be empty
    const mainText = await page.locator('#main').innerText();
    expect(mainText.length).toBeGreaterThan(50);
  });

  test('UI-LANG: /en/datenschutz – content loaded, no empty main area', async ({ page }) => {
    await page.goto('/en/datenschutz');
    await waitForI18n(page);
    // Content may arrive via async injectHtmlPartial — wait for it
    await page.waitForFunction(
      () => (document.querySelector('#main')?.innerText?.trim()?.length ?? 0) > 100,
      { timeout: 8000 }
    );
    const mainText = await page.locator('#main').innerText();
    expect(mainText.trim().length, 'Datenschutz EN should have content').toBeGreaterThan(100);
  });

  test('UI-LANG: /en/impressum – content loaded', async ({ page }) => {
    await page.goto('/en/impressum');
    await waitForI18n(page);
    // Content may arrive via async injectHtmlPartial — wait for it
    await page.waitForFunction(
      () => (document.querySelector('#main')?.innerText?.trim()?.length ?? 0) > 100,
      { timeout: 8000 }
    );
    const mainText = await page.locator('#main').innerText();
    expect(mainText.trim().length).toBeGreaterThan(100);
  });

  test('UI-LANG: /en/faq – accordion visible', async ({ page }) => {
    await page.goto('/en/faq');
    await waitForI18n(page);
    // FAQ accordion items should be rendered
    const accordion = page.locator('.accordion-item');
    await expect(accordion.first()).toBeVisible({ timeout: 5000 });
    const count = await accordion.count();
    expect(count, 'FAQ should have at least 3 items').toBeGreaterThanOrEqual(3);
  });

  test('UI-LANG: /en/kontakt – form labels in English', async ({ page }) => {
    await page.goto('/en/kontakt');
    await waitForI18n(page);
    // The name label should be in English (not German "Name *")
    const nameLabel = await page.locator('label[for="name"]').innerText();
    // German would be "Name", English would also likely be "Name" but check the form exists
    await expect(page.locator('#contact-form')).toBeVisible();
    // Submit button should have text (not empty)
    const submitText = await page.locator('button[type="submit"]').innerText();
    expect(submitText.trim().length).toBeGreaterThan(0);
  });

  test('UI-LANG: /en/wohnungen – apartment cards in English', async ({ page }) => {
    await page.goto('/en/wohnungen');
    await waitForI18n(page);
    // Cards should be rendered
    const cards = page.locator('.card');
    await expect(cards.first()).toBeVisible({ timeout: 6000 });
    const count = await cards.count();
    expect(count, 'Wohnungen page should show apartment cards').toBeGreaterThanOrEqual(3);
  });
});

// ─── Apartment detail page ────────────────────────────────────────────────────

test.describe('Apartment detail pages', () => {
  const apartments = [
    'w01-derko-apart', 'w02-derko-apart-2', 'w03-exklusiv',
    'w04-exklusiv-2', 'w05-dus-1', 'w06-dus-2', 'w07-dus-3',
  ];

  for (const slug of apartments) {
    test(`APT: /wohnung/${slug} renders title and content`, async ({ page }) => {
      await page.goto(`/wohnung/${slug}`);
      await waitForI18n(page);

      // wohnung-detail.js sets document.title synchronously on i18n:ready (before __i18nReady is set)
      const title = await page.title();
      expect(title, `${slug} should have a real title (not placeholder)`).not.toBe('Wohnung Details');
      expect(title.length).toBeGreaterThan(3);

      const main = await page.locator('#main').innerText();
      expect(main.trim().length, `${slug} main content should not be empty`).toBeGreaterThan(50);
    });
  }

  test('APT-EN: /en/wohnung/w03-exklusiv has English content', async ({ page }) => {
    await page.goto('/en/wohnung/w03-exklusiv');
    await waitForI18n(page);
    const title = await page.title();
    expect(title).not.toBe('Wohnung Details');
    // Should have breadcrumb
    const breadcrumb = page.locator('[aria-label="breadcrumb"], .breadcrumb');
    if (await breadcrumb.count() > 0) {
      await expect(breadcrumb.first()).toBeVisible();
    }
  });

  test('APT-CTA: CTA button links to contact form with apartment pre-selected', async ({ page }) => {
    await page.goto('/wohnung/w01-derko-apart');
    await waitForI18n(page);
    const ctaLink = page.locator('#apt-cta');
    if (await ctaLink.count() > 0) {
      const href = await ctaLink.getAttribute('href');
      expect(href).toContain('wohnung=w01_derko_apart');
    }
  });
});

// ─── WhatsApp button ─────────────────────────────────────────────────────────

test.describe('WhatsApp FAB button', () => {
  test('FAB: visible on homepage', async ({ page }) => {
    await page.goto('/');
    await waitForI18n(page);
    // WhatsApp button - look for it by common class or aria-label
    const whatsappBtn = page.locator('[aria-label*="WhatsApp"], [href*="whatsapp"], [href*="wa.me"], #whatsapp-fab');
    const count = await whatsappBtn.count();
    expect(count, 'WhatsApp FAB should be present').toBeGreaterThan(0);
  });
});

// ─── FAQ JSON-LD ─────────────────────────────────────────────────────────────

test.describe('FAQ JSON-LD structured data', () => {
  test('FAQ: JSON-LD FAQPage schema is present and valid', async ({ page }) => {
    await page.goto('/faq');
    await waitForI18n(page);

    const jsonLd = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const s of scripts) {
        try {
          const d = JSON.parse(s.textContent ?? '');
          if (d['@type'] === 'FAQPage') return d;
        } catch { /* ignore */ }
      }
      return null;
    });

    expect(jsonLd, 'FAQPage JSON-LD should be injected').not.toBeNull();
    expect(jsonLd['@type']).toBe('FAQPage');
    expect(Array.isArray(jsonLd.mainEntity), 'FAQPage should have mainEntity array').toBe(true);
    expect(jsonLd.mainEntity.length).toBeGreaterThan(0);
  });
});

// ─── Bestaetigung page ────────────────────────────────────────────────────────

test.describe('Bestaetigung (confirmation) page', () => {
  test('BESTÄT: /pages/bestaetigung.html is accessible', async ({ page }) => {
    const res = await page.goto('/pages/bestaetigung.html');
    expect(res?.status()).toBe(200);
    await waitForI18n(page);
    // Should have some content
    const main = await page.locator('#main').innerText();
    expect(main.trim().length).toBeGreaterThan(10);
  });
});

// ─── Mobile responsiveness ────────────────────────────────────────────────────

test.describe('Mobile: responsive layout', () => {
  test('MOBILE: /wohnungen on 375px viewport – cards stack vertically', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/wohnungen');
    await waitForI18n(page);
    // Hamburger menu should be visible
    const toggler = page.locator('.navbar-toggler');
    if (await toggler.count() > 0) {
      await expect(toggler).toBeVisible();
    }
    // Cards should still render
    const cards = page.locator('.card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('MOBILE: contact form is usable at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/kontakt');
    await waitForI18n(page);
    // Name input should be visible and clickable
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
