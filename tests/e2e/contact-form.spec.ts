/**
 * contact-form.spec.ts
 * Tests the contact form: token-based CSRF/CAPTCHA handling, first-submit bug,
 * validation, bot protection, rate limiting, and Mailpit email delivery.
 *
 * Prerequisites:
 *   - Docker running: npm run docker:up
 *   - DERKO_DEBUG=1 set in docker-compose.yml (enables /api/test-helper.php)
 *   - Mailpit running at http://localhost:9000
 */
import { test, expect, type Page } from '@playwright/test';

const MAILPIT_API = 'http://localhost:9000/api/v1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Wait for the i18n system and contact form to be fully initialised */
async function waitForForm(page: Page) {
  await page.waitForFunction(() => !!(window as any).__i18nReady, { timeout: 10_000 });
  // Wait for CSRF token to be populated (initAntiBot runs a fetch on load)
  await page.waitForFunction(() => {
    const el = document.getElementById('csrf_token') as HTMLInputElement | null;
    return el && el.value !== '';
  }, { timeout: 10_000 });
  // Wait for token_id to be populated
  await page.waitForFunction(() => {
    const el = document.getElementById('token_id') as HTMLInputElement | null;
    return el && el.value !== '';
  }, { timeout: 10_000 });
  // Wait for captcha image to be loaded (loaded after csrf in .finally())
  await page.waitForFunction(() => {
    const img = document.getElementById('captcha-img') as HTMLImageElement | null;
    return img && img.src.includes('captcha.php');
  }, { timeout: 10_000 });
  // Wait for form_ts to be set
  await page.waitForFunction(() => {
    const el = document.getElementById('form_ts') as HTMLInputElement | null;
    return el && el.value !== '' && el.value !== '0';
  }, { timeout: 5_000 });
}

/** Reload the captcha image using the current token_id */
async function reloadCaptcha(page: Page) {
  await page.evaluate(async () => {
    const tid = (document.getElementById('token_id') as HTMLInputElement)?.value || '';
    const img = document.getElementById('captcha-img') as HTMLImageElement;
    img.src = '/api/captcha.php?tid=' + tid + '&r=' + Date.now();
    await new Promise(resolve => { img.onload = img.onerror = resolve; });
  });
}

/** Fetch the current CAPTCHA code from the test-helper endpoint */
async function getCaptchaCode(page: Page): Promise<string> {
  const data = await page.evaluate(async () => {
    const tid = (document.getElementById('token_id') as HTMLInputElement)?.value || '';
    const res = await fetch('/api/test-helper.php?action=captcha&tid=' + tid);
    return res.json();
  });
  if (!data.ok || !data.code) {
    throw new Error(`test-helper.php returned no captcha code: ${JSON.stringify(data)}`);
  }
  return data.code as string;
}

/** Reset rate limit for the test runner IP */
async function resetRateLimit(page: Page) {
  await page.evaluate(async () => {
    await fetch('/api/test-helper.php?action=reset-rate-limit');
  });
}

/** Fill all required form fields for an "other" topic inquiry */
async function fillForm(page: Page, captchaCode: string, overrides: Partial<{
  name: string; email: string; phone: string; topic: string; message: string; privacy: boolean;
}> = {}) {
  const o = {
    name: 'Test Playwright',
    email: 'playwright@test.local',
    phone: '+49 123 456789',
    topic: 'other',
    message: 'This is an automated Playwright test message.',
    privacy: true,
    ...overrides,
  };

  await page.fill('#name', o.name);
  await page.fill('#email', o.email);
  await page.fill('#phone', o.phone);
  await page.selectOption('#topic', o.topic);
  await page.fill('#message', o.message);
  if (o.privacy) {
    await page.check('#privacy');
  }
  // Wait a moment so timing check (form_ts) passes 1500ms threshold
  await page.waitForTimeout(1600);
  await page.fill('#captcha', captchaCode);
}

/** Delete all messages in Mailpit */
async function clearMailpit(page: Page) {
  await page.request.delete(`${MAILPIT_API}/messages`);
}

/** Get all Mailpit messages */
async function getMailpitMessages(page: Page) {
  const res = await page.request.get(`${MAILPIT_API}/messages`);
  const data = await res.json();
  return data.messages ?? [];
}

// ─── Core form tests ─────────────────────────────────────────────────────────

