import { test, expect } from '@playwright/test';

test('Security Check: Agent Session Token is requested and received', async ({ page }) => {
    // We use the local dev server
    await page.goto('http://localhost:3000');

    // Fill birth data to get to analysis view
    await page.fill('input[type="date"]', '1990-05-15');
    await page.fill('input[type="time"]', '12:00');
    await page.fill('input[placeholder*="Geburtsort"]', 'Berlin');

    // Submit
    await page.click('button:has-text("Kosmische Signatur")');

    // Wait for AnalysisView
    await page.waitForSelector('h2:has-text("Synthese-Matrix")');

    // Navigate to Agent Selection
    await page.click('button:has-text("Mit Astro AI Agent sprechen")');

    // Intercept the /api/agent/session request
    const [request] = await Promise.all([
        page.waitForRequest(req => req.url().includes('/api/agent/session') && req.method() === 'POST'),
        page.click('div:has-text("Levi Bazi")')
    ]);

    console.log('Security: Intercepted agent session request');

    const response = await request.response();
    const data = await response?.json();

    // Verify Security Contract
    console.log('Verifying Security Contract...');
    expect(data.session_token).toBeDefined();
    expect(data.session_token.split('.').length).toBe(3); // Basic JWT structure check

    console.log('PASS: Session token received via secure gateway');

    // Check if token is stored in memory, not localStorage (best practice)
    const localStorageToken = await page.evaluate(() => localStorage.getItem('session_token'));
    expect(localStorageToken).toBeNull();
    console.log('PASS: Token NOT leaked to localStorage');
});
