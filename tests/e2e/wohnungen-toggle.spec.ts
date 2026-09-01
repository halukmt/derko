/**
 * wohnungen-toggle.spec.ts
 * Tests the "Wohnungen ein-/ausblenden" toggle (see .claude/skills/wohnungen-toggle).
 *
 * The toggle works by renaming two page files and commenting out the nav entry.
 * When the files are gone, Apache's `ErrorDocument 404 /pages/404.html` (already in
 * .htaccess) serves a real HTTP 404 for every apartment URL.
 *
 * IMPORTANT: This spec mutates files on disk, which affects the whole server.
 * It must therefore never run alongside the other specs. It is excluded from the
 * default suite via `testIgnore` in playwright.config.ts and runs isolated via:
 *
 *   npm run test:toggle
 *
 * The original state is always restored in afterAll, even if a test fails.
 *
 * Runs against Docker dev server at http://localhost:8081
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Serial mode: these tests share one global on-disk state
test.describe.configure({ mode: 'serial' });

const ROOT = path.resolve(__dirname, '..', '..');

const PAGES = [
  { on: 'pages/wohnungen.html', off: 'pages/wohnungen_x.html' },
  { on: 'pages/wohnung-detail.html', off: 'pages/wohnung-detail_x.html' },
];

const HEADER = path.join(ROOT, 'components', 'header.html');

// The nav block, as individual lines. Joined with the file's own line ending at
// runtime — header.html uses CRLF, so hardcoding "\n" would silently never match.
const NAV_LINES = [
  '        <li class="nav-item">',
  '          <a class="nav-link" id="nav-wohnungen" href="wohnungen.html"',
  '            data-i18n="navigation.wohnungen"></a',
  '          >',
  '        </li>',
];

const navOn = (eol: string) => NAV_LINES.join(eol);
const navOff = (eol: string) =>
  ['        <!-- WOHNUNGEN-TOGGLE:OFF-START', ...NAV_LINES, '        WOHNUNGEN-TOGGLE:OFF-END -->'].join(eol);

const eolOf = (text: string) => (text.includes('\r\n') ? '\r\n' : '\n');

/** Snapshot of the header file as it was before the tests ran. */
let headerBackup = '';

function setApartments(enabled: boolean) {
  for (const p of PAGES) {
    const from = path.join(ROOT, enabled ? p.off : p.on);
    const to = path.join(ROOT, enabled ? p.on : p.off);
    if (fs.existsSync(from) && !fs.existsSync(to)) {
      fs.renameSync(from, to);
    }
  }
  const header = fs.readFileSync(HEADER, 'utf8');
  const eol = eolOf(header);
  const next = enabled
    ? header.replace(navOff(eol), navOn(eol))
    : header.replace(navOn(eol), navOff(eol));
  if (next !== header) fs.writeFileSync(HEADER, next, 'utf8');
}

test.beforeAll(() => {
  headerBackup = fs.readFileSync(HEADER, 'utf8');
  const eol = eolOf(headerBackup);
  // Sanity check: the nav block must match exactly, otherwise the toggle (and the
  // skill that uses the same strings) would silently do nothing.
  expect(
    headerBackup.includes(navOn(eol)) || headerBackup.includes(navOff(eol)),
    'components/header.html does not contain the expected nav-wohnungen block — ' +
      'update NAV_LINES in this spec and in .claude/skills/wohnungen-toggle/SKILL.md',
  ).toBe(true);
  setApartments(true);
});

test.afterAll(() => {
  // Always restore, even if a test failed midway
  setApartments(true);
  if (headerBackup) fs.writeFileSync(HEADER, headerBackup, 'utf8');
});

// ─── Zustand EIN (Standard) ────────────────────────────────────────────────

test.describe('Wohnungen sichtbar (Zustand EIN)', () => {
  test.beforeAll(() => setApartments(true));

  test('T-ON-01: /wohnungen → 200', async ({ request }) => {
    const res = await request.get('/wohnungen');
    expect(res.status()).toBe(200);
  });

  test('T-ON-02: /wohnung/w03-exklusiv → 200', async ({ request }) => {
    const res = await request.get('/wohnung/w03-exklusiv');
    expect(res.status()).toBe(200);
  });

  test('T-ON-03: /en/wohnungen → 200', async ({ request }) => {
    const res = await request.get('/en/wohnungen');
    expect(res.status()).toBe(200);
  });

  test('T-ON-04: Menüpunkt "Wohnungen" ist sichtbar', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#site-header', { state: 'attached' });
    await expect(page.locator('#nav-wohnungen')).toBeVisible();
  });
});