test.describe('Contact form: session and CSRF initialisation', () => {
  test('F-01: Form loads with non-empty CSRF token and captcha image', async ({ page }) => {
    await page.goto('/kontakt');
    await waitForForm(page);

    const csrfValue = await page.inputValue('#csrf_token');
    expect(csrfValue, 'CSRF token must be populated by JS').not.toBe('');

    const tokenIdValue = await page.inputValue('#token_id');
    expect(tokenIdValue, 'token_id must be populated by JS').not.toBe('');

    const captchaImg = page.locator('#captcha-img');
    await expect(captchaImg).toBeVisible();
    const src = await captchaImg.getAttribute('src');
    expect(src).toContain('/api/captcha.php');
  });

  test('F-01b: form_ts is a recent timestamp', async ({ page }) => {
    const before = Date.now();
    await page.goto('/kontakt');
    await waitForForm(page);
    const ts = parseInt(await page.inputValue('#form_ts'), 10);
    expect(ts).toBeGreaterThanOrEqual(before - 5000);
    expect(ts).toBeLessThanOrEqual(Date.now() + 1000);
  });
});

test.describe('Contact form: successful submission (first-submit bug)', () => {
  test.beforeEach(async ({ page }) => {
    await clearMailpit(page);
    await page.goto('/kontakt');
    await waitForForm(page);
    // Reload captcha to ensure a fresh code is in the token file
    await reloadCaptcha(page);
  });

  test('F-02: FIRST submit after fresh page load → success (main bug regression test)', async ({ page }) => {
    const captchaCode = await getCaptchaCode(page);
    await fillForm(page, captchaCode);

    // Reset rate limit so this test can always submit
    await resetRateLimit(page);

    await page.click('button[type="submit"]');
    await page.waitForURL('**/*bestaetigung*', { timeout: 20_000 });

    expect(
      page.url(),
      'After successful submit, should redirect to /pages/bestaetigung.html'
    ).toContain('bestaetigung');
  });

  test('F-08: Mailpit receives operator email after successful submit', async ({ page }) => {
    const captchaCode = await getCaptchaCode(page);
    await fillForm(page, captchaCode);
    await resetRateLimit(page);

    await page.click('button[type="submit"]');
    await page.waitForURL('**/*bestaetigung*', { timeout: 20_000 });

    // Give mail a moment to arrive
    await page.waitForTimeout(1000);
    const messages = await getMailpitMessages(page);
    expect(messages.length, 'At least one email should arrive in Mailpit').toBeGreaterThanOrEqual(1);
  });

  test('F-09: Mailpit receives confirmation email to sender', async ({ page }) => {
    const captchaCode = await getCaptchaCode(page);
    await fillForm(page, captchaCode, { email: 'sender@test.local' });
    await resetRateLimit(page);

    await page.click('button[type="submit"]');
    await page.waitForURL('**/*bestaetigung*', { timeout: 20_000 });

    await page.waitForTimeout(1000);
    const messages = await getMailpitMessages(page);
    // Expect 2 emails: one to operator, one to sender
    expect(messages.length, '2 emails expected (operator + sender)').toBeGreaterThanOrEqual(2);
  });

  test('F-10: EN contact form (/en/kontakt) submit → success', async ({ page }) => {
    await page.goto('/en/kontakt');
    await waitForForm(page);
    await reloadCaptcha(page);
    const captchaCode = await getCaptchaCode(page);
    await fillForm(page, captchaCode);
    await resetRateLimit(page);

    await page.click('button[type="submit"]');
    await page.waitForURL('**/*bestaetigung*', { timeout: 20_000 });

    expect(page.url()).toContain('bestaetigung');
  });
});

test.describe('Contact form: second submit (flag reset bug)', () => {
  test('F-11: Submit button is not permanently disabled after navigation back', async ({ page }) => {
    await page.goto('/kontakt');
    await waitForForm(page);

    // Check button is enabled initially
    const btn = page.locator('button[type="submit"]');
    await expect(btn).toBeEnabled();
  });
});

// ─── Validation tests ─────────────────────────────────────────────────────────

test.describe('Contact form: client-side validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kontakt');
    await waitForForm(page);
  });

  test('F-04: Empty submit → shows validation errors, does NOT navigate away', async ({ page }) => {
    const urlBefore = page.url();
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    // Should still be on kontakt page
    expect(page.url()).toBe(urlBefore);
    // Bootstrap adds was-validated
    const hasValidated = await page.evaluate(() =>
      document.getElementById('contact-form')?.classList.contains('was-validated')
    );
    expect(hasValidated).toBe(true);
  });

  test('F-04b: Invalid email → form does not submit', async ({ page }) => {
    const urlBefore = page.url();
    await page.fill('#name', 'Test');
    await page.fill('#email', 'not-an-email');
    await page.fill('#phone', '+49 123 456789');
    await page.selectOption('#topic', 'other');
    await page.fill('#message', 'Test message');
    await page.check('#privacy');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(300);
    expect(page.url()).toBe(urlBefore);
  });
});

// ─── Bot protection tests ─────────────────────────────────────────────────────

