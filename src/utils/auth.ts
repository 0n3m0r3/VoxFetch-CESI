/**
 * Automatic CESI login for ScholarVox
 */

import type { Page } from "playwright";

export async function loginCESI(
  page: Page,
  email: string,
  password: string,
  debug: boolean = false
): Promise<void> {
  // Navigate to CESI login page
  await page.goto("https://univ.scholarvox.com/saml-sp/viacesi", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });

  // Wait for redirect to CESI login page
  await page.waitForTimeout(3000);

  try {
    if (debug) {
      console.log("Current URL:", page.url());
    }

    // Fill in email - try multiple selectors
    const emailInput = page
      .locator(
        'input[type="email"], input[name="email"], input[name="login"], input[name="username"], input[id*="email"], input[id*="user"], input[placeholder*="mail"], input[placeholder*="user"]'
      )
      .first();
    await emailInput.waitFor({ state: "visible", timeout: 10000 });
    await emailInput.click();
    await emailInput.fill(email);
    await page.waitForTimeout(500);

    // Fill in password
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.waitFor({ state: "visible", timeout: 5000 });
    await passwordInput.click();
    await passwordInput.fill(password);
    await page.waitForTimeout(500);

    // Try to find and click the submit button
    // First, let's try pressing Enter key as a fallback
    if (debug) {
      console.log("Looking for submit button...");
    }

    const submitButton = page
      .locator('button[type="submit"], input[type="submit"]')
      .first();
    const hasButton = (await submitButton.count()) > 0;

    if (hasButton) {
      if (debug) {
        console.log("Found submit button, clicking...");
      }
      await Promise.all([
        page.waitForURL(/scholarvox\.com/, { timeout: 30000 }),
        submitButton.click(),
      ]);
    } else {
      // Fallback: press Enter on password field
      if (debug) {
        console.log("No button found, pressing Enter...");
      }
      await Promise.all([
        page.waitForURL(/scholarvox\.com/, { timeout: 30000 }),
        passwordInput.press("Enter"),
      ]);
    }

    // Additional wait to ensure session is established
    await page.waitForTimeout(2000);
  } catch (error: any) {
    console.error("\nLogin failed. Please check:");
    console.error("  - Your email and password are correct");
    console.error("  - You have access to ScholarVox via CESI");
    console.error(`\nError: ${error.message}`);
    throw error;
  }
}