// ─── Zustand AUS ───────────────────────────────────────────────────────────

test.describe('Wohnungen ausgeblendet (Zustand AUS)', () => {
  test.beforeAll(() => setApartments(false));
  test.afterAll(() => setApartments(true));

  test('T-OFF-01: /wohnungen → 404', async ({ request }) => {
    const res = await request.get('/wohnungen');
    expect(res.status()).toBe(404);
  });

  test('T-OFF-02: /wohnung/w03-exklusiv → 404', async ({ request }) => {
    const res = await request.get('/wohnung/w03-exklusiv');
    expect(res.status()).toBe(404);
  });

  test('T-OFF-03: /en/wohnungen → 404 (sprachpräfixierte Route)', async ({ request }) => {
    const res = await request.get('/en/wohnungen');
    expect(res.status()).toBe(404);
  });

  test('T-OFF-04: /pl/wohnung/w01-derko-apart → 404 (weitere Sprache)', async ({ request }) => {
    const res = await request.get('/pl/wohnung/w01-derko-apart');
    expect(res.status()).toBe(404);
  });

  test('T-OFF-05: /wohnung?id=w03_exklusiv → landet über 301 im 404', async ({ request }) => {
    // Legacy link: the existing .htaccess rule still redirects to the clean slug,
    // which then hits the missing file → 404
    const res = await request.get('/wohnung?id=w03_exklusiv');
    expect(res.status()).toBe(404);
  });

  test('T-OFF-06: /pages/wohnungen.html (Direktaufruf) → 404', async ({ request }) => {
    const res = await request.get('/pages/wohnungen.html');
    expect(res.status()).toBe(404);
  });

  test('T-OFF-07: 404-Seite rendert korrekt', async ({ page }) => {
    await page.goto('/wohnungen');
    // Custom 404 page, not Apache's default
    const body = await page.content();
    expect(body).not.toContain('<address>Apache');
    // Scope to the visible elements — the key also sits on <title> in <head>
    await expect(page.locator('h1[data-i18n="notFound.headline"]')).toBeVisible();
    await expect(page.locator('a[data-i18n="notFound.backHome"]')).toBeVisible();
  });

  test('T-OFF-08: Menüpunkt "Wohnungen" ist weg (Deutsch)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#site-header', { state: 'attached' });
    // Give component injection + i18n time to finish
    await page.waitForTimeout(800);
    await expect(page.locator('#nav-wohnungen')).toHaveCount(0);
    // Other nav items must still be there — proves we removed only the one entry
    await expect(page.locator('#nav-kontakt')).toBeVisible();
    await expect(page.locator('#nav-faq')).toBeVisible();
  });

  test('T-OFF-09: Menüpunkt "Wohnungen" ist weg (Englisch)', async ({ page }) => {
    await page.goto('/en/');
    await page.waitForSelector('#site-header', { state: 'attached' });
    await page.waitForTimeout(800);
    await expect(page.locator('#nav-wohnungen')).toHaveCount(0);
    await expect(page.locator('#nav-kontakt')).toBeVisible();
  });

  test('T-OFF-10: Startseite lädt weiterhin fehlerfrei', async ({ page }) => {
    // The homepage still links to /wohnungen (intentionally → 404), but must not break
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page.locator('#feature-cards')).toBeVisible();
  });
});

// ─── Rückweg ───────────────────────────────────────────────────────────────

test.describe('Zurückschalten', () => {
  test('T-BACK-01: nach EIN → AUS → EIN ist alles wieder erreichbar', async ({ request }) => {
    setApartments(false);
    expect((await request.get('/wohnungen')).status()).toBe(404);

    setApartments(true);
    expect((await request.get('/wohnungen')).status()).toBe(200);
    expect((await request.get('/wohnung/w03-exklusiv')).status()).toBe(200);

    // Header must be byte-identical to how we found it
    expect(fs.readFileSync(HEADER, 'utf8')).toBe(headerBackup);
  });
});
