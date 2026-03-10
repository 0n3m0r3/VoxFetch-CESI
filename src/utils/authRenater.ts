/**
 * Renater federation login for ScholarVox.
 *
 * Flow:
 *  1. Navigate to the Cyberlibris Renater entry point (redirects to
 *     discovery.renater.fr WAYF)
 *  2. Inject the institution's entityId into the native <select> and submit
 *     the form programmatically (the Select2 widget uses AJAX so its native
 *     <select> starts empty — standard selectOption() would fail)
 *  3. Fill in credentials on the university's CAS login form
 *  4. Wait for the SAML redirect back to scholarvox.com
 */

import type { Page } from "playwright";

export async function loginRenater(
  page: Page,
  entityId: string,
  username: string,
  password: string,
  debug: boolean = false
): Promise<void> {
  // Navigate to the Renater entry point for ScholarVox
  await page.goto("https://sso2.cyberlibris.com/renaterauth?redirect=/", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });

  try {
    if (debug) {
      console.log("Current URL (WAYF):", page.url());
    }

    // Wait for the WAYF institution selector form to appear.
    // Cyberlibris redirects to discovery.renater.fr so the form id is still
    // #IdPList but the host has changed — just wait for the select element.
    await page.waitForSelector('select[name="user_idp"]', { timeout: 15000 });

    // The Select2 widget on this page fetches options via AJAX, so the
    // underlying native <select> starts completely empty.
    // Standard approach: inject our option directly into the native select,
    // then submit the form via JS to bypass the Select2 onsubmit guard.
    await page.evaluate((eid: string) => {
      const select = document.querySelector(
        'select[name="user_idp"]'
      ) as HTMLSelectElement | null;
      if (!select) throw new Error("user_idp select not found");

      const opt = document.createElement("option");
      opt.value = eid;
      opt.text = eid;
      opt.selected = true;
      select.appendChild(opt);

      // Notify Select2 (if present) so its display state updates
      select.dispatchEvent(new Event("change", { bubbles: true }));
      const $ = (window as any).$ || (window as any).jQuery;
      if ($) $(select).trigger("change");
    }, entityId);

    if (debug) {
      console.log("Injected entity ID:", entityId);
    }

    // Submit the form and wait for the redirect to the university SSO page.
    // The WAYF lives on discovery.renater.fr, so we wait until we leave both
    // cyberlibris.com and renater.fr.
    await Promise.all([
      page.waitForURL(
        url =>
          !url.hostname.endsWith("cyberlibris.com") &&
          !url.hostname.endsWith("renater.fr"),
        { timeout: 30000 }
      ),
      page.evaluate(() => {
        const form =
          (document.getElementById("IdPList") as HTMLFormElement | null) ??
          (document.querySelector(
            'form[name="IdPList"]'
          ) as HTMLFormElement | null);
        if (!form) throw new Error("WAYF form not found");
        // Call submit() directly to bypass the onsubmit Select2 guard
        form.submit();
      }),
    ]);

    if (debug) {
      console.log("Current URL (university SSO):", page.url());
    }

    // Wait for the university CAS login form (generic Apereo CAS selectors
    // used by the vast majority of French universities)
    await page.waitForSelector("input#username", { timeout: 15000 });

    // Fill credentials
    await page.locator("input#username").fill(username);
    await page.locator("input#password").fill(password);

    // Submit the CAS form and race between:
    //  - Success: SAML redirects back to scholarvox.com
    //  - Failure: CAS displays an authentication error (bad credentials)
    // This avoids waiting the full 45 s timeout when credentials are wrong.
    const CAS_ERROR_SEL =
      '#msg.errors, .alert-danger, [id="msg"][class*="error"], [class="errors"]';

    const [outcome] = await Promise.all([
      Promise.race([
        page.waitForURL(/scholarvox\.com/, { timeout: 45000 }).then(() => "ok" as const),
        page
          .waitForSelector(CAS_ERROR_SEL, { state: "visible", timeout: 45000 })
          .then(async el => {
            const msg = (await el.textContent() ?? "").trim();
            return `bad-credentials:${msg.substring(0, 120)}` as const;
          }),
      ]),
      page.locator("button#submitBtn").click(),
    ]);

    if (typeof outcome === "string" && outcome.startsWith("bad-credentials")) {
      const detail = outcome.replace("bad-credentials:", "").trim();
      throw new Error(
        detail
          ? `Invalid credentials: ${detail}`
          : "Invalid username or password. Please verify your university credentials."
      );
    }

    // Additional wait to ensure session cookies are fully established
    await page.waitForTimeout(2000);

    if (debug) {
      console.log("Login complete, redirected to:", page.url());
    }
  } catch (error: any) {
    console.error("\nRenater login failed. Please check:");
    console.error("  - Your university username and password are correct");
    console.error("  - Your institution has access to ScholarVox via Renater");
    console.error(`\nError: ${error.message}`);
    throw error;
  }
}
