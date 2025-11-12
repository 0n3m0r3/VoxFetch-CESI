// src/helpers/login.ts
import type { Page } from "playwright";
import { waitAndDetectAuth, type AuthCheck } from "./authDetection.js";

export type LoginOptions = {
  loginUrl?: string; // e.g., https://univ.scholarvox.com/cesiwayf
  institutionSlug?: string; // e.g., 'cesi' -> https://univ.scholarvox.com/cesiwayf
  timeoutMs?: number; // total time to poll for auth
  pollEveryMs?: number; // polling cadence
  fallbackToHomepage?: boolean;
  debug?: boolean; // print cookies/URL during detection
};

export async function openLoginEntry(
  page: Page,
  opts: LoginOptions = {}
): Promise<void> {
  const { loginUrl, institutionSlug, fallbackToHomepage = true } = opts;

  if (loginUrl) {
    await page
      .goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 45_000 })
      .catch(() => {});
  } else if (institutionSlug) {
    const wayf = `https://univ.scholarvox.com/${encodeURIComponent(
      institutionSlug
    )}wayf`;
    await page
      .goto(wayf, { waitUntil: "domcontentloaded", timeout: 45_000 })
      .catch(() => {});
  } else if (fallbackToHomepage) {
    await page
      .goto("https://univ.scholarvox.com/", {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      })
      .catch(() => {});
  }

  // Try to reveal the login button if present (non-fatal).
  try {
    const loginBtn = page
      .locator("a.btn_login, #pnl-login a.btn_login")
      .first();
    if (await loginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginBtn.scrollIntoViewIfNeeded().catch(() => {});
    }
  } catch {}
}

/**
 * Full interactive login loop: open the login entry and poll cookies until authenticated or timeout.
 * If docidForAuthCheck is provided, it may visit the reader once during polling to solidify cookies.
 */
export async function performInteractiveLogin(
  page: Page,
  docidForAuthCheck?: string,
  opts: LoginOptions = {}
): Promise<AuthCheck> {
  const {
    timeoutMs = 10 * 60 * 1000, // generous for human SSO
    pollEveryMs = 1500,
    debug = false,
    ...nav
  } = opts;

  await openLoginEntry(page, nav);

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const auth = await waitAndDetectAuth(page, {
      docid: docidForAuthCheck,
      waitForIframe: !!docidForAuthCheck,
      timeoutMs: 15_000,
      debug,
    });
    if (auth.authenticated) return auth;
    await page.waitForTimeout(pollEveryMs).catch(() => {});
  }

  // Last check before returning
  return waitAndDetectAuth(page, {
    docid: undefined,
    waitForIframe: false,
    timeoutMs: 10_000,
    debug,
  });
}

/**
 * Quick cookie check **without any navigation**.
 * Use this right after the user presses Enter in press-Enter mode.
 */
export async function checkAuthNow(
  page: Page,
  debug = false
): Promise<AuthCheck> {
  return waitAndDetectAuth(page, { timeoutMs: 3000, debug });
}