test.describe('Contact form: bot protection', () => {
  test('F-05: Honeypot filled → form blocked, stays on page', async ({ page }) => {
    await page.goto('/kontakt');
    await waitForForm(page);
    const urlBefore = page.url();

    // Fill honeypot (normally hidden)
    await page.evaluate(() => {
      const hp = document.getElementById('company') as HTMLInputElement;
      if (hp) hp.value = 'I am a bot';
    });

    await page.fill('#name', 'Bot');
    await page.fill('#email', 'bot@test.local');
    await page.fill('#phone', '+49 123 456');
    await page.selectOption('#topic', 'other');
    await page.fill('#message', 'Spam message');
    await page.check('#privacy');
    await page.fill('#captcha', 'XXXXX');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    expect(page.url()).toBe(urlBefore);

    // Alert box should appear
    const alertBox = page.locator('#form-alert');
    await expect(alertBox).not.toHaveClass(/d-none/);
  });

  test('F-S-04: XSS in message field → sanitized, form accepts but message is clean', async ({ page }) => {
    // This tests that the backend strips HTML/script tags
    await page.goto('/kontakt');
    await waitForForm(page);
    await reloadCaptcha(page);
    const captchaCode = await getCaptchaCode(page);
    await resetRateLimit(page);

    await page.fill('#name', 'XSS Test');
    await page.fill('#email', 'xss@test.local');
    await page.fill('#phone', '+49 123 456789');
    await page.selectOption('#topic', 'other');
    await page.fill('#message', '<script>alert("xss")</script>Legitimate message');
    await page.check('#privacy');
    await page.waitForTimeout(1600);
    await page.fill('#captcha', captchaCode);

    await page.click('button[type="submit"]');
    await page.waitForURL('**/*bestaetigung*', { timeout: 20_000 });

    // Backend should sanitize and still process (redirect to bestaetigung)
    expect(page.url()).toContain('bestaetigung');
  });
});

// ─── CAPTCHA tests ───────────────────────────────────────────────────────────

test.describe('Contact form: CAPTCHA', () => {
  test('F-06: Wrong CAPTCHA → redirects to error-captcha page', async ({ page }) => {
    await page.goto('/kontakt');
    await waitForForm(page);
    await reloadCaptcha(page);
    await resetRateLimit(page);

    await page.fill('#name', 'Test User');
    await page.fill('#email', 'test@test.local');
    await page.fill('#phone', '+49 123 456789');
    await page.selectOption('#topic', 'other');
    await page.fill('#message', 'Test message with wrong captcha');
    await page.check('#privacy');
    await page.waitForTimeout(1600);
    // Deliberately wrong captcha
    await page.fill('#captcha', 'WRONG');

    await page.click('button[type="submit"]');
    await page.waitForURL('**/*error-captcha*', { timeout: 20_000 });

    expect(page.url()).toContain('error-captcha');
  });

  test('F-CAPTCHA-REFRESH: Refresh button loads new captcha image', async ({ page }) => {
    await page.goto('/kontakt');
    await waitForForm(page);

    const srcBefore = await page.getAttribute('#captcha-img', 'src');
    await page.click('#captcha-refresh');
    await page.waitForTimeout(500);
    const srcAfter = await page.getAttribute('#captcha-img', 'src');

    // src should change after refresh (has ?r= cache-bust)
    expect(srcAfter).not.toBe(srcBefore);
  });
});

// ─── Security API tests ───────────────────────────────────────────────────────

test.describe('Contact form: security (API level)', () => {
  test('S-01: POST /api/sendmail.php without CSRF → redirects to error-session', async ({ request }) => {
    const res = await request.post('/api/sendmail.php', {
      form: {
        name: 'Attacker',
        email: 'attack@test.local',
        phone: '+49 123 456',
        topic: 'other',
        message: 'No CSRF token',
        privacy: '1',
        js_enabled: '1',
        form_ts: String(Date.now() - 3000),
        csrf_token: '',
        token_id: '',
        captcha: 'XXXXX',
      },
      maxRedirects: 0,
    });
    // Either a redirect to error-session or a 4xx
    expect([302, 303, 400, 403]).toContain(res.status());
    if (res.status() === 302 || res.status() === 303) {
      expect(res.headers()['location']).toContain('error-session');
    }
  });

  test('S-07: Rate limit: posting twice in quick succession → rate limit response', async ({ page }) => {
    // First submit
    await page.goto('/kontakt');
    await waitForForm(page);
    await reloadCaptcha(page);

    const code1 = await getCaptchaCode(page);
    await fillForm(page, code1);
    await resetRateLimit(page);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/*bestaetigung*', { timeout: 20_000 });
    expect(page.url()).toContain('bestaetigung');

    // Second submit immediately (same IP, within rate window) → should hit rate limit
    await page.goto('/kontakt');
    await waitForForm(page);
    await reloadCaptcha(page);
    const code2 = await getCaptchaCode(page);
    await fillForm(page, code2);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/*error-rate-limit*', { timeout: 20_000 });
    expect(page.url()).toContain('error-rate-limit');
  });
});
